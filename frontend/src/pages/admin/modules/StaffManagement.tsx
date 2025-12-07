// ============================================================================
// Staff Management Module - Hospital Admin
// Pengurusan Kakitangan Hospital
// ============================================================================

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, Search, Plus, UserCheck,
  Stethoscope, Syringe, ClipboardList, Building2,
  Phone, Mail, Calendar, Edit, Trash2
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Staff {
  id: string
  name: string
  icNumber: string
  role: 'doctor' | 'nurse' | 'admin' | 'pharmacist' | 'technician'
  department: string
  email: string
  phone: string
  status: 'active' | 'on_leave' | 'inactive'
  joinDate: string
  specialization?: string
}

const mockStaff: Staff[] = [
  { id: '1', name: 'Dr. Ahmad bin Hassan', icNumber: '750101-14-5001', role: 'doctor', department: 'Kardiologi', email: 'ahmad@hospital.gov.my', phone: '012-3456789', status: 'active', joinDate: '2018-03-15', specialization: 'Kardiologi' },
  { id: '2', name: 'Nurse Fatimah binti Ali', icNumber: '850612-08-1234', role: 'nurse', department: 'ICU', email: 'fatimah@hospital.gov.my', phone: '013-4567890', status: 'active', joinDate: '2019-06-01' },
  { id: '3', name: 'Dr. Lee Wei Ming', icNumber: '800225-07-5678', role: 'doctor', department: 'Ortopedik', email: 'leewei@hospital.gov.my', phone: '014-5678901', status: 'active', joinDate: '2017-01-10', specialization: 'Ortopedik' },
  { id: '4', name: 'Nurse Siti Nurhaliza', icNumber: '900815-01-9012', role: 'nurse', department: 'Wad Am', email: 'siti@hospital.gov.my', phone: '015-6789012', status: 'on_leave', joinDate: '2020-09-20' },
  { id: '5', name: 'Encik Raj Kumar', icNumber: '780430-10-3456', role: 'admin', department: 'Pentadbiran', email: 'raj@hospital.gov.my', phone: '016-7890123', status: 'active', joinDate: '2015-11-05' },
  { id: '6', name: 'Puan Aminah binti Yusof', icNumber: '820718-06-7890', role: 'pharmacist', department: 'Farmasi', email: 'aminah@hospital.gov.my', phone: '017-8901234', status: 'active', joinDate: '2016-04-12' },
  { id: '7', name: 'En. Muthu a/l Rajan', icNumber: '880920-05-1234', role: 'technician', department: 'Radiologi', email: 'muthu@hospital.gov.my', phone: '018-9012345', status: 'active', joinDate: '2021-02-28' },
  { id: '8', name: 'Dr. Nurul Izzah', icNumber: '790305-03-5678', role: 'doctor', department: 'Pediatrik', email: 'nurul@hospital.gov.my', phone: '019-0123456', status: 'inactive', joinDate: '2014-08-18', specialization: 'Pediatrik' },
]

const roleConfig = {
  doctor: { label: 'Doktor', labelMY: 'Doktor', icon: Stethoscope, color: 'bg-blue-100 text-blue-700' },
  nurse: { label: 'Nurse', labelMY: 'Jururawat', icon: Syringe, color: 'bg-pink-100 text-pink-700' },
  admin: { label: 'Admin', labelMY: 'Pentadbir', icon: ClipboardList, color: 'bg-gray-100 text-gray-700' },
  pharmacist: { label: 'Pharmacist', labelMY: 'Ahli Farmasi', icon: Building2, color: 'bg-green-100 text-green-700' },
  technician: { label: 'Technician', labelMY: 'Juruteknik', icon: Building2, color: 'bg-purple-100 text-purple-700' },
}

const statusConfig = {
  active: { label: 'Active', labelMY: 'Aktif', color: 'bg-green-100 text-green-700' },
  on_leave: { label: 'On Leave', labelMY: 'Cuti', color: 'bg-yellow-100 text-yellow-700' },
  inactive: { label: 'Inactive', labelMY: 'Tidak Aktif', color: 'bg-red-100 text-red-700' },
}

export default function StaffManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredStaff = mockStaff.filter(staff => {
    const matchSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       staff.icNumber.includes(searchTerm) ||
                       staff.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = filterRole === 'all' || staff.role === filterRole
    const matchStatus = filterStatus === 'all' || staff.status === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const stats = {
    total: mockStaff.length,
    active: mockStaff.filter(s => s.status === 'active').length,
    onLeave: mockStaff.filter(s => s.status === 'on_leave').length,
    doctors: mockStaff.filter(s => s.role === 'doctor').length,
    nurses: mockStaff.filter(s => s.role === 'nurse').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500">Pengurusan Kakitangan Hospital</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff / Tambah Kakitangan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-xs text-blue-600">Jumlah Kakitangan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.active}</p>
                <p className="text-xs text-green-600">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.onLeave}</p>
                <p className="text-xs text-yellow-600">Sedang Cuti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">{stats.doctors}</p>
                <p className="text-xs text-indigo-600">Doktor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500 rounded-lg">
                <Syringe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-700">{stats.nurses}</p>
                <p className="text-xs text-pink-600">Jururawat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, IC, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Roles / Semua Jawatan</option>
                <option value="doctor">Doktor</option>
                <option value="nurse">Jururawat</option>
                <option value="admin">Pentadbir</option>
                <option value="pharmacist">Ahli Farmasi</option>
                <option value="technician">Juruteknik</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Status / Semua Status</option>
                <option value="active">Aktif</option>
                <option value="on_leave">Cuti</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Directory ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-600">Name / Nama</th>
                  <th className="text-left p-3 font-medium text-gray-600">IC Number</th>
                  <th className="text-left p-3 font-medium text-gray-600">Role / Jawatan</th>
                  <th className="text-left p-3 font-medium text-gray-600">Department / Jabatan</th>
                  <th className="text-left p-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff, index) => {
                  const roleInfo = roleConfig[staff.role]
                  const statusInfo = statusConfig[staff.status]
                  const RoleIcon = roleInfo.icon
                  return (
                    <motion.tr
                      key={staff.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                            <RoleIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{staff.name}</p>
                            {staff.specialization && (
                              <p className="text-xs text-gray-500">{staff.specialization}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-sm text-gray-600">{staff.icNumber}</td>
                      <td className="p-3">
                        <Badge className={roleInfo.color}>{roleInfo.labelMY}</Badge>
                      </td>
                      <td className="p-3 text-gray-600">{staff.department}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />
                            {staff.phone}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {staff.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={statusInfo.color}>{statusInfo.labelMY}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
