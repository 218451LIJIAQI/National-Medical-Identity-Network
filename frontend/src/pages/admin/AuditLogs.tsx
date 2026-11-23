import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { centralApi } from '@/lib/api'
import { exportToCsv } from '@/lib/workstation-storage'
import { formatActorDisplayName } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { EmergencyReportModal, type EmergencyReportData } from '@/components/EmergencyReportModal'
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Eye,
  Plus,
  Shield,
  Clock,
  Building2,
  User,
  Download,
  Siren,
  AlertTriangle,
  Calendar,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type AuditActionCode =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CROSS_HOSPITAL_QUERY'
  | 'RECORD_VIEW'
  | 'RECORD_CREATE'
  | 'RECORD_UPDATE'
  | 'PATIENT_CONSENT_UPDATE'
  | 'EMERGENCY_ACCESS'
  | 'ACCESS_DENIED'

interface AuditLog {
  id: string
  action: AuditActionCode
  rawAction: string
  userId?: string
  userName?: string
  userRole?: string
  targetIcNumber?: string
  sourceHospital?: string
  targetHospitals?: string[]
  details?: string
  ipAddress?: string
  timestamp: string
  success: boolean
}

const ACTION_MAP: Record<string, AuditActionCode> = {
  login: 'LOGIN',
  logout: 'LOGOUT',
  query: 'CROSS_HOSPITAL_QUERY',
  view: 'RECORD_VIEW',
  create: 'RECORD_CREATE',
  update: 'PATIENT_CONSENT_UPDATE',
  emergency_access: 'EMERGENCY_ACCESS',
}

function mapRawAuditAction(rawAction: string, actorType: string, details: string, success: boolean): AuditActionCode {
  if (!success && (rawAction === 'query' || rawAction === 'view')) {
    return 'ACCESS_DENIED'
  }
  if (rawAction === 'update') {
    if (actorType === 'patient' || details.toLowerCase().includes('privacy') || details.toLowerCase().includes('access')) {
      return 'PATIENT_CONSENT_UPDATE'
    }
    return 'RECORD_UPDATE'
  }
  return ACTION_MAP[rawAction] || 'RECORD_VIEW'
}

const actionConfig: Record<
  AuditActionCode,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string; isAlert?: boolean }
