import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi, type AuditLogDto } from '@/lib/api'
import { downloadTextFile, formatRelativeTime } from '@/lib/utils'
import {
  Shield, Eye, Building2, Lock, Unlock, Download, AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react'

interface HospitalPermission {
  hospitalId: string
  hospitalName: string
  city: string
  allowed: boolean
}

export default function PatientPrivacy() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [hospitals, setHospitals] = useState<HospitalPermission[]>([])
  const [accessLogs, setAccessLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadPrivacyData = async () => {
    try {
      const [privacyRes, logsRes] = await Promise.all([
        centralApi.getPrivacySettings(),
        centralApi.getMyAccessLogs(30),
      ])

      if (privacyRes.success && privacyRes.data) {
        setHospitals(
          privacyRes.data.map((h) => ({
            hospitalId: h.hospitalId,
            hospitalName: h.hospitalName,
            city: h.city,
            allowed: !h.isBlocked,
          }))
        )
      }

      if (logsRes.success && logsRes.data) {
        setAccessLogs(logsRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPrivacyData()
  }, [])

  const toggleHospitalAccess = async (hospitalId: string) => {
    const target = hospitals.find((h) => h.hospitalId === hospitalId)
    if (!target) return

    const nextAllowed = !target.allowed
    setUpdatingId(hospitalId)
    try {
      const response = await centralApi.setHospitalAccess(hospitalId, !nextAllowed)
      if (!response.success) {
        toast({
          title: 'Failed to update consent',
          description: response.error || 'Please try again.',
          variant: 'destructive',
        })
        return
      }

      setHospitals((prev) =>
        prev.map((item) =>
          item.hospitalId === hospitalId ? { ...item, allowed: nextAllowed } : item
        )
      )

      toast({
        title: nextAllowed ? 'Hospital Access Granted' : 'Hospital Access Revoked',
        description: `${target.hospitalName} ${nextAllowed ? 'can now view' : 'is now blocked from viewing'} your cross-hospital records.`,
      })

      const refreshedLogs = await centralApi.getMyAccessLogs(30)
      if (refreshedLogs.success && refreshedLogs.data) {
        setAccessLogs(refreshedLogs.data)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const handleExportAuditReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      icNumber: user?.icNumber,
      hospitalPermissions: hospitals,
      accessHistory: accessLogs,
    }
    downloadTextFile(
      `medlink-privacy-audit-${user?.icNumber || 'patient'}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    )
    toast({
      title: 'Privacy Report Downloaded',
      description: 'Exported hospital consent matrix and immutable access audit history.',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  const authorizedCount = hospitals.filter((h) => h.allowed).length
  const blockedAttemptsCount = accessLogs.filter((log) => !log.success).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy &amp; Consent Governance</h1>
          <p className="text-gray-500 mt-1">
            Control which connected hospitals are authorized to query your national medical timeline
          </p>
        </div>
        <Button variant="outline" onClick={handleExportAuditReport} className="gap-2 rounded-xl">
          <Download className="w-4 h-4" />
          Export Consent &amp; Audit JSON
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {authorizedCount} / {hospitals.length}
              </p>
              <p className="text-xs text-gray-500">Authorized Hospitals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{accessLogs.length}</p>
              <p className="text-xs text-gray-500">Logged Access Events</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{blockedAttemptsCount}</p>
              <p className="text-xs text-gray-500">Blocked Access Attempts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Hospital Read-Access Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hospitals.map((hospital) => (
            <div
              key={hospital.hospitalId}
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-white"
            >
              <div>
                <p className="font-semibold text-gray-900">{hospital.hospitalName}</p>
                <p className="text-xs text-gray-500">{hospital.city}</p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={hospital.allowed ? 'success' : 'destructive'}>
                  {hospital.allowed ? 'Access Allowed' : 'Blocked'}
                </Badge>
                <Button
                  size="sm"
                  variant={hospital.allowed ? 'outline' : 'default'}
                  disabled={updatingId === hospital.hospitalId}
                  onClick={() => void toggleHospitalAccess(hospital.hospitalId)}
                  className="rounded-xl gap-1.5"
                >
                  {hospital.allowed ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Block Hospital
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Allow Access
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Immutable Record Access Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accessLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No access logs recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {log.actorName || 'Healthcare Provider'} &middot;{' '}
                      <span className="font-normal text-gray-600">{log.hospitalName || 'Central Hub'}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.success ? 'success' : 'destructive'}>
                      {log.success ? 'Allowed' : 'Blocked'}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(log.timestamp)}</p>
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
