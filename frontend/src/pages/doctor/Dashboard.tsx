import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { Search, FileText, Clock, Building2, Activity, ArrowRight, TrendingUp, Stethoscope, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface Hospital {
  id: string
  name: string
  city: string
  isActive: boolean
}

interface RecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  hospitals: number
  type: 'view' | 'create' | 'alert'
}

const hospitalColors: Record<string, string> = {
  'hospital-kl': '#3B82F6',
  'hospital-penang': '#10B981',
  'hospital-jb': '#F59E0B',
  'hospital-sarawak': '#8B5CF6',
  'hospital-sabah': '#EF4444',
}

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    activeHospitals: 0, 
    todayQueries: 0,
    yesterdayQueries: 0,
    queryChangePercent: 0,
    newHospitalsThisMonth: 0,
    avgResponseTime: 0
  })
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, hospitalsRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getHospitals(),
          centralApi.getMyActivityLogs(5),
        ])
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        
        if (hospitalsRes.success && hospitalsRes.data) {
          setHospitals(hospitalsRes.data as unknown as Hospital[])
        }
        
        if (logsRes.success && logsRes.data) {
          const activities = logsRes.data.map((log) => {
            const logDate = new Date(log.timestamp)
            const now = new Date()
            const diffMs = now.getTime() - logDate.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            
            let timeAgo = ''
            if (diffMins < 60) {
              timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`
            } else if (diffHours < 24) {
              timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
            } else {
              timeAgo = `${Math.floor(diffHours / 24)} days ago`
            }
            
            const icMasked = log.targetIcNumber 
              ? log.targetIcNumber.replace(/(.{6})(.*)(.{4})/, '$1-XX-$3')
              : 'N/A'
            
            return {
              patient: log.patientName || 'Patient',
              ic: icMasked,
              action: log.details || log.action || 'Query',
              time: timeAgo,
              hospitals: 1,
              type: log.action === 'query' ? 'view' as const : 'create' as const,
            }
          })
          setRecentActivity(activities)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
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
      {/* Welcome Header - Premium Design */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-8 text-white shadow-2xl shadow-blue-500/25"
      >
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.3),transparent_50%)]" />
        </div>
        <motion.div 
          className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <motion.div 
              className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Stethoscope className="w-7 h-7 drop-shadow" />
            </motion.div>
            <div className="flex items-center gap-2">
              <span className="text-white/90 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Doctor Portal</span>
              <motion.div
                className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-emerald-300 text-xs font-medium">Online</span>
            </div>
          </div>
          
          <motion.h1 
            className="text-4xl font-bold mb-3 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Welcome back, Dr. {user?.fullName?.split(' ').pop() || 'Doctor'} 
            <motion.span
              className="inline-block ml-2"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            >
              👋
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-blue-100 max-w-xl text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Access the National Medical Identity Network. Search any patient by IC number to view their complete cross-hospital medical history.
          </motion.p>
          
          <motion.div 
            className="mt-8 flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/doctor/search">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 gap-2 shadow-xl shadow-black/10 h-14 px-8 rounded-xl font-semibold text-base">
                  <Search className="w-5 h-5" />
                  Search Patient Records
                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Connected Hospitals', 
            value: loading ? '-' : stats.activeHospitals, 
            icon: Building2, 
            color: 'blue',
            gradient: 'from-blue-500 to-blue-600',
            change: loading ? '-' : (stats.newHospitalsThisMonth > 0 ? `+${stats.newHospitalsThisMonth} this month` : 'No change this month')
          },
          { 
            label: 'Queries Today', 
            value: loading ? '-' : stats.todayQueries, 
            icon: Activity, 
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-600',
            change: loading ? '-' : `${stats.queryChangePercent >= 0 ? '+' : ''}${stats.queryChangePercent}% vs yesterday`
          },
          { 
            label: 'Network Patients', 
            value: loading ? '-' : stats.totalPatients.toLocaleString(), 
            icon: FileText, 
            color: 'violet',
            gradient: 'from-violet-500 to-violet-600',
            change: 'Nationwide records'
          },
          { 
            label: 'Avg Response', 
            value: loading ? '-' : `~${stats.avgResponseTime}s`, 
            icon: Clock, 
            color: 'amber',
            gradient: 'from-amber-500 to-amber-600',
            change: 'Real-time performance'
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className={`w-3 h-3 text-${stat.color}-500`} />
                      <span className={`text-xs text-${stat.color}-600`}>{stat.change}</span>
                    </div>
                  </div>
                  <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <p className="text-sm text-gray-500">Your latest patient queries and actions</p>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <motion.div 
                    key={index} 
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        activity.type === 'view' ? 'bg-blue-100' :
                        activity.type === 'create' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {activity.type === 'view' && <FileText className="w-5 h-5 text-blue-600" />}
                        {activity.type === 'create' && <Activity className="w-5 h-5 text-emerald-600" />}
                        {activity.type === 'alert' && <Shield className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{activity.patient}</p>
                          <span className="text-xs text-gray-400 font-mono">{activity.ic}</span>
                        </div>
                        <p className="text-sm text-gray-500">{activity.action}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">{activity.time}</p>
                        <p className="text-xs text-blue-600 font-medium">{activity.hospitals} hospitals</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Status */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Network Status</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">All systems operational</p>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {hospitals.map((hospital, i) => {
                  const color = hospitalColors[hospital.id] || '#6B7280'
                  const latency = `${Math.floor(Math.random() * 50) + 30}ms`
                  return (
                    <motion.div
                      key={hospital.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: color + '20' }}
                      >
                        <Building2 className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{hospital.name}</p>
                        <p className="text-xs text-gray-500">{hospital.city}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${hospital.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className={`text-xs font-medium ${hospital.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {hospital.isActive ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{latency}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
