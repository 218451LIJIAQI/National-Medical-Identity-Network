import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'
import { useSessionState } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users, Clock, CheckCircle2, PhoneCall, Mic, Search, User,
  Stethoscope, Timer, Plus, ExternalLink, Info, X
} from 'lucide-react'

export interface QueuePatient {
  queueNo: string
  name: string
  icNumber: string
  age: number
  gender: 'M' | 'F'
  category: 'Green' | 'Yellow' | 'Red'
  waitTime: string
  status: 'waiting' | 'in-progress' | 'called' | 'completed'
  complaint: string
}

const INITIAL_QUEUE: QueuePatient[] = [
  { queueNo: 'A001', name: 'Ahmad bin Abdullah', icNumber: '880101-14-5678', age: 38, gender: 'M', category: 'Green', waitTime: '25 min', status: 'waiting', complaint: 'BP review & cough' },
  { queueNo: 'A002', name: 'Siti Nurhaliza binti Mohd', icNumber: '950320-10-1234', age: 31, gender: 'F', category: 'Yellow', waitTime: '20 min', status: 'waiting', complaint: 'Wheezing & shortness of breath' },
  { queueNo: 'A003', name: 'Raj Kumar a/l Muthu', icNumber: '900808-01-5555', age: 36, gender: 'M', category: 'Red', waitTime: '10 min', status: 'called', complaint: 'Post-seizure neurological review' },
  { queueNo: 'A004', name: 'Tan Ah Kow', icNumber: '550715-07-9999', age: 71, gender: 'M', category: 'Yellow', waitTime: '15 min', status: 'waiting', complaint: 'Chest discomfort & CKD follow-up' },
  { queueNo: 'A005', name: 'Aishah binti Mohd Yusof', icNumber: '820425-12-7777', age: 44, gender: 'F', category: 'Green', waitTime: '12 min', status: 'waiting', complaint: 'Asthma inhaler refill' },
  { queueNo: 'A006', name: 'Lee Mei Fong', icNumber: '780312-14-2345', age: 48, gender: 'F', category: 'Green', waitTime: '5 min', status: 'in-progress', complaint: 'Joint stiffness evaluation' },
]

const CATEGORY_CLASS: Record<QueuePatient['category'], string> = {
  Red: 'bg-red-100 text-red-700 border-red-200',
  Yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  Green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STATUS_BADGE: Record<QueuePatient['status'], { bg: string; text: string; label: string }> = {
  waiting: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Waiting' },
  called: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Called' },
  'in-progress': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Progress' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Completed' },
}

interface QueueManagementProps {
  onSelectPatient?: (patient: QueuePatient) => void
}

