import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { hospitalApi } from '@/lib/api'
import { useSessionState, exportToCsv } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import {
  Users,
  Search,
  UserPlus,
  Stethoscope,
  Shield,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Building2,
  Award,
  Download,
  RefreshCw,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface StaffMember {
  id: string
  name: string
  icNumber: string
  role: 'doctor' | 'nurse' | 'pharmacist' | 'technician' | 'admin'
  department: string
  specialization?: string
  licenseNo?: string
  phone: string
  email: string
  status: 'active' | 'on-leave' | 'inactive'
  joinDate: string
  source: 'database' | 'session'
}

const DEFAULT_SUPPORT_STAFF: StaffMember[] = [
  {
    id: 'SUP-001',
    name: 'Nurse Siti Aminah',
    icNumber: '880420-14-5678',
    role: 'nurse',
    department: 'Emergency',
    licenseNo: 'NBM-56789',
    phone: '+60 12-456 7890',
    email: 'siti.aminah@hospital.gov.my',
    status: 'active',
    joinDate: '2020-01-10',
    source: 'session',
  },
  {
    id: 'SUP-002',
    name: 'Pharm. Wong Mei Ling',
    icNumber: '850815-07-3456',
    role: 'pharmacist',
    department: 'Pharmacy',
    licenseNo: 'MPB-23456',
    phone: '+60 12-567 8901',
    email: 'meiling.wong@hospital.gov.my',
    status: 'active',
    joinDate: '2019-06-20',
    source: 'session',
  },
  {
    id: 'SUP-003',
    name: 'Tech. Rajesh Kumar',
    icNumber: '900112-10-7890',
    role: 'technician',
    department: 'Laboratory',
    phone: '+60 12-678 9012',
    email: 'rajesh.kumar@hospital.gov.my',
    status: 'on-leave',
    joinDate: '2021-02-28',
    source: 'session',
  },
]

const roleConfig = {
  doctor: { label: 'Doctor', color: 'bg-blue-100 text-blue-700', icon: Stethoscope },
  nurse: { label: 'Nurse', color: 'bg-pink-100 text-pink-700', icon: Users },
  pharmacist: { label: 'Pharmacist', color: 'bg-emerald-100 text-emerald-700', icon: Shield },
  technician: { label: 'Lab Technician', color: 'bg-purple-100 text-purple-700', icon: Award },
  admin: { label: 'Admin Staff', color: 'bg-gray-100 text-gray-700', icon: Building2 },
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'on-leave': { label: 'On Leave', color: 'bg-amber-100 text-amber-700', icon: Clock },
  inactive: { label: 'Inactive', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function StaffManagement() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const hospitalKey = user?.hospitalId || 'hospital-kl'

  const [dbDoctors, setDbDoctors] = useState<StaffMember[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [supportStaff, setSupportStaff] = useSessionState<StaffMember[]>(
    `admin-staff:${hospitalKey}`,
    DEFAULT_SUPPORT_STAFF
  )
  const [doctorStatusOverrides, setDoctorStatusOverrides] = useSessionState<
    Record<string, 'active' | 'on-leave' | 'inactive'>
  >(`admin-doctor-status:${hospitalKey}`, {})

  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null)

  const [formName, setFormName] = useState('')
  const [formIc, setFormIc] = useState('')
  const [formRole, setFormRole] = useState<StaffMember['role']>('nurse')
  const [formDept, setFormDept] = useState('General Medicine')
  const [formSpec, setFormSpec] = useState('')
  const [formLicense, setFormLicense] = useState('')
  const [formPhone, setFormPhone] = useState('+60 12-000 0000')
  const [formEmail, setFormEmail] = useState('')
  const [formStatus, setFormStatus] = useState<StaffMember['status']>('active')

  const loadDoctors = useCallback(async () => {
    if (!user?.hospitalId) {
      setLoadingDoctors(false)
      return
    }
    setLoadingDoctors(true)
    try {
      const res = await hospitalApi.getDoctors(user.hospitalId)
      if (res.success && res.data) {
        setDbDoctors(
          res.data.map((doc) => ({
            id: doc.id,
            name: doc.fullName,
            icNumber: doc.icNumber,
            role: 'doctor',
            department: doc.department,
            specialization: doc.specialization,
            licenseNo: doc.licenseNumber,
            phone: doc.phone,
            email: doc.email,
            status: doc.isActive ? 'active' : 'inactive',
            joinDate: '2019-01-01',
            source: 'database',
          }))
        )
      }
    } finally {
      setLoadingDoctors(false)
    }
  }, [user?.hospitalId])

  useEffect(() => {
    void loadDoctors()
  }, [loadDoctors])

  const mergedStaff: StaffMember[] = [
    ...dbDoctors.map((doc) => ({
      ...doc,
      status: doctorStatusOverrides[doc.id] || doc.status,
    })),
    ...supportStaff,
  ]

  const filteredStaff = mergedStaff.filter((s) => {
    const q = searchTerm.trim().toLowerCase()
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.icNumber.includes(q) ||
      s.department.toLowerCase().includes(q) ||
      (s.licenseNo && s.licenseNo.toLowerCase().includes(q))
    const matchRole = filterRole === 'all' || s.role === filterRole
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const openAddModal = () => {
    setEditingMember(null)
    setFormName('')
    setFormIc('')
    setFormRole('nurse')
    setFormDept('General Medicine')
    setFormSpec('')
    setFormLicense('')
    setFormPhone('+60 12-000 0000')
    setFormEmail('')
    setFormStatus('active')
    setModalOpen(true)
  }

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member)
    setFormName(member.name)
    setFormIc(member.icNumber)
    setFormRole(member.role)
    setFormDept(member.department)
    setFormSpec(member.specialization || '')
    setFormLicense(member.licenseNo || '')
    setFormPhone(member.phone)
    setFormEmail(member.email)
    setFormStatus(member.status)
    setModalOpen(true)
  }

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formDept.trim()) return

    if (editingMember) {
      if (editingMember.source === 'database') {
        setDoctorStatusOverrides((prev) => ({
          ...prev,
          [editingMember.id]: formStatus,
        }))
        toast({
          title: 'Doctor Roster Status Updated',
          description: `${editingMember.name} duty status set to ${statusConfig[formStatus].label} for this session.`,
        })
      } else {
        setSupportStaff((prev) =>
          prev.map((s) =>
            s.id === editingMember.id
              ? {
                  ...s,
                  name: formName.trim(),
                  icNumber: formIc.trim() || s.icNumber,
                  role: formRole,
                  department: formDept.trim(),
                  specialization: formSpec.trim() || undefined,
                  licenseNo: formLicense.trim() || undefined,
                  phone: formPhone.trim(),
                  email: formEmail.trim(),
                  status: formStatus,
                }
              : s
          )
        )
        toast({ title: 'Staff Profile Updated', description: `${formName} updated.` })
      }
    } else {
      const created: StaffMember = {
        id: `SUP-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        icNumber: formIc.trim() || '900101-14-0000',
        role: formRole,
        department: formDept.trim(),
        specialization: formSpec.trim() || undefined,
        licenseNo: formLicense.trim() || undefined,
        phone: formPhone.trim(),
        email: formEmail.trim() || 'staff@hospital.gov.my',
        status: formStatus,
        joinDate: new Date().toISOString().slice(0, 10),
        source: 'session',
      }
      setSupportStaff((prev) => [created, ...prev])
      toast({ title: 'Staff Added', description: `${created.name} added to hospital roster.` })
    }
    setModalOpen(false)
  }

  const handleRemoveStaff = (member: StaffMember) => {
    if (member.source === 'database') {
      toast({
        title: 'Database-Backed Physician',
        description: 'Credentialed hospital doctors are managed in the hospital PostgreSQL database; use Edit to adjust duty status.',
      })
      return
    }
    setSupportStaff((prev) => prev.filter((s) => s.id !== member.id))
    toast({ title: 'Staff Removed', description: `${member.name} removed from session roster.` })
  }

  const handleExportCsv = () => {
    exportToCsv(
      `${theme.shortName.toLowerCase()}-staff-roster.csv`,
      ['Name', 'IC Number', 'Role', 'Department', 'License', 'Phone', 'Email', 'Status', 'Source'],
      filteredStaff.map((s) => [
        s.name,
        s.icNumber,
        roleConfig[s.role].label,
        s.department,
        s.licenseNo || '-',
        s.phone,
        s.email,
        statusConfig[s.status].label,
        s.source === 'database' ? 'Hospital DB' : 'Workstation Session',
      ])
    )
  }

  const stats = {
    total: mergedStaff.length,
    doctors: mergedStaff.filter((s) => s.role === 'doctor').length,
    nurses: mergedStaff.filter((s) => s.role === 'nurse').length,
    active: mergedStaff.filter((s) => s.status === 'active').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: theme.primaryColor }}>
              <Users className="h-6 w-6" />
            </div>
            Staff Management
          </h1>
          <p className="text-gray-500 mt-1">
            {theme.name} — Live PostgreSQL physicians combined with session-persisted nursing & allied health roster
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadDoctors()} disabled={loadingDoctors} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loadingDoctors ? 'animate-spin' : ''}`} />
            Sync Doctors
          </Button>
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openAddModal} className="gap-2" style={{ backgroundColor: theme.primaryColor }}>
            <UserPlus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
          { label: 'Doctors (DB + Roster)', value: stats.doctors, icon: Stethoscope, bgClass: 'bg-indigo-100', iconClass: 'text-indigo-600' },
          { label: 'Nurses', value: stats.nurses, icon: Shield, bgClass: 'bg-pink-100', iconClass: 'text-pink-600' },
          { label: 'Active On Duty', value: stats.active, icon: CheckCircle2, bgClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgClass}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, IC, license, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'doctor', 'nurse', 'pharmacist', 'technician', 'admin'].map((role) => (
                <Button
                  key={role}
                  variant={filterRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRole(role)}
                  className="capitalize"
                >
                  {role === 'all' ? 'All Roles' : role}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'on-leave', 'inactive'].map((st) => (
                <Button
                  key={st}
                  variant={filterStatus === st ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus(st)}
                  className="capitalize text-xs"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory ({filteredStaff.length})</CardTitle>
          <CardDescription>Doctors marked &ldquo;Hospital DB&rdquo; are loaded directly from this facility&apos;s PostgreSQL node</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStaff.map((member, index) => {
              const roleInfo = roleConfig[member.role]
              const statusInfo = statusConfig[member.status]
              const RoleIcon = roleInfo.icon
              const StatusIcon = statusInfo.icon

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.25) }}
                  className="p-4 rounded-xl border bg-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <RoleIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.source === 'database' ? 'Hospital DB' : 'Session Roster'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {member.department} {member.specialization && `• ${member.specialization}`}
                        {member.licenseNo && ` • License: ${member.licenseNo}`}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(member)} className="gap-1">
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {member.source === 'session' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveStaff(member)}
                        className="text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingMember ? `Edit Staff — ${editingMember.name}` : 'Add Hospital Staff'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3">
              {editingMember?.source === 'database' ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  Core credentials for {editingMember.name} ({editingMember.licenseNo}) are stored in PostgreSQL. You can update their active duty status below.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="e.g. Nurse Farah" />
                    </div>
                    <div>
                      <Label>MyKad IC</Label>
                      <Input value={formIc} onChange={(e) => setFormIc(e.target.value)} placeholder="880101-14-1234" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Role</Label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as StaffMember['role'])}
                        className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                      >
                        <option value="nurse">Nurse</option>
                        <option value="pharmacist">Pharmacist</option>
                        <option value="technician">Lab Technician</option>
                        <option value="admin">Admin Staff</option>
                        <option value="doctor">Visiting Doctor</option>
                      </select>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Input value={formDept} onChange={(e) => setFormDept(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Specialization (Optional)</Label>
                      <Input value={formSpec} onChange={(e) => setFormSpec(e.target.value)} />
                    </div>
                    <div>
                      <Label>License No. (Optional)</Label>
                      <Input value={formLicense} onChange={(e) => setFormLicense(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Phone</Label>
                      <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Duty Status</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as StaffMember['status'])}
                  className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                >
                  <option value="active">Active On Duty</option>
                  <option value="on-leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: theme.primaryColor }}>
                  {editingMember ? 'Save Changes' : 'Add to Roster'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
