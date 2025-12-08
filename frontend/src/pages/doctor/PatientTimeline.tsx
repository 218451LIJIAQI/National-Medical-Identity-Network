import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, Plus, Building2, Calendar, User, AlertTriangle, FileText, Pill, Loader2, Shield } from 'lucide-react'
import { formatDate, formatIC, getHospitalColor, getHospitalBadgeClass } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
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
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(icNumber),
          centralApi.getPatient(icNumber),
        ])
        
        if (queryRes.success && queryRes.data) {
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
        <Loader2 className={`h-8 w-8 animate-spin ${getHospitalTheme(user?.hospitalId || 'hospital-kl').iconColor}`} />
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
            <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getHospitalTheme(user?.hospitalId || 'hospital-kl').headerGradient} p-8 text-white shadow-2xl ${getHospitalTheme(user?.hospitalId || 'hospital-kl').shadowColor}`}
      >
        <motion.div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/20 rounded-full blur-3xl"
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
              <p className="text-white/80 font-mono">{formatIC(patient.icNumber)}</p>
            </div>
          </div>
          <Link to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/new-record`}>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <Button className={`bg-gradient-to-r ${getHospitalTheme(user?.hospitalId || 'hospital-kl').buttonGradient} text-white hover:opacity-90 gap-2 shadow-xl ${getHospitalTheme(user?.hospitalId || 'hospital-kl').shadowColor} h-12 px-6 rounded-xl font-semibold`}>
                <Plus className="h-5 w-5" />
                New Record
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${getHospitalTheme(user?.hospitalId || 'hospital-kl').cardAccentGradient}`} />
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

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${getHospitalTheme(user?.hospitalId || 'hospital-kl').cardAccentGradient}`} />
          <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`p-2.5 bg-gradient-to-br ${getHospitalTheme(user?.hospitalId || 'hospital-kl').cardAccentGradient} rounded-xl shadow-lg ${getHospitalTheme(user?.hospitalId || 'hospital-kl').shadowColor}`}>
                <FileText className="h-5 w-5 text-white" />
              </div>
              Medical Records Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {records.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No medical records found</p>
                </div>
              ) : records.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={`p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                    record.isReadOnly 
                      ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200' 
                      : `bg-gradient-to-r from-white ${getHospitalTheme(user?.hospitalId || 'hospital-kl').bgLight}/30 ${getHospitalTheme(user?.hospitalId || 'hospital-kl').borderColor}`
                  }`}
                  style={{ borderLeftWidth: 4, borderLeftColor: getHospitalColor(record.hospitalId) }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="p-3 rounded-xl shadow-md"
                        style={{ backgroundColor: `${getHospitalColor(record.hospitalId)}15` }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Building2 
                          className="h-6 w-6" 
                          style={{ color: getHospitalColor(record.hospitalId) }}
                        />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getHospitalBadgeClass(record.hospitalId)}`}
                          >
                            {record.hospitalName}
                          </span>
                          {record.isReadOnly && (
                            <Badge variant="outline" className="text-xs rounded-full px-3 bg-gray-100">
                              🔒 Read Only
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">{record.diagnosis.join(', ')}</h4>
                        <p className="text-sm text-gray-500 mt-1">Doctor ID: {record.doctorId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Calendar className="h-4 w-4" />
                        {formatDate(record.visitDate)}
                      </div>
                      <Badge 
                        className={`mt-2 rounded-full px-4 ${
                          record.visitType === 'emergency' 
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200' 
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {record.visitType}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25">
                <Pill className="h-5 w-5 text-white" />
              </div>
              Active Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {medications.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <Pill className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No active medications found</p>
                </div>
              ) : (
                medications.map((med, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <motion.div
                        className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-md shadow-emerald-200"
                        whileHover={{ rotate: 10 }}
                      >
                        <Pill className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <p className="font-bold text-gray-900">{med.name}</p>
                        <p className="text-sm text-emerald-600 font-medium">{med.frequency}</p>
                      </div>
                    </div>
                    <Badge className="rounded-full px-4 py-1.5 bg-white/80 text-emerald-700 border border-emerald-200 font-medium shadow-sm">
                      {med.hospital}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
