import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useSessionState, exportToCsv } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import {
  Building2,
  Users,
  Stethoscope,
  Bed,
  Clock,
  Plus,
  Edit,
  CheckCircle2,
  Activity,
  Phone,
  MapPin,
  Download,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Department {
  id: string
  name: string
  code: string
  headDoctor: string
  floor: string
  phone: string
  doctors: number
  nurses: number
  beds: number
  patientsToday: number
  avgWaitTime: number
  status: 'active' | 'limited' | 'closed'
  operatingHours: string
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'D001', name: 'Emergency Department', code: 'ED', headDoctor: 'Dr. Mohd Faizal', floor: 'Ground Floor', phone: 'Ext. 100', doctors: 12, nurses: 28, beds: 25, patientsToday: 89, avgWaitTime: 15, status: 'active', operatingHours: '24 Hours' },
  { id: 'D002', name: 'Cardiology', code: 'CARD', headDoctor: 'Dr. Sarah Lim', floor: 'Level 2', phone: 'Ext. 201', doctors: 8, nurses: 16, beds: 30, patientsToday: 45, avgWaitTime: 25, status: 'active', operatingHours: '8:00 AM - 5:00 PM' },
  { id: 'D003', name: 'Internal Medicine', code: 'MED', headDoctor: 'Dr. Ahmad Razak', floor: 'Level 1', phone: 'Ext. 102', doctors: 15, nurses: 32, beds: 40, patientsToday: 78, avgWaitTime: 20, status: 'active', operatingHours: '8:00 AM - 6:00 PM' },
  { id: 'D004', name: 'General Surgery', code: 'SURG', headDoctor: 'Dr. Tan Wei Ming', floor: 'Level 2', phone: 'Ext. 205', doctors: 10, nurses: 24, beds: 35, patientsToday: 32, avgWaitTime: 30, status: 'active', operatingHours: '24 Hours' },
  { id: 'D005', name: 'Pediatrics', code: 'PED', headDoctor: 'Dr. Nurul Aisyah', floor: 'Level 3', phone: 'Ext. 301', doctors: 7, nurses: 18, beds: 25, patientsToday: 56, avgWaitTime: 18, status: 'active', operatingHours: '8:00 AM - 8:00 PM' },
  { id: 'D006', name: 'Obstetrics & Gynecology', code: 'OG', headDoctor: 'Dr. Siti Rahmah', floor: 'Level 3', phone: 'Ext. 305', doctors: 8, nurses: 22, beds: 30, patientsToday: 41, avgWaitTime: 22, status: 'active', operatingHours: '24 Hours' },
  { id: 'D007', name: 'Orthopedics', code: 'ORTHO', headDoctor: 'Dr. Raj Kumar', floor: 'Level 2', phone: 'Ext. 210', doctors: 6, nurses: 14, beds: 20, patientsToday: 38, avgWaitTime: 28, status: 'active', operatingHours: '8:00 AM - 5:00 PM' },
  { id: 'D008', name: 'Intensive Care Unit', code: 'ICU', headDoctor: 'Dr. Lee Mei Ling', floor: 'Level 4', phone: 'Ext. 401', doctors: 8, nurses: 30, beds: 20, patientsToday: 18, avgWaitTime: 0, status: 'limited', operatingHours: '24 Hours' },
]

