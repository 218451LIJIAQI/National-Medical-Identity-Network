import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import {
  Building2,
  Users,
  Stethoscope,
  Activity,
  Plus,
  Phone,
  Clock,
  MapPin,
  Edit,
  Settings,
  CheckCircle2,
  AlertCircle,
  Ban,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Department {
  id: string
  name: string
  nameMY: string
  head: string
  headTitle: string
  staffCount: number
  doctorCount: number
  nurseCount: number
  location: string
  extension: string
  operatingHours: string
  status: 'active' | 'limited' | 'closed'
  specialties: string[]
}

const initialDepartments: Department[] = [
  { id: '1', name: 'Emergency Department', nameMY: 'Jabatan Kecemasan', head: 'Dr. Ahmad Razak', headTitle: 'Head of Emergency', staffCount: 45, doctorCount: 12, nurseCount: 28, location: 'Ground Floor, Block A', extension: '1001', operatingHours: '24/7', status: 'active', specialties: ['Trauma', 'Critical Care', 'Resuscitation'] },
  { id: '2', name: 'Internal Medicine', nameMY: 'Perubatan Dalaman', head: 'Dr. Fatimah Zahra', headTitle: 'Senior Consultant', staffCount: 38, doctorCount: 10, nurseCount: 22, location: '2nd Floor, Block B', extension: '2001', operatingHours: '8:00 AM - 5:00 PM', status: 'active', specialties: ['Cardiology', 'Gastroenterology', 'Nephrology'] },
  { id: '3', name: 'Surgery Department', nameMY: 'Jabatan Pembedahan', head: 'Dr. Lee Wei Kang', headTitle: 'Chief Surgeon', staffCount: 52, doctorCount: 15, nurseCount: 30, location: '3rd Floor, Block A', extension: '3001', operatingHours: '7:00 AM - 10:00 PM', status: 'active', specialties: ['General Surgery', 'Orthopedic', 'Neurosurgery'] },
  { id: '4', name: 'Obstetrics & Gynecology', nameMY: 'Obstetrik & Ginekologi', head: 'Dr. Siti Aminah', headTitle: 'Head of O&G', staffCount: 35, doctorCount: 8, nurseCount: 24, location: '4th Floor, Block C', extension: '4001', operatingHours: '24/7 (Labour Ward)', status: 'active', specialties: ['Maternal Care', 'High-Risk Pregnancy', 'Gynecology'] },
  { id: '5', name: 'Pediatric Department', nameMY: 'Jabatan Pediatrik', head: 'Dr. Nurul Huda', headTitle: 'Pediatric Specialist', staffCount: 30, doctorCount: 7, nurseCount: 20, location: '2nd Floor, Block C', extension: '2501', operatingHours: '8:00 AM - 9:00 PM', status: 'active', specialties: ['Neonatal', 'Child Health', 'Immunization'] },
  { id: '6', name: 'Radiology Department', nameMY: 'Jabatan Radiologi', head: 'Dr. Rajan Kumar', headTitle: 'Chief Radiologist', staffCount: 20, doctorCount: 5, nurseCount: 8, location: 'Ground Floor, Block B', extension: '1501', operatingHours: '8:00 AM - 6:00 PM', status: 'active', specialties: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound'] },
]

const statusConfig: Record<
  Department['status'],
  { label: string; tone: StatusTone; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  limited: { label: 'Limited Capacity', tone: 'warning', icon: AlertCircle },
  closed: { label: 'Closed', tone: 'blocked', icon: Ban },
}

export default function DepartmentManagement() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    nameMY: '',
    head: '',
    headTitle: 'Department Head',
    doctorCount: '5',
    nurseCount: '12',
    location: 'Block A',
    extension: '1000',
    operatingHours: '8:00 AM - 5:00 PM',
    status: 'active' as Department['status'],
    specialties: '',
  })

  const openAdd = () => {
    setEditingDept(null)
    setFormState({
      name: '',
      nameMY: '',
      head: '',
      headTitle: 'Head of Department',
      doctorCount: '5',
      nurseCount: '12',
      location: 'Block A',
      extension: '1100',
      operatingHours: '8:00 AM - 5:00 PM',
      status: 'active',
      specialties: '',
    })
    setShowModal(true)
  }

  const openEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormState({
      name: dept.name,
      nameMY: dept.nameMY,
      head: dept.head,
      headTitle: dept.headTitle,
      doctorCount: String(dept.doctorCount),
      nurseCount: String(dept.nurseCount),
      location: dept.location,
      extension: dept.extension,
      operatingHours: dept.operatingHours,
      status: dept.status,
      specialties: dept.specialties.join(', '),
    })
    setShowModal(true)
  }

  const cycleStatus = (dept: Department) => {
    const order: Department['status'][] = ['active', 'limited', 'closed']
    const next = order[(order.indexOf(dept.status) + 1) % order.length]
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? { ...d, status: next } : d)))
    toast({
      title: 'Department Status Updated',
      description: `${dept.name} set to ${statusConfig[next].label}.`,
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name.trim()) return
    const docs = Math.max(0, Number(formState.doctorCount) || 0)
    const nurses = Math.max(0, Number(formState.nurseCount) || 0)
    const specs = formState.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (editingDept) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDept.id
            ? {
                ...d,
                name: formState.name.trim(),
                nameMY: formState.nameMY.trim() || formState.name.trim(),
                head: formState.head.trim(),
                headTitle: formState.headTitle.trim(),
                doctorCount: docs,
                nurseCount: nurses,
                staffCount: docs + nurses + 4,
                location: formState.location.trim(),
                extension: formState.extension.trim(),
                operatingHours: formState.operatingHours.trim(),
                status: formState.status,
                specialties: specs,
              }
            : d
        )
      )
      toast({
        title: 'Department Updated',
        description: `${formState.name} configuration saved.`,
        variant: 'success',
      })
    } else {
      const created: Department = {
        id: `dept-${Date.now()}`,
        name: formState.name.trim(),
        nameMY: formState.nameMY.trim() || formState.name.trim(),
        head: formState.head.trim() || 'Dr. On-Call Specialist',
        headTitle: formState.headTitle.trim(),
        doctorCount: docs,
        nurseCount: nurses,
        staffCount: docs + nurses + 4,
        location: formState.location.trim(),
        extension: formState.extension.trim(),
        operatingHours: formState.operatingHours.trim(),
        status: formState.status,
        specialties: specs.length ? specs : ['General Care'],
      }
      setDepartments((prev) => [created, ...prev])
      toast({
        title: 'Department Added',
        description: `${created.name} added to hospital directory.`,
        variant: 'success',
      })
    }
    setShowModal(false)
  }

  const totalStats = {
    departments: departments.length,
    totalStaff: departments.reduce((a, d) => a + d.staffCount, 0),
    totalDoctors: departments.reduce((a, d) => a + d.doctorCount, 0),
    totalNurses: departments.reduce((a, d) => a + d.nurseCount, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Management</h1>
          <p className="text-slate-600 text-sm">
            Clinical specialty units, operating hours & unit heads
          </p>
        </div>
        <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 tabular-nums">
        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-700" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{totalStats.departments}</p>
              <p className="text-xs font-medium text-blue-700">Departments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/80 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="text-2xl font-bold text-emerald-900">{totalStats.totalStaff}</p>
              <p className="text-xs font-medium text-emerald-700">Total Personnel</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50/80 border-indigo-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-indigo-700" />
            <div>
              <p className="text-2xl font-bold text-indigo-900">{totalStats.totalDoctors}</p>
              <p className="text-xs font-medium text-indigo-700">Specialists / MO</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-pink-50/80 border-pink-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-6 h-6 text-pink-700" />
            <div>
              <p className="text-2xl font-bold text-pink-900">{totalStats.totalNurses}</p>
              <p className="text-xs font-medium text-pink-700">Nursing Staff</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {departments.map((dept) => {
          const statusInfo = statusConfig[dept.status]
          return (
            <Card key={dept.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-slate-900">{dept.name}</CardTitle>
                    <p className="text-xs text-slate-500">{dept.nameMY}</p>
                  </div>
                  <StatusBadge
                    tone={statusInfo.tone}
                    icon={statusInfo.icon}
                    label={statusInfo.label}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{dept.head}</p>
                    <p className="text-xs text-slate-500">{dept.headTitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-base font-bold text-blue-800">{dept.staffCount}</p>
                    <p className="text-[11px] text-slate-600">Staff</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <p className="text-base font-bold text-emerald-800">{dept.doctorCount}</p>
                    <p className="text-[11px] text-slate-600">Doctors</p>
                  </div>
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <p className="text-base font-bold text-pink-800">{dept.nurseCount}</p>
                    <p className="text-[11px] text-slate-600">Nurses</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 tabular-nums">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {dept.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Ext: {dept.extension}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {dept.operatingHours}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {dept.specialties.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(dept)}
                    className="flex-1 gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => cycleStatus(dept)}
                    className="flex-1 gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" /> Toggle Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ModalDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingDept ? 'Edit Department' : 'Add Department'}
        description="Configure clinical specialty unit staffing, location, and operating schedule."
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name *
              </label>
              <Input
                required
                placeholder="Department Name"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Malay Name (Jabatan ...)
              </label>
              <Input
                placeholder="Jabatan ..."
                value={formState.nameMY}
                onChange={(e) => setFormState({ ...formState, nameMY: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Head of Department
              </label>
              <Input
                placeholder="Dr. ..."
                value={formState.head}
                onChange={(e) => setFormState({ ...formState, head: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 tabular-nums">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctors</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.doctorCount}
                  onChange={(e) => setFormState({ ...formState, doctorCount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nurses</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.nurseCount}
                  onChange={(e) => setFormState({ ...formState, nurseCount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <Input
                  placeholder="Location"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Hours
                </label>
                <Input
                  placeholder="8:00 AM - 5:00 PM"
                  value={formState.operatingHours}
                  onChange={(e) => setFormState({ ...formState, operatingHours: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialties (comma-separated)
              </label>
              <Input
                placeholder="e.g. Cardiology, Nephrology"
                value={formState.specialties}
                onChange={(e) => setFormState({ ...formState, specialties: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Department
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
