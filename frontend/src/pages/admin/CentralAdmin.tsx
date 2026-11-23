import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { formatTimeAgo, getHospitalColor } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  Globe,
  Building2,
  Users,
  Activity,
  Database,
  FileText,
  ArrowRight,
  Zap,
  CheckCircle2,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
  Server,
  Radio,
  MapPin,
  Eye,
  RefreshCw,
  Siren,
  AlertCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Hospital {
  id: string
  name: string
  shortName: string
  city: string
  state: string
  isActive: boolean
}

interface NetworkActivityItem {
  id: string
  from: string
  to: string
  action: string
  time: string
  status: string
}

const malaysiaMapPositions: Record<string, { x: number; y: number; region: 'peninsular' | 'east' }> = {
  'hospital-kl': { x: 24, y: 58, region: 'peninsular' },
  'hospital-penang': { x: 18, y: 32, region: 'peninsular' },
  'hospital-jb': { x: 30, y: 78, region: 'peninsular' },
  'hospital-kuching': { x: 58, y: 68, region: 'east' },
  'hospital-kk': { x: 78, y: 35, region: 'east' },
}

export default function CentralAdmin() {
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeHospitals: 0,
    todayQueries: 0,
    yesterdayQueries: 0,
    queryChangePercent: 0,
    newHospitalsThisMonth: 0,
    avgResponseTime: 45,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null)
  const [activeConnection, setActiveConnection] = useState<number>(0)
  const [networkActivity, setNetworkActivity] = useState<NetworkActivityItem[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [hospitalsRes, statsRes, logsRes] = await Promise.all([
        centralApi.getHospitals(),
        centralApi.getStats(),
        centralApi.getAuditLogs({ limit: 8 }),
      ])

      if (hospitalsRes.success && hospitalsRes.data) {
        setHospitals(hospitalsRes.data)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
      if (!hospitalsRes.success && !statsRes.success) {
        setLoadError(hospitalsRes.error || statsRes.error || 'Failed to load National Command Center metrics.')
      }

      if (logsRes.success && logsRes.data) {
        const actionLabels: Record<string, string> = {
          query: 'Cross-Hospital Query',
          view: 'Record View',
          create: 'Record Sync',
          update: 'Privacy Update',
          login: 'Staff Login',
          logout: 'Staff Logout',
          emergency_access: 'Emergency Access',
        }
        setNetworkActivity(
          logsRes.data.slice(0, 6).map((log) => {
            const actorHospitalId = log.actorHospitalId ? String(log.actorHospitalId) : undefined
            const targetHospitalId = log.targetHospitalId ? String(log.targetHospitalId) : undefined
            const fromLabel =
              log.hospitalName && String(log.hospitalName) !== 'Central MedLink'
                ? String(log.hospitalName)
                : actorHospitalId
                  ? getHospitalTheme(actorHospitalId).shortName
                  : 'Central Hub'
            const toLabel = targetHospitalId
              ? getHospitalTheme(targetHospitalId).shortName
              : String(log.action) === 'query'
                ? 'Federated Nodes'
                : 'Central Index'
            return {
              id: String(log.id || ''),
              from: fromLabel,
              to: toLabel,
              action: actionLabels[String(log.action)] || String(log.action),
              time: formatTimeAgo(String(log.timestamp)),
              status: log.success ? 'success' : 'blocked',
            }
          })
        )
      }
    } catch {
      setLoadError('Network error while connecting to Central Command Hub.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (hospitals.length === 0) return
    const interval = setInterval(() => {
      setActiveConnection((prev) => (prev + 1) % hospitals.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [hospitals.length])

  const queryTrendLabel =
    stats.yesterdayQueries > 0
      ? `${stats.queryChangePercent >= 0 ? '+' : ''}${stats.queryChangePercent}% vs yesterday (${stats.yesterdayQueries})`
      : `${stats.todayQueries} logged today`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              National Healthcare Command Center
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Globe className="h-10 w-10 text-cyan-400" />
              MedLink MY Central Hub
            </h1>
            <p className="text-blue-200 mt-2 text-lg max-w-2xl">
              Real-time monitoring and governance of Malaysia&apos;s National Medical Identity Network
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void loadData()}
              variant="secondary"
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/admin/index')}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm gap-2"
            >
              <Database className="h-4 w-4" />
              Patient Index
            </Button>
            <Button
              onClick={() => navigate('/admin/audit')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25 gap-2"
            >
              <FileText className="h-4 w-4" />
              Audit Logs
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-700 text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Connected Hospitals',
            value: stats.activeHospitals,
            subtitle:
              stats.newHospitalsThisMonth > 0
                ? `+${stats.newHospitalsThisMonth} onboarded this month`
                : 'All federated sites online',
            icon: Building2,
            gradient: 'from-blue-500 to-indigo-600',
            change: 'Active network',
          },
          {
            title: 'Indexed Patients',
            value: stats.totalPatients.toLocaleString(),
            subtitle: 'Nationwide MyKad pointer registry',
            icon: Users,
            gradient: 'from-emerald-500 to-teal-600',
            change: 'Zero central PHI',
          },
          {
            title: 'Cross-Hospital Queries',
            value: stats.todayQueries,
            subtitle: 'Today',
            icon: Zap,
            gradient: 'from-purple-500 to-pink-600',
            change: queryTrendLabel,
          },
          {
            title: 'Avg Query Latency',
            value: `${stats.avgResponseTime}ms`,
            subtitle: 'Parallel federated dispatch',
            icon: Clock,
            gradient: 'from-amber-500 to-orange-600',
            change: 'Sub-second SLA',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {loading ? '-' : stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.change}
                  </span>
                  <Sparkles className="h-4 w-4 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl">
                  <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Live Network Topology</h3>
                  <p className="text-slate-400 text-sm">Real-time data synchronization across Malaysia</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-ping" />
                Live
              </Badge>
            </div>
          </div>

          <CardContent className="p-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative h-96">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M12,25 Q20,20 28,28 L32,45 Q35,60 32,75 L28,85 Q22,82 18,70 L15,50 Q10,35 12,25 Z"
                fill="url(#peninsulaGrad)"
                stroke="#38bdf8"
                strokeWidth="0.5"
              />
              <path
                d="M50,55 Q60,50 75,30 L85,28 Q88,35 82,45 L78,60 Q70,72 55,75 L48,68 Q48,60 50,55 Z"
                fill="url(#borneoGrad)"
                stroke="#38bdf8"
                strokeWidth="0.5"
              />
              <defs>
                <linearGradient id="peninsulaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="borneoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>

            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-cyan-500/20 rounded-full animate-ping" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50 border-2 border-white/30">
                  <Server className="h-8 w-8 text-white" />
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-cyan-400 whitespace-nowrap">
                  CENTRAL HUB
                </span>
              </div>
            </motion.div>

            <svg className="absolute inset-0 w-full h-full z-10">
              {hospitals.map((h, i) => {
                const pos = malaysiaMapPositions[h.id] || { x: 20 + i * 15, y: 30 + (i % 2) * 40 }
                const isActive = activeConnection === i
                return (
                  <g key={h.id}>
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`${pos.x}%`}
                      y2={`${pos.y}%`}
                      stroke={isActive ? '#22d3ee' : '#475569'}
                      strokeWidth={isActive ? '2' : '1'}
                      strokeDasharray={isActive ? '0' : '4'}
                    />
                    {isActive && (
                      <motion.circle
                        r="4"
                        fill="#22d3ee"
                        initial={{ cx: '50%', cy: '50%' }}
                        animate={{ cx: `${pos.x}%`, cy: `${pos.y}%` }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            {hospitals.map((hospital, i) => {
              const pos = malaysiaMapPositions[hospital.id] || { x: 20 + i * 15, y: 30 + (i % 2) * 40 }
              const color = getHospitalColor(hospital.id)
              const isSelected = selectedHospital === hospital.id
              const isActive = activeConnection === i

              return (
                <motion.div
                  key={hospital.id}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setSelectedHospital(isSelected ? null : hospital.id)}
                >
                  <div className="relative group">
                    {isActive && (
                      <div className="absolute -inset-2 rounded-full animate-ping" style={{ backgroundColor: `${color}40` }} />
                    )}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/30 transition-transform"
                      style={{ backgroundColor: color }}
                    >
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-semibold text-white bg-slate-800/90 px-2 py-0.5 rounded">
                        {hospital.shortName}
                      </span>
                    </div>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-white text-gray-900 rounded-lg shadow-xl p-3 text-xs whitespace-nowrap">
                        <p className="font-bold">{hospital.name}</p>
                        <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {hospital.city}, {hospital.state}
                        </p>
                        <div className="flex items-center gap-1 text-emerald-600 mt-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400" /> Active Sync
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-600" /> Standby
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <div className="p-6 border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Network Activity</h3>
              </div>
              <Badge variant="outline" className="text-xs">Live Audit Feed</Badge>
            </div>
          </div>
          <CardContent className="p-4 space-y-3">
            {networkActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No recent network events recorded</p>
            ) : (
              networkActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">{activity.action}</span>
                    <Badge
                      className={
                        activity.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700 text-xs'
                          : 'bg-red-100 text-red-700 text-xs'
                      }
                    >
                      {activity.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {activity.status === 'success' ? 'Done' : 'Blocked'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="font-medium text-blue-600">{activity.from}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-purple-600">{activity.to}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </motion.div>
              ))
            )}

            <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 mt-2" onClick={() => navigate('/admin/audit')}>
              View All Activity <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-gray-900">Connected Healthcare Institutions</h3>
            <p className="text-gray-500 text-sm mt-0.5">All hospitals participating in the National Medical Identity Network</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700">
            {hospitals.filter((h) => h.isActive).length} of {hospitals.length} Online
          </Badge>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((hospital, index) => {
              const color = getHospitalColor(hospital.id)
              return (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="p-5 rounded-2xl border-2 hover:shadow-lg transition-all cursor-pointer bg-white"
                  style={{ borderColor: `${color}40` }}
                  onClick={() => navigate('/admin/index')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: color }}
                      >
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{hospital.shortName}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{hospital.name}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                      Online
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {hospital.city}, {hospital.state}
                    </span>
                    <span className="text-blue-600 font-medium flex items-center gap-1 hover:underline">
                      <Eye className="h-3.5 w-3.5" /> Inspect Index
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Patient Index Directory',
            desc: 'Browse and inspect all indexed patient records across Malaysia',
            icon: Database,
            gradient: 'from-blue-500 to-indigo-600',
            path: '/admin/index',
          },
          {
            title: 'Security & Audit Logs',
            desc: 'Monitor cross-hospital queries, logins, and blocked attempts',
            icon: Shield,
            gradient: 'from-purple-500 to-pink-600',
            path: '/admin/audit',
          },
          {
            title: 'Emergency Access Review',
            desc: 'Audit break-glass emergency lookups and incident logs',
            icon: Siren,
            gradient: 'from-orange-500 to-red-600',
            path: '/admin/emergency',
          },
          {
            title: 'Refresh Telemetry',
            desc: 'Re-synchronize central hub statistics and node health',
            icon: Server,
            gradient: 'from-emerald-500 to-teal-600',
            path: '',
          },
        ].map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            whileHover={{ y: -4 }}
            onClick={() => (action.path ? navigate(action.path) : void loadData())}
            className="cursor-pointer"
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-lg shrink-0`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 flex items-center justify-between">
                    {action.title}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