export default function QueueManagement({ onSelectPatient }: QueueManagementProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [queue, setQueue] = useSessionState<QueuePatient[]>(`queue:${user?.hospitalId || 'default'}`, INITIAL_QUEUE)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'called' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    icNumber: '',
    category: 'Green' as QueuePatient['category'],
    complaint: '',
  })

  const filteredQueue = queue.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.queueNo.toLowerCase().includes(q) ||
      p.icNumber.includes(searchQuery)
    return matchesFilter && matchesSearch
  })

  const stats = {
    waiting: queue.filter((p) => p.status === 'waiting').length,
    inProgress: queue.filter((p) => p.status === 'in-progress').length,
    called: queue.filter((p) => p.status === 'called').length,
    completed: queue.filter((p) => p.status === 'completed').length,
  }

  const callNextPatient = () => {
    const priorityOrder: Record<QueuePatient['category'], number> = { Red: 0, Yellow: 1, Green: 2 }
    const waitingList = queue
      .filter((p) => p.status === 'waiting')
      .sort((a, b) => priorityOrder[a.category] - priorityOrder[b.category])

    const nextPatient = waitingList[0]
    if (!nextPatient) {
      toast({ title: 'Queue Empty', description: 'No waiting patients remaining in queue' })
      return
    }
    setQueue((prev) =>
      prev.map((p) => (p.queueNo === nextPatient.queueNo ? { ...p, status: 'called' } : p))
    )
    toast({
      title: `Calling ${nextPatient.queueNo}`,
      description: `${nextPatient.name} (${nextPatient.category} triage) called to consultation room`,
    })
  }

  const startConsultation = (queueNo: string) => {
    setQueue((prev) =>
      prev.map((p) => (p.queueNo === queueNo ? { ...p, status: 'in-progress' } : p))
    )
    const patient = queue.find((p) => p.queueNo === queueNo)
    if (patient) {
      onSelectPatient?.(patient)
      toast({
        title: 'Consultation Started',
        description: `Now attending to ${patient.name}`,
      })
    }
  }

  const completeConsultation = (queueNo: string) => {
    setQueue((prev) =>
      prev.map((p) => (p.queueNo === queueNo ? { ...p, status: 'completed', waitTime: '0 min' } : p))
    )
    toast({
      title: 'Consultation Completed',
      description: `Ticket ${queueNo} marked as completed`,
    })
  }

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanIc = formatIC(walkInForm.icNumber)
    if (!walkInForm.name.trim() || !cleanIc) return
    const inferred = parseMyKadDemographics(cleanIc)
    const nextNum = `A${String(queue.length + 1).padStart(3, '0')}`
    const newEntry: QueuePatient = {
      queueNo: nextNum,
      name: walkInForm.name.trim(),
      icNumber: cleanIc,
      age: inferred.age ?? 35,
      gender: inferred.gender === 'female' ? 'F' : 'M',
      category: walkInForm.category,
      waitTime: 'Just arrived',
      status: 'waiting',
      complaint: walkInForm.complaint.trim() || 'General consultation',
    }
    setQueue((prev) => [...prev, newEntry])
    setShowWalkInModal(false)
    setWalkInForm({ name: '', icNumber: '', category: 'Green', complaint: '' })
    toast({
      title: `Ticket ${nextNum} Issued`,
      description: `${newEntry.name} added to outpatient triage queue`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Queue</h2>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
            <Info className="w-4 h-4 text-blue-500" />
            Outpatient Triage Queue (session-persisted per hospital)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowWalkInModal(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Register Walk-In
          </Button>
          <button
            onClick={callNextPatient}
            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${theme.buttonGradient} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all`}
          >
            <Mic className="w-5 h-5" />
            Call Next (Priority)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Waiting', value: stats.waiting, icon: Clock, cardClass: 'bg-slate-50 border-slate-100', iconClass: 'text-slate-500', valueClass: 'text-slate-700', labelClass: 'text-slate-600' },
          { label: 'Called', value: stats.called, icon: PhoneCall, cardClass: 'bg-blue-50 border-blue-100', iconClass: 'text-blue-500', valueClass: 'text-blue-700', labelClass: 'text-blue-600' },
          { label: 'In Progress', value: stats.inProgress, icon: Stethoscope, cardClass: 'bg-emerald-50 border-emerald-100', iconClass: 'text-emerald-500', valueClass: 'text-emerald-700', labelClass: 'text-emerald-600' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, cardClass: 'bg-gray-50 border-gray-100', iconClass: 'text-gray-500', valueClass: 'text-gray-700', labelClass: 'text-gray-600' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 ${stat.cardClass} rounded-xl border`}>
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
              <span className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</span>
            </div>
            <p className={`text-sm ${stat.labelClass}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, Queue No. or IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'waiting', 'called', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
            <div className="col-span-1">No.</div>
            <div className="col-span-3">Patient Name</div>
            <div className="col-span-2">IC Number</div>
            <div className="col-span-2">Complaint</div>
            <div className="col-span-1">Triage</div>
            <div className="col-span-1">Wait</div>
            <div className="col-span-2">Actions</div>
          </div>

          {filteredQueue.map((patient) => {
            const statusBadge = STATUS_BADGE[patient.status]
            return (
              <div
                key={patient.queueNo}
                className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${
                  patient.status === 'called' ? 'bg-blue-50/60' : ''
                } ${patient.status === 'in-progress' ? 'bg-emerald-50/60' : ''}`}
              >
                <div className="col-span-1 flex items-center">
                  <span
                    className={`text-base font-bold ${
                      patient.category === 'Red'
                        ? 'text-red-600'
                        : patient.category === 'Yellow'
                          ? 'text-amber-600'
                          : 'text-gray-700'
                    }`}
                  >
                    {patient.queueNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    patient.gender === 'M' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}>
                    <User className={`w-4 h-4 ${patient.gender === 'M' ? 'text-blue-600' : 'text-pink-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{patient.name}</p>
                    <p className="text-xs text-gray-500">{patient.age} yrs • {patient.gender === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                    {patient.icNumber}
                  </code>
                </div>

                <div className="col-span-2 flex items-center">
                  <p className="text-sm text-gray-600 truncate">{patient.complaint}</p>
                </div>

                <div className="col-span-1 flex items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${CATEGORY_CLASS[patient.category]}`}>
                    {patient.category}
                  </span>
                </div>

                <div className="col-span-1 flex items-center gap-1 text-gray-600">
                  <Timer className="w-3.5 h-3.5" />
                  <span className="text-xs">{patient.waitTime}</span>
                </div>

                <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                    {statusBadge.label}
                  </span>
                  {patient.status === 'waiting' && (
                    <button
                      onClick={() => startConsultation(patient.queueNo)}
                      className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      title="Start consultation"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {patient.status === 'called' && (
                    <button
                      onClick={() => startConsultation(patient.queueNo)}
                      className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600"
                    >
                      Attend
                    </button>
                  )}
                  {patient.status === 'in-progress' && (
                    <button
                      onClick={() => completeConsultation(patient.queueNo)}
                      className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
                    >
                      Done
                    </button>
                  )}
                  {user?.role === 'doctor' && (
                    <button
                      onClick={() => navigate(`/doctor/patient/${encodeURIComponent(patient.icNumber)}`)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Open Federated Timeline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredQueue.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matching patients in queue</p>
            </div>
          )}
        </div>
      </div>

      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowWalkInModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Register Walk-In Patient</h3>
              <button onClick={() => setShowWalkInModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddWalkIn} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Patient Full Name *</label>
                <Input
                  value={walkInForm.name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                  placeholder="e.g., Mohd Faizal bin Othman"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">IC Number *</label>
                <Input
                  value={walkInForm.icNumber}
                  onChange={(e) => setWalkInForm({ ...walkInForm, icNumber: e.target.value })}
                  placeholder="e.g., 880101-14-5678"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Triage Category</label>
                <select
                  value={walkInForm.category}
                  onChange={(e) => setWalkInForm({ ...walkInForm, category: e.target.value as QueuePatient['category'] })}
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="Green">Green (Non-Urgent)</option>
                  <option value="Yellow">Yellow (Semi-Urgent)</option>
                  <option value="Red">Red (Critical Priority)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Chief Complaint</label>
                <Input
                  value={walkInForm.complaint}
                  onChange={(e) => setWalkInForm({ ...walkInForm, complaint: e.target.value })}
                  placeholder="Reason for visit"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowWalkInModal(false)}>Cancel</Button>
                <Button type="submit">Issue Ticket</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
