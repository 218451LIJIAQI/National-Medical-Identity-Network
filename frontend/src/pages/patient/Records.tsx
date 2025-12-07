import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { Building2, Calendar, FileText, Loader2, Stethoscope, Clock } from 'lucide-react'
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
      {/* Header - Premium Design */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-blue-500/25"
      >
        <motion.div 
          className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <motion.div 
              className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <FileText className="w-7 h-7 drop-shadow" />
            </motion.div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1">Medical Records</Badge>
          </div>
          <h1 className="text-4xl font-bold mb-3 drop-shadow-lg">My Medical History</h1>
          <p className="text-blue-100 text-lg">
            Complete records from <span className="font-semibold text-white">{new Set(records.map(r => r.hospitalName)).size} hospitals</span> • <span className="font-semibold text-white">{records.length} total visits</span>
          </p>
        </div>
      </motion.div>

      {/* Stats - Premium Design */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-200"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{new Set(records.map(r => r.hospitalName)).size}</p>
                <p className="text-sm text-gray-500 font-medium">Hospitals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-emerald-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <FileText className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                <p className="text-sm text-gray-500 font-medium">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-200"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Clock className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="text-xl font-bold text-gray-900">{records.length > 0 ? formatDate(records[0].visitDate) : '-'}</p>
                <p className="text-sm text-gray-500 font-medium">Last Visit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Records List - Premium Design */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical History Timeline</h2>
                <p className="text-sm text-gray-500">Records sorted by most recent visit</p>
              </div>
            </div>
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
