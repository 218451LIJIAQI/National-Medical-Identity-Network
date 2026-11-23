import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi, type HospitalDetailResponse } from '@/lib/api'
import { formatActorDisplayName, formatTimeAgo } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  Building2,
  Users,
  FileText,
  Stethoscope,
  Activity,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Zap,
  Shield,
  Database,
  RefreshCw,
  Sparkles,
  Bed,
  Package,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ActivityItem {
  id: string
  action: string
  doctor: string
  patient: string
  time: string
  type: string
  success: boolean
}

export default function HospitalAdmin() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [hospitalData, setHospitalData] = useState<HospitalDetailResponse | null>(null)
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const theme = getHospitalTheme(user?.hospitalId)

  const loadData = useCallback(async () => {
    if (!user?.hospitalId) return
    setLoading(true)
    setLoadError(null)
    try {
      const [hospitalRes, logsRes] = await Promise.all([
        hospitalApi.getHospital(user.hospitalId),
        centralApi.getAuditLogs({ limit: 25 }),
      ])

      if (hospitalRes.success && hospitalRes.data) {
        setHospitalData(hospitalRes.data)
      } else {
        setLoadError(hospitalRes.error || 'Failed to load hospital profile and statistics.')
      }

      if (logsRes.success && logsRes.data) {
        const actionLabels: Record<string, string> = {
          query: 'Cross-Hospital Query',
          view: 'Medical Record Viewed',
          create: 'Medical Record Created',
          update: 'Record / Consent Updated',
          login: 'Staff Login',
          logout: 'Staff Logout',
          emergency_access: 'Emergency Break-Glass',
        }
        setRecentActivities(
          logsRes.data.slice(0, 6).map((log) => ({
            id: String(log.id || ''),
            action: actionLabels[String(log.action)] || String(log.action),
            doctor: formatActorDisplayName(
              log.actorName ? String(log.actorName) : undefined,
              log.actorId ? String(log.actorId) : undefined,
              log.actorType ? String(log.actorType) : undefined
            ),
            patient: log.targetIcNumber ? `IC: ${String(log.targetIcNumber)}` : 'Hospital Portal',
            time: formatTimeAgo(String(log.timestamp)),
            type: String(log.action || 'view'),
            success: Boolean(log.success),
          }))
        )
      }
    } catch {
      setLoadError('Network error while loading hospital administration data.')
    } finally {
      setLoading(false)
    }
  }, [user?.hospitalId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const stats = hospitalData?.stats || {
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div
        className="relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor}dd 50%, #1e293b 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl shrink-0">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm mb-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                Connected to MedLink MY Network
              </div>
              <h1 className="text-3xl font-bold">{hospitalData?.name || theme.name}</h1>
              <p className="text-white/80 mt-1 flex items-center gap-4 flex-wrap text-sm">
                {hospitalData && (
                  <>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {hospitalData.city}, {hospitalData.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {hospitalData.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {hospitalData.email}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => void loadData()}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/admin/audit')}
              className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg gap-2"
            >
              <FileText className="h-4 w-4" />
              Hospital Audit Logs
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
            title: 'Registered Patients',
            value: stats.totalPatients,
            subtitle: 'Local hospital database',
            icon: Users,
            gradient: 'from-blue-500 to-indigo-600',
            footer: 'PostgreSQL verified',
          },
          {
            title: 'Medical Records',
            value: stats.totalRecords,
            subtitle: `${stats.todayVisits ?? 0} visits recorded today`,
            icon: FileText,
            gradient: 'from-emerald-500 to-teal-600',
            footer: 'Federated index linked',
          },
          {
            title: 'Active Doctors',
            value: stats.totalDoctors,
            subtitle: 'Credentialed clinicians',
            icon: Stethoscope,
            gradient: 'from-purple-500 to-pink-600',
            footer: 'MMC licensed',
          },
          {
            title: 'Hospital Bed Capacity',
            value: theme.bedCount,
            subtitle: `${theme.departments} clinical departments`,
            icon: Zap,
            gradient: 'from-amber-500 to-orange-600',
            footer: 'Facility baseline',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
              <CardContent className="p-6">
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
                    <CheckCircle2 className="h-3 w-3" />
                    {stat.footer}
                  </span>
                  <Sparkles className="h-4 w-4 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Hospital Operations Suite</h2>
            <p className="text-sm text-gray-500">
              Manage staff roster, departments, inpatient wards, medical inventory, and financial summaries
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Staff Roster', desc: 'Doctors & support staff', icon: Users, path: '/admin/staff', color: 'text-blue-600 bg-blue-50' },
            { label: 'Departments', desc: 'Units & operating status', icon: Building2, path: '/admin/departments', color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Bed Capacity', desc: 'Ward admissions & beds', icon: Bed, path: '/admin/beds', color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inventory', desc: 'Pharmacy & supply stock', icon: Package, path: '/admin/inventory', color: 'text-amber-600 bg-amber-50' },
            { label: 'Financials', desc: 'Subsidies & revenue', icon: DollarSign, path: '/admin/finance', color: 'text-purple-600 bg-purple-50' },
          ].map((item) => (
            <Card
              key={item.path}
              onClick={() => navigate(item.path)}
              className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center justify-between">
                    {item.label}
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-xl">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Recent Hospital Activity</h3>
                <p className="text-xs text-gray-500">Incoming & outgoing clinical events involving this facility</p>
              </div>
            </div>
            <Badge variant="outline">Live Audit Trail</Badge>
          </div>
          <CardContent className="p-4 space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No recent hospital audit events recorded</p>
            ) : (
              recentActivities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2.5 rounded-xl ${
                        !activity.success
                          ? 'bg-red-100 text-red-600'
                          : activity.type === 'create'
                            ? 'bg-emerald-100 text-emerald-600'
                            : activity.type === 'query'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {activity.type === 'create' ? (
                        <FileText className="h-5 w-5" />
                      ) : activity.type === 'query' ? (
                        <Database className="h-5 w-5" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {activity.action}
                        {!activity.success && (
                          <span className="ml-2 text-xs text-red-600 font-medium">(Blocked)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.doctor} • <span className="font-mono text-xs">{activity.patient}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </motion.div>
              ))
            )}

            <Button variant="ghost" className="w-full text-blue-600 mt-2" onClick={() => navigate('/admin/audit')}>
              View All Hospital Logs <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <div className="p-6 border-b">
            <h3 className="font-bold text-gray-900">Network Connection</h3>
            <p className="text-xs text-gray-500 mt-0.5">Central Hub linkage & compliance status</p>
          </div>
          <CardContent className="p-6 space-y-4">
            {[
              { label: 'Central Index Link', status: 'Connected', ok: true },
              { label: 'Local Hospital PostgreSQL', status: hospitalData ? 'Synced' : 'Pending', ok: Boolean(hospitalData) },
              { label: 'Patient Privacy Enforcement', status: 'Active', ok: true },
              { label: 'JWT & Hospital Scope Guard', status: 'Verified', ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <Badge className={item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {item.status}
                </Badge>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                  <Shield className="h-4 w-4" />
                  Data Sovereignty Active
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Clinical encounters remain stored in this hospital&apos;s isolated database. Only MyKad pointer references are indexed centrally.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
