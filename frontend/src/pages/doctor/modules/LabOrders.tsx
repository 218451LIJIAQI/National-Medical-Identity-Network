import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FlaskConical, Plus, Trash2, Search, Clock, 
  FileText, CheckCircle2, AlertCircle, Printer,
  Droplets, Activity, Microscope, TestTube
} from 'lucide-react'

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
  { code: 'APTT', name: 'Activated Partial Thromboplastin Time', category: 'Hematology', sampleType: 'Citrate Blood', turnaround: '2 hours', fasting: false },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', sampleType: 'EDTA Blood', turnaround: '2 hours', fasting: false },
  { code: 'D-Dimer', name: 'D-Dimer', category: 'Hematology', sampleType: 'Citrate Blood', turnaround: '4 hours', fasting: false },
  { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', sampleType: 'Fluoride Blood', turnaround: '1 hour', fasting: true },
  { code: 'RBS', name: 'Random Blood Sugar', category: 'Biochemistry', sampleType: 'Fluoride Blood', turnaround: '1 hour', fasting: false },
  { code: 'HbA1c', name: 'Glycated Hemoglobin', category: 'Biochemistry', sampleType: 'EDTA Blood', turnaround: '24 hours', fasting: false },
  { code: 'Lipid', name: 'Lipid Profile', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: true },
  { code: 'TFT', name: 'Thyroid Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'Cardiac', name: 'Cardiac Enzymes (Trop-I, CK-MB)', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '1 hour', fasting: false },
  { code: 'ABG', name: 'Arterial Blood Gas', category: 'Biochemistry', sampleType: 'Arterial Blood', turnaround: '30 min', fasting: false },
  { code: 'BCx', name: 'Blood Culture', category: 'Microbiology', sampleType: 'Blood Culture Bottle', turnaround: '48-72 hours', fasting: false },
  { code: 'UCx', name: 'Urine Culture', category: 'Microbiology', sampleType: 'Mid-Stream Urine', turnaround: '48-72 hours', fasting: false },
  { code: 'UFEME', name: 'Urine FEME', category: 'Microbiology', sampleType: 'Urine', turnaround: '2 hours', fasting: false },
  { code: 'Sputum', name: 'Sputum Culture & Sensitivity', category: 'Microbiology', sampleType: 'Sputum', turnaround: '48-72 hours', fasting: false },
  { code: 'HBsAg', name: 'Hepatitis B Surface Antigen', category: 'Serology', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'Anti-HCV', name: 'Hepatitis C Antibody', category: 'Serology', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'HIV', name: 'HIV Screening', category: 'Serology', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
  { code: 'Dengue', name: 'Dengue NS1/IgM/IgG', category: 'Serology', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'COVID', name: 'COVID-19 PCR', category: 'Serology', sampleType: 'Nasal Swab', turnaround: '24 hours', fasting: false },
]

const categories = ['All', 'Hematology', 'Biochemistry', 'Microbiology', 'Serology']

interface LabOrdersProps {
  patientName?: string
  patientIC?: string
  onSubmit?: (orders: LabTest[]) => void
}

export default function LabOrders({ 
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  onSubmit 
}: LabOrdersProps) {
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')

  const filteredTests = labTestCatalog.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addTest = (test: typeof labTestCatalog[0]) => {
    if (!selectedTests.find(t => t.code === test.code)) {
      const newTest: LabTest = {
        id: `lab-${Date.now()}-${test.code}`,
        ...test,
        urgent: false,
      }
      setSelectedTests([...selectedTests, newTest])
    }
  }

  const removeTest = (id: string) => {
    setSelectedTests(selectedTests.filter(t => t.id !== id))
  }

  const toggleUrgent = (id: string) => {
    setSelectedTests(selectedTests.map(t => 
      t.id === id ? { ...t, urgent: !t.urgent } : t
    ))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Hematology': return Droplets
      case 'Biochemistry': return FlaskConical
      case 'Microbiology': return Microscope
      case 'Serology': return TestTube
      default: return Activity
    }
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(selectedTests)
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Permintaan Makmal</h2>
          <p className="text-gray-500">Laboratory Orders • Lab Investigation Request</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleSubmit}
            disabled={selectedTests.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-5 h-5" />
            Hantar Permintaan
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
          >
            <Printer className="w-5 h-5" />
            Cetak
          </motion.button>
        </div>
      </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
            <FileText className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{patientName}</p>
            <div className="flex items-center gap-4 mt-1">
              <code className="text-sm text-gray-600 bg-white px-2 py-0.5 rounded">{patientIC}</code>
              <span className="text-sm text-gray-500">Wad: OPD</span>
            </div>
          </div>
        </div>
      </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Maklumat Klinikal / Clinical Information
        </label>
        <textarea
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          placeholder="Sila masukkan maklumat klinikal yang berkaitan (diagnosis, simptom, sejarah perubatan)..."
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none h-24"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3">Katalog Ujian</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari ujian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-sm rounded-full transition-all ${
                    selectedCategory === cat 
                      ? 'bg-purple-100 text-purple-700 font-medium' 
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
              const isSelected = selectedTests.some(t => t.code === test.code)
              const Icon = getCategoryIcon(test.category)
              
              return (
                <motion.button
                  key={test.code}
                  onClick={() => !isSelected && addTest(test)}
                  disabled={isSelected}
                  className={`w-full p-4 text-left border-b border-gray-50 flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-purple-50 opacity-60' : 'hover:bg-gray-50'
                  }`}
                  whileHover={!isSelected ? { x: 4 } : {}}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-purple-200' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-700' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        {test.code}
                      </code>
                      {test.fasting && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Puasa
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mt-1">{test.name}</p>
                    <p className="text-xs text-gray-500">{test.sampleType} • {test.turnaround}</p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
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
              <h3 className="font-semibold text-gray-800">Ujian Dipilih</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                {selectedTests.length} ujian
              </span>
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence>
              {selectedTests.length === 0 ? (
                <div className="text-center py-12">
                  <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Tiada ujian dipilih</p>
                  <p className="text-sm text-gray-400">Pilih ujian dari katalog di sebelah kiri</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTests.map((test, index) => (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-2 ${
                        test.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                              {test.code}
                            </code>
                            {test.urgent && (
                              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                SEGERA
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-800 mt-1">{test.name}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <TestTube className="w-3 h-3" />
                              {test.sampleType}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {test.turnaround}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUrgent(test.id)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                              test.urgent 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'
                            }`}
                            title="Toggle urgent status"
                          >
                            {test.urgent ? 'Segera' : 'Biasa'}
                          </button>
                          <button
                            onClick={() => removeTest(test.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remove test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

                    {selectedTests.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">Ringkasan</p>
                  <p className="text-sm text-gray-600">
                    {selectedTests.filter(t => t.urgent).length > 0 && (
                      <span className="text-red-600 font-medium">
                        {selectedTests.filter(t => t.urgent).length} segera • 
                      </span>
                    )}
                    {' '}{selectedTests.filter(t => t.fasting).length > 0 && (
                      <span className="text-amber-600">
                        {selectedTests.filter(t => t.fasting).length} perlu puasa
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Anggaran masa:</p>
                  <p className="font-medium text-purple-700">1-2 jam</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
