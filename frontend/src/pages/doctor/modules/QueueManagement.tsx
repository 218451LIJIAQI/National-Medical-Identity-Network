import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Clock, CheckCircle2, 
  PhoneCall, Mic, Search, User,
  Stethoscope, Timer
} from 'lucide-react'

interface QueuePatient {
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
const mockQueue: QueuePatient[] = [
  { queueNo: 'A001', name: 'Ahmad bin Abdullah', icNumber: '880515-14-5678', age: 36, gender: 'M', category: 'Green', waitTime: '45 min', status: 'waiting', complaint: 'Fever & cough' },
  { queueNo: 'A002', name: 'Siti Nurhaliza binti Mohd', icNumber: '920820-08-1234', age: 32, gender: 'F', category: 'Yellow', waitTime: '30 min', status: 'waiting', complaint: 'Chronic headache' },
  { queueNo: 'A003', name: 'Raj Kumar a/l Muthu', icNumber: '750101-10-5555', age: 49, gender: 'M', category: 'Red', waitTime: '15 min', status: 'called', complaint: 'Chest pain' },
  { queueNo: 'A004', name: 'Lee Wei Ming', icNumber: '850303-07-8888', age: 39, gender: 'M', category: 'Green', waitTime: '20 min', status: 'waiting', complaint: 'Health check-up' },
  { queueNo: 'A005', name: 'Fatimah binti Hassan', icNumber: '680712-02-3333', age: 56, gender: 'F', category: 'Yellow', waitTime: '10 min', status: 'waiting', complaint: 'High blood pressure' },
  { queueNo: 'A006', name: 'Tan Mei Ling', icNumber: '950505-14-6666', age: 29, gender: 'F', category: 'Green', waitTime: '5 min', status: 'in-progress', complaint: 'Stomach ache' },
]

interface QueueManagementProps {
  hospitalTheme?: {
    primary: string
    secondary: string
    accent: string
  }
  onSelectPatient?: (patient: QueuePatient) => void
}

export default function QueueManagement({ hospitalTheme, onSelectPatient }: QueueManagementProps) {
  const [queue, setQueue] = useState<QueuePatient[]>(mockQueue)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'called' | 'in-progress'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const colors = hospitalTheme || {
    primary: 'blue',
    secondary: 'sky',
    accent: 'cyan'
  }

  const filteredQueue = queue.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.queueNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.icNumber.includes(searchQuery)
    return matchesFilter && matchesSearch
  })

  const stats = {
    waiting: queue.filter(p => p.status === 'waiting').length,
    inProgress: queue.filter(p => p.status === 'in-progress').length,
    called: queue.filter(p => p.status === 'called').length,
    completed: queue.filter(p => p.status === 'completed').length,
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Red': return 'bg-red-100 text-red-700 border-red-200'
      case 'Yellow': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'Green': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Waiting' }
      case 'called': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Called' }
      case 'in-progress': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Progress' }
      case 'completed': return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Completed' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
    }
  }

  const callNextPatient = () => {
    const nextPatient = queue.find(p => p.status === 'waiting')
    if (nextPatient) {
      setQueue(queue.map(p => 
        p.queueNo === nextPatient.queueNo ? { ...p, status: 'called' } : p
      ))
    }
  }

  const startConsultation = (queueNo: string) => {
    setQueue(queue.map(p => 
      p.queueNo === queueNo ? { ...p, status: 'in-progress' } : p
    ))
    const patient = queue.find(p => p.queueNo === queueNo)
    if (patient && onSelectPatient) {
      onSelectPatient(patient)
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Queue</h2>
          <p className="text-gray-500">Queue Management • Today's Patients</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={callNextPatient}
            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-${colors.primary}-500 to-${colors.secondary}-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Mic className="w-5 h-5" />
            Call Next
          </motion.button>
        </div>
      </div>

            <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Waiting', value: stats.waiting, icon: Clock, color: 'slate' },
          { label: 'Called', value: stats.called, icon: PhoneCall, color: 'blue' },
          { label: 'In Progress', value: stats.inProgress, icon: Stethoscope, color: 'emerald' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'gray' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className={`p-4 bg-${stat.color}-50 rounded-xl border border-${stat.color}-100`}
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              <span className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</span>
            </div>
            <p className={`text-sm text-${stat.color}-600`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, Queue No. or IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'waiting', 'called', 'in-progress'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'waiting' ? 'Waiting' : f === 'called' ? 'Called' : 'In Progress'}
            </button>
          ))}
        </div>
      </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
          <div className="col-span-1">No.</div>
          <div className="col-span-3">Patient Name</div>
          <div className="col-span-2">No. IC</div>
          <div className="col-span-2">Complaint</div>
          <div className="col-span-1">Triage</div>
          <div className="col-span-1">Wait</div>
          <div className="col-span-2">Action</div>
        </div>

        <AnimatePresence>
          {filteredQueue.map((patient, index) => {
            const statusBadge = getStatusBadge(patient.status)
            return (
              <motion.div
                key={patient.queueNo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${
                  patient.status === 'called' ? 'bg-blue-50' : ''
                } ${patient.status === 'in-progress' ? 'bg-emerald-50' : ''}`}
              >
                <div className="col-span-1 flex items-center">
                  <span className={`text-lg font-bold ${
                    patient.category === 'Red' ? 'text-red-600' :
                    patient.category === 'Yellow' ? 'text-amber-600' : 'text-gray-700'
                  }`}>
                    {patient.queueNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    patient.gender === 'M' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}>
                    <User className={`w-5 h-5 ${patient.gender === 'M' ? 'text-blue-600' : 'text-pink-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{patient.name}</p>
                    <p className="text-xs text-gray-500">{patient.age} years • {patient.gender === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {patient.icNumber}
                  </code>
                </div>

                <div className="col-span-2 flex items-center">
                  <p className="text-sm text-gray-600 truncate">{patient.complaint}</p>
                </div>

                <div className="col-span-1 flex items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(patient.category)}`}>
                    {patient.category}
                  </span>
                </div>

                <div className="col-span-1 flex items-center gap-1 text-gray-600">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm">{patient.waitTime}</span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                    {statusBadge.label}
                  </span>
                  {patient.status === 'waiting' && (
                    <motion.button
                      onClick={() => startConsultation(patient.queueNo)}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PhoneCall className="w-4 h-4" />
                    </motion.button>
                  )}
                  {patient.status === 'called' && (
                    <motion.button
                      onClick={() => startConsultation(patient.queueNo)}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Start Treatment
                    </motion.button>
                  )}
                  {patient.status === 'in-progress' && (
                    <span className="flex items-center gap-1 text-emerald-600 text-sm">
                      <motion.div
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      Active
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredQueue.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No patients in queue</p>
          </div>
        )}
      </div>
    </div>
  )
}
