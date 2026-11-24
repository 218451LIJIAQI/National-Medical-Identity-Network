import { useState, useEffect, useRef } from 'react'
import {
  FlaskConical,
  Plus,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  Printer,
  Loader2,
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
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, printHtmlDocument } from '@/lib/utils'
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
  { code: 'Dengue', name: 'Dengue NS1 / IgM / IgG', category: 'Serology', sampleType: 'Plain Blood', turnaround: '4 hours', fasting: false },
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
  const submitLockRef = useRef(false)

  useEffect(() => {
    setSelectedTests([])
    setClinicalInfo('')
    setOrderRef(null)
  }, [activePatient?.icNumber])

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
    const rows = selectedTests
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
        <div><h1>${escapeHtml(theme.name)}</h1><p>Pathology & Laboratory Requisition (${escapeHtml(orderRef || 'DRAFT')})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Clinical Indication:</strong> ${escapeHtml(clinicalInfo || 'Routine investigation')}
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
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: today,
        visitType: 'outpatient',
        chiefComplaint: clinicalInfo.trim() || 'Laboratory Investigation Requisition',
        diagnosis: [clinicalInfo.trim() || 'Diagnostic Laboratory Workup'],
        notes: `Submitted laboratory requisition ${ref}: ${selectedTests.map((s) => s.code).join(', ')}.`,
        patientName: activePatient.fullName,
        labReports: selectedTests.map((s) => ({
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
        toast({
          title: 'Laboratory Requisition Submitted',
          description: `${ref} (${selectedTests.length} test(s)) logged to ${activePatient.fullName}'s timeline.`,
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

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={FlaskConical}
        title={t.labOrders}
        subtitle="Pathology panel ordering, specimen tube guidance & STAT turnaround flagging"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" disabled={selectedTests.length === 0} onClick={handlePrint}>
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
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Pathology Requisition <code className="font-mono tabular-nums">{orderRef}</code> attached to patient clinical record.
              </span>
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
                        <p className="text-[11px] text-slate-500">
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
                <label className="text-xs font-bold text-slate-700">Clinical Indication & Provisional Diagnosis</label>
                <Input
                  value={clinicalInfo}
                  onChange={(e) => setClinicalInfo(e.target.value)}
                  placeholder="e.g., Rule out acute dengue vs bacterial sepsis; baseline renal profile…"
                  className="mt-1"
                />
              </div>

              {selectedTests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
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
        </>
      )}
    </div>
  )
}
