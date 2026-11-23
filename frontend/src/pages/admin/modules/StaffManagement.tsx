import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users,
  Search,
  Plus,
  UserCheck,
  Stethoscope,
  Syringe,
  ClipboardList,
  Building2,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Download,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { downloadCsvFile, formatIC } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

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

const baselineSupportStaff: Staff[] = [
  { id: 'staff-n1', name: 'SN Fatimah binti Ali', icNumber: '850612-08-1234', role: 'nurse', department: 'ICU', email: 'fatimah@medlink.gov.my', phone: '013-4567890', status: 'active', joinDate: '2019-06-01' },
  { id: 'staff-n2', name: 'SN Siti Nurhaliza', icNumber: '900815-01-9012', role: 'nurse', department: 'General Ward', email: 'siti@medlink.gov.my', phone: '015-6789012', status: 'on_leave', joinDate: '2020-09-20' },
  { id: 'staff-a1', name: 'En. Raj Kumar', icNumber: '780430-10-3456', role: 'admin', department: 'Administration', email: 'raj@medlink.gov.my', phone: '016-7890123', status: 'active', joinDate: '2015-11-05' },
  { id: 'staff-p1', name: 'Pn. Aminah binti Yusof', icNumber: '820718-06-7890', role: 'pharmacist', department: 'Pharmacy', email: 'aminah@medlink.gov.my', phone: '017-8901234', status: 'active', joinDate: '2016-04-12' },
  { id: 'staff-t1', name: 'En. Muthu a/l Rajan', icNumber: '880920-05-1234', role: 'technician', department: 'Radiology', email: 'muthu@medlink.gov.my', phone: '018-9012345', status: 'active', joinDate: '2021-02-28' },
]

const roleConfig = {
  doctor: { labelMY: 'Doktor', icon: Stethoscope, color: 'bg-blue-100 text-blue-700' },
  nurse: { labelMY: 'Jururawat', icon: Syringe, color: 'bg-pink-100 text-pink-700' },
  admin: { labelMY: 'Pentadbir', icon: ClipboardList, color: 'bg-gray-100 text-gray-700' },
  pharmacist: { labelMY: 'Ahli Farmasi', icon: Building2, color: 'bg-green-100 text-green-700' },
  technician: { labelMY: 'Juruteknik', icon: Building2, color: 'bg-purple-100 text-purple-700' },
}

const statusConfig = {
  active: { labelMY: 'Aktif', color: 'bg-green-100 text-green-700' },
  on_leave: { labelMY: 'Cuti', color: 'bg-yellow-100 text-yellow-700' },
  inactive: { labelMY: 'Tidak Aktif', color: 'bg-red-100 text-red-700' },
}

