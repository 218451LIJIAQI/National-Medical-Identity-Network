import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope,
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Heart,
  Droplets,
  Save,
  History,
  Edit3,
  Printer,
} from 'lucide-react'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface VitalSigns {
  timestamp: string
  bp: string
  pulse: number
  temp: number
  rr: number
  spo2: number
  gcs: string
  painScore: number
  bloodSugar?: number
  recordedBy: string
}

interface NursingNote {
  id: string
  timestamp: string
  type: 'assessment' | 'intervention' | 'evaluation' | 'handover'
  content: string
  nurse: string
  priority: 'routine' | 'important' | 'urgent'
}

const todayLabel = new Date().toISOString().split('T')[0]

const initialVitals: VitalSigns[] = [
  { timestamp: `${todayLabel} 08:00`, bp: '122/78', pulse: 74, temp: 36.6, rr: 16, spo2: 98, gcs: '15/15', painScore: 1, bloodSugar: 6.1, recordedBy: 'SN Fatimah' },
  { timestamp: `${todayLabel} 12:00`, bp: '118/76', pulse: 72, temp: 36.7, rr: 16, spo2: 99, gcs: '15/15', painScore: 2, recordedBy: 'SN Siti' },
]

const initialNotes: NursingNote[] = [
  { id: '1', timestamp: `${todayLabel} 08:30`, type: 'assessment', content: 'Patient alert, oriented, comfortable in bed. IV cannula patent without phlebitis.', nurse: 'SN Fatimah', priority: 'routine' },
  { id: '2', timestamp: `${todayLabel} 12:15`, type: 'intervention', content: 'Scheduled oral medications administered and tolerated well. Fall risk precautions maintained.', nurse: 'SN Siti', priority: 'routine' },
]

const NOTE_TYPE_CONFIG: Record<
  NursingNote['type'],
  { label: string; borderClass: string; badgeClass: string }
> = {
  assessment: { label: 'Assessment', borderClass: 'border-blue-500', badgeClass: 'bg-blue-100 text-blue-800' },
  intervention: { label: 'Intervention', borderClass: 'border-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800' },
  evaluation: { label: 'Evaluation', borderClass: 'border-purple-500', badgeClass: 'bg-purple-100 text-purple-800' },
  handover: { label: 'Handover', borderClass: 'border-amber-500', badgeClass: 'bg-amber-100 text-amber-900' },
}

function isVitalRowAbnormal(v: VitalSigns): boolean {
  const [sysRaw, diaRaw] = v.bp.split('/')
  const sys = Number(sysRaw)
  const dia = Number(diaRaw)
  if (!Number.isNaN(sys) && (sys >= 140 || sys < 90)) return true
  if (!Number.isNaN(dia) && (dia >= 90 || dia < 60)) return true
  if (v.pulse > 100 || v.pulse < 50) return true
  if (v.temp >= 38.0 || v.temp < 35.5) return true
  if (v.spo2 < 94) return true
  if (v.painScore >= 7) return true
  return false
}

interface NursingNotesProps {
  patientName?: string
  patientIC?: string
  ward?: string
  bedNumber?: string
}

