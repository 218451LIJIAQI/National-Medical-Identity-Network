import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { centralApi } from '@/lib/api'
import { 
  Shield, Eye, Clock, Building2, Lock, Unlock, Download, 
  AlertTriangle, CheckCircle, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'

interface HospitalAccess {
  id: string
  name: string
  city: string
  allowed: boolean
  lastAccess?: string
}

interface AccessLog {
  id: string
  doctor: string
  hospital: string
  time: string
  action: string
  status: 'success' | 'blocked'
}

export default function PatientPrivacy() {
  const { toast } = useToast()
  const [hospitals, setHospitals] = useState<HospitalAccess[]>([])
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sensitiveRecords, setSensitiveRecords] = useState({
    mentalHealth: true,
    reproductiveHealth: true,
    substanceAbuse: true,
    hivStatus: true,
  })

  // Load hospitals and access logs
  useEffect(() => {
    async function loadData() {
      try {
        const [privacyRes, logsRes] = await Promise.all([
          centralApi.getPrivacySettings(),
          centralApi.getMyAccessLogs(20),
        ])
        
        if (privacyRes.success && privacyRes.data) {
          setHospitals(privacyRes.data.map((h) => ({
            id: h.hospitalId,
            name: h.hospitalName,
            city: h.city,
            allowed: !h.isBlocked, // isBlocked = false means allowed
            lastAccess: undefined,
          })))
        }
        
        if (logsRes.success && logsRes.data) {
          setAccessLogs(logsRes.data.map((log: any) => {
            const logDate = new Date(log.timestamp)
            const now = new Date()
            const diffMs = now.getTime() - logDate.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)
            
            let timeAgo = ''
            if (diffMins < 60) {
              timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`
            } else if (diffHours < 24) {
              timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
            } else {
              timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
            }
            
            // Check if actorName looks like a UUID and replace with friendly name
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            let displayName = log.actorName || log.actorId
            if (uuidPattern.test(displayName)) {
              if (log.actorType === 'doctor') {
                displayName = 'Healthcare Provider'
              } else if (log.actorType === 'hospital_admin') {
                displayName = 'Hospital Administrator'
              } else {
                displayName = 'System User'
              }
            }
            
            return {
              id: log.id,
              doctor: displayName,
              hospital: log.hospitalName,
              time: timeAgo,
              action: log.details || 'Viewed medical records',
              status: log.success ? 'success' as const : 'blocked' as const,
            }
          }))
        }
      } catch (error) {
        console.error('Failed to load privacy data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleHospitalAccess = async (hospitalId: string) => {
    const hospital = hospitals.find(h => h.id === hospitalId)
    if (!hospital) return
    
    const newAllowed = !hospital.allowed
    const isBlocked = !newAllowed
    
    try {
      const response = await centralApi.setHospitalAccess(hospitalId, isBlocked)
      
      if (response.success) {
        setHospitals(prev => prev.map(h => 
          h.id === hospitalId ? { ...h, allowed: newAllowed } : h
        ))
        toast({
          title: newAllowed ? 'Access Granted' : 'Access Revoked',
          description: `${hospital.name} ${newAllowed ? 'can now' : 'can no longer'} access your records`,
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update hospital access',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to update hospital access:', error)
      toast({
        title: 'Error',
        description: 'Failed to update hospital access',
        variant: 'destructive',
      })
    }
  }

  const toggleSensitiveRecord = (key: keyof typeof sensitiveRecords) => {
    setSensitiveRecords(prev => {
      const newValue = !prev[key]
      toast({
        title: newValue ? 'Protection Enabled' : 'Protection Disabled',
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} records are now ${newValue ? 'protected' : 'visible'}`,
      })
      return { ...prev, [key]: newValue }
    })
  }

  const handleDownloadData = () => {
    toast({
      title: 'Download Started',
      description: 'Your medical records are being prepared for download',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading privacy settings...</p>
        </div>
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-500/25"
      >
        <motion.div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-300/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Shield className="w-8 h-8" />
            </motion.div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-2">🔒 Secured</Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">Privacy & Security</h1>
              <p className="text-purple-100">Control access to your medical records</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline" 
              className="gap-2 border-white/30 text-white hover:bg-white/10 rounded-xl h-12 px-6"
              onClick={handleDownloadData}
            >
              <Download className="w-5 h-5" />
              Download My Data
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Security Status - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-4 gap-4"
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-2 bg-green-100 rounded-xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle className="w-7 h-7 text-green-600" />
              </motion.div>
              <div>
                <p className="text-sm text-green-700">Data Protection</p>
                <p className="font-bold text-green-900 text-lg">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Authorized Hospitals</p>
                <p className="font-bold">{hospitals.filter(h => h.allowed).length} of {hospitals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Total Access</p>
                <p className="font-bold">{accessLogs.filter(l => l.status === 'success').length} views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700">Blocked Attempts</p>
                <p className="font-bold text-red-900">{accessLogs.filter(l => l.status === 'blocked').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hospital Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Hospital Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Control which hospitals can access your medical records. Blocked hospitals will not be able to view your data.
          </p>
          <div className="space-y-3">
            {hospitals.map((hospital) => (
              <div 
                key={hospital.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  hospital.allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${hospital.allowed ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {hospital.allowed ? (
                      <Unlock className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{hospital.name}</p>
                    <p className="text-sm text-gray-500">{hospital.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {hospital.lastAccess && (
                    <span className="text-xs text-gray-500">Last access: {hospital.lastAccess}</span>
                  )}
                  <Button
                    variant={hospital.allowed ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleHospitalAccess(hospital.id)}
                  >
                    {hospital.allowed ? 'Revoke Access' : 'Grant Access'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sensitive Records Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sensitive Records Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Choose which types of sensitive records require additional consent before access.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'mentalHealth' as const, label: 'Mental Health Records', icon: '🧠' },
              { key: 'reproductiveHealth' as const, label: 'Reproductive Health', icon: '🩺' },
              { key: 'substanceAbuse' as const, label: 'Substance Abuse Treatment', icon: '💊' },
              { key: 'hivStatus' as const, label: 'HIV/AIDS Status', icon: '🔬' },
            ].map((item) => (
              <div 
                key={item.key}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                  sensitiveRecords[item.key] 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => toggleSensitiveRecord(item.key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <Badge variant={sensitiveRecords[item.key] ? "default" : "secondary"}>
                  {sensitiveRecords[item.key] ? 'Protected' : 'Visible'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Access Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessLogs.map((log) => (
              <div 
                key={log.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  log.status === 'blocked' ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{log.doctor}</p>
                    <p className="text-xs text-gray-500">{log.hospital}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{log.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {log.time}
                  </p>
                </div>
                <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>
                  {log.status === 'success' ? 'Allowed' : 'Blocked'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
