import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  Plus,
  Trash2,
  Search,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Printer,
  Scan,
  Monitor,
  CircleDot,
  Bone,
  Brain,
  Loader2,
} from 'lucide-react'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface RadiologyOrder {
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

const radiologyCatalog = [
  { code: 'CXR', name: 'Chest X-Ray (PA)', modality: 'X-Ray', bodyPart: 'Chest', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'AXR', name: 'Abdominal X-Ray', modality: 'X-Ray', bodyPart: 'Abdomen', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'XR-Spine', name: 'Spine X-Ray (C/T/L)', modality: 'X-Ray', bodyPart: 'Spine', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'USG-Abd', name: 'Ultrasound Abdomen', modality: 'Ultrasound', bodyPart: 'Abdomen', turnaround: '1 hour', preparation: 'Fasting 6 hours', contrast: false },
  { code: 'Echo', name: 'Echocardiogram', modality: 'Ultrasound', bodyPart: 'Heart', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain', name: 'CT Brain (Non-Contrast)', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain-C', name: 'CT Brain with IV Contrast', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'Check RFT & Contrast Allergy', contrast: true },
  { code: 'CTPA', name: 'CT Pulmonary Angiogram', modality: 'CT Scan', bodyPart: 'Chest', turnaround: '2 hours', preparation: 'Check RFT', contrast: true },
  { code: 'MRI-Brain', name: 'MRI Brain', modality: 'MRI', bodyPart: 'Head', turnaround: '24 hours', preparation: 'Remove all ferromagnetic implants/objects', contrast: false },
  { code: 'MRI-Spine', name: 'MRI Spine (C/T/L)', modality: 'MRI', bodyPart: 'Spine', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'Mammo', name: 'Bilateral Mammogram', modality: 'Mammography', bodyPart: 'Breast', turnaround: '24 hours', preparation: 'None', contrast: false },
  { code: 'Fluoro', name: 'Fluoroscopy Swallow', modality: 'Fluoroscopy', bodyPart: 'GIT', turnaround: '2 hours', preparation: 'Fasting 6 hours', contrast: true },
]

const modalities = ['All', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Special']

const MODALITY_CONFIG: Record<
  string,
  { icon: typeof ScanLine; iconBgClass: string; iconTextClass: string; codeBadgeClass: string }
> = {
  'X-Ray': { icon: Bone, iconBgClass: 'bg-blue-100', iconTextClass: 'text-blue-700', codeBadgeClass: 'text-blue-800 bg-blue-100' },
  Ultrasound: { icon: ScanLine, iconBgClass: 'bg-teal-100', iconTextClass: 'text-teal-700', codeBadgeClass: 'text-teal-800 bg-teal-100' },
  'CT Scan': { icon: Scan, iconBgClass: 'bg-purple-100', iconTextClass: 'text-purple-700', codeBadgeClass: 'text-purple-800 bg-purple-100' },
  MRI: { icon: Brain, iconBgClass: 'bg-indigo-100', iconTextClass: 'text-indigo-700', codeBadgeClass: 'text-indigo-800 bg-indigo-100' },
  Mammography: { icon: CircleDot, iconBgClass: 'bg-slate-100', iconTextClass: 'text-slate-700', codeBadgeClass: 'text-slate-800 bg-slate-100' },
  Fluoroscopy: { icon: Monitor, iconBgClass: 'bg-slate-100', iconTextClass: 'text-slate-700', codeBadgeClass: 'text-slate-800 bg-slate-100' },
}

const DEFAULT_MODALITY_STYLE = {
  icon: ScanLine,
  iconBgClass: 'bg-slate-100',
  iconTextClass: 'text-slate-700',
  codeBadgeClass: 'text-slate-800 bg-slate-100',
}

interface RadiologyProps {
  patientName?: string
  patientIC?: string
  onSubmit?: (orders: RadiologyOrder[]) => void
}

export default function Radiology({ patientName, patientIC, onSubmit }: RadiologyProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const resolvedName = activePatient?.fullName || patientName || 'Unassigned Patient'
  const resolvedIc = activePatient?.icNumber || patientIC || ''

  const [selectedOrders, setSelectedOrders] = useState<RadiologyOrder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModality, setSelectedModality] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [radRef, setRadRef] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const filteredExams = radiologyCatalog.filter((exam) => {
    const matchesSearch =
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesModality =
      selectedModality === 'All' ||
      exam.modality === selectedModality ||
      (selectedModality === 'Special' && ['Mammography', 'Fluoroscopy'].includes(exam.modality))
    return matchesSearch && matchesModality
  })

  const addOrder = (exam: (typeof radiologyCatalog)[0]) => {
    if (!selectedOrders.some((o) => o.code === exam.code)) {
      setSelectedOrders([
        ...selectedOrders,
        { id: `rad-${Date.now()}-${exam.code}`, ...exam, urgent: false },
      ])
    }
  }

  const removeOrder = (id: string) => setSelectedOrders(selectedOrders.filter((o) => o.id !== id))
  const toggleUrgent = (id: string) =>
    setSelectedOrders(selectedOrders.map((o) => (o.id === id ? { ...o, urgent: !o.urgent } : o)))

  const contrastCount = selectedOrders.filter((o) => o.contrast).length
  const hasContrastAllergyRisk =
    contrastCount > 0 &&
    (activePatient?.allergies || []).some((a) => /contrast|iodine|seafood|shellfish/i.test(a))

  const handlePrint = () => {
    const rows = selectedOrders
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
      `Radiology Request - ${resolvedName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Diagnostic Imaging Requisition (${escapeHtml(radRef || 'DRAFT')})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(resolvedName)} (${escapeHtml(resolvedIc || 'N/A')})<br/>
        <strong>Clinical Indication:</strong> ${escapeHtml(clinicalInfo || 'Diagnostic imaging')}
      </div>
      <table>
        <thead><tr><th>Code</th><th>Examination</th><th>Modality</th><th>Prep</th><th>Priority</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmit = async () => {
    if (selectedOrders.length === 0 || submitLockRef.current) return
    onSubmit?.(selectedOrders)

    if (!resolvedIc) {
      toast({
        title: 'Patient Required',
        description: 'Bind a patient MyKad IC in the banner above before submitting imaging requests.',
        variant: 'destructive',
      })
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    try {
      const ref = `RAD-${Date.now().toString().slice(-6)}`
      const today = new Date().toISOString().split('T')[0]
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: resolvedIc,
          visitDate: today,
          visitType: 'outpatient',
          chiefComplaint: clinicalInfo.trim() || 'Diagnostic Imaging Requisition',
          diagnosis: [clinicalInfo.trim() || 'Radiological Evaluation'],
          notes: `Submitted radiology order ${ref}: ${selectedOrders.map((o) => `${o.code} (${o.name})`).join(', ')}.`,
          patientName: activePatient?.fullName,
        })

        if (!res.success) {
          toast({
            title: 'Imaging Order Blocked',
            description: res.error || 'Could not save radiology order.',
            variant: 'destructive',
          })
          return
        }
      }

      setRadRef(ref)
      toast({
        title: 'Radiology Order Transmitted',
        description: `Imaging order ${ref} (${selectedOrders.length} study) queued at ${theme.shortName} PACS/RIS.`,
        variant: 'success',
      })
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Radiology Request</h2>
          <p className="text-slate-600 text-sm">PACS / RIS diagnostic imaging requisition</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={selectedOrders.length === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Submit Imaging Order
          </button>
        </div>
      </div>

      {radRef && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          <span>
            RIS Requisition <code className="font-mono tabular-nums">{radRef}</code> registered and
            logged in patient history.
          </span>
        </div>
      )}

      {contrastCount > 0 && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            hasContrastAllergyRisk
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {hasContrastAllergyRisk ? (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          )}
          <div className="text-sm">
            <p className="font-bold">
              {hasContrastAllergyRisk
                ? 'HIGH RISK: Contrast / Seafood Allergy Documented!'
                : 'IV Contrast Protocol Notice'}
            </p>
            <p className="mt-0.5">
              {hasContrastAllergyRisk
                ? `Active patient has documented allergy (${activePatient?.allergies.join(', ')}). Consider non-contrast modality or pre-medication protocol.`
                : 'Verify recent eGFR / Renal Function Test (RFT) before administering iodinated IV contrast.'}
            </p>
          </div>
        </div>
      )}

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Clinical History & Imaging Indication
        </label>
        <textarea
          maxLength={500}
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Specify anatomical site, trauma history, or suspected pathology..."
          className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3">Imaging Modality Catalog</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search study..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modalities.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModality(mod)}
                  className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                    selectedModality === mod
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredExams.map((exam) => {
              const isSelected = selectedOrders.some((o) => o.code === exam.code)
              const modalityStyle = MODALITY_CONFIG[exam.modality] || DEFAULT_MODALITY_STYLE
              const Icon = modalityStyle.icon
              return (
                <button
                  key={exam.code}
                  type="button"
                  onClick={() => !isSelected && addOrder(exam)}
                  disabled={isSelected}
                  className={`w-full p-3.5 text-left border-b border-slate-100 flex items-center gap-3.5 transition-colors ${
                    isSelected ? 'bg-indigo-50 opacity-65' : 'hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${modalityStyle.iconBgClass}`}
                  >
                    <Icon className={`w-4 h-4 ${modalityStyle.iconTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code
                        className={`text-xs font-bold ${modalityStyle.codeBadgeClass} px-1.5 py-0.5 rounded`}
                      >
                        {exam.code}
                      </code>
                      {exam.contrast && (
                        <StatusBadge tone="warning" icon={AlertCircle} label="Contrast" />
                      )}
                    </div>
                    <p className="font-medium text-slate-900 text-sm mt-0.5 truncate">{exam.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {exam.modality} • {exam.turnaround}
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Selected Studies</h3>
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full tabular-nums">
              {selectedOrders.length} study
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3">
            <AnimatePresence>
              {selectedOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select imaging examinations from catalog</p>
                </div>
              ) : (
                selectedOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3.5 rounded-xl border ${
                      order.urgent ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                            {order.code}
                          </code>
                          {order.urgent && (
                            <StatusBadge tone="critical" icon={AlertTriangle} label="STAT" />
                          )}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm mt-1">{order.name}</p>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 tabular-nums">
                          <Clock className="w-3 h-3" /> {order.turnaround} • Prep: {order.preparation}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleUrgent(order.id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                            order.urgent
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                          }`}
                        >
                          {order.urgent ? 'STAT' : 'Routine'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOrder(order.id)}
                          aria-label={`Remove ${order.name}`}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
