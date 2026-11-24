import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { cn, formatTimeAgo, formatActorDisplayName, downloadJsonFile } from '@/lib/utils'
import {
  Shield,
  Eye,
  Clock,
  Building2,
  Lock,
  Unlock,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Brain,
  Stethoscope,
  Pill,
  FlaskConical,
} from 'lucide-react'

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
    void loadData()
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
          title: newAllowed ? 'Hospital Access Granted' : 'Hospital Access Revoked',
          description: `${hospital.name} ${newAllowed ? 'can now' : 'can no longer'} access your medical records.`,
          variant: newAllowed ? 'success' : 'default',
        })
      } else {
        toast({
          title: 'Update Failed',
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

  const toggleSensitiveRecord = (key: keyof SensitiveFlags, label: string) => {
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
        description: `${label} ${newValue ? 'now requires step-up consent' : 'is visible to authorized hospitals'}.`,
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

      const patientObj = patientRes.success
        ? (patientRes.data?.patient as Record<string, unknown> | undefined)
        : undefined

      const archive = {
        exportedAt: new Date().toISOString(),
        network: 'MedLink MY — National Medical Identity Network',
        patientAccount: {
          icNumber: user.icNumber,
          fullName: user.fullName || patientObj?.fullName,
          email: patientObj?.email || undefined,
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
        description:
          'Your federated medical history, consent policy, and access audit log have been exported.',
        variant: 'success',
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
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading privacy settings…</p>
        </div>
      </div>
    )
  }

  const sensitiveItems = [
    { key: 'mentalHealth' as const, label: 'Mental Health & Psychiatry Records', icon: Brain },
    { key: 'reproductiveHealth' as const, label: 'Reproductive & Maternal Health', icon: Stethoscope },
    { key: 'substanceAbuse' as const, label: 'Substance Rehabilitation Records', icon: Pill },
    { key: 'hivStatus' as const, label: 'Infectious Disease & HIV Status', icon: FlaskConical },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 p-7 text-white shadow-md flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/15 rounded-2xl border border-white/25 shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <Badge className="bg-white/20 text-white border-0 mb-1.5">
              Zero-Trust Patient Consent
            </Badge>
            <h1 className="text-2xl xl:text-3xl font-bold">{t.privacySettings}</h1>
            <p className="text-purple-100 text-xs mt-0.5">
              Enforced across central federated queries and direct hospital clinical APIs
            </p>
          </div>
        </div>
        <Button
          disabled={downloading}
          className="gap-2 bg-white text-indigo-950 hover:bg-indigo-50 font-bold"
          onClick={handleDownloadData}
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t.downloadMyData}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        <Card className="border border-emerald-200 bg-emerald-50/70 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800">Data Sovereignty</p>
              <p className="font-extrabold text-emerald-950 text-lg">Enforced</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-700 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600">Authorized Hospitals</p>
              <p className="font-extrabold text-slate-900 text-lg tabular-nums">
                {hospitals.filter((h) => h.allowed).length} of {hospitals.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <Eye className="w-6 h-6 text-violet-700 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600">Authorized Accesses</p>
              <p className="font-extrabold text-slate-900 text-lg tabular-nums">
                {accessLogs.filter((l) => l.status === 'success').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-red-200 bg-red-50/70 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-700 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800">Blocked Attempts</p>
              <p className="font-extrabold text-red-950 text-lg tabular-nums">
                {accessLogs.filter((l) => l.status === 'blocked').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hospital-Level Consent Toggles */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600" />
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-5">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Building2 className="h-4 w-4 text-blue-700" />
            <span>{t.hospitalAccessControl}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Control which participating hospitals may view or author medical records for your MyKad IC. Blocked hospitals immediately receive an HTTP 403 privacy denial across all clinical endpoints and every attempt is logged.
          </p>
          <div className="space-y-2.5">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors',
                  hospital.allowed
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-red-50/50 border-red-200'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl text-white shrink-0',
                      hospital.allowed ? 'bg-emerald-600' : 'bg-red-600'
                    )}
                  >
                    {hospital.allowed ? (
                      <Unlock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900">{hospital.name}</p>
                      <StatusBadge
                        tone={hospital.allowed ? 'success' : 'blocked'}
                        label={hospital.allowed ? 'Authorized' : 'Blocked'}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{hospital.city}</p>
                  </div>
                </div>
                <Button
                  data-hospital-id={hospital.id}
                  aria-label={`${hospital.allowed ? t.revokeAccess : t.grantAccess}: ${hospital.name}`}
                  variant={hospital.allowed ? 'destructive' : 'default'}
                  size="sm"
                  disabled={updatingHospitalId === hospital.id}
                  onClick={() => toggleHospitalAccess(hospital.id)}
                  className={
                    hospital.allowed
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
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

      {/* Sensitive Specialty Consent Switches */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-600 to-orange-600" />
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-5">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Shield className="h-4 w-4 text-amber-700" />
            <span>{t.sensitiveRecordsProtection}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Configure step-up consent requirements for sensitive specialty categories. Preferences persist locally and are included in your downloadable PDPA data archive.
          </p>
          <div className="grid grid-cols-2 gap-3.5">
            {sensitiveItems.map((item) => {
              const Icon = item.icon
              const isProtected = sensitiveRecords[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  role="switch"
                  aria-checked={isProtected}
                  onClick={() => toggleSensitiveRecord(item.key, item.label)}
                  className={cn(
                    'flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-colors',
                    isProtected
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        isProtected
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 truncate">{item.label}</span>
                  </div>
                  <StatusBadge
                    tone={isProtected ? 'warning' : 'neutral'}
                    icon={isProtected ? Lock : Unlock}
                    label={isProtected ? 'Protected' : 'Standard'}
                  />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Access Audit Trail */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-600 to-purple-600" />
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-5">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <Eye className="h-4 w-4 text-violet-700" />
            <span>{t.recentAccessTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-2.5">
            {accessLogs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-3.5 rounded-xl border',
                  log.status === 'blocked'
                    ? 'bg-red-50/60 border-red-200'
                    : 'bg-slate-50/60 border-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-xl text-white shrink-0',
                      log.status === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    )}
                  >
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{log.doctor}</p>
                    <p className="text-xs text-slate-600">{log.hospital}</p>
                  </div>
                </div>
                <div className="text-right ml-auto mr-2">
                  <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 justify-end mt-0.5 tabular-nums">
                    <Clock className="h-3 w-3" />
                    {log.time}
                  </p>
                </div>
                <StatusBadge
                  tone={log.status === 'success' ? 'success' : 'blocked'}
                  label={log.status === 'success' ? 'Allowed' : 'Blocked'}
                />
              </div>
            ))}
            {accessLogs.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs">
                <Eye className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No external access logs recorded yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
