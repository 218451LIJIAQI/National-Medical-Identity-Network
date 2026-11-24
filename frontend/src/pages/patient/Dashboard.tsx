import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { formatDate, formatTimeAgo, formatActorDisplayName, formatIC } from '@/lib/utils'
import {
  User,
  Heart,
  FileText,
  Building2,
  Activity,
  AlertTriangle,
  Shield,
  ArrowRight,
  CreditCard,
  Pill,
  Calendar,
  Stethoscope,
  Loader2,
} from 'lucide-react'

interface PatientData {
  hospitalsCount: number
  recordsCount: number
  activeMedicationsCount: number
  lastVisit: string
  allergies: string[]
  chronicConditions: string[]
  bloodType: string
  fullName: string
  partialFailure: boolean
}

interface AccessLog {
  id: string
  timestamp: string
  action: string
  actorId: string
  actorName: string
  actorType: string
  actorHospitalId?: string
  hospitalName: string
  details: string
  success: boolean
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [patientData, setPatientData] = useState<PatientData>({
    hospitalsCount: 0,
    recordsCount: 0,
    activeMedicationsCount: 0,
    lastVisit: '—',
    allergies: [],
    chronicConditions: [],
    bloodType: '',
    fullName: '',
    partialFailure: false,
  })
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [accessLogsLoading, setAccessLogsLoading] = useState(true)

  useEffect(() => {
    async function loadPatientData() {
      if (!user?.icNumber) {
        setLoading(false)
        return
      }
      try {
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(user.icNumber),
          centralApi.getPatient(user.icNumber),
        ])

        let hospitalsCount = 0
        let recordsCount = 0
        let activeMedicationsCount = 0
        let lastVisit = '—'
        let partialFailure = false

        if (queryRes.success && queryRes.data) {
          const hospitalsWithRecords = queryRes.data.hospitals.filter((h) => h.recordCount > 0)
          hospitalsCount = hospitalsWithRecords.length
          recordsCount = queryRes.data.totalRecords
          partialFailure = Boolean(queryRes.data.partialFailure)

          const allVisitDates: string[] = []
          const activeMedicationKeys = new Set<string>()

          for (const hospital of queryRes.data.hospitals) {
            for (const rec of hospital.records || []) {
              if (rec.visitDate) {
                allVisitDates.push(rec.visitDate)
              }
              for (const rx of rec.prescriptions || []) {
                if (rx.isActive !== false && rx.medicationName) {
                  activeMedicationKeys.add(
                    `${rx.medicationName.trim().toLowerCase()}|${(rx.dosage || '').trim().toLowerCase()}`
                  )
                }
              }
            }
          }

          activeMedicationsCount = activeMedicationKeys.size
          if (allVisitDates.length > 0) {
            allVisitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            lastVisit = formatDate(allVisitDates[0])
          }
        }

        const p = patientRes.success
          ? (patientRes.data?.patient as Record<string, unknown> | undefined)
          : undefined

        setPatientData({
          hospitalsCount,
          recordsCount,
          activeMedicationsCount,
          lastVisit,
          allergies: Array.isArray(p?.allergies) ? (p?.allergies as string[]) : [],
          chronicConditions: Array.isArray(p?.chronicConditions)
            ? (p?.chronicConditions as string[])
            : [],
          bloodType: (p?.bloodType as string) || '',
          fullName: (p?.fullName as string) || '',
          partialFailure,
        })
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    void loadPatientData()
  }, [user?.icNumber])

  useEffect(() => {
    async function loadAccessLogs() {
      try {
        const response = await centralApi.getMyAccessLogs(10)
        if (response.success && response.data) {
          setAccessLogs(response.data)
        }
      } catch (error) {
        console.error('Failed to load access logs:', error)
      } finally {
        setAccessLogsLoading(false)
      }
    }
    void loadAccessLogs()
  }, [])

