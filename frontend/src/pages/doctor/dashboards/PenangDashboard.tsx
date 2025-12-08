import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Activity, ArrowRight, 
  Users, Heart, Sparkles, Plus,
  Stethoscope, Calendar, Clock, TrendingUp,
  Building2, Shield, ChevronRight, Leaf
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

interface RecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create' | 'alert'
}

export default function PenangDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    activeHospitals: 0, 
    todayQueries: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getMyActivityLogs(4),
        ])
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        
        if (logsRes.success && logsRes.data) {
          const activities = logsRes.data.map((log) => {
            const logDate = new Date(log.timestamp)
            const now = new Date()
            const diffMs = now.getTime() - logDate.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            
            return {
              patient: log.patientName || 'Patient',
              ic: log.targetIcNumber?.replace(/(.{6})(.*)(.{4})/, '$1-XX-$3') || 'N/A',
              action: log.details || log.action || 'Query',
              time: diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`,
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div 
      className="space-y-6 font-nunito"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
                        <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100/60 shadow-lg shadow-emerald-100/30"
      >
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-teal-200/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
                <motion.div
          className="absolute top-8 right-12 text-emerald-300/40"
          animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Leaf className="w-8 h-8" />
        </motion.div>
        <motion.div
          className="absolute bottom-12 right-32 text-teal-300/30"
          animate={{ y: [5, -5, 5], rotate: [5, -5, 5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Leaf className="w-6 h-6" />
        </motion.div>
        
        <div className="relative z-10 p-8">
                    <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-100 shadow-sm">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-100 shadow-sm">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-800">{formatTime(currentTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-xl border border-emerald-200/50">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Online</span>
            </div>
          </div>

                    <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                >
                  <Stethoscope className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-emerald-600 font-medium">Welcome back,</p>
                  <h1 className="text-3xl font-bold text-gray-800">
                    Dr. {user?.fullName?.split(' ').pop()}
                  </h1>
                </div>
              </div>
              <p className="text-emerald-700/70 text-lg max-w-lg">
                {theme.tagline} — Caring for the Pearl of the Orient
              </p>
            </div>

                        <motion.div 
              className="hidden lg:flex flex-col items-end gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-md">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center border border-emerald-200">
                  <span className="text-lg font-bold text-emerald-700">{theme.shortName}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{theme.name}</p>
                  <p className="text-sm text-emerald-600">{theme.city}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

                        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-5">
        <Link to="/doctor/search">
          <motion.div
            className="group relative overflow-hidden p-6 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-110 transition-transform">
                <Search className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-800 transition-colors">
                  Search Patients
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Query patient records across the national network
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </Link>

        <Link to="/doctor/new-record">
          <motion.div
            className="group relative overflow-hidden p-6 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-teal-100/50 transition-all duration-300"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200/50 group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-teal-800 transition-colors">
                  Create Record
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add new medical records for patients
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </Link>
      </motion.div>

                        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-5">
        {[
          { 
            label: 'Connected Hospitals', 
            value: loading ? '—' : stats.activeHospitals,
            icon: Building2,
            gradient: 'from-emerald-50 to-teal-50',
            iconBg: 'from-emerald-400 to-emerald-500',
            iconShadow: 'shadow-emerald-200/50',
            trend: '+2 this month'
          },
          { 
            label: 'Queries Today', 
            value: loading ? '—' : stats.todayQueries,
            icon: Activity,
            gradient: 'from-teal-50 to-cyan-50',
            iconBg: 'from-teal-400 to-teal-500',
            iconShadow: 'shadow-teal-200/50',
            trend: 'Active now'
          },
          { 
            label: 'Network Patients', 
            value: loading ? '—' : stats.totalPatients.toLocaleString(),
            icon: Users,
            gradient: 'from-cyan-50 to-sky-50',
            iconBg: 'from-cyan-400 to-cyan-500',
            iconShadow: 'shadow-cyan-200/50',
            trend: 'Growing'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`relative overflow-hidden p-6 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-white shadow-lg shadow-gray-100/30`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ y: -3, boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.15)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <motion.div 
                className={`w-12 h-12 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg ${stat.iconShadow}`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{stat.trend}</span>
              </div>
            </div>
            
            <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
            <motion.p 
              className="text-3xl font-bold text-gray-800"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
            >
              {stat.value}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>

                        <motion.div 
        variants={itemVariants}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/30 overflow-hidden"
      >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200/50">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                <p className="text-sm text-gray-500">Your latest patient interactions</p>
              </div>
            </div>
            <Link 
              to="/doctor/search"
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

                <div className="p-6">
          <AnimatePresence mode="wait">
            {recentActivity.length === 0 ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-gray-600 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Start by searching for a patient</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50 transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.type === 'view' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-teal-100 text-teal-600'
                    }`}>
                      {activity.type === 'view' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Heart className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{activity.time}</p>
                      <code className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">
                        {activity.ic}
                      </code>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

                        <motion.div 
        variants={itemVariants}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/30 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-teal-200/50">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Centers of Excellence</h2>
              <p className="text-sm text-gray-500">{theme.name} specializations</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {theme.specialties.map((specialty, index) => (
              <motion.div
                key={specialty}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50 transition-all cursor-default"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <Heart className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-800">{specialty}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
