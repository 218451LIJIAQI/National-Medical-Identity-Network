import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  Stethoscope, Plus, Clock, FileText, CheckCircle2,
  AlertTriangle, Heart, Droplets, Save, History, Edit3
} from 'lucide-react'

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

interface IOEntry {
  id: string
  kind: 'input' | 'output'
  category: string
  volumeMl: number
  timestamp: string
}

const INITIAL_VITALS: VitalSigns[] = [
  { timestamp: '08:00', bp: '120/80', pulse: 72, temp: 36.5, rr: 16, spo2: 98, gcs: '15/15', painScore: 2, bloodSugar: 6.5, recordedBy: 'SN Fatimah' },
  { timestamp: '12:00', bp: '118/78', pulse: 74, temp: 36.8, rr: 18, spo2: 97, gcs: '15/15', painScore: 3, recordedBy: 'SN Siti' },
  { timestamp: '16:00', bp: '122/82', pulse: 70, temp: 36.6, rr: 16, spo2: 98, gcs: '15/15', painScore: 2, bloodSugar: 7.2, recordedBy: 'SN Ahmad' },
]

const INITIAL_NOTES: NursingNote[] = [
  { id: '1', timestamp: '08:30', type: 'assessment', content: 'Patient is conscious, alert, and oriented. Comfortable on room air.', nurse: 'SN Fatimah', priority: 'routine' },
  { id: '2', timestamp: '10:00', type: 'intervention', content: 'Scheduled morning medications administered per MAR. IV cannula patent.', nurse: 'SN Fatimah', priority: 'routine' },
  { id: '3', timestamp: '14:00', type: 'evaluation', content: 'Mild wound site discomfort 3/10; responded well to oral Paracetamol.', nurse: 'SN Siti', priority: 'important' },
]

const INITIAL_IO: IOEntry[] = [
  { id: 'io-1', kind: 'input', category: 'Oral Fluids', volumeMl: 1200, timestamp: '08:00 - 16:00' },
  { id: 'io-2', kind: 'input', category: 'IV Normal Saline', volumeMl: 1500, timestamp: '08:00 - 16:00' },
  { id: 'io-3', kind: 'output', category: 'Urine Output', volumeMl: 1800, timestamp: '08:00 - 16:00' },
  { id: 'io-4', kind: 'output', category: 'Surgical Drain', volumeMl: 150, timestamp: '08:00 - 16:00' },
]

