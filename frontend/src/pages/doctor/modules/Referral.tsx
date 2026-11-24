import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme, hospitalThemes } from '@/lib/hospital-themes'
import { escapeHtml, printHtmlDocument } from '@/lib/utils'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowRightLeft,
  Building2,
  FileText,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Printer,
  Loader2,
} from 'lucide-react'

interface ReferralData {
  patientName: string
  icNumber: string
  referToHospital: string
  referToDepartment: string
  urgency: 'routine' | 'urgent' | 'emergency'
  reason: string
  clinicalSummary: string
  investigations: string[]
}

const destinationHospitals = [
  ...Object.values(hospitalThemes).map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
    state: t.state,
  })),
  { id: 'ijn', name: 'Institut Jantung Negara (IJN)', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'ppum', name: 'University of Malaya Medical Centre', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
]

const departments = [
  'General Medicine',
  'General Surgery',
  'Orthopaedics',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Nephrology',
  'Pulmonology',
  'Obstetrics & Gynaecology (O&G)',
  'Paediatrics',
]

const URGENCY_OPTIONS: Array<{
  value: ReferralData['urgency']
  label: string
  desc: string
  tone: StatusTone
  icon: typeof CheckCircle2
  activeClass: string
}> = [
  {
    value: 'routine',
    label: 'Routine',
    desc: 'Within 2-4 weeks',
    tone: 'success',
    icon: CheckCircle2,
    activeClass: 'border-emerald-400 bg-emerald-50/70',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    desc: 'Within 48-72 hours',
    tone: 'warning',
    icon: AlertCircle,
    activeClass: 'border-amber-400 bg-amber-50/70',
  },
  {
    value: 'emergency',
    label: 'Emergency',
    desc: 'Immediate transfer',
    tone: 'critical',
    icon: AlertTriangle,
    activeClass: 'border-red-400 bg-red-50/70',
  },
]

interface ReferralProps {
  patientName?: string
  patientIC?: string
  fromHospital?: string
  onSubmit?: (data: ReferralData) => void
}