export default function StaffManagement() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [staffList, setStaffList] = useState<Staff[]>(baselineSupportStaff)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    icNumber: '',
    role: 'doctor' as Staff['role'],
    department: 'General Medicine',
    email: '',
    phone: '',
    status: 'active' as Staff['status'],
    specialization: '',
  })

  useEffect(() => {
    const hospitalId = user?.hospitalId || 'hospital-kl'
    hospitalApi.getDoctors(hospitalId).then((res) => {
      if (res.success && res.data) {
        const dbDoctors: Staff[] = res.data.map((doc) => ({
          id: doc.id,
          name: doc.fullName,
          icNumber: doc.icNumber,
          role: 'doctor',
          department: doc.department,
          email: doc.email,
          phone: doc.phone,
          status: doc.isActive ? 'active' : 'inactive',
          joinDate: '2020-01-15',
          specialization: doc.specialization,
        }))
        setStaffList([...dbDoctors, ...baselineSupportStaff])
      }
    })
  }, [user?.hospitalId])

  const filteredStaff = staffList.filter((staff) => {
    const q = searchTerm.toLowerCase()
    const matchSearch =
      staff.name.toLowerCase().includes(q) ||
      staff.icNumber.includes(searchTerm) ||
      staff.department.toLowerCase().includes(q)
    const matchRole = filterRole === 'all' || staff.role === filterRole
    const matchStatus = filterStatus === 'all' || staff.status === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const openAddModal = () => {
    setEditingStaff(null)
    setFormState({
      name: '',
      icNumber: '',
      role: 'nurse',
      department: 'General Ward',
      email: '',
      phone: '',
      status: 'active',
      specialization: '',
    })
    setShowModal(true)
  }

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff)
    setFormState({
      name: staff.name,
      icNumber: staff.icNumber,
      role: staff.role,
      department: staff.department,
      email: staff.email,
      phone: staff.phone,
      status: staff.status,
      specialization: staff.specialization || '',
    })
    setShowModal(true)
  }

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name.trim() || !formState.icNumber.trim()) return

    if (editingStaff) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                name: formState.name.trim(),
                icNumber: formatIC(formState.icNumber.trim()),
                role: formState.role,
                department: formState.department.trim(),
                email: formState.email.trim(),
                phone: formState.phone.trim(),
                status: formState.status,
                specialization: formState.specialization.trim() || undefined,
              }
            : s
        )
      )
      toast({ title: 'Staff Updated', description: `${formState.name} roster record updated.` })
    } else {
      const created: Staff = {
        id: `staff-${Date.now()}`,
        name: formState.name.trim(),
        icNumber: formatIC(formState.icNumber.trim()),
        role: formState.role,
        department: formState.department.trim(),
        email: formState.email.trim() || 'staff@medlink.gov.my',
        phone: formState.phone.trim() || '012-0000000',
        status: formState.status,
        joinDate: new Date().toISOString().split('T')[0],
        specialization: formState.specialization.trim() || undefined,
      }
      setStaffList((prev) => [created, ...prev])
      toast({ title: 'Staff Added', description: `${created.name} added to hospital roster.` })
    }
    setShowModal(false)
  }

  const handleRemoveStaff = (staff: Staff) => {
    setStaffList((prev) => prev.filter((s) => s.id !== staff.id))
    toast({ title: 'Staff Removed', description: `${staff.name} removed from active directory.` })
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `hospital-staff-${user?.hospitalId || 'roster'}.csv`,
      ['Name', 'IC Number', 'Role', 'Department', 'Specialization', 'Phone', 'Email', 'Status'],
      filteredStaff.map((s) => [
        s.name,
        s.icNumber,
        s.role,
        s.department,
        s.specialization || '',
        s.phone,
        s.email,
        s.status,
      ])
    )
  }

  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.status === 'active').length,
    onLeave: staffList.filter((s) => s.status === 'on_leave').length,
    doctors: staffList.filter((s) => s.role === 'doctor').length,
    nurses: staffList.filter((s) => s.role === 'nurse').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">Synced with hospital clinical roster & support personnel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 flex items-center gap-3"><Users className="w-6 h-6 text-blue-600" /><div><p className="text-2xl font-bold text-blue-700">{stats.total}</p><p className="text-xs text-blue-600">Total Staff</p></div></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center gap-3"><UserCheck className="w-6 h-6 text-green-600" /><div><p className="text-2xl font-bold text-green-700">{stats.active}</p><p className="text-xs text-green-600">Active</p></div></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-200"><CardContent className="p-4 flex items-center gap-3"><Calendar className="w-6 h-6 text-yellow-600" /><div><p className="text-2xl font-bold text-yellow-700">{stats.onLeave}</p><p className="text-xs text-yellow-600">On Leave</p></div></CardContent></Card>
        <Card className="bg-indigo-50 border-indigo-200"><CardContent className="p-4 flex items-center gap-3"><Stethoscope className="w-6 h-6 text-indigo-600" /><div><p className="text-2xl font-bold text-indigo-700">{stats.doctors}</p><p className="text-xs text-indigo-600">Doctors</p></div></CardContent></Card>
        <Card className="bg-pink-50 border-pink-200"><CardContent className="p-4 flex items-center gap-3"><Syringe className="w-6 h-6 text-pink-600" /><div><p className="text-2xl font-bold text-pink-700">{stats.nurses}</p><p className="text-xs text-pink-600">Nurses</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, MyKad IC, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              title="Filter by Role"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="admin">Admin</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="technician">Technicians</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              title="Filter by Status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Hospital Staff Directory ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">MyKad IC</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => {
                const roleInfo = roleConfig[staff.role]
                const statusInfo = statusConfig[staff.status]
                const RoleIcon = roleInfo.icon
                return (
                  <tr key={staff.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{staff.name}</p>
                          {staff.specialization && (
                            <p className="text-xs text-gray-500">{staff.specialization}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-600">{staff.icNumber}</td>
                    <td className="p-3">
                      <Badge className={roleInfo.color}>{roleInfo.labelMY}</Badge>
                    </td>
                    <td className="p-3 text-gray-700">{staff.department}</td>
                    <td className="p-3 text-xs text-gray-500 space-y-0.5">
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {staff.phone}</div>
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {staff.email}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={statusInfo.color}>{statusInfo.labelMY}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(staff)}
                          className="h-8 w-8 p-0"
                          title="Edit staff"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaff(staff)}
                          className="h-8 w-8 p-0"
                          title="Remove staff"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveStaff}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <Input
                  required
                  placeholder="Full Name *"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
                <Input
                  required
                  placeholder="MyKad IC Number *"
                  value={formState.icNumber}
                  onChange={(e) => setFormState({ ...formState, icNumber: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 px-3 border rounded-md text-sm bg-white"
                    value={formState.role}
                    onChange={(e) => setFormState({ ...formState, role: e.target.value as Staff['role'] })}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    className="h-10 px-3 border rounded-md text-sm bg-white"
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value as Staff['status'] })}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <Input
                  placeholder="Department"
                  value={formState.department}
                  onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                />
                {formState.role === 'doctor' && (
                  <Input
                    placeholder="Specialization"
                    value={formState.specialization}
                    onChange={(e) => setFormState({ ...formState, specialization: e.target.value })}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Phone"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingStaff ? 'Update' : 'Add Staff'}
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
