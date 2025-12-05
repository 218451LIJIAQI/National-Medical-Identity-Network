import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { Building2, Calendar, FileText, Loader2, Stethoscope, Clock, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface MedicalRecord {
  id: string
  hospitalName: string
  visitDate: string
  visitType: string
  diagnosis: string[]
  doctorId: string
}

const hospitalColors: Record<string, string> = {
  'KL General Hospital': '#3B82F6',
  'Penang General Hospital': '#10B981',
  'Sultanah Aminah Hospital': '#F59E0B',
  'Sarawak General Hospital': '#8B5CF6',
  'Queen Elizabeth Hospital': '#EF4444',
}

export default function PatientRecords() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecords() {
      if (!user?.icNumber) return
      try {
        const response = await centralApi.queryPatient(user.icNumber)
        if (response.success && response.data) {
          const allRecords: MedicalRecord[] = []
          response.data.hospitals.forEach((hospital: any) => {
            hospital.records?.forEach((record: any) => {
              allRecords.push({
                id: record.id,
                hospitalName: hospital.hospitalName,
                visitDate: record.visitDate,
                visitType: record.visitType,
                diagnosis: record.diagnosis || [],
                doctorId: record.doctorId,
              })
            })
          })
          allRecords.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(allRecords)
        }
      } catch (error) {
        console.error('Failed to load records:', error)
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [user?.icNumber])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your medical records...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 text-white"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-blue-100 text-sm font-medium">Medical Records</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">My Medical History</h1>
          <p className="text-blue-100">
            Complete records from {new Set(records.map(r => r.hospitalName)).size} hospitals • {records.length} total visits
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{new Set(records.map(r => r.hospitalName)).size}</p>
                <p className="text-sm text-gray-500">Hospitals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{records.length}</p>
                <p className="text-sm text-gray-500">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-100 rounded-xl">
                <Clock className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{records.length > 0 ? formatDate(records[0].visitDate) : '-'}</p>
                <p className="text-sm text-gray-500">Last Visit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Records List */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">Medical History Timeline</h2>
            <p className="text-sm text-gray-500">Records sorted by most recent visit</p>
          </div>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No medical records found</p>
                <p className="text-sm text-gray-400">Your records will appear here once available</p>
              </div>
            ) : (
              <div className="divide-y">
                {records.map((record, i) => {
                  const color = hospitalColors[record.hospitalName] || '#6B7280'
                  return (
                    <motion.div 
                      key={record.id} 
                      className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: color + '20' }}
                        >
                          <Building2 className="w-6 h-6" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{record.hospitalName}</p>
                              <p className="text-gray-600 mt-1">
                                {record.diagnosis.length > 0 ? record.diagnosis.join(', ') : 'General checkup / consultation'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(record.visitDate)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Stethoscope className="w-4 h-4" />
                                  <span>Dr. ID: {record.doctorId?.slice(0, 8) || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <Badge 
                              className={`flex-shrink-0 ${
                                record.visitType === 'emergency' 
                                  ? 'bg-red-100 text-red-700' 
                                  : record.visitType === 'outpatient'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {record.visitType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
