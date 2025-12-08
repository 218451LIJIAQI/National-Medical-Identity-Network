import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, Users, Stethoscope, Activity, Plus,
  Phone, Clock, MapPin, Edit, Settings
} from 'lucide-react'
import { motion } from 'framer-motion'

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

const mockDepartments: Department[] = [
  { 
    id: '1', 
    name: 'Emergency Department', 
    nameMY: 'Jabatan Kecemasan', 
    head: 'Dr. Ahmad Razak', 
    headTitle: 'Head of Emergency',
    staffCount: 45, 
    doctorCount: 12, 
    nurseCount: 28,
    location: 'Ground Floor, Block A',
    extension: '1001',
    operatingHours: '24/7',
    status: 'active',
    specialties: ['Trauma', 'Critical Care', 'Resuscitation']
  },
  { 
    id: '2', 
    name: 'Internal Medicine', 
    nameMY: 'Perubatan Dalaman', 
    head: 'Dr. Fatimah Zahra', 
    headTitle: 'Senior Consultant',
    staffCount: 38, 
    doctorCount: 10, 
    nurseCount: 22,
    location: '2nd Floor, Block B',
    extension: '2001',
    operatingHours: '8:00 AM - 5:00 PM',
    status: 'active',
    specialties: ['Cardiology', 'Gastroenterology', 'Nephrology']
  },
  { 
    id: '3', 
    name: 'Surgery Department', 
    nameMY: 'Jabatan Pembedahan', 
    head: 'Dr. Lee Wei Kang', 
    headTitle: 'Chief Surgeon',
    staffCount: 52, 
    doctorCount: 15, 
    nurseCount: 30,
    location: '3rd Floor, Block A',
    extension: '3001',
    operatingHours: '7:00 AM - 10:00 PM',
    status: 'active',
    specialties: ['General Surgery', 'Orthopedic', 'Neurosurgery']
  },
  { 
    id: '4', 
    name: 'Obstetrics & Gynecology', 
    nameMY: 'Obstetrik & Ginekologi', 
    head: 'Dr. Siti Aminah', 
    headTitle: 'Head of O&G',
    staffCount: 35, 
    doctorCount: 8, 
    nurseCount: 24,
    location: '4th Floor, Block C',
    extension: '4001',
    operatingHours: '24/7 (Labour Ward)',
    status: 'active',
    specialties: ['Maternal Care', 'High-Risk Pregnancy', 'Gynecology']
  },
  { 
    id: '5', 
    name: 'Pediatric Department', 
    nameMY: 'Jabatan Pediatrik', 
    head: 'Dr. Nurul Huda', 
    headTitle: 'Pediatric Specialist',
    staffCount: 30, 
    doctorCount: 7, 
    nurseCount: 20,
    location: '2nd Floor, Block C',
    extension: '2501',
    operatingHours: '8:00 AM - 9:00 PM',
    status: 'active',
    specialties: ['Neonatal', 'Child Health', 'Immunization']
  },
  { 
    id: '6', 
    name: 'Radiology Department', 
    nameMY: 'Jabatan Radiologi', 
    head: 'Dr. Rajan Kumar', 
    headTitle: 'Chief Radiologist',
    staffCount: 20, 
    doctorCount: 5, 
    nurseCount: 8,
    location: 'Ground Floor, Block B',
    extension: '1501',
    operatingHours: '8:00 AM - 6:00 PM',
    status: 'active',
    specialties: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound']
  },
  { 
    id: '7', 
    name: 'Pathology Laboratory', 
    nameMY: 'Makmal Patologi', 
    head: 'Dr. Chen Wei Lin', 
    headTitle: 'Chief Pathologist',
    staffCount: 25, 
    doctorCount: 4, 
    nurseCount: 0,
    location: '1st Floor, Block B',
    extension: '1201',
    operatingHours: '24/7 (Emergency Lab)',
    status: 'active',
    specialties: ['Hematology', 'Biochemistry', 'Microbiology']
  },
  { 
    id: '8', 
    name: 'Pharmacy', 
    nameMY: 'Farmasi', 
    head: 'Pn. Halimah Yusof', 
    headTitle: 'Chief Pharmacist',
    staffCount: 18, 
    doctorCount: 0, 
    nurseCount: 0,
    location: 'Ground Floor, Main Building',
    extension: '1101',
    operatingHours: '8:00 AM - 9:00 PM',
    status: 'active',
    specialties: ['Dispensary', 'Drug Information', 'Clinical Pharmacy']
  },
]

const statusConfig = {
  active: { label: 'Active', labelMY: 'Aktif', color: 'bg-green-100 text-green-700' },
  limited: { label: 'Limited', labelMY: 'Terhad', color: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Closed', labelMY: 'Ditutup', color: 'bg-red-100 text-red-700' },
}

export default function DepartmentManagement() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  const totalStats = {
    departments: mockDepartments.length,
    totalStaff: mockDepartments.reduce((a, d) => a + d.staffCount, 0),
    totalDoctors: mockDepartments.reduce((a, d) => a + d.doctorCount, 0),
    totalNurses: mockDepartments.reduce((a, d) => a + d.nurseCount, 0),
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-500">Pengurusan Jabatan Hospital</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Add Department / Tambah Jabatan
        </Button>
      </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{totalStats.departments}</p>
                <p className="text-xs text-blue-600">Jabatan / Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{totalStats.totalStaff}</p>
                <p className="text-xs text-green-600">Jumlah Kakitangan</p>
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
                <p className="text-2xl font-bold text-indigo-700">{totalStats.totalDoctors}</p>
                <p className="text-xs text-indigo-600">Doktor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-700">{totalStats.totalNurses}</p>
                <p className="text-xs text-pink-600">Jururawat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockDepartments.map((dept, index) => {
          const statusInfo = statusConfig[dept.status]
          const isSelected = selectedDept === dept.id
          
          return (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => setSelectedDept(isSelected ? null : dept.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <p className="text-sm text-gray-500">{dept.nameMY}</p>
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.labelMY}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{dept.head}</p>
                        <p className="text-xs text-gray-500">{dept.headTitle}</p>
                      </div>
                    </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{dept.staffCount}</p>
                        <p className="text-xs text-gray-500">Total Staff</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{dept.doctorCount}</p>
                        <p className="text-xs text-gray-500">Doctors</p>
                      </div>
                      <div className="p-2 bg-pink-50 rounded-lg">
                        <p className="text-lg font-bold text-pink-600">{dept.nurseCount}</p>
                        <p className="text-xs text-gray-500">Nurses</p>
                      </div>
                    </div>

                                        <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {dept.location}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        Ext: {dept.extension}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {dept.operatingHours}
                      </div>
                    </div>

                                        <div className="flex flex-wrap gap-1">
                      {dept.specialties.map(specialty => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>

                                        <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1 gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1">
                        <Settings className="w-3 h-3" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
