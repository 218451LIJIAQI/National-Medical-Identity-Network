import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  ScanLine, Plus, Trash2, Search, Clock,
  FileText, CheckCircle2, AlertCircle, Printer,
  Scan, Monitor, CircleDot, Bone, Brain
} from 'lucide-react'

export interface RadiologyOrder {
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
  { code: 'XR-Limb', name: 'Limb X-Ray', modality: 'X-Ray', bodyPart: 'Extremity', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'USG-Abd', name: 'Ultrasound Abdomen', modality: 'Ultrasound', bodyPart: 'Abdomen', turnaround: '1 hour', preparation: 'Fasting 6 hours', contrast: false },
  { code: 'USG-Pelv', name: 'Ultrasound Pelvis', modality: 'Ultrasound', bodyPart: 'Pelvis', turnaround: '1 hour', preparation: 'Full bladder required', contrast: false },
  { code: 'Echo', name: 'Echocardiogram', modality: 'Ultrasound', bodyPart: 'Heart', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain', name: 'CT Brain', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain-C', name: 'CT Brain with Contrast', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'Check RFT', contrast: true },
  { code: 'CT-TAP', name: 'CT TAP (Thorax/Abdomen/Pelvis)', modality: 'CT Scan', bodyPart: 'Body', turnaround: '3 hours', preparation: 'Check RFT, Fasting 4 hours', contrast: true },
  { code: 'CTPA', name: 'CT Pulmonary Angiogram', modality: 'CT Scan', bodyPart: 'Chest', turnaround: '2 hours', preparation: 'Check RFT', contrast: true },
  { code: 'MRI-Brain', name: 'MRI Brain', modality: 'MRI', bodyPart: 'Head', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'MRI-Spine', name: 'MRI Spine (C/T/L)', modality: 'MRI', bodyPart: 'Spine', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'Mammo', name: 'Mammogram', modality: 'Mammography', bodyPart: 'Breast', turnaround: '24 hours', preparation: 'None', contrast: false },
  { code: 'Fluoro', name: 'Fluoroscopy (Ba Swallow/Meal)', modality: 'Fluoroscopy', bodyPart: 'GIT', turnaround: '2 hours', preparation: 'Fasting 6 hours', contrast: true },
]

