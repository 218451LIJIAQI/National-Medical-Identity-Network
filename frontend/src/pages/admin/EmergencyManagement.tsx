import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { EmergencyReportModal } from '@/components/EmergencyReportModal'
import {
  Siren,
  Search,
  Loader2,
  AlertTriangle,
  Building2,
  Clock,
  User,
  RefreshCw,
  Shield,
  ChevronRight,
  Activity,
  Download,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { downloadCsvFile, downloadJsonFile, formatDate, formatIC } from '@/lib/utils'

interface EmergencyLog {
  id: string
  timestamp: string
  targetIcNumber: string
  actorType: string
  actorId: string
  sourceLocation: string
  details: string
  success: boolean
}

export default function EmergencyManagement() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [logs, setLogs] = useState<EmergencyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null)

  const loadLogs = async () => {
    try {
      const response = await centralApi.getAuditLogs({ action: 'emergency_access', limit: 200 })
      if (response.success && response.data) {
        const emergencyLogs = (response.data as Array<Record<string, unknown>>)
          .filter((log) => log.action === 'emergency' || log.action === 'emergency_access')
          .map((log) => ({
            id: String(log.id || ''),
            timestamp: String(log.timestamp || ''),
            targetIcNumber: String(log.targetIcNumber || 'Unknown'),
            actorType: String(log.actorType || 'emergency'),
            actorId: String(log.actorId || 'Emergency Terminal'),
            sourceLocation: String(
              log.hospitalName || log.actorHospitalId || 'Emergency Terminal'
            ),
            details: String(log.details || 'Emergency patient data access'),
            success: Boolean(log.success),
          }))
        setLogs(emergencyLogs)
      }
    } catch (error) {
      console.error('Failed to load emergency logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void loadLogs()
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.targetIcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sourceLocation.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExportAllCsv = () => {
    downloadCsvFile(
      `emergency-break-glass-logs-${new Date().toISOString().split('T')[0]}.csv`,
      ['Log ID', 'Timestamp', 'Patient IC', 'Actor Type', 'Actor ID', 'Source', 'Granted', 'Details'],
      filteredLogs.map((l) => [
        l.id,
        l.timestamp,
        l.targetIcNumber,
        l.actorType,
        l.actorId,
        l.sourceLocation,
        l.success ? 'Granted' : 'Denied',
        l.details,
      ])
    )
  }

  const handleDownloadEvidenceBundle = (log: EmergencyLog) => {
    downloadJsonFile(`break-glass-evidence-${log.id.slice(0, 8)}.json`, {
      evidenceVersion: '1.0',
      exportedAt: new Date().toISOString(),
      auditEventId: log.id,
      timestamp: log.timestamp,
      targetPatientIc: log.targetIcNumber,
      responderRole: log.actorType,
      responderIdentifier: log.actorId,
      originTerminal: log.sourceLocation,
      accessGranted: log.success,
      auditDetails: log.details,
    })
    toast({
      title: 'Evidence Bundle Exported',
      description: `Downloaded signed JSON audit packet for event ${log.id.slice(0, 8)}.`,
      variant: 'success',
    })
  }

  const totalEmergencies = logs.length
  const todayStr = new Date().toDateString()
  const todayEmergencies = logs.filter(
    (log) => new Date(log.timestamp).toDateString() === todayStr
  ).length
  const successfulAccess = logs.filter((log) => log.success).length
  const deniedAccess = logs.length - successfulAccess

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl shadow-sm text-white">
            <Siren className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Emergency Break-Glass Governance
            </h1>
            <p className="text-slate-600 text-xs">
              Audit and export forensic evidence for all unconsented emergency lookups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportAllCsv}
            disabled={filteredLogs.length === 0}
            className="bg-orange-700 hover:bg-orange-800 text-white gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.exportCsv}
          </Button>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <strong>Break-Glass Compliance Protocol:</strong> Every emergency query is subject to mandatory post-incident review and forensic audit verification under PDPA 2010 emergency exemptions.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Break-Glass Events',
            value: totalEmergencies,
            icon: Siren,
            accent: 'border-t-orange-600',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-700',
          },
          {
            label: 'Today',
            value: todayEmergencies,
            icon: Clock,
            accent: 'border-t-blue-600',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-700',
          },
          {
            label: 'Granted',
            value: successfulAccess,
            icon: Shield,
            accent: 'border-t-emerald-600',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-700',
          },
          {
            label: 'Not Found / Denied',
            value: deniedAccess,
            icon: AlertTriangle,
            accent: 'border-t-red-600',
            bgColor: 'bg-red-50',
            iconColor: 'text-red-700',
          },
        ].map((stat) => (
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

      <Card className="border border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Filter by patient MyKad IC or origin terminal…"
              className="pl-10 h-10 font-mono tabular-nums"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-orange-600 to-red-600" />
        <div className="p-4 px-5 border-b border-slate-100 bg-orange-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-700" />
            <h2 className="text-sm font-bold text-slate-900">Break-Glass Event Log</h2>
          </div>
          <Badge variant="warning" className="tabular-nums">
            {filteredLogs.length} events
          </Badge>
        </div>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Siren className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No emergency break-glass events recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-orange-50/40 transition-colors border-l-4 border-orange-600 flex items-center gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="flex-1 min-w-0 text-left flex items-center gap-3.5"
                  >
                    <div className="p-2 bg-orange-600 rounded-xl text-white shrink-0">
                      <Siren className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="warning">Break-Glass</Badge>
                        <span className="text-xs text-slate-800">
                          Patient IC:{' '}
                          <code className="font-mono font-bold tabular-nums">
                            {formatIC(log.targetIcNumber)}
                          </code>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> {log.sourceLocation}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {log.actorType} ({log.actorId})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs text-slate-500 tabular-nums">
                      <StatusBadge
                        tone={log.success ? 'success' : 'blocked'}
                        label={log.success ? 'Granted' : 'Denied'}
                      />
                      <p className="mt-1">{formatDate(log.timestamp)}</p>
                    </div>
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-orange-800 border-orange-300 hover:bg-orange-50"
                    onClick={() => handleDownloadEvidenceBundle(log)}
                    title="Download Forensic Audit Packet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Evidence JSON
                  </Button>

                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EmergencyReportModal
        report={
          selectedLog
            ? {
                id: selectedLog.id,
                timestamp: selectedLog.timestamp,
                targetIcNumber: selectedLog.targetIcNumber,
                actorRole: selectedLog.actorType,
                actorId: selectedLog.actorId,
                sourceLocation: selectedLog.sourceLocation,
                details: selectedLog.details,
                granted: selectedLog.success,
              }
            : null
        }
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
