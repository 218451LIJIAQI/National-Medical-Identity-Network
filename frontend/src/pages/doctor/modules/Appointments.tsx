import { useState } from 'react'
import {
  Calendar,
  Clock,
  User,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Bell,
  Filter,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Ban,
} from 'lucide-react'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import { useClinicalStore } from '@/store/clinical'
import { downloadCsvFile, formatIC } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Appointment {
  id: string
  patientName: string
  icNumber: string
  phone: string
  date: string
  time: string
  type: 'follow-up' | 'new' | 'procedure' | 'review'
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
}

function getOffsetDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

const initialAppointments = (): Appointment[] => {
  const today = getOffsetDateStr(0)
  const tomorrow = getOffsetDateStr(1)
  return [
    { id: '1', patientName: 'Ahmad bin Abdullah', icNumber: '880101-14-5678', phone: '+6012-3456789', date: today, time: '09:00', type: 'follow-up', status: 'confirmed' },
    { id: '2', patientName: 'Siti Nurhaliza binti Mohd', icNumber: '950320-10-1234', phone: '+6013-9876543', date: today, time: '09:30', type: 'new', status: 'pending' },
    { id: '3', patientName: 'Tan Ah Kow', icNumber: '550715-07-9999', phone: '+6016-5551234', date: today, time: '10:00', type: 'review', status: 'confirmed' },
    { id: '4', patientName: 'Lee Mei Fong', icNumber: '780312-14-2345', phone: '+6011-2223333', date: today, time: '11:00', type: 'procedure', status: 'confirmed' },
    { id: '5', patientName: 'Raj Kumar a/l Muthu', icNumber: '900808-01-5555', phone: '+6017-6665555', date: tomorrow, time: '09:00', type: 'follow-up', status: 'confirmed' },
    { id: '6', patientName: 'Aishah binti Mohd Yusof', icNumber: '820425-12-7777', phone: '+6019-8887777', date: tomorrow, time: '10:30', type: 'review', status: 'pending' },
  ]
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

const APPOINTMENT_STATUS_META: Record<
  Appointment['status'],
  { tone: StatusTone; label: string; icon: typeof CheckCircle2 }
> = {
  confirmed: { tone: 'success', label: 'Confirmed', icon: CheckCircle2 },
  pending: { tone: 'warning', label: 'Pending', icon: AlertCircle },
  cancelled: { tone: 'blocked', label: 'Cancelled', icon: Ban },
  completed: { tone: 'neutral', label: 'Completed', icon: Check },
}

const TYPE_BADGE_CLASS: Record<Appointment['type'], string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  'follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
  procedure: 'bg-amber-100 text-amber-900 border-amber-200',
  review: 'bg-cyan-100 text-cyan-900 border-cyan-200',
}

