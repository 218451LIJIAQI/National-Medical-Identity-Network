import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  FlaskConical, Plus, Trash2, Search, Clock,
  FileText, CheckCircle2, AlertCircle, Printer,
  Droplets, Activity, Microscope, TestTube
} from 'lucide-react'

export interface LabTest {
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
  { code: 'D-Dimer', name: 'D-Dimer', category: 'Hematology', sampleType: 'Citrate Blood', turnaround: '4 hours', fasting: false },
  { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', sampleType: 'Fluoride Blood', turnaround: '1 hour', fasting: true },
  { code: 'HbA1c', name: 'Glycated Hemoglobin', category: 'Biochemistry', sampleType: 'EDTA Blood', turnaround: '24 hours', fasting: false },
  { code: 'Lipid', name: 'Lipid Profile', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: true },
  { code: 'TFT', name: 'Thyroid Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'Cardiac', name: 'Cardiac Enzymes (Trop-I, CK-MB)', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '1 hour', fasting: false },
  { code: 'ABG', name: 'Arterial Blood Gas', category: 'Biochemistry', sampleType: 'Arterial Blood', turnaround: '30 min', fasting: false },
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

export default function LabOrders({
  patientName,
  patientIC,
  onSubmit,
}: LabOrdersProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const [selectedTests, setSelectedTests] = useState<LabTest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submittedOrders, setSubmittedOrders] = useSessionState<
    Array<{ orderNo: string; patientName: string; ic: string; tests: string[]; urgentCount: number; time: string }>
  >(`lab-orders:${user?.hospitalId || 'default'}`, [])

  const filteredTests = labTestCatalog.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addTest = (test: (typeof labTestCatalog)[0]) => {
    if (!selectedTests.some((t) => t.code === test.code)) {
      setSelectedTests((prev) => [
        ...prev,
        {
          id: `lab-${Date.now()}-${test.code}`,
          ...test,
          urgent: false,
        },
      ])
    }
  }

  const removeTest = (id: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleUrgent = (id: string) => {
    setSelectedTests((prev) => prev.map((t) => (t.id === id ? { ...t, urgent: !t.urgent } : t)))
  }

  const urgentCount = selectedTests.filter((t) => t.urgent).length
  const fastingCount = selectedTests.filter((t) => t.fasting).length

  const handleSubmit = () => {
    if (selectedTests.length === 0) return
    onSubmit?.(selectedTests)
    const orderNo = `LAB-${Date.now().toString().slice(-6)}`
    setSubmittedOrders((prev) => [
      {
        orderNo,
        patientName: patient.fullName,
        ic: patient.icNumber,
        tests: selectedTests.map((t) => t.code),
        urgentCount,
        time: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 9),
    ])
    toast({
      title: `Lab Order ${orderNo} Submitted`,
      description: `${selectedTests.length} investigation(s) queued for ${patient.fullName}`,
    })
    setSelectedTests([])
    setClinicalInfo('')
  }

  const handlePrint = () => {
    const rows = selectedTests
      .map(
        (t) =>
          `<tr><td>${t.code}</td><td>${t.name}</td><td>${t.sampleType}</td><td>${t.urgent ? 'STAT / URGENT' : 'Routine'}</td><td>${t.turnaround}</td></tr>`
      )
      .join('')
    triggerPrintDocument(
      `Lab Requisition - ${patient.icNumber}`,
      `<h1>Pathology & Laboratory Requisition</h1>
       <div class="meta">Patient: <strong>${patient.fullName}</strong> (${patient.icNumber}) • Clinician: ${user?.fullName || 'Medical Officer'}</div>
       <p><strong>Clinical Indication:</strong> ${clinicalInfo || 'Routine investigation'}</p>
       <table><thead><tr><th>Code</th><th>Investigation</th><th>Specimen</th><th>Priority</th><th>TAT</th></tr></thead>
       <tbody>${rows || '<tr><td colspan="5">No tests selected</td></tr>'}</tbody></table>`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Laboratory Request</h2>
          <p className="text-gray-500 text-sm">Pathology Investigation Requisition (session-persisted)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedTests.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            Submit Request
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedTests.length === 0}
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
        accentClass="from-purple-50 to-indigo-50 border-purple-200"
      />

      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Clinical Indication / Provisional Diagnosis
        </label>
        <textarea
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Enter relevant clinical summary, symptoms, or suspected diagnosis..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none h-20 text-sm"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3">Test Catalog</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  className={`w-full p-4 text-left border-b border-gray-50 flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-purple-50 opacity-60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-200' : 'bg-purple-100'}`}>
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        {test.code}
                      </code>
                      {test.fasting && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Fasting
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mt-1 text-sm">{test.name}</p>
                    <p className="text-xs text-gray-500">{test.sampleType} • {test.turnaround}</p>
                  </div>
                  {isSelected ? <CheckCircle2 className="w-5 h-5 text-purple-600" /> : <Plus className="w-5 h-5 text-gray-400" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Selected Tests</h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              {selectedTests.length} selected
            </span>
          </div>

          <div className="p-4 flex-1">
            {selectedTests.length === 0 ? (
              <div className="text-center py-12">
                <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tests selected</p>
                <p className="text-sm text-gray-400">Select tests from the catalog on the left</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 rounded-lg border-2 ${test.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            {test.code}
                          </code>
                          {test.urgent && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 mt-1 text-sm">{test.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><TestTube className="w-3 h-3" /> {test.sampleType}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {test.turnaround}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleUrgent(test.id)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg ${
                            test.urgent ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'
                          }`}
                        >
                          {test.urgent ? 'Urgent' : 'Routine'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTest(test.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTests.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-gray-800">Order Summary</p>
                <p className="text-xs text-gray-600">
                  {urgentCount > 0 ? `${urgentCount} STAT urgent` : 'Standard priority'}
                  {fastingCount > 0 ? ` • ${fastingCount} fasting required` : ''}
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-700">Specimen labels ready</span>
            </div>
          )}
        </div>
      </div>

      {submittedOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Submitted Lab Orders This Session</h3>
          <div className="space-y-2">
            {submittedOrders.map((ord) => (
              <div key={ord.orderNo} className="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 bg-gray-50 rounded-lg">
                <span className="font-mono font-semibold text-purple-700">{ord.orderNo}</span>
                <span className="font-medium text-gray-800">{ord.patientName} ({ord.ic})</span>
                <span className="text-gray-600">{ord.tests.join(', ')}</span>
                <span className="text-gray-400">{ord.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
