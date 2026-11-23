import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { formatIC } from '@/lib/utils'
import { useSessionState } from '@/lib/workstation-storage'
import { useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar, Clock, User, Phone, Search,
  ChevronLeft, ChevronRight, Check, X, Bell, Filter, Plus
} from 'lucide-react'

interface Appointment {
  id: string
  patientName: string
  icNumber: string
  phone: string
  date: string
  time: string
  type: 'follow-up' | 'new' | 'procedure' | 'review'
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  reminderSent?: boolean
}

function getLocalDateKey(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildInitialAppointments(): Appointment[] {
  const today = getLocalDateKey(0)
  const tomorrow = getLocalDateKey(1)
  return [
    { id: '1', patientName: 'Ahmad bin Abdullah', icNumber: '880101-14-5678', phone: '+6012-3456789', date: today, time: '09:00', type: 'follow-up', status: 'confirmed' },
    { id: '2', patientName: 'Siti Nurhaliza binti Mohd', icNumber: '950320-10-1234', phone: '+6013-9876543', date: today, time: '09:30', type: 'new', status: 'pending' },
    { id: '3', patientName: 'Raj Kumar a/l Muthu', icNumber: '900808-01-5555', phone: '+6016-5551234', date: today, time: '10:00', type: 'review', status: 'confirmed' },
    { id: '4', patientName: 'Tan Ah Kow', icNumber: '550715-07-9999', phone: '+6011-2223333', date: today, time: '10:30', type: 'procedure', status: 'confirmed' },
    { id: '5', patientName: 'Aishah binti Mohd Yusof', icNumber: '820425-12-7777', phone: '+6019-8887777', date: today, time: '11:00', type: 'follow-up', status: 'cancelled' },
    { id: '6', patientName: 'Lee Mei Fong', icNumber: '780312-14-2345', phone: '+6017-6665555', date: tomorrow, time: '09:00', type: 'new', status: 'pending' },
    { id: '7', patientName: 'Wong Kar Wai', icNumber: '850909-08-3456', phone: '+6012-1112222', date: tomorrow, time: '09:30', type: 'follow-up', status: 'confirmed' },
  ]
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

const STATUS_BADGE_CLASS: Record<Appointment['status'], string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
}

const TYPE_BADGE_CLASS: Record<Appointment['type'], string> = {
  new: 'bg-blue-100 text-blue-700',
  'follow-up': 'bg-purple-100 text-purple-700',
  procedure: 'bg-orange-100 text-orange-700',
  review: 'bg-cyan-100 text-cyan-700',
}

export default function Appointments() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { patient: activePatient } = useWorkstationPatient()

  const [appointments, setAppointments] = useSessionState<Appointment[]>(
    `appointments:${user?.hospitalId || 'default'}`,
    buildInitialAppointments
  )
  const [selectedDateKey, setSelectedDateKey] = useState(() => getLocalDateKey(0))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [bookingForm, setBookingForm] = useState({
    patientName: activePatient.fullName,
    icNumber: activePatient.icNumber,
    phone: '+6012-3456789',
    type: 'follow-up' as Appointment['type'],
  })

  const selectedDateObj = new Date(`${selectedDateKey}T00:00:00`)
  const displayDate = selectedDateObj.toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const todayAppointments = appointments
    .filter((apt) => apt.date === selectedDateKey)
    .sort((a, b) => a.time.localeCompare(b.time))

  const filteredAppointments = todayAppointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.icNumber.includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const navigateDate = (direction: 'prev' | 'next') => {
    const next = new Date(`${selectedDateKey}T00:00:00`)
    next.setDate(next.getDate() + (direction === 'next' ? 1 : -1))
    const yyyy = next.getFullYear()
    const mm = String(next.getMonth() + 1).padStart(2, '0')
    const dd = String(next.getDate()).padStart(2, '0')
    setSelectedDateKey(`${yyyy}-${mm}-${dd}`)
  }

  const updateStatus = (id: string, status: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    )
    toast({
      title: 'Appointment Updated',
      description: `Status changed to ${status}`,
    })
  }

  const sendReminder = (apt: Appointment) => {
    setAppointments((prev) =>
      prev.map((item) => (item.id === apt.id ? { ...item, reminderSent: true } : item))
    )
    toast({
      title: 'SMS Reminder Dispatched',
      description: `Sent appointment reminder to ${apt.patientName} (${apt.phone}) for ${apt.time}`,
    })
  }

  const openSlotBooking = (slot: string) => {
    setBookingForm({
      patientName: activePatient.fullName,
      icNumber: activePatient.icNumber,
      phone: '+6012-3456789',
      type: 'follow-up',
    })
    setBookingSlot(slot)
  }

  const handleBookSlot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingSlot || !bookingForm.patientName.trim() || !bookingForm.icNumber.trim()) return
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientName: bookingForm.patientName.trim(),
      icNumber: formatIC(bookingForm.icNumber),
      phone: bookingForm.phone.trim() || '-',
      date: selectedDateKey,
      time: bookingSlot,
      type: bookingForm.type,
      status: 'confirmed',
    }
    setAppointments((prev) => [...prev, newApt])
    setBookingSlot(null)
    toast({
      title: 'Appointment Booked',
      description: `${newApt.patientName} scheduled on ${selectedDateKey} at ${newApt.time}`,
    })
  }

  const stats = {
    total: todayAppointments.length,
    confirmed: todayAppointments.filter((a) => a.status === 'confirmed').length,
    pending: todayAppointments.filter((a) => a.status === 'pending').length,
    completed: todayAppointments.filter((a) => a.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
          <p className="text-gray-500 text-sm">Outpatient Clinic Schedule (session-persisted • click any open slot below to book)</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSelectedDateKey(getLocalDateKey(0))}
          className="rounded-xl"
        >
          Jump to Today
        </Button>
      </div>

      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Previous day"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-teal-600" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{displayDate}</p>
            <p className="text-sm text-gray-500">{stats.total} appointment(s)</p>
          </div>
        </div>

        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, cardClass: 'bg-blue-50 border-blue-100', valueClass: 'text-blue-700', labelClass: 'text-blue-600' },
          { label: 'Confirmed', value: stats.confirmed, cardClass: 'bg-emerald-50 border-emerald-100', valueClass: 'text-emerald-700', labelClass: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, cardClass: 'bg-amber-50 border-amber-100', valueClass: 'text-amber-700', labelClass: 'text-amber-600' },
          { label: 'Completed', value: stats.completed, cardClass: 'bg-gray-50 border-gray-100', valueClass: 'text-gray-700', labelClass: 'text-gray-600' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 ${stat.cardClass} rounded-xl border`}>
            <p className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</p>
            <p className={`text-sm ${stat.labelClass}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filterStatus === status
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Patient</div>
            <div className="col-span-2">IC Number</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Action</div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matching appointments on this date</p>
            </div>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  apt.status === 'cancelled' ? 'opacity-50' : ''
                }`}
              >
                <div className="col-span-2 flex items-center gap-1.5 text-gray-800 font-semibold">
                  <Clock className="w-4 h-4 text-teal-500" />
                  {apt.time}
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{apt.patientName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {apt.phone}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {apt.icNumber}
                  </code>
                </div>

                <div className="col-span-1 flex items-center">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${TYPE_BADGE_CLASS[apt.type]}`}>
                    {apt.type}
                  </span>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${STATUS_BADGE_CLASS[apt.status]}`}>
                    {apt.status}
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  {apt.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                        title="Confirm appointment"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Cancel appointment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(apt.id, 'completed')}
                      className="px-2.5 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => sendReminder(apt)}
                    className={`p-2 rounded-lg transition-colors ${
                      apt.reminderSent
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={apt.reminderSent ? 'Reminder sent' : 'Send SMS reminder'}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Available Time Slots ({selectedDateKey}) — Click an open slot to book</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {timeSlots.map((slot) => {
            const isBooked = todayAppointments.some((apt) => apt.time === slot && apt.status !== 'cancelled')
            return (
              <button
                key={slot}
                type="button"
                disabled={isBooked}
                onClick={() => openSlotBooking(slot)}
                className={`p-3 rounded-lg text-center text-sm font-medium transition-colors ${
                  isBooked
                    ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {slot}
                <span className="block text-xs mt-0.5">{isBooked ? 'Booked' : '+ Book'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {bookingSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBookingSlot(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Book Slot • {selectedDateKey} at {bookingSlot}</h3>
              <button onClick={() => setBookingSlot(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBookSlot} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Patient Name *</label>
                <Input
                  value={bookingForm.patientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">IC Number *</label>
                <Input
                  value={bookingForm.icNumber}
                  onChange={(e) => setBookingForm({ ...bookingForm, icNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Phone Number</label>
                <Input
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Visit Type</label>
                <select
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value as Appointment['type'] })}
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="follow-up">Follow-up</option>
                  <option value="new">New Consultation</option>
                  <option value="review">Lab / Imaging Review</option>
                  <option value="procedure">Minor Procedure</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBookingSlot(null)}>Cancel</Button>
                <Button type="submit" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Confirm Booking
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
