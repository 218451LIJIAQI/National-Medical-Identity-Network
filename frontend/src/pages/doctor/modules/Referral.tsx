import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme, hospitalThemes } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, printHtmlDocument } from '@/lib/utils'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowRightLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Printer,
  Loader2,
} from 'lucide-react'

type UrgencyLevel = 'routine' | 'urgent' | 'emergency'

const DESTINATION_HOSPITALS = [
  ...Object.values(hospitalThemes).map((h) => ({
    id: h.id,
    name: h.name,
    city: h.city,
    state: h.state,
  })),
  { id: 'ijn', name: 'Institut Jantung Negara (IJN)', city: 'Kuala Lumpur', state: 'WP Kuala Lumpur' },
  { id: 'ppum', name: 'University of Malaya Medical Centre', city: 'Petaling Jaya', state: 'Selangor' },
]

const SPECIALTIES = [
  'Cardiology',
  'Internal Medicine',
  'General Surgery',
  'Orthopaedics',
  'Neurology',
  'Nephrology',
  'Oncology',
  'Pulmonology',
  'Obstetrics & Gynaecology (O&G)',
  'Paediatrics',
]

const INVESTIGATIONS = [
  'Full Blood Count (FBC)',
  'Renal & Liver Profile',
  '12-Lead ECG',
  'Chest X-Ray (CXR)',
  'CT / MRI Imaging',
  'Echocardiogram',
]

const URGENCY_OPTIONS: Array<{
  value: UrgencyLevel
  label: string
  desc: string
  tone: StatusTone
  icon: typeof CheckCircle2
  activeClass: string
}> = [
  {
    value: 'routine',
    label: 'Routine',
    desc: 'Specialist clinic within 2–4 weeks',
    tone: 'success',
    icon: CheckCircle2,
    activeClass: 'border-emerald-400 bg-emerald-50/70',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    desc: 'Priority review within 48–72 hours',
    tone: 'warning',
    icon: AlertCircle,
    activeClass: 'border-amber-400 bg-amber-50/70',
  },
  {
    value: 'emergency',
    label: 'Emergency Transfer',
    desc: 'Immediate acute bed-to-bed handover',
    tone: 'critical',
    icon: AlertTriangle,
    activeClass: 'border-red-400 bg-red-50/70',
  },
]

