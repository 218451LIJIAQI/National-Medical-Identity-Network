import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Send,
  Clock,
  Loader2,
} from 'lucide-react'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

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
  { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', allergyGroup: 'paracetamol' },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', allergyGroup: 'penicillin' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI', allergyGroup: 'omeprazole' },
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic', allergyGroup: 'metformin' },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive', allergyGroup: 'amlodipine' },
  { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Statin', allergyGroup: 'statin' },
  { name: 'Losartan 50mg', genericName: 'Losartan', category: 'ARB', allergyGroup: 'losartan' },
  { name: 'Salbutamol Inhaler', genericName: 'Albuterol', category: 'Bronchodilator', allergyGroup: 'salbutamol' },
  { name: 'Prednisolone 5mg', genericName: 'Prednisolone', category: 'Corticosteroid', allergyGroup: 'steroid' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamine', allergyGroup: 'cetirizine' },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', allergyGroup: 'nsaid aspirin' },
  { name: 'Diclofenac 50mg', genericName: 'Diclofenac', category: 'NSAID', allergyGroup: 'nsaid aspirin' },
  { name: 'Aspirin 100mg', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet', allergyGroup: 'aspirin nsaid' },
  { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel', category: 'Antiplatelet', allergyGroup: 'clopidogrel' },
]

const frequencyOptions = [
  { value: 'Once daily', label: 'Once daily (OD)' },
  { value: 'Twice daily', label: 'Twice daily (BD)' },
  { value: 'Three times daily', label: 'Three times daily (TDS)' },
  { value: 'Four times daily', label: 'Four times daily (QID)' },
  { value: 'When needed', label: 'When needed (PRN)' },
  { value: 'At night', label: 'At night (Nocte)' },
]

const durationOptions = ['3 days', '5 days', '7 days', '14 days', '30 days', '90 days']

interface EPrescriptionProps {
  patientName?: string
  patientIC?: string
  existingMedications?: string[]
  onSubmit?: (medications: Medication[]) => void
}

export default function EPrescription({
  patientName,
  patientIC,
  onSubmit,
}: EPrescriptionProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const resolvedName = activePatient?.fullName || patientName || 'Select Active Patient Above'
  const resolvedIc = activePatient?.icNumber || patientIC || ''
  const patientAllergies = activePatient?.allergies || []

  const [medications, setMedications] = useState<Medication[]>([])
  const [diagnosisNote, setDiagnosisNote] = useState('Outpatient Medication Prescription')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderRef, setLastOrderRef] = useState<string | null>(null)

  const filteredMedications = medicationDatabase.filter(
    (med) =>
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const computeInteractions = (list: Medication[]): DrugInteraction[] => {
    const warnings: DrugInteraction[] = []
    const names = list.map((m) => m.name)

    if (names.some((n) => n.includes('Aspirin')) && names.some((n) => n.includes('Ibuprofen') || n.includes('Diclofenac'))) {
      warnings.push({
        severity: 'high',
        drug1: 'Aspirin',
        drug2: 'NSAID',
        description: 'Concurrent NSAID + Aspirin significantly elevates gastrointestinal bleeding risk.',
      })
    }
    if (names.some((n) => n.includes('Aspirin')) && names.some((n) => n.includes('Clopidogrel'))) {
      warnings.push({
        severity: 'medium',
        drug1: 'Aspirin',
        drug2: 'Clopidogrel',
        description: 'Dual antiplatelet therapy: monitor closely for bruising or bleeding.',
      })
    }

    for (const med of list) {
      const dbEntry = medicationDatabase.find((d) => d.name === med.name)
      const tokens = `${med.name} ${med.genericName} ${dbEntry?.allergyGroup || ''}`.toLowerCase()
      for (const allergy of patientAllergies) {
        if (tokens.includes(allergy.toLowerCase())) {
          warnings.push({
            severity: 'high',
            drug1: med.name,
            drug2: `Patient Allergy (${allergy})`,
            description: `Contraindicated: Patient has a documented allergy to ${allergy}!`,
          })
        }
      }
    }
    return warnings
  }

  const interactions = computeInteractions(medications)

  const addMedication = (med: (typeof medicationDatabase)[0]) => {
    const newMed: Medication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: med.name,
      genericName: med.genericName,
      dosage: med.name.split(' ').slice(1).join(' ') || '1 tablet',
      frequency: 'Twice daily',
      duration: '7 days',
      quantity: 14,
      instructions: 'Take after meals',
      route: 'Oral',
    }
    setMedications((prev) => [...prev, newMed])
    setShowSearch(false)
    setSearchQuery('')
  }

  const removeMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id))
  }

  const updateMedication = (id: string, field: keyof Medication, value: string | number) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  const handlePrint = () => {
    const rows = medications
      .map(
        (m) => `<tr>
          <td>${m.name} (${m.genericName})</td>
          <td>${m.dosage}</td>
          <td>${m.frequency}</td>
          <td>${m.duration}</td>
          <td>${m.quantity}</td>
          <td>${m.instructions}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `e-Prescription - ${resolvedName}`,
      `<div class="header">
        <div><h1>${theme.name}</h1><p>Electronic Prescription (${lastOrderRef || 'DRAFT'})</p></div>
        <div>Date: ${new Date().toLocaleDateString('en-MY')}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${resolvedName} | <strong>IC:</strong> ${resolvedIc || 'N/A'}<br/>
        <strong>Prescribing Doctor:</strong> ${user?.fullName || 'Medical Officer'}
      </div>
      <table>
        <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmit = async () => {
    if (medications.length === 0) return
    onSubmit?.(medications)

    if (!resolvedIc) {
      toast({
        title: 'Patient Required',
        description: 'Please bind a patient MyKad IC in the banner above before dispatching to pharmacy.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const refCode = `RX-${Date.now().toString().slice(-6)}`
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: resolvedIc,
          visitDate: new Date().toISOString().split('T')[0],
          visitType: 'outpatient',
          chiefComplaint: 'Electronic Prescription Dispatch',
          diagnosis: [diagnosisNote.trim() || 'Medication Prescription'],
          notes: `Dispatched ${medications.length} medication(s) via e-Prescription (${refCode}).`,
          patientName: activePatient?.fullName,
          prescriptions: medications.map((m) => ({
            medicationName: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            quantity: Number(m.quantity) || 1,
            instructions: m.instructions,
            isActive: true,
          })),
        })

        if (!res.success) {
          toast({
            title: 'Prescription Dispatch Blocked',
            description: res.error || 'Could not persist prescription to hospital record.',
            variant: 'destructive',
          })
          return
        }
      }

      setLastOrderRef(refCode)
      toast({
        title: 'Prescription Dispatched to Pharmacy',
        description: `Order ${refCode} (${medications.length} item(s)) saved to ${resolvedName}'s record.`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">e-Prescription</h2>
          <p className="text-gray-500 text-sm">Digital medication ordering with real-time allergy & interaction screening</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={medications.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Rx
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={medications.length === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Pharmacy & Save
          </button>
        </div>
      </div>

      {lastOrderRef && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-sm text-emerald-900">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Dispatched to {theme.shortName} Pharmacy Queue • Reference: <code>{lastOrderRef}</code>
          </span>
          <span className="text-xs text-emerald-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Est. dispensing: 15 mins
          </span>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
          Primary Indication / Diagnosis
        </label>
        <input
          type="text"
          value={diagnosisNote}
          onChange={(e) => setDiagnosisNote(e.target.value)}
          className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm"
          placeholder="Enter clinical indication for prescription..."
        />
      </div>

      <AnimatePresence>
        {interactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 rounded-xl border-2 border-red-200 space-y-2"
          >
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Clinical Safety Alert ({interactions.length})</span>
            </div>
            {interactions.map((interaction, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white border border-red-200 text-sm">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white mr-2">
                  {interaction.severity.toUpperCase()}
                </span>
                <strong className="text-gray-900">{interaction.drug1} + {interaction.drug2}:</strong>{' '}
                <span className="text-gray-700">{interaction.description}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Medication from Hospital Formulary
        </button>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-40 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search drug or generic name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredMedications.map((med) => (
                  <button
                    key={med.name}
                    type="button"
                    onClick={() => addMedication(med)}
                    className="w-full p-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.genericName} • {med.category}</p>
                    </div>
                    <Plus className="w-4 h-4 text-blue-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        {medications.map((med) => (
          <div key={med.id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Pill className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.genericName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeMedication(med.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dosage</label>
                <input
                  type="text"
                  value={med.dosage}
                  onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                <select
                  value={med.frequency}
                  onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {frequencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                <select
                  value={med.duration}
                  onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {durationOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={med.quantity}
                  onChange={(e) => updateMedication(med.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Administration Instructions</label>
              <input
                type="text"
                value={med.instructions}
                onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        ))}

        {medications.length === 0 && (
          <div className="p-10 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Pill className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium text-sm">No medications added yet</p>
            <p className="text-xs text-gray-400 mt-1">Select a formulary item above to compose an e-Prescription</p>
          </div>
        )}
      </div>
    </div>
  )
}
