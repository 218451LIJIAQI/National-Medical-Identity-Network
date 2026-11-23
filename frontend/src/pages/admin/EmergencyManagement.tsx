import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { centralApi } from '@/lib/api'
import { downloadTextFile, formatDateTime } from '@/lib/utils'
import {
  Siren, Search, Loader2, AlertTriangle, RefreshCw, Shield, Download, CheckCircle,
} from 'lucide-react'

interface EmergencyLogItem {
  id: string
  timestamp: string
  targetIcNumber: string
  actorType: string
  actorId: string
  hospitalName: string
  details: string
  success: boolean
}

export default function EmergencyManagement() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<EmergencyLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadLogs = async () => {
    try {
      const response = await centralApi.getAuditLogs({ limit: 200 })
      if (response.success && response.data) {
        const items = response.data
          .filter((log) => log.action === 'emergency_access' || log.action === 'emergency')
          .map((log) => ({
            id: log.id,
            timestamp: log.timestamp,
            targetIcNumber: log.targetIcNumber || 'Unknown',
            actorType: log.actorType || 'emergency',
            actorId: log.actorId || 'Emergency Responder',
            hospitalName: log.hospitalName || log.actorHospitalId || 'Public Break-Glass Terminal',
            details: log.details || 'Emergency patient triage lookup',
            success: log.success,
          }))
        setLogs(items)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const filteredLogs = logs.filter(
    (log) =>
      log.targetIcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todayCount = logs.filter(
    (log) => new Date(log.timestamp).toDateString() === new Date().toDateString()
  ).length
  const foundCount = logs.filter((log) => log.success).length
  const notFoundCount = logs.filter((log) => !log.success).length

  const exportCsv = () => {
    const header = ['Timestamp', 'Target IC', 'Source', 'Found', 'Details']
    const rows = filteredLogs.map((l) =>
      [l.timestamp, l.targetIcNumber, l.hospitalName, String(l.success), l.details]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(',')
    )
    downloadTextFile(
      `medlink-emergency-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.join(','), ...rows].join('\n'),
      'text/csv;charset=utf-8'
    )
    toast({
      title: 'Emergency Audit Exported',
      description: `Exported ${filteredLogs.length} break-glass record(s).`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Break-Glass Queries', value: logs.length, icon: Siren, wrap: 'bg-orange-100 text-orange-600' },
    { label: "Today's Emergencies", value: todayCount, icon: Shield, wrap: 'bg-red-100 text-red-600' },
    { label: 'Matched Patient Records', value: foundCount, icon: CheckCircle, wrap: 'bg-emerald-100 text-emerald-600' },
    { label: 'Unmatched IC Lookups', value: notFoundCount, icon: AlertTriangle, wrap: 'bg-amber-100 text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl text-white shadow-lg">
            <Siren className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Emergency Break-Glass Oversight</h1>
            <p className="text-sm text-gray-500">Mandatory post-incident review for unauthenticated emergency medical lookups</p>
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
          <Button onClick={exportCsv} className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-slate-200/80">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.wrap}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter break-glass events by IC number or terminal..."
              className="pl-10"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No emergency break-glass lookups recorded.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-orange-50/40 border border-orange-200/70"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900">{log.targetIcNumber}</span>
                      <Badge variant={log.success ? 'warning' : 'destructive'}>
                        {log.success ? 'Disclosed Critical Summary' : 'No Record Found'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{log.details}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p className="font-medium text-gray-700">{log.hospitalName}</p>
                    <p>{formatDateTime(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
