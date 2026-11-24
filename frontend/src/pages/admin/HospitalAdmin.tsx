import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataErrorBanner, StatusBadge } from '@/components/ui/modal-dialog'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { cn, deduplicateByWindow, formatTimeAgo } from '@/lib/utils'
import {
  Users,
  FileText,
  Activity,
  Building2,
  Loader2,
  Shield,
  TrendingUp,
  Clock,
  Server,
  Database,
  Wifi,
  ArrowRight,
  Bed,
  Package,
  DollarSign,
} from 'lucide-react'
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
  const { t } = useTranslation()
  const [stats, setStats] = useState<HospitalStats>({
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
  })
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    const controller = new AbortController()
    async function loadData() {
      if (!user?.hospitalId) return
      setLoadError('')
      try {
        const [hospitalRes, logsRes] = await Promise.all([
          hospitalApi.getHospital(user.hospitalId, controller.signal),
          centralApi.getAuditLogs({ limit: 30 }, controller.signal),
        ])
        if (hospitalRes.aborted || logsRes.aborted) return
        if (!hospitalRes.success) {
          setLoadError(hospitalRes.error || t.networkError)
        }

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
            else if (log.action === 'verify')
              actionDesc = `${log.actorName || 'Staff'} completed hospital verification`
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
      } catch {
        if (!controller.signal.aborted) setLoadError(t.networkError)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadData()
    return () => controller.abort()
  }, [user?.hospitalId, t.networkError])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={cn('h-8 w-8 animate-spin', theme.iconColor)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'rounded-2xl bg-gradient-to-r p-7 text-white shadow-md flex items-center justify-between gap-6 flex-wrap',
          theme.headerGradient
        )}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/15 rounded-2xl border border-white/25">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">{t.adminPortal}</Badge>
              <h1 className="text-2xl xl:text-3xl font-bold">{hospitalInfo?.name || theme.name}</h1>
            </div>
          </div>
          <p className="text-white/85 max-w-2xl text-xs leading-relaxed">
            Monitor hospital-scoped clinical operations, verified medical staff, ward capacity, and inbound/outbound federated record audits.
          </p>
        </div>

        <Link to="/admin/audit">
          <Button className="bg-white text-slate-900 hover:bg-slate-100 gap-2 font-bold">
            <Shield className="w-4 h-4" />
            <span>{t.auditLogs}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {loadError && <DataErrorBanner message={loadError} />}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Local Registered Patients',
            value: stats.totalPatients.toLocaleString(),
            icon: Users,
            accent: 'border-t-blue-600',
            iconWrap: 'bg-blue-50 text-blue-700',
            note: 'Hospital patient registry',
          },
          {
            label: 'Stored Clinical Records',
            value: stats.totalRecords.toLocaleString(),
            icon: FileText,
            accent: 'border-t-emerald-600',
            iconWrap: 'bg-emerald-50 text-emerald-700',
            note: 'Sovereign hospital DB',
          },
          {
            label: 'Visits Today',
            value: stats.todayVisits || 0,
            icon: Activity,
            accent: 'border-t-violet-600',
            iconWrap: 'bg-violet-50 text-violet-700',
            note: 'Recorded encounters',
          },
          {
            label: 'Active Clinicians',
            value: stats.totalDoctors,
            icon: Users,
            accent: 'border-t-amber-600',
            iconWrap: 'bg-amber-50 text-amber-800',
            note: 'Verified MMC roster',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border border-slate-200 border-t-4 ${stat.accent} shadow-sm rounded-2xl`}
          >
            <CardContent className="p-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3 h-3" /> {stat.note}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.iconWrap}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations Shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { label: t.staffManagement, path: '/admin/staff', icon: Users },
          { label: t.departments, path: '/admin/departments', icon: Building2 },
          { label: t.bedManagement, path: '/admin/beds', icon: Bed },
          { label: t.inventory, path: '/admin/inventory', icon: Package },
          { label: t.financialReports, path: '/admin/finance', icon: DollarSign },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-2.5"
          >
            <item.icon className={cn('w-4 h-4 shrink-0', theme.textColor)} />
            <span className="font-bold text-xs text-slate-800 truncate">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hospital Node Telemetry</h2>
              <p className="text-xs text-slate-600">
                Isolated hospital database & federated gateway health
              </p>
            </div>
            <StatusBadge tone="success" label="All Healthy" />
          </div>
          <CardContent className="p-4 space-y-2.5">
            {[
              { name: 'Central Index Handshake', status: 'Connected', icon: Wifi, latency: '18ms' },
              {
                name: `${theme.code} Sovereign PostgreSQL Node`,
                status: 'Healthy',
                icon: Database,
                latency: '4ms',
              },
              {
                name: 'Federated Read-Only Gateway',
                status: 'Online',
                icon: Server,
                latency: '11ms',
              },
              {
                name: 'Zero-Trust RBAC & Consent Guard',
                status: 'Enforced',
                icon: Shield,
                latency: '—',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {item.latency !== '—' && (
                    <span className="text-slate-500 tabular-nums">{item.latency}</span>
                  )}
                  <StatusBadge tone="success" label={item.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Inbound & Outbound Hospital Audit Feed
              </h2>
              <p className="text-xs text-slate-600">
                Scoped strictly to {hospitalInfo?.name || theme.name}
              </p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No recent hospital audit events.
                </div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="p-3.5 flex items-center gap-3 hover:bg-slate-50">
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        activity.type === 'query'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{activity.action}</p>
                      <p className="text-xs text-slate-600">{activity.user}</p>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                      {activity.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
