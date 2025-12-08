import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Activity, ArrowRight, 
  Users, Zap, Sparkles, Plus,
  Star, Clock, TrendingUp, Award,
  Building2, ChevronRight, Heart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, type: "spring", stiffness: 100 }
  }
}

interface RecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create' | 'alert'
}

export default function JohorDashboard() {
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
              time: diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h`,
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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <motion.div 
      className="space-y-6 max-w-6xl mx-auto font-poppins"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
                        <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100/60 shadow-xl shadow-amber-100/30"
      >
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-200/40 to-orange-200/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-gradient-to-tr from-yellow-200/30 to-transparent rounded-full blur-2xl translate-y-1/2" />
        
                <motion.div
          className="absolute top-12 right-20"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <Star className="w-6 h-6 text-amber-300/60 fill-amber-300/40" />
        </motion.div>
        <motion.div
          className="absolute bottom-16 right-40"
          animate={{ rotate: -360, scale: [1, 1.3, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-5 h-5 text-orange-300/50" />
        </motion.div>
        
        <div className="relative z-10 p-8">
                    <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 backdrop-blur-sm rounded-2xl border border-amber-200/50">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Specialist Portal</span>
              </div>
            </div>
            
                        <motion.div 
              className="hidden md:flex items-center gap-3 px-5 py-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-lg"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200/50">
                <span className="text-white font-bold text-sm">{theme.shortName}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{theme.name}</p>
                <p className="text-xs text-amber-600">{theme.city}</p>
              </div>
            </motion.div>
          </div>

                    <div className="flex items-end justify-between">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-amber-600 font-semibold text-lg">{getGreeting()}</p>
                <h1 className="text-4xl font-bold text-gray-800 mt-1">
                  Dr. {user?.fullName?.split(' ').pop()} ✨
                </h1>
              </motion.div>
              <p className="text-amber-700/70 text-lg max-w-md">
                {theme.tagline}
              </p>
              
                            <div className="flex gap-3 pt-2">
                <Link to="/doctor/search">
                  <motion.button
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50 transition-all"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Search className="w-5 h-5" />
                    Search Patients
                  </motion.button>
                </Link>
                <Link to="/doctor/new-record">
                  <motion.button
                    className="flex items-center gap-2 px-6 py-3 bg-white text-amber-700 rounded-xl font-semibold border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-5 h-5" />
                    New Record
                  </motion.button>
                </Link>
              </div>
            </div>

                        <motion.div 
              className="hidden lg:grid grid-cols-2 gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md text-center min-w-[100px]">
                <p className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.activeHospitals}</p>
                <p className="text-xs text-amber-600 font-medium">Hospitals</p>
              </div>
              <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-md text-center min-w-[100px]">
                <p className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.todayQueries}</p>
                <p className="text-xs text-amber-600 font-medium">Today</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

                        <motion.div variants={itemVariants} className="grid md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Hospitals', 
            value: loading ? '—' : stats.activeHospitals,
            icon: Building2,
            bg: 'from-amber-50 to-orange-50',
            iconBg: 'from-amber-400 to-amber-500',
            iconShadow: 'shadow-amber-200/60'
          },
          { 
            label: 'Queries', 
            value: loading ? '—' : stats.todayQueries,
            icon: Activity,
            bg: 'from-orange-50 to-amber-50',
            iconBg: 'from-orange-400 to-orange-500',
            iconShadow: 'shadow-orange-200/60'
          },
          { 
            label: 'Patients', 
            value: loading ? '—' : stats.totalPatients.toLocaleString(),
            icon: Users,
            bg: 'from-yellow-50 to-amber-50',
            iconBg: 'from-yellow-400 to-amber-400',
            iconShadow: 'shadow-yellow-200/60'
          },
          { 
            label: 'Excellence', 
            value: 'A+',
            icon: Award,
            bg: 'from-amber-50 to-yellow-50',
            iconBg: 'from-amber-500 to-yellow-500',
            iconShadow: 'shadow-amber-200/60'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`relative overflow-hidden p-5 bg-gradient-to-br ${stat.bg} rounded-2xl border border-amber-100/60 shadow-lg shadow-amber-50/50`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + index * 0.08, type: "spring", stiffness: 150 }}
            whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.25)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <motion.div 
                className={`w-11 h-11 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg ${stat.iconShadow}`}
                whileHover={{ scale: 1.1, rotate: 10 }}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </motion.div>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            
            <motion.p 
              className="text-3xl font-bold text-gray-800 mb-1"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
            >
              {stat.value}
            </motion.p>
            <p className="text-sm font-medium text-amber-700/70">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

                        <div className="grid lg:grid-cols-3 gap-6">
                <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200/50">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                  <p className="text-sm text-gray-500">Latest patient interactions</p>
                </div>
              </div>
              <Link 
                to="/doctor/search"
                className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {recentActivity.length === 0 ? (
                <motion.div className="text-center py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">Start searching for patients</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activity.type === 'view' 
                          ? 'bg-amber-100 text-amber-600' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{activity.time}</p>
                        <code className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                          {activity.ic}
                        </code>
                      </div>
                      
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

                <motion.div 
          variants={itemVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200/50">
                <Star className="w-5 h-5 text-white" />
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
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/30 rounded-xl border border-amber-100/50 hover:border-amber-200 transition-all"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.08 }}
                  whileHover={{ x: 4, backgroundColor: 'rgb(255 251 235)' }}
                >
                  <div className="w-2 h-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-sm shadow-amber-200" />
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
