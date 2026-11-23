import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { centralApi } from '@/lib/api'
import { downloadFile, exportToCsv } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import {
  Siren,
  Search,
  RefreshCw,
  Clock,
  User,
  MapPin,
  Download,
  Eye,
  AlertTriangle,
  Calendar,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmergencyLog {
  id: string
  targetIcNumber: string
  actorId: string
  actorName?: string
  ipAddress: string
  timestamp: string
  details?: string
  success: boolean
}

export default function EmergencyManagement() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<EmergencyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null)

  const loadEmergencyLogs = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await centralApi.getAuditLogs({ action: 'emergency_access', limit: 100 })
      if (response.success && response.data) {
        const emergencyLogs: EmergencyLog[] = response.data.map((raw) => ({
          id: String(raw.id || ''),
          targetIcNumber: String(raw.targetIcNumber || 'N/A'),
          actorId: String(raw.actorId || 'emergency-responder'),
          actorName: raw.actorName ? String(raw.actorName) : undefined,
          ipAddress: String(raw.ipAddress || 'Emergency Kiosk'),
          timestamp: String(raw.timestamp || new Date().toISOString()),
          details: raw.details ? String(raw.details) : undefined,
          success: Boolean(raw.success),
        }))
        setLogs(emergencyLogs)
      } else {
        setLoadError(response.error || 'Failed to load emergency break-glass logs.')
      }
    } catch {
      setLoadError('Network error while loading emergency logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEmergencyLogs()
  }, [loadEmergencyLogs])

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.trim().toLowerCase()
    return (
      !q ||
      log.targetIcNumber.toLowerCase().includes(q) ||
      log.ipAddress.toLowerCase().includes(q) ||
      log.actorId.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    )
  })

  const handleDownloadIncidentReport = (log: EmergencyLog) => {
    const payload = {
      reportType: 'MedLink MY Emergency Break-Glass Audit Dossier',
      generatedAt: new Date().toISOString(),
      incidentId: log.id,
      timestamp: log.timestamp,
      targetPatientIc: log.targetIcNumber,
      responderId: log.actorId,
      responderName: log.actorName || 'Unauthenticated Emergency Terminal',
      terminalIpAddress: log.ipAddress,
      accessGranted: log.success,
      auditDetails: log.details || 'Emergency access to critical life-saving summary',
    }
    downloadFile(
      `emergency-incident-${log.id.slice(0, 8)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    )
    toast({
      title: 'Incident Dossier Downloaded',
      description: `Saved JSON audit report for event ${log.id.slice(0, 8)}.`,
    })
  }

  const handleExportAllCsv = () => {
    exportToCsv(
      `medlink-emergency-access-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Event ID', 'Timestamp', 'Patient IC', 'Responder ID', 'Terminal IP', 'Status', 'Details'],
      filteredLogs.map((l) => [
        l.id,
        new Date(l.timestamp).toISOString(),
        l.targetIcNumber,
        l.actorId,
        l.ipAddress,
        l.success ? 'Granted' : 'Not Found / Denied',
        l.details || '',
      ])
    )
  }

  const todayCount = logs.filter((l) => {
    const today = new Date().toDateString()
    return new Date(l.timestamp).toDateString() === today
  }).length

  const weekCount = logs.filter((l) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return new Date(l.timestamp).getTime() > weekAgo
  }).length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl text-white">
              <Siren className="h-6 w-6" />
            </div>
            Emergency Access Governance
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor and audit all break-glass emergency medical lookups across Malaysia
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadEmergencyLogs()} className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportAllCsv}
            disabled={filteredLogs.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-700 text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadEmergencyLogs()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Emergency Events', value: logs.length, color: 'from-orange-500 to-red-600', icon: Siren },
          { label: 'Today', value: todayCount, color: 'from-amber-500 to-orange-600', icon: Clock },
          { label: 'Last 7 Days', value: weekCount, color: 'from-purple-500 to-indigo-600', icon: Calendar },
          {
            label: 'Granted Access',
            value: logs.filter((l) => l.success).length,
            color: 'from-emerald-500 to-teal-600',
            icon: CheckCircle2,
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
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
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by Patient IC, responder ID, or terminal IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Siren className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No emergency access events recorded</p>
              <p className="text-gray-400 text-sm mt-1">Emergency break-glass lookups appear here immediately</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 bg-gradient-to-r from-orange-50/50 via-transparent to-transparent border-l-4 border-l-orange-500 hover:from-orange-100/50 cursor-pointer transition-colors flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-orange-100 ring-2 ring-orange-200">
                    <Siren className="h-6 w-6 text-orange-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">Patient IC:</span>
                      <Badge variant="outline" className="font-mono text-sm font-bold">
                        {log.targetIcNumber}
                      </Badge>
                      <Badge className={log.success ? 'bg-orange-500 text-white text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                        {log.success ? 'BREAK-GLASS GRANTED' : 'PATIENT NOT FOUND'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        IP: {log.ipAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50">
                    <Eye className="h-4 w-4" />
                    Inspect
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Siren className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Incident Audit Dossier</h2>
                      <p className="text-white/80 text-sm">Log ID: {selectedLog.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Break-Glass Governance Notice</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      Emergency lookups return only life-critical fields (blood type, allergies, chronic conditions, active medications, and emergency contact) and are permanently logged in the central PostgreSQL audit ledger.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Patient IC Number</p>
                    <p className="font-mono font-bold text-lg text-gray-900">{selectedLog.targetIcNumber}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Access Timestamp</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Terminal IP Address</p>
                        <p className="font-mono font-medium text-gray-900">{selectedLog.ipAddress}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Recorded</Badge>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Responder Identifier</p>
                        <p className="font-medium text-gray-900">{selectedLog.actorName || selectedLog.actorId}</p>
                      </div>
                    </div>
                    <Badge className={selectedLog.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {selectedLog.success ? 'Data Released' : 'No Match'}
                    </Badge>
                  </div>

                  {selectedLog.details && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <FileText className="w-4 h-4" />
                        Recorded Audit Details
                      </div>
                      <p className="text-gray-900 text-sm">{selectedLog.details}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => handleDownloadIncidentReport(selectedLog)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Incident Audit Dossier (.json)
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLog(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