const modalities = ['All', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Special']

const MODALITY_CONFIG: Record<string, { icon: typeof ScanLine; iconBgClass: string; iconTextClass: string; codeBadgeClass: string }> = {
  'X-Ray': { icon: Bone, iconBgClass: 'bg-blue-100', iconTextClass: 'text-blue-600', codeBadgeClass: 'text-blue-700 bg-blue-100' },
  Ultrasound: { icon: ScanLine, iconBgClass: 'bg-teal-100', iconTextClass: 'text-teal-600', codeBadgeClass: 'text-teal-700 bg-teal-100' },
  'CT Scan': { icon: Scan, iconBgClass: 'bg-purple-100', iconTextClass: 'text-purple-600', codeBadgeClass: 'text-purple-700 bg-purple-100' },
  MRI: { icon: Brain, iconBgClass: 'bg-indigo-100', iconTextClass: 'text-indigo-600', codeBadgeClass: 'text-indigo-700 bg-indigo-100' },
  Mammography: { icon: CircleDot, iconBgClass: 'bg-gray-100', iconTextClass: 'text-gray-600', codeBadgeClass: 'text-gray-700 bg-gray-100' },
  Fluoroscopy: { icon: Monitor, iconBgClass: 'bg-gray-100', iconTextClass: 'text-gray-600', codeBadgeClass: 'text-gray-700 bg-gray-100' },
}

const DEFAULT_MODALITY_STYLE = { icon: ScanLine, iconBgClass: 'bg-gray-100', iconTextClass: 'text-gray-600', codeBadgeClass: 'text-gray-700 bg-gray-100' }

interface RadiologyProps {
  patientName?: string
  patientIC?: string
  onSubmit?: (orders: RadiologyOrder[]) => void
}

export default function Radiology({
  patientName,
  patientIC,
  onSubmit,
}: RadiologyProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const [selectedOrders, setSelectedOrders] = useState<RadiologyOrder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModality, setSelectedModality] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submittedExams, setSubmittedExams] = useSessionState<
    Array<{ reqNo: string; patientName: string; ic: string; exams: string[]; time: string }>
  >(`radiology-orders:${user?.hospitalId || 'default'}`, [])

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
      setSelectedOrders((prev) => [
        ...prev,
        {
          id: `rad-${Date.now()}-${exam.code}`,
          ...exam,
          urgent: false,
        },
      ])
    }
  }

  const removeOrder = (id: string) => {
    setSelectedOrders((prev) => prev.filter((o) => o.id !== id))
  }

  const toggleUrgent = (id: string) => {
    setSelectedOrders((prev) => prev.map((o) => (o.id === id ? { ...o, urgent: !o.urgent } : o)))
  }

  const urgentCount = selectedOrders.filter((o) => o.urgent).length
  const contrastCount = selectedOrders.filter((o) => o.contrast).length

  const handleSubmit = () => {
    if (selectedOrders.length === 0) return
    onSubmit?.(selectedOrders)
    const reqNo = `RAD-${Date.now().toString().slice(-6)}`
    setSubmittedExams((prev) => [
      {
        reqNo,
        patientName: patient.fullName,
        ic: patient.icNumber,
        exams: selectedOrders.map((o) => o.code),
        time: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 9),
    ])
    toast({
      title: `Imaging Request ${reqNo} Sent`,
      description: `${selectedOrders.length} radiology exam(s) scheduled for ${patient.fullName}`,
    })
    setSelectedOrders([])
    setClinicalInfo('')
  }

  const handlePrint = () => {
    const rows = selectedOrders
      .map(
        (o) =>
          `<tr><td>${o.code}</td><td>${o.name}</td><td>${o.modality}</td><td>${o.preparation}</td><td>${o.urgent ? 'URGENT' : 'Routine'}</td></tr>`
      )
      .join('')
    triggerPrintDocument(
      `Radiology Request - ${patient.icNumber}`,
      `<h1>Diagnostic Imaging Requisition</h1>
       <div class="meta">Patient: <strong>${patient.fullName}</strong> (${patient.icNumber}) • Requesting Doctor: ${user?.fullName || 'Medical Officer'}</div>
       <p><strong>Clinical Indication:</strong> ${clinicalInfo || 'Diagnostic evaluation'}</p>
       <table><thead><tr><th>Code</th><th>Examination</th><th>Modality</th><th>Preparation</th><th>Priority</th></tr></thead>
       <tbody>${rows || '<tr><td colspan="5">No examinations selected</td></tr>'}</tbody></table>`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Radiology Request</h2>
          <p className="text-gray-500 text-sm">Diagnostic Imaging & PACS Requisition (session-persisted)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedOrders.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            Submit Request
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>
      </div>

      <WorkstationPatientBar
        patient={patient}
        onLookup={lookupPatient}
        loading={loading}
        notice={lookupNotice}
        accentClass="from-indigo-50 to-purple-50 border-indigo-200"
      />

      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Clinical Indication / Provisional Diagnosis
        </label>
        <textarea
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Enter clinical findings and anatomical region of interest..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-20 text-sm"
        />
      </div>

      {contrastCount > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Contrast Safety Protocol</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Verify recent eGFR / Renal Function Test, screen for contrast media or shellfish allergy, and review Metformin hold instructions.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3">Examination Catalog</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search examination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {modalities.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setSelectedModality(mod)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    selectedModality === mod
                      ? 'bg-indigo-100 text-indigo-700 font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  className={`w-full p-4 text-left border-b border-gray-50 flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-indigo-50 opacity-60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${modalityStyle.iconBgClass}`}>
                    <Icon className={`w-5 h-5 ${modalityStyle.iconTextClass}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className={`text-xs font-bold ${modalityStyle.codeBadgeClass} px-2 py-0.5 rounded`}>
                        {exam.code}
                      </code>
                      {exam.contrast && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Contrast</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mt-1 text-sm">{exam.name}</p>
                    <p className="text-xs text-gray-500">{exam.modality} • {exam.turnaround}</p>
                  </div>
                  {isSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-gray-400" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Selected Examinations</h3>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
              {selectedOrders.length} item(s)
            </span>
          </div>

          <div className="p-4 flex-1">
            {selectedOrders.length === 0 ? (
              <div className="text-center py-12">
                <ScanLine className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No examination selected</p>
                <p className="text-sm text-gray-400">Select imaging exams from the catalog</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrders.map((order) => {
                  const Icon = (MODALITY_CONFIG[order.modality] || DEFAULT_MODALITY_STYLE).icon
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-lg border-2 ${order.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mt-0.5">
                            <Icon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                {order.code}
                              </code>
                              {order.urgent && (
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-gray-800 mt-1 text-sm">{order.name}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {order.modality} • {order.turnaround}
                            </p>
                            {order.preparation !== 'None' && (
                              <p className="text-xs text-amber-700 mt-1.5 p-1.5 bg-amber-50 rounded">
                                Prep: {order.preparation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleUrgent(order.id)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg ${
                              order.urgent ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'
                            }`}
                          >
                            {order.urgent ? 'Urgent' : 'Routine'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOrder(order.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {selectedOrders.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 text-xs text-gray-700">
              {urgentCount > 0 ? `${urgentCount} urgent exam(s)` : 'Routine scheduling'}
              {contrastCount > 0 ? ` • ${contrastCount} contrast study` : ''}
            </div>
          )}
        </div>
      </div>

      {submittedExams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Submitted Radiology Requests This Session</h3>
          <div className="space-y-2">
            {submittedExams.map((item) => (
              <div key={item.reqNo} className="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 bg-gray-50 rounded-lg">
                <span className="font-mono font-semibold text-indigo-700">{item.reqNo}</span>
                <span className="font-medium text-gray-800">{item.patientName} ({item.ic})</span>
                <span className="text-gray-600">{item.exams.join(', ')}</span>
                <span className="text-gray-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