export default function DepartmentManagement() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const hospitalKey = user?.hospitalId || 'hospital-kl'

  const [departments, setDepartments] = useSessionState<Department[]>(
    `admin-departments:${hospitalKey}`,
    DEFAULT_DEPARTMENTS
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formHead, setFormHead] = useState('')
  const [formFloor, setFormFloor] = useState('Level 1')
  const [formPhone, setFormPhone] = useState('Ext. 100')
  const [formDoctors, setFormDoctors] = useState('6')
  const [formNurses, setFormNurses] = useState('14')
  const [formBeds, setFormBeds] = useState('20')
  const [formHours, setFormHours] = useState('8:00 AM - 5:00 PM')
  const [formStatus, setFormStatus] = useState<Department['status']>('active')

  const filteredDepts = departments.filter((d) => {
    const q = searchTerm.trim().toLowerCase()
    return (
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.headDoctor.toLowerCase().includes(q)
    )
  })

  const openAddModal = () => {
    setEditingDept(null)
    setFormName('')
    setFormCode('')
    setFormHead('Dr. ')
    setFormFloor('Level 2')
    setFormPhone('Ext. 220')
    setFormDoctors('6')
    setFormNurses('14')
    setFormBeds('20')
    setFormHours('8:00 AM - 5:00 PM')
    setFormStatus('active')
    setModalOpen(true)
  }

  const openEditModal = (dept: Department) => {
    setEditingDept(dept)
    setFormName(dept.name)
    setFormCode(dept.code)
    setFormHead(dept.headDoctor)
    setFormFloor(dept.floor)
    setFormPhone(dept.phone)
    setFormDoctors(String(dept.doctors))
    setFormNurses(String(dept.nurses))
    setFormBeds(String(dept.beds))
    setFormHours(dept.operatingHours)
    setFormStatus(dept.status)
    setModalOpen(true)
  }

  const cycleDepartmentStatus = (dept: Department) => {
    const order: Department['status'][] = ['active', 'limited', 'closed']
    const next = order[(order.indexOf(dept.status) + 1) % order.length]
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? { ...d, status: next } : d)))
    toast({
      title: `${dept.name} Status Updated`,
      description: `Operating status changed to ${next.toUpperCase()}.`,
    })
  }

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) return
    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      headDoctor: formHead.trim() || 'Department Head',
      floor: formFloor.trim(),
      phone: formPhone.trim(),
      doctors: Math.max(0, Number.parseInt(formDoctors, 10) || 0),
      nurses: Math.max(0, Number.parseInt(formNurses, 10) || 0),
      beds: Math.max(0, Number.parseInt(formBeds, 10) || 0),
      operatingHours: formHours.trim(),
      status: formStatus,
    }

    if (editingDept) {
      setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? { ...d, ...payload } : d)))
      toast({ title: 'Department Updated', description: `${payload.name} saved.` })
    } else {
      const created: Department = {
        id: `D-${Date.now().toString().slice(-4)}`,
        ...payload,
        patientsToday: 0,
        avgWaitTime: 15,
      }
      setDepartments((prev) => [...prev, created])
      toast({ title: 'Department Created', description: `${created.name} (${created.code}) added.` })
    }
    setModalOpen(false)
  }

  const handleExportCsv = () => {
    exportToCsv(
      `${theme.shortName.toLowerCase()}-departments.csv`,
      ['Code', 'Department', 'Head Doctor', 'Floor', 'Phone', 'Doctors', 'Nurses', 'Beds', 'Status', 'Hours'],
      filteredDepts.map((d) => [
        d.code,
        d.name,
        d.headDoctor,
        d.floor,
        d.phone,
        d.doctors,
        d.nurses,
        d.beds,
        d.status,
        d.operatingHours,
      ])
    )
  }

  const totalStats = departments.reduce(
    (acc, d) => ({
      doctors: acc.doctors + d.doctors,
      nurses: acc.nurses + d.nurses,
      beds: acc.beds + d.beds,
      patients: acc.patients + d.patientsToday,
    }),
    { doctors: 0, nurses: 0, beds: 0, patients: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: theme.primaryColor }}>
              <Building2 className="h-6 w-6" />
            </div>
            Department Management
          </h1>
          <p className="text-gray-500 mt-1">
            {theme.name} — {departments.length} clinical units (session-persisted configuration)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openAddModal} className="gap-2" style={{ backgroundColor: theme.primaryColor }}>
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Departments', value: departments.length, icon: Building2, bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
          { label: 'Total Doctors', value: totalStats.doctors, icon: Stethoscope, bgClass: 'bg-indigo-100', iconClass: 'text-indigo-600' },
          { label: 'Total Nurses', value: totalStats.nurses, icon: Users, bgClass: 'bg-pink-100', iconClass: 'text-pink-600' },
          { label: "Today's Patients", value: totalStats.patients, icon: Activity, bgClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
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
          <Input
            placeholder="Search departments by name, code, or head doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredDepts.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className="hover:shadow-lg transition-all h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {dept.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-sm text-gray-500">{dept.headDoctor}</p>
                    </div>
                  </div>
                  <Badge
                    onClick={() => cycleDepartmentStatus(dept)}
                    className={`cursor-pointer select-none ${
                      dept.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : dept.status === 'limited'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                    title="Click to toggle department operating status"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {dept.status === 'active' ? 'Open' : dept.status === 'limited' ? 'Limited' : 'Closed'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {dept.floor}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {dept.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {dept.operatingHours}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{dept.doctors}</p>
                    <p className="text-xs text-gray-500">Doctors</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{dept.nurses}</p>
                    <p className="text-xs text-gray-500">Nurses</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{dept.beds}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-0.5">
                      <Bed className="h-3 w-3" /> Beds
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: theme.primaryColor }}>
                      {dept.patientsToday}
                    </p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Avg. Wait: <strong>{dept.avgWaitTime > 0 ? `${dept.avgWaitTime} min` : 'Direct ICU'}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(dept)} className="gap-1">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => cycleDepartmentStatus(dept)} className="text-xs">
                      Toggle Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingDept ? `Edit ${editingDept.name}` : 'Add Clinical Department'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Department Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="e.g. Neurology" />
                </div>
                <div>
                  <Label>Short Code</Label>
                  <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} required maxLength={6} placeholder="NEURO" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Head of Department</Label>
                  <Input value={formHead} onChange={(e) => setFormHead(e.target.value)} required />
                </div>
                <div>
                  <Label>Operating Hours</Label>
                  <Input value={formHours} onChange={(e) => setFormHours(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Floor / Location</Label>
                  <Input value={formFloor} onChange={(e) => setFormFloor(e.target.value)} required />
                </div>
                <div>
                  <Label>Extension / Phone</Label>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Doctors</Label>
                  <Input type="number" min={0} value={formDoctors} onChange={(e) => setFormDoctors(e.target.value)} />
                </div>
                <div>
                  <Label>Nurses</Label>
                  <Input type="number" min={0} value={formNurses} onChange={(e) => setFormNurses(e.target.value)} />
                </div>
                <div>
                  <Label>Beds</Label>
                  <Input type="number" min={0} value={formBeds} onChange={(e) => setFormBeds(e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Department['status'])}
                    className="w-full h-10 px-2 border rounded-md text-sm bg-white"
                  >
                    <option value="active">Open</option>
                    <option value="limited">Limited</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: theme.primaryColor }}>
                  {editingDept ? 'Save Department' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
