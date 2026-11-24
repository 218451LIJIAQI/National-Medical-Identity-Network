import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataErrorBanner, EmptyStatePanel, StatusBadge } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'
import { centralApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from '@/lib/i18n'
import { getHospitalTheme, hospitalThemes } from '@/lib/hospital-themes'
import { EmergencyReportModal } from '@/components/EmergencyReportModal'
import {
  Search,
  Shield,
  Eye,
  Download,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
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
import { cn, downloadCsvFile, formatDate, formatIC } from '@/lib/utils'

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

function resolveActionCategory(rawAction: string, actorType: string, success: boolean): string {
  if (rawAction === 'emergency' || rawAction === 'emergency_access') {
    return 'EMERGENCY_ACCESS'
  }
  if (!success) {
    return 'ACCESS_DENIED'
  }
  if (actorType === 'patient' && rawAction === 'update') {
    return 'PATIENT_CONSENT_UPDATE'
  }
  return ACTION_MAP[rawAction] || 'RECORD_VIEW'
}

function resolveHospitalLabel(idOrName: string): string {
  if (hospitalThemes[idOrName]) {
    return hospitalThemes[idOrName].name
  }
  return idOrName
}

export default function AuditLogs() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const urlTargetIc = searchParams.get('targetIcNumber') || ''
  const hospitalTheme = getHospitalTheme(user?.hospitalId)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState(urlTargetIc)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmergency, setSelectedEmergency] = useState<AuditLog | null>(null)

  useEffect(() => {
    if (urlTargetIc) {
      setSearchTerm(urlTargetIc)
    }
  }, [urlTargetIc])

  const loadLogs = useCallback(
    async (overrideStart?: string, overrideEnd?: string, signal?: AbortSignal) => {
      const effectiveStart = overrideStart !== undefined ? overrideStart : startDate
      const effectiveEnd = overrideEnd !== undefined ? overrideEnd : endDate

      if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
        toast({
          title: 'Invalid Date Range',
          description: 'Start date cannot be later than end date.',
          variant: 'destructive',
        })
        setRefreshing(false)
        return
      }

      setLoadError('')
      try {
        const response = await centralApi.getAuditLogs(
          {
            limit: 150,
            startDate: effectiveStart || undefined,
            endDate: effectiveEnd || undefined,
          },
          signal
        )
        if (response.aborted) return
        if (!response.success) {
          setLoadError(response.error || t.networkError)
          toast({
            title: 'Audit Filter Rejected',
            description: response.error || 'Failed to load audit logs',
            variant: 'destructive',
          })
          return
        }
        if (response.data) {
          const apiLogs: AuditLog[] = response.data.map((log) => {
            const actorType = log.actorType || 'unknown'
            return {
              id: log.id,
              timestamp: log.timestamp,
              action: resolveActionCategory(log.action, actorType, log.success),
              userId: log.actorId.slice(0, 14) || 'System',
              userName: log.actorName || log.actorId || 'System',
              userRole: actorType,
              targetIcNumber: log.targetIcNumber || undefined,
              sourceHospital: log.hospitalName || log.actorHospitalId || 'Central Hub',
              targetHospitals: log.targetHospitalId
                ? [resolveHospitalLabel(log.targetHospitalId)]
                : undefined,
              status: log.success ? 'success' : 'denied',
              details: log.details || undefined,
            }
          })
          setLogs(apiLogs)
          setCurrentPage(1)
        }
      } catch {
        if (!signal?.aborted) setLoadError(t.networkError)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [startDate, endDate, toast, t.networkError]
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadLogs('', '', controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void loadLogs()
  }

  const handleClearDates = () => {
    setStartDate('')
    setEndDate('')
    setRefreshing(true)
    void loadLogs('', '')
  }

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.trim().toLowerCase()
    const normalizedQ = q.replace(/[-\s]/g, '')
    const normalizedTarget = (log.targetIcNumber || '').toLowerCase().replace(/[-\s]/g, '')

    const matchesSearch =
      !q ||
      log.targetIcNumber?.toLowerCase().includes(q) ||
      (normalizedQ.length >= 6 && normalizedTarget.includes(normalizedQ)) ||
      log.userName.toLowerCase().includes(q) ||
      log.userId.toLowerCase().includes(q) ||
      log.sourceHospital.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)

    const matchesFilter = filterAction === 'all' || log.action === filterAction
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAction])

  const handleExportCsv = () => {
    downloadCsvFile(
      `medlink-audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      [
        'Timestamp',
        'Action',
        'Actor Name',
        'Role',
        'Source Hospital',
        'Target IC',
        'Status',
        'Details',
      ],
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
      CROSS_HOSPITAL_QUERY: { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Cross-Hospital Query' },
      RECORD_VIEW: { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Record View' },
      RECORD_CREATE: { color: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Record Create' },
      RECORD_UPDATE: { color: 'bg-indigo-50 text-indigo-800 border-indigo-200', label: 'Record Update' },
      LOGIN: { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Login' },
      HOSPITAL_VERIFY: { color: 'bg-cyan-50 text-cyan-800 border-cyan-200', label: 'Hospital Verify' },
      LOGOUT: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Logout' },
      ACCESS_DENIED: { color: 'bg-red-50 text-red-900 border-red-300', label: 'Access Denied' },
      PATIENT_CONSENT_UPDATE: { color: 'bg-amber-50 text-amber-900 border-amber-300', label: 'Privacy Consent' },
      EMERGENCY_ACCESS: { color: 'bg-orange-50 text-orange-900 border-orange-300', label: 'Emergency Break-Glass' },
    }
    const style = actionStyles[action] || { color: 'bg-slate-100 text-slate-800 border-slate-200', label: action }
    return <Badge className={cn('border', style.color)}>{style.label}</Badge>
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
      accent: 'border-t-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-700',
    },
    {
      label: 'Authorized Events',
      value: logs.filter((l) => l.status === 'success').length,
      icon: CheckCircle2,
      accent: 'border-t-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
    },
    {
      label: 'Denied / Blocked',
      value: logs.filter((l) => l.status === 'denied').length,
      icon: AlertTriangle,
      accent: 'border-t-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-700',
    },
    {
      label: 'Emergency Break-Glass',
      value: logs.filter((l) => l.action === 'EMERGENCY_ACCESS').length,
      icon: Zap,
      accent: 'border-t-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-800',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-sm text-white">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{t.auditLogs}</h1>
              <Badge variant="outline" className="text-xs">
                {user?.role === 'hospital_admin'
                  ? `Hospital Scoped: ${hospitalTheme.name}`
                  : 'National Network Scope'}
              </Badge>
            </div>
            <p className="text-slate-600 text-xs mt-0.5">
              Immutable zero-trust audit trail of clinical queries, consent updates, and break-glass events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="bg-violet-700 hover:bg-violet-800 text-white gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.exportCsv}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`border border-slate-200 border-t-4 ${stat.accent} shadow-sm rounded-2xl`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">{stat.label}</p>
              </div>
              <div className={`p-2.5 ${stat.bgColor} rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={handleRefresh} />}

      <Card className="border border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-5 space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by MyKad IC, clinician name, hospital, or audit detail…"
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                title="Filter by action type"
                className="h-10 border border-slate-300 rounded-xl px-3 text-xs font-semibold bg-white text-slate-800"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="CROSS_HOSPITAL_QUERY">Cross-Hospital Queries</option>
                <option value="RECORD_VIEW">Record Views</option>
                <option value="RECORD_CREATE">Record Creates</option>
                <option value="RECORD_UPDATE">Record Updates</option>
                <option value="PATIENT_CONSENT_UPDATE">Privacy Consent Updates</option>
                <option value="ACCESS_DENIED">Access Denied / Blocked</option>
                <option value="LOGIN">Logins</option>
                <option value="HOSPITAL_VERIFY">Hospital Verifications</option>
                <option value="LOGOUT">Logouts</option>
                <option value="EMERGENCY_ACCESS">Emergency Break-Glass</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex-wrap">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
              <Calendar className="w-4 h-4 text-violet-700" />
              <span>Date Range (Inclusive UTC):</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Audit start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 bg-white w-40"
              />
              <span className="text-slate-400">→</span>
              <Input
                type="date"
                aria-label="Audit end date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 bg-white w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearDates}>
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setRefreshing(true)
                  void loadLogs()
                }}
                className="bg-violet-700 hover:bg-violet-800 text-white"
              >
                Apply Range
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" />
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-700" />
            <span>Audited Events</span>
          </CardTitle>
          <Badge variant="secondary" className="tabular-nums">
            {filteredLogs.length} entries
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedLogs.length === 0 ? (
            <div className="p-5">
              <EmptyStatePanel
                icon={FileText}
                hasActiveFilters={Boolean(searchTerm.trim() || filterAction !== 'all' || startDate || endDate)}
                onClearFilters={() => {
                  setSearchTerm('')
                  setFilterAction('all')
                  if (startDate || endDate) handleClearDates()
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedLogs.map((log) => {
                const isEmergency = log.action === 'EMERGENCY_ACCESS'
                return (
                  <div
                    key={log.id}
                    role={isEmergency ? 'button' : undefined}
                    tabIndex={isEmergency ? 0 : undefined}
                    onKeyDown={
                      isEmergency
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedEmergency(log)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'p-4 hover:bg-slate-50 transition-colors',
                      isEmergency &&
                        'bg-orange-50/60 border-l-4 border-orange-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
                      !isEmergency &&
                        log.status === 'denied' &&
                        'bg-red-50/40 border-l-4 border-red-600'
                    )}
                    onClick={() => isEmergency && setSelectedEmergency(log)}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          'mt-0.5 p-2 rounded-xl shrink-0',
                          isEmergency
                            ? 'bg-orange-600 text-white'
                            : log.status === 'success'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                        )}
                      >
                        {isEmergency ? (
                          <Siren className="w-4 h-4" />
                        ) : log.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log.action)}
                          <span className="text-sm font-bold text-slate-900">{log.userName}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.userRole.replace('_', ' ')}
                          </Badge>
                          <StatusBadge
                            tone={log.status === 'success' ? 'success' : 'blocked'}
                            label={log.status === 'success' ? 'Allowed' : 'Denied'}
                          />
                          {log.targetIcNumber && (
                            <span className="text-xs text-slate-700">
                              Target IC:{' '}
                              <code className="font-mono font-bold tabular-nums">
                                {formatIC(log.targetIcNumber)}
                              </code>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{log.sourceHospital}</span>
                          {log.targetHospitals && log.targetHospitals.length > 0 && (
                            <span className="text-violet-800 font-semibold">
                              → {log.targetHospitals.join(', ')}
                            </span>
                          )}
                        </div>

                        {log.details && (
                          <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0 text-xs text-slate-500 tabular-nums">
                        <div className="flex items-center gap-1 justify-end font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(log.timestamp).toLocaleTimeString('en-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </div>
                        <p className="mt-0.5">{formatDate(log.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredLogs.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-600 tabular-nums">
              <span>
                Showing {startIndex + 1}–
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} of{' '}
                {filteredLogs.length}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
                </Button>
                <span className="px-2 font-bold text-slate-800">
                  Page {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-0.5" />
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
    </div>
  )
}
