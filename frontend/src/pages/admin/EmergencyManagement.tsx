import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
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
import { downloadCsvFile, downloadJsonFile, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface EmergencyLog {
  id: string
  timestamp: string
  targetIcNumber: string
  actorType: string
  actorId: string
  actorHospitalId: string
  details: string
  success: boolean
}

export default function EmergencyManagement() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<EmergencyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null)

  const loadLogs = async () => {
    try {
      const response = await centralApi.getAuditLogs({ limit: 200 })
      if (response.success && response.data) {
        const emergencyLogs = (response.data as Array<Record<string, unknown>>)
          .filter((log) => log.action === 'emergency' || log.action === 'emergency_access')
          .map((log) => ({
            id: String(log.id || ''),
            timestamp: String(log.timestamp || ''),
            targetIcNumber: String(log.targetIcNumber || 'Unknown'),
            actorType: String(log.actorType || 'emergency'),
            actorId: String(log.actorId || 'Unknown'),
            actorHospitalId: String(log.actorHospitalId || 'Emergency Terminal'),
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
    loadLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLogs()
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.targetIcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorHospitalId.toLowerCase().includes(searchTerm.toLowerCase())
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
        l.actorHospitalId,
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
      originTerminal: log.actorHospitalId,
      accessGranted: log.success,
      auditDetails: log.details,
    })
    toast({
      title: 'Evidence Bundle Exported',
      description: `Downloaded signed JSON audit packet for event ${log.id.slice(0, 8)}.`,
    })
  }

  const totalEmergencies = logs.length
  const todayStr = new Date().toDateString()
  const todayEmergencies = logs.filter((log) => new Date(log.timestamp).toDateString() === todayStr).length
  const successfulAccess = logs.filter((log) => log.success).length
  const deniedAccess = logs.length - successfulAccess

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
            <Siren className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Emergency Break-Glass Governance</h1>
            <p className="text-gray-500 text-sm">Audit and export forensic evidence for all unconsented emergency lookups</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" className="gap-2 h-11 px-4 rounded-xl" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportAllCsv}
            disabled={filteredLogs.length === 0}
            className="gap-2 h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div className="text-sm text-orange-800">
          <strong>Break-Glass Compliance Protocol:</strong> Every emergency query is subject to mandatory post-incident review and forensic audit verification.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Break-Glass Events', value: totalEmergencies, icon: Siren, gradient: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
          { label: 'Today', value: todayEmergencies, icon: Clock, gradient: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Granted', value: successfulAccess, icon: Shield, gradient: 'from-emerald-400 to-emerald-600', bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Not Found / Denied', value: deniedAccess, icon: AlertTriangle, gradient: 'from-red-400 to-red-600', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            <CardContent className="pt-5 flex items-center justify-between">
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
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Filter by patient IC or origin terminal..."
              className="pl-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" />
        <div className="p-5 border-b bg-orange-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-gray-900">Break-Glass Event Log</h2>
          </div>
          <Badge className="bg-orange-100 text-orange-800">{filteredLogs.length} events</Badge>
        </div>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Siren className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No emergency break-glass events recorded.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-orange-50/40 transition-colors cursor-pointer border-l-4 border-orange-500 flex items-center gap-4"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="p-2 bg-orange-500 rounded-full text-white shrink-0">
                    <Siren className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-orange-100 text-orange-800">Break-Glass</Badge>
                      <span className="text-sm text-gray-700">
                        Patient IC: <code className="font-mono font-bold">{log.targetIcNumber}</code>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> {log.actorHospitalId}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {log.actorType} ({log.actorId})
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs text-gray-500">
                    <Badge className={log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {log.success ? 'Granted' : 'Denied'}
                    </Badge>
                    <p className="mt-1">{formatDate(log.timestamp)}</p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-orange-700 border-orange-200 hover:bg-orange-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadEvidenceBundle(log)
                    }}
                    title="Download Forensic Audit Packet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Evidence JSON
                  </Button>

                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
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
                sourceLocation: selectedLog.actorHospitalId,
                details: selectedLog.details,
                granted: selectedLog.success,
              }
            : null
        }
        onClose={() => setSelectedLog(null)}
      />
    </motion.div>
  )
}
