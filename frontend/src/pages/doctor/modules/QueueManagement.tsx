import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { centralApi, hospitalApi, type QueueTicketDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { cn, formatIC, isValidMyKad, parseMyKadDemographics } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataErrorBanner, EmptyStatePanel, ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import {
  Users,
  Clock,
  CheckCircle2,
  PhoneCall,
  Mic,
  Search,
  Stethoscope,
  Plus,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react'

const TRIAGE_BADGE_MAP: Record<
  QueueTicketDto['category'],
  { tone: StatusTone; label: string; icon: typeof AlertTriangle }
> = {
  Red: { tone: 'critical', label: 'Red · Emergent', icon: AlertTriangle },
  Yellow: { tone: 'warning', label: 'Yellow · Urgent', icon: AlertCircle },
  Green: { tone: 'success', label: 'Green · Standard', icon: CheckCircle2 },
}

const QUEUE_STATUS_MAP: Record<
  QueueTicketDto['status'],
  { tone: StatusTone; label: string; icon: typeof Clock }
> = {
  waiting: { tone: 'neutral', label: 'Waiting', icon: Clock },
  called: { tone: 'info', label: 'Called', icon: PhoneCall },
  'in-progress': { tone: 'success', label: 'In Progress', icon: Stethoscope },
  completed: { tone: 'neutral', label: 'Completed', icon: CheckCircle2 },
}

export default function QueueManagement() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { setActivePatient } = useClinicalStore()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [queue, setQueue] = useState<QueueTicketDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<'all' | QueueTicketDto['status']>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false)
  const [hydratingQueueNo, setHydratingQueueNo] = useState<string | null>(null)
  const [walkIn, setWalkIn] = useState({
    name: '',
    icNumber: '',
    category: 'Green' as QueueTicketDto['category'],
    complaint: '',
  })

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    const res = await hospitalApi.getQueue(hospitalId, signal)
    if (res.aborted) return
    if (res.success && res.data) {
      setQueue(res.data)
    } else {
      setLoadError(res.error || t.networkError)
    }
    setLoading(false)
  }, [hospitalId, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadQueue(controller.signal)
    return () => controller.abort()
  }, [loadQueue])

  const filteredQueue = queue.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter
    const q = searchQuery.trim().toLowerCase()
    if (!q) return matchesFilter
    return (
      matchesFilter &&
      (p.name.toLowerCase().includes(q) ||
        p.queueNo.toLowerCase().includes(q) ||
        p.icNumber.toLowerCase().includes(q) ||
        p.complaint.toLowerCase().includes(q))
    )
  })

  const stats = {
    waiting: queue.filter((p) => p.status === 'waiting').length,
    called: queue.filter((p) => p.status === 'called').length,
    inProgress: queue.filter((p) => p.status === 'in-progress').length,
    completed: queue.filter((p) => p.status === 'completed').length,
  }

  const updateTicketStatus = async (queueNo: string, status: QueueTicketDto['status'], label?: string) => {
    const res = await hospitalApi.updateQueueTicket(hospitalId, queueNo, status)
    if (res.success && res.data) {
      setQueue((prev) => prev.map((q) => (q.queueNo === queueNo ? res.data! : q)))
      if (label) {
        toast({ title: label, description: `Ticket ${queueNo} updated to ${status}.` })
      }
    } else {
      toast({ title: 'Update Failed', description: res.error || 'Unable to update ticket', variant: 'destructive' })
    }
  }

  const callNextPatient = async () => {
    const nextPatient =
      queue.find((p) => p.status === 'waiting' && p.category === 'Red') ||
      queue.find((p) => p.status === 'waiting' && p.category === 'Yellow') ||
      queue.find((p) => p.status === 'waiting')

    if (!nextPatient) {
      toast({ title: 'Queue Clear', description: 'No waiting patients remaining in triage queue.' })
      return
    }
    await updateTicketStatus(
      nextPatient.queueNo,
      'called',
      `Calling ${nextPatient.queueNo} (${nextPatient.name})`
    )
  }

  const handleOpenConsult = async (ticket: QueueTicketDto) => {
    setHydratingQueueNo(ticket.queueNo)
    try {
      await hospitalApi.updateQueueTicket(hospitalId, ticket.queueNo, 'in-progress')
      const formattedIc = formatIC(ticket.icNumber)
      const res = await centralApi.getPatient(formattedIc)
      if (res.accessDenied) {
        toast({
          title: t.privacyRestrictedTitle,
          description: res.error || t.privacyRestrictedDesc,
          variant: 'destructive',
        })
        await loadQueue()
        return
      }
      if (res.success && res.data?.patient) {
        const p = res.data.patient
        setActivePatient({
          icNumber: formattedIc,
          fullName: String(p.fullName || ticket.name),
          dateOfBirth: String(p.dateOfBirth || ''),
          gender: String(p.gender || ''),
          bloodType: String(p.bloodType || ''),
          allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
          allergiesUnverified: false,
          chronicConditions: Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : [],
          scopedHospitalId: hospitalId,
          scopedDoctorId: user?.doctorId,
        })
        navigate(`/doctor/patient/${encodeURIComponent(formattedIc)}`)
      } else {
        const inferred = parseMyKadDemographics(formattedIc)
        setActivePatient({
          icNumber: formattedIc,
          fullName: ticket.name,
          dateOfBirth: inferred?.dateOfBirth || '',
          gender: inferred?.gender || '',
          bloodType: 'Unknown',
          allergies: [],
          allergiesUnverified: true,
          chronicConditions: [],
          scopedHospitalId: hospitalId,
          scopedDoctorId: user?.doctorId,
        })
        navigate(`/doctor/patient/${encodeURIComponent(formattedIc)}/new-record`)
      }
    } finally {
      setHydratingQueueNo(null)
    }
  }

  const handleRegisterWalkIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const formattedIc = formatIC(walkIn.icNumber.trim())
    if (!walkIn.name.trim() || !isValidMyKad(formattedIc)) {
      toast({
        title: 'Invalid Walk-In Details',
        description: t.invalidMyKadFormat,
        variant: 'destructive',
      })
      return
    }

    setSubmittingWalkIn(true)
    try {
      const res = await hospitalApi.enqueuePatient(hospitalId, {
        name: walkIn.name.trim(),
        icNumber: formattedIc,
        category: walkIn.category,
        complaint: walkIn.complaint.trim() || 'General outpatient consultation',
      })
      if (res.success && res.data) {
        setQueue((prev) => [...prev, res.data!])
        setShowAddModal(false)
        setWalkIn({ name: '', icNumber: '', category: 'Green', complaint: '' })
        toast({
          title: `Ticket ${res.data.queueNo} Issued`,
          description: `${res.data.name} added to ${theme.shortName} triage queue.`,
          variant: 'success',
        })
      } else {
        toast({
          title: res.accessDenied ? t.privacyRestrictedTitle : 'Registration Rejected',
          description: res.error || 'Could not issue queue ticket.',
          variant: 'destructive',
        })
      }
    } finally {
      setSubmittingWalkIn(false)
    }
  }

  const handleRemoveTicket = async (queueNo: string) => {
    const res = await hospitalApi.removeQueueTicket(hospitalId, queueNo)
    if (res.success) {
      setQueue((prev) => prev.filter((q) => q.queueNo !== queueNo))
      toast({ title: 'Ticket Removed', description: `Removed ${queueNo} from active queue.` })
    }
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={Users}
        title={t.queue}
        subtitle="MTS colour-coded outpatient triage & live consultation dispatch"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void loadQueue()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t.refreshData}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Register Walk-In
            </Button>
            <Button
              size="sm"
              onClick={callNextPatient}
              className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
            >
              <Mic className="w-4 h-4 mr-1.5" />
              Call Next Priority
            </Button>
          </>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Waiting Triage', value: stats.waiting, tone: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Called to Room', value: stats.called, tone: 'text-blue-800', bg: 'bg-blue-50/70 border-blue-200' },
          { label: 'In Consultation', value: stats.inProgress, tone: 'text-emerald-800', bg: 'bg-emerald-50/70 border-emerald-200' },
          { label: 'Completed Today', value: stats.completed, tone: 'text-slate-700', bg: 'bg-white border-slate-200' },
        ].map((kpi) => (
          <div key={kpi.label} className={cn('p-4 rounded-2xl border shadow-sm', kpi.bg)}>
            <p className="text-xs font-semibold text-slate-600">{kpi.label}</p>
            <p className={cn('text-2xl font-extrabold mt-1 tabular-nums', kpi.tone)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'waiting', 'called', 'in-progress', 'completed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors',
                filter === s
                  ? `${theme.iconBg} text-white`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {s === 'all' ? `All (${queue.length})` : s.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-72 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, name, MyKad IC…"
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadQueue()} />}

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-5">
            <EmptyStatePanel
              icon={Users}
              hasActiveFilters={Boolean(searchQuery.trim() || filter !== 'all')}
              onClearFilters={() => {
                setSearchQuery('')
                setFilter('all')
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Queue No</th>
                  <th className="py-3 px-4 text-left font-bold">Patient & MyKad IC</th>
                  <th className="py-3 px-4 text-left font-bold">MTS Triage</th>
                  <th className="py-3 px-4 text-left font-bold">Presenting Complaint</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((item) => {
                  const triage = TRIAGE_BADGE_MAP[item.category]
                  const statusMeta = QUEUE_STATUS_MAP[item.status]
                  return (
                    <tr key={item.queueNo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-slate-900 tabular-nums">
                        {item.queueNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="font-mono text-slate-600 tabular-nums">
                          {item.icNumber} • {item.age}y ({item.gender})
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge tone={triage.tone} icon={triage.icon} label={triage.label} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">{item.complaint}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge tone={statusMeta.tone} icon={statusMeta.icon} label={statusMeta.label} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'waiting' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTicketStatus(item.queueNo, 'called', `Paged ${item.queueNo}`)}
                            >
                              <PhoneCall className="w-3.5 h-3.5 mr-1" />
                              Call
                            </Button>
                          )}
                          {item.status !== 'completed' && (
                            <Button
                              size="sm"
                              disabled={hydratingQueueNo === item.queueNo}
                              onClick={() => handleOpenConsult(item)}
                              className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}
                            >
                              {hydratingQueueNo === item.queueNo ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              )}
                              Consult
                            </Button>
                          )}
                          {item.status === 'in-progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTicketStatus(item.queueNo, 'completed', 'Encounter Completed')}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${item.queueNo}`}
                            onClick={() => handleRemoveTicket(item.queueNo)}
                            className="text-slate-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Outpatient Walk-In Ticket"
        description={`Issue a new MTS triage ticket at ${theme.name}`}
      >
        <form onSubmit={handleRegisterWalkIn} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Patient Full Name *</label>
              <Input
                required
                value={walkIn.name}
                onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
                placeholder="e.g., Nurul Izzah Binti Razak"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">MyKad IC Number *</label>
              <Input
                required
                value={walkIn.icNumber}
                onChange={(e) => setWalkIn({ ...walkIn, icNumber: e.target.value })}
                placeholder="e.g., 920814-14-5220"
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">MTS Triage Acuity</label>
            <select
              value={walkIn.category}
              onChange={(e) => setWalkIn({ ...walkIn, category: e.target.value as QueueTicketDto['category'] })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
            >
              <option value="Green">Green — Standard Non-Urgent</option>
              <option value="Yellow">Yellow — Semi-Urgent Priority</option>
              <option value="Red">Red — Emergent Resuscitation</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Chief Complaint</label>
            <Input
              value={walkIn.complaint}
              onChange={(e) => setWalkIn({ ...walkIn, complaint: e.target.value })}
              placeholder="Primary symptoms or reason for visit…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={submittingWalkIn}
              className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}
            >
              {submittingWalkIn && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Issue Ticket
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
