import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi } from '@/lib/api'
import { Users, FileText, Activity, Building2, Loader2, Shield, TrendingUp, Clock, CheckCircle, Server, Database, Wifi, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

interface HospitalStats {
  totalPatients: number
  totalRecords: number
  totalDoctors: number
  todayVisits?: number
}

interface HospitalInfo {
  id: string
  name: string
  city: string
}

interface RecentActivity {
  action: string
  user: string
  time: string
  type: 'create' | 'query' | 'upload' | 'update'
}

export default function HospitalAdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<HospitalStats>({ totalPatients: 0, totalRecords: 0, totalDoctors: 0, todayVisits: 0 })
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    async function loadData() {
      if (!user?.hospitalId) return
      try {
        const [statsRes, hospitalRes, logsRes] = await Promise.all([
          hospitalApi.getStats(user.hospitalId),
          hospitalApi.getHospital(user.hospitalId),
          centralApi.getAuditLogs({ limit: 20 }),
        ])

        if (statsRes.success && statsRes.data) {
          setStats({
            totalPatients: statsRes.data.totalPatients || 0,
            totalRecords: statsRes.data.totalRecords || 0,
            totalDoctors: statsRes.data.activeDoctors || 0,
            todayVisits: statsRes.data.todayVisits || 0,
          })
        }

        if (hospitalRes.success && hospitalRes.data) {
          const h = hospitalRes.data as any
          setHospitalInfo({
            id: h.id,
            name: h.name,
            city: h.city,
          })
        }

        if (logsRes.success && logsRes.data) {
          const hospitalLogs = (logsRes.data as any[])
            .filter((log: any) =>
              log.actorHospitalId === user.hospitalId ||
              !log.actorHospitalId
            )

          const deduplicatedLogs: any[] = []
          for (const log of hospitalLogs) {
            const lastLog = deduplicatedLogs[deduplicatedLogs.length - 1]
            if (lastLog &&
                lastLog.actorId === log.actorId &&
                lastLog.action === log.action &&
                lastLog.targetIcNumber === log.targetIcNumber) {
              const timeDiff = Math.abs(new Date(lastLog.timestamp).getTime() - new Date(log.timestamp).getTime())
              if (timeDiff < 5 * 60 * 1000) {
                continue
              }
            }
            deduplicatedLogs.push(log)
          }

          const activities = deduplicatedLogs.slice(0, 4).map((log: any) => {
            const logDate = new Date(log.timestamp)
            const now = new Date()
            const diffMs = now.getTime() - logDate.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)

            let timeAgo = ''
            if (diffMins < 1) {
              timeAgo = 'Just now'
            } else if (diffMins < 60) {
              timeAgo = `${diffMins} mins ago`
            } else if (diffHours < 24) {
              timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
            } else {
              timeAgo = `${Math.floor(diffHours / 24)} days ago`
            }

            let actionDesc = log.details || 'System action'
            if (log.action === 'login') actionDesc = `${log.actorName || 'User'} logged in successfully`
            else if (log.action === 'logout') actionDesc = `${log.actorName || 'User'} logged out`
            else if (log.action === 'query') actionDesc = log.details || 'Cross-hospital query'
            else if (log.action === 'view') actionDesc = log.details || 'Viewed patient record'
            else if (log.action === 'create') actionDesc = log.details || 'Created new record'

            return {
              action: actionDesc,
              user: log.actorName || 'System',
              time: timeAgo,
              type: log.action === 'query' ? 'query' as const : 'create' as const,
            }
          })
          setRecentActivity(activities)
        }
      } catch (error) {
        console.error('Failed to load hospital data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.hospitalId])

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
          <p className="text-gray-500">Loading hospital data...</p>
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
            <motion.div
        variants={itemVariants}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.headerGradient} p-8 text-white shadow-2xl ${theme.shadowColor}`}
      >
        <motion.div
          className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Building2 className="w-9 h-9 drop-shadow" />
            </motion.div>
            <div>
              <Badge variant="glass" className="mb-2">🏥 Hospital Administrator</Badge>
              <h1 className="text-4xl font-bold drop-shadow-lg">{hospitalInfo?.name || 'Hospital'}</h1>
            </div>
          </div>
          <p className="text-white/80 max-w-xl mb-6">
            Manage your hospital's medical records and monitor network connectivity with the National Medical Identity Network.
          </p>
          <div className="flex gap-3">
            <Link to="/admin/audit">
              <Button variant="outline" className="bg-white/90 hover:bg-white border-white/50 gap-2" style={{ color: theme.primaryColor }}>
                <Shield className="w-4 h-4" />
                View Audit Logs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Patients',
            value: stats.totalPatients.toLocaleString(),
            icon: Users,
            gradient: 'from-blue-500 to-blue-600',
            change: '+12 this week',
            changeType: 'up'
          },
          {
            label: 'Medical Records',
            value: stats.totalRecords.toLocaleString(),
            icon: FileText,
            gradient: 'from-emerald-500 to-emerald-600',
            change: '+45 this week',
            changeType: 'up'
          },
          {
            label: 'Visits Today',
            value: stats.todayVisits || 0,
            icon: Activity,
            gradient: 'from-violet-500 to-violet-600',
            change: 'Today\'s activity',
            changeType: 'up'
          },
          {
            label: 'Active Doctors',
            value: stats.totalDoctors,
            icon: Users,
            gradient: 'from-amber-500 to-amber-600',
            change: 'Currently online',
            changeType: 'status'
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.changeType === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                      {stat.changeType === 'status' && <Clock className="w-3 h-3 text-amber-500" />}
                      <span className={`text-xs ${stat.changeType === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {stat.change}
                      </span>
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

            <div className="grid lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">All systems operational</p>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { name: 'Central Hub Connection', status: 'Connected', icon: Wifi, latency: '23ms' },
                  { name: 'Database Status', status: 'Healthy', icon: Database, latency: '5ms' },
                  { name: 'API Gateway', status: 'Online', icon: Server, latency: '12ms' },
                  { name: 'Security Module', status: 'Active', icon: Shield, latency: '-' },
                ].map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <item.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.latency !== '-' && (
                        <span className="text-xs text-gray-500">{item.latency}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600 font-medium">{item.status}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

                <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-sm text-gray-500">Latest actions in your hospital</p>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No recent activity
                  </div>
                ) : recentActivity.map((activity, i) => (
                  <motion.div
                    key={i}
                    className="p-4 hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'create' ? 'bg-blue-100' :
                        activity.type === 'query' ? 'bg-violet-100' :
                        activity.type === 'upload' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        <Activity className={`w-4 h-4 ${
                          activity.type === 'create' ? 'text-blue-600' :
                          activity.type === 'query' ? 'text-violet-600' :
                          activity.type === 'upload' ? 'text-emerald-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
