import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataErrorBanner, ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { centralApi, type HospitalSummaryDto } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import {
  formatDateTime,
  formatIC,
  formatTimeAgo,
  getHospitalColor,
  isValidMyKad,
  maskIC,
} from '@/lib/utils'
import {
  Building2,
  Users,
  Activity,
  Globe,
  Loader2,
  Shield,
  TrendingUp,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Network,
  Zap,
  Search,
  FileText,
  Database,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPinned,
  RefreshCw,
} from 'lucide-react'

interface CentralStats {
  totalPatients: number
  activeHospitals: number
  todayQueries: number
  yesterdayQueries?: number
  queryChangePercent?: number
  avgResponseTime?: number
}

interface NetworkActivity {
  from: string
  to: string
  type: string
  patient: string
  time: string
  success: boolean
}

type PatientIndexResult = NonNullable<
  Awaited<ReturnType<typeof centralApi.searchPatientIndex>>['data']
>

const ACTION_LABELS: Record<string, string> = {
  query: 'Federated Query',
  view: 'Profile View',
  create: 'Record Created',
  update: 'Record / Consent Updated',
  emergency_access: 'Emergency Break-Glass',
}

function getSimulatedLatencyMs(hospitalId: string): number {
  let sum = 0
  for (let i = 0; i < hospitalId.length; i++) {
    sum += hospitalId.charCodeAt(i)
  }
  return 18 + (sum % 22)
}

