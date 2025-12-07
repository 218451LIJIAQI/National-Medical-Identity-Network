// ============================================================================
// Appointments Module - 预约管理
// Malaysian hospital appointment management (Temujanji)
// ============================================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, User, Phone, Search,
  Plus, ChevronLeft, ChevronRight, Check,
  X, Bell, Filter
} from 'lucide-react'

interface Appointment {
  id: string
  patientName: string
  icNumber: string
  phone: string
  date: string
  time: string
  type: 'follow-up' | 'new' | 'procedure' | 'review'
  department: string
  doctor: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  notes?: string
}

// Mock appointments
const mockAppointments: Appointment[] = [
  { id: '1', patientName: 'Ahmad bin Abdullah', icNumber: '880515-14-5678', phone: '012-3456789', date: '2024-01-15', time: '09:00', type: 'follow-up', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'confirmed', notes: 'Review BP' },
  { id: '2', patientName: 'Siti Nurhaliza binti Mohd', icNumber: '920820-08-1234', phone: '013-9876543', date: '2024-01-15', time: '09:30', type: 'new', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'pending' },
  { id: '3', patientName: 'Raj Kumar a/l Muthu', icNumber: '750101-10-5555', phone: '016-5551234', date: '2024-01-15', time: '10:00', type: 'review', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'confirmed', notes: 'Diabetic review' },
  { id: '4', patientName: 'Lee Mei Ling', icNumber: '850303-07-8888', phone: '011-2223333', date: '2024-01-15', time: '10:30', type: 'procedure', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'confirmed', notes: 'Minor procedure' },
  { id: '5', patientName: 'Fatimah binti Hassan', icNumber: '680712-02-3333', phone: '019-8887777', date: '2024-01-15', time: '11:00', type: 'follow-up', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'cancelled' },
  { id: '6', patientName: 'Tan Wei Jie', icNumber: '950505-14-6666', phone: '017-6665555', date: '2024-01-16', time: '09:00', type: 'new', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'pending' },
  { id: '7', patientName: 'Muthu a/l Krishnan', icNumber: '780808-10-1111', phone: '012-1112222', date: '2024-01-16', time: '09:30', type: 'follow-up', department: 'Perubatan Am', doctor: 'Dr. Lee Wei Ming', status: 'confirmed' },
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
]

interface AppointmentsProps {
  doctorName?: string
}

export default function Appointments({ doctorName: _doctorName = 'Dr. Lee Wei Ming' }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [_viewMode, _setViewMode] = useState<'day' | 'week' | 'list'>('day')
  const [searchQuery, setSearchQuery] = useState('')
  const [_showNewAppointment, _setShowNewAppointment] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('ms-MY', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter(apt => apt.date === date)
  }

  const todayAppointments = getAppointmentsForDate(formatDate(selectedDate))

  const filteredAppointments = todayAppointments.filter(apt => {
    const matchesSearch = apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         apt.icNumber.includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'new': return 'bg-blue-100 text-blue-700'
      case 'follow-up': return 'bg-purple-100 text-purple-700'
      case 'procedure': return 'bg-orange-100 text-orange-700'
      case 'review': return 'bg-cyan-100 text-cyan-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  const updateStatus = (id: string, status: Appointment['status']) => {
    setAppointments(appointments.map(apt => 
      apt.id === id ? { ...apt, status } : apt
    ))
  }

  const stats = {
    total: todayAppointments.length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
    pending: todayAppointments.filter(a => a.status === 'pending').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Temujanji</h2>
          <p className="text-gray-500">Appointment Management • Jadual Temujanji</p>
        </div>
        <motion.button
          onClick={() => _setShowNewAppointment(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold shadow-lg hover:bg-teal-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-5 h-5" />
          Temujanji Baru
        </motion.button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-teal-600" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{formatDisplayDate(selectedDate)}</p>
            <p className="text-sm text-gray-500">{stats.total} temujanji</p>
          </div>
        </div>

        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Jumlah', value: stats.total, color: 'blue' },
          { label: 'Disahkan', value: stats.confirmed, color: 'emerald' },
          { label: 'Menunggu', value: stats.pending, color: 'amber' },
          { label: 'Selesai', value: stats.completed, color: 'gray' },
        ].map(stat => (
          <motion.div
            key={stat.label}
            className={`p-4 bg-${stat.color}-50 rounded-xl border border-${stat.color}-100`}
            whileHover={{ y: -2 }}
          >
            <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
            <p className={`text-sm text-${stat.color}-600`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau IC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          {['all', 'confirmed', 'pending', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === status 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'confirmed' ? 'Disahkan' : status === 'pending' ? 'Menunggu' : 'Dibatal'}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
          <div className="col-span-1">Masa</div>
          <div className="col-span-3">Pesakit</div>
          <div className="col-span-2">No. IC</div>
          <div className="col-span-2">Jenis</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Tindakan</div>
        </div>

        <AnimatePresence>
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tiada temujanji pada tarikh ini</p>
            </div>
          ) : (
            filteredAppointments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  apt.status === 'cancelled' ? 'opacity-50' : ''
                }`}
              >
                <div className="col-span-1 flex items-center">
                  <div className="flex items-center gap-1 text-gray-700 font-medium">
                    <Clock className="w-4 h-4 text-teal-500" />
                    {apt.time}
                  </div>
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{apt.patientName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {apt.phone}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {apt.icNumber}
                  </code>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(apt.type)}`}>
                    {apt.type === 'new' ? 'Baru' : 
                     apt.type === 'follow-up' ? 'Susulan' : 
                     apt.type === 'procedure' ? 'Prosedur' : 'Semakan'}
                  </span>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(apt.status)}`}>
                    {apt.status === 'confirmed' ? 'Disahkan' :
                     apt.status === 'pending' ? 'Menunggu' :
                     apt.status === 'cancelled' ? 'Dibatal' : 'Selesai'}
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  {apt.status === 'pending' && (
                    <>
                      <motion.button
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                        whileHover={{ scale: 1.1 }}
                        title="Confirm appointment"
                      >
                        <Check className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        whileHover={{ scale: 1.1 }}
                        title="Cancel appointment"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <motion.button
                      onClick={() => updateStatus(apt.id, 'completed')}
                      className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600"
                      whileHover={{ scale: 1.02 }}
                    >
                      Selesai
                    </motion.button>
                  )}
                  <motion.button
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    whileHover={{ scale: 1.1 }}
                    title="Send reminder"
                  >
                    <Bell className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Time Slots Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Slot Masa Tersedia</h3>
        <div className="grid grid-cols-7 gap-3">
          {timeSlots.map(slot => {
            const isBooked = todayAppointments.some(apt => apt.time === slot && apt.status !== 'cancelled')
            return (
              <div
                key={slot}
                className={`p-3 rounded-lg text-center text-sm font-medium ${
                  isBooked 
                    ? 'bg-red-50 text-red-400 border border-red-200' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-pointer hover:bg-emerald-100'
                }`}
              >
                {slot}
                {isBooked && <span className="block text-xs">Penuh</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