  return (
    <div className="space-y-6">
      {/* Patient Identity Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 p-7 text-white shadow-md">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
              <User className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl xl:text-3xl font-bold mb-1.5">
                {patientData.fullName || user?.fullName || 'Patient'}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-xs font-mono tabular-nums">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{user?.icNumber ? formatIC(user.icNumber) : '—'}</span>
                </div>
                {patientData.bloodType && (
                  <Badge className="bg-white/20 text-white border border-white/30 text-xs font-bold">
                    <Heart className="w-3.5 h-3.5 mr-1 text-red-200" />
                    Blood: {patientData.bloodType}
                  </Badge>
                )}
                {patientData.chronicConditions.map((condition) => (
                  <Badge
                    key={condition}
                    className="bg-teal-950/40 text-teal-50 border border-white/20 text-xs"
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/patient/records">
              <Button className="bg-white text-emerald-900 hover:bg-emerald-50 gap-2 font-bold">
                <FileText className="w-4 h-4" />
                {t.myRecords}
              </Button>
            </Link>
            <Link to="/patient/privacy">
              <Button
                variant="ghost"
                className="border border-white/30 bg-white/10 text-white hover:bg-white/20 gap-2 font-semibold"
              >
                <Shield className="w-4 h-4" />
                {t.privacySettings}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {patientData.partialFailure && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs font-semibold text-amber-950 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
          <span>{t.partialHospitalFailureWarning}</span>
        </div>
      )}

      {patientData.allergies.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50/70 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-red-100 rounded-xl border border-red-200 text-red-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-red-950">{t.allergiesOnFile}</p>
                <p className="text-red-800 text-xs mt-0.5">
                  Inform attending clinicians about these documented drug or food allergies
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patientData.allergies.map((allergy) => (
                <StatusBadge key={allergy} tone="critical" size="md" label={allergy} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: t.hospitalsVisited,
            value: loading ? '—' : patientData.hospitalsCount,
            icon: Building2,
            accent: 'border-t-blue-600',
            iconWrap: 'bg-blue-50 text-blue-700',
          },
          {
            label: t.medicalRecordsCount,
            value: loading ? '—' : patientData.recordsCount,
            icon: FileText,
            accent: 'border-t-emerald-600',
            iconWrap: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: t.activeMedications,
            value: loading ? '—' : patientData.activeMedicationsCount,
            icon: Pill,
            accent: 'border-t-violet-600',
            iconWrap: 'bg-violet-50 text-violet-700',
          },
          {
            label: t.lastVisit,
            value: loading ? '—' : patientData.lastVisit,
            icon: Calendar,
            accent: 'border-t-amber-600',
            iconWrap: 'bg-amber-50 text-amber-800',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border border-slate-200 border-t-4 ${stat.accent} shadow-sm rounded-2xl`}
          >
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.iconWrap}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portal Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/patient/records">
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl group h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3.5 bg-blue-600 rounded-xl text-white shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                  {t.myRecords}
                </h2>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  Inspect diagnoses, prescriptions, lab reports, and export your nationwide medical timeline
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/patient/privacy">
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl group h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3.5 bg-emerald-600 rounded-xl text-white shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {t.privacySettings}
                </h2>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  Configure hospital-level sharing consent, inspect audit history, and download your archive
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Access Audit */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900">{t.recentAccessTitle}</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Every clinical lookup, break-glass override, and blocked access attempt is recorded
          </p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {accessLogsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Loading access logs…</p>
              </div>
            ) : accessLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No external access to your records yet</p>
              </div>
            ) : (
              accessLogs.map((log) => {
                const ActorIcon =
                  log.actorType === 'doctor'
                    ? Stethoscope
                    : log.actorType === 'patient'
                      ? User
                      : Building2
                const displayName = formatActorDisplayName(log.actorName, log.actorId, log.actorType)

                return (
                  <div
                    key={log.id}
                    className={`p-4 transition-colors ${
                      log.success ? 'hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                        <ActorIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-sm text-slate-900">{displayName}</p>
                          <Badge variant="outline" className="text-xs">
                            {log.hospitalName}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {log.details || 'Viewed medical records'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-xs text-slate-500 tabular-nums">
                          {formatTimeAgo(log.timestamp)}
                        </p>
                        <StatusBadge
                          tone={log.success ? 'success' : 'blocked'}
                          label={log.success ? 'Authorized' : 'Blocked'}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
