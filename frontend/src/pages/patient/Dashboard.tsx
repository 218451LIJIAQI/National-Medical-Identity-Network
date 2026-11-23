import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi, type AuditLogDto } from '@/lib/api'
import { formatDate, formatIC, formatRelativeTime } from '@/lib/utils'
import {
  Heart, FileText, Building2, Activity, AlertTriangle, Shield,
  ArrowRight, CreditCard, Pill, Calendar, Loader2,
} from 'lucide-react'

interface PatientSummary {
  fullName: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
  hospitalsCount: number
  recordsCount: number
  activeMedicationsCount: number
  lastVisitDate: string
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<PatientSummary>({
    fullName: '',
    bloodType: 'Unknown',
    allergies: [],
    chronicConditions: [],
    hospitalsCount: 0,
    recordsCount: 0,
    activeMedicationsCount: 0,
    lastVisitDate: 'No visits yet',
  })
  const [accessLogs, setAccessLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.icNumber) return
      setLoading(true)
      try {
        const [queryRes, patientRes, logsRes] = await Promise.all([
          centralApi.queryPatient(user.icNumber),
          centralApi.getPatient(user.icNumber),
          centralApi.getMyAccessLogs(8),
        ])

        let hospitalsCount = 0
        let recordsCount = 0
        let activeMedicationsCount = 0
        let latestVisit = ''

        if (queryRes.success && queryRes.data) {
          const withRecords = queryRes.data.hospitals.filter((h) => h.recordCount > 0)
          hospitalsCount = withRecords.length
          recordsCount = queryRes.data.totalRecords

          const activeMedNames = new Set<string>()
          for (const hosp of queryRes.data.hospitals) {
            for (const rec of hosp.records || []) {
              if (rec.visitDate && (!latestVisit || rec.visitDate > latestVisit)) {
                latestVisit = rec.visitDate
              }
              for (const rx of rec.prescriptions || []) {
                if (rx.isActive) {
                  activeMedNames.add(rx.medicationName.toLowerCase())
                }
              }
            }
          }
          activeMedicationsCount = activeMedNames.size
        }

        const p = patientRes.success ? patientRes.data?.patient : null

        setSummary({
          fullName: p?.fullName || user.fullName || 'Patient',
          bloodType: p?.bloodType || 'Not recorded',
          allergies: p?.allergies || [],
          chronicConditions: p?.chronicConditions || [],
          hospitalsCount,
          recordsCount,
          activeMedicationsCount,
          lastVisitDate: latestVisit ? formatDate(latestVisit) : 'No visits yet',
        })

        if (logsRes.success && logsRes.data) {
          setAccessLogs(logsRes.data)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [user?.icNumber, user?.fullName])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your health summary...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Connected Hospitals',
      value: summary.hospitalsCount,
      sub: 'With indexed records',
      icon: Building2,
      iconWrap: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Total Medical Visits',
      value: summary.recordsCount,
      sub: 'Across MedLink network',
      icon: FileText,
      iconWrap: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Active Medications',
      value: summary.activeMedicationsCount,
      sub: 'Current prescriptions',
      icon: Pill,
      iconWrap: 'bg-violet-100 text-violet-600',
    },
    {
      label: 'Latest Clinical Visit',
      value: summary.lastVisitDate,
      sub: 'Most recent encounter',
      icon: Calendar,
      iconWrap: 'bg-amber-100 text-amber-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-white/20 text-white border-white/30">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Universal MyKad Health Identity
            </Badge>
            <h1 className="text-3xl font-bold">{summary.fullName}</h1>
            <p className="text-blue-100 font-mono text-sm">IC: {formatIC(user?.icNumber)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/15 border border-white/20 text-center">
              <p className="text-xs text-blue-100">Blood Type</p>
              <p className="text-2xl font-black">{summary.bloodType}</p>
            </div>
            <Link to="/patient/records">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl gap-2 h-11">
                View All Records
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-slate-200/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.iconWrap}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-slate-200/80">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Clinical Alert Summary
              </h2>
              <Link to="/patient/privacy" className="text-xs font-semibold text-blue-600 hover:underline">
                Manage Consent
              </Link>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Recorded Allergies
              </p>
              {summary.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.allergies.map((item) => (
                    <Badge key={item} variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">No known drug or food allergies</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Chronic Conditions
              </p>
              {summary.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.chronicConditions.map((cond) => (
                    <Badge key={cond} variant="secondary" className="px-3 py-1">
                      {cond}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No chronic conditions recorded</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Recent Record Access Log
              </h2>
              <Link to="/patient/privacy" className="text-xs font-semibold text-blue-600 hover:underline">
                Privacy Controls
              </Link>
            </div>

            {accessLogs.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                No external hospital queries recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {accessLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {log.actorName || 'Healthcare Provider'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {log.hospitalName || 'MedLink Network'} &middot; {log.details}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={log.success ? 'success' : 'destructive'} className="text-[11px]">
                        {log.success ? 'Authorized' : 'Blocked'}
                      </Badge>
                      <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
