import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine, Plus, Trash2, Search, Clock,
  FileText, CheckCircle2, AlertCircle, Printer,
  Scan, Monitor, CircleDot, Bone, Brain
} from 'lucide-react'

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
  { code: 'KUB', name: 'KUB X-Ray', modality: 'X-Ray', bodyPart: 'Abdomen', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'XR-Spine', name: 'Spine X-Ray (C/T/L)', modality: 'X-Ray', bodyPart: 'Spine', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'XR-Limb', name: 'Limb X-Ray', modality: 'X-Ray', bodyPart: 'Extremity', turnaround: '30 min', preparation: 'None', contrast: false },
  { code: 'USG-Abd', name: 'Ultrasound Abdomen', modality: 'Ultrasound', bodyPart: 'Abdomen', turnaround: '1 hour', preparation: 'Fasting 6 hours', contrast: false },
  { code: 'USG-Pelv', name: 'Ultrasound Pelvis', modality: 'Ultrasound', bodyPart: 'Pelvis', turnaround: '1 hour', preparation: 'Full bladder required', contrast: false },
  { code: 'USG-KUB', name: 'Ultrasound KUB', modality: 'Ultrasound', bodyPart: 'Kidney', turnaround: '1 hour', preparation: 'None', contrast: false },
  { code: 'USG-Thyroid', name: 'Ultrasound Thyroid', modality: 'Ultrasound', bodyPart: 'Neck', turnaround: '1 hour', preparation: 'None', contrast: false },
  { code: 'Echo', name: 'Echocardiogram', modality: 'Ultrasound', bodyPart: 'Heart', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain', name: 'CT Brain', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-Brain-C', name: 'CT Brain with Contrast', modality: 'CT Scan', bodyPart: 'Head', turnaround: '2 hours', preparation: 'Check RFT', contrast: true },
  { code: 'CT-Thorax', name: 'CT Thorax', modality: 'CT Scan', bodyPart: 'Chest', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'CT-TAP', name: 'CT TAP (Thorax/Abdomen/Pelvis)', modality: 'CT Scan', bodyPart: 'Body', turnaround: '3 hours', preparation: 'Check RFT, Fasting 4 hours', contrast: true },
  { code: 'CTPA', name: 'CT Pulmonary Angiogram', modality: 'CT Scan', bodyPart: 'Chest', turnaround: '2 hours', preparation: 'Check RFT', contrast: true },
  { code: 'CT-KUB', name: 'CT KUB (Non-contrast)', modality: 'CT Scan', bodyPart: 'Abdomen', turnaround: '2 hours', preparation: 'None', contrast: false },
  { code: 'MRI-Brain', name: 'MRI Brain', modality: 'MRI', bodyPart: 'Head', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'MRI-Spine', name: 'MRI Spine (C/T/L)', modality: 'MRI', bodyPart: 'Spine', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'MRI-Knee', name: 'MRI Knee', modality: 'MRI', bodyPart: 'Knee', turnaround: '24 hours', preparation: 'No metal objects', contrast: false },
  { code: 'MRCP', name: 'MRCP', modality: 'MRI', bodyPart: 'Abdomen', turnaround: '24 hours', preparation: 'Fasting 6 hours, No metal objects', contrast: false },
  { code: 'Mammo', name: 'Mammogram', modality: 'Mammography', bodyPart: 'Breast', turnaround: '24 hours', preparation: 'None', contrast: false },
  { code: 'Fluoro', name: 'Fluoroscopy (Ba Swallow/Meal/Enema)', modality: 'Fluoroscopy', bodyPart: 'GIT', turnaround: '2 hours', preparation: 'Fasting 6 hours', contrast: true },
]

