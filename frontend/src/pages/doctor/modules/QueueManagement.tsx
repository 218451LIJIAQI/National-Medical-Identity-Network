import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
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
  AlertTriangle,
  AlertCircle,
  Loader2,
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

const TRIAGE_BADGE_MAP: Record<
  QueuePatient['category'],
  { tone: StatusTone; label: string; icon: typeof AlertTriangle }
> = {
  Red: { tone: 'critical', label: 'Red · Emergent', icon: AlertTriangle },
  Yellow: { tone: 'warning', label: 'Yellow · Urgent', icon: AlertCircle },
  Green: { tone: 'success', label: 'Green · Standard', icon: CheckCircle2 },
}

const QUEUE_STATUS_MAP: Record<
  QueuePatient['status'],
  { tone: StatusTone; label: string; icon: typeof Clock }
> = {
  waiting: { tone: 'neutral', label: 'Waiting', icon: Clock },
  called: { tone: 'info', label: 'Called', icon: PhoneCall },
  'in-progress': { tone: 'success', label: 'In Progress', icon: Stethoscope },
  completed: { tone: 'neutral', label: 'Completed', icon: CheckCircle2 },
}

interface QueueManagementProps {
  onSelectPatient?: (patient: QueuePatient) => void
}

export default function QueueManagement({ onSelectPatient }: QueueManagementProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { setActivePatient } = useClinicalStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [queue, setQueue] = useState<QueuePatient[]>(initialQueue)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'called' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [hydratingQueueNo, setHydratingQueueNo] = useState<string | null>(null)
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

  const startConsultation = async (patient: QueuePatient, openTimeline = false) => {
    if (hydratingQueueNo) return
    setHydratingQueueNo(patient.queueNo)
    try {
      const formattedIc = formatIC(patient.icNumber)
      const res = await centralApi.getPatient(formattedIc)

      if (res.accessDenied) {
        toast({
          title: t.privacyRestrictedTitle,
          description: res.error || t.privacyRestrictedDesc,
          variant: 'destructive',
        })
        return
      }

      if (res.success && res.data?.patient) {
        const p = res.data.patient
        setActivePatient({
          icNumber: formattedIc,
          fullName: String(p.fullName || patient.name),
          dateOfBirth: String(p.dateOfBirth || ''),
          gender: String(p.gender || (patient.gender === 'M' ? 'male' : 'female')),
          bloodType: String(p.bloodType || ''),
          allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
          allergiesUnverified: false,
          chronicConditions: Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : [],
          phone: p.phone ? String(p.phone) : undefined,
          scopedHospitalId: user?.hospitalId,
          scopedDoctorId: user?.doctorId,
        })
      } else {
        setActivePatient({
          icNumber: formattedIc,
          fullName: patient.name,
          gender: patient.gender === 'M' ? 'male' : 'female',
          allergies: [],
          allergiesUnverified: true,
          chronicConditions: [],
          scopedHospitalId: user?.hospitalId,
          scopedDoctorId: user?.doctorId,
        })
      }

      setQueue((prev) =>
        prev.map((p) => (p.queueNo === patient.queueNo ? { ...p, status: 'in-progress' } : p))
      )
      onSelectPatient?.(patient)

      if (openTimeline) {
        navigate(`/doctor/patient/${encodeURIComponent(formattedIc)}`)
      } else {
        toast({
          title: 'Consultation Started',
          description: `${patient.name} set as active clinical patient.`,
          variant: 'success',
        })
      }
    } finally {
      setHydratingQueueNo(null)
    }
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
    toast({
      title: 'Walk-In Registered',
      description: `Assigned ticket ${nextNum} to ${newEntry.name}`,
      variant: 'success',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Patient Queue</h2>
          <p className="text-slate-600 text-sm">Triage-prioritized outpatient & acute care queue</p>
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
            className={`gap-2 rounded-xl text-white bg-gradient-to-r ${theme.buttonGradient} shadow-sm`}
          >
            <Mic className="w-4 h-4" />
            Call Next Priority
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Waiting', value: stats.waiting, icon: Clock, cardClass: 'bg-slate-50 border-slate-200', valueClass: 'text-slate-900' },
          { label: 'Called', value: stats.called, icon: PhoneCall, cardClass: 'bg-blue-50/80 border-blue-200', valueClass: 'text-blue-800' },
          { label: 'In Consultation', value: stats.inProgress, icon: Stethoscope, cardClass: 'bg-emerald-50/80 border-emerald-200', valueClass: 'text-emerald-800' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, cardClass: 'bg-slate-50 border-slate-200', valueClass: 'text-slate-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 ${stat.cardClass} rounded-xl border`}>
            <div className="flex items-center justify-between mb-1">
              <stat.icon className="w-5 h-5 text-slate-500" />
              <span className={`text-2xl font-bold tabular-nums ${stat.valueClass}`}>{stat.value}</span>
            </div>
            <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
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
          <tbody className="divide-y divide-slate-100">
            {filteredQueue.map((patient) => {
              const triageInfo = TRIAGE_BADGE_MAP[patient.category]
              const statusInfo = QUEUE_STATUS_MAP[patient.status]
              const isBusy = hydratingQueueNo === patient.queueNo

              return (
                <tr key={patient.queueNo} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-900 font-mono tabular-nums">{patient.queueNo}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          patient.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {patient.age} yrs • {patient.gender === 'M' ? 'Male' : 'Female'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-700 tabular-nums">{patient.icNumber}</td>
                  <td className="p-4 text-slate-700 max-w-[240px] truncate" title={patient.complaint}>
                    {patient.complaint}
                  </td>
                  <td className="p-4">
                    <StatusBadge
                      tone={triageInfo.tone}
                      icon={triageInfo.icon}
                      label={triageInfo.label}
                    />
                  </td>
                  <td className="p-4 text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Timer className="w-3.5 h-3.5" /> {patient.waitTime}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <StatusBadge
                        tone={statusInfo.tone}
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                      />
                      {(patient.status === 'waiting' || patient.status === 'called') && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void startConsultation(patient, false)}
                          className="h-8 px-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Consult'}
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
                          disabled={isBusy}
                          onClick={() => void startConsultation(patient, true)}
                          title="Open Federated Timeline"
                          aria-label={`Open Federated Timeline for ${patient.name}`}
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
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p>No queue tickets match the selected filter.</p>
          </div>
        )}
      </div>

      <ModalDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Walk-In Ticket"
        description="Assign an immediate triage ticket for an unscheduled outpatient arrival."
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleAddWalkIn} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name *
              </label>
              <Input
                required
                placeholder="e.g. Ahmad bin Abdullah"
                value={walkIn.name}
                onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MyKad IC Number *
              </label>
              <Input
                required
                placeholder="e.g. 880101-14-5678"
                className="font-mono"
                value={walkIn.icNumber}
                onChange={(e) => setWalkIn({ ...walkIn, icNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={walkIn.age}
                  onChange={(e) => setWalkIn({ ...walkIn, age: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-md px-2.5 text-sm bg-white"
                  value={walkIn.gender}
                  onChange={(e) => setWalkIn({ ...walkIn, gender: e.target.value as 'M' | 'F' })}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Triage</label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-md px-2.5 text-sm bg-white"
                  value={walkIn.category}
                  onChange={(e) =>
                    setWalkIn({ ...walkIn, category: e.target.value as QueuePatient['category'] })
                  }
                >
                  <option value="Green">Green</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Red">Red</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chief Complaint
              </label>
              <Input
                placeholder="Reason for visit"
                value={walkIn.complaint}
                onChange={(e) => setWalkIn({ ...walkIn, complaint: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Issue Queue Ticket
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
