import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pill, Plus, Trash2, Search, AlertTriangle,
  CheckCircle2, Printer, Send, Clock, Package,
  FileText, ChevronDown
} from 'lucide-react'

interface Medication {
  id: string
  name: string
  genericName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string
  route: 'Oral' | 'Topical' | 'IV' | 'IM' | 'SC' | 'Inhaled'
}

interface DrugInteraction {
  severity: 'high' | 'medium' | 'low'
  drug1: string
  drug2: string
  description: string
}
const medicationDatabase = [
  { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic' },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI' },
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic' },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive' },
  { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Statin' },
  { name: 'Losartan 50mg', genericName: 'Losartan', category: 'ARB' },
  { name: 'Salbutamol Inhaler', genericName: 'Albuterol', category: 'Bronchodilator' },
  { name: 'Prednisolone 5mg', genericName: 'Prednisolone', category: 'Corticosteroid' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamine' },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID' },
  { name: 'Ranitidine 150mg', genericName: 'Ranitidine', category: 'H2 Blocker' },
  { name: 'Diclofenac 50mg', genericName: 'Diclofenac', category: 'NSAID' },
  { name: 'Aspirin 100mg', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet' },
  { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel', category: 'Antiplatelet' },
]

const frequencyOptions = [
  { value: 'OD', label: 'Once daily (OD)' },
  { value: 'BD', label: 'Twice daily (BD)' },
  { value: 'TDS', label: 'Three times daily (TDS)' },
  { value: 'QID', label: 'Four times daily (QID)' },
  { value: 'PRN', label: 'When needed (PRN)' },
  { value: 'STAT', label: 'Immediately (STAT)' },
  { value: 'Nocte', label: 'At night (Nocte)' },
  { value: 'Mane', label: 'In the morning (Mane)' },
]

const durationOptions = [
  '3 days', '5 days', '7 days', '14 days', '1 month', '3 months', 'Ongoing'
]

interface EPrescriptionProps {
  patientName?: string
  patientIC?: string
  existingMedications?: string[]
  onSubmit?: (medications: Medication[]) => void
}

export default function EPrescription({ 
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  existingMedications = ['Metformin 500mg', 'Amlodipine 5mg'],
  onSubmit 
}: EPrescriptionProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [interactions, setInteractions] = useState<DrugInteraction[]>([])
  const [showAllergies, setShowAllergies] = useState(true)

  const filteredMedications = medicationDatabase.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.genericName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addMedication = (med: typeof medicationDatabase[0]) => {
    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name: med.name,
      genericName: med.genericName,
      dosage: '1 tablet',
      frequency: 'BD',
      duration: '7 days',
      quantity: 14,
      instructions: 'Take after meals',
      route: 'Oral'
    }
    setMedications([...medications, newMed])
    setShowSearch(false)
    setSearchQuery('')
    checkInteractions(med.name)
  }

  const checkInteractions = (newDrug: string) => {
    const mockInteractions: DrugInteraction[] = []
    
    if (newDrug.includes('Ibuprofen') && existingMedications.some(m => m.includes('Aspirin'))) {
      mockInteractions.push({
        severity: 'high',
        drug1: newDrug,
        drug2: 'Aspirin',
        description: 'Increased risk of GI bleeding when NSAIDs combined with Aspirin'
      })
    }
    
    if (newDrug.includes('Aspirin') && medications.some(m => m.name.includes('Clopidogrel'))) {
      mockInteractions.push({
        severity: 'medium',
        drug1: newDrug,
        drug2: 'Clopidogrel',
        description: 'Increased antiplatelet effect - monitor for bleeding'
      })
    }

    setInteractions([...interactions, ...mockInteractions])
  }

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id))
  }

  const updateMedication = (id: string, field: keyof Medication, value: string | number) => {
    setMedications(medications.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ))
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(medications)
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">e-Prescription</h2>
          <p className="text-gray-500">Electronic Prescription • Digital Medication Orders</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleSubmit}
            disabled={medications.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send className="w-5 h-5" />
            Send to Pharmacy
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

            <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{patientName}</p>
              <code className="text-sm text-gray-500">{patientIC}</code>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">36 years</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Male</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">68kg</span>
          </div>
        </div>

        <motion.div 
          className="p-4 bg-red-50 rounded-xl border border-red-200"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-800">Allergies</span>
            </div>
            <button onClick={() => setShowAllergies(!showAllergies)}>
              <ChevronDown className={`w-5 h-5 text-red-600 transition-transform ${showAllergies ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {showAllergies && (
            <div className="space-y-1">
              <p className="text-sm text-red-700">• <strong>Penicillin</strong> - Severe skin rash</p>
              <p className="text-sm text-red-700">• <strong>Seafood</strong> - Anaphylaxis</p>
            </div>
          )}
        </motion.div>
      </div>

            <AnimatePresence>
        {interactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-amber-50 rounded-xl border border-amber-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Drug Interaction Detected</span>
            </div>
            {interactions.map((interaction, idx) => (
              <div key={idx} className={`p-3 rounded-lg mb-2 ${
                interaction.severity === 'high' ? 'bg-red-100' :
                interaction.severity === 'medium' ? 'bg-amber-100' : 'bg-yellow-100'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                    interaction.severity === 'high' ? 'bg-red-500 text-white' :
                    interaction.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-yellow-500'
                  }`}>
                    {interaction.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {interaction.drug1} + {interaction.drug2}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{interaction.description}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

            {existingMedications.length > 0 && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">Current Medications (from other hospitals)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {existingMedications.map((med, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-full border border-purple-200">
                {med}
              </span>
            ))}
          </div>
        </div>
      )}

            <div className="relative">
        <motion.button
          onClick={() => setShowSearch(!showSearch)}
          className="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
        >
          <Plus className="w-5 h-5" />
          Add Medication
        </motion.button>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medication..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredMedications.map((med, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => addMedication(med)}
                    className="w-full p-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-50"
                    whileHover={{ x: 4 }}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.genericName} • {med.category}</p>
                    </div>
                    <Plus className="w-5 h-5 text-blue-500" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

            <div className="space-y-4">
        <AnimatePresence>
          {medications.map((med, index) => (
            <motion.div
              key={med.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Pill className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.genericName}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeMedication(med.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                  <select
                    value={med.frequency}
                    onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {frequencyOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                  <select
                    value={med.duration}
                    onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {durationOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={med.quantity}
                    onChange={(e) => updateMedication(med.id, 'quantity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Instructions</label>
                <input
                  type="text"
                  value={med.instructions}
                  onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Take after meals"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {medications.length === 0 && (
          <div className="p-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No medications added</p>
            <p className="text-sm text-gray-400">Click "Add Medication" to start prescription</p>
          </div>
        )}
      </div>

            {medications.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">Prescription Summary</p>
                <p className="text-sm text-emerald-600">{medications.length} medications • Ready to send</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Clock className="w-4 h-4" />
              <span>Expected ready: 30 minutes</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
