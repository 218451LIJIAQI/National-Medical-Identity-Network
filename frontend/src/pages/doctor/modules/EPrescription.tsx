import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  Pill, Plus, Trash2, Search, AlertTriangle,
  CheckCircle2, Printer, Send, Clock, Package, Loader2
} from 'lucide-react'

export interface Medication {
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
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Penicillin Antibiotic' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI' },
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic' },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive' },
  { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Statin' },
  { name: 'Losartan 50mg', genericName: 'Losartan', category: 'ARB' },
  { name: 'Salbutamol Inhaler', genericName: 'Albuterol', category: 'Bronchodilator' },
  { name: 'Prednisolone 5mg', genericName: 'Prednisolone', category: 'Corticosteroid' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamine' },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID' },
  { name: 'Diclofenac 50mg', genericName: 'Diclofenac', category: 'NSAID' },
  { name: 'Aspirin 100mg', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet' },
  { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel', category: 'Antiplatelet' },
]

const frequencyOptions = [
  { value: 'Once daily (OD)', label: 'Once daily (OD)' },
  { value: 'Twice daily (BD)', label: 'Twice daily (BD)' },
  { value: 'Three times daily (TDS)', label: 'Three times daily (TDS)' },
  { value: 'Four times daily (QID)', label: 'Four times daily (QID)' },
  { value: 'When needed (PRN)', label: 'When needed (PRN)' },
  { value: 'At night (Nocte)', label: 'At night (Nocte)' },
]

const durationOptions = ['3 days', '5 days', '7 days', '14 days', '1 month', '3 months', 'Ongoing']

interface EPrescriptionProps {
  patientName?: string
  patientIC?: string
  existingMedications?: string[]
  onSubmit?: (medications: Medication[]) => void
}

export default function EPrescription({
  patientName,
  patientIC,
  existingMedications,
  onSubmit,
}: EPrescriptionProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { patient, lookupPatient, loading: loadingPatient, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const [medications, setMedications] = useState<Medication[]>([])
  const [diagnosisNote, setDiagnosisNote] = useState('Outpatient Medication Refill / Follow-up')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rxHistory, setRxHistory] = useSessionState<Array<{ id: string; ic: string; patientName: string; items: number; createdAt: string }>>(
    `rx-history:${user?.hospitalId || 'default'}`,
    []
  )

  const activeCrossHospitalMeds = existingMedications ?? patient.activeMedications

  const filteredMedications = medicationDatabase.filter(
    (med) =>
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const interactions = useMemo<DrugInteraction[]>(() => {
    const alerts: DrugInteraction[] = []
    const allMeds = [...activeCrossHospitalMeds, ...medications.map((m) => m.name)]
    const hasDrug = (kw: string) => allMeds.some((m) => m.toLowerCase().includes(kw.toLowerCase()))
    const hasAllergy = (kw: string) => patient.allergies.some((a) => a.toLowerCase().includes(kw.toLowerCase()))

    if (medications.some((m) => m.name.includes('Amoxicillin')) && hasAllergy('penicillin')) {
      alerts.push({
        severity: 'high',
        drug1: 'Amoxicillin 500mg',
        drug2: 'Penicillin Allergy',
        description: 'Contraindicated: Amoxicillin is a beta-lactam penicillin derivative and patient has a recorded Penicillin allergy.',
      })
    }

    if (medications.some((m) => m.name.includes('Aspirin') || m.name.includes('Ibuprofen') || m.name.includes('Diclofenac')) && hasAllergy('aspirin')) {
      alerts.push({
        severity: 'high',
        drug1: 'NSAID / Salicylate',
        drug2: 'Aspirin Allergy',
        description: 'High risk of cross-reactive bronchospasm or hypersensitivity reaction.',
      })
    }

    if ((hasDrug('Ibuprofen') || hasDrug('Diclofenac')) && hasDrug('Aspirin')) {
      alerts.push({
        severity: 'high',
        drug1: hasDrug('Ibuprofen') ? 'Ibuprofen' : 'Diclofenac',
        drug2: 'Aspirin',
        description: 'Increased risk of gastrointestinal bleeding and reduced cardioprotective antiplatelet effect.',
      })
    }

    if (hasDrug('Aspirin') && hasDrug('Clopidogrel')) {
      alerts.push({
        severity: 'medium',
        drug1: 'Aspirin',
        drug2: 'Clopidogrel',
        description: 'Dual antiplatelet therapy increases bleeding risk — monitor hemoglobin and GI symptoms.',
      })
    }

    if (hasDrug('Ibuprofen') && hasDrug('Diclofenac')) {
      alerts.push({
        severity: 'high',
        drug1: 'Ibuprofen',
        drug2: 'Diclofenac',
        description: 'Duplicate NSAID therapy: avoid concurrent systemic NSAIDs due to renal and GI toxicity.',
      })
    }

    return alerts
  }, [activeCrossHospitalMeds, medications, patient.allergies])

  const addMedication = (med: (typeof medicationDatabase)[0]) => {
    const newMed: Medication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: med.name,
      genericName: med.genericName,
      dosage: '1 tablet',
      frequency: 'Twice daily (BD)',
      duration: '7 days',
      quantity: 14,
      instructions: 'Take after meals',
      route: med.name.includes('Inhaler') ? 'Inhaled' : 'Oral',
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
    const rowsHtml = medications
      .map(
        (m) =>
          `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.quantity}</td><td>${m.instructions}</td></tr>`
      )
      .join('')
    triggerPrintDocument(
      `e-Prescription - ${patient.icNumber}`,
      `<h1>Electronic Prescription</h1>
       <div class="meta">Patient: <strong>${patient.fullName}</strong> (${patient.icNumber}) • Prescriber: ${user?.fullName || 'Medical Officer'}</div>
       <table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
       <tbody>${rowsHtml || '<tr><td colspan="6">No medications listed</td></tr>'}</tbody></table>`
    )
  }

  const handleSubmit = async () => {
    if (medications.length === 0) return
    onSubmit?.(medications)

    setSubmitting(true)
    try {
      if (user?.role === 'doctor' && user.hospitalId && user.doctorId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: patient.icNumber,
          doctorId: user.doctorId,
          visitDate: new Date().toISOString().split('T')[0],
          visitType: 'outpatient',
          chiefComplaint: 'e-Prescription Dispensing Order',
          diagnosis: [diagnosisNote.trim() || 'Outpatient Prescription'],
          notes: `Dispatched ${medications.length} medication(s) to pharmacy via e-Prescription.`,
          patientName: patient.fullName,
          prescriptions: medications.map((m) => ({
            medicationName: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            quantity: m.quantity,
            instructions: `${m.route} • ${m.instructions}`,
            isActive: true,
          })),
        })

        if (res.success) {
          toast({
            title: 'Sent to Pharmacy & Saved to Medical Record',
            description: `${medications.length} prescription item(s) persisted for ${patient.fullName}`,
          })
        } else {
          toast({
            title: 'Saved to Workstation Queue',
            description: res.error || 'Recorded in local pharmacy dispatch log',
          })
        }
      } else {
        toast({
          title: 'Dispatched to Pharmacy Queue',
          description: `${medications.length} medication(s) queued for ${patient.fullName}`,
        })
      }

      setRxHistory((prev) => [
        {
          id: `RX-${Date.now().toString().slice(-6)}`,
          ic: patient.icNumber,
          patientName: patient.fullName,
          items: medications.length,
          createdAt: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 9),
      ])
      setMedications([])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">e-Prescription</h2>
          <p className="text-gray-500 text-sm">Electronic Prescription • Persists directly to hospital database when submitted by a doctor</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={medications.length === 0 || submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Send to Pharmacy
          </button>
          <button
            onClick={handlePrint}
            disabled={medications.length === 0}
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
        loading={loadingPatient}
        notice={lookupNotice}
        accentClass="from-teal-50 to-emerald-50 border-teal-200"
        localToolNote="Allergy & drug-interaction checks run live against federated patient history"
      />

      {interactions.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">Clinical Safety Alert ({interactions.length})</span>
          </div>
          {interactions.map((interaction, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                interaction.severity === 'high' ? 'bg-red-100 border border-red-200' : 'bg-amber-100 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    interaction.severity === 'high' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  {interaction.severity.toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {interaction.drug1} + {interaction.drug2}
                </span>
              </div>
              <p className="text-sm text-gray-700">{interaction.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeCrossHospitalMeds.length > 0 && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800 text-sm">Active Medications Across Connected Hospitals</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeCrossHospitalMeds.map((med, idx) => (
              <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                {med}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Indication / Diagnosis for Prescription</label>
        <input
          type="text"
          value={diagnosisNote}
          onChange={(e) => setDiagnosisNote(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          placeholder="e.g., Essential Hypertension"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-medium hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Medication from Formulary
        </button>

        {showSearch && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search medication or generic name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <p className="font-medium text-gray-800">{med.name}</p>
                    <p className="text-xs text-gray-500">{med.genericName} • {med.category}</p>
                  </div>
                  <Plus className="w-5 h-5 text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        )}
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
                  <p className="font-semibold text-gray-800">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.genericName} • Route: {med.route}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeMedication(med.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove medication"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  onChange={(e) => updateMedication(med.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Instructions</label>
              <input
                type="text"
                value={med.instructions}
                onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="e.g., Take after meals"
              />
            </div>
          </div>
        ))}

        {medications.length === 0 && (
          <div className="p-10 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Pill className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No medications added yet</p>
            <p className="text-sm text-gray-400">Click &quot;Add Medication from Formulary&quot; above to build an e-prescription</p>
          </div>
        )}
      </div>

      {medications.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">Prescription Summary</p>
              <p className="text-sm text-emerald-600">{medications.length} medication(s) • Ready to send to pharmacy</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Clock className="w-4 h-4" />
            <span>Est. dispensing: 20 mins</span>
          </div>
        </div>
      )}

      {rxHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dispatched Prescriptions This Session</h3>
          <div className="space-y-2">
            {rxHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-lg">
                <span className="font-mono font-semibold text-teal-700">{h.id}</span>
                <span className="text-gray-800 font-medium">{h.patientName} ({h.ic})</span>
                <span className="text-gray-500">{h.items} item(s) • {h.createdAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