export default function Referral() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [referToHospital, setReferToHospital] = useState('')
  const [referToDepartment, setReferToDepartment] = useState('Cardiology')
  const [urgency, setUrgency] = useState<UrgencyLevel>('routine')
  const [reason, setReason] = useState('')
  const [clinicalSummary, setClinicalSummary] = useState('')
  const [investigations, setInvestigations] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const availableDestinations = DESTINATION_HOSPITALS.filter((h) => h.id !== theme.id)

  // Reset referral form whenever active patient switches or unbinds
  useEffect(() => {
    setReferToHospital(availableDestinations[0]?.name || '')
    setReferToDepartment('Cardiology')
    setUrgency('routine')
    setReason('')
    setClinicalSummary('')
    setInvestigations([])
    setSubmittedRef(null)
  }, [activePatient?.icNumber, theme.id])

  const toggleInvestigation = (inv: string) => {
    setInvestigations((prev) =>
      prev.includes(inv) ? prev.filter((i) => i !== inv) : [...prev, inv]
    )
  }

  const handlePrintReferral = () => {
    if (!activePatient) return
    printHtmlDocument(
      `Inter-Hospital Referral - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>Inter-Hospital Specialist Referral</h1><p>Originating Facility: ${escapeHtml(theme.name)} (${escapeHtml(theme.city)}, ${escapeHtml(theme.state)})</p></div>
        <div><strong>Ref: ${escapeHtml(submittedRef || 'DRAFT')}</strong></div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Receiving Facility:</strong> ${escapeHtml(referToHospital)} — ${escapeHtml(referToDepartment)}<br/>
        <strong>Urgency:</strong> ${escapeHtml(urgency.toUpperCase())} |
        <strong>Allergies:</strong> ${escapeHtml(activePatient.allergies.join(', ') || 'NKDA')}
      </div>
      <h3>Primary Reason for Referral</h3><p>${escapeHtml(reason || '—')}</p>
      <h3>ISBAR Clinical Handover Summary</h3><p>${escapeHtml(clinicalSummary || '—')}</p>
      <h3>Completed Baseline Investigations</h3><p>${escapeHtml(investigations.join(', ') || 'None')}</p>
      <div class="footer">Referring Clinician: ${escapeHtml(user?.fullName || 'Medical Officer')} • ${escapeHtml(new Date().toLocaleString('en-MY'))}</div>`
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient || submitLockRef.current || !user?.hospitalId) return
    if (!referToHospital || !referToDepartment || !reason.trim() || !clinicalSummary.trim()) {
      toast({
        title: 'Incomplete Referral Letter',
        description: 'Provide destination hospital, specialty, primary reason, and clinical handover summary.',
        variant: 'destructive',
      })
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    try {
      const refId = `REF-${Date.now().toString().slice(-6)}`
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: new Date().toISOString().split('T')[0],
        visitType: urgency === 'emergency' ? 'emergency' : 'outpatient',
        chiefComplaint: `Specialist Referral to ${referToHospital} (${referToDepartment})`,
        diagnosis: [reason.trim()],
        notes: `[${refId}] Inter-hospital ${urgency} referral from ${theme.name} to ${referToHospital} (${referToDepartment}). Summary: ${clinicalSummary.trim()}. Completed workup: ${investigations.join(', ') || 'None'}.`,
        patientName: activePatient.fullName,
      })

      if (res.success) {
        setSubmittedRef(refId)
        toast({
          title: 'Specialist Referral Logged',
          description: `${refId} transmitted to ${referToHospital} (${referToDepartment}).`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Referral Blocked',
          description: res.error || 'Could not save referral record.',
          variant: 'destructive',
        })
      }
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={ArrowRightLeft}
        title={t.referral}
        subtitle={`ISBAR federated specialist handover from ${theme.name} (${theme.city}, ${theme.state})`}
        actions={
          activePatient ? (
            <Button variant="outline" size="sm" onClick={handlePrintReferral}>
              <Printer className="w-4 h-4 mr-1.5" />
              {t.printSummary}
            </Button>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.referral} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {submittedRef && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Referral <code className="font-mono tabular-nums">{submittedRef}</code> saved to {activePatient.fullName}'s federated timeline for immediate read-only review at {referToHospital}.
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ref-receiving-hospital" className="text-xs font-bold text-slate-700">
                  Receiving Tertiary Hospital *
                </label>
                <select
                  id="ref-receiving-hospital"
                  value={referToHospital}
                  onChange={(e) => setReferToHospital(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                >
                  {availableDestinations.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} — {h.city}, {h.state}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Originating from {theme.name}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ref-specialty" className="text-xs font-bold text-slate-700">
                  Target Specialty Department *
                </label>
                <select
                  id="ref-specialty"
                  value={referToDepartment}
                  onChange={(e) => setReferToDepartment(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                >
                  {SPECIALTIES.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2" role="group" aria-label="Transfer Acuity and Priority">
              <p className="text-xs font-bold text-slate-700">Transfer Acuity & Priority</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={urgency === opt.value}
                    onClick={() => setUrgency(opt.value)}
                    className={cn(
                      'p-3.5 rounded-xl border-2 text-left transition-colors',
                      urgency === opt.value
                        ? opt.activeClass
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <StatusBadge tone={opt.tone} icon={opt.icon} label={opt.label} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ref-reason" className="text-xs font-bold text-slate-700">
                Primary Diagnosis / Reason for Referral *
              </label>
              <Input
                id="ref-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., NSTEMI requiring urgent coronary angiography evaluation"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ref-summary" className="text-xs font-bold text-slate-700">
                ISBAR Clinical Handover Summary *
              </label>
              <textarea
                id="ref-summary"
                required
                rows={4}
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                placeholder="Presenting history, physical findings, hemodynamic stability, and treatment initiated…"
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-2" role="group" aria-label="Completed Pre-Transfer Workup">
              <p className="text-xs font-bold text-slate-700">Completed Pre-Transfer Workup</p>
              <div className="flex flex-wrap gap-2">
                {INVESTIGATIONS.map((inv) => {
                  const checked = investigations.includes(inv)
                  return (
                    <button
                      key={inv}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleInvestigation(inv)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                        checked
                          ? `${theme.iconBg} text-white border-transparent`
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {inv}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className={cn('h-11 px-6 text-white font-bold bg-gradient-to-r', theme.buttonGradient)}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Transmit Specialist Referral
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
