import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { EmergencyReportModal } from '@/components/EmergencyReportModal'
import {
  Search,
  Shield,
  Eye,
  Download,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  FileText,
  Zap,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Siren,
} from 'lucide-react'
import { downloadCsvFile, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface AuditLog {
  id: string
  timestamp: string
  action: string
  userId: string
  userName: string
  userRole: string
  targetIcNumber?: string
  sourceHospital: string
  targetHospitals?: string[]
  status: 'success' | 'denied'
  details?: string
}

const ITEMS_PER_PAGE = 10

const ACTION_MAP: Record<string, string> = {
  query: 'CROSS_HOSPITAL_QUERY',
  view: 'RECORD_VIEW',
  create: 'RECORD_CREATE',
  update: 'RECORD_UPDATE',
  login: 'LOGIN',
  verify: 'HOSPITAL_VERIFY',
  logout: 'LOGOUT',
  emergency: 'EMERGENCY_ACCESS',
  emergency_access: 'EMERGENCY_ACCESS',
  consent_change: 'PATIENT_CONSENT_UPDATE',
  access_denied: 'ACCESS_DENIED',
}

export default function AuditLogs() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const initialTargetIc = searchParams.get('targetIcNumber') || ''
  const hospitalTheme = getHospitalTheme(user?.hospitalId)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialTargetIc)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmergency, setSelectedEmergency] = useState<AuditLog | null>(null)

  const loadLogs = async (overrideStart?: string, overrideEnd?: string) => {
    const effectiveStart = overrideStart !== undefined ? overrideStart : startDate
    const effectiveEnd = overrideEnd !== undefined ? overrideEnd : endDate
    try {
      const response = await centralApi.getAuditLogs({
        limit: 150,
        startDate: effectiveStart || undefined,
        endDate: effectiveEnd || undefined,
      })
      if (response.success && response.data) {
        const apiLogs = (response.data as Array<Record<string, unknown>>).map((log) => {
          const rawAction = String(log.action || '')
          const mappedAction =
            !log.success && rawAction !== 'emergency_access'
              ? ACTION_MAP[rawAction] || 'ACCESS_DENIED'
              : ACTION_MAP[rawAction] || 'RECORD_VIEW'
          return {
            id: String(log.id || ''),
            timestamp: String(log.timestamp || ''),
            action: mappedAction,
            userId: String(log.actorId || '').slice(0, 14) || 'System',
            userName: String(log.actorName || log.actorId || 'System'),
            userRole: String(log.actorType || 'unknown'),
            targetIcNumber: log.targetIcNumber ? String(log.targetIcNumber) : undefined,
            sourceHospital: String(log.hospitalName || log.actorHospitalId || 'Central Hub'),
            targetHospitals: log.targetHospitalId ? [String(log.targetHospitalId)] : undefined,
            status: log.success ? ('success' as const) : ('denied' as const),
            details: log.details ? String(log.details) : undefined,
          }
        })
        setLogs(apiLogs)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLogs()
  }

  const handleClearDates = () => {
    setStartDate('')
    setEndDate('')
    setRefreshing(true)
    loadLogs('', '')
  }

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      log.targetIcNumber?.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.userId.toLowerCase().includes(q) ||
      log.sourceHospital.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)

    const matchesFilter = filterAction === 'all' || log.action === filterAction
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAction])

  const handleExportCsv = () => {
    downloadCsvFile(
      `medlink-audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      ['Timestamp', 'Action', 'Actor Name', 'Role', 'Source Hospital', 'Target IC', 'Status', 'Details'],
      filteredLogs.map((l) => [
        l.timestamp,
        l.action,
        l.userName,
        l.userRole,
        l.sourceHospital,
        l.targetIcNumber || '',
        l.status,
        l.details || '',
      ])
    )
  }

  const getActionBadge = (action: string) => {
    const actionStyles: Record<string, { color: string; label: string }> = {
      CROSS_HOSPITAL_QUERY: { color: 'bg-blue-100 text-blue-700', label: 'Cross-Hospital Query' },
      RECORD_VIEW: { color: 'bg-emerald-100 text-emerald-700', label: 'Record View' },
      RECORD_CREATE: { color: 'bg-purple-100 text-purple-700', label: 'Record Create' },
      RECORD_UPDATE: { color: 'bg-indigo-100 text-indigo-700', label: 'Record Update' },
      LOGIN: { color: 'bg-slate-100 text-slate-700', label: 'Login' },
      HOSPITAL_VERIFY: { color: 'bg-cyan-100 text-cyan-700', label: 'Hospital Verify' },
      LOGOUT: { color: 'bg-gray-100 text-gray-600', label: 'Logout' },
      ACCESS_DENIED: { color: 'bg-red-100 text-red-700', label: 'Access Denied' },
      PATIENT_CONSENT_UPDATE: { color: 'bg-amber-100 text-amber-800', label: 'Privacy Consent' },
      EMERGENCY_ACCESS: { color: 'bg-orange-100 text-orange-800', label: 'Emergency Break-Glass' },
    }
    const style = actionStyles[action] || { color: 'bg-gray-100 text-gray-700', label: action }
    return <Badge className={style.color}>{style.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const stats = [
    {
      label: 'Cross-Hospital Queries',
      value: logs.filter((l) => l.action === 'CROSS_HOSPITAL_QUERY').length,
      icon: Eye,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Authorized Events',
      value: logs.filter((l) => l.status === 'success').length,
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Denied / Blocked',
      value: logs.filter((l) => l.status === 'denied').length,
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      label: 'Emergency Break-Glass',
      value: logs.filter((l) => l.action === 'EMERGENCY_ACCESS').length,
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <Badge variant="outline" className="text-xs">
                {user?.role === 'hospital_admin'
                  ? `Hospital Scoped: ${hospitalTheme.name}`
                  : 'National Network Scope'}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">
              Immutable zero-trust audit trail of clinical queries, consent changes, and break-glass events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" className="gap-2 h-11 px-4 rounded-xl" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
            <CardContent className="pt-5 pb-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by IC number, clinician name, hospital, or detail..."
                className="pl-10 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                title="Filter by action type"
                className="h-11 border border-gray-200 rounded-xl px-3 text-sm bg-white"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="CROSS_HOSPITAL_QUERY">Cross-Hospital Queries</option>
                <option value="RECORD_VIEW">Record Views</option>
                <option value="RECORD_CREATE">Record Creates</option>
                <option value="RECORD_UPDATE">Record Updates</option>
                <option value="PATIENT_CONSENT_UPDATE">Privacy Consent</option>
                <option value="LOGIN">Logins</option>
                <option value="HOSPITAL_VERIFY">Hospital Verifications</option>
                <option value="EMERGENCY_ACCESS">Emergency Break-Glass</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 bg-violet-50/70 rounded-xl border border-violet-100">
            <div className="flex items-center gap-2 text-violet-800 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>Date Range (Inclusive):</span>
            </div>
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 bg-white"
              />
              <span className="text-gray-400">→</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearDates} className="h-9">
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setRefreshing(true)
                  loadLogs()
                }}
                className="h-9 bg-violet-600 hover:bg-violet-700 text-white"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <CardHeader className="border-b bg-gray-50/50 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-600" />
            Audited Events
          </CardTitle>
          <Badge variant="secondary" className="rounded-full">
            {filteredLogs.length} entries
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No audit logs found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    log.action === 'EMERGENCY_ACCESS'
                      ? 'bg-orange-50/70 border-l-4 border-orange-500 cursor-pointer'
                      : log.status === 'denied'
                        ? 'bg-red-50/40 border-l-4 border-red-400'
                        : ''
                  }`}
                  onClick={() => log.action === 'EMERGENCY_ACCESS' && setSelectedEmergency(log)}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`mt-1 p-2 rounded-full ${
                        log.action === 'EMERGENCY_ACCESS'
                          ? 'bg-orange-500 text-white'
                          : log.status === 'success'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {log.action === 'EMERGENCY_ACCESS' ? (
                        <Siren className="w-4 h-4" />
                      ) : log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action)}
                        <span className="text-sm font-semibold text-gray-900">{log.userName}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.userRole.replace('_', ' ')}
                        </Badge>
                        {log.status === 'denied' && (
                          <Badge variant="destructive" className="text-[10px]">DENIED</Badge>
                        )}
                        {log.targetIcNumber && (
                          <span className="text-xs text-gray-600">
                            Target IC: <code className="font-mono font-semibold">{log.targetIcNumber}</code>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{log.sourceHospital}</span>
                        {log.targetHospitals && log.targetHospitals.length > 0 && (
                          <span className="text-violet-700 font-medium">
                            → {log.targetHospitals.join(', ')}
                          </span>
                        )}
                      </div>

                      {log.details && <p className="text-xs text-gray-600 mt-1.5">{log.details}</p>}
                    </div>

                    <div className="text-right shrink-0 text-xs text-gray-500">
                      <div className="flex items-center gap-1 justify-end font-medium text-gray-700">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="mt-0.5">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t bg-gray-50/50 text-xs text-gray-600">
              <span>
                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="px-2 font-semibold">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmergencyReportModal
        report={
          selectedEmergency
            ? {
                id: selectedEmergency.id,
                timestamp: selectedEmergency.timestamp,
                targetIcNumber: selectedEmergency.targetIcNumber,
                actorRole: selectedEmergency.userRole,
                actorId: selectedEmergency.userId,
                sourceLocation: selectedEmergency.sourceHospital,
                details: selectedEmergency.details,
                granted: selectedEmergency.status === 'success',
              }
            : null
        }
        onClose={() => setSelectedEmergency(null)}
      />
    </motion.div>
  )
}
