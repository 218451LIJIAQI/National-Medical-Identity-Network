import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const statusConfig = {
  active: { labelMY: 'Aktif', color: 'bg-green-100 text-green-700' },
  limited: { labelMY: 'Terhad', color: 'bg-yellow-100 text-yellow-700' },
  closed: { labelMY: 'Ditutup', color: 'bg-red-100 text-red-700' },
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
    toast({ title: 'Department Status Updated', description: `${dept.name} set to ${next.toUpperCase()}.` })
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
      toast({ title: 'Department Updated', description: `${formState.name} configuration saved.` })
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
      toast({ title: 'Department Added', description: `${created.name} added to hospital directory.` })
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
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-500 text-sm">Clinical specialty units, operating hours & unit heads</p>
        </div>
        <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 flex items-center gap-3"><Building2 className="w-6 h-6 text-blue-600" /><div><p className="text-2xl font-bold text-blue-700">{totalStats.departments}</p><p className="text-xs text-blue-600">Departments</p></div></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center gap-3"><Users className="w-6 h-6 text-green-600" /><div><p className="text-2xl font-bold text-green-700">{totalStats.totalStaff}</p><p className="text-xs text-green-600">Total Personnel</p></div></CardContent></Card>
        <Card className="bg-indigo-50 border-indigo-200"><CardContent className="p-4 flex items-center gap-3"><Stethoscope className="w-6 h-6 text-indigo-600" /><div><p className="text-2xl font-bold text-indigo-700">{totalStats.totalDoctors}</p><p className="text-xs text-indigo-600">Specialists / MO</p></div></CardContent></Card>
        <Card className="bg-pink-50 border-pink-200"><CardContent className="p-4 flex items-center gap-3"><Activity className="w-6 h-6 text-pink-600" /><div><p className="text-2xl font-bold text-pink-700">{totalStats.totalNurses}</p><p className="text-xs text-pink-600">Nursing Staff</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => {
          const statusInfo = statusConfig[dept.status]
          return (
            <Card key={dept.id} className="hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <p className="text-xs text-gray-500">{dept.nameMY}</p>
                  </div>
                  <Badge className={statusInfo.color}>{statusInfo.labelMY}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{dept.head}</p>
                    <p className="text-xs text-gray-500">{dept.headTitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-blue-50 rounded-lg"><p className="text-base font-bold text-blue-700">{dept.staffCount}</p><p className="text-[11px] text-gray-500">Staff</p></div>
                  <div className="p-2 bg-green-50 rounded-lg"><p className="text-base font-bold text-green-700">{dept.doctorCount}</p><p className="text-[11px] text-gray-500">Doctors</p></div>
                  <div className="p-2 bg-pink-50 rounded-lg"><p className="text-base font-bold text-pink-700">{dept.nurseCount}</p><p className="text-[11px] text-gray-500">Nurses</p></div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {dept.location}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> Ext: {dept.extension}</div>
                  <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-gray-400" /> {dept.operatingHours}</div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {dept.specialties.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(dept)} className="flex-1 gap-1">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => cycleStatus(dept)} className="flex-1 gap-1">
                    <Settings className="w-3.5 h-3.5" /> Toggle Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
              onSubmit={handleSave}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingDept ? 'Edit Department' : 'Add Department'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3">
                <Input
                  required
                  placeholder="Department Name *"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
                <Input
                  placeholder="Malay Name (Jabatan ...)"
                  value={formState.nameMY}
                  onChange={(e) => setFormState({ ...formState, nameMY: e.target.value })}
                />
                <Input
                  placeholder="Head of Department"
                  value={formState.head}
                  onChange={(e) => setFormState({ ...formState, head: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Doctors"
                    value={formState.doctorCount}
                    onChange={(e) => setFormState({ ...formState, doctorCount: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Nurses"
                    value={formState.nurseCount}
                    onChange={(e) => setFormState({ ...formState, nurseCount: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Location"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  />
                  <Input
                    placeholder="Operating Hours"
                    value={formState.operatingHours}
                    onChange={(e) => setFormState({ ...formState, operatingHours: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Specialties (comma-separated)"
                  value={formState.specialties}
                  onChange={(e) => setFormState({ ...formState, specialties: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Save Department
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
