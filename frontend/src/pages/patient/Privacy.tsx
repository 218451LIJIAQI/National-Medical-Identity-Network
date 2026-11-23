import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { formatTimeAgo, formatActorDisplayName, downloadJsonFile } from '@/lib/utils'
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
}

interface AccessLog {
  id: string
  doctor: string
  hospital: string
  time: string
  action: string
  status: 'success' | 'blocked'
}

interface SensitiveFlags {
  mentalHealth: boolean
  reproductiveHealth: boolean
  substanceAbuse: boolean
  hivStatus: boolean
}

const DEFAULT_SENSITIVE_FLAGS: SensitiveFlags = {
  mentalHealth: true,
  reproductiveHealth: true,
  substanceAbuse: true,
  hivStatus: true,
}

export default function PatientPrivacy() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [hospitals, setHospitals] = useState<HospitalAccess[]>([])
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [updatingHospitalId, setUpdatingHospitalId] = useState<string | null>(null)

  const storageKey = `medlink_sensitive_prefs_${user?.icNumber || 'default'}`

  const [sensitiveRecords, setSensitiveRecords] = useState<SensitiveFlags>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        return { ...DEFAULT_SENSITIVE_FLAGS, ...JSON.parse(saved) }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SENSITIVE_FLAGS
  })

  const refreshAccessLogs = useCallback(async () => {
    const logsRes = await centralApi.getMyAccessLogs(25)
    if (logsRes.success && logsRes.data) {
      setAccessLogs(
        logsRes.data.map((log) => ({
          id: log.id,
          doctor: formatActorDisplayName(log.actorName, log.actorId, log.actorType),
          hospital: log.hospitalName,
          time: formatTimeAgo(log.timestamp),
          action: log.details || 'Viewed medical records',
          status: log.success ? ('success' as const) : ('blocked' as const),
        }))
      )
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [privacyRes] = await Promise.all([
          centralApi.getPrivacySettings(),
          refreshAccessLogs(),
        ])

        if (privacyRes.success && privacyRes.data) {
          setHospitals(
            privacyRes.data.map((h) => ({
              id: h.hospitalId,
              name: h.hospitalName,
              city: h.city,
              allowed: !h.isBlocked,
            }))
          )
        }
      } catch (error) {
        console.error('Failed to load privacy data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [refreshAccessLogs])

  const toggleHospitalAccess = async (hospitalId: string) => {
    const hospital = hospitals.find((h) => h.id === hospitalId)
    if (!hospital || updatingHospitalId) return

    const newAllowed = !hospital.allowed
    setUpdatingHospitalId(hospitalId)

    try {
      const response = await centralApi.setHospitalAccess(hospitalId, !newAllowed)

      if (response.success) {
        setHospitals((prev) =>
          prev.map((h) => (h.id === hospitalId ? { ...h, allowed: newAllowed } : h))
        )
        await refreshAccessLogs()
        toast({
          title: newAllowed ? 'Access Granted' : 'Access Revoked',
          description: `${hospital.name} ${newAllowed ? 'can now' : 'can no longer'} access your records`,
        })
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update hospital access',
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
    } finally {
      setUpdatingHospitalId(null)
    }
  }

  const toggleSensitiveRecord = (key: keyof SensitiveFlags) => {
    setSensitiveRecords((prev) => {
      const newValue = !prev[key]
      const updated = { ...prev, [key]: newValue }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        // ignore storage errors
      }
      toast({
        title: newValue ? 'Protection Enabled' : 'Protection Disabled',
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} records are now ${newValue ? 'protected' : 'visible'}`,
      })
      return updated
    })
  }

  const handleDownloadData = async () => {
    if (!user?.icNumber || downloading) return
    setDownloading(true)
    try {
      const [patientRes, queryRes, privacyRes, logsRes] = await Promise.all([
        centralApi.getPatient(user.icNumber),
        centralApi.queryPatient(user.icNumber),
        centralApi.getPrivacySettings(),
        centralApi.getMyAccessLogs(100),
      ])

      const archive = {
        exportedAt: new Date().toISOString(),
        network: 'MedLink MY — National Medical Identity Network',
        patientAccount: {
          icNumber: user.icNumber,
          fullName: user.fullName,
          email: user.email,
        },
        demographicsAndClinicalSummary: patientRes.success ? patientRes.data : null,
        federatedHospitalRecords: queryRes.success ? queryRes.data : null,
        privacyConsentPolicy: {
          hospitalPermissions: privacyRes.success ? privacyRes.data : hospitals,
          sensitiveCategoryConsentRequired: sensitiveRecords,
        },
        accessAuditHistory: logsRes.success ? logsRes.data : accessLogs,
      }

      downloadJsonFile(`medlink-personal-archive-${user.icNumber}.json`, archive)
      toast({
        title: 'Personal Archive Downloaded',
        description: 'Your federated medical history, consent policy, and access audit log have been exported.',
      })
    } catch (error) {
      console.error('Failed to export personal data:', error)
      toast({
        title: 'Export Failed',
        description: 'Unable to compile your medical archive right now. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
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
      transition={{ duration: 0.4 }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-500/25">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-2">Zero-Trust Consent</Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">{t.privacySettings}</h1>
              <p className="text-purple-100">
                Enforced across central federated queries and direct hospital clinical APIs
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            disabled={downloading}
            className="gap-2 border border-white/30 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 rounded-xl h-12 px-6 font-semibold"
            onClick={handleDownloadData}
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {t.downloadMyData}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Data Sovereignty</p>
                <p className="font-bold text-green-900 text-lg">Enforced</p>
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
                <p className="font-bold">
                  {hospitals.filter((h) => h.allowed).length} of {hospitals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Authorized Accesses</p>
                <p className="font-bold">{accessLogs.filter((l) => l.status === 'success').length} events</p>
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
                <p className="font-bold text-red-900">{accessLogs.filter((l) => l.status === 'blocked').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {t.hospitalAccessControl}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-600 mb-6">
            Control which hospitals can view or create records for your MyKad IC. Blocked hospitals receive an immediate HTTP 403 privacy denial and every attempt is logged.
          </p>
          <div className="space-y-3">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                  hospital.allowed
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                    : 'bg-gradient-to-r from-red-50/40 to-slate-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl shadow-md ${
                      hospital.allowed
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-br from-red-400 to-rose-500'
                    }`}
                  >
                    {hospital.allowed ? (
                      <Unlock className="w-5 h-5 text-white" />
                    ) : (
                      <Lock className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{hospital.name}</p>
                    <p className="text-sm text-gray-500">{hospital.city}</p>
                  </div>
                </div>
                <Button
                  variant={hospital.allowed ? 'destructive' : 'default'}
                  size="sm"
                  disabled={updatingHospitalId === hospital.id}
                  onClick={() => toggleHospitalAccess(hospital.id)}
                  className={`rounded-xl px-5 h-10 font-medium ${
                    hospital.allowed
                      ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  {updatingHospitalId === hospital.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hospital.allowed ? (
                    t.revokeAccess
                  ) : (
                    t.grantAccess
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-white border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {t.sensitiveRecordsProtection}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-600 mb-6">
            Choose which categories of sensitive specialty records require explicit step-up patient consent. Your preferences are saved locally and included in your exported privacy archive.
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
                className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  sensitiveRecords[item.key]
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleSensitiveRecord(item.key)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="font-semibold text-gray-900">{item.label}</span>
                </div>
                <Badge
                  className={`rounded-full px-4 py-1 font-medium ${
                    sensitiveRecords[item.key]
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {sensitiveRecords[item.key] ? 'Protected' : 'Visible'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <CardHeader className="bg-gradient-to-r from-violet-50/50 to-white border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/25">
              <Eye className="h-5 w-5 text-white" />
            </div>
            {t.recentAccessTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {accessLogs.map((log) => (
              <div
                key={log.id}
                className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  log.status === 'blocked'
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                    : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2.5 rounded-xl ${
                      log.status === 'success'
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                        : 'bg-gradient-to-br from-red-400 to-rose-500'
                    }`}
                  >
                    {log.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{log.doctor}</p>
                    <p className="text-sm text-gray-500">{log.hospital}</p>
                  </div>
                </div>
                <div className="text-right ml-auto mr-2">
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
                      : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                  }`}
                >
                  {log.status === 'success' ? 'Allowed' : 'Blocked'}
                </Badge>
              </div>
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
  )
}
