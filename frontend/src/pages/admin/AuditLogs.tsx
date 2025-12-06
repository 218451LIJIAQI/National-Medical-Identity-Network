import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { 
  Search, Shield, Eye, Download, Building2, Clock, AlertTriangle, CheckCircle, Loader2 
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface AuditLog {
  id: string
  timestamp: string
  action: string
  userId: string
  userRole: string
  targetIcNumber?: string
  sourceHospital: string
  targetHospitals?: string[]
  status: 'success' | 'denied' | 'error'
  details?: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')

  useEffect(() => {
    async function loadLogs() {
      try {
        const response = await centralApi.getAuditLogs({ limit: 50 })
        if (response.success && response.data) {
          const apiLogs = (response.data as any[]).map((log: any) => {
            // Map action types
            let action = 'RECORD_VIEW'
            if (log.action === 'query') action = 'CROSS_HOSPITAL_QUERY'
            else if (log.action === 'create') action = 'RECORD_CREATE'
            else if (log.action === 'login') action = 'LOGIN'
            else if (log.action === 'emergency') action = 'EMERGENCY_ACCESS'
            
            return {
              id: log.id,
              timestamp: log.timestamp,
              action,
              userId: log.actorId?.slice(0, 12) || 'Unknown',
              userRole: log.actorType || 'unknown',
              targetIcNumber: log.targetIcNumber,
              sourceHospital: log.actorHospitalId || 'Central Hub',
              targetHospitals: log.targetHospitalId ? [log.targetHospitalId] : undefined,
              status: log.success ? 'success' as const : 'denied' as const,
              details: log.details,
            }
          })
          setLogs(apiLogs)
        }
      } catch (error) {
        console.error('Failed to load audit logs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.targetIcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sourceHospital.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterAction === 'all' || log.action === filterAction
    
    return matchesSearch && matchesFilter
  })

  const getActionBadge = (action: string) => {
    const actionStyles: Record<string, { color: string; label: string }> = {
      'CROSS_HOSPITAL_QUERY': { color: 'bg-blue-100 text-blue-700', label: 'Cross-Hospital Query' },
      'RECORD_VIEW': { color: 'bg-green-100 text-green-700', label: 'Record View' },
      'RECORD_CREATE': { color: 'bg-purple-100 text-purple-700', label: 'Record Create' },
      'ACCESS_DENIED': { color: 'bg-red-100 text-red-700', label: 'Access Denied' },
      'PATIENT_CONSENT_UPDATE': { color: 'bg-yellow-100 text-yellow-700', label: 'Consent Update' },
      'EMERGENCY_ACCESS': { color: 'bg-orange-100 text-orange-700', label: 'Emergency Access' },
    }
    const style = actionStyles[action] || { color: 'bg-gray-100 text-gray-700', label: action }
    return <Badge className={style.color}>{style.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'denied':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 p-8 text-white shadow-2xl"
      >
        <motion.div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Shield className="w-8 h-8" />
            </motion.div>
            <div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 mb-2">Security Monitoring</Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">Audit Logs</h1>
              <p className="text-gray-400">Complete trail of all data access and modifications</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10 rounded-xl h-12 px-6">
              <Download className="w-5 h-5" />
              Export Logs
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'CROSS_HOSPITAL_QUERY').length}</p>
                <p className="text-xs text-gray-500">Cross-Hospital Queries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.status === 'success').length}</p>
                <p className="text-xs text-gray-500">Successful Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.status === 'denied').length}</p>
                <p className="text-xs text-gray-500">Blocked Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'EMERGENCY_ACCESS').length}</p>
                <p className="text-xs text-gray-500">Emergency Overrides</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by IC number, user, or hospital..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              title="Filter by action type"
              className="border rounded-lg px-4 py-2 text-sm"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="CROSS_HOSPITAL_QUERY">Cross-Hospital Queries</option>
              <option value="RECORD_VIEW">Record Views</option>
              <option value="RECORD_CREATE">Record Creates</option>
              <option value="ACCESS_DENIED">Access Denied</option>
              <option value="EMERGENCY_ACCESS">Emergency Access</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-4 rounded-lg border ${
                  log.status === 'denied' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(log.action)}
                        <span className="text-sm text-gray-500">by</span>
                        <Badge variant="outline">{log.userRole}</Badge>
                      </div>
                      
                      {log.targetIcNumber && (
                        <p className="text-sm font-medium">
                          Patient IC: <span className="font-mono">{log.targetIcNumber}</span>
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {log.sourceHospital}
                        </span>
                        {log.targetHospitals && (
                          <span className="flex items-center gap-1">
                            → {log.targetHospitals.join(', ')}
                          </span>
                        )}
                      </div>
                      
                      {log.details && (
                        <p className="text-sm text-gray-600 mt-2">{log.details}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
