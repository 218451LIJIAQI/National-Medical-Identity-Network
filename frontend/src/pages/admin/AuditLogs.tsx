import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { 
  Search, Shield, Eye, Download, Building2, Clock, AlertTriangle, CheckCircle, Loader2,
  Activity, FileText, Zap, Filter, RefreshCw, ChevronLeft, ChevronRight, Calendar, X, Siren, User
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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

const ITEMS_PER_PAGE = 10

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Date range filter
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Emergency access detail modal
  const [selectedEmergency, setSelectedEmergency] = useState<AuditLog | null>(null)

  const loadLogs = async () => {
    try {
      const response = await centralApi.getAuditLogs({ 
        limit: 100,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
      if (response.success && response.data) {
        const apiLogs = (response.data as any[]).map((log: any) => {
          // Map action types
          let action = 'RECORD_VIEW'
          if (log.action === 'query') action = 'CROSS_HOSPITAL_QUERY'
          else if (log.action === 'create') action = 'RECORD_CREATE'
          else if (log.action === 'login') action = 'LOGIN'
          else if (log.action === 'emergency' || log.action === 'emergency_access') action = 'EMERGENCY_ACCESS'
          
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.targetIcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sourceHospital.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterAction === 'all' || log.action === filterAction
    
    return matchesSearch && matchesFilter
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAction])

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

  // Stats data
  const stats = [
    { 
      label: 'Cross-Hospital Queries', 
      value: logs.filter(l => l.action === 'CROSS_HOSPITAL_QUERY').length,
      icon: Eye,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Successful Actions', 
      value: logs.filter(l => l.status === 'success').length,
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    { 
      label: 'Blocked Attempts', 
      value: logs.filter(l => l.status === 'denied').length,
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    { 
      label: 'Emergency Access', 
      value: logs.filter(l => l.action === 'EMERGENCY_ACCESS').length,
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
  ]

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500">Monitor all system activities and access patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
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

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              {/* Row 1: Search and Action Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by IC number, user ID, or hospital..."
                    className="pl-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    title="Filter by action type"
                    className="h-12 border border-gray-200 rounded-xl px-4 pr-10 text-sm bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                  >
                    <option value="all">All Actions</option>
                    <option value="CROSS_HOSPITAL_QUERY">Cross-Hospital Queries</option>
                    <option value="RECORD_VIEW">Record Views</option>
                    <option value="RECORD_CREATE">Record Creates</option>
                    <option value="LOGIN">Logins</option>
                    <option value="EMERGENCY_ACCESS">Emergency Access</option>
                  </select>
                </div>
              </div>
              
              {/* Row 2: Date Range Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-violet-50 rounded-xl">
                <div className="flex items-center gap-2 text-violet-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium text-sm">Date Range:</span>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <span className="text-gray-400 mt-5">→</span>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 sm:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="h-10"
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRefreshing(true)
                      loadLogs()
                    }}
                    className="h-10 bg-violet-600 hover:bg-violet-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-600" />
                Activity Timeline
              </CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {filteredLogs.length} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <AnimatePresence>
              {paginatedLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No logs found matching your criteria</p>
                </div>
              ) : (
                <div className="divide-y">
                  {paginatedLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        log.action === 'EMERGENCY_ACCESS' 
                          ? 'bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 hover:from-orange-100 hover:to-red-100' 
                          : log.status === 'denied' 
                            ? 'bg-red-50/50' 
                            : ''
                      }`}
                      onClick={() => log.action === 'EMERGENCY_ACCESS' && setSelectedEmergency(log)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className={`mt-1 p-2 rounded-full ${
                          log.action === 'EMERGENCY_ACCESS'
                            ? 'bg-gradient-to-br from-orange-400 to-red-500 animate-pulse'
                            : log.status === 'success' 
                              ? 'bg-emerald-100' 
                              : 'bg-red-100'
                        }`}>
                          {log.action === 'EMERGENCY_ACCESS' 
                            ? <Siren className="w-4 h-4 text-white" />
                            : getStatusIcon(log.status)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionBadge(log.action)}
                            <span className="text-gray-400">•</span>
                            <Badge variant="outline" className="font-normal">
                              {log.userRole}
                            </Badge>
                            {log.targetIcNumber && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">
                                  Patient: <span className="font-mono font-medium">{log.targetIcNumber}</span>
                                </span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4" />
                              {log.sourceHospital}
                            </span>
                            {log.targetHospitals && log.targetHospitals.length > 0 && (
                              <span className="text-violet-600">
                                → {log.targetHospitals.join(', ')}
                              </span>
                            )}
                          </div>
                          
                          {log.details && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">{log.details}</p>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 px-3 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and neighbors
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-9 w-9 p-0 rounded-lg ${
                              currentPage === page 
                                ? 'bg-violet-600 hover:bg-violet-700' 
                                : ''
                            }`}
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 px-3 rounded-lg"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Emergency Access Detail Modal */}
      <AnimatePresence>
        {selectedEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEmergency(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl animate-pulse">
                      <Siren className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Access</h2>
                      <p className="text-white/80 text-sm">Critical patient data access event</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmergency(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Emergency Access Warning
                  </div>
                  <p className="text-sm text-orange-600">
                    This access was made without standard authentication. Emergency access bypasses normal consent requirements for critical medical situations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Patient IC</p>
                    <p className="font-mono font-semibold text-gray-900">
                      {selectedEmergency.targetIcNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Access Time</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedEmergency.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Accessed By</p>
                      <p className="text-gray-900">{selectedEmergency.userRole}</p>
                      <p className="text-xs text-gray-500 font-mono">{selectedEmergency.userId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Source</p>
                      <p className="text-gray-900">{selectedEmergency.sourceHospital}</p>
                    </div>
                  </div>

                  {selectedEmergency.details && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Details</p>
                        <p className="text-gray-900">{selectedEmergency.details}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Badge className={selectedEmergency.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {selectedEmergency.status === 'success' ? 'Access Granted' : 'Access Denied'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Log ID: {selectedEmergency.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-6 pb-6">
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  onClick={() => setSelectedEmergency(null)}
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
