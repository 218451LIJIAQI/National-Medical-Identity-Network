import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { 
  Siren, Search, Loader2, AlertTriangle, Building2, Clock, User, 
  FileText, RefreshCw, Shield, X, ChevronRight, Activity, Video, Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
        const emergencyLogs = (response.data as any[])
          .filter((log: any) => log.action === 'emergency' || log.action === 'emergency_access')
          .map((log: any) => ({
            id: log.id,
            timestamp: log.timestamp,
            targetIcNumber: log.targetIcNumber || 'Unknown',
            actorType: log.actorType || 'unknown',
            actorId: log.actorId || 'Unknown',
            actorHospitalId: log.actorHospitalId || 'External',
            details: log.details || 'Emergency patient data access',
            success: log.success
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
  const todayEmergencies = logs.filter(log => {
    const logDate = new Date(log.timestamp).toDateString()
    return logDate === new Date().toDateString()
  }).length
  const successfulAccess = logs.filter(log => log.success).length
  const deniedAccess = logs.filter(log => !log.success).length

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
          { label: 'Total Emergency Access', value: totalEmergencies, icon: Siren, color: 'orange', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
          { label: 'Today', value: todayEmergencies, icon: Clock, color: 'blue', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Access Granted', value: successfulAccess, icon: Shield, color: 'emerald', bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Access Denied', value: deniedAccess, icon: AlertTriangle, color: 'red', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={`h-1 bg-gradient-to-r from-${stat.color}-400 to-${stat.color}-600`} />
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
                          // Demo: simulate download after delay
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl animate-pulse">
                      <Siren className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Access Report</h2>
                      <p className="text-white/80 text-sm">Detailed access information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Emergency Protocol Activated
                  </div>
                  <p className="text-sm text-orange-600">
                    This access bypassed standard consent requirements due to emergency medical situation.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Patient IC</p>
                    <p className="font-mono font-semibold text-gray-900">{selectedLog.targetIcNumber}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Access Time</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Accessed By</p>
                      <p className="text-gray-900">{selectedLog.actorType}</p>
                      <p className="text-xs text-gray-500 font-mono">{selectedLog.actorId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Source Location</p>
                      <p className="text-gray-900">{selectedLog.actorHospitalId}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Details</p>
                      <p className="text-gray-900">{selectedLog.details}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Badge className={selectedLog.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {selectedLog.success ? 'Access Granted' : 'Access Denied'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Log ID: {selectedLog.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-6">
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  onClick={() => setSelectedLog(null)}
                >
                  Close Report
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
