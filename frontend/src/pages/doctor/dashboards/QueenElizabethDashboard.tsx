// ============================================================================
// Queen Elizabeth Hospital Dashboard - Royal Medical Excellence
// 皇家医学卓越风格 - 金红配色，居中布局
// Royal elegance with amber-red theme, centered content
// ============================================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Activity, ArrowRight, 
  Users, Plus, Crown, Award, Sparkles,
  TrendingUp, MapPin, Building2, ChevronRight, 
  Heart, BookOpen, History, Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// 皇家优雅动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

interface RecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create' | 'alert'
}

export default function QueenElizabethDashboard() {
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
              time: diffMins < 60 ? `${diffMins} min ago` : `${Math.floor(diffMins / 60)}h ago`,
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
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <motion.div 
      className="space-y-6 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ================================================================== */}
      {/* ROYAL WELCOME BANNER */}
      {/* ================================================================== */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden bg-gradient-to-br from-white via-amber-50/30 to-rose-50/50 rounded-3xl border border-amber-200/60 shadow-xl"
      >
        {/* Gold Top Accent */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-rose-100/40 to-transparent rounded-full blur-3xl" />
        
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Welcome Content */}
            <div className="flex items-start gap-5">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-300/40 border border-amber-300/50">
                  <Crown className="w-10 h-10 text-red-800" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border border-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </motion.div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                    Welcome back
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(currentTime)}</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Dr. {user?.fullName}
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {theme.name} • {theme.city}
                </p>
              </div>
            </div>
            
            {/* Right: Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link to="/doctor/search">
                <motion.button
                  className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl font-semibold shadow-xl shadow-red-200/50 hover:shadow-2xl transition-all"
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Search className="w-5 h-5" />
                  Search Patients
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link to="/doctor/new-record">
                <motion.button
                  className="flex items-center gap-3 px-6 py-4 bg-white text-red-700 rounded-2xl font-semibold border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all shadow-lg"
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  New Record
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom Gold Accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
      </motion.div>

      {/* ================================================================== */}
      {/* STATISTICS - Royal Card Style */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-5">
        {[
          { label: 'Connected Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Building2, desc: 'In network', color: 'amber' },
          { label: 'Queries Today', value: loading ? '—' : stats.todayQueries, icon: Activity, desc: 'Records accessed', color: 'red' },
          { label: 'Network Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, desc: 'Total records', color: 'rose' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className="relative overflow-hidden bg-white rounded-2xl border border-amber-100 shadow-lg hover:shadow-xl transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            {/* Top Gold Accent */}
            <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
            
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{stat.label}</p>
                  <motion.p 
                    className="text-4xl font-bold text-gray-900"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-xs text-gray-400 mt-2">{stat.desc}</p>
                </div>
                <motion.div 
                  className="p-4 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl border border-amber-200/50"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <stat.icon className="w-7 h-7 text-amber-600" />
                </motion.div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-amber-100">
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Active</span>
                </div>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ================================================================== */}
      {/* ACTIVITY TIMELINE - Royal Style */}
      {/* ================================================================== */}
      <motion.div 
        variants={itemVariants}
        className="relative bg-white rounded-2xl border border-amber-100 shadow-xl overflow-hidden"
      >
        {/* Top Gold Accent */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        
        {/* Header */}
        <div className="p-6 border-b border-amber-100 bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-200/50">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
                <p className="text-sm text-gray-500">Recent patient record access</p>
              </div>
            </div>
            <Link 
              to="/doctor/search"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {recentActivity.length === 0 ? (
              <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-24 h-24 mx-auto mb-5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-3xl flex items-center justify-center border border-amber-200">
                  <BookOpen className="w-12 h-12 text-amber-500" />
                </div>
                <p className="text-lg font-semibold text-gray-700">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">Start by searching for patient records</p>
                <Link to="/doctor/search">
                  <motion.button 
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Search Patients
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    className="group p-5 bg-gradient-to-r from-amber-50/50 via-white to-rose-50/30 rounded-2xl border border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <motion.div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          activity.type === 'view' 
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600' 
                            : 'bg-gradient-to-br from-red-500 to-rose-600'
                        }`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        {activity.type === 'view' ? (
                          <FileText className="w-6 h-6 text-white" />
                        ) : (
                          <Heart className="w-6 h-6 text-white" />
                        )}
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{activity.patient}</p>
                        <p className="text-sm text-gray-500">{activity.action}</p>
                        <code className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg mt-2 inline-block border border-amber-200 font-mono">
                          {activity.ic}
                        </code>
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-400">{activity.time}</p>
                        <ChevronRight className="w-6 h-6 text-amber-300 mt-2 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* SPECIALTIES - Royal Badge Collection */}
      {/* ================================================================== */}
      <motion.div 
        variants={itemVariants}
        className="relative bg-white rounded-2xl border border-amber-100 shadow-lg overflow-hidden"
      >
        {/* Top Gold Accent */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-200/50">
              <Crown className="w-6 h-6 text-red-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Centers of Excellence</h2>
              <p className="text-sm text-gray-500">Our specialized medical departments</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {theme.specialties.map((specialty, index) => (
              <motion.div
                key={specialty}
                className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-50 to-white rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-default"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.08 }}
                whileHover={{ scale: 1.05, y: -3 }}
              >
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-gray-800">{specialty}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