export default function Appointments() {
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [newBooking, setNewBooking] = useState({
    patientName: '',
    icNumber: '',
    phone: '+6012-0000000',
    type: 'follow-up' as Appointment['type'],
  })

  const selectedDateKey = selectedDate.toISOString().split('T')[0]
  const displayDate = selectedDate.toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const dayAppointments = appointments
    .filter((apt) => apt.date === selectedDateKey)
    .sort((a, b) => a.time.localeCompare(b.time))

  const filteredAppointments = dayAppointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.icNumber.includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const navigateDate = (direction: 'prev' | 'next') => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(next)
  }

  const updateStatus = (id: string, status: Appointment['status']) => {
    setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status } : apt)))
    toast({ title: 'Appointment Updated', description: `Status changed to ${status}.` })
  }

  const openSlotBooking = (slot?: string) => {
    const chosenSlot =
      slot ||
      timeSlots.find(
        (candidate) => !dayAppointments.some((apt) => apt.time === candidate && apt.status !== 'cancelled')
      )

    if (!chosenSlot) {
      toast({
        title: 'All Slots Occupied',
        description: `No open slots remain for ${selectedDateKey}. Navigate to the next clinic day.`,
        variant: 'destructive',
      })
      return
    }

    setBookingSlot(chosenSlot)
    setNewBooking({
      patientName: activePatient?.fullName || '',
      icNumber: activePatient?.icNumber || '',
      phone: activePatient?.phone || '+6012-3456789',
      type: 'follow-up',
    })
  }

  const confirmSlotBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingSlot || !newBooking.patientName.trim() || !newBooking.icNumber.trim()) return

    const alreadyBooked = dayAppointments.some(
      (apt) => apt.time === bookingSlot && apt.status !== 'cancelled'
    )
    if (alreadyBooked) {
      toast({
        title: 'Slot Already Booked',
        description: `The ${bookingSlot} slot is already assigned. Please choose another open time.`,
        variant: 'destructive',
      })
      return
    }

    const created: Appointment = {
      id: `apt-${Date.now()}`,
      patientName: newBooking.patientName.trim(),
      icNumber: formatIC(newBooking.icNumber.trim()),
      phone: newBooking.phone.trim(),
      date: selectedDateKey,
      time: bookingSlot,
      type: newBooking.type,
      status: 'confirmed',
    }
    setAppointments((prev) => [...prev, created])
    setBookingSlot(null)
    toast({
      title: 'Appointment Booked',
      description: `${created.patientName} scheduled for ${selectedDateKey} at ${created.time}.`,
      variant: 'success',
    })
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `appointments-${selectedDateKey}.csv`,
      ['Date', 'Time', 'Patient Name', 'IC Number', 'Phone', 'Type', 'Status'],
      dayAppointments.map((a) => [a.date, a.time, a.patientName, a.icNumber, a.phone, a.type, a.status])
    )
  }

  const stats = {
    total: dayAppointments.length,
    confirmed: dayAppointments.filter((a) => a.status === 'confirmed').length,
    pending: dayAppointments.filter((a) => a.status === 'pending').length,
    completed: dayAppointments.filter((a) => a.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
          <p className="text-slate-600 text-sm">Outpatient clinic schedule & slot booking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleExportCsv} className="rounded-xl gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            type="button"
            onClick={() => openSlotBooking()}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-slate-100 rounded-lg"
          aria-label="Previous day"
          title="Previous day"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-teal-700" />
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{displayDate}</p>
            <p className="text-xs text-slate-500 tabular-nums">
              {stats.total} scheduled appointment(s)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-slate-100 rounded-lg"
          aria-label="Next day"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, cardClass: 'bg-blue-50/80 border-blue-200', valueClass: 'text-blue-800' },
          { label: 'Confirmed', value: stats.confirmed, cardClass: 'bg-emerald-50/80 border-emerald-200', valueClass: 'text-emerald-800' },
          { label: 'Pending', value: stats.pending, cardClass: 'bg-amber-50/80 border-amber-200', valueClass: 'text-amber-900' },
          { label: 'Completed', value: stats.completed, cardClass: 'bg-slate-50 border-slate-200', valueClass: 'text-slate-800' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 ${stat.cardClass} rounded-xl border`}>
            <p className={`text-2xl font-bold tabular-nums ${stat.valueClass}`}>{stat.value}</p>
            <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search patient name or MyKad IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-4 text-left">Time</th>
              <th className="p-4 text-left">Patient</th>
              <th className="p-4 text-left">MyKad IC</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAppointments.map((apt) => {
              const statusMeta = APPOINTMENT_STATUS_META[apt.status]
              return (
                <tr
                  key={apt.id}
                  className={apt.status === 'cancelled' ? 'opacity-60 bg-slate-50/50' : 'hover:bg-slate-50'}
                >
                  <td className="p-4 font-semibold text-slate-900 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-700" /> {apt.time}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-teal-800" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{apt.patientName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 tabular-nums">
                          <Phone className="w-3 h-3" /> {apt.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-700 tabular-nums">{apt.icNumber}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${TYPE_BADGE_CLASS[apt.type]}`}
                    >
                      {apt.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <StatusBadge
                      tone={statusMeta.tone}
                      icon={statusMeta.icon}
                      label={statusMeta.label}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {apt.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateStatus(apt.id, 'confirmed')}
                            className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200"
                            title="Confirm appointment"
                            aria-label="Confirm appointment"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                            className="p-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                            title="Cancel appointment"
                            aria-label="Cancel appointment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(apt.id, 'completed')}
                          className="px-2.5 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          toast({
                            title: 'SMS Reminder Queued',
                            description: `Sent appointment reminder to ${apt.patientName} (${apt.phone}).`,
                          })
                        }
                        className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                        title="Send SMS reminder"
                        aria-label={`Send SMS reminder to ${apt.patientName}`}
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredAppointments.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">
              No appointments scheduled for this date/filter. Click an open time slot below to book.
            </p>
          </div>
        )}
      </div>

      {/* Interactive Time Slots */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-3 text-sm tabular-nums">
          Time Slots for {selectedDateKey} (Select any available slot to book)
        </h3>
        <div className="grid grid-cols-7 gap-2.5">
          {timeSlots.map((slot) => {
            const isBooked = dayAppointments.some(
              (apt) => apt.time === slot && apt.status !== 'cancelled'
            )
            return (
              <button
                key={slot}
                type="button"
                disabled={isBooked}
                onClick={() => openSlotBooking(slot)}
                className={`p-2.5 rounded-lg text-center text-xs font-semibold border transition-colors tabular-nums ${
                  isBooked
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span>{slot}</span>
                <span className="block text-[10px] font-medium mt-0.5">
                  {isBooked ? 'Booked' : 'Available'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ModalDialog
        open={Boolean(bookingSlot)}
        onClose={() => setBookingSlot(null)}
        title="Book Clinic Slot"
        description={bookingSlot ? `${selectedDateKey} at ${bookingSlot}` : undefined}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={confirmSlotBooking} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name *
              </label>
              <Input
                required
                placeholder="Patient Full Name"
                value={newBooking.patientName}
                onChange={(e) => setNewBooking({ ...newBooking, patientName: e.target.value })}
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
                value={newBooking.icNumber}
                onChange={(e) => setNewBooking({ ...newBooking, icNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <Input
                placeholder="+6012-3456789"
                value={newBooking.phone}
                onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Type
              </label>
              <select
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                value={newBooking.type}
                onChange={(e) =>
                  setNewBooking({ ...newBooking, type: e.target.value as Appointment['type'] })
                }
              >
                <option value="follow-up">Follow-up Consultation</option>
                <option value="new">New Consultation</option>
                <option value="review">Lab / Imaging Review</option>
                <option value="procedure">Minor Procedure</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setBookingSlot(null)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Confirm Booking
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
