import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertCircle,
  CreditCard,
  MapPin,
  Stethoscope,
  ShieldAlert,
  UserX,
  WifiOff,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { formatIC, getHospitalColor } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

function QueryNetworkVisualization({ step }: { step: number }) {
  const steps = [
    { id: 1, label: 'Authenticating', icon: '🔐' },
    { id: 2, label: 'Looking up index', icon: '🔍' },
    { id: 3, label: 'Querying hospitals', icon: '📡' },
    { id: 4, label: 'Collecting data', icon: '📥' },
    { id: 5, label: 'Complete', icon: '✅' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all ${
                  step > s.id
                    ? 'bg-emerald-100 text-emerald-700 font-bold'
                    : step === s.id
                      ? 'bg-blue-100 text-blue-700 ring-4 ring-blue-50'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s.id ? '✓' : s.icon}
              </div>
              <span className={`text-xs mt-2 font-medium ${step >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 bg-gray-200 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300"
                  style={{ width: step > s.id ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
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
  | { kind: 'privacy_denied'; message: string; ic: string }
  | { kind: 'not_found'; message: string; ic: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'network'; message: string }
  | null

export default function PatientSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [icNumber, setIcNumber] = useState('')
  const [searchedIc, setSearchedIc] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [hospitalResults, setHospitalResults] = useState<HospitalResult[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [queryTime, setQueryTime] = useState(0)
  const [partialFailure, setPartialFailure] = useState(false)
  const [failedHospitals, setFailedHospitals] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [errorState, setErrorState] = useState<SearchErrorState>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    const formattedIc = formatIC(icNumber.trim())
    if (!formattedIc) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid patient MyKad IC number',
        variant: 'destructive',
      })
      return
    }

    setSearchedIc(formattedIc)
    setIsSearching(true)
    setShowResults(false)
    setErrorState(null)
    setPartialFailure(false)
    setFailedHospitals([])
    setHospitalResults([])

    const now = new Date().toISOString()
    setQuerySteps([
      { step: 1, action: 'Initiating query', from: 'Doctor Portal', to: 'Central Hub', status: 'completed', timestamp: now },
      { step: 2, action: 'Authenticating request', from: 'Central Hub', to: 'Auth & Privacy Policy', status: 'in_progress', timestamp: now },
    ])

    try {
      const response = await centralApi.queryPatient(formattedIc)

      if (response.success && response.data) {
        setQuerySteps(
          response.data.querySteps?.length
            ? response.data.querySteps
            : [
                { step: 1, action: 'Authenticated & Policy Checked', from: 'Doctor Portal', to: 'Central Hub', status: 'completed', timestamp: now },
                { step: 2, action: 'Federated Retrieval Complete', from: 'Central Hub', to: 'Hospital Nodes', status: 'completed', timestamp: now },
              ]
        )
        setHospitalResults(response.data.hospitals as HospitalResult[])
        setTotalRecords(response.data.totalRecords)
        setQueryTime(response.data.queryTime)
        setPartialFailure(Boolean(response.data.partialFailure))
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
      setQuerySteps([])
      setErrorState({
        kind: 'network',
        message: t.networkError,
      })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.heroSoftGradient} border ${theme.borderColor} p-7 shadow-lg`}>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${theme.buttonGradient} rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md`}>
              <Search className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>{theme.name}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>{theme.city}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t.patientSearch}</h1>
              <p className="text-slate-600 text-sm mt-0.5">
                Federated patient record discovery with zero-trust privacy consent enforcement
              </p>
            </div>
          </div>
          <Badge className={`${theme.badgeClass} border px-3.5 py-1.5`}>
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
            Cross-Hospital Federated Query
          </Badge>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className={`bg-gradient-to-r ${theme.cardHeaderGradient} border-b border-slate-100 p-6`}>
          <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
            <div className={`p-2 ${theme.bgMedium} rounded-xl`}>
              <CreditCard className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            Enter Patient MyKad IC Number
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Queries the Central Patient Index and retrieves read-only records from authorized hospitals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g., 880101-14-5678"
              value={icNumber}
              onChange={(e) => setIcNumber(e.target.value)}
              disabled={isSearching}
              className="text-lg h-12 px-4 rounded-xl font-mono flex-1"
            />
            <Button
              type="submit"
              disabled={isSearching}
              size="lg"
              className={`h-12 px-7 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white shadow-md font-semibold`}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Search Network
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Distinct Semantic Error / Policy Banners */}
      {errorState?.kind === 'privacy_denied' && (
        <Card className="border-2 border-red-300 bg-red-50/90 rounded-2xl shadow-md">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-red-900">{t.privacyRestrictedTitle}</h3>
                <Badge variant="destructive">HTTP 403 • Audited</Badge>
              </div>
              <p className="text-sm text-red-800">{errorState.message}</p>
              <p className="text-xs text-red-600 pt-1">
                Patient IC <span className="font-mono font-semibold">{errorState.ic}</span> has explicitly blocked record access for <strong>{theme.name}</strong>. Use Emergency Break-Glass only in life-threatening emergencies.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'not_found' && (
        <Card className="border-2 border-amber-200 bg-amber-50/90 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
                <UserX className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-950">{t.patientNotFoundTitle}</h3>
                <p className="text-sm text-amber-800 mt-0.5">{errorState.message}</p>
                <p className="text-xs text-amber-700 mt-1 font-mono">Queried IC: {errorState.ic}</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/doctor/patient/${encodeURIComponent(errorState.ic)}/new-record`)}
              className={`bg-gradient-to-r ${theme.buttonGradient} text-white rounded-xl shrink-0`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Register & Create First Record
            </Button>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'forbidden' && (
        <Card className="border-2 border-orange-300 bg-orange-50 rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3 text-orange-900">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
            <div>
              <p className="font-bold">{t.insufficientPermissions}</p>
              <p className="text-sm text-orange-800">{errorState.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorState?.kind === 'network' && (
        <Card className="border-2 border-slate-300 bg-slate-50 rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3 text-slate-800">
            <WifiOff className="w-6 h-6 text-slate-600 shrink-0" />
            <div>
              <p className="font-bold">{t.networkError}</p>
              <p className="text-sm text-slate-600">{errorState.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {querySteps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <QueryNetworkVisualization step={showResults ? 5 : querySteps.length} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Federated Handshake Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {querySteps.slice(0, 4).map((step) => (
                    <div
                      key={`${step.step}-${step.to}`}
                      className={`p-3 rounded-lg text-center border text-xs ${
                        step.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : step.status === 'failed'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <p className="font-semibold truncate">{step.action}</p>
                      <p className="text-[11px] opacity-75 truncate">{step.to}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResults && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {partialFailure && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">{t.partialHospitalFailureWarning}</p>
                  {failedHospitals.length > 0 && (
                    <p className="text-xs text-amber-800 mt-0.5">
                      Unreachable nodes: {failedHospitals.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm overflow-hidden">
              <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Patient Found: <span className="font-mono">{searchedIc}</span>
                    </h3>
                    <p className="text-emerald-800 text-sm">
                      {totalRecords} medical records retrieved across {hospitalResults.filter((h) => h.recordCount > 0).length} hospital(s)
                    </p>
                  </div>
                </div>
                <div className="text-right px-4 py-2.5 bg-white/80 rounded-xl border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">Round-trip latency</p>
                  <p className="text-2xl font-bold text-emerald-800">{queryTime}ms</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${theme.cardHeaderGradient} border-b border-slate-100 p-5`}>
                <CardTitle className="flex items-center gap-2.5 text-slate-900 text-base">
                  <Building2 className={`w-5 h-5 ${theme.iconColor}`} />
                  Connected Hospital Node Responses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hospitalResults.map((hospital) => {
                    const color = getHospitalColor(hospital.hospitalId)
                    const isError = hospital.status !== 'success'
                    return (
                      <div
                        key={hospital.hospitalId}
                        className={`p-4 rounded-xl border transition-all ${
                          isError ? 'bg-red-50/50 border-red-200' : 'bg-slate-50/60 border-slate-200'
                        }`}
                        style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{hospital.hospitalName}</h4>
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-600">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <span>{hospital.recordCount} record(s)</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {isError ? hospital.error || 'Node unreachable' : `Latency: ${hospital.responseTime}ms`}
                            </p>
                          </div>
                          {isError ? (
                            <Badge variant="destructive" className="text-[10px]">Offline</Badge>
                          ) : hospital.recordCount === 0 ? (
                            <AlertCircle className="h-4 w-4 text-slate-300" />
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                              Synced
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-center gap-4 pt-2 pb-6">
              <Button
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}`)}
                size="lg"
                className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white shadow-md font-semibold`}
              >
                View Unified Timeline
              </Button>
              <Button
                variant="outline"
                size="lg"
                className={`h-12 px-6 rounded-xl ${theme.textColor} border-2 ${theme.borderColor} font-semibold`}
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}/new-record`)}
              >
                Create Consultation Record
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
