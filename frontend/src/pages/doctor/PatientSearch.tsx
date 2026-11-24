import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import {
  Search,
  Loader2,
  Building2,
  FileText,
  Clock,
  CreditCard,
  MapPin,
  Stethoscope,
  ShieldAlert,
  UserX,
  WifiOff,
  AlertTriangle,
  Plus,
  Lock,
  Database,
  Network,
  Download,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { cn, formatIC, getHospitalColor, isValidMyKad } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

function QueryNetworkVisualization({ step }: { step: number }) {
  const steps = [
    { id: 1, label: 'Verify Session', icon: Lock },
    { id: 2, label: 'Central Index', icon: Database },
    { id: 3, label: 'Hospital Nodes', icon: Network },
    { id: 4, label: 'Aggregate Records', icon: Download },
    { id: 5, label: 'Complete', icon: CheckCircle2 },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between min-w-[520px]">
        {steps.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                    done
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : active
                        ? 'bg-blue-100 text-blue-800 ring-4 ring-blue-50 border border-blue-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                  )}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-semibold whitespace-nowrap',
                    step >= s.id ? 'text-slate-900' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-slate-200 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600 transition-all duration-300"
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface QueryStep {
  step: number
  action: string
  from: string
  to: string
  status: string
  timestamp: string
}

interface HospitalResult {
  hospitalId: string
  hospitalName: string
  recordCount: number
  status: 'success' | 'error' | 'timeout'
  responseTime: number
  error?: string
}

type SearchErrorState =
  | { kind: 'invalid_format'; message: string }
  | { kind: 'privacy_denied'; message: string; ic: string }
  | { kind: 'not_found'; message: string; ic: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'network'; message: string }
  | null

export default function PatientSearch() {
  const navigate = useNavigate()
  const { toast, dismiss } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const searchSeqRef = useRef(0)
  const [icNumber, setIcNumber] = useState('')
  const [searchedIc, setSearchedIc] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [hospitalResults, setHospitalResults] = useState<HospitalResult[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [queryTime, setQueryTime] = useState(0)
  const [partialFailure, setPartialFailure] = useState(false)
  const [allNodesFailed, setAllNodesFailed] = useState(false)
  const [redactedSensitiveCount, setRedactedSensitiveCount] = useState(0)
  const [failedHospitals, setFailedHospitals] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [errorState, setErrorState] = useState<SearchErrorState>(null)

  const runSearch = async (rawIc: string) => {
    const formattedIc = formatIC(rawIc.trim())
    if (!formattedIc || !isValidMyKad(formattedIc)) {
      setShowResults(false)
      setQuerySteps([])
      setErrorState({ kind: 'invalid_format', message: t.invalidMyKadFormat })
      toast({
        title: 'Invalid MyKad IC',
        description: t.invalidMyKadFormat,
        variant: 'destructive',
      })
      return
    }

    dismiss()
    const seq = ++searchSeqRef.current
    setSearchedIc(formattedIc)
    setIsSearching(true)
    setShowResults(false)
    setErrorState(null)
    setPartialFailure(false)
    setAllNodesFailed(false)
    setRedactedSensitiveCount(0)
    setFailedHospitals([])
    setHospitalResults([])

    const now = new Date().toISOString()
    setQuerySteps([
      {
        step: 1,
        action: 'Initiating query',
        from: 'Doctor Portal',
        to: 'Central Hub',
        status: 'completed',
        timestamp: now,
      },
      {
        step: 2,
        action: 'Checking consent policy',
        from: 'Central Hub',
        to: 'Privacy Guard',
        status: 'in_progress',
        timestamp: now,
      },
    ])

    try {
      const response = await centralApi.queryPatient(formattedIc)
      if (seq !== searchSeqRef.current) return

      if (response.success && response.data) {
        setQuerySteps(
          response.data.querySteps?.length
            ? response.data.querySteps
            : [
                {
                  step: 1,
                  action: 'Authenticated & Policy Checked',
                  from: 'Doctor Portal',
                  to: 'Central Hub',
                  status: 'completed',
                  timestamp: now,
                },
                {
                  step: 2,
                  action: 'Federated Retrieval Complete',
                  from: 'Central Hub',
                  to: 'Hospital Nodes',
                  status: 'completed',
                  timestamp: now,
                },
              ]
        )
        setHospitalResults(response.data.hospitals as HospitalResult[])
        setTotalRecords(response.data.totalRecords)
        setQueryTime(response.data.queryTime)
        setPartialFailure(Boolean(response.data.partialFailure))
        setAllNodesFailed(Boolean(response.data.allNodesFailed))
        setRedactedSensitiveCount(Number(response.data.redactedSensitiveCount || 0))
        setFailedHospitals(response.data.failedHospitals || [])
        setShowResults(true)
        return
      }

      setQuerySteps([])

      if (response.accessDenied) {
        setErrorState({
          kind: 'privacy_denied',
          message: response.error || t.privacyRestrictedDesc,
          ic: formattedIc,
        })
      } else if (response.notFound || response.status === 404) {
        setErrorState({
          kind: 'not_found',
          message: response.error || t.patientNotFoundDesc,
          ic: formattedIc,
        })
      } else if (response.status === 403 || response.status === 401) {
        setErrorState({
          kind: 'forbidden',
          message: response.error || t.insufficientPermissions,
        })
      } else {
        setErrorState({
          kind: 'network',
          message: response.error || t.networkError,
        })
      }
    } catch {
      if (seq !== searchSeqRef.current) return
      setQuerySteps([])
      setErrorState({
        kind: 'network',
        message: t.networkError,
      })
    } finally {
      if (seq === searchSeqRef.current) {
        setIsSearching(false)
      }
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(icNumber)
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'rounded-2xl bg-gradient-to-br border p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap',
          theme.heroSoftGradient,
          theme.borderColor
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 bg-gradient-to-br rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0',
              theme.buttonGradient
            )}
          >
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-0.5">
              <span className="font-semibold">{theme.name}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>{theme.city}, {theme.state}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t.patientSearch}</h1>
            <p className="text-slate-600 text-xs mt-0.5">
              Federated cross-hospital discovery with zero-trust patient consent enforcement
            </p>
          </div>
        </div>
        <Badge className={cn('border px-3 py-1', theme.badgeClass)}>
          <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
          Read-Only Cross-Hospital Protocol
        </Badge>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={cn('h-1 bg-gradient-to-r', theme.cardAccentGradient)} />
        <CardHeader className={cn('bg-gradient-to-r border-b border-slate-100 p-5', theme.cardHeaderGradient)}>
          <CardTitle className="flex items-center gap-2.5 text-base text-slate-900">
            <CreditCard className={cn('w-4 h-4', theme.iconColor)} />
            <span>Patient MyKad IC Lookup</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Queries the Central Patient Index and retrieves longitudinal records from authorized hospitals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="space-y-2">
            <Label htmlFor="doctor-patient-search-ic" className="text-xs font-bold text-slate-700">
              Patient 12-Digit MyKad IC Number *
            </Label>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                id="doctor-patient-search-ic"
                placeholder="e.g., 880101-14-5678"
                value={icNumber}
                onChange={(e) => {
                  setIcNumber(e.target.value)
                  if (errorState?.kind === 'invalid_format') setErrorState(null)
                }}
                aria-invalid={errorState?.kind === 'invalid_format'}
                className="text-base h-11 px-4 font-mono tabular-nums flex-1 min-w-[240px]"
              />
              <Button
                type="submit"
                disabled={!icNumber.trim() || isSearching}
                size="lg"
                className={cn('h-11 px-6 text-white font-bold bg-gradient-to-r', theme.buttonGradient)}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Querying…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Network
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Semantic Policy & Error Banners */}
      {errorState?.kind === 'invalid_format' && (
        <Card role="alert" className="border-2 border-red-300 bg-red-50 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center gap-3 text-red-900 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            <span>{errorState.message}</span>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'privacy_denied' && (
        <Card className="border-2 border-red-300 bg-red-50 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-xl border border-red-200 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-red-950">{t.privacyRestrictedTitle}</h2>
                <StatusBadge tone="blocked" label="HTTP 403 • Consent Blocked & Audited" />
              </div>
              <p className="text-sm text-red-900">{errorState.message}</p>
              <p className="text-xs text-red-800 pt-0.5">
                Patient IC <span className="font-mono font-bold tabular-nums">{errorState.ic}</span> has blocked record sharing with <strong>{theme.name}</strong>. Emergency Break-Glass is permitted only in incapacitated life-threatening emergencies.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'not_found' && (
        <Card className="border-2 border-amber-300 bg-amber-50 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl border border-amber-200 shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-amber-950">{t.patientNotFoundTitle}</h2>
                  <StatusBadge tone="warning" label="HTTP 404 • Not Indexed" />
                </div>
                <p className="text-sm text-amber-900 mt-0.5">{errorState.message}</p>
                <p className="text-xs text-amber-800 mt-1 font-mono tabular-nums">
                  Queried IC: {errorState.ic}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/doctor/patient/${encodeURIComponent(errorState.ic)}/new-record`)}
              className={cn('bg-gradient-to-r text-white shrink-0', theme.buttonGradient)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Register & Create First Record
            </Button>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'forbidden' && (
        <Card className="border-2 border-amber-300 bg-amber-50 rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" />
            <div>
              <p className="font-bold text-sm">{t.insufficientPermissions}</p>
              <p className="text-xs text-amber-900">{errorState.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'network' && (
        <Card className="border-2 border-slate-300 bg-slate-50 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap text-slate-900">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-slate-700 shrink-0" />
              <div>
                <p className="font-bold text-sm">{t.networkError}</p>
                <p className="text-xs text-slate-700">{errorState.message}</p>
              </div>
            </div>
            {searchedIc && (
              <Button variant="outline" size="sm" onClick={() => void runSearch(searchedIc)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                {t.retryLoad}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {querySteps.length > 0 && (
        <div className="space-y-4">
          <QueryNetworkVisualization step={showResults ? 5 : querySteps.length} />
          <Card className="border border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="py-3 px-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-600">
                <Clock className="h-3.5 w-3.5" />
                Federated Handshake Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {querySteps.slice(0, 8).map((step) => {
                  const isStepError = step.status === 'error' || step.status === 'failed'
                  const isCompleted = step.status === 'completed'
                  return (
                    <div
                      key={`${step.step}-${step.to}`}
                      className={cn(
                        'p-3 rounded-xl border text-xs',
                        isCompleted
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : isStepError
                            ? 'bg-red-50 border-red-300 text-red-950'
                            : 'bg-blue-50 border-blue-200 text-blue-950'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold truncate">{step.to}</span>
                        {isStepError ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] opacity-85 truncate">{step.action}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showResults && (
        <div className="space-y-4">
          {allNodesFailed ? (
            <Card className="border-2 border-red-300 bg-red-50 rounded-2xl shadow-sm">
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3.5 text-red-950">
                  <WifiOff className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base font-bold">{t.allNodesUnavailableTitle}</h2>
                    <p className="text-xs text-red-900 mt-0.5">{t.allNodesUnavailableDesc}</p>
                    {failedHospitals.length > 0 && (
                      <p className="text-xs text-red-800 mt-1 font-semibold">
                        Unreachable nodes: {failedHospitals.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" className="bg-white" onClick={() => void runSearch(searchedIc)}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  {t.retryLoad}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {partialFailure && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-sm">{t.partialHospitalFailureWarning}</p>
                    {failedHospitals.length > 0 && (
                      <p className="text-amber-900 mt-0.5">
                        Unreachable nodes: {failedHospitals.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {redactedSensitiveCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-violet-50 border border-violet-200 text-violet-950 text-xs font-semibold flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-violet-700 shrink-0" />
                  <span>
                    {t.sensitiveRedactedNotice} ({redactedSensitiveCount} encounter(s) withheld)
                  </span>
                </div>
              )}

              <Card className="border border-emerald-200 bg-emerald-50/70 rounded-2xl shadow-sm">
                <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-emerald-700 rounded-xl flex items-center justify-center text-white">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Patient Found:{' '}
                        <span className="font-mono tabular-nums">{searchedIc}</span>
                      </h2>
                      <p className="text-emerald-900 text-xs font-medium tabular-nums">
                        {totalRecords} medical record(s) retrieved across{' '}
                        {hospitalResults.filter((h) => h.recordCount > 0).length} hospital(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right px-3.5 py-2 bg-white rounded-xl border border-emerald-200">
                      <p className="text-[11px] text-emerald-800 font-semibold">Round-Trip Latency</p>
                      <p className="text-lg font-extrabold text-emerald-900 tabular-nums">{queryTime}ms</p>
                    </div>
                    <Button
                      onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}`)}
                      className={cn('bg-gradient-to-r text-white font-bold', theme.buttonGradient)}
                    >
                      View Unified Timeline
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}/new-record`)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.newRecord}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className={cn('bg-gradient-to-r border-b border-slate-100 py-4 px-5', theme.cardHeaderGradient)}>
              <CardTitle className="flex items-center gap-2 text-slate-900 text-sm">
                <Building2 className={cn('w-4 h-4', theme.iconColor)} />
                <span>Participating Hospital Node Responses</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hospitalResults.map((hospital) => {
                  const color = getHospitalColor(hospital.hospitalId)
                  const isTimeout = hospital.status === 'timeout'
                  const isError = hospital.status !== 'success'
                  return (
                    <div
                      key={hospital.hospitalId}
                      className={cn(
                        'p-4 rounded-xl border',
                        isTimeout
                          ? 'bg-amber-50/70 border-amber-300'
                          : isError
                            ? 'bg-red-50/60 border-red-200'
                            : 'bg-slate-50/70 border-slate-200'
                      )}
                      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {hospital.hospitalName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-700 tabular-nums">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>{hospital.recordCount} record(s)</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 tabular-nums">
                            {isTimeout
                              ? hospital.error || t.nodeTimeoutWarning
                              : isError
                                ? hospital.error || 'Node unreachable'
                                : `Latency: ${hospital.responseTime}ms`}
                          </p>
                        </div>
                        {isTimeout ? (
                          <StatusBadge tone="warning" label="Timeout" />
                        ) : isError ? (
                          <StatusBadge tone="critical" label="Offline" />
                        ) : (
                          <StatusBadge tone="success" label="Synced" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
