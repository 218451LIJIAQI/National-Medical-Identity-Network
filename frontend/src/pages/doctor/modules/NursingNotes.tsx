// ============================================================================
// Nursing Notes Module - 护理记录
// Malaysian hospital nursing documentation system
// ============================================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Stethoscope, Plus, Clock, FileText, CheckCircle2,
  AlertTriangle, Heart, Thermometer, Activity, Droplets,
  User, Save, History, Edit3
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

// Mock vital signs history
const mockVitalsHistory: VitalSigns[] = [
  { timestamp: '2024-01-15 08:00', bp: '120/80', pulse: 72, temp: 36.5, rr: 16, spo2: 98, gcs: '15/15', painScore: 2, bloodSugar: 6.5, recordedBy: 'Nurse Fatimah' },
  { timestamp: '2024-01-15 12:00', bp: '118/78', pulse: 74, temp: 36.8, rr: 18, spo2: 97, gcs: '15/15', painScore: 3, recordedBy: 'Nurse Siti' },
  { timestamp: '2024-01-15 16:00', bp: '122/82', pulse: 70, temp: 36.6, rr: 16, spo2: 98, gcs: '15/15', painScore: 2, bloodSugar: 7.2, recordedBy: 'Nurse Ahmad' },
]

const mockNotes: NursingNote[] = [
  { id: '1', timestamp: '2024-01-15 08:30', type: 'assessment', content: 'Pesakit sedar dan berorientasi. Tiada tanda-tanda distress. Luka pembedahan kering dan bersih.', nurse: 'Nurse Fatimah', priority: 'routine' },
  { id: '2', timestamp: '2024-01-15 10:00', type: 'intervention', content: 'Ubat diberikan mengikut jadual. IV drip berjalan lancar. Wound dressing dilakukan.', nurse: 'Nurse Fatimah', priority: 'routine' },
  { id: '3', timestamp: '2024-01-15 14:00', type: 'evaluation', content: 'Pesakit mengadu sakit tahap 3/10 di kawasan luka. PRN analgesia diberikan.', nurse: 'Nurse Siti', priority: 'important' },
]

interface NursingNotesProps {
  patientName?: string
  patientIC?: string
  ward?: string
  bedNumber?: string
}

