import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
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
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react'
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

const roleConfig: Record<
  Staff['role'],
  { label: string; icon: typeof Stethoscope; color: string }
> = {
  doctor: { label: 'Doctor', icon: Stethoscope, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  nurse: { label: 'Nurse', icon: Syringe, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  admin: { label: 'Administrator', icon: ClipboardList, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  pharmacist: { label: 'Pharmacist', icon: Building2, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  technician: { label: 'Technician', icon: Building2, color: 'bg-purple-100 text-purple-800 border-purple-200' },
}

const statusConfig: Record<
  Staff['status'],
  { label: string; tone: StatusTone; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  on_leave: { label: 'On Leave', tone: 'warning', icon: Clock },
  inactive: { label: 'Inactive', tone: 'blocked', icon: Ban },
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
    let cancelled = false
    const hospitalId = user?.hospitalId || 'hospital-kl'
    hospitalApi.getDoctors(hospitalId).then((res) => {
      if (cancelled) return
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
    return () => {
      cancelled = true
    }
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
      toast({
        title: 'Staff Updated',
        description: `${formState.name} roster record updated.`,
        variant: 'success',
      })
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
      toast({
        title: 'Staff Added',
        description: `${created.name} added to hospital roster.`,
        variant: 'success',
      })
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
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-600 text-sm">
            Synced with hospital clinical roster & support personnel
          </p>
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

      <div className="grid grid-cols-5 gap-4 tabular-nums">
        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-700" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              <p className="text-xs font-medium text-blue-700">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/80 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="text-2xl font-bold text-emerald-900">{stats.active}</p>
              <p className="text-xs font-medium text-emerald-700">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/80 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-amber-700" />
            <div>
              <p className="text-2xl font-bold text-amber-900">{stats.onLeave}</p>
              <p className="text-xs font-medium text-amber-800">On Leave</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50/80 border-indigo-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-indigo-700" />
            <div>
              <p className="text-2xl font-bold text-indigo-900">{stats.doctors}</p>
              <p className="text-xs font-medium text-indigo-700">Doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-pink-50/80 border-pink-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Syringe className="w-6 h-6 text-pink-700" />
            <div>
              <p className="text-2xl font-bold text-pink-900">{stats.nurses}</p>
              <p className="text-xs font-medium text-pink-700">Nurses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              title="Filter by Role"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="admin">Administrators</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="technician">Technicians</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg tabular-nums">
            <Users className="w-5 h-5 text-blue-700" />
            Hospital Staff Directory ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">MyKad IC</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const roleInfo = roleConfig[staff.role]
                const statusInfo = statusConfig[staff.status]
                const RoleIcon = roleInfo.icon
                return (
                  <tr key={staff.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${roleInfo.color}`}
                        >
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{staff.name}</p>
                          {staff.specialization && (
                            <p className="text-xs text-slate-500">{staff.specialization}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-700 tabular-nums">
                      {staff.icNumber}
                    </td>
                    <td className="p-3">
                      <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                    </td>
                    <td className="p-3 text-slate-700">{staff.department}</td>
                    <td className="p-3 text-xs text-slate-600 space-y-0.5 tabular-nums">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {staff.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {staff.email}
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        tone={statusInfo.tone}
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                      />
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
                          aria-label={`Edit ${staff.name}`}
                        >
                          <Edit className="w-4 h-4 text-blue-700" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaff(staff)}
                          className="h-8 w-8 p-0"
                          title="Remove staff"
                          aria-label={`Remove ${staff.name}`}
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

      <ModalDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        description="Maintain up-to-date clinical and administrative hospital roster details."
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <Input
                required
                placeholder="Full Name"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MyKad IC Number *
              </label>
              <Input
                required
                placeholder="e.g. 850612-08-1234"
                className="font-mono"
                value={formState.icNumber}
                onChange={(e) => setFormState({ ...formState, icNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  value={formState.role}
                  onChange={(e) =>
                    setFormState({ ...formState, role: e.target.value as Staff['role'] })
                  }
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="technician">Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState({ ...formState, status: e.target.value as Staff['status'] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <Input
                placeholder="Department"
                value={formState.department}
                onChange={(e) => setFormState({ ...formState, department: e.target.value })}
              />
            </div>
            {formState.role === 'doctor' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialization
                </label>
                <Input
                  placeholder="Specialization"
                  value={formState.specialization}
                  onChange={(e) => setFormState({ ...formState, specialization: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <Input
                  placeholder="Phone"
                  value={formState.phone}
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingStaff ? 'Update' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
