import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  Plus,
  Trash2,
  Search,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Printer,
  Droplets,
  Activity,
  Microscope,
  TestTube,
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

interface LabTest {
  id: string
  code: string
  name: string
  category: string
  urgent: boolean
  fasting: boolean
  sampleType: string
  turnaround: string
}

const labTestCatalog = [
  { code: 'FBC', name: 'Full Blood Count', category: 'Hematology', sampleType: 'EDTA Blood', turnaround: '2 hours', fasting: false },
  { code: 'PT/INR', name: 'Prothrombin Time / INR', category: 'Hematology', sampleType: 'Citrate Blood', turnaround: '2 hours', fasting: false },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', sampleType: 'EDTA Blood', turnaround: '2 hours', fasting: false },
  { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', sampleType: 'Fluoride Blood', turnaround: '1 hour', fasting: true },
  { code: 'HbA1c', name: 'Glycated Hemoglobin', category: 'Biochemistry', sampleType: 'EDTA Blood', turnaround: '24 hours', fasting: false },
  { code: 'Lipid', name: 'Lipid Profile', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: true },
  { code: 'TFT', name: 'Thyroid Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'Cardiac', name: 'Cardiac Enzymes (Trop-I, CK-MB)', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '1 hour', fasting: false },
  { code: 'BCx', name: 'Blood Culture', category: 'Microbiology', sampleType: 'Blood Culture Bottle', turnaround: '48-72 hours', fasting: false },
  { code: 'UFEME', name: 'Urine FEME', category: 'Microbiology', sampleType: 'Urine', turnaround: '2 hours', fasting: false },
  { code: 'Dengue', name: 'Dengue NS1/IgM/IgG', category: 'Serology', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'HBsAg', name: 'Hepatitis B Surface Antigen', category: 'Serology', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
]

const categories = ['All', 'Hematology', 'Biochemistry', 'Microbiology', 'Serology']

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  Hematology: Droplets,
  Biochemistry: FlaskConical,
  Microbiology: Microscope,
  Serology: TestTube,
}

interface LabOrdersProps {
  patientName?: string
  patientIC?: string
  onSubmit?: (orders: LabTest[]) => void
}

export default function LabOrders({ patientName, patientIC, onSubmit }: LabOrdersProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const resolvedName = activePatient?.fullName || patientName || 'Unassigned Patient'
  const resolvedIc = activePatient?.icNumber || patientIC || ''

  const [selectedTests, setSelectedTests] = useState<LabTest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const filteredTests = labTestCatalog.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addTest = (test: (typeof labTestCatalog)[0]) => {
    if (!selectedTests.some((t) => t.code === test.code)) {
      setSelectedTests([
        ...selectedTests,
        { id: `lab-${Date.now()}-${test.code}`, ...test, urgent: false },
      ])
    }
  }

  const removeTest = (id: string) => {
    setSelectedTests(selectedTests.filter((t) => t.id !== id))
  }

  const toggleUrgent = (id: string) => {
    setSelectedTests(selectedTests.map((t) => (t.id === id ? { ...t, urgent: !t.urgent } : t)))
  }

  const handlePrint = () => {
    const rows = selectedTests
      .map(
        (t) => `<tr>
          <td>${escapeHtml(t.code)}</td>
          <td>${escapeHtml(t.name)}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.sampleType)}</td>
          <td>${t.urgent ? 'STAT / URGENT' : 'Routine'}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Laboratory Requisition - ${resolvedName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Pathology & Laboratory Requisition (${escapeHtml(orderRef || 'DRAFT')})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(resolvedName)} (${escapeHtml(resolvedIc || 'N/A')})<br/>
        <strong>Clinical Indication:</strong> ${escapeHtml(clinicalInfo || 'Routine investigation')}
      </div>
      <table>
        <thead><tr><th>Code</th><th>Investigation</th><th>Department</th><th>Specimen</th><th>Priority</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmitOrder = async () => {
    if (selectedTests.length === 0 || submitLockRef.current) return
    onSubmit?.(selectedTests)

    if (!resolvedIc) {
      toast({
        title: 'Patient Required',
        description: 'Bind an active patient MyKad IC above before submitting laboratory orders.',
        variant: 'destructive',
      })
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    try {
      const ref = `LAB-${Date.now().toString().slice(-6)}`
      const today = new Date().toISOString().split('T')[0]
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: resolvedIc,
          visitDate: today,
          visitType: 'outpatient',
          chiefComplaint: clinicalInfo.trim() || 'Laboratory Investigation Order',
          diagnosis: [clinicalInfo.trim() || 'Diagnostic Laboratory Workup'],
          notes: `Submitted laboratory requisition ${ref}: ${selectedTests.map((t) => t.code).join(', ')}.`,
          patientName: activePatient?.fullName,
          labReports: selectedTests.map((t) => ({
            testType: t.category,
            testName: `${t.code} - ${t.name}`,
            result: 'Pending Specimen Analysis',
            unit: '',
            referenceRange: t.sampleType,
            isAbnormal: false,
            reportDate: today,
            notes: t.urgent ? 'URGENT / STAT Requisition' : `Turnaround: ${t.turnaround}`,
          })),
        })

        if (!res.success) {
          toast({
            title: 'Lab Requisition Rejected',
            description: res.error || 'Unable to save lab order.',
            variant: 'destructive',
          })
          return
        }
      }

      setOrderRef(ref)
      toast({
        title: 'Laboratory Requisition Submitted',
        description: `Requisition ${ref} (${selectedTests.length} test(s)) logged for ${resolvedName}.`,
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
          <h2 className="text-2xl font-bold text-slate-900">Laboratory Request</h2>
          <p className="text-slate-600 text-sm">Pathology & diagnostic specimen orders</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedTests.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Form
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitOrder()}
            disabled={selectedTests.length === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold shadow-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Submit Requisition
          </button>
        </div>
      </div>

      {orderRef && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-purple-600" />
          <span>
            Pathology Requisition <code className="font-mono tabular-nums">{orderRef}</code>{' '}
            transmitted & attached to patient record.
          </span>
        </div>
      )}

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Clinical Indication & Provisional Diagnosis
        </label>
        <textarea
          maxLength={500}
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Enter relevant symptoms, provisional diagnosis, or anticoagulant therapy..."
          className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3">Pathology Catalog</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search test code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredTests.map((test) => {
              const isSelected = selectedTests.some((t) => t.code === test.code)
              const Icon = CATEGORY_ICONS[test.category] || Activity
              return (
                <button
                  key={test.code}
                  type="button"
                  onClick={() => !isSelected && addTest(test)}
                  disabled={isSelected}
                  className={`w-full p-3.5 text-left border-b border-slate-100 flex items-center gap-3.5 transition-colors ${
                    isSelected ? 'bg-purple-50 opacity-65' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                        {test.code}
                      </code>
                      {test.fasting && (
                        <StatusBadge tone="warning" icon={AlertCircle} label="Fasting" />
                      )}
                    </div>
                    <p className="font-medium text-slate-900 text-sm mt-0.5 truncate">{test.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {test.sampleType} • {test.turnaround}
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
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
            <h3 className="font-semibold text-slate-900">Selected Investigations</h3>
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full tabular-nums">
              {selectedTests.length} selected
            </span>
          </div>

          <div className="p-4 flex-1 space-y-2.5">
            <AnimatePresence>
              {selectedTests.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select tests from the left catalog</p>
                </div>
              ) : (
                selectedTests.map((test) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3.5 rounded-xl border ${
                      test.urgent ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                            {test.code}
                          </code>
                          {test.urgent && (
                            <StatusBadge tone="critical" icon={AlertTriangle} label="STAT" />
                          )}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm mt-1">{test.name}</p>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 tabular-nums">
                          <span>{test.sampleType}</span> • <Clock className="w-3 h-3 inline" />{' '}
                          {test.turnaround}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleUrgent(test.id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                            test.urgent
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                          }`}
                        >
                          {test.urgent ? 'STAT' : 'Routine'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTest(test.id)}
                          aria-label={`Remove ${test.name}`}
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
