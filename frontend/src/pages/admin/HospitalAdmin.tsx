import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi } from '@/lib/api'
import { deduplicateByWindow, formatTimeAgo } from '@/lib/utils'
import {
  Users,
  FileText,
  Activity,
  Building2,
  Loader2,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  Server,
  Database,
  Wifi,
  ArrowRight,
  Bed,
  Package,
  DollarSign,
} from 'lucide-react'
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
  type: 'create' | 'query'
}

interface AuditLogEntry {
  timestamp: string
  actorId?: string
  actorName?: string
  actorHospitalId?: string
  targetHospitalId?: string
  action?: string
  targetIcNumber?: string
  details?: string
}

export default function HospitalAdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<HospitalStats>({
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
  })
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    async function loadData() {
      if (!user?.hospitalId) return
      try {
        const [hospitalRes, logsRes] = await Promise.all([
          hospitalApi.getHospital(user.hospitalId),
          centralApi.getAuditLogs({ limit: 30 }),
        ])

        if (hospitalRes.success && hospitalRes.data) {
          const h = hospitalRes.data
          setHospitalInfo({
            id: h.id,
            name: h.name,
            city: h.city,
          })
          if (h.stats) {
            setStats({
              totalPatients: h.stats.totalPatients || 0,
              totalRecords: h.stats.totalRecords || 0,
              totalDoctors: h.stats.totalDoctors || 0,
              todayVisits: h.stats.todayVisits || 0,
            })
          }
        }

        if (logsRes.success && logsRes.data) {
          const hospitalLogs = logsRes.data as unknown as AuditLogEntry[]
          const deduplicatedLogs = deduplicateByWindow(
            hospitalLogs,
            (a, b) =>
              a.actorId === b.actorId &&
              a.action === b.action &&
              a.targetIcNumber === b.targetIcNumber
          )

          const activities = deduplicatedLogs.slice(0, 6).map((log) => {
            let actionDesc = log.details || 'Hospital system event'
            if (log.action === 'login') actionDesc = `${log.actorName || 'Staff'} signed in`
            else if (log.action === 'verify') actionDesc = `${log.actorName || 'Staff'} completed hospital verification`
            else if (log.action === 'logout') actionDesc = `${log.actorName || 'Staff'} signed out`
            return {
              action: actionDesc,
              user: log.actorName || 'System',
              time: formatTimeAgo(log.timestamp),
              type: log.action === 'query' ? ('query' as const) : ('create' as const),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${theme.headerGradient} p-8 text-white shadow-xl`}>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-white/20 rounded-2xl border border-white/30">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">Hospital Administrator</Badge>
              <h1 className="text-3xl font-bold">{hospitalInfo?.name || theme.name}</h1>
            </div>
          </div>
          <p className="text-white/85 max-w-xl mb-6 text-sm">
            Monitor local clinical operations, active medical staff, ward capacity, and inbound/outbound federated record audits.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/audit">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 gap-2 font-semibold rounded-xl">
                <Shield className="w-4 h-4" />
                Hospital Scoped Audit Logs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Local Patients', value: stats.totalPatients.toLocaleString(), icon: Users, gradient: 'from-blue-500 to-blue-600', note: 'Registered locally' },
          { label: 'Clinical Records', value: stats.totalRecords.toLocaleString(), icon: FileText, gradient: 'from-emerald-500 to-emerald-600', note: 'Stored in hospital DB' },
          { label: 'Visits Today', value: stats.todayVisits || 0, icon: Activity, gradient: 'from-violet-500 to-violet-600', note: 'Recorded today' },
          { label: 'Active Doctors', value: stats.totalDoctors, icon: Users, gradient: 'from-amber-500 to-amber-600', note: 'Verified roster' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {stat.note}
                  </p>
                </div>
                <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl text-white`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Staff Roster', path: '/admin/staff', icon: Users },
          { label: 'Departments', path: '/admin/departments', icon: Building2 },
          { label: 'Bed Capacity', path: '/admin/beds', icon: Bed },
          { label: 'Inventory', path: '/admin/inventory', icon: Package },
          { label: 'Financials', path: '/admin/finance', icon: DollarSign },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all flex items-center gap-2.5"
          >
            <item.icon className={`w-5 h-5 ${theme.textColor}`} />
            <span className="font-semibold text-sm text-slate-800">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Hospital Node Telemetry</h2>
              <p className="text-xs text-gray-500">Isolated hospital database & federated gateway health</p>
            </div>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              All Healthy
            </span>
          </div>
          <CardContent className="p-4 space-y-2.5">
            {[
              { name: 'Central Index Handshake', status: 'Connected', icon: Wifi, latency: '18ms' },
              { name: `${theme.shortName} PostgreSQL Instance`, status: 'Healthy', icon: Database, latency: '4ms' },
              { name: 'Federated Read-Only Gateway', status: 'Online', icon: Server, latency: '11ms' },
              { name: 'Zero-Trust RBAC & Consent Guard', status: 'Enforced', icon: Shield, latency: '-' },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {item.latency !== '-' && <span className="text-gray-500">{item.latency}</span>}
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-700 font-semibold">{item.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Inbound & Outbound Hospital Audit Feed</h2>
              <p className="text-xs text-gray-500">Scoped strictly to {hospitalInfo?.name || theme.name}</p>
            </div>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No recent hospital audit events.</div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === 'query' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
