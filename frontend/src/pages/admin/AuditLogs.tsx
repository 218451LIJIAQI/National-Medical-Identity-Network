import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { centralApi } from '@/lib/api'
import { downloadTextFile, formatDateTime } from '@/lib/utils'
import {
  Search, Shield, Download, AlertTriangle, CheckCircle, Loader2,
  RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface NormalizedAuditRow {
  id: string
  timestamp: string
  actionCode: string
  actorName: string
  actorRole: string
  targetIcNumber: string
  hospitalName: string
  success: boolean
  details: string
}

const ITEMS_PER_PAGE = 12

const ACTION_BADGES: Record<string, { className: string; label: string }> = {
  CROSS_HOSPITAL_QUERY: { className: 'bg-blue-100 text-blue-700', label: 'Cross-Hospital Query' },
  RECORD_VIEW: { className: 'bg-emerald-100 text-emerald-700', label: 'Record View' },
  RECORD_CREATE: { className: 'bg-purple-100 text-purple-700', label: 'Record Create' },
  PATIENT_CONSENT_UPDATE: { className: 'bg-amber-100 text-amber-800', label: 'Consent Update' },
  ACCESS_DENIED: { className: 'bg-red-100 text-red-700', label: 'Access Denied' },
  EMERGENCY_ACCESS: { className: 'bg-orange-100 text-orange-800', label: 'Emergency Break-Glass' },
  LOGIN: { className: 'bg-slate-100 text-slate-700', label: 'Sign In' },
  LOGOUT: { className: 'bg-slate-100 text-slate-600', label: 'Sign Out' },
}

export default function AuditLogs() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<NormalizedAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const loadLogs = async () => {
    try {
      const response = await centralApi.getAuditLogs({
        limit: 150,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      if (response.success && response.data) {
        const mapped: NormalizedAuditRow[] = response.data.map((log) => {
          let actionCode = 'RECORD_VIEW'
          if (!log.success && (log.action === 'query' || log.action === 'view')) {
            actionCode = 'ACCESS_DENIED'
          } else if (log.action === 'query') {
            actionCode = 'CROSS_HOSPITAL_QUERY'
          } else if (log.action === 'create') {
            actionCode = 'RECORD_CREATE'
          } else if (log.action === 'update') {
            actionCode = 'PATIENT_CONSENT_UPDATE'
          } else if (log.action === 'emergency_access' || log.action === 'emergency') {
            actionCode = 'EMERGENCY_ACCESS'
          } else if (log.action === 'login') {
            actionCode = 'LOGIN'
          } else if (log.action === 'logout') {
            actionCode = 'LOGOUT'
          }

          return {
            id: log.id,
            timestamp: log.timestamp,
            actionCode,
            actorName: log.actorName || log.actorId || 'System',
            actorRole: log.actorType,
            targetIcNumber: log.targetIcNumber || '-',
            hospitalName: log.hospitalName || log.actorHospitalId || 'Central Hub',
            success: log.success,
            details: log.details,
          }
        })
        setLogs(mapped)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [startDate, endDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAction])

  const filteredLogs = logs.filter((row) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      row.targetIcNumber.toLowerCase().includes(q) ||
      row.actorName.toLowerCase().includes(q) ||
      row.hospitalName.toLowerCase().includes(q) ||
      row.details.toLowerCase().includes(q)
    const matchesAction = filterAction === 'all' || row.actionCode === filterAction
    return matchesSearch && matchesAction
  })

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleExportCsv = () => {
    const header = ['Timestamp', 'Action', 'Actor', 'Role', 'Hospital', 'Target IC', 'Status', 'Details']
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`
    const rows = filteredLogs.map((r) =>
      [
        r.timestamp,
        r.actionCode,
        r.actorName,
        r.actorRole,
        r.hospitalName,
        r.targetIcNumber,
        r.success ? 'SUCCESS' : 'DENIED',
        r.details,
      ]
        .map(escapeCsv)
        .join(',')
    )
    downloadTextFile(
      `medlink-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.join(','), ...rows].join('\n'),
      'text/csv;charset=utf-8'
    )
    toast({
      title: 'Audit CSV Exported',
      description: `Downloaded ${filteredLogs.length} audit log record(s).`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security &amp; Access Audit Trail</h1>
            <p className="text-sm text-gray-500">Immutable record of cross-hospital queries, consent updates, and break-glass events</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRefreshing(true)
              void loadLogs()
            }}
            disabled={refreshing}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportCsv} className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search IC, actor, hospital..."
                className="pl-9"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Event Types</option>
              {Object.entries(ACTION_BADGES).map(([code, meta]) => (
                <option key={code} value={code}>{meta.label}</option>
              ))}
            </select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-gray-500">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Hospital</th>
                  <th className="py-3 px-3">Target IC</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((row) => {
                  const badge = ACTION_BADGES[row.actionCode] || {
                    className: 'bg-gray-100 text-gray-700',
                    label: row.actionCode,
                  }
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDateTime(row.timestamp)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-900">{row.actorName}</td>
                      <td className="py-3 px-3 text-gray-600">{row.hospitalName}</td>
                      <td className="py-3 px-3 font-mono text-xs">{row.targetIcNumber}</td>
                      <td className="py-3 px-3">
                        {row.success ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Denied
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 max-w-xs truncate" title={row.details}>
                        {row.details}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>
              Showing {paginatedLogs.length} of {filteredLogs.length} event(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