const NOTE_TYPE_CONFIG: Record<NursingNote['type'], { label: string; borderClass: string; badgeClass: string }> = {
  assessment: { label: 'Assessment', borderClass: 'border-blue-500', badgeClass: 'bg-blue-100 text-blue-700' },
  intervention: { label: 'Intervention', borderClass: 'border-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-700' },
  evaluation: { label: 'Evaluation', borderClass: 'border-purple-500', badgeClass: 'bg-purple-100 text-purple-700' },
  handover: { label: 'Handover', borderClass: 'border-amber-500', badgeClass: 'bg-amber-100 text-amber-700' },
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
  const { toast } = useToast()
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)
  const recorderName = user?.fullName || 'On-Duty Clinician'

  const [vitalsHistory, setVitalsHistory] = useSessionState<VitalSigns[]>(`nursing-vitals:${patient.icNumber}`, INITIAL_VITALS)
  const [notes, setNotes] = useSessionState<NursingNote[]>(`nursing-notes:${patient.icNumber}`, INITIAL_NOTES)
  const [ioEntries, setIoEntries] = useSessionState<IOEntry[]>(`nursing-io:${patient.icNumber}`, INITIAL_IO)

  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'io'>('vitals')
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)

  const [newVitals, setNewVitals] = useState({
    bp: '120/80',
    pulse: '72',
    temp: '36.6',
    rr: '16',
    spo2: '98',
    gcs: '15/15',
    painScore: '0',
    bloodSugar: '',
  })

  const [newNote, setNewNote] = useState({
    type: 'assessment' as NursingNote['type'],
    content: '',
    priority: 'routine' as NursingNote['priority'],
  })

  const [newIo, setNewIo] = useState({
    kind: 'input' as 'input' | 'output',
    category: 'Oral Fluids',
    volumeMl: '250',
  })

  const addVitals = () => {
    const vitals: VitalSigns = {
      timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      bp: newVitals.bp.trim() || '120/80',
      pulse: Math.max(0, parseInt(newVitals.pulse, 10) || 72),
      temp: Number.parseFloat(newVitals.temp) || 36.5,
      rr: Math.max(0, parseInt(newVitals.rr, 10) || 16),
      spo2: Math.min(100, Math.max(0, parseInt(newVitals.spo2, 10) || 98)),
      gcs: newVitals.gcs || '15/15',
      painScore: Math.min(10, Math.max(0, parseInt(newVitals.painScore, 10) || 0)),
      bloodSugar: newVitals.bloodSugar ? Number.parseFloat(newVitals.bloodSugar) || undefined : undefined,
      recordedBy: recorderName,
    }
    setVitalsHistory((prev) => [vitals, ...prev])
    setShowNewVitals(false)
    toast({ title: 'Vital Signs Recorded', description: `BP ${vitals.bp}, SpO2 ${vitals.spo2}% logged` })
  }

  const addNote = () => {
    if (!newNote.content.trim()) return
    const note: NursingNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      type: newNote.type,
      content: newNote.content.trim(),
      nurse: recorderName,
      priority: newNote.priority,
    }
    setNotes((prev) => [note, ...prev])
    setShowNewNote(false)
    setNewNote({ type: 'assessment', content: '', priority: 'routine' })
    toast({ title: 'Nursing Note Saved', description: `${NOTE_TYPE_CONFIG[note.type].label} note recorded` })
  }

  const addIoEntry = (e: React.FormEvent) => {
    e.preventDefault()
    const vol = Math.max(1, parseInt(newIo.volumeMl, 10) || 0)
    if (!vol || !newIo.category.trim()) return
    setIoEntries((prev) => [
      ...prev,
      {
        id: `io-${Date.now()}`,
        kind: newIo.kind,
        category: newIo.category.trim(),
        volumeMl: vol,
        timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setNewIo((prev) => ({ ...prev, volumeMl: '200' }))
    toast({ title: 'I/O Chart Updated', description: `Recorded ${vol} ml (${newIo.kind})` })
  }

  const latestVitals = vitalsHistory[0]
  const totalInput = ioEntries.filter((e) => e.kind === 'input').reduce((s, e) => s + e.volumeMl, 0)
  const totalOutput = ioEntries.filter((e) => e.kind === 'output').reduce((s, e) => s + e.volumeMl, 0)
  const netBalance = totalInput - totalOutput

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Nursing Records & Charting</h2>
          <p className="text-gray-500 text-sm">{ward} • {bedNumber} (session-persisted per patient IC)</p>
        </div>
        {latestVitals && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-xs font-semibold text-pink-800">
              Latest BP: {latestVitals.bp}
            </span>
            <span className="px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-xs font-semibold text-pink-800">
              HR: {latestVitals.pulse} bpm
            </span>
            <span className="px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-xs font-semibold text-pink-800">
              SpO2: {latestVitals.spo2}%
            </span>
          </div>
        )}
      </div>

      <WorkstationPatientBar
        patient={patient}
        onLookup={lookupPatient}
        loading={loading}
        notice={lookupNotice}
        accentClass="from-pink-50 to-rose-50 border-pink-200"
      />

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'vitals', label: 'Vital Signs', icon: Heart },
          { id: 'notes', label: 'Nursing Notes', icon: FileText },
          { id: 'io', label: '24h I/O Balance', icon: Droplets },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
              activeTab === tab.id ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vitals' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewVitals(!showNewVitals)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl font-medium shadow-md hover:bg-pink-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Record Vital Signs
            </button>
          </div>

          {showNewVitals && (
            <div className="p-6 bg-white rounded-xl border-2 border-pink-200 shadow-lg">
              <h3 className="font-semibold text-gray-800 mb-4">New Vital Signs Observation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={newVitals.bp}
                    onChange={(e) => setNewVitals({ ...newVitals, bp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={newVitals.pulse}
                    onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVitals.temp}
                    onChange={(e) => setNewVitals({ ...newVitals, temp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RR (/min)</label>
                  <input
                    type="number"
                    value={newVitals.rr}
                    onChange={(e) => setNewVitals({ ...newVitals, rr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={newVitals.spo2}
                    onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GCS</label>
                  <input
                    type="text"
                    value={newVitals.gcs}
                    onChange={(e) => setNewVitals({ ...newVitals, gcs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pain Score (0-10)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={newVitals.painScore}
                    onChange={(e) => setNewVitals({ ...newVitals, painScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Blood Sugar (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVitals.bloodSugar}
                    onChange={(e) => setNewVitals({ ...newVitals, bloodSugar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowNewVitals(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                  Cancel
                </button>
                <button onClick={addVitals} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 text-sm">
                  <Save className="w-4 h-4" />
                  Save Vitals
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <History className="w-5 h-5 text-pink-600" />
              <h3 className="font-semibold text-gray-800">Vital Signs Flowsheet</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-center">BP</th>
                    <th className="px-4 py-3 text-center">Pulse</th>
                    <th className="px-4 py-3 text-center">Temp</th>
                    <th className="px-4 py-3 text-center">RR</th>
                    <th className="px-4 py-3 text-center">SpO2</th>
                    <th className="px-4 py-3 text-center">GCS</th>
                    <th className="px-4 py-3 text-center">Pain</th>
                    <th className="px-4 py-3 text-center">BSL</th>
                    <th className="px-4 py-3 text-left">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vitalsHistory.map((v, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{v.timestamp}</td>
                      <td className="px-4 py-3 text-center font-medium">{v.bp}</td>
                      <td className="px-4 py-3 text-center">{v.pulse}</td>
                      <td className="px-4 py-3 text-center">{v.temp}°C</td>
                      <td className="px-4 py-3 text-center">{v.rr}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={v.spo2 < 95 ? 'text-red-600 font-bold' : ''}>{v.spo2}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">{v.gcs}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          v.painScore >= 7 ? 'bg-red-100 text-red-700' : v.painScore >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {v.painScore}/10
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{v.bloodSugar ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{v.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewNote(!showNewNote)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl font-medium shadow-md hover:bg-pink-700 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Add Nursing Note
            </button>
          </div>

          {showNewNote && (
            <div className="p-6 bg-white rounded-xl border-2 border-pink-200 shadow-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note Type</label>
                  <select
                    value={newNote.type}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value as NursingNote['type'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="assessment">Assessment</option>
                    <option value="intervention">Intervention</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="handover">Shift Handover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select
                    value={newNote.priority}
                    onChange={(e) => setNewNote({ ...newNote, priority: e.target.value as NursingNote['priority'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="routine">Routine</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Document clinical observation, nursing action, or shift handover..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none h-28 text-sm"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowNewNote(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                  Cancel
                </button>
                <button
                  onClick={addNote}
                  disabled={!newNote.content.trim()}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Note
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {notes.map((note) => {
              const typeStyle = NOTE_TYPE_CONFIG[note.type]
              return (
                <div key={note.id} className={`p-5 bg-white rounded-xl border-l-4 ${typeStyle.borderClass} shadow-sm border`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-0.5 ${typeStyle.badgeClass} text-xs font-semibold rounded-full`}>
                        {typeStyle.label}
                      </span>
                      {note.priority === 'urgent' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> URGENT
                        </span>
                      )}
                      {note.priority === 'important' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                          IMPORTANT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {note.timestamp}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{note.content}</p>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{note.nurse}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'io' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              24-Hour Fluid Input / Output Chart
            </h3>

            <form onSubmit={addIoEntry} className="flex flex-wrap items-center gap-2">
              <select
                value={newIo.kind}
                onChange={(e) =>
                  setNewIo({
                    ...newIo,
                    kind: e.target.value as 'input' | 'output',
                    category: e.target.value === 'input' ? 'Oral Fluids' : 'Urine Output',
                  })
                }
                className="px-3 py-1.5 border rounded-lg text-xs bg-white"
              >
                <option value="input">Input (+)</option>
                <option value="output">Output (-)</option>
              </select>
              <input
                type="text"
                value={newIo.category}
                onChange={(e) => setNewIo({ ...newIo, category: e.target.value })}
                placeholder="Fluid type"
                className="px-3 py-1.5 border rounded-lg text-xs w-36"
              />
              <input
                type="number"
                min={1}
                value={newIo.volumeMl}
                onChange={(e) => setNewIo({ ...newIo, volumeMl: e.target.value })}
                placeholder="ml"
                className="px-3 py-1.5 border rounded-lg text-xs w-24"
              />
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                + Add ml
              </button>
            </form>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-800 mb-3 text-sm">FLUID INPUT</h4>
              <div className="space-y-2 text-sm">
                {ioEntries
                  .filter((e) => e.kind === 'input')
                  .map((e) => (
                    <div key={e.id} className="flex justify-between py-1.5 border-b border-blue-200/70">
                      <span className="text-gray-700">{e.category} <span className="text-xs text-gray-400">({e.timestamp})</span></span>
                      <span className="font-medium">{e.volumeMl} ml</span>
                    </div>
                  ))}
                <div className="flex justify-between pt-2 font-bold text-blue-900">
                  <span>TOTAL INPUT</span>
                  <span>{totalInput} ml</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl">
              <h4 className="font-semibold text-amber-800 mb-3 text-sm">FLUID OUTPUT</h4>
              <div className="space-y-2 text-sm">
                {ioEntries
                  .filter((e) => e.kind === 'output')
                  .map((e) => (
                    <div key={e.id} className="flex justify-between py-1.5 border-b border-amber-200/70">
                      <span className="text-gray-700">{e.category} <span className="text-xs text-gray-400">({e.timestamp})</span></span>
                      <span className="font-medium">{e.volumeMl} ml</span>
                    </div>
                  ))}
                <div className="flex justify-between pt-2 font-bold text-amber-900">
                  <span>TOTAL OUTPUT</span>
                  <span>{totalOutput} ml</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span className="font-semibold text-gray-800">NET FLUID BALANCE (24h)</span>
            </div>
            <span className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {netBalance >= 0 ? `+${netBalance}` : netBalance} ml
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
