import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Activity, ArrowRight, 
  Users, Zap, Sparkles, Plus,
  Clock, TrendingUp, Globe,
  ChevronRight, Heart, Cpu, Wifi
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

interface RecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create' | 'alert'
}

export default function SarawakDashboard() {
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
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

  return (
    <motion.div 
      className="space-y-6 font-space"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
                        <motion.div 
        variants={itemVariants}
        className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl border border-violet-100/60 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-violet-100 shadow-sm">
            <motion.div
              className="w-2.5 h-2.5 bg-emerald-400 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-emerald-700">System Online</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-xl border border-violet-100/50">
            <Wifi className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-violet-700">Connected to National Network</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-violet-100 shadow-sm">
          <Clock className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-mono font-medium text-violet-800">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </motion.div>

                        <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <motion.div 
            variants={itemVariants}
            className="relative overflow-hidden p-8 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-3xl border border-violet-100/60 shadow-xl shadow-violet-100/30"
          >
                        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-violet-200/40 to-fuchsia-200/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
            
                        <div className="absolute inset-0 opacity-[0.03]">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" className="text-violet-500" />
              </svg>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-medium text-violet-600 uppercase tracking-wider">Doctor Interface</span>
              </div>
              
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                      Welcome, Dr. {user?.fullName?.split(' ').pop()}
                    </h1>
                    <p className="text-violet-600/80 text-lg mt-1">{theme.tagline}</p>
                  </div>
                  
                                    <div className="flex gap-3 pt-2">
                    <Link to="/doctor/search">
                      <motion.button
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-200/50 hover:shadow-xl transition-all"
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
                        className="flex items-center gap-2 px-6 py-3 bg-white text-violet-700 rounded-xl font-semibold border-2 border-violet-200 hover:border-violet-400 transition-all"
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
                  className="hidden lg:block"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200/50">
                        <span className="text-white font-bold">{theme.shortName}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{theme.name}</p>
                        <p className="text-sm text-violet-600">{theme.city}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-violet-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-800">{theme.departments}</p>
                        <p className="text-xs text-violet-600">Depts</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-800">{theme.bedCount}</p>
                        <p className="text-xs text-purple-600">Beds</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Globe, gradient: 'from-violet-50 to-purple-50', iconBg: 'from-violet-400 to-violet-500' },
              { label: 'Queries', value: loading ? '—' : stats.todayQueries, icon: Activity, gradient: 'from-purple-50 to-fuchsia-50', iconBg: 'from-purple-400 to-purple-500' },
              { label: 'Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, gradient: 'from-fuchsia-50 to-pink-50', iconBg: 'from-fuchsia-400 to-fuchsia-500' },
              { label: 'Response', value: '< 1s', icon: Zap, gradient: 'from-pink-50 to-violet-50', iconBg: 'from-pink-400 to-violet-400' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className={`p-5 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-violet-100/50 shadow-md shadow-violet-50/50`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                whileHover={{ y: -3, boxShadow: '0 20px 40px -15px rgba(139, 92, 246, 0.15)' }}
              >
                <motion.div 
                  className={`w-10 h-10 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-md shadow-violet-200/50 mb-3`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </motion.div>
                <motion.p 
                  className="text-2xl font-bold text-gray-800"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-sm text-violet-600/70">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

                    <motion.div 
            variants={itemVariants}
            className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200/50">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Activity Log</h2>
                    <p className="text-sm text-gray-500">Recent patient interactions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700">LIVE</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                {recentActivity.length === 0 ? (
                  <motion.div className="text-center py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-violet-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No recent activity</p>
                    <p className="text-sm text-gray-400 mt-1">Start by searching for patients</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ x: 4 }}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          activity.type === 'view' 
                            ? 'bg-violet-100 text-violet-600' 
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                          <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                        </div>
                        
                        <div className="text-right">
                          <code className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded font-mono">
                            {activity.ic}
                          </code>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                        
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

                <div className="space-y-6">
                    <motion.div 
            variants={itemVariants}
            className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/60 shadow-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200/50"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wifi className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <p className="font-bold text-gray-800">Network Status</p>
                <p className="text-sm text-emerald-600">All systems operational</p>
              </div>
            </div>
            <div className="space-y-2">
              {['Central Hub', 'Hospital Network', 'Auth Service'].map((service) => (
                <div key={service} className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-600">{service}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-emerald-600 font-medium">Online</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

                    <motion.div 
            variants={itemVariants}
            className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-purple-200/50">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Specialties</h2>
                  <p className="text-sm text-gray-500">Excellence Centers</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-2">
              {theme.specialties.map((specialty, index) => (
                <motion.div
                  key={specialty}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-100/50 hover:border-violet-200 transition-all"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                  whileHover={{ x: 3 }}
                >
                  <div className="w-2 h-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full shadow-sm" />
                  <span className="text-sm font-medium text-gray-700">{specialty}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
