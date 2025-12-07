// ============================================================================
// KL General Hospital Dashboard - Elegant Sky Blue & Corporate Style
// 极致精美浅色系 - 天蓝钴蓝色调，专业企业风格
// Ultra-refined light theme with corporate elegance
// ============================================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Activity, ArrowRight, 
  Users, Zap, Plus, Globe,
  Clock, Calendar, TrendingUp, MapPin,
  Building2, ChevronRight, Heart, Shield, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// 专业动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
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

export default function KLGeneralDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    activeHospitals: 0, 
    todayQueries: 0,
    avgResponseTime: 0,
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
          centralApi.getMyActivityLogs(5),
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
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <motion.div 
      className="space-y-6 font-inter"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ================================================================== */}
      {/* WELCOME HEADER - Corporate Sky Blue */}
      {/* ================================================================== */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 border border-blue-100/60 shadow-xl shadow-blue-100/30"
      >
        {/* Decorative Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-200/40 to-sky-200/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-gradient-to-tr from-cyan-200/30 to-transparent rounded-full blur-2xl translate-y-1/3" />
        
        <div className="relative z-10 p-8">
          {/* Top Bar - Date & Status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-medium text-sky-800">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 backdrop-blur-sm rounded-xl border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Connected</span>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                >
                  <Building2 className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-blue-600 font-medium">Welcome back,</p>
                  <h1 className="text-3xl font-bold text-gray-800">
                    Dr. {user?.fullName?.split(' ').pop()}
                  </h1>
                </div>
              </div>
              <p className="text-blue-700/70 text-lg max-w-lg">
                {theme.tagline}
              </p>
              
              {/* Quick Actions */}
              <div className="flex gap-3 pt-2">
                <Link to="/doctor/search">
                  <motion.button
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-200/50 hover:shadow-xl transition-all"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Search className="w-5 h-5" />
                    Search Patients
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <Link to="/doctor/new-record">
                  <motion.button
                    className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-5 h-5" />
                    New Record
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Hospital Info Card */}
            <motion.div 
              className="hidden lg:block"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 shadow-lg min-w-[220px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-sky-100 rounded-xl flex items-center justify-center border border-blue-200">
                    <span className="text-lg font-bold text-blue-700">{theme.shortName}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{theme.name}</p>
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <MapPin className="w-3 h-3" />
                      <span>{theme.city}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-800">{theme.departments}</p>
                    <p className="text-xs text-blue-600 font-medium">Departments</p>
                  </div>
                  <div className="p-2.5 bg-sky-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-800">{theme.bedCount}</p>
                    <p className="text-xs text-sky-600 font-medium">Beds</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* STATS GRID - Clean Corporate Cards */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Hospitals', 
            value: loading ? '—' : stats.activeHospitals,
            icon: Globe,
            gradient: 'from-blue-50 to-sky-50',
            iconBg: 'from-blue-400 to-blue-500',
            iconShadow: 'shadow-blue-200/60'
          },
          { 
            label: 'Queries Today', 
            value: loading ? '—' : stats.todayQueries,
            icon: Activity,
            gradient: 'from-sky-50 to-cyan-50',
            iconBg: 'from-sky-400 to-sky-500',
            iconShadow: 'shadow-sky-200/60'
          },
          { 
            label: 'Total Patients', 
            value: loading ? '—' : stats.totalPatients.toLocaleString(),
            icon: Users,
            gradient: 'from-cyan-50 to-teal-50',
            iconBg: 'from-cyan-400 to-cyan-500',
            iconShadow: 'shadow-cyan-200/60'
          },
          { 
            label: 'Response Time', 
            value: loading ? '—' : `${stats.avgResponseTime}s`,
            icon: Zap,
            gradient: 'from-teal-50 to-emerald-50',
            iconBg: 'from-teal-400 to-emerald-400',
            iconShadow: 'shadow-teal-200/60'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`p-5 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-blue-100/50 shadow-lg shadow-blue-50/50`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.07 }}
            whileHover={{ y: -4, boxShadow: '0 20px 40px -15px rgba(59, 130, 246, 0.15)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <motion.div 
                className={`w-11 h-11 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg ${stat.iconShadow}`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </motion.div>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            
            <motion.p 
              className="text-3xl font-bold text-gray-800 mb-0.5"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + index * 0.08, type: "spring" }}
            >
              {stat.value}
            </motion.p>
            <p className="text-sm font-medium text-blue-600/70">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ================================================================== */}
      {/* MAIN CONTENT GRID */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity - 2 columns */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200/50">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                  <p className="text-sm text-gray-500">Latest patient record access</p>
                </div>
              </div>
              <Link 
                to="/doctor/search"
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {recentActivity.length === 0 ? (
                <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">Start by searching for a patient</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.07 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activity.type === 'view' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-sky-100 text-sky-600'
                      }`}>
                        {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{activity.time}</p>
                        <code className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                          {activity.ic}
                        </code>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Sidebar - Specialties */}
        <motion.div 
          variants={itemVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-sky-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-200/50">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Specialties</h2>
                <p className="text-sm text-gray-500">Centers of Excellence</p>
              </div>
            </div>
          </div>
          
          <div className="p-5">
            <div className="space-y-2.5">
              {theme.specialties.map((specialty, index) => (
                <motion.div
                  key={specialty}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-sky-50/30 rounded-xl border border-blue-100/50 hover:border-blue-200 transition-all"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.07 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full shadow-sm shadow-blue-200" />
                  <span className="text-sm font-medium text-gray-700">{specialty}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