export default function NursingNotes({
  patientName,
  patientIC,
  ward = 'Ward 5A',
  bedNumber = 'Bed 12',
}: NursingNotesProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()

  const resolvedName = activePatient?.fullName || patientName || 'Active Ward Patient'
  const resolvedIc = activePatient?.icNumber || patientIC || '880101-14-5678'
  const recorderName = user?.fullName || 'Clinical Staff'

  const [vitalsHistory, setVitalsHistory] = useState<VitalSigns[]>(initialVitals)
  const [notes, setNotes] = useState<NursingNote[]>(initialNotes)
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'io'>('vitals')
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)

  const [ioChart, setIoChart] = useState({
    oralMl: 1200,
    ivFluidMl: 1500,
    bloodMl: 0,
    urineMl: 1800,
    drainMl: 150,
    vomitusMl: 0,
  })

  const [newVitals, setNewVitals] = useState<Partial<VitalSigns>>({
    bp: '120/80',
    pulse: 72,
    temp: 36.6,
    rr: 16,
    spo2: 98,
    gcs: '15/15',
    painScore: 0,
  })

  const [newNote, setNewNote] = useState({
    type: 'assessment' as NursingNote['type'],
    content: '',
    priority: 'routine' as NursingNote['priority'],
  })

  const addVitals = (e: React.FormEvent) => {
    e.preventDefault()
    const pulse = Number(newVitals.pulse) || 72
    const temp = Number(newVitals.temp) || 36.6
    const spo2 = Number(newVitals.spo2) || 98
    const painScore = Math.min(10, Math.max(0, Number(newVitals.painScore) || 0))
    if (pulse < 20 || pulse > 260 || temp < 28 || temp > 44 || spo2 < 40 || spo2 > 100) {
      toast({
        title: 'Out-of-Bounds Vital Reading',
        description: 'Please verify pulse (20-260 bpm), temperature (28-44°C), and SpO2 (40-100%).',
        variant: 'destructive',
      })
      return
    }
    const vitals: VitalSigns = {
      timestamp: new Date().toLocaleString('en-MY'),
      bp: (newVitals.bp || '120/80').trim(),
      pulse,
      temp,
      rr: Number(newVitals.rr) || 16,
      spo2,
      gcs: newVitals.gcs || '15/15',
      painScore,
      bloodSugar: newVitals.bloodSugar,
      recordedBy: recorderName,
    }
    setVitalsHistory([vitals, ...vitalsHistory])
    setShowNewVitals(false)
    toast({
      title: 'Vital Signs Recorded',
      description: `Logged BP ${vitals.bp}, SpO2 ${vitals.spo2}%.`,
      variant: 'success',
    })
  }

  const addNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.content.trim()) return
    const note: NursingNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-MY'),
      type: newNote.type,
      content: newNote.content.trim(),
      nurse: recorderName,
      priority: newNote.priority,
    }
    setNotes([note, ...notes])
    setShowNewNote(false)
    setNewNote({ type: 'assessment', content: '', priority: 'routine' })
    toast({
      title: 'Nursing Note Saved',
      description: `${note.type.toUpperCase()} note appended.`,
      variant: 'success',
    })
  }

  const totalInput = ioChart.oralMl + ioChart.ivFluidMl + ioChart.bloodMl
  const totalOutput = ioChart.urineMl + ioChart.drainMl + ioChart.vomitusMl
  const netBalance = totalInput - totalOutput
  const latestVitals = vitalsHistory[0]

  const handlePrintChart = () => {
    const vitalsRows = vitalsHistory
      .map(
        (v) => `<tr>
          <td>${escapeHtml(v.timestamp)}</td>
          <td>${escapeHtml(v.bp)}</td>
          <td>${escapeHtml(v.pulse)} bpm</td>
          <td>${escapeHtml(v.temp)} °C</td>
          <td>${escapeHtml(v.spo2)}%</td>
          <td>${escapeHtml(v.painScore)}/10</td>
          <td>${escapeHtml(v.recordedBy)}</td>
        </tr>`
      )
      .join('')
    const notesRows = notes
      .map(
        (n) => `<tr>
          <td>${escapeHtml(n.timestamp)}</td>
          <td>${escapeHtml(n.type.toUpperCase())} (${escapeHtml(n.priority)})</td>
          <td>${escapeHtml(n.content)}</td>
          <td>${escapeHtml(n.nurse)}</td>
        </tr>`
      )
      .join('')

    printHtmlDocument(
      `Nursing Care Chart - ${resolvedName}`,
      `<div class="header">
        <div><h1>Nursing Observation &amp; I/O Chart</h1><p>${escapeHtml(resolvedName)} (${escapeHtml(resolvedIc)}) • ${escapeHtml(ward)} ${escapeHtml(bedNumber)}</p></div>
        <div>${escapeHtml(new Date().toLocaleString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Latest Vitals:</strong> BP ${escapeHtml(latestVitals?.bp || '-')} | HR ${escapeHtml(latestVitals?.pulse ?? '-')} bpm | Temp ${escapeHtml(latestVitals?.temp ?? '-')}°C | SpO2 ${escapeHtml(latestVitals?.spo2 ?? '-')}%<br/>
        <strong>24h Fluid Balance:</strong> Input ${escapeHtml(totalInput)} ml - Output ${escapeHtml(totalOutput)} ml = ${netBalance >= 0 ? '+' : ''}${escapeHtml(netBalance)} ml
      </div>
      <h3>Vital Signs Log</h3>
      <table><thead><tr><th>Time</th><th>BP</th><th>HR</th><th>Temp</th><th>SpO2</th><th>Pain</th><th>Recorded By</th></tr></thead><tbody>${vitalsRows}</tbody></table>
      <h3>Progress Notes</h3>
      <table><thead><tr><th>Time</th><th>Type</th><th>Observation</th><th>Nurse</th></tr></thead><tbody>${notesRows}</tbody></table>`
    )
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Nursing Records</h2>
          <p className="text-slate-600 text-sm">
            {ward} • {bedNumber} • Inpatient Observation & Fluid Balance
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintChart}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Printer className="w-4 h-4" /> Print Chart
        </button>
      </div>

      {latestVitals && (
        <div className="grid grid-cols-4 gap-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 tabular-nums">
          <div className="bg-white p-3 rounded-lg text-center border border-pink-100">
            <p className="text-xs text-slate-500">Latest BP</p>
            <p className="font-bold text-slate-900">{latestVitals.bp} mmHg</p>
          </div>
          <div className="bg-white p-3 rounded-lg text-center border border-pink-100">
            <p className="text-xs text-slate-500">Heart Rate</p>
            <p className="font-bold text-slate-900">{latestVitals.pulse} bpm</p>
          </div>
          <div className="bg-white p-3 rounded-lg text-center border border-pink-100">
            <p className="text-xs text-slate-500">Temperature</p>
            <p className="font-bold text-slate-900">{latestVitals.temp}°C</p>
          </div>
          <div className="bg-white p-3 rounded-lg text-center border border-pink-100">
            <p className="text-xs text-slate-500">SpO2</p>
            <p
              className={`font-bold ${
                latestVitals.spo2 < 94 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {latestVitals.spo2}%
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {[
          { id: 'vitals', label: 'Vital Signs', icon: Heart },
          { id: 'notes', label: 'Progress Notes', icon: FileText },
          { id: 'io', label: '24h I/O Balance', icon: Droplets },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'vitals' && (
          <motion.div key="vitals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewVitals(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700"
              >
                <Plus className="w-4 h-4" /> Record Vital Signs
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <History className="w-4 h-4 text-pink-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Observation Log</h3>
              </div>
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-center">BP</th>
                    <th className="px-4 py-3 text-center">HR</th>
                    <th className="px-4 py-3 text-center">Temp</th>
                    <th className="px-4 py-3 text-center">SpO2</th>
                    <th className="px-4 py-3 text-center">Pain</th>
                    <th className="px-4 py-3 text-center">EWS Status</th>
                    <th className="px-4 py-3 text-left">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitalsHistory.map((v, idx) => {
                    const abnormal = isVitalRowAbnormal(v)
                    return (
                      <tr key={idx} className={abnormal ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}>
                        <td className="px-4 py-3 text-xs text-slate-600">{v.timestamp}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">{v.bp}</td>
                        <td className="px-4 py-3 text-center">{v.pulse}</td>
                        <td className="px-4 py-3 text-center">{v.temp}°C</td>
                        <td className="px-4 py-3 text-center font-medium">{v.spo2}%</td>
                        <td className="px-4 py-3 text-center">{v.painScore}/10</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge
                            tone={abnormal ? 'critical' : 'success'}
                            icon={abnormal ? AlertTriangle : CheckCircle2}
                            label={abnormal ? 'Review' : 'Stable'}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{v.recordedBy}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'notes' && (
          <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewNote(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700"
              >
                <Edit3 className="w-4 h-4" /> Add Nursing Note
              </button>
            </div>

            <div className="space-y-3">
              {notes.map((note) => {
                const style = NOTE_TYPE_CONFIG[note.type]
                return (
                  <div
                    key={note.id}
                    className={`p-4 bg-white rounded-xl border border-slate-200 border-l-4 ${style.borderClass} shadow-sm`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${style.badgeClass}`}
                        >
                          {style.label}
                        </span>
                        {note.priority === 'urgent' && (
                          <StatusBadge tone="critical" icon={AlertTriangle} label="URGENT" />
                        )}
                        {note.priority === 'important' && (
                          <StatusBadge tone="warning" icon={AlertCircle} label="Important" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5" /> {note.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{note.content}</p>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> {note.nurse}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'io' && (
          <motion.div
            key="io"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 tabular-nums"
          >
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Interactive 24-Hour Fluid Input / Output Balance
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-900 text-sm">FLUID INPUT (ml)</h4>
                {[
                  { key: 'oralMl', label: 'Oral Intake' },
                  { key: 'ivFluidMl', label: 'IV Crystalloids / Infusions' },
                  { key: 'bloodMl', label: 'Blood / Colloids' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={ioChart[item.key as keyof typeof ioChart]}
                      onChange={(e) =>
                        setIoChart({
                          ...ioChart,
                          [item.key]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-28 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-right text-sm font-semibold tabular-nums"
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-blue-950">
                  <span>TOTAL INPUT</span>
                  <span>{totalInput} ml</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                <h4 className="font-bold text-amber-900 text-sm">FLUID OUTPUT (ml)</h4>
                {[
                  { key: 'urineMl', label: 'Urine Output' },
                  { key: 'drainMl', label: 'Surgical Drain' },
                  { key: 'vomitusMl', label: 'NG / Vomitus' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={ioChart[item.key as keyof typeof ioChart]}
                      onChange={(e) =>
                        setIoChart({
                          ...ioChart,
                          [item.key]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-28 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-right text-sm font-semibold tabular-nums"
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-amber-200 flex justify-between font-bold text-amber-950">
                  <span>TOTAL OUTPUT</span>
                  <span>{totalOutput} ml</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                NET 24-HOUR FLUID BALANCE
              </span>
              <span className="text-2xl font-bold text-emerald-800">
                {netBalance >= 0 ? `+${netBalance}` : netBalance} ml
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalDialog
        open={showNewVitals}
        onClose={() => setShowNewVitals(false)}
        title="Record Vital Signs"
        description={`${resolvedName} • ${ward} ${bedNumber}`}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={addVitals} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 tabular-nums">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">BP (mmHg)</label>
              <input
                type="text"
                value={newVitals.bp}
                onChange={(e) => setNewVitals({ ...newVitals, bp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pulse (bpm)</label>
              <input
                type="number"
                value={newVitals.pulse}
                onChange={(e) =>
                  setNewVitals({ ...newVitals, pulse: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                value={newVitals.temp}
                onChange={(e) =>
                  setNewVitals({ ...newVitals, temp: parseFloat(e.target.value) || 36.5 })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={newVitals.spo2}
                onChange={(e) =>
                  setNewVitals({ ...newVitals, spo2: parseInt(e.target.value, 10) || 98 })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pain Score (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={newVitals.painScore}
                onChange={(e) =>
                  setNewVitals({ ...newVitals, painScore: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GCS</label>
              <input
                type="text"
                value={newVitals.gcs}
                onChange={(e) => setNewVitals({ ...newVitals, gcs: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowNewVitals(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white gap-1.5">
              <Save className="w-4 h-4" /> Save Entry
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={showNewNote}
        onClose={() => setShowNewNote(false)}
        title="Add Nursing Progress Note"
        description={`${resolvedName} • ${ward} ${bedNumber}`}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={addNote} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newNote.type}
                onChange={(e) =>
                  setNewNote({ ...newNote, type: e.target.value as NursingNote['type'] })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="assessment">Assessment</option>
                <option value="intervention">Intervention</option>
                <option value="evaluation">Evaluation</option>
                <option value="handover">Shift Handover</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={newNote.priority}
                onChange={(e) =>
                  setNewNote({ ...newNote, priority: e.target.value as NursingNote['priority'] })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="routine">Routine</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Observation *
            </label>
            <textarea
              required
              maxLength={1500}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Document nursing observation or intervention..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm h-28 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowNewNote(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">
              Save Note
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
