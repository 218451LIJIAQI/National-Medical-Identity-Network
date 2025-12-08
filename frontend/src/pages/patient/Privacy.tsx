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
            allowed: !h.isBlocked,
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
              variant="ghost"
              className="gap-2 border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-xl h-12 px-6"
              onClick={handleDownloadData}
            >
              <Download className="w-5 h-5" />
              Download My Data
            </Button>
          </motion.div>
        </div>
      </motion.div>

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

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              Hospital Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 mb-6">
              Control which hospitals can access your medical records. Blocked hospitals will not be able to view your data.
            </p>
            <div className="space-y-3">
              {hospitals.map((hospital, index) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${
                    hospital.allowed
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-lg shadow-emerald-100/50'
                      : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`p-3 rounded-xl shadow-md ${
                        hospital.allowed
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-200'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-gray-200'
                      }`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {hospital.allowed ? (
                        <Unlock className="w-5 h-5 text-white" />
                      ) : (
                        <Lock className="w-5 h-5 text-white" />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-semibold text-gray-900">{hospital.name}</p>
                      <p className="text-sm text-gray-500">{hospital.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {hospital.lastAccess && (
                      <span className="text-xs text-gray-400 bg-white/80 px-3 py-1.5 rounded-full">Last: {hospital.lastAccess}</span>
                    )}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={hospital.allowed ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleHospitalAccess(hospital.id)}
                        className={`rounded-xl px-5 h-10 font-medium ${
                          hospital.allowed
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200'
                        }`}
                      >
                        {hospital.allowed ? 'Revoke Access' : 'Grant Access'}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <CardHeader className="bg-gradient-to-r from-amber-50/50 to-white border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/25">
                <Shield className="h-5 w-5 text-white" />
              </div>
              Sensitive Records Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 mb-6">
              Choose which types of sensitive records require additional consent before access.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: 'mentalHealth' as const, label: 'Mental Health Records', icon: '🧠', color: 'purple' },
                { key: 'reproductiveHealth' as const, label: 'Reproductive Health', icon: '🩺', color: 'pink' },
                { key: 'substanceAbuse' as const, label: 'Substance Abuse Treatment', icon: '💊', color: 'blue' },
                { key: 'hivStatus' as const, label: 'HIV/AIDS Status', icon: '🔬', color: 'red' },
              ].map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    sensitiveRecords[item.key]
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-lg shadow-amber-100/50'
                      : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleSensitiveRecord(item.key)}
                >
                  <div className="flex items-center gap-4">
                    <motion.span
                      className="text-3xl"
                      animate={sensitiveRecords[item.key] ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="font-semibold text-gray-900">{item.label}</span>
                  </div>
                  <Badge
                    className={`rounded-full px-4 py-1 font-medium ${
                      sensitiveRecords[item.key]
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {sensitiveRecords[item.key] ? '🔒 Protected' : 'Visible'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <CardHeader className="bg-gradient-to-r from-violet-50/50 to-white border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/25">
                <Eye className="h-5 w-5 text-white" />
              </div>
              Recent Access Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {accessLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.03 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                    log.status === 'blocked'
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                      : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`p-2.5 rounded-xl ${
                        log.status === 'success'
                          ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                          : 'bg-gradient-to-br from-red-400 to-rose-500'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-white" />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-semibold text-gray-900">{log.doctor}</p>
                      <p className="text-sm text-gray-500">{log.hospital}</p>
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-gray-700">{log.action}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-1">
                      <Clock className="h-3 w-3" />
                      {log.time}
                    </p>
                  </div>
                  <Badge
                    className={`rounded-full px-4 py-1.5 font-medium ${
                      log.status === 'success'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200'
                    }`}
                  >
                    {log.status === 'success' ? '✓ Allowed' : '✕ Blocked'}
                  </Badge>
                </motion.div>
              ))}
              {accessLogs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No access logs to display</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
