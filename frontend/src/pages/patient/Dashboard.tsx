import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { 
  User, Heart, FileText, Building2, 
  Activity, AlertTriangle, Shield, ArrowRight,
  CreditCard, Pill, Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PatientData {
  hospitalsCount: number
  recordsCount: number
  lastVisit: string
  allergies: string[]
  bloodType: string
  fullName: string
}

interface AccessLog {
  id: string
  timestamp: string
  action: string
  actorId: string
  actorName: string
  actorType: string
  actorHospitalId?: string
  hospitalName: string
  details: string
  success: boolean
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [patientData, setPatientData] = useState<PatientData>({
    hospitalsCount: 0,
    recordsCount: 0,
    lastVisit: '-',
    allergies: [],
    bloodType: '',
    fullName: '',
  })
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [accessLogsLoading, setAccessLogsLoading] = useState(true)

  useEffect(() => {
    async function loadPatientData() {
      if (!user?.icNumber) return
      try {
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(user.icNumber),
          centralApi.getPatient(user.icNumber),
        ])
        
        let hospitalsCount = 0
        let recordsCount = 0
        let lastVisit = '-'
        
        if (queryRes.success && queryRes.data) {
          const hospitalsWithRecords = queryRes.data.hospitals.filter((h: any) => h.recordCount > 0)
          hospitalsCount = hospitalsWithRecords.length
          recordsCount = queryRes.data.totalRecords
          lastVisit = hospitalsWithRecords.length > 0 ? 'Recent' : '-'
        }
        
        let allergies: string[] = []
        let bloodType = ''
        let fullName = ''
        
        if (patientRes.success && patientRes.data) {
          const p = patientRes.data.patient as any
          if (p) {
            allergies = p.allergies || []
            bloodType = p.bloodType || ''
            fullName = p.fullName || ''
          }
        }
        
        setPatientData({
          hospitalsCount,
          recordsCount,
          lastVisit,
          allergies,
          bloodType,
          fullName,
        })
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatientData()
  }, [user?.icNumber])

  // Load access logs
  useEffect(() => {
    async function loadAccessLogs() {
      try {
        const response = await centralApi.getMyAccessLogs(10)
        if (response.success && response.data) {
          setAccessLogs(response.data)
        }
      } catch (error) {
        console.error('Failed to load access logs:', error)
      } finally {
        setAccessLogsLoading(false)
      }
    }
    loadAccessLogs()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Profile Header - Premium Design */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-white shadow-2xl shadow-emerald-500/25"
      >
        {/* Animated background elements */}
        <motion.div 
          className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar with glow effect */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/30 rounded-2xl blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
              <User className="w-12 h-12 drop-shadow-lg" />
            </div>
          </motion.div>
          
          <div className="flex-1">
            <motion.h1 
              className="text-4xl font-bold mb-2 drop-shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {patientData.fullName || user?.fullName || 'Patient'}
            </motion.h1>
            <motion.div 
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <CreditCard className="w-4 h-4" />
                <span className="font-mono text-sm">{user?.icNumber || 'XXXXXX-XX-XXXX'}</span>
              </div>
              {patientData.bloodType && (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 px-4 py-2 text-sm">
                    <Heart className="w-4 h-4 mr-2 text-red-300" /> 
                    Blood Type: {patientData.bloodType}
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          </div>
          
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/patient/records">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-200 gap-2 shadow-xl shadow-black/10 h-12 px-6 rounded-xl font-semibold">
                  <FileText className="w-5 h-5" />
                  My Records
                </Button>
              </motion.div>
            </Link>
            <Link to="/patient/privacy">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 gap-2 h-12 px-6 rounded-xl font-semibold">
                  <Shield className="w-5 h-5" />
                  Privacy
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Allergies Alert - Premium Design */}
      {patientData.allergies.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="w-2 bg-gradient-to-b from-red-500 to-orange-500" />
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">⚠️ Allergies on File</p>
                        <p className="text-red-700 text-sm mt-1">
                          Please inform healthcare providers about these allergies
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {patientData.allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="px-3 py-1">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Hospitals Visited', 
            value: loading ? '-' : patientData.hospitalsCount, 
            icon: Building2, 
            gradient: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50'
          },
          { 
            label: 'Medical Records', 
            value: loading ? '-' : patientData.recordsCount, 
            icon: FileText, 
            gradient: 'from-emerald-500 to-emerald-600',
            bgLight: 'bg-emerald-50'
          },
          { 
            label: 'Active Medications', 
            value: '3', 
            icon: Pill, 
            gradient: 'from-violet-500 to-violet-600',
            bgLight: 'bg-violet-50'
          },
          { 
            label: 'Last Visit', 
            value: loading ? '-' : patientData.lastVisit, 
            icon: Calendar, 
            gradient: 'from-amber-500 to-amber-600',
            bgLight: 'bg-amber-50'
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 ${stat.bgLight} rounded-xl`}>
                    <stat.icon className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions - Premium Cards */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/patient/records">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                        View My Medical Records
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Access your complete medical history from all hospitals nationwide
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to="/patient/privacy">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-emerald-600 transition-colors">
                        Privacy & Security Settings
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Control who can access your medical records and sensitive data
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">Recent Access to Your Records</h2>
            <p className="text-sm text-gray-500">Track who has viewed your medical information</p>
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              {accessLogsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading access logs...</p>
                </div>
              ) : accessLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recent access to your records</p>
                  <p className="text-sm text-gray-400 mt-1">When healthcare providers view your records, it will appear here</p>
                </div>
              ) : (
                accessLogs.map((log, i) => {
                  // Format the timestamp to relative time
                  const logDate = new Date(log.timestamp)
                  const now = new Date()
                  const diffMs = now.getTime() - logDate.getTime()
                  const diffMins = Math.floor(diffMs / 60000)
                  const diffHours = Math.floor(diffMs / 3600000)
                  const diffDays = Math.floor(diffMs / 86400000)
                  
                  let timeAgo = ''
                  if (diffMins < 60) {
                    timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
                  } else if (diffHours < 24) {
                    timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
                  } else {
                    timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
                  }

                  // Determine avatar based on actor type
                  const avatar = log.actorType === 'doctor' ? '👨‍⚕️' : 
                                 log.actorType === 'hospital_admin' ? '🏥' :
                                 log.actorType === 'patient' ? '👤' : '🏥'
                  
                  // Check if actorName looks like a UUID and replace with friendly name
                  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                  let displayName = log.actorName || log.actorId
                  if (uuidPattern.test(displayName)) {
                    // It's a UUID, show a friendly fallback based on actorType
                    if (log.actorType === 'doctor') {
                      displayName = 'Healthcare Provider'
                    } else if (log.actorType === 'hospital_admin') {
                      displayName = 'Hospital Administrator'
                    } else if (log.actorType === 'patient') {
                      displayName = 'Patient'
                    } else {
                      displayName = 'System User'
                    }
                  }
                  
                  return (
                    <motion.div 
                      key={log.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-2xl">
                          {avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{displayName}</p>
                            <Badge variant="outline" className="text-xs">{log.hospitalName}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{log.details || 'Viewed medical records'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{timeAgo}</p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs text-emerald-600">{log.success ? 'Authorized' : 'Denied'}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