const modalities = ['All', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Special']

interface RadiologyProps {
  patientName?: string
  patientIC?: string
  onSubmit?: (orders: RadiologyOrder[]) => void
}

export default function Radiology({
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  onSubmit
}: RadiologyProps) {
  const [selectedOrders, setSelectedOrders] = useState<RadiologyOrder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModality, setSelectedModality] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')

  const filteredExams = radiologyCatalog.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exam.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesModality = selectedModality === 'All' || exam.modality === selectedModality ||
                          (selectedModality === 'Special' && ['Mammography', 'Fluoroscopy'].includes(exam.modality))
    return matchesSearch && matchesModality
  })

  const addOrder = (exam: typeof radiologyCatalog[0]) => {
    if (!selectedOrders.find(o => o.code === exam.code)) {
      const newOrder: RadiologyOrder = {
        id: `rad-${Date.now()}-${exam.code}`,
        ...exam,
        urgent: false,
      }
      setSelectedOrders([...selectedOrders, newOrder])
    }
  }

  const removeOrder = (id: string) => {
    setSelectedOrders(selectedOrders.filter(o => o.id !== id))
  }

  const toggleUrgent = (id: string) => {
    setSelectedOrders(selectedOrders.map(o =>
      o.id === id ? { ...o, urgent: !o.urgent } : o
    ))
  }

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'X-Ray': return Bone
      case 'Ultrasound': return ScanLine
      case 'CT Scan': return Scan
      case 'MRI': return Brain
      case 'Mammography': return CircleDot
      case 'Fluoroscopy': return Monitor
      default: return ScanLine
    }
  }

  const getModalityColor = (modality: string) => {
    switch (modality) {
      case 'X-Ray': return 'blue'
      case 'Ultrasound': return 'teal'
      case 'CT Scan': return 'purple'
      case 'MRI': return 'indigo'
      default: return 'gray'
    }
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(selectedOrders)
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Radiology Request</h2>
          <p className="text-gray-500">Radiology Orders • Imaging Request</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleSubmit}
            disabled={selectedOrders.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-5 h-5" />
            Submit Request
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
          >
            <Printer className="w-5 h-5" />
            Print
          </motion.button>
        </div>
      </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
            <ScanLine className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{patientName}</p>
            <div className="flex items-center gap-4 mt-1">
              <code className="text-sm text-gray-600 bg-white px-2 py-0.5 rounded">{patientIC}</code>
              <span className="text-sm text-gray-500">Ward: OPD</span>
            </div>
          </div>
        </div>
      </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Clinical Information / Indication
        </label>
        <textarea
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Please enter clinical information and reason for radiology examination..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-24"
        />
      </div>

            {selectedOrders.some(o => o.contrast) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Attention: Contrast Examination</p>
            <p className="text-sm text-amber-700 mt-1">
              Please ensure RFT (Renal Function Test) is up to date and no contrast allergy.
              Patient must fast according to instructions.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-6">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {modalities.map(mod => (
                <button
                  key={mod}
                  onClick={() => setSelectedModality(mod)}
                  className={`px-3 py-1 text-sm rounded-full transition-all ${
                    selectedModality === mod
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
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
              const isSelected = selectedOrders.some(o => o.code === exam.code)
              const Icon = getModalityIcon(exam.modality)
              const color = getModalityColor(exam.modality)

              return (
                <motion.button
                  key={exam.code}
                  onClick={() => !isSelected && addOrder(exam)}
                  disabled={isSelected}
                  className={`w-full p-4 text-left border-b border-gray-50 flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-indigo-50 opacity-60' : 'hover:bg-gray-50'
                  }`}
                  whileHover={!isSelected ? { x: 4 } : {}}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className={`text-xs font-bold text-${color}-700 bg-${color}-100 px-2 py-0.5 rounded`}>
                        {exam.code}
                      </code>
                      {exam.contrast && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Contrast
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mt-1">{exam.name}</p>
                    <p className="text-xs text-gray-500">{exam.modality} • {exam.turnaround}</p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-400" />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Selected Examinations</h3>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                {selectedOrders.length} item
              </span>
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence>
              {selectedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ScanLine className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No examination selected</p>
                  <p className="text-sm text-gray-400">Select examination from catalog</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedOrders.map((order, index) => {
                    const Icon = getModalityIcon(order.modality)
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-lg border-2 ${
                          order.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
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
                                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    URGENT
                                  </span>
                                )}
                                {order.contrast && (
                                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                                    Contrast
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-gray-800 mt-1">{order.name}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{order.modality}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {order.turnaround}
                                </span>
                              </div>
                              {order.preparation !== 'None' && (
                                <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                                  ⚠️ {order.preparation}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleUrgent(order.id)}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                order.urgent
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'
                              }`}
                              title="Toggle urgent"
                            >
                              {order.urgent ? 'Urgent' : 'Normal'}
                            </button>
                            <button
                              onClick={() => removeOrder(order.id)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

                    {selectedOrders.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">Summary</p>
                  <p className="text-sm text-gray-600">
                    {selectedOrders.filter(o => o.urgent).length > 0 && (
                      <span className="text-red-600 font-medium">
                        {selectedOrders.filter(o => o.urgent).length} urgent •
                      </span>
                    )}
                    {' '}{selectedOrders.filter(o => o.contrast).length > 0 && (
                      <span className="text-amber-600">
                        {selectedOrders.filter(o => o.contrast).length} with contrast
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