export default function Referral({
  patientName = '',
  patientIC = '',
  fromHospital,
  onSubmit,
}: ReferralProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const resolvedFromHospital = fromHospital || getHospitalTheme(user?.hospitalId).name

  const [formData, setFormData] = useState<ReferralData>({
    patientName: activePatient?.fullName || patientName,
    icNumber: activePatient?.icNumber || patientIC,
    referToHospital: '',
    referToDepartment: '',
    urgency: 'routine',
    reason: '',
    clinicalSummary: '',
    investigations: [],
  })
  const [searchHospital, setSearchHospital] = useState('')
  const [showHospitalList, setShowHospitalList] = useState(false)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  useEffect(() => {
    if (activePatient) {
      setFormData((prev) => ({
        ...prev,
        patientName: activePatient.fullName,
        icNumber: activePatient.icNumber,
      }))
    }
  }, [activePatient])

  const filteredHospitals = destinationHospitals.filter(
    (h) =>
      h.name !== resolvedFromHospital &&
      (h.name.toLowerCase().includes(searchHospital.toLowerCase()) ||
        h.city.toLowerCase().includes(searchHospital.toLowerCase()))
  )

  const updateField = <K extends keyof ReferralData>(field: K, value: ReferralData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const selectHospital = (hospital: (typeof destinationHospitals)[0]) => {
    updateField('referToHospital', hospital.name)
    setSearchHospital(hospital.name)
    setShowHospitalList(false)
  }

  const toggleInvestigation = (inv: string) => {
    const current = formData.investigations
    updateField(
      'investigations',
      current.includes(inv) ? current.filter((i) => i !== inv) : [...current, inv]
    )
  }

  const isStepValid = (stepNum: number) => {
    if (stepNum === 1) return Boolean(formData.referToHospital && formData.referToDepartment)
    if (stepNum === 2) return Boolean(formData.reason.trim() && formData.clinicalSummary.trim())
    return stepNum === 3
  }

  const handlePrintReferral = () => {
    printHtmlDocument(
      `Inter-Hospital Referral ${submittedRef || ''}`,
      `<div class="header">
        <div><h1>Inter-Hospital Specialist Referral</h1><p>From: ${escapeHtml(resolvedFromHospital)}</p></div>
        <div><strong>Ref: ${escapeHtml(submittedRef || 'PENDING')}</strong></div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(formData.patientName || '-')} (${escapeHtml(formData.icNumber || '-')})<br/>
        <strong>Destination:</strong> ${escapeHtml(formData.referToHospital)} — ${escapeHtml(formData.referToDepartment)}<br/>
        <strong>Urgency:</strong> ${escapeHtml(formData.urgency.toUpperCase())}
      </div>
      <h3>Reason for Referral</h3><p>${escapeHtml(formData.reason)}</p>
      <h3>Clinical Summary</h3><p>${escapeHtml(formData.clinicalSummary)}</p>
      <h3>Completed Investigations</h3><p>${escapeHtml(formData.investigations.join(', ') || 'None')}</p>
      <div class="footer">Referring Clinician: ${escapeHtml(user?.fullName || 'Medical Officer')} • ${escapeHtml(new Date().toLocaleString('en-MY'))}</div>`
    )
  }

  const handleSubmit = async () => {
    if (submitLockRef.current) return
    if (!formData.icNumber.trim()) {
      toast({
        title: 'Patient Required',
        description: 'Bind an active patient MyKad IC in the banner above before submitting referral.',
        variant: 'destructive',
      })
      return
    }
    if (!formData.referToHospital || !formData.referToDepartment || !formData.reason.trim()) {
      toast({
        title: 'Incomplete Referral',
        description: 'Select destination hospital, specialty department, and primary referral reason.',
        variant: 'destructive',
      })
      return
    }

    onSubmit?.(formData)
    submitLockRef.current = true
    setSubmitting(true)
    try {
      const refId = `REF-${Date.now().toString().slice(-6)}`
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: formData.icNumber.trim(),
          visitDate: new Date().toISOString().split('T')[0],
          visitType: formData.urgency === 'emergency' ? 'emergency' : 'outpatient',
          chiefComplaint: `Referral to ${formData.referToHospital} (${formData.referToDepartment})`,
          diagnosis: [formData.reason.trim()],
          notes: `[${refId}] Inter-hospital ${formData.urgency} referral to ${formData.referToHospital} (${formData.referToDepartment}). Summary: ${formData.clinicalSummary}. Investigations: ${formData.investigations.join(', ') || 'None'}.`,
          patientName: formData.patientName.trim() || undefined,
        })
        if (!res.success) {
          toast({
            title: 'Referral Save Blocked',
            description: res.error || 'Could not save referral note.',
            variant: 'destructive',
          })
          return
        }
      }

      setSubmittedRef(refId)
      toast({
        title: 'Inter-Hospital Referral Transmitted',
        description: `${refId} sent to ${formData.referToHospital} (${formData.referToDepartment}).`,
        variant: 'success',
      })
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const selectedUrgencyMeta =
    URGENCY_OPTIONS.find((u) => u.value === formData.urgency) || URGENCY_OPTIONS[0]

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inter-Hospital Patient Referral</h2>
          <p className="text-slate-600 text-sm">Federated specialist transfer & clinical handover</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <Building2 className="w-4 h-4 text-blue-700" />
          <span className="text-blue-800 font-semibold">{resolvedFromHospital}</span>
          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
        </div>
      </div>

      {submittedRef && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-900 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              Referral <code className="font-mono tabular-nums">{submittedRef}</code> recorded &
              transmitted to {formData.referToHospital}.
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrintReferral}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50"
          >
            <Printer className="w-3.5 h-3.5" /> Print Letter
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {[
          { num: 1, label: 'Destination' },
          { num: 2, label: 'Clinical Summary' },
          { num: 3, label: 'Review & Transmit' },
        ].map((s, idx) => {
          const canNavigate =
            s.num === 1 ||
            (s.num === 2 && isStepValid(1)) ||
            (s.num === 3 && isStepValid(1) && isStepValid(2))
          return (
            <div key={s.num} className="flex items-center">
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && setStep(s.num)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
                  step === s.num
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : step > s.num
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className="tabular-nums">{s.num}.</span>
                <span>{s.label}</span>
              </button>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-slate-300 mx-2" />}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Receiving Hospital
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receiving hospital..."
                  value={searchHospital}
                  onChange={(e) => {
                    setSearchHospital(e.target.value)
                    setShowHospitalList(true)
                  }}
                  onFocus={() => setShowHospitalList(true)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm"
                />
                {showHospitalList && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-40 max-h-60 overflow-y-auto">
                    {filteredHospitals.map((hospital) => (
                      <button
                        key={hospital.id}
                        type="button"
                        onClick={() => selectHospital(hospital)}
                        className="w-full p-3 text-left hover:bg-indigo-50 border-b border-slate-50"
                      >
                        <p className="font-medium text-slate-900 text-sm">{hospital.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {hospital.city}, {hospital.state}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.referToHospital && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center gap-2 text-sm text-indigo-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>{formData.referToHospital}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Specialty Department
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => updateField('referToDepartment', dept)}
                    className={`w-full p-2.5 text-left rounded-lg text-sm transition-colors ${
                      formData.referToDepartment === dept
                        ? 'bg-indigo-100 text-indigo-900 font-semibold border border-indigo-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Referral Urgency</h3>
              <div className="grid grid-cols-3 gap-4">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('urgency', opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      formData.urgency === opt.value
                        ? opt.activeClass
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="mb-2">
                      <StatusBadge tone={opt.tone} icon={opt.icon} label={opt.label} />
                    </div>
                    <p className="text-xs text-slate-600">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Primary Reason for Referral *</h3>
              <textarea
                maxLength={500}
                value={formData.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="Specify provisional diagnosis and reason for specialist intervention..."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-24"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Clinical Handover Summary *</h3>
              <textarea
                maxLength={2000}
                value={formData.clinicalSummary}
                onChange={(e) => updateField('clinicalSummary', e.target.value)}
                placeholder="History of presenting illness, examination findings, current medications..."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-32"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Completed Workup Attached</h3>
              <div className="grid grid-cols-4 gap-2.5">
                {['FBC', 'RFT', 'LFT', 'ECG', 'CXR', 'CT Scan', 'MRI', 'Ultrasound'].map((inv) => (
                  <button
                    key={inv}
                    type="button"
                    onClick={() => toggleInvestigation(inv)}
                    className={`p-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                      formData.investigations.includes(inv)
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {inv}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl border border-slate-200 shadow-lg p-7 max-w-2xl mx-auto space-y-5"
          >
            <h3 className="text-xl font-bold text-slate-900 text-center">
              Confirm Specialist Referral
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl text-sm">
              <div>
                <p className="text-xs text-slate-500">Patient</p>
                <p className="font-bold text-slate-900">{formData.patientName || 'Unassigned'}</p>
                <code className="text-xs text-slate-600 font-mono tabular-nums">
                  {formData.icNumber || '-'}
                </code>
              </div>
              <div>
                <p className="text-xs text-slate-500">Destination</p>
                <p className="font-bold text-slate-900">{formData.referToHospital}</p>
                <p className="text-xs text-indigo-800 font-medium">{formData.referToDepartment}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-2">
              <p>
                <strong>Reason:</strong> {formData.reason}
              </p>
              <p>
                <strong>Summary:</strong> {formData.clinicalSummary}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <strong>Urgency:</strong>
                <StatusBadge
                  tone={selectedUrgencyMeta.tone}
                  icon={selectedUrgencyMeta.icon}
                  label={selectedUrgencyMeta.label}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePrintReferral}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" /> Print Letter
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Transmit Referral & Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          Previous Step
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={!isStepValid(step)}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  )
}
