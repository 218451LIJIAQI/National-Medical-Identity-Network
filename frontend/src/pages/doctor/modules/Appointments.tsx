import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Ban,
  Loader2,
} from 'lucide-react'
import { ClinicalPatientBanner, WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi, type ClinicAppointmentDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, downloadCsvFile, formatIC, isValidMyKad } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TIME_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

const APPOINTMENT_STATUS_META: Record<
  ClinicAppointmentDto['status'],
  { tone: StatusTone; label: string; icon: typeof CheckCircle2 }
> = {
  confirmed: { tone: 'success', label: 'Confirmed', icon: CheckCircle2 },
  pending: { tone: 'warning', label: 'Pending', icon: AlertCircle },
  cancelled: { tone: 'blocked', label: 'Cancelled', icon: Ban },
  completed: { tone: 'neutral', label: 'Completed', icon: Check },
}

const TYPE_BADGE_CLASS: Record<ClinicAppointmentDto['type'], string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  'follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
  procedure: 'bg-amber-100 text-amber-900 border-amber-200',
  review: 'bg-cyan-100 text-cyan-900 border-cyan-200',
}

export default function Appointments() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [appointments, setAppointments] = useState<ClinicAppointmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [savingBooking, setSavingBooking] = useState(false)
  const [newBooking, setNewBooking] = useState({
    patientName: '',
    icNumber: '',
    phone: '+60 12-345 6789',
    time: '09:00',
    type: 'follow-up' as ClinicAppointmentDto['type'],
  })

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    const res = await hospitalApi.getAppointments(hospitalId)
    if (res.success && res.data) {
      setAppointments(res.data)
    }
    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  const dayAppointments = appointments
    .filter((apt) => apt.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time))

  const filteredAppointments = dayAppointments.filter((apt) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      apt.patientName.toLowerCase().includes(q) ||
      apt.icNumber.toLowerCase().includes(q)
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const shiftDate = (days: number) => {
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const openBookingModal = (slot?: string) => {
    const defaultSlot =
      slot ||
      TIME_SLOTS.find(
        (s) => !dayAppointments.some((a) => a.time === s && a.status !== 'cancelled')
      ) ||
      '09:00'
    setNewBooking({
      patientName: activePatient?.fullName || '',
      icNumber: activePatient?.icNumber || '',
      phone: activePatient?.phone || '+60 12-345 6789',
      time: defaultSlot,
      type: 'follow-up',
    })
    setBookingSlot(defaultSlot)
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    const formattedIc = formatIC(newBooking.icNumber.trim())
    if (!newBooking.patientName.trim() || !isValidMyKad(formattedIc)) {
      toast({
        title: 'Validation Error',
        description: t.invalidMyKadFormat,
        variant: 'destructive',
      })
      return
    }

    setSavingBooking(true)
    try {
      const res = await hospitalApi.createAppointment(hospitalId, {
        patientName: newBooking.patientName.trim(),
        icNumber: formattedIc,
        phone: newBooking.phone.trim(),
        date: selectedDate,
        time: newBooking.time,
        type: newBooking.type,
      })
      if (res.success && res.data) {
        setAppointments((prev) => [res.data!, ...prev])
        setBookingSlot(null)
        toast({
          title: 'Appointment Scheduled',
          description: `${res.data.patientName} booked for ${res.data.date} at ${res.data.time}.`,
          variant: 'success',
        })
      } else {
        toast({
          title: res.accessDenied ? t.privacyRestrictedTitle : 'Booking Failed',
          description: res.error || 'Could not create appointment.',
          variant: 'destructive',
        })
      }
    } finally {
      setSavingBooking(false)
    }
  }

  const handleStatusChange = async (id: string, status: ClinicAppointmentDto['status']) => {
    const res = await hospitalApi.updateAppointmentStatus(hospitalId, id, status)
    if (res.success && res.data) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? res.data! : a)))
      toast({ title: 'Appointment Updated', description: `Status updated to ${status}.` })
    }
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `appointments-${hospitalId}-${selectedDate}.csv`,
      ['Date', 'Time', 'Patient Name', 'MyKad IC', 'Phone', 'Type', 'Status'],
      filteredAppointments.map((a) => [
        a.date,
        a.time,
        a.patientName,
        a.icNumber,
        a.phone,
        a.type,
        a.status,
      ])
    )
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={Calendar}
        title={t.appointments}
        subtitle="Specialist clinic slot booking, attendance confirmation & follow-up roster"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredAppointments.length === 0}
              onClick={handleExportCsv}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {t.exportCsv}
            </Button>
            <Button
              size="sm"
              onClick={() => openBookingModal()}
              className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Book Slot
            </Button>
          </>
        }
      />

      {/* Date Navigator & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-9 w-40 font-mono text-xs tabular-nums"
          />
          <Button variant="outline" size="sm" onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs font-semibold"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors',
                filterStatus === st
                  ? `${theme.iconBg} text-white`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {st}
            </button>
          ))}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter patient or IC…"
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Time Slot Quick Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Clinic Time Slots ({selectedDate}) — Click an open slot to schedule
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {TIME_SLOTS.map((slot) => {
            const booked = dayAppointments.find(
              (a) => a.time === slot && a.status !== 'cancelled'
            )
            return (
              <button
                key={slot}
                type="button"
                disabled={Boolean(booked)}
                onClick={() => openBookingModal(slot)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-colors tabular-nums',
                  booked
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/70 text-emerald-950'
                )}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{slot}</span>
                  <Clock className="w-3 h-3 opacity-60" />
                </div>
                <p className="text-[11px] truncate mt-0.5">
                  {booked ? booked.patientName : 'Available'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No appointments scheduled for this date/filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Time</th>
                  <th className="py-3 px-4 text-left font-bold">Patient & MyKad IC</th>
                  <th className="py-3 px-4 text-left font-bold">Contact</th>
                  <th className="py-3 px-4 text-left font-bold">Visit Type</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => {
                  const statusMeta = APPOINTMENT_STATUS_META[apt.status]
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 tabular-nums">
                        {apt.time}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 text-sm">{apt.patientName}</p>
                        <p className="font-mono text-slate-600 tabular-nums">{apt.icNumber}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {apt.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize',
                            TYPE_BADGE_CLASS[apt.type]
                          )}
                        >
                          {apt.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge tone={statusMeta.tone} icon={statusMeta.icon} label={statusMeta.label} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {apt.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(apt.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {(apt.status === 'confirmed' || apt.status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(apt.id, 'completed')}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
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
        open={Boolean(bookingSlot)}
        onClose={() => setBookingSlot(null)}
        title="Schedule Clinic Appointment"
        description={`Book specialist consultation at ${theme.name} (${selectedDate})`}
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Patient Full Name *</label>
              <Input
                required
                value={newBooking.patientName}
                onChange={(e) => setNewBooking({ ...newBooking, patientName: e.target.value })}
                placeholder="Patient full name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">MyKad IC Number *</label>
              <Input
                required
                value={newBooking.icNumber}
                onChange={(e) => setNewBooking({ ...newBooking, icNumber: e.target.value })}
                placeholder="850505-10-5111"
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Time Slot</label>
              <select
                value={newBooking.time}
                onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm tabular-nums"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Visit Category</label>
              <select
                value={newBooking.type}
                onChange={(e) =>
                  setNewBooking({ ...newBooking, type: e.target.value as ClinicAppointmentDto['type'] })
                }
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="follow-up">Follow-Up</option>
                <option value="new">New Consultation</option>
                <option value="review">Result Review</option>
                <option value="procedure">Minor Procedure</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Contact Phone</label>
              <Input
                value={newBooking.phone}
                onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setBookingSlot(null)}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={savingBooking}
              className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}
            >
              {savingBooking && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Confirm Booking
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
