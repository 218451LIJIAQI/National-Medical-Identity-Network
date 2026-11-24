import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FlaskConical,
  Plus,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  Printer,
  Loader2,
  ClipboardCheck,
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
import { centralApi, hospitalApi, type LabReportDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, formatDate, isPendingLabValue, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface LabTestItem {
  id: string
  code: string
  name: string
  category: string
  urgent: boolean
  fasting: boolean
  sampleType: string
  turnaround: string
}

interface LabSlipSnapshot {
  ref: string
  clinicalInfo: string
  tests: LabTestItem[]
}

interface HospitalLabRequisition extends LabReportDto {
  recordId: string
  visitDate: string
}

interface LabSignOffDraft {
  result: string
  unit: string
  referenceRange: string
  isAbnormal: boolean
  notes: string
}

const LAB_CATALOG = [
  { code: 'FBC', name: 'Full Blood Count', category: 'Hematology', sampleType: 'EDTA Blood', turnaround: '2 hours', fasting: false },
  { code: 'PT/INR', name: 'Prothrombin Time / INR', category: 'Hematology', sampleType: 'Citrate Blood', turnaround: '2 hours', fasting: false },
  { code: 'RFT', name: 'Renal Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', sampleType: 'Fluoride Blood', turnaround: '1 hour', fasting: true },
  { code: 'HbA1c', name: 'Glycated Hemoglobin', category: 'Biochemistry', sampleType: 'EDTA Blood', turnaround: '24 hours', fasting: false },
  { code: 'Lipid', name: 'Fasting Lipid Profile', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: true },
  { code: 'Cardiac', name: 'Troponin-I & CK-MB', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '1 hour', fasting: false },
  { code: 'BCx', name: 'Aerobic Blood Culture', category: 'Microbiology', sampleType: 'Culture Bottle', turnaround: '48-72 hours', fasting: false },
  { code: 'UFEME', name: 'Urine FEME', category: 'Microbiology', sampleType: 'Midstream Urine', turnaround: '2 hours', fasting: false },
  { code: 'Dengue', name: 'Dengue NS1 / IgM / IgG', category: 'Microbiology', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
  { code: 'TFT', name: 'Thyroid Panel (TSH, fT4)', category: 'Biochemistry', sampleType: 'Plain Blood', turnaround: '24 hours', fasting: false },
]

const CATEGORIES = ['All', 'Hematology', 'Biochemistry', 'Microbiology', 'Serology']

export default function LabOrders() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [selectedTests, setSelectedTests] = useState<LabTestItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [clinicalInfo, setClinicalInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const [lastSubmittedSlip, setLastSubmittedSlip] = useState<LabSlipSnapshot | null>(null)
  const [requisitions, setRequisitions] = useState<HospitalLabRequisition[]>([])
  const [signOffDrafts, setSignOffDrafts] = useState<Record<string, LabSignOffDraft>>({})
  const [signingOffId, setSigningOffId] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const loadHospitalLabRequisitions = useCallback(
    async (ic: string, signal?: AbortSignal) => {
      if (!user?.hospitalId) return
      const res = await centralApi.queryPatient(ic, signal)
      if (res.aborted || signal?.aborted) return
      if (res.success && res.data) {
        const localNode = res.data.hospitals.find((h) => h.hospitalId === user.hospitalId)
        const items: HospitalLabRequisition[] = []
        const drafts: Record<string, LabSignOffDraft> = {}
        for (const rec of localNode?.records || []) {
          for (const lab of rec.labReports || []) {
            if (lab.id) {
              items.push({ ...lab, recordId: rec.id, visitDate: rec.visitDate })
              if (isPendingLabValue(lab.result)) {
                drafts[lab.id] = {
                  result: '',
                  unit: lab.unit || '',
                  referenceRange: lab.referenceRange || '',
                  isAbnormal: false,
                  notes: lab.notes || '',
                }
              }
            }
          }
        }
        setRequisitions(items)
        setSignOffDrafts((prev) => ({ ...drafts, ...prev }))
      }
    },
    [user?.hospitalId]
  )

  useEffect(() => {
    setSelectedTests([])
    setClinicalInfo('')
    setOrderRef(null)
    setLastSubmittedSlip(null)
    setRequisitions([])
    setSignOffDrafts({})
    if (!activePatient?.icNumber) return
    const controller = new AbortController()
    void loadHospitalLabRequisitions(activePatient.icNumber, controller.signal)
    return () => controller.abort()
  }, [activePatient?.icNumber, loadHospitalLabRequisitions])

  const filteredCatalog = LAB_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
    const q = searchQuery.trim().toLowerCase()
    return matchesCat && (!q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q))
  })

  const addTest = (item: (typeof LAB_CATALOG)[number]) => {
    if (selectedTests.some((s) => s.code === item.code)) return
    setSelectedTests((prev) => [...prev, { id: `lab-${item.code}`, ...item, urgent: false }])
  }

  const handlePrint = () => {
    if (!activePatient) return
    const printableTests = selectedTests.length > 0 ? selectedTests : (lastSubmittedSlip?.tests || [])
    if (printableTests.length === 0) return
    const slipRef = selectedTests.length > 0 ? 'DRAFT' : (lastSubmittedSlip?.ref || orderRef || 'DRAFT')
    const slipClinicalInfo =
      selectedTests.length > 0
        ? clinicalInfo
        : (lastSubmittedSlip?.clinicalInfo ?? clinicalInfo)
    const rows = printableTests
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.sampleType)}</td>
          <td>${item.urgent ? 'STAT / URGENT' : 'Routine'}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Laboratory Requisition - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Pathology & Laboratory Requisition (${escapeHtml(slipRef)})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Clinical Indication:</strong> ${escapeHtml(slipClinicalInfo || 'Routine investigation')}
      </div>
      <table>
        <thead><tr><th>Code</th><th>Investigation</th><th>Department</th><th>Specimen</th><th>Priority</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    )
  }

  const handleSubmitOrder = async () => {
    if (!activePatient || selectedTests.length === 0 || submitLockRef.current || !user?.hospitalId) return
    submitLockRef.current = true
    setSubmitting(true)
    try {
      const ref = `LAB-${Date.now().toString().slice(-6)}`
      const today = new Date().toISOString().split('T')[0]
      const normalizedClinicalInfo = clinicalInfo.trim()
      const submittedTests = selectedTests.map((s) => ({ ...s }))
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: today,
        visitType: 'outpatient',
        chiefComplaint: normalizedClinicalInfo || 'Laboratory Investigation Requisition',
        diagnosis: [normalizedClinicalInfo || 'Diagnostic Laboratory Workup'],
        notes: `Submitted laboratory requisition ${ref}: ${submittedTests.map((s) => s.code).join(', ')}.`,
        patientName: activePatient.fullName,
        labReports: submittedTests.map((s) => ({
          testType: s.category,
          testName: `${s.code} - ${s.name}`,
          result: 'Pending Specimen Analysis',
          unit: '',
          referenceRange: s.sampleType,
          isAbnormal: false,
          reportDate: today,
          notes: s.urgent ? 'URGENT / STAT Requisition' : `TAT: ${s.turnaround}`,
        })),
      })

      if (res.success) {
        setOrderRef(ref)
        setLastSubmittedSlip({
          ref,
          clinicalInfo: normalizedClinicalInfo,
          tests: submittedTests,
        })
        setSelectedTests([])
        await loadHospitalLabRequisitions(activePatient.icNumber)
        toast({
          title: 'Laboratory Requisition Submitted',
          description: `${ref} logged to ${activePatient.fullName}'s timeline and queued for laboratory sign-off.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Requisition Rejected',
          description: res.error || 'Could not submit laboratory order.',
          variant: 'destructive',
        })
      }
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const handleSignOff = async (lab: HospitalLabRequisition) => {
    if (!user?.hospitalId || !lab.id || signingOffId) return
    const draft = signOffDrafts[lab.id]
    if (!draft?.result.trim()) {
      toast({
        title: 'Quantitative / Qualitative Result Required',
        description: `Enter a verified laboratory result before signing off ${lab.testName}.`,
        variant: 'destructive',
      })
      return
    }

    setSigningOffId(lab.id)
    try {
      const res = await hospitalApi.signOffLabReport(user.hospitalId, lab.recordId, lab.id, {
        result: draft.result.trim(),
        unit: draft.unit.trim(),
        referenceRange: draft.referenceRange.trim(),
        isAbnormal: draft.isAbnormal,
        notes: draft.notes.trim(),
      })
      if (res.success && res.data?.labReport) {
        setRequisitions((prev) =>
          prev.map((r) => (r.id === lab.id ? { ...r, ...res.data!.labReport } : r))
        )
        toast({
          title: 'Diagnostic Report Signed Off',
          description: `${lab.testName} finalized (${res.data.labReport.result} ${res.data.labReport.unit}).`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Sign-Off Rejected',
          description: res.error || 'Unable to sign off diagnostic report.',
          variant: 'destructive',
        })
      }
    } finally {
      setSigningOffId(null)
    }
  }

  const pendingRequisitions = requisitions.filter((r) => isPendingLabValue(r.result))
  const canPrintSlip = selectedTests.length > 0 || Boolean(lastSubmittedSlip)

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={FlaskConical}
        title={t.labOrders}
        subtitle="Pathology panel ordering, specimen tube guidance & diagnostic result sign-off"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" disabled={!canPrintSlip} onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" />
                {t.printSummary}
              </Button>
              <Button
                size="sm"
                disabled={selectedTests.length === 0 || submitting}
                onClick={handleSubmitOrder}
                className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}
                Submit Requisition
              </Button>
            </>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.labOrders} />
      ) : (
        <>
          {orderRef && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Pathology Requisition <code className="font-mono tabular-nums">{orderRef}</code> attached to patient clinical record and queued below for laboratory result verification.
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
                  Print Requisition
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Catalog */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                      selectedCategory === cat
                        ? `${theme.iconBg} text-white`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="lab-catalog-search"
                  aria-label="Search laboratory catalog"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search FBC, RFT, HbA1c, Dengue…"
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredCatalog.map((item) => {
                  const isAdded = selectedTests.some((s) => s.code === item.code)
                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={isAdded}
                      onClick={() => addTest(item)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2',
                        isAdded
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                      )}
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          <span className="font-mono mr-1.5">{item.code}</span>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {item.sampleType} • TAT {item.turnaround}
                          {item.fasting ? ' • Fasting' : ''}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Requisition */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <label htmlFor="lab-clinical-indication" className="text-xs font-bold text-slate-700">
                  Clinical Indication & Provisional Diagnosis
                </label>
                <Input
                  id="lab-clinical-indication"
                  value={clinicalInfo}
                  onChange={(e) => setClinicalInfo(e.target.value)}
                  placeholder="e.g., Rule out acute dengue vs bacterial sepsis; baseline renal profile…"
                  className="mt-1"
                />
              </div>

              {selectedTests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-200 rounded-xl">
                  Select laboratory tests from the catalog on the left to build this requisition.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedTests.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">{item.code}</span>
                          <span className="font-bold text-sm text-slate-900">{item.name}</span>
                          {item.fasting && <StatusBadge tone="warning" label="Fasting Required" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Specimen: {item.sampleType} • Est. Turnaround: {item.turnaround}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTests((prev) =>
                              prev.map((s) => (s.id === item.id ? { ...s, urgent: !s.urgent } : s))
                            )
                          }
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                            item.urgent
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          )}
                        >
                          {item.urgent ? 'STAT Urgent' : 'Mark STAT'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTests((prev) => prev.filter((s) => s.id !== item.id))}
                          aria-label={`Remove ${item.code}`}
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Hospital Requisitions & Diagnostic Result Sign-Off */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ClipboardCheck className={cn('w-4 h-4', theme.iconColor)} />
                <h2 className="text-sm font-bold text-slate-900">
                  {theme.shortName} Pending Diagnostic Requisitions ({pendingRequisitions.length})
                </h2>
              </div>
              <span className="text-xs text-slate-600">
                Finalized results become immutable (HTTP 409 on duplicate sign-off)
              </span>
            </div>

            {pendingRequisitions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-600">
                No pending laboratory or imaging requisitions awaiting sign-off for {activePatient.fullName}.
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {pendingRequisitions.map((lab) => {
                  const lid = lab.id!
                  const draft = signOffDrafts[lid] || {
                    result: '',
                    unit: lab.unit || '',
                    referenceRange: lab.referenceRange || '',
                    isAbnormal: false,
                    notes: lab.notes || '',
                  }
                  return (
                    <div
                      key={lid}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{lab.testName}</p>
                          <p className="text-xs text-slate-600 tabular-nums">
                            {lab.testType} • Ordered {formatDate(lab.visitDate)}
                          </p>
                        </div>
                        <StatusBadge tone="warning" label="Pending Sign-Off" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                        <div>
                          <label htmlFor={`so-res-${lid}`} className="font-semibold text-slate-700">
                            Result *
                          </label>
                          <Input
                            id={`so-res-${lid}`}
                            placeholder="e.g., 5.4 or Negative"
                            value={draft.result}
                            onChange={(e) =>
                              setSignOffDrafts((prev) => ({
                                ...prev,
                                [lid]: { ...draft, result: e.target.value },
                              }))
                            }
                            className="h-9 text-xs bg-white mt-0.5 tabular-nums"
                          />
                        </div>
                        <div>
                          <label htmlFor={`so-unit-${lid}`} className="font-semibold text-slate-700">
                            Unit
                          </label>
                          <Input
                            id={`so-unit-${lid}`}
                            placeholder="mmol/L, g/dL…"
                            value={draft.unit}
                            onChange={(e) =>
                              setSignOffDrafts((prev) => ({
                                ...prev,
                                [lid]: { ...draft, unit: e.target.value },
                              }))
                            }
                            className="h-9 text-xs bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label htmlFor={`so-ref-${lid}`} className="font-semibold text-slate-700">
                            Ref Range
                          </label>
                          <Input
                            id={`so-ref-${lid}`}
                            placeholder="3.9 - 5.5"
                            value={draft.referenceRange}
                            onChange={(e) =>
                              setSignOffDrafts((prev) => ({
                                ...prev,
                                [lid]: { ...draft, referenceRange: e.target.value },
                              }))
                            }
                            className="h-9 text-xs bg-white mt-0.5 tabular-nums"
                          />
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-red-800 h-9 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.isAbnormal}
                              onChange={(e) =>
                                setSignOffDrafts((prev) => ({
                                  ...prev,
                                  [lid]: { ...draft, isAbnormal: e.target.checked },
                                }))
                              }
                            />
                            Abnormal
                          </label>
                          <Button
                            size="sm"
                            disabled={signingOffId === lid}
                            onClick={() => void handleSignOff(lab)}
                            className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}
                          >
                            {signingOffId === lid && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            )}
                            {t.signOffLabResult}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
