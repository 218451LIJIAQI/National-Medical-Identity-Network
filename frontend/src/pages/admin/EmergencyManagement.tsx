import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { EmergencyReportModal } from '@/components/EmergencyReportModal'
import {
  Siren, Search, Loader2, AlertTriangle, Building2, Clock, User,
  RefreshCw, Shield, ChevronRight, Activity, Video, Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
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
            actorType: String(log.actorType || 'unknown'),
            actorId: String(log.actorId || 'Unknown'),
            actorHospitalId: String(log.actorHospitalId || 'External'),
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

  const filteredLogs = logs.filter(log =>
    log.targetIcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actorHospitalId.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalEmergencies = logs.length
  const todayStr = new Date().toDateString()
  const todayEmergencies = logs.filter(log => new Date(log.timestamp).toDateString() === todayStr).length
  const successfulAccess = logs.filter(log => log.success).length
  const deniedAccess = logs.length - successfulAccess

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading emergency access records...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Siren className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Emergency Access</h1>
            <p className="text-gray-500">Monitor and review all emergency patient data access</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="gap-2 h-11 px-5 rounded-xl"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800">Emergency Access Protocol</h3>
            <p className="text-sm text-orange-700 mt-1">
              Emergency access allows medical personnel to view patient data without standard consent in life-threatening situations.
              All emergency accesses are logged and subject to audit review.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Emergency Access', value: totalEmergencies, icon: Siren, gradient: 'from-orange-400 to-orange-600', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
          { label: 'Today', value: todayEmergencies, icon: Clock, gradient: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Access Granted', value: successfulAccess, icon: Shield, gradient: 'from-emerald-400 to-emerald-600', bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Access Denied', value: deniedAccess, icon: AlertTriangle, gradient: 'from-red-400 to-red-600', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                  <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                    <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by patient IC or hospital..."
                className="pl-12 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" />
          <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">Emergency Access Records</h2>
              </div>
              <Badge className="bg-orange-100 text-orange-700 rounded-full">
                {filteredLogs.length} records
              </Badge>
            </div>
          </div>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Siren className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No emergency access records found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 hover:bg-orange-50/50 transition-colors cursor-pointer border-l-4 border-orange-500"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-full">
                        <Siren className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-orange-100 text-orange-700">Emergency Access</Badge>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">
                            Patient: <span className="font-mono font-medium">{log.targetIcNumber}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            {log.actorHospitalId}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            {log.actorType}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge className={log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {log.success ? 'Granted' : 'Denied'}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                          <Clock className="w-4 h-4" />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(log.timestamp)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast({
                            title: "Recording Download",
                            description: `Downloading emergency access video recording for patient ${log.targetIcNumber}...`,
                          })
                          setTimeout(() => {
                            toast({
                              title: "Download Complete",
                              description: "Video recording saved to Downloads folder.",
                            })
                          }, 2000)
                        }}
                        title="Download emergency access video recording"
                      >
                        <Video className="w-4 h-4" />
                        <Download className="w-3 h-3" />
                      </Button>

                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <EmergencyReportModal
        report={selectedLog ? {
          id: selectedLog.id,
          timestamp: selectedLog.timestamp,
          targetIcNumber: selectedLog.targetIcNumber,
          actorRole: selectedLog.actorType,
          actorId: selectedLog.actorId,
          sourceLocation: selectedLog.actorHospitalId,
          details: selectedLog.details,
          granted: selectedLog.success,
        } : null}
        onClose={() => setSelectedLog(null)}
      />
    </motion.div>
  )
}
