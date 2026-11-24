import { useState, useEffect, useRef } from 'react'
import {
  Pill,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Send,
  Loader2,
} from 'lucide-react'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface MedicationRow {
  id: string
  name: string
  genericName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string
}

const FORMULARY = [
  { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', allergyGroup: 'paracetamol' },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', allergyGroup: 'penicillin' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI', allergyGroup: 'omeprazole' },
  { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic', allergyGroup: 'metformin' },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive', allergyGroup: 'amlodipine' },
  { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Statin', allergyGroup: 'statin' },
  { name: 'Losartan 50mg', genericName: 'Losartan', category: 'ARB', allergyGroup: 'losartan' },
  { name: 'Salbutamol Inhaler', genericName: 'Albuterol', category: 'Bronchodilator', allergyGroup: 'salbutamol' },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', allergyGroup: 'nsaid aspirin' },
  { name: 'Aspirin 100mg', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet', allergyGroup: 'aspirin nsaid' },
  { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel', category: 'Antiplatelet', allergyGroup: 'clopidogrel' },
]

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'At night', 'When needed (PRN)']
const DURATIONS = ['3 days', '5 days', '7 days', '14 days', '30 days', '90 days']

export default function EPrescription() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [medications, setMedications] = useState<MedicationRow[]>([])
  const [diagnosisNote, setDiagnosisNote] = useState('Outpatient Medication Prescription')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderRef, setLastOrderRef] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  // Clear draft prescription whenever active patient switches or unbinds
  useEffect(() => {
    setMedications([])
    setDiagnosisNote('Outpatient Medication Prescription')
    setLastOrderRef(null)
    setSearchQuery('')
  }, [activePatient?.icNumber])

  const patientAllergies = activePatient?.allergies || []
  const filteredFormulary = FORMULARY.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const warnings: Array<{ severity: 'high' | 'medium'; message: string }> = []
  const medNames = medications.map((m) => m.name)
  if (medNames.some((n) => n.includes('Aspirin')) && medNames.some((n) => n.includes('Ibuprofen'))) {
    warnings.push({
      severity: 'high',
      message: 'Interaction Alert: Concurrent Aspirin + Ibuprofen elevates gastrointestinal bleeding risk.',
    })
  }
  if (medNames.some((n) => n.includes('Aspirin')) && medNames.some((n) => n.includes('Clopidogrel'))) {
    warnings.push({
      severity: 'medium',
      message: 'Dual Antiplatelet Regimen (Aspirin + Clopidogrel): monitor closely for bleeding.',
    })
  }
  for (const med of medications) {
    const db = FORMULARY.find((d) => d.name === med.name)
    const tokens = `${med.name} ${med.genericName} ${db?.allergyGroup || ''}`.toLowerCase()
    for (const alg of patientAllergies) {
      if (tokens.includes(alg.toLowerCase())) {
        warnings.push({
          severity: 'high',
          message: `Allergy Contraindication: ${med.name} conflicts with documented allergy (${alg})!`,
        })
      }
    }
  }

  const addMedication = (item: (typeof FORMULARY)[number]) => {
    setMedications((prev) => [
      ...prev,
      {
        id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: item.name,
        genericName: item.genericName,
        dosage: item.name.split(' ').slice(1).join(' ') || '1 dose',
        frequency: 'Twice daily',
        duration: '7 days',
        quantity: 14,
        instructions: 'Take after meals',
      },
    ])
  }

  const updateMed = (id: string, patch: Partial<MedicationRow>) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const handlePrint = () => {
    if (!activePatient) return
    const rows = medications
      .map(
        (m) => `<tr>
          <td>${escapeHtml(m.name)} (${escapeHtml(m.genericName)})</td>
          <td>${escapeHtml(m.dosage)}</td>
          <td>${escapeHtml(m.frequency)}</td>
          <td>${escapeHtml(m.duration)}</td>
          <td>${escapeHtml(m.quantity)}</td>
          <td>${escapeHtml(m.instructions)}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `e-Prescription - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Electronic Pharmacy Prescription (${escapeHtml(lastOrderRef || 'DRAFT')})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Allergies:</strong> ${escapeHtml(patientAllergies.join(', ') || 'NKDA')} |
        <strong>Indication:</strong> ${escapeHtml(diagnosisNote)}
      </div>
      <table>
        <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmit = async () => {
    if (!activePatient || medications.length === 0 || submitLockRef.current || !user?.hospitalId) return
    const invalid = medications.find((m) => !m.dosage.trim() || !m.frequency.trim() || m.quantity < 1)
    if (invalid) {
      toast({
        title: 'Incomplete Prescription Row',
        description: `Provide dosage, frequency, and quantity >= 1 for ${invalid.name}.`,
        variant: 'destructive',
      })
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    try {
      const refCode = `RX-${Date.now().toString().slice(-6)}`
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'outpatient',
        chiefComplaint: 'Electronic Prescription Dispatch',
        diagnosis: [diagnosisNote.trim() || 'Outpatient Medication Prescription'],
        notes: `Dispatched ${medications.length} medication(s) via e-Prescription (${refCode}).`,
        patientName: activePatient.fullName,
        prescriptions: medications.map((m) => ({
          medicationName: m.name,
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          quantity: Math.max(1, Math.trunc(Number(m.quantity) || 1)),
          instructions: m.instructions.trim(),
          isActive: true,
        })),
      })

      if (res.success) {
        setLastOrderRef(refCode)
        toast({
          title: 'e-Prescription Transmitted',
          description: `${refCode} persisted to ${activePatient.fullName}'s medical record.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Dispatch Blocked',
          description: res.error || 'Unable to save e-Prescription.',
          variant: 'destructive',
        })
      }
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={Pill}
        title={t.ePrescription}
        subtitle="KKM formulary prescribing with real-time allergy & drug interaction screening"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" disabled={medications.length === 0} onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" />
                {t.printSummary}
              </Button>
              <Button
                size="sm"
                disabled={medications.length === 0 || submitting}
                onClick={handleSubmit}
                className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Dispatch to Pharmacy
              </Button>
            </>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.ePrescription} />
      ) : (
        <>
          {lastOrderRef && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                e-Prescription <code className="font-mono tabular-nums">{lastOrderRef}</code> saved to federated clinical record and pharmacy queue.
              </span>
            </div>
          )}

          {warnings.map((w, idx) => (
            <div
              key={idx}
              role="alert"
              className={cn(
                'p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5',
                w.severity === 'high'
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulary Picker */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">MOH Hospital Formulary</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search generic or brand…"
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredFormulary.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => addMedication(item)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.genericName} • {item.category}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Active Prescription Sheet */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Clinical Diagnosis / Prescribing Indication</label>
                <Input
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  className="mt-1"
                />
              </div>

              {medications.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  Select one or more medications from the MOH Formulary on the left to build this prescription.
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med) => (
                    <div key={med.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{med.name}</p>
                          <p className="text-xs text-slate-500">{med.genericName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMedications((prev) => prev.filter((m) => m.id !== med.id))}
                          aria-label={`Remove ${med.name}`}
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                        <div>
                          <label className="font-semibold text-slate-600">Dosage</label>
                          <Input
                            value={med.dosage}
                            onChange={(e) => updateMed(med.id, { dosage: e.target.value })}
                            className="h-9 text-xs bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600">Frequency</label>
                          <select
                            value={med.frequency}
                            onChange={(e) => updateMed(med.id, { frequency: e.target.value })}
                            className="w-full h-9 px-2 rounded-xl border border-slate-300 bg-white text-xs mt-0.5"
                          >
                            {FREQUENCIES.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600">Duration</label>
                          <select
                            value={med.duration}
                            onChange={(e) => updateMed(med.id, { duration: e.target.value })}
                            className="w-full h-9 px-2 rounded-xl border border-slate-300 bg-white text-xs mt-0.5"
                          >
                            {DURATIONS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600">Quantity</label>
                          <Input
                            type="number"
                            min={1}
                            value={med.quantity}
                            onChange={(e) => updateMed(med.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-9 text-xs bg-white mt-0.5 tabular-nums"
                          />
                        </div>
                      </div>
                      <Input
                        value={med.instructions}
                        onChange={(e) => updateMed(med.id, { instructions: e.target.value })}
                        placeholder="Dispensing instructions…"
                        className="h-9 text-xs bg-white"
                      />
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
