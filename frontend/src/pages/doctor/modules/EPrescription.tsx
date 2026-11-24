import { useState, useEffect, useRef, useCallback } from 'react'
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
  PackageCheck,
} from 'lucide-react'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { centralApi, hospitalApi, type PrescriptionDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, formatDate, printHtmlDocument } from '@/lib/utils'
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

interface PrescriptionSlipSnapshot {
  ref: string
  diagnosisNote: string
  medications: MedicationRow[]
}

interface ExistingHospitalRx extends PrescriptionDto {
  recordId: string
  visitDate: string
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
  const [lastSubmittedSlip, setLastSubmittedSlip] = useState<PrescriptionSlipSnapshot | null>(null)
  const [existingRxList, setExistingRxList] = useState<ExistingHospitalRx[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [dispensingId, setDispensingId] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const loadHospitalPrescriptions = useCallback(
    async (ic: string, signal?: AbortSignal) => {
      if (!user?.hospitalId) return
      setLoadingQueue(true)
      try {
        const res = await centralApi.queryPatient(ic, signal)
        if (res.aborted || signal?.aborted) return
        if (res.success && res.data) {
          const localNode = res.data.hospitals.find((h) => h.hospitalId === user.hospitalId)
          const items: ExistingHospitalRx[] = []
          for (const rec of localNode?.records || []) {
            for (const rx of rec.prescriptions || []) {
              if (rx.id) {
                items.push({
                  ...rx,
                  recordId: rec.id,
                  visitDate: rec.visitDate,
                })
              }
            }
          }
          setExistingRxList(items)
        }
      } finally {
        if (!signal?.aborted) setLoadingQueue(false)
      }
    },
    [user?.hospitalId]
  )

  // Clear draft prescription, slip snapshot & reload pharmacy queue whenever active patient switches or unbinds
  useEffect(() => {
    setMedications([])
    setDiagnosisNote('Outpatient Medication Prescription')
    setLastOrderRef(null)
    setLastSubmittedSlip(null)
    setSearchQuery('')
    setExistingRxList([])
    if (!activePatient?.icNumber) return
    const controller = new AbortController()
    void loadHospitalPrescriptions(activePatient.icNumber, controller.signal)
    return () => controller.abort()
  }, [activePatient?.icNumber, loadHospitalPrescriptions])

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

  const handleDispense = async (rx: ExistingHospitalRx) => {
    if (!user?.hospitalId || !rx.id || dispensingId) return
    setDispensingId(rx.id)
    try {
      const res = await hospitalApi.dispensePrescription(user.hospitalId, rx.recordId, rx.id)
      if (res.success && res.data?.prescription) {
        setExistingRxList((prev) =>
          prev.map((item) =>
            item.id === rx.id ? { ...item, ...res.data!.prescription } : item
          )
        )
        toast({
          title: 'Medication Dispensed',
          description: `${rx.medicationName} marked as dispensed and logged in audit trail.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Dispensing Rejected',
          description: res.error || 'Unable to dispense prescription.',
          variant: 'destructive',
        })
      }
    } finally {
      setDispensingId(null)
    }
  }

  const handlePrint = () => {
    if (!activePatient) return
    const printableMeds = medications.length > 0 ? medications : (lastSubmittedSlip?.medications || [])
    if (printableMeds.length === 0) return
    const slipRef = medications.length > 0 ? 'DRAFT' : (lastSubmittedSlip?.ref || lastOrderRef || 'DRAFT')
    const slipDiagnosis =
      medications.length > 0
        ? diagnosisNote
        : (lastSubmittedSlip?.diagnosisNote || diagnosisNote)
    const rows = printableMeds
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
        <div><h1>${escapeHtml(theme.name)}</h1><p>Electronic Pharmacy Prescription (${escapeHtml(slipRef)})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Allergies:</strong> ${escapeHtml(patientAllergies.join(', ') || 'NKDA')} |
        <strong>Indication:</strong> ${escapeHtml(slipDiagnosis)}
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
      const normalizedDiagnosis = diagnosisNote.trim() || 'Outpatient Medication Prescription'
      const submittedRows = medications.map((m) => ({
        ...m,
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        quantity: Math.max(1, Math.trunc(Number(m.quantity) || 1)),
        instructions: m.instructions.trim(),
      }))
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'outpatient',
        chiefComplaint: 'Electronic Prescription Dispatch',
        diagnosis: [normalizedDiagnosis],
        notes: `Dispatched ${submittedRows.length} medication(s) via e-Prescription (${refCode}).`,
        patientName: activePatient.fullName,
        prescriptions: submittedRows.map((m) => ({
          medicationName: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          instructions: m.instructions,
          isActive: true,
        })),
      })

      if (res.success) {
        setLastOrderRef(refCode)
        setLastSubmittedSlip({
          ref: refCode,
          diagnosisNote: normalizedDiagnosis,
          medications: submittedRows,
        })
        setMedications([])
        await loadHospitalPrescriptions(activePatient.icNumber)
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

  const canPrintSlip = medications.length > 0 || Boolean(lastSubmittedSlip)

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={Pill}
        title={t.ePrescription}
        subtitle="KKM formulary prescribing with real-time allergy screening & hospital pharmacy dispensing"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" disabled={!canPrintSlip} onClick={handlePrint}>
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
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  e-Prescription <code className="font-mono tabular-nums">{lastOrderRef}</code> saved to federated clinical record and added to the pharmacy dispensing queue below.
                </span>
              </div>
              {lastSubmittedSlip && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 h-8"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Prescription
                </Button>
              )}
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
                  id="epx-formulary-search"
                  aria-label="Search MOH hospital formulary"
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
                      <p className="text-[11px] text-slate-600 truncate">
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
                <label htmlFor="epx-diagnosis-note" className="text-xs font-bold text-slate-700">
                  Clinical Diagnosis / Prescribing Indication
                </label>
                <Input
                  id="epx-diagnosis-note"
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  className="mt-1"
                />
              </div>

              {medications.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-200 rounded-xl">
                  Select one or more medications from the MOH Formulary on the left to build this prescription.
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med) => (
                    <div key={med.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{med.name}</p>
                          <p className="text-xs text-slate-600">{med.genericName}</p>
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
                          <label htmlFor={`epx-dose-${med.id}`} className="font-semibold text-slate-700">
                            Dosage
                          </label>
                          <Input
                            id={`epx-dose-${med.id}`}
                            value={med.dosage}
                            onChange={(e) => updateMed(med.id, { dosage: e.target.value })}
                            className="h-9 text-xs bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label htmlFor={`epx-freq-${med.id}`} className="font-semibold text-slate-700">
                            Frequency
                          </label>
                          <select
                            id={`epx-freq-${med.id}`}
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
                          <label htmlFor={`epx-dur-${med.id}`} className="font-semibold text-slate-700">
                            Duration
                          </label>
                          <select
                            id={`epx-dur-${med.id}`}
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
                          <label htmlFor={`epx-qty-${med.id}`} className="font-semibold text-slate-700">
                            Quantity
                          </label>
                          <Input
                            id={`epx-qty-${med.id}`}
                            type="number"
                            min={1}
                            value={med.quantity}
                            onChange={(e) => updateMed(med.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-9 text-xs bg-white mt-0.5 tabular-nums"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`epx-inst-${med.id}`} className="sr-only">
                          Dispensing instructions for {med.name}
                        </label>
                        <Input
                          id={`epx-inst-${med.id}`}
                          value={med.instructions}
                          onChange={(e) => updateMed(med.id, { instructions: e.target.value })}
                          placeholder="Dispensing instructions…"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hospital Pharmacy Dispensing Verification Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <PackageCheck className={cn('w-4 h-4', theme.iconColor)} />
                <h2 className="text-sm font-bold text-slate-900">
                  {theme.shortName} Pharmacy Dispensing Ledger ({existingRxList.length})
                </h2>
              </div>
              <span className="text-xs text-slate-600">
                Local prescriptions only • Duplicate dispensing is blocked (HTTP 409)
              </span>
            </div>

            {loadingQueue ? (
              <div className="p-6 flex items-center justify-center text-xs text-slate-600 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading local prescription ledger…</span>
              </div>
            ) : existingRxList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-600">
                No prescriptions issued for {activePatient.fullName} at {theme.name} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-bold">Prescribed Date</th>
                      <th className="py-2.5 px-4 text-left font-bold">Medication & Regimen</th>
                      <th className="py-2.5 px-4 text-left font-bold">Instructions</th>
                      <th className="py-2.5 px-4 text-left font-bold">Status</th>
                      <th className="py-2.5 px-4 text-right font-bold">Pharmacy Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {existingRxList.map((rx) => {
                      const active = rx.isActive !== false
                      return (
                        <tr key={rx.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 tabular-nums text-slate-600">
                            {formatDate(rx.visitDate)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{rx.medicationName}</p>
                            <p className="text-slate-600 tabular-nums">
                              {rx.dosage} • {rx.frequency} • Qty {rx.quantity}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{rx.instructions || '—'}</td>
                          <td className="py-3 px-4">
                            <StatusBadge
                              tone={active ? 'warning' : 'success'}
                              label={active ? 'Awaiting Dispense' : t.dispensedStatus}
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {active ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={dispensingId === rx.id}
                                onClick={() => void handleDispense(rx)}
                              >
                                {dispensingId === rx.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                ) : (
                                  <PackageCheck className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                                )}
                                {t.dispenseMedication}
                              </Button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700">
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