export default function NursingNotes({ 
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  ward = 'Wad 5A',
  bedNumber = 'Katil 12'
}: NursingNotesProps) {
  const [vitalsHistory, setVitalsHistory] = useState<VitalSigns[]>(mockVitalsHistory)
  const [notes, setNotes] = useState<NursingNote[]>(mockNotes)
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'io'>('vitals')
  const [showNewVitals, setShowNewVitals] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)
  
  const [newVitals, setNewVitals] = useState<Partial<VitalSigns>>({
    bp: '',
    pulse: 0,
    temp: 36.5,
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

  const addVitals = () => {
    const vitals: VitalSigns = {
      timestamp: new Date().toLocaleString('en-MY'),
      bp: newVitals.bp || '',
      pulse: newVitals.pulse || 0,
      temp: newVitals.temp || 36.5,
      rr: newVitals.rr || 16,
      spo2: newVitals.spo2 || 98,
      gcs: newVitals.gcs || '15/15',
      painScore: newVitals.painScore || 0,
      bloodSugar: newVitals.bloodSugar,
      recordedBy: 'Current Nurse',
    }
    setVitalsHistory([vitals, ...vitalsHistory])
    setShowNewVitals(false)
    setNewVitals({ bp: '', pulse: 0, temp: 36.5, rr: 16, spo2: 98, gcs: '15/15', painScore: 0 })
  }

  const addNote = () => {
    const note: NursingNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-MY'),
      type: newNote.type,
      content: newNote.content,
      nurse: 'Current Nurse',
      priority: newNote.priority,
    }
    setNotes([note, ...notes])
    setShowNewNote(false)
    setNewNote({ type: 'assessment', content: '', priority: 'routine' })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assessment': return 'blue'
      case 'intervention': return 'emerald'
      case 'evaluation': return 'purple'
      case 'handover': return 'amber'
      default: return 'gray'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assessment': return 'Penilaian'
      case 'intervention': return 'Intervensi'
      case 'evaluation': return 'Penilaian Semula'
      case 'handover': return 'Serah Tugas'
      default: return type
    }
  }

  const latestVitals = vitalsHistory[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rekod Kejururawatan</h2>
          <p className="text-gray-500">Nursing Documentation • Catatan Kejururawatan</p>
        </div>
      </div>

      {/* Patient Info Banner */}
      <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-pink-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">{patientName}</p>
              <div className="flex items-center gap-4 mt-1">
                <code className="text-sm text-gray-600 bg-white px-2 py-0.5 rounded">{patientIC}</code>
                <span className="text-sm text-pink-600 font-medium">{ward} • {bedNumber}</span>
              </div>
            </div>
          </div>
          
          {/* Quick Vitals Summary */}
          {latestVitals && (
            <div className="flex items-center gap-4">
              <div className="text-center px-3 py-2 bg-white rounded-lg">
                <p className="text-xs text-gray-500">BP</p>
                <p className="font-bold text-gray-800">{latestVitals.bp}</p>
              </div>
              <div className="text-center px-3 py-2 bg-white rounded-lg">
                <p className="text-xs text-gray-500">HR</p>
                <p className="font-bold text-gray-800">{latestVitals.pulse}</p>
              </div>
              <div className="text-center px-3 py-2 bg-white rounded-lg">
                <p className="text-xs text-gray-500">Temp</p>
                <p className="font-bold text-gray-800">{latestVitals.temp}°C</p>
              </div>
              <div className="text-center px-3 py-2 bg-white rounded-lg">
                <p className="text-xs text-gray-500">SpO2</p>
                <p className="font-bold text-gray-800">{latestVitals.spo2}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'vitals', label: 'Tanda Vital', icon: Heart },
          { id: 'notes', label: 'Catatan', icon: FileText },
          { id: 'io', label: 'I/O Chart', icon: Droplets },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-pink-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Vital Signs Tab */}
        {activeTab === 'vitals' && (
          <motion.div
            key="vitals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Add New Vitals */}
            <div className="flex justify-end">
              <motion.button
                onClick={() => setShowNewVitals(!showNewVitals)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl font-medium shadow-lg hover:bg-pink-700"
                whileHover={{ scale: 1.02 }}
              >
                <Plus className="w-5 h-5" />
                Rekod Tanda Vital
              </motion.button>
            </div>

            {/* New Vitals Form */}
            <AnimatePresence>
              {showNewVitals && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 bg-white rounded-xl border-2 border-pink-200 shadow-lg"
                >
                  <h3 className="font-semibold text-gray-800 mb-4">Rekod Tanda Vital Baru</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">BP (mmHg)</label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={newVitals.bp}
                        onChange={(e) => setNewVitals({...newVitals, bp: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={newVitals.pulse}
                        onChange={(e) => setNewVitals({...newVitals, pulse: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newVitals.temp}
                        onChange={(e) => setNewVitals({...newVitals, temp: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">RR (/min)</label>
                      <input
                        type="number"
                        value={newVitals.rr}
                        onChange={(e) => setNewVitals({...newVitals, rr: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={newVitals.spo2}
                        onChange={(e) => setNewVitals({...newVitals, spo2: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">GCS</label>
                      <input
                        type="text"
                        value={newVitals.gcs}
                        onChange={(e) => setNewVitals({...newVitals, gcs: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pain Score (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={newVitals.painScore}
                        onChange={(e) => setNewVitals({...newVitals, painScore: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Blood Sugar (mmol/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newVitals.bloodSugar || ''}
                        onChange={(e) => setNewVitals({...newVitals, bloodSugar: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowNewVitals(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      onClick={addVitals}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Simpan
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vitals History Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <History className="w-5 h-5 text-pink-600" />
                <h3 className="font-semibold text-gray-800">Sejarah Tanda Vital</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Masa</th>
                      <th className="px-4 py-3 text-center">BP</th>
                      <th className="px-4 py-3 text-center">Pulse</th>
                      <th className="px-4 py-3 text-center">Temp</th>
                      <th className="px-4 py-3 text-center">RR</th>
                      <th className="px-4 py-3 text-center">SpO2</th>
                      <th className="px-4 py-3 text-center">GCS</th>
                      <th className="px-4 py-3 text-center">Pain</th>
                      <th className="px-4 py-3 text-center">BSL</th>
                      <th className="px-4 py-3 text-left">Direkod Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vitalsHistory.map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{v.timestamp}</td>
                        <td className="px-4 py-3 text-center font-medium">{v.bp}</td>
                        <td className="px-4 py-3 text-center">{v.pulse}</td>
                        <td className="px-4 py-3 text-center">{v.temp}°C</td>
                        <td className="px-4 py-3 text-center">{v.rr}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`${v.spo2 < 95 ? 'text-red-600 font-bold' : ''}`}>{v.spo2}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">{v.gcs}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            v.painScore >= 7 ? 'bg-red-100 text-red-700' :
                            v.painScore >= 4 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {v.painScore}/10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{v.bloodSugar || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nursing Notes Tab */}
        {activeTab === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Add New Note */}
            <div className="flex justify-end">
              <motion.button
                onClick={() => setShowNewNote(!showNewNote)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl font-medium shadow-lg hover:bg-pink-700"
                whileHover={{ scale: 1.02 }}
              >
                <Edit3 className="w-5 h-5" />
                Tambah Catatan
              </motion.button>
            </div>

            {/* New Note Form */}
            <AnimatePresence>
              {showNewNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 bg-white rounded-xl border-2 border-pink-200 shadow-lg"
                >
                  <h3 className="font-semibold text-gray-800 mb-4">Catatan Kejururawatan Baru</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Jenis Catatan</label>
                        <select
                          value={newNote.type}
                          onChange={(e) => setNewNote({...newNote, type: e.target.value as NursingNote['type']})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="assessment">Penilaian (Assessment)</option>
                          <option value="intervention">Intervensi (Intervention)</option>
                          <option value="evaluation">Penilaian Semula (Evaluation)</option>
                          <option value="handover">Serah Tugas (Handover)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Keutamaan</label>
                        <select
                          value={newNote.priority}
                          onChange={(e) => setNewNote({...newNote, priority: e.target.value as NursingNote['priority']})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="routine">Biasa (Routine)</option>
                          <option value="important">Penting (Important)</option>
                          <option value="urgent">Segera (Urgent)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Catatan</label>
                      <textarea
                        value={newNote.content}
                        onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                        placeholder="Masukkan catatan kejururawatan..."
                        className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 resize-none h-32"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowNewNote(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      onClick={addNote}
                      disabled={!newNote.content}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Simpan
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes List */}
            <div className="space-y-4">
              {notes.map((note, idx) => {
                const color = getTypeColor(note.type)
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-5 bg-white rounded-xl border-l-4 border-${color}-500 shadow-sm`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 bg-${color}-100 text-${color}-700 text-xs font-semibold rounded-full`}>
                          {getTypeLabel(note.type)}
                        </span>
                        {note.priority === 'urgent' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            SEGERA
                          </span>
                        )}
                        {note.priority === 'important' && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            PENTING
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {note.timestamp}
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{note.content}</p>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                      <Stethoscope className="w-4 h-4" />
                      <span>{note.nurse}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* I/O Chart Tab */}
        {activeTab === 'io' && (
          <motion.div
            key="io"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Carta Input/Output (24 Jam)
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Input */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-blue-800 mb-3">INPUT</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-blue-200">
                    <span className="text-gray-600">Oral</span>
                    <span className="font-medium">1200 ml</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-blue-200">
                    <span className="text-gray-600">IV Fluid</span>
                    <span className="font-medium">1500 ml</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-blue-200">
                    <span className="text-gray-600">Blood Products</span>
                    <span className="font-medium">0 ml</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-blue-800">
                    <span>JUMLAH INPUT</span>
                    <span>2700 ml</span>
                  </div>
                </div>
              </div>

              {/* Output */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="font-semibold text-amber-800 mb-3">OUTPUT</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-amber-200">
                    <span className="text-gray-600">Urine</span>
                    <span className="font-medium">1800 ml</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-amber-200">
                    <span className="text-gray-600">Drain</span>
                    <span className="font-medium">150 ml</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-amber-200">
                    <span className="text-gray-600">Vomitus / NG</span>
                    <span className="font-medium">0 ml</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-amber-800">
                    <span>JUMLAH OUTPUT</span>
                    <span>1950 ml</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="font-semibold text-gray-800">BALANCE (24 jam)</span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">+750 ml</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
