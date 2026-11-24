import { useState, useEffect, useRef } from 'react'
import {
  ScanLine,
  Plus,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Loader2,
} from 'lucide-react'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface RadiologyOrderItem {
  id: string
  code: string
  name: string
  modality: string
  bodyPart: string
  urgent: boolean
  contrast: boolean
  preparation: string
  turnaround: string
}

interface RadiologySlipSnapshot {
  ref: string
  clinicalInfo: string
  orders: RadiologyOrderItem[]
}

const RADIOLOGY_CATALOG = [
  { code: 'CXR', name: 'Chest X-Ray (PA Erect)', modality: 'X-Ray', bodyPart: 'Thorax', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'AXR', name: 'Abdominal X-Ray (Supine)', modality: 'X-Ray', bodyPart: 'Abdomen', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'XR-Spine', name: 'Lumbosacral Spine X-Ray', modality: 'X-Ray', bodyPart: 'Spine', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'USG-Abd', name: 'Hepatobiliary & Abdominal Ultrasound', modality: 'Ultrasound', bodyPart: 'Abdomen', turnaround: '1 hour', preparation: 'Fasting 6 hours', contrast: false },
  { code: 'Echo', name: 'Transthoracic Echocardiogram (2D Echo)', modality: 'Ultrasound', bodyPart: 'Heart', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain', name: 'CT Brain (Non-Contrast)', modality: 'CT Scan', bodyPart: 'Head', turnaround: '1 hour', preparation: 'None', contrast: false },
  { code: 'CT-Brain-C', name: 'CT Brain with IV Contrast', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'Verify eGFR & Contrast Allergy', contrast: true },
  { code: 'CTPA', name: 'CT Pulmonary Angiogram (CTPA)', modality: 'CT Scan', bodyPart: 'Thorax', turnaround: '1 hour', preparation: 'Verify eGFR & IV 18G Cannula', contrast: true },
  { code: 'MRI-Brain', name: 'MRI Brain & MRA', modality: 'MRI', bodyPart: 'Head', turnaround: '24 hours', preparation: 'MR Safety Metal Screening', contrast: false },
  { code: 'MRI-Spine', name: 'MRI Cervical / Lumbar Spine', modality: 'MRI', bodyPart: 'Spine', turnaround: '24 hours', preparation: 'MR Safety Metal Screening', contrast: false },
]

const MODALITIES = ['All', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI']

export default function Radiology() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [selectedOrders, setSelectedOrders] = useState<RadiologyOrderItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModality, setSelectedModality] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [radRef, setRadRef] = useState<string | null>(null)
  const [lastSubmittedSlip, setLastSubmittedSlip] = useState<RadiologySlipSnapshot | null>(null)
  const submitLockRef = useRef(false)

  useEffect(() => {
    setSelectedOrders([])
    setClinicalInfo('')
    setRadRef(null)
    setLastSubmittedSlip(null)
  }, [activePatient?.icNumber])

  const filteredExams = RADIOLOGY_CATALOG.filter((exam) => {
    const matchesMod = selectedModality === 'All' || exam.modality === selectedModality
    const q = searchQuery.trim().toLowerCase()
    return matchesMod && (!q || exam.name.toLowerCase().includes(q) || exam.code.toLowerCase().includes(q))
  })

  const contrastCount = selectedOrders.filter((o) => o.contrast).length
  const hasContrastAllergyRisk =
    contrastCount > 0 &&
    (activePatient?.allergies || []).some((a) => /contrast|iodine|seafood|shellfish/i.test(a))

  const addOrder = (exam: (typeof RADIOLOGY_CATALOG)[number]) => {
    if (selectedOrders.some((o) => o.code === exam.code)) return
    setSelectedOrders((prev) => [...prev, { id: `rad-${exam.code}`, ...exam, urgent: false }])
  }

  const handlePrint = () => {
    if (!activePatient) return
    const printableOrders = selectedOrders.length > 0 ? selectedOrders : (lastSubmittedSlip?.orders || [])
    if (printableOrders.length === 0) return
    const slipRef = selectedOrders.length > 0 ? 'DRAFT' : (lastSubmittedSlip?.ref || radRef || 'DRAFT')
    const slipClinicalInfo =
      selectedOrders.length > 0
        ? clinicalInfo
        : (lastSubmittedSlip?.clinicalInfo ?? clinicalInfo)
    const rows = printableOrders
      .map(
        (o) => `<tr>
          <td>${escapeHtml(o.code)}</td>
          <td>${escapeHtml(o.name)}</td>
          <td>${escapeHtml(o.modality)}</td>
          <td>${escapeHtml(o.preparation)}</td>
          <td>${o.urgent ? 'STAT' : 'Routine'}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Radiology Request - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>PACS / RIS Diagnostic Imaging Requisition (${escapeHtml(slipRef)})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Clinical Indication:</strong> ${escapeHtml(slipClinicalInfo || 'Diagnostic evaluation')}
      </div>
      <table>
        <thead><tr><th>Code</th><th>Examination</th><th>Modality</th><th>Prep</th><th>Priority</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmit = async () => {
    if (!activePatient || selectedOrders.length === 0 || submitLockRef.current || !user?.hospitalId) return
    submitLockRef.current = true
    setSubmitting(true)
    try {
      const ref = `RAD-${Date.now().toString().slice(-6)}`
      const today = new Date().toISOString().split('T')[0]
      const normalizedClinicalInfo = clinicalInfo.trim()
      const submittedOrders = selectedOrders.map((o) => ({ ...o }))
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: today,
        visitType: 'outpatient',
        chiefComplaint: normalizedClinicalInfo || 'Diagnostic Imaging Requisition',
        diagnosis: [normalizedClinicalInfo || 'Radiological Evaluation'],
        notes: `Submitted RIS/PACS imaging order ${ref}: ${submittedOrders.map((o) => `${o.code} (${o.name})`).join(', ')}.`,
        patientName: activePatient.fullName,
        labReports: submittedOrders.map((o) => ({
          testType: `Radiology (${o.modality})`,
          testName: `${o.code} - ${o.name}`,
          result: `Imaging Scheduled (${o.turnaround})`,
          unit: '',
          referenceRange: o.bodyPart,
          isAbnormal: false,
          reportDate: today,
          notes: `${o.urgent ? 'STAT Priority' : 'Routine'}${o.contrast ? ' • IV Contrast' : ''} • Prep: ${o.preparation}`,
        })),
      })

      if (res.success) {
        setRadRef(ref)
        setLastSubmittedSlip({
          ref,
          clinicalInfo: normalizedClinicalInfo,
          orders: submittedOrders,
        })
        setSelectedOrders([])
        toast({
          title: 'Radiology Order Transmitted',
          description: `${ref} (${submittedOrders.length} study) persisted to ${activePatient.fullName}'s timeline.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Imaging Order Blocked',
          description: res.error || 'Could not save radiology order.',
          variant: 'destructive',
        })
      }
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const canPrintSlip = selectedOrders.length > 0 || Boolean(lastSubmittedSlip)

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={ScanLine}
        title={t.radiology}
        subtitle="RIS / PACS imaging requests with IV contrast safety & shellfish/iodine allergy check"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" disabled={!canPrintSlip} onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" />
                {t.printSummary}
              </Button>
              <Button
                size="sm"
                disabled={selectedOrders.length === 0 || submitting}
                onClick={handleSubmit}
                className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}
                Submit Imaging Order
              </Button>
            </>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.radiology} />
      ) : (
        <>
          {radRef && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  RIS Requisition <code className="font-mono tabular-nums">{radRef}</code> logged with structured imaging entries in patient timeline.
                </span>
              </div>
              {lastSubmittedSlip && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 h-8"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Imaging Slip
                </Button>
              )}
            </div>
          )}

          {contrastCount > 0 && (
            <div
              role="alert"
              className={cn(
                'p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5',
                hasContrastAllergyRisk
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {hasContrastAllergyRisk
                  ? `CRITICAL CONTRAST ALERT: Patient has recorded allergy (${activePatient.allergies.join(', ')}). Pre-medication or non-contrast alternative required!`
                  : 'IV Contrast Study Selected: Verify recent eGFR / serum creatinine and obtain written contrast consent.'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {MODALITIES.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setSelectedModality(mod)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                      selectedModality === mod
                        ? `${theme.iconBg} text-white`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    {mod}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="rad-catalog-search"
                  aria-label="Search radiology examination catalog"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CXR, CT Brain, MRI, Echo…"
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredExams.map((exam) => {
                  const isAdded = selectedOrders.some((o) => o.code === exam.code)
                  return (
                    <button
                      key={exam.code}
                      type="button"
                      disabled={isAdded}
                      onClick={() => addOrder(exam)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2',
                        isAdded
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                      )}
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          <span className="font-mono mr-1.5">{exam.code}</span>
                          {exam.name}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {exam.modality} • {exam.bodyPart}
                          {exam.contrast ? ' • IV Contrast' : ''}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <label htmlFor="rad-clinical-info" className="text-xs font-bold text-slate-700">
                  Clinical History & Question to Radiologist
                </label>
                <Input
                  id="rad-clinical-info"
                  value={clinicalInfo}
                  onChange={(e) => setClinicalInfo(e.target.value)}
                  placeholder="e.g., Acute pleuritic chest pain; exclude pulmonary embolism / pneumothorax…"
                  className="mt-1"
                />
              </div>

              {selectedOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-200 rounded-xl">
                  Select imaging examinations from the catalog on the left.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-900">{o.code}</span>
                          <span className="font-bold text-sm text-slate-900">{o.name}</span>
                          {o.contrast && <StatusBadge tone="warning" label="IV Contrast" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {o.modality} • Prep: {o.preparation} • Est: {o.turnaround}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOrders((prev) =>
                              prev.map((x) => (x.id === o.id ? { ...x, urgent: !x.urgent } : x))
                            )
                          }
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                            o.urgent
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          )}
                        >
                          {o.urgent ? 'STAT Urgent' : 'Mark STAT'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOrders((prev) => prev.filter((x) => x.id !== o.id))}
                          aria-label={`Remove ${o.code}`}
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
