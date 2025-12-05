import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { FileText, Shield, Building2, Calendar, AlertTriangle, Heart, Pill, ArrowRight, User, CreditCard, Activity } from 'lucide-react'
import { motion } from 'framer-motion'

interface PatientData {
  hospitalsCount: number
  recordsCount: number
  lastVisit: string
  allergies: string[]
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [patientData, setPatientData] = useState<PatientData>({
    hospitalsCount: 0,
    recordsCount: 0,
    lastVisit: '-',
    allergies: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPatientData() {
      if (!user?.icNumber) return
      try {
        const response = await centralApi.queryPatient(user.icNumber)
        if (response.success && response.data) {
          const hospitalsWithRecords = response.data.hospitals.filter((h: any) => h.recordCount > 0)
          setPatientData({
            hospitalsCount: hospitalsWithRecords.length,
            recordsCount: response.data.totalRecords,
            lastVisit: hospitalsWithRecords.length > 0 ? 'Recent' : '-',
            allergies: ['Penicillin', 'Shellfish'],
          })
        }
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatientData()
  }, [user?.icNumber])

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
      {/* Profile Header */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <User className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{user?.fullName || 'Patient'}</h1>
            <div className="flex flex-wrap items-center gap-4 text-emerald-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="font-mono">{user?.icNumber || 'XXXXXX-XX-XXXX'}</span>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                <Heart className="w-3 h-3 mr-1" /> Blood Type: O+
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/patient/records">
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 gap-2">
                <FileText className="w-4 h-4" />
                My Records
              </Button>
            </Link>
            <Link to="/patient/privacy">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2">
                <Shield className="w-4 h-4" />
                Privacy
              </Button>
            </Link>
          </div>
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
              {[
                { doctor: 'Dr. Nurul Huda', hospital: 'KL General Hospital', action: 'Viewed prescription history', time: '2 hours ago', avatar: '👩‍⚕️' },
                { doctor: 'Dr. Tan Wei Ming', hospital: 'Penang General Hospital', action: 'Viewed lab results', time: '1 day ago', avatar: '👨‍⚕️' },
                { doctor: 'Dr. Ahmad Razak', hospital: 'Sultanah Aminah Hospital', action: 'Viewed medical history', time: '3 days ago', avatar: '👨‍⚕️' },
              ].map((access, i) => (
                <motion.div 
                  key={i}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-2xl">
                      {access.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{access.doctor}</p>
                        <Badge variant="outline" className="text-xs">{access.hospital}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{access.action}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{access.time}</p>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600">Authorized</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
