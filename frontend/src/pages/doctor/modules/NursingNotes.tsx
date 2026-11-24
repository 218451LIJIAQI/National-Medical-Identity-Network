import { useState, useEffect, useRef } from 'react'
import {
  Stethoscope,
  Plus,
  Heart,
  Droplets,
  Save,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type PatientNursingChartDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, formatDateTime, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const NOTE_TYPE_CONFIG: Record<
  PatientNursingChartDto['notes'][number]['type'],
  { label: string; borderClass: string; badgeClass: string }
> = {
  assessment: { label: 'Assessment', borderClass: 'border-blue-500', badgeClass: 'bg-blue-100 text-blue-800' },
  intervention: { label: 'Intervention', borderClass: 'border-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800' },
  evaluation: { label: 'Evaluation', borderClass: 'border-purple-500', badgeClass: 'bg-purple-100 text-purple-800' },
  handover: { label: 'Shift Handover', borderClass: 'border-amber-500', badgeClass: 'bg-amber-100 text-amber-900' },
}

function isVitalAbnormal(v: PatientNursingChartDto['vitalsHistory'][number]): boolean {
  const [sysRaw, diaRaw] = v.bp.split('/')
  const sys = Number(sysRaw)
  const dia = Number(diaRaw)
  if (!Number.isNaN(sys) && (sys >= 140 || sys < 90)) return true
  if (!Number.isNaN(dia) && (dia >= 90 || dia < 60)) return true
  if (v.pulse > 100 || v.pulse < 50) return true
  if (v.temp >= 38.0 || v.temp < 35.5) return true
  if (v.rr > 22 || v.rr < 10) return true
  if (v.spo2 < 94) return true
  if (v.painScore >= 7) return true
  return false
}

export default function NursingNotes() {
  const user = useAuthStore((s) => s.user)
  const { activePatient, clearActivePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const loadSeqRef = useRef(0)
  const [chart, setChart] = useState<PatientNursingChartDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingAction, setSavingAction] = useState(false)
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'io'>('vitals')
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)

  const [ioDraft, setIoDraft] = useState({
    oralMl: 0,
    ivFluidMl: 0,
    bloodMl: 0,
    urineMl: 0,
    drainMl: 0,
    vomitusMl: 0,
  })

  const [newVitals, setNewVitals] = useState({
    bp: '120/80',
    pulse: '74',
    temp: '36.6',
    rr: '16',
    spo2: '98',
    gcs: '15/15',
    painScore: '0',
    bloodSugar: '',
  })

  const [newNote, setNewNote] = useState({
    type: 'assessment' as PatientNursingChartDto['notes'][number]['type'],
    content: '',
    priority: 'routine' as PatientNursingChartDto['notes'][number]['priority'],
  })

  // Strictly reset and reload patient-scoped nursing chart whenever bound patient changes
  useEffect(() => {
    const ic = activePatient?.icNumber
    setChart(null)
    setShowNewVitals(false)
    setShowNewNote(false)

    if (!ic) return

    const seq = ++loadSeqRef.current
    setLoading(true)
    hospitalApi
      .getNursingChart(hospitalId, ic)
      .then((res) => {
        if (seq !== loadSeqRef.current) return
        if (res.accessDenied) {
          clearActivePatient()
          toast({
            title: t.privacyRestrictedTitle,
            description: res.error || t.privacyRestrictedDesc,
            variant: 'destructive',
          })
          return
        }
        if (res.success && res.data) {
          setChart(res.data)
          setIoDraft({
            oralMl: res.data.ioChart.oralMl,
            ivFluidMl: res.data.ioChart.ivFluidMl,
            bloodMl: res.data.ioChart.bloodMl,
            urineMl: res.data.ioChart.urineMl,
            drainMl: res.data.ioChart.drainMl,
            vomitusMl: res.data.ioChart.vomitusMl,
          })
        }
      })
      .finally(() => {
        if (seq === loadSeqRef.current) setLoading(false)
      })
  }, [activePatient?.icNumber, hospitalId])

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient) return
    setSavingAction(true)
    try {
      const res = await hospitalApi.addNursingVitals(hospitalId, activePatient.icNumber, {
        bp: newVitals.bp.trim(),
        pulse: Number(newVitals.pulse),
        temp: Number(newVitals.temp),
        rr: Number(newVitals.rr),
        spo2: Number(newVitals.spo2),
        gcs: newVitals.gcs.trim() || '15/15',
        painScore: Number(newVitals.painScore) || 0,
        bloodSugar: newVitals.bloodSugar ? Number(newVitals.bloodSugar) : undefined,
        recordedBy: user?.fullName || `Dr. ${user?.icNumber}`,
      })
      if (res.success && res.data) {
        setChart(res.data)
        setShowNewVitals(false)
        toast({ title: 'Vital Signs Logged', description: 'Observation saved to patient nursing chart.', variant: 'success' })
      } else {
        toast({ title: 'Invalid Vital Signs', description: res.error || 'Failed to record vitals', variant: 'destructive' })
      }
    } finally {
      setSavingAction(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient || !newNote.content.trim()) return
    setSavingAction(true)
    try {
      const res = await hospitalApi.addNursingNote(hospitalId, activePatient.icNumber, {
        type: newNote.type,
        content: newNote.content.trim(),
        priority: newNote.priority,
        nurse: user?.fullName || `Clinician (${user?.icNumber})`,
      })
      if (res.success && res.data) {
        setChart(res.data)
        setNewNote({ type: 'assessment', content: '', priority: 'routine' })
        setShowNewNote(false)
        toast({ title: 'Progress Note Saved', description: 'Nursing note persisted for active patient.', variant: 'success' })
      } else {
        toast({ title: 'Save Failed', description: res.error || 'Could not save nursing note', variant: 'destructive' })
      }
    } finally {
      setSavingAction(false)
    }
  }

  const handleSaveFluidBalance = async () => {
    if (!activePatient) return
    setSavingAction(true)
    try {
      const res = await hospitalApi.updateFluidBalance(hospitalId, activePatient.icNumber, ioDraft)
      if (res.success && res.data) {
        setChart(res.data)
        toast({ title: 'Fluid Balance Saved', description: '24-hour intake/output chart updated.', variant: 'success' })
      }
    } finally {
      setSavingAction(false)
    }
  }

  const totalIntake = ioDraft.oralMl + ioDraft.ivFluidMl + ioDraft.bloodMl
  const totalOutput = ioDraft.urineMl + ioDraft.drainMl + ioDraft.vomitusMl
  const netBalance = totalIntake - totalOutput

  const handlePrintChart = () => {
    if (!activePatient || !chart) return
    const vitalsRows = chart.vitalsHistory
      .map(
        (v) => `<tr>
          <td>${escapeHtml(formatDateTime(v.timestamp))}</td>
          <td>${escapeHtml(v.bp)}</td>
          <td>${escapeHtml(v.pulse)} bpm</td>
          <td>${escapeHtml(v.temp)} °C</td>
          <td>${escapeHtml(v.rr)} /min</td>
          <td>${escapeHtml(v.spo2)}%</td>
          <td>${escapeHtml(v.recordedBy)}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Nursing Observation Chart - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Inpatient / Observation Nursing Chart (${escapeHtml(chart.ward)} • ${escapeHtml(chart.bedNumber)})</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>24h Fluid Balance:</strong> Intake ${totalIntake} mL / Output ${totalOutput} mL (Net ${netBalance >= 0 ? '+' : ''}${netBalance} mL)
      </div>
      <table>
        <thead><tr><th>Timestamp</th><th>BP</th><th>Pulse</th><th>Temp</th><th>RR</th><th>SpO2</th><th>Recorded By</th></tr></thead>
        <tbody>${vitalsRows || '<tr><td colspan="7">No observations recorded</td></tr>'}</tbody>
      </table>`
    )
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={Stethoscope}
        title={t.nursingNotes}
        subtitle="Patient-scoped vital observation flowsheet, progress notes & 24h fluid balance"
        badge={chart ? `${chart.ward} • ${chart.bedNumber}` : theme.shortName}
        actions={
          activePatient && chart ? (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintChart}>
                <Printer className="w-4 h-4 mr-1.5" />
                {t.printSummary}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNewVitals(true)}>
                <Heart className="w-4 h-4 mr-1.5 text-red-600" />
                Record Vitals
              </Button>
              <Button
                size="sm"
                onClick={() => setShowNewNote(true)}
                className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Nursing Note
              </Button>
            </>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.nursingNotes} />
      ) : loading || !chart ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-72 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
            {[
              { id: 'vitals', label: `Vital Signs (${chart.vitalsHistory.length})`, icon: Heart },
              { id: 'notes', label: `Progress Notes (${chart.notes.length})`, icon: Stethoscope },
              { id: 'io', label: '24h Fluid Balance (I/O)', icon: Droplets },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'vitals' | 'notes' | 'io')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors',
                  activeTab === tab.id
                    ? `${theme.iconBg} text-white shadow-sm`
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'vitals' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {chart.vitalsHistory.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  No nursing observations recorded for {activePatient.fullName} yet. Click "Record Vitals" to chart baseline parameters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="py-3 px-4 text-left font-bold">Timestamp</th>
                        <th className="py-3 px-4 text-left font-bold">BP (mmHg)</th>
                        <th className="py-3 px-4 text-left font-bold">Pulse</th>
                        <th className="py-3 px-4 text-left font-bold">Temp</th>
                        <th className="py-3 px-4 text-left font-bold">RR</th>
                        <th className="py-3 px-4 text-left font-bold">SpO2</th>
                        <th className="py-3 px-4 text-left font-bold">Pain / GCS</th>
                        <th className="py-3 px-4 text-left font-bold">MEWS Status</th>
                        <th className="py-3 px-4 text-left font-bold">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chart.vitalsHistory.map((v) => {
                        const abnormal = isVitalAbnormal(v)
                        return (
                          <tr key={v.id} className={abnormal ? 'bg-red-50/50' : 'hover:bg-slate-50/70'}>
                            <td className="py-3 px-4 font-semibold text-slate-800">{formatDateTime(v.timestamp)}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{v.bp}</td>
                            <td className="py-3 px-4">{v.pulse} bpm</td>
                            <td className="py-3 px-4">{Number(v.temp).toFixed(1)} °C</td>
                            <td className="py-3 px-4">{v.rr} /min</td>
                            <td className="py-3 px-4 font-bold">{v.spo2}%</td>
                            <td className="py-3 px-4">{v.painScore}/10 • {v.gcs}</td>
                            <td className="py-3 px-4">
                              {abnormal ? (
                                <StatusBadge tone="critical" icon={AlertTriangle} label="Alert" />
                              ) : (
                                <StatusBadge tone="success" icon={CheckCircle2} label="Stable" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{v.recordedBy}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {chart.notes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                  No nursing progress notes recorded for {activePatient.fullName}.
                </div>
              ) : (
                chart.notes.map((n) => {
                  const cfg = NOTE_TYPE_CONFIG[n.type]
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'bg-white rounded-2xl border border-slate-200 border-l-4 p-4 shadow-sm',
                        cfg.borderClass
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', cfg.badgeClass)}>
                            {cfg.label}
                          </span>
                          {n.priority !== 'routine' && (
                            <StatusBadge
                              tone={n.priority === 'urgent' ? 'critical' : 'warning'}
                              label={n.priority.toUpperCase()}
                            />
                          )}
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {formatDateTime(n.timestamp)} • {n.nurse}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{n.content}</p>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'io' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold text-blue-800">Total 24h Intake</p>
                  <p className="text-2xl font-extrabold text-blue-950 mt-1">{totalIntake} mL</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-900">Total 24h Output</p>
                  <p className="text-2xl font-extrabold text-amber-950 mt-1">{totalOutput} mL</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-900">Net Fluid Balance</p>
                  <p className="text-2xl font-extrabold text-emerald-950 mt-1">
                    {netBalance >= 0 ? `+${netBalance}` : netBalance} mL
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {(
                  [
                    ['oralMl', 'Oral Intake (mL)'],
                    ['ivFluidMl', 'IV Fluids (mL)'],
                    ['bloodMl', 'Blood Products (mL)'],
                    ['urineMl', 'Urine Output (mL)'],
                    ['drainMl', 'Surgical Drain (mL)'],
                    ['vomitusMl', 'Emesis / NG (mL)'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      className="tabular-nums"
                      value={ioDraft[field]}
                      onChange={(e) =>
                        setIoDraft({ ...ioDraft, [field]: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveFluidBalance}
                  disabled={savingAction}
                  className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
                >
                  {savingAction ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Fluid Balance
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ModalDialog
        open={showNewVitals}
        onClose={() => setShowNewVitals(false)}
        title="Record Bedside Vital Signs"
        description={activePatient ? `${activePatient.fullName} (${activePatient.icNumber})` : ''}
      >
        <form onSubmit={handleAddVitals} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">BP (sys/dia) *</label>
              <Input
                required
                value={newVitals.bp}
                onChange={(e) => setNewVitals({ ...newVitals, bp: e.target.value })}
                placeholder="120/80"
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Pulse (bpm) *</label>
              <Input
                type="number"
                required
                value={newVitals.pulse}
                onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })}
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Temp (°C) *</label>
              <Input
                type="number"
                step="0.1"
                required
                value={newVitals.temp}
                onChange={(e) => setNewVitals({ ...newVitals, temp: e.target.value })}
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">RR (/min) *</label>
              <Input
                type="number"
                required
                value={newVitals.rr}
                onChange={(e) => setNewVitals({ ...newVitals, rr: e.target.value })}
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">SpO2 (%) *</label>
              <Input
                type="number"
                required
                value={newVitals.spo2}
                onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })}
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Pain (0-10)</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={newVitals.painScore}
                onChange={(e) => setNewVitals({ ...newVitals, painScore: e.target.value })}
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">GCS</label>
              <Input
                value={newVitals.gcs}
                onChange={(e) => setNewVitals({ ...newVitals, gcs: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Capillary BG (mmol/L)</label>
              <Input
                type="number"
                step="0.1"
                value={newVitals.bloodSugar}
                onChange={(e) => setNewVitals({ ...newVitals, bloodSugar: e.target.value })}
                placeholder="Optional"
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNewVitals(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={savingAction} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {savingAction && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Observation
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={showNewNote}
        onClose={() => setShowNewNote(false)}
        title="Add Nursing Progress Note"
        description={activePatient ? `${activePatient.fullName} (${activePatient.icNumber})` : ''}
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Note Category</label>
              <select
                value={newNote.type}
                onChange={(e) =>
                  setNewNote({ ...newNote, type: e.target.value as PatientNursingChartDto['notes'][number]['type'] })
                }
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="assessment">Clinical Assessment</option>
                <option value="intervention">Nursing Intervention</option>
                <option value="evaluation">Outcome Evaluation</option>
                <option value="handover">Shift Handover (ISBAR)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Priority</label>
              <select
                value={newNote.priority}
                onChange={(e) =>
                  setNewNote({
                    ...newNote,
                    priority: e.target.value as PatientNursingChartDto['notes'][number]['priority'],
                  })
                }
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="routine">Routine</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent Escalation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Observation & Care Details *</label>
            <textarea
              required
              rows={4}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Document bedside assessment, medication response, wound care, or handover notes…"
              className="w-full mt-1 p-3 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNewNote(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={savingAction} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {savingAction && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Note
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