> = {
  LOGIN: { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100', label: 'User Login' },
  LOGOUT: { icon: LogOut, color: 'text-slate-600', bg: 'bg-slate-100', label: 'User Logout' },
  CROSS_HOSPITAL_QUERY: { icon: Search, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Cross-Hospital Query' },
  RECORD_VIEW: { icon: Eye, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Record Viewed' },
  RECORD_CREATE: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Record Created' },
  RECORD_UPDATE: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Record Updated' },
  PATIENT_CONSENT_UPDATE: { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Privacy Consent Updated' },
  EMERGENCY_ACCESS: { icon: Siren, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Emergency Access', isAlert: true },
  ACCESS_DENIED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Access Blocked', isAlert: true },
}

export default function AuditLogs() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmergencyLog, setSelectedEmergencyLog] = useState<AuditLog | null>(null)

  const loadLogs = useCallback(async (overrideStart?: string, overrideEnd?: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const effectiveStart = overrideStart !== undefined ? overrideStart : startDate
      const effectiveEnd = overrideEnd !== undefined ? overrideEnd : endDate
      const response = await centralApi.getAuditLogs({
        limit: 150,
        startDate: effectiveStart || undefined,
        endDate: effectiveEnd || undefined,
      })
      if (response.success && response.data) {
        const mappedLogs: AuditLog[] = response.data.map((raw) => {
          const rawAction = String(raw.action || 'view')
          const actorType = String(raw.actorType || '')
          const details = raw.details ? String(raw.details) : ''
          const success = Boolean(raw.success)
          const actorHospitalId = raw.actorHospitalId ? String(raw.actorHospitalId) : undefined
          const targetHospitalId = raw.targetHospitalId ? String(raw.targetHospitalId) : undefined
          const hospitalName = raw.hospitalName ? String(raw.hospitalName) : undefined
          return {
            id: String(raw.id || ''),
            action: mapRawAuditAction(rawAction, actorType, details, success),
            rawAction,
            userId: raw.actorId ? String(raw.actorId) : undefined,
            userName: formatActorDisplayName(
              raw.actorName ? String(raw.actorName) : undefined,
              raw.actorId ? String(raw.actorId) : undefined,
              actorType
            ),
            userRole: actorType || undefined,
            targetIcNumber: raw.targetIcNumber ? String(raw.targetIcNumber) : undefined,
            sourceHospital:
              hospitalName && hospitalName !== 'Central MedLink'
                ? hospitalName
                : actorHospitalId
                  ? getHospitalTheme(actorHospitalId).name
                  : undefined,
            targetHospitals: targetHospitalId ? [getHospitalTheme(targetHospitalId).name] : undefined,
            details: details || undefined,
            ipAddress: raw.ipAddress ? String(raw.ipAddress) : undefined,
            timestamp: String(raw.timestamp || new Date().toISOString()),
            success,
          }
        })
        setLogs(mappedLogs)
      } else {
        setLoadError(response.error || 'Failed to retrieve audit logs.')
      }
    } catch {
      setLoadError('Network error while loading audit logs.')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      log.targetIcNumber?.toLowerCase().includes(q) ||
      log.userId?.toLowerCase().includes(q) ||
      log.userName?.toLowerCase().includes(q) ||
      log.sourceHospital?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)

    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'success' && log.success) ||
      (statusFilter === 'failed' && !log.success)

    return matchesSearch && matchesAction && matchesStatus
  })

  const handleExportCsv = () => {
    exportToCsv(
      `medlink-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Timestamp', 'Action', 'Status', 'Actor Name', 'Actor Role', 'Source Hospital', 'Target IC', 'Details'],
      filteredLogs.map((log) => [
        new Date(log.timestamp).toISOString(),
        actionConfig[log.action]?.label || log.action,
        log.success ? 'Success' : 'Blocked/Failed',
        log.userName || log.userId || 'System',
        log.userRole || '-',
        log.sourceHospital || 'Central Hub',
        log.targetIcNumber || '-',
        log.details || '-',
      ])
    )
  }

  const stats = {
    total: logs.length,
    successful: logs.filter((l) => l.success).length,
    failed: logs.filter((l) => !l.success).length,
    queries: logs.filter((l) => l.action === 'CROSS_HOSPITAL_QUERY').length,
    emergency: logs.filter((l) => l.action === 'EMERGENCY_ACCESS').length,
  }

  const emergencyReport: EmergencyReportData | null = selectedEmergencyLog
    ? {
        id: selectedEmergencyLog.id,
        timestamp: selectedEmergencyLog.timestamp,
        targetIcNumber: selectedEmergencyLog.targetIcNumber,
        actorRole: selectedEmergencyLog.userName || selectedEmergencyLog.userRole || 'Emergency Responder',
        actorId: selectedEmergencyLog.userId || 'N/A',
        sourceLocation: selectedEmergencyLog.sourceHospital || selectedEmergencyLog.ipAddress || 'Emergency Terminal',
        details: selectedEmergencyLog.details,
        granted: selectedEmergencyLog.success,
      }
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl text-white">
              <FileText className="h-6 w-6" />
            </div>
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'hospital_admin' && user.hospitalId
              ? `Hospital-scoped security & clinical access trail for ${getHospitalTheme(user.hospitalId).name}`
              : 'Complete activity trail across the National Medical Identity Network'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadLogs()} className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV ({filteredLogs.length})
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-700 text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadLogs()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Events', value: stats.total, color: 'from-slate-500 to-slate-700', icon: FileText },
          { label: 'Successful', value: stats.successful, color: 'from-emerald-500 to-teal-600', icon: CheckCircle2 },
          { label: 'Blocked / Failed', value: stats.failed, color: 'from-red-500 to-rose-600', icon: XCircle },
          { label: 'Cross-Hospital Queries', value: stats.queries, color: 'from-purple-500 to-indigo-600', icon: Search },
          { label: 'Emergency Access', value: stats.emergency, color: 'from-orange-500 to-amber-600', icon: Siren, isAlert: stats.emergency > 0 },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`border-0 shadow-md ${stat.isAlert ? 'ring-2 ring-orange-400 bg-orange-50/30' : ''}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white ${stat.isAlert ? 'animate-pulse' : ''}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by IC number, actor name, hospital, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by action type"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">User Login</option>
              <option value="LOGOUT">User Logout</option>
              <option value="CROSS_HOSPITAL_QUERY">Cross-Hospital Query</option>
              <option value="RECORD_VIEW">Record Viewed</option>
              <option value="RECORD_CREATE">Record Created</option>
              <option value="RECORD_UPDATE">Record Updated</option>
              <option value="PATIENT_CONSENT_UPDATE">Privacy Consent Updated</option>
              <option value="ACCESS_DENIED">Access Blocked</option>
              <option value="EMERGENCY_ACCESS">Emergency Access</option>
            </select>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'success', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${
                    statusFilter === status ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Date Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              aria-label="Start date"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              aria-label="End date"
            />
            <Button size="sm" onClick={() => void loadLogs()} className="gap-1">
              Apply
            </Button>
            {(startDate || endDate) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  void loadLogs('', '')
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No audit logs matched your current filters</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredLogs.map((log, index) => {
                const config = actionConfig[log.action] || actionConfig.RECORD_VIEW
                const IconComponent = config.icon
                const isEmergency = log.action === 'EMERGENCY_ACCESS'
                const isDenied = log.action === 'ACCESS_DENIED' || !log.success

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.25) }}
                    onClick={() => isEmergency && setSelectedEmergencyLog(log)}
                    className={`p-4 transition-colors flex items-center gap-4 ${
                      isEmergency
                        ? 'bg-gradient-to-r from-orange-50 via-amber-50/50 to-transparent border-l-4 border-l-orange-500 hover:from-orange-100/70 cursor-pointer'
                        : isDenied
                          ? 'bg-red-50/30 border-l-4 border-l-red-400 hover:bg-red-50/60'
                          : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${config.bg} ${isEmergency ? 'ring-2 ring-orange-300 animate-pulse' : ''}`}>
                      <IconComponent className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${isEmergency ? 'text-orange-700' : 'text-gray-900'}`}>
                          {config.label}
                        </span>
                        {isEmergency && (
                          <Badge className="bg-orange-500 text-white text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            PRIORITY REVIEW
                          </Badge>
                        )}
                        {log.targetIcNumber && (
                          <Badge variant="outline" className="font-mono text-xs">
                            IC: {log.targetIcNumber}
                          </Badge>
                        )}
                        {log.sourceHospital && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {log.sourceHospital}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        {log.userName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.userName}
                            {log.userRole && <span className="text-gray-400">({log.userRole})</span>}
                          </span>
                        )}
                        {log.targetHospitals && log.targetHospitals.length > 0 && (
                          <span>→ Target: {log.targetHospitals.join(', ')}</span>
                        )}
                        {log.details && <span className="text-gray-600 truncate max-w-md">{log.details}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</div>
                      </div>

                      {isEmergency && (
                        <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Details
                        </Button>
                      )}

                      <Badge
                        className={
                          log.success
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }
                      >
                        {log.success ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {log.success ? 'Success' : 'Blocked'}
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </Card>

      <EmergencyReportModal report={emergencyReport} onClose={() => setSelectedEmergencyLog(null)} />
    </motion.div>
  )
}