export default function CentralAdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<CentralStats>({
    totalPatients: 0,
    activeHospitals: 0,
    todayQueries: 0,
    queryChangePercent: 0,
    avgResponseTime: 0.4,
  })
  const [hospitals, setHospitals] = useState<HospitalSummaryDto[]>([])
  const [networkActivity, setNetworkActivity] = useState<NetworkActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchIC, setSearchIC] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<PatientIndexResult | null>(null)
  const [searchError, setSearchError] = useState('')
  const [selectedHospital, setSelectedHospital] = useState<HospitalSummaryDto | null>(null)

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    try {
      const [statsRes, hospitalsRes, logsRes] = await Promise.all([
        centralApi.getStats(signal),
        centralApi.getHospitals(signal),
        centralApi.getAuditLogs({ limit: 20 }, signal),
      ])

      if (statsRes.aborted || hospitalsRes.aborted || logsRes.aborted) return

      if (!statsRes.success && !hospitalsRes.success) {
        setLoadError(statsRes.error || hospitalsRes.error || t.networkError)
        return
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
      if (hospitalsRes.success && hospitalsRes.data) {
        setHospitals(hospitalsRes.data)
      }
      if (logsRes.success && logsRes.data) {
        const activities = logsRes.data
          .filter((log) =>
            ['query', 'view', 'create', 'update', 'emergency_access'].includes(String(log.action))
          )
          .slice(0, 10)
          .map((log) => ({
            from: String(log.hospitalName || log.actorHospitalId || 'Central Hub'),
            to: 'Federated Network',
            type: ACTION_LABELS[String(log.action)] || 'Audit Event',
            patient: log.targetIcNumber ? maskIC(String(log.targetIcNumber)) : 'System',
            time: formatTimeAgo(String(log.timestamp)),
            success: Boolean(log.success),
          }))
        setNetworkActivity(activities)
      }
    } catch {
      if (!signal?.aborted) {
        setLoadError(t.networkError)
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedIc = formatIC(searchIC.trim())
    if (!normalizedIc) return

    if (!isValidMyKad(normalizedIc)) {
      setSearchError(t.invalidMyKadFormat)
      setSearchResult(null)
      return
    }

    setSearching(true)
    setSearchError('')
    setSearchResult(null)

    try {
      const response = await centralApi.searchPatientIndex(normalizedIc)
      if (response.success && response.data) {
        setSearchResult(response.data)
      } else {
        setSearchError(response.error || 'Patient not found in any participating hospital')
      }
    } catch {
      setSearchError('Failed to search central patient index')
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-xs text-slate-600">Loading national network telemetry…</p>
        </div>
      </div>
    )
  }

  const changePct = stats.queryChangePercent ?? 0
  const onlineNodeCount = hospitals.filter((h) => h.isActive).length
  const allNodesOnline = hospitals.length > 0 && onlineNodeCount === hospitals.length

  return (
    <div className="space-y-6">
      <div className="dark-surface rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-7 text-white shadow-md flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/15 rounded-2xl border border-white/25">
            <Network className="w-7 h-7 text-cyan-300" />
          </div>
          <div>
            <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 mb-1">
              {t.centralPortal}
            </Badge>
            <h1 className="text-2xl xl:text-3xl font-bold">
              National Medical Identity Network Governance
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Real-time pointer index oversight, node health, and immutable cross-hospital audit telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void loadData()}
            className="border border-white/25 bg-white/10 text-white hover:bg-white/20 gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            {t.refreshData}
          </Button>
          <Link to="/admin/patient-index">
            <Button
              variant="ghost"
              className="border border-white/25 bg-white/10 text-white hover:bg-white/20 gap-1.5"
            >
              <Database className="w-4 h-4" />
              {t.patientIndex}
            </Button>
          </Link>
          <Link to="/central/audit">
            <Button className="bg-white text-slate-900 hover:bg-slate-100 gap-1.5 font-bold">
              <Shield className="w-4 h-4" />
              {t.auditLogs}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadData()} />}

      {/* Real-Data KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t.connectedHospitals,
            value: stats.activeHospitals,
            sub: allNodesOnline ? 'All regional nodes active' : `${onlineNodeCount}/${hospitals.length} nodes online`,
            icon: Building2,
            accent: 'border-t-blue-600',
            iconWrap: 'bg-blue-50 text-blue-700',
          },
          {
            label: 'Indexed Patients',
            value: stats.totalPatients.toLocaleString(),
            sub: `Across ${stats.activeHospitals} sovereign DBs`,
            icon: Users,
            accent: 'border-t-emerald-600',
            iconWrap: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Federated Queries Today',
            value: stats.todayQueries,
            sub: `${changePct >= 0 ? '+' : ''}${changePct}% vs yesterday`,
            icon: Activity,
            accent: 'border-t-violet-600',
            iconWrap: 'bg-violet-50 text-violet-700',
          },
          {
            label: 'Avg Federated Latency',
            value: `${(stats.avgResponseTime ?? 0.4).toFixed(1)}s`,
            sub: 'Parallel node fan-out',
            icon: Globe,
            accent: 'border-t-cyan-600',
            iconWrap: 'bg-cyan-50 text-cyan-800',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border border-slate-200 border-t-4 ${stat.accent} shadow-sm rounded-2xl`}
          >
            <CardContent className="p-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 tabular-nums">
                  <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{stat.sub}</span>
                </p>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${stat.iconWrap}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Patient Index Lookup */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Central Patient Pointer Lookup</h2>
            <p className="text-xs text-slate-600">
              Inspect which hospital nodes hold records for a MyKad IC (central hub stores pointers only; clinical PHI is strictly redacted)
            </p>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          <form onSubmit={handleSearch} className="space-y-2">
            <Label htmlFor="central-pointer-ic-input" className="text-xs font-bold text-slate-700">
              Patient MyKad IC Number *
            </Label>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                id="central-pointer-ic-input"
                placeholder="Enter Patient MyKad IC Number (e.g., 850505-10-5111)"
                value={searchIC}
                onChange={(e) => {
                  setSearchIC(e.target.value)
                  if (searchError) setSearchError('')
                }}
                aria-invalid={Boolean(searchError)}
                className="h-11 font-mono text-sm tabular-nums flex-1 min-w-[240px]"
              />
              <Button type="submit" disabled={searching || !searchIC.trim()} className="h-11 px-6 shrink-0">
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Index
                  </>
                )}
              </Button>
            </div>
          </form>

          {searchError && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-red-900"
            >
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="space-y-4">
              {searchResult.patient && (
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {searchResult.patient.fullName}
                      </h3>
                      <p className="text-xs text-slate-600 font-mono tabular-nums">
                        {formatIC(searchResult.patient.icNumber)} • DOB: {searchResult.patient.dateOfBirth}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="capitalize text-xs">
                          {searchResult.patient.gender}
                        </Badge>
                        <StatusBadge
                          tone="info"
                          label="Zero-Trust Pointer Only • Clinical PHI Redacted"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-600 tabular-nums">
                    <p className="font-bold text-slate-900 text-sm">
                      {searchResult.totalRecords} Total Record(s)
                    </p>
                    <p>Last synced: {formatDateTime(searchResult.lastUpdated)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {searchResult.hospitals.map((hospital) => {
                  const color = getHospitalColor(hospital.hospitalId)
                  return (
                    <div
                      key={hospital.hospitalId}
                      className="p-4 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                      style={{ borderLeftWidth: 4, borderLeftColor: color }}
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {hospital.hospitalName}
                        </h4>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{hospital.city}</span>
                        </p>
                      </div>
                      <Badge variant="secondary" className="tabular-nums shrink-0">
                        <FileText className="w-3 h-3 mr-1" />
                        {hospital.recordCount}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospital Network Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital Node Directory</h2>
              <p className="text-xs text-slate-600">Select any hospital node to inspect endpoint details</p>
            </div>
            <StatusBadge
              tone={allNodesOnline ? 'success' : 'warning'}
              icon={allNodesOnline ? CheckCircle2 : AlertTriangle}
              label={
                allNodesOnline
                  ? 'All Nodes Online'
                  : `${onlineNodeCount}/${hospitals.length} Nodes Online`
              }
            />
          </div>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {hospitals.map((hospital) => {
              const color = getHospitalColor(hospital.id)
              return (
                <button
                  key={hospital.id}
                  type="button"
                  onClick={() => setSelectedHospital(hospital)}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2.5 rounded-xl shrink-0"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Building2 className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{hospital.name}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>
                          {hospital.city}, {hospital.state}
                        </span>
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <StatusBadge
                          tone={hospital.isActive ? 'success' : 'critical'}
                          label={hospital.isActive ? 'Online' : 'Offline'}
                        />
                        <span className="text-xs text-slate-600 flex items-center gap-1 tabular-nums">
                          <Zap className="w-3 h-3" />
                          {getSimulatedLatencyMs(hospital.id)}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70">
            <h2 className="text-base font-bold text-slate-900">Recent Federated Events</h2>
            <p className="text-xs text-slate-600">Live cross-hospital query & governance stream</p>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {networkActivity.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-600">
                  No recent network activity
                </div>
              ) : (
                networkActivity.map((activity, i) => (
                  <div key={i} className="p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 truncate">{activity.from}</span>
                      <span className="text-slate-600 shrink-0 tabular-nums">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge
                        tone={activity.success ? 'info' : 'blocked'}
                        label={activity.type}
                      />
                      <span className="text-xs text-slate-600 font-mono tabular-nums">
                        {activity.patient}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hospital Node Inspection Modal */}
      <ModalDialog
        open={Boolean(selectedHospital)}
        onClose={() => setSelectedHospital(null)}
        title={selectedHospital?.name || ''}
        description={selectedHospital ? `${selectedHospital.shortName} • ${selectedHospital.city}` : undefined}
        icon={
          selectedHospital ? (
            <div
              className="p-2 rounded-xl text-white"
              style={{ backgroundColor: getHospitalColor(selectedHospital.id) }}
            >
              <Building2 className="w-5 h-5" />
            </div>
          ) : undefined
        }
        maxWidthClassName="max-w-md"
        footer={
          <Button onClick={() => setSelectedHospital(null)} className="w-full">
            Close
          </Button>
        }
      >
        {selectedHospital && (
          <div className="space-y-3.5 text-sm">
            <div className="flex items-start gap-3">
              <MapPinned className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-600">Official Address</p>
                <p className="font-medium text-slate-900">{selectedHospital.address}</p>
                <p className="text-xs text-slate-600">
                  {selectedHospital.city}, {selectedHospital.state}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-600">Switchboard Phone</p>
                <p className="font-medium text-slate-900 tabular-nums">{selectedHospital.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-600">Administrative Email</p>
                <p className="font-medium text-slate-900">{selectedHospital.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Node Status</span>
              <StatusBadge
                tone={selectedHospital.isActive ? 'success' : 'critical'}
                label={selectedHospital.isActive ? 'Online & Synced' : 'Offline'}
              />
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  )
}
