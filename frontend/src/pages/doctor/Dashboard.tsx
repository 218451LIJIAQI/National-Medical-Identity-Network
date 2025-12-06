// ============================================================================
// Doctor Dashboard - Premium Hospital-Themed Interface
// Each hospital gets a unique, stunning visual experience
// ============================================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme, type HospitalTheme } from '@/lib/hospital-themes'
import { 
  Search, FileText, Building2, Activity, ArrowRight, TrendingUp, 
  Stethoscope, Shield, Users, Zap, Globe, Heart, Star, Sparkles,
  CheckCircle, MapPin, Award
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [currentTime, setCurrentTime] = useState(new Date())

  // Get hospital theme based on user's hospital
  const theme: HospitalTheme = getHospitalTheme(user?.hospitalId)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

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
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ================================================================== */}
      {/* HERO HEADER - Hospital Branded */}
      {/* ================================================================== */}
      <motion.div 
        variants={itemVariants}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.headerGradient} p-8 text-white shadow-2xl ${theme.shadowColor}`}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Main glow */}
          <motion.div 
            className={`absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br ${theme.backgroundGlow} rounded-full blur-3xl opacity-60`}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 4) * 18}%`,
              }}
              animate={{
                y: [-15, 15, -15],
                x: [-5, 5, -5],
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
          
          {/* Decorative lines */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Top Bar - Hospital Branding */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Hospital Logo/Badge */}
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl flex items-center justify-center">
                  <span className="text-2xl font-black tracking-tight">{theme.shortName}</span>
                </div>
                {/* Glow ring */}
                <motion.div
                  className="absolute -inset-1 bg-white/20 rounded-2xl blur-md -z-10"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <div>
                <motion.h2 
                  className="text-2xl font-bold tracking-tight drop-shadow-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {theme.name}
                </motion.h2>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-sm text-white/80">{theme.city}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-white/60">Est. {theme.established}</span>
                </div>
              </div>
            </div>

            {/* Live Status & Time */}
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <motion.div
                  className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-sm font-medium">System Online</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">{formatTime(currentTime)}</p>
                <p className="text-xs text-white/60">{formatDate(currentTime)}</p>
              </div>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <motion.div
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Stethoscope className="w-3 h-3 mr-1.5" />
                Doctor Portal
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30 px-3 py-1 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              Welcome back, Dr. {user?.fullName?.split(' ').pop() || 'Doctor'}
              <motion.span
                className="inline-block ml-3"
                animate={{ rotate: [0, 14, -8, 14, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 4 }}
              >
                👋
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-lg text-white/80 max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {theme.tagline}. Access the <span className="font-semibold text-white">National Medical Identity Network</span> to view cross-hospital patient records securely.
            </motion.p>
          </div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/doctor/search">
              <motion.div 
                whileHover={{ scale: 1.03, y: -2 }} 
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  className="bg-white text-gray-900 hover:bg-white/95 gap-2 shadow-xl shadow-black/20 h-14 px-8 rounded-xl font-semibold text-base group"
                >
                  <Search className="w-5 h-5" />
                  Search Patient Records
                  <motion.div 
                    animate={{ x: [0, 4, 0] }} 
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>
            <Link to="/doctor/new-record">
              <motion.div 
                whileHover={{ scale: 1.03, y: -2 }} 
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2 h-14 px-6 rounded-xl font-medium backdrop-blur-sm"
                >
                  <FileText className="w-5 h-5" />
                  Create New Record
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Bottom decorative bar */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/40 to-white/0"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      {/* ================================================================== */}
      {/* STATS GRID - Hospital Themed */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Connected Hospitals', 
            value: loading ? '—' : stats.activeHospitals, 
            icon: Building2, 
            gradient: theme.statsGradients[0],
            change: loading ? '' : (stats.newHospitalsThisMonth > 0 ? `+${stats.newHospitalsThisMonth} new` : 'Stable'),
            suffix: 'in network'
          },
          { 
            label: 'Queries Today', 
            value: loading ? '—' : stats.todayQueries, 
            icon: Activity, 
            gradient: theme.statsGradients[1],
            change: loading ? '' : `${stats.queryChangePercent >= 0 ? '+' : ''}${stats.queryChangePercent}%`,
            suffix: 'vs yesterday'
          },
          { 
            label: 'Network Patients', 
            value: loading ? '—' : stats.totalPatients.toLocaleString(), 
            icon: Users, 
            gradient: theme.statsGradients[2],
            change: 'Nationwide',
            suffix: 'accessible'
          },
          { 
            label: 'Response Time', 
            value: loading ? '—' : `${stats.avgResponseTime}s`, 
            icon: Zap, 
            gradient: theme.statsGradients[3],
            change: 'Real-time',
            suffix: 'average'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
              
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <motion.p 
                        className="text-3xl font-bold text-gray-900"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <TrendingUp className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                      <span className={`text-xs font-medium ${theme.textColor}`}>{stat.change}</span>
                      <span className="text-xs text-gray-400">{stat.suffix}</span>
                    </div>
                  </div>
                  <motion.div 
                    className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg`}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ================================================================== */}
      {/* MAIN CONTENT - Two Column Layout */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Recent Activity - Takes 2 columns */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className={`p-5 border-b ${theme.bgLight} bg-gradient-to-r from-white to-transparent`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${theme.bgMedium} rounded-xl`}>
                    <Activity className={`w-5 h-5 ${theme.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    <p className="text-sm text-gray-500">Your latest patient queries</p>
                  </div>
                </div>
                <Link to="/doctor/history">
                  <Button variant="ghost" size="sm" className={`${theme.textColor} hover:${theme.bgLight} gap-1`}>
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <CardContent className="p-0">
              <AnimatePresence>
                {recentActivity.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 ${theme.bgLight} rounded-2xl flex items-center justify-center`}>
                      <FileText className={`w-8 h-8 ${theme.iconColor}`} />
                    </div>
                    <p className="text-gray-500 font-medium">No recent activity</p>
                    <p className="text-sm text-gray-400 mt-1">Start by searching for a patient</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentActivity.map((activity, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl transition-colors ${
                            activity.type === 'view' ? theme.bgLight :
                            activity.type === 'create' ? 'bg-emerald-50' : 'bg-amber-50'
                          }`}>
                            {activity.type === 'view' && <FileText className={`w-5 h-5 ${theme.iconColor}`} />}
                            {activity.type === 'create' && <Activity className="w-5 h-5 text-emerald-600" />}
                            {activity.type === 'alert' && <Shield className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{activity.patient}</p>
                              <code className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {activity.ic}
                              </code>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-gray-400">{activity.time}</p>
                            <Badge variant="outline" className={`text-xs mt-1 ${theme.badgeClass}`}>
                              {activity.hospitals} hospital{activity.hospitals > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Status - Takes 1 column */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full overflow-hidden">
            <div className={`p-5 border-b ${theme.bgLight} bg-gradient-to-r from-white to-transparent`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`p-2.5 ${theme.bgMedium} rounded-xl`}>
                    <Globe className={`w-5 h-5 ${theme.iconColor}`} />
                  </div>
                  <motion.div
                    className={`absolute -top-0.5 -right-0.5 w-3 h-3 ${theme.pulseColor} rounded-full`}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Network Status</h2>
                  <p className="text-sm text-emerald-600 font-medium">All systems operational</p>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {hospitals.slice(0, 5).map((hospital, i) => {
                  const hospitalTheme = getHospitalTheme(hospital.id)
                  const latency = Math.floor(Math.random() * 40) + 20
                  const isCurrentHospital = hospital.id === user?.hospitalId
                  
                  return (
                    <motion.div
                      key={hospital.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isCurrentHospital 
                          ? `${theme.bgLight} ${theme.borderColor} border-2` 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {isCurrentHospital && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className={`text-[10px] px-1.5 py-0 ${theme.badgeClass} border shadow-sm`}>
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            You
                          </Badge>
                        </div>
                      )}
                      
                      <div 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-md ${hospitalTheme.iconBg}`}
                      >
                        {hospitalTheme.shortName}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {hospital.name}
                        </p>
                        <p className="text-xs text-gray-500">{hospital.city}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5">
                          <motion.div 
                            className={`w-2 h-2 rounded-full ${hospital.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                            animate={hospital.isActive ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <span className={`text-xs font-medium ${hospital.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {hospital.isActive ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{latency}ms</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              
              {/* Hospital Info Card */}
              <motion.div 
                className={`mt-5 p-4 rounded-xl bg-gradient-to-br ${theme.headerGradient} text-white`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-semibold">Your Hospital</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{theme.departments}</p>
                    <p className="text-[10px] text-white/70">Departments</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{theme.bedCount}</p>
                    <p className="text-[10px] text-white/70">Beds</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">24/7</p>
                    <p className="text-[10px] text-white/70">Emergency</p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* HOSPITAL SPECIALTIES SECTION */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={`p-5 border-b ${theme.bgLight}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 ${theme.bgMedium} rounded-xl`}>
                <Heart className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hospital Specialties</h2>
                <p className="text-sm text-gray-500">{theme.name} - Centers of Excellence</p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-3">
              {theme.specialties.map((specialty, index) => (
                <motion.div
                  key={specialty}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Badge className={`px-4 py-2 text-sm font-medium ${theme.badgeClass} border cursor-default`}>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {specialty}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
