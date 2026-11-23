import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Clock,
  CheckCircle2,
  PhoneCall,
  Mic,
  Search,
  User,
  Stethoscope,
  Timer,
  Plus,
  ExternalLink,
  X,
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

const initialQueue: QueuePatient[] = [
  { queueNo: 'A001', name: 'Ahmad bin Abdullah', icNumber: '880101-14-5678', age: 38, gender: 'M', category: 'Green', waitTime: '25 min', status: 'waiting', complaint: 'Blood pressure & glucose review' },
  { queueNo: 'A002', name: 'Siti Nurhaliza binti Mohd', icNumber: '950320-10-1234', age: 31, gender: 'F', category: 'Yellow', waitTime: '18 min', status: 'waiting', complaint: 'Wheezing & nocturnal cough' },
  { queueNo: 'A003', name: 'Tan Ah Kow', icNumber: '550715-07-9999', age: 71, gender: 'M', category: 'Red', waitTime: '8 min', status: 'called', complaint: 'Exertional chest tightness' },
  { queueNo: 'A004', name: 'Raj Kumar a/l Muthu', icNumber: '900808-01-5555', age: 36, gender: 'M', category: 'Yellow', waitTime: '15 min', status: 'waiting', complaint: 'Medication refill & neurology follow-up' },
  { queueNo: 'A005', name: 'Aishah binti Mohd Yusof', icNumber: '820425-12-7777', age: 44, gender: 'F', category: 'Green', waitTime: '12 min', status: 'waiting', complaint: 'Seasonal asthma check-up' },
  { queueNo: 'A006', name: 'Lee Mei Fong', icNumber: '780312-14-2345', age: 48, gender: 'F', category: 'Green', waitTime: '5 min', status: 'in-progress', complaint: 'Joint stiffness assessment' },
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
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { setActivePatient } = useClinicalStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [queue, setQueue] = useState<QueuePatient[]>(initialQueue)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'called' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [walkIn, setWalkIn] = useState({
    name: '',
    icNumber: '',
    age: '35',
    gender: 'M' as 'M' | 'F',
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
    const nextPatient =
      queue.find((p) => p.status === 'waiting' && p.category === 'Red') ||
      queue.find((p) => p.status === 'waiting' && p.category === 'Yellow') ||
      queue.find((p) => p.status === 'waiting')

    if (!nextPatient) {
      toast({ title: 'Queue Empty', description: 'No waiting patients remaining in queue.' })
      return
    }

    setQueue(queue.map((p) => (p.queueNo === nextPatient.queueNo ? { ...p, status: 'called' } : p)))
    toast({
      title: `Calling ${nextPatient.queueNo}`,
      description: `${nextPatient.name} (${nextPatient.category} triage) paged to consultation room.`,
    })
  }

  const startConsultation = (patient: QueuePatient) => {
    setQueue(queue.map((p) => (p.queueNo === patient.queueNo ? { ...p, status: 'in-progress' } : p)))
    setActivePatient({
      icNumber: patient.icNumber,
      fullName: patient.name,
      gender: patient.gender === 'M' ? 'male' : 'female',
      allergies: [],
      chronicConditions: [],
    })
    onSelectPatient?.(patient)
    toast({
      title: 'Consultation Started',
      description: `${patient.name} set as active clinical patient.`,
    })
  }

  const completeConsultation = (queueNo: string) => {
    setQueue(queue.map((p) => (p.queueNo === queueNo ? { ...p, status: 'completed' } : p)))
    toast({ title: 'Consultation Completed', description: `Ticket ${queueNo} marked completed.` })
  }

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!walkIn.name.trim() || !walkIn.icNumber.trim()) return
    const nextNum = `A${String(queue.length + 1).padStart(3, '0')}`
    const newEntry: QueuePatient = {
      queueNo: nextNum,
      name: walkIn.name.trim(),
      icNumber: formatIC(walkIn.icNumber.trim()),
      age: Number(walkIn.age) || 30,
      gender: walkIn.gender,
      category: walkIn.category,
      waitTime: 'Just now',
      status: 'waiting',
      complaint: walkIn.complaint.trim() || 'General consultation',
    }
    setQueue((prev) => [...prev, newEntry])
    setShowAddModal(false)
    setWalkIn({ name: '', icNumber: '', age: '35', gender: 'M', category: 'Green', complaint: '' })
    toast({ title: 'Walk-In Registered', description: `Assigned ticket ${nextNum} to ${newEntry.name}` })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Queue</h2>
          <p className="text-gray-500 text-sm">Triage-prioritized outpatient & acute care queue</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register Walk-In
          </Button>
          <Button
            type="button"
            onClick={callNextPatient}
            className={`gap-2 rounded-xl text-white bg-gradient-to-r ${theme.buttonGradient} shadow-md`}
          >
            <Mic className="w-4 h-4" />
            Call Next Priority
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Waiting', value: stats.waiting, icon: Clock, cardClass: 'bg-slate-50 border-slate-200', valueClass: 'text-slate-800' },
          { label: 'Called', value: stats.called, icon: PhoneCall, cardClass: 'bg-blue-50 border-blue-200', valueClass: 'text-blue-700' },
          { label: 'In Consultation', value: stats.inProgress, icon: Stethoscope, cardClass: 'bg-emerald-50 border-emerald-200', valueClass: 'text-emerald-700' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, cardClass: 'bg-gray-50 border-gray-200', valueClass: 'text-gray-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 ${stat.cardClass} rounded-xl border`}>
            <div className="flex items-center justify-between mb-1">
              <stat.icon className="w-5 h-5 text-slate-500" />
              <span className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</span>
            </div>
            <p className="text-xs font-medium text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search name, Queue No. or MyKad IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'waiting', 'called', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-4 text-left">Ticket</th>
              <th className="p-4 text-left">Patient</th>
              <th className="p-4 text-left">MyKad IC</th>
              <th className="p-4 text-left">Chief Complaint</th>
              <th className="p-4 text-left">Triage</th>
              <th className="p-4 text-left">Wait</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredQueue.map((patient) => {
              const statusBadge = STATUS_BADGE[patient.status]
              return (
                <tr key={patient.queueNo} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-900">{patient.queueNo}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${patient.gender === 'M' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500">{patient.age} yrs • {patient.gender === 'M' ? 'Male' : 'Female'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-gray-600">{patient.icNumber}</td>
                  <td className="p-4 text-gray-600 max-w-[220px] truncate">{patient.complaint}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${CATEGORY_CLASS[patient.category]}`}>
                      {patient.category}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Timer className="w-3.5 h-3.5" /> {patient.waitTime}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                      {(patient.status === 'waiting' || patient.status === 'called') && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => startConsultation(patient)}
                          className="h-8 px-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Consult
                        </Button>
                      )}
                      {patient.status === 'in-progress' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => completeConsultation(patient.queueNo)}
                          className="h-8 px-2.5 text-xs rounded-lg"
                        >
                          Complete
                        </Button>
                      )}
                      {user?.role === 'doctor' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            startConsultation(patient)
                            navigate(`/doctor/patient/${encodeURIComponent(patient.icNumber)}`)
                          }}
                          title="Open Federated Timeline"
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredQueue.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p>No queue tickets match the selected filter.</p>
          </div>
        )}
      </div>

      {/* Add Walk-in Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleAddWalkIn}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Register Walk-In Ticket</h3>
                <button type="button" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <Input
                  required
                  placeholder="Patient Full Name *"
                  value={walkIn.name}
                  onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
                />
                <Input
                  required
                  placeholder="MyKad IC Number (e.g. 880101-14-5678) *"
                  value={walkIn.icNumber}
                  onChange={(e) => setWalkIn({ ...walkIn, icNumber: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Age"
                    value={walkIn.age}
                    onChange={(e) => setWalkIn({ ...walkIn, age: e.target.value })}
                  />
                  <select
                    className="border border-slate-200 rounded-md px-2 text-sm"
                    value={walkIn.gender}
                    onChange={(e) => setWalkIn({ ...walkIn, gender: e.target.value as 'M' | 'F' })}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <select
                    className="border border-slate-200 rounded-md px-2 text-sm"
                    value={walkIn.category}
                    onChange={(e) => setWalkIn({ ...walkIn, category: e.target.value as QueuePatient['category'] })}
                  >
                    <option value="Green">Green</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
                <Input
                  placeholder="Chief Complaint"
                  value={walkIn.complaint}
                  onChange={(e) => setWalkIn({ ...walkIn, complaint: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Issue Queue Ticket
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
