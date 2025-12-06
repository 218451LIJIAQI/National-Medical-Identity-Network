import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, Plus, Building2, Calendar, User, AlertTriangle, FileText, Pill, Loader2, Shield } from 'lucide-react'
import { formatDate, formatIC, getHospitalColor, getHospitalBadgeClass } from '@/lib/utils'
import { motion } from 'framer-motion'

interface PatientInfo {
  fullName: string
  icNumber: string
  dateOfBirth: string
  gender: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
}

interface MedicalRecord {
  id: string
  hospitalId: string
  hospitalName: string
  visitDate: string
  visitType: string
  diagnosis: string[]
  doctorId: string
  isReadOnly: boolean
}

interface Medication {
  name: string
  frequency: string
  hospital: string
}

export default function PatientTimeline() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<PatientInfo>({
    fullName: '',
    icNumber: icNumber || '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: [],
    chronicConditions: [],
  })
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    async function loadPatientData() {
      if (!icNumber) return
      try {
        // Fetch patient info and records in parallel
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(icNumber),
          centralApi.getPatient(icNumber),
        ])
        
        if (queryRes.success && queryRes.data) {
          // Extract records from all hospitals
          const allRecords: MedicalRecord[] = []
          const allMeds: Medication[] = []
          
          queryRes.data.hospitals.forEach((hospital: any) => {
            hospital.records?.forEach((record: any) => {
              allRecords.push({
                id: record.id,
                hospitalId: record.hospitalId || hospital.hospitalId,
                hospitalName: hospital.hospitalName,
                visitDate: record.visitDate,
                visitType: record.visitType,
                diagnosis: record.diagnosis || [],
                doctorId: record.doctorId,
                isReadOnly: record.isReadOnly !== false,
              })
              // Extract medications from prescriptions
              record.prescriptions?.forEach((rx: any) => {
                if (rx.isActive) {
                  allMeds.push({
                    name: `${rx.medicationName} ${rx.dosage}`,
                    frequency: rx.frequency,
                    hospital: hospital.hospitalName,
                  })
                }
              })
            })
          })
          
          allRecords.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(allRecords)
          setMedications(allMeds)
        }
        
        // Set patient info from patient API
        if (patientRes.success && patientRes.data) {
          const p = patientRes.data.patient as any
          if (p) {
            setPatient({
              fullName: p.fullName || 'Unknown Patient',
              icNumber: icNumber,
              dateOfBirth: p.dateOfBirth || '',
              gender: p.gender || '',
              bloodType: p.bloodType || '',
              allergies: p.allergies || [],
              chronicConditions: p.chronicConditions || [],
            })
          }
        }
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatientData()
  }, [icNumber, user?.hospitalId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-8 text-white shadow-2xl shadow-blue-500/25"
      >
        <motion.div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-300/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/doctor/search">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30 rounded-xl">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <motion.div 
              className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <User className="w-7 h-7" />
            </motion.div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                <Shield className="w-3 h-3 mr-1" /> Patient Timeline
              </Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">{patient.fullName}</h1>
              <p className="text-blue-100 font-mono">{formatIC(patient.icNumber)}</p>
            </div>
          </div>
          <Link to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/new-record`}>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 gap-2 shadow-xl shadow-black/10 h-12 px-6 rounded-xl font-semibold">
                <Plus className="h-5 w-5" />
                New Record
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Patient Info Card - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{patient.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">{patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Blood Type</p>
              <p className="font-medium">{patient.bloodType}</p>
            </div>
          </div>

          {/* Allergies Warning */}
          {patient.allergies.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Allergies:</span>
                {patient.allergies.map((allergy, i) => (
                  <Badge key={i} variant="destructive" className="ml-1">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chronic Conditions */}
          {patient.chronicConditions.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Chronic Conditions:</span>
              {patient.chronicConditions.map((condition, i) => (
                <Badge key={i} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical Records Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className={`p-4 border rounded-lg ${record.isReadOnly ? 'border-l-4 border-l-gray-400' : 'border-l-4 border-l-green-500'}`}
                style={{ borderLeftColor: record.isReadOnly ? undefined : getHospitalColor(record.hospitalId) }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Building2 
                      className="h-5 w-5 mt-1" 
                      style={{ color: getHospitalColor(record.hospitalId) }}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${getHospitalBadgeClass(record.hospitalId)}`}>
                          {record.hospitalName}
                        </span>
                        {record.isReadOnly && (
                          <Badge variant="outline" className="text-xs">Read Only</Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{record.diagnosis.join(', ')}</h4>
                      <p className="text-sm text-gray-500">Doctor ID: {record.doctorId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {formatDate(record.visitDate)}
                    </div>
                    <Badge variant={record.visitType === 'emergency' ? 'destructive' : 'secondary'} className="mt-1">
                      {record.visitType}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Active Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {medications.length === 0 ? (
              <p className="text-gray-500 col-span-2 text-center py-4">No active medications found</p>
            ) : (
              medications.map((med, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.frequency}</p>
                  </div>
                  <Badge variant="outline">{med.hospital}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
