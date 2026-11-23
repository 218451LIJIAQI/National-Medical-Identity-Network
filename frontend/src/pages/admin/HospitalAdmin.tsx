import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi, type AuditLogDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatRelativeTime } from '@/lib/utils'
import {
  Users, FileText, Activity, Building2, Loader2, Shield, Clock,
  Bed, Package, DollarSign, ArrowRight,
} from 'lucide-react'

export default function HospitalAdminDashboard() {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [stats, setStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    activeDoctors: 0,
    todayVisits: 0,
  })
  const [recentLogs, setRecentLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHospitalAdmin() {
      if (!user?.hospitalId) return
      try {
        const [statsRes, logsRes] = await Promise.all([
          hospitalApi.getStats(user.hospitalId),
          centralApi.getAuditLogs({ limit: 10 }),
        ])
        if (statsRes.success && statsRes.data) {
          setStats({
            totalPatients: statsRes.data.totalPatients,
            totalRecords: statsRes.data.totalRecords,
            activeDoctors: statsRes.data.activeDoctors,
            todayVisits: statsRes.data.todayVisits,
          })
        }
        if (logsRes.success && logsRes.data) {
          setRecentLogs(logsRes.data)
        }
      } finally {
        setLoading(false)
      }
    }
    void loadHospitalAdmin()
  }, [user?.hospitalId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  const metricCards = [
    { label: 'Registered Patients', value: stats.totalPatients, icon: Users, wrap: 'bg-blue-100 text-blue-600' },
    { label: 'Clinical Encounters', value: stats.totalRecords, icon: FileText, wrap: 'bg-emerald-100 text-emerald-600' },
    { label: 'Active Doctors', value: stats.activeDoctors, icon: Shield, wrap: 'bg-violet-100 text-violet-600' },
    { label: "Today's Visits", value: stats.todayVisits, icon: Clock, wrap: 'bg-amber-100 text-amber-600' },
  ]

  const quickModules = [
    { title: 'Staff Directory', desc: 'Doctors, nurses & shift rosters', path: '/admin/staff', icon: Users },
    { title: 'Departments', desc: `${theme.departments} clinical units`, path: '/admin/departments', icon: Building2 },
    { title: 'Bed Allocation', desc: `${theme.bedCount} total ward beds`, path: '/admin/beds', icon: Bed },
    { title: 'Medical Inventory', desc: 'Pharmacy & consumable stock', path: '/admin/inventory', icon: Package },
    { title: 'Financial Reports', desc: 'Subsidy & billing analytics', path: '/admin/finance', icon: DollarSign },
    { title: 'Hospital Audit Trail', desc: 'Scoped security & query logs', path: '/admin/audit', icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl bg-gradient-to-r ${theme.headerGradient} p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <Badge className="bg-white/20 text-white border-white/30 mb-2">
            Hospital Node Administration
          </Badge>
          <h1 className="text-3xl font-bold">{theme.name}</h1>
          <p className="text-white/85 text-sm mt-1">
            {theme.city}, {theme.state} &middot; Connected to MedLink MY National Hub
          </p>
        </div>
        <Link to="/admin/audit">
          <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl gap-2">
            View Audit Logs
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-slate-200/80">
              <CardContent className="p-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${card.wrap}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-600">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-slate-200/80 lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Hospital Operations Modules</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickModules.map((mod) => {
                const Icon = mod.icon
                return (
                  <Link
                    key={mod.path}
                    to={mod.path}
                    className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className={`p-2.5 rounded-xl ${theme.bgLight} ${theme.textColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{mod.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Node Activity</h2>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No recent audit events.</p>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-gray-900">
                      <span>{log.actorName || 'Staff'}</span>
                      <span className="text-gray-400 font-normal">{formatRelativeTime(log.timestamp)}</span>
                    </div>
                    <p className="text-gray-600 mt-1 line-clamp-2">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
