import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import {
  Search, Loader2, Building2, FileText, Clock, AlertCircle,
  CreditCard, MapPin, Stethoscope, ShieldAlert, AlertTriangle, UserPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { formatIC, getHospitalColor } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

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

type SearchOutcome = 'idle' | 'found' | 'not_found' | 'access_denied' | 'network_error'

export default function PatientSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const [icNumber, setIcNumber] = useState('')
  const [searchedIc, setSearchedIc] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [outcome, setOutcome] = useState<SearchOutcome>('idle')
  const [outcomeMessage, setOutcomeMessage] = useState('')
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [hospitalResults, setHospitalResults] = useState<HospitalResult[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [queryTime, setQueryTime] = useState(0)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanIc = formatIC(icNumber)
    if (!cleanIc) {
      toast({
        title: 'Error',
        description: 'Please enter an IC number',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    setSearchedIc(cleanIc)
    setOutcome('idle')
    setOutcomeMessage('')
    setQuerySteps([])
    setHospitalResults([])

    try {
      const response = await centralApi.queryPatient(cleanIc)

      if (response.accessDenied || response.data?.accessDenied) {
        setQuerySteps(response.data?.querySteps || [])
        setOutcome('access_denied')
        setOutcomeMessage(
          response.data?.message ||
            response.error ||
            'Access denied: this patient has restricted cross-hospital record visibility for your hospital.'
        )
        return
      }

      if (response.success && response.data) {
        setQuerySteps(response.data.querySteps || [])
        setHospitalResults(response.data.hospitals || [])
        setTotalRecords(response.data.totalRecords)
        setQueryTime(response.data.queryTime)

        if (!response.data.found) {
          setOutcome('not_found')
          setOutcomeMessage('No existing medical records were found in the National Patient Index for this IC number.')
        } else {
          setOutcome('found')
        }
      } else {
        setOutcome('network_error')
        setOutcomeMessage(response.error || 'Failed to query the Central Hub')
      }
    } catch {
      setOutcome('network_error')
      setOutcomeMessage('Network error while contacting the Central Hub')
    } finally {
      setIsSearching(false)
    }
  }

  const failedNodes = hospitalResults.filter((h) => h.status !== 'success')

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={`relative overflow-hidden rounded-3xl ${theme.bgLight} border ${theme.borderColor} p-8 shadow-xl ${theme.shadowColor}`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 bg-gradient-to-br ${theme.buttonGradient} rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg`}>
                {theme.shortName}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{theme.name}</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {theme.city}
                </div>
              </div>
            </div>
            <Badge className={`${theme.bgMedium} ${theme.textColor} border ${theme.borderColor} px-4 py-1.5`}>
              <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
              Federated Cross-Hospital Query
            </Badge>
          </div>

          <div className="flex items-start gap-4">
            <div className={`p-4 bg-gradient-to-br ${theme.buttonGradient} rounded-2xl shadow-lg`}>
              <Search className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Search</h1>
              <p className="text-gray-600 text-lg">Query federated patient records across connected Malaysian hospitals in real time</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border border-gray-100 shadow-xl shadow-gray-100/50 rounded-2xl overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className={`${theme.bgLight} border-b border-gray-100 p-6`}>
          <CardTitle className="flex items-center gap-3 text-xl text-gray-800">
            <div className={`p-2.5 ${theme.bgMedium} rounded-xl`}>
              <CreditCard className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            Enter Patient IC Number
          </CardTitle>
          <CardDescription className="text-base text-gray-500 mt-2">
            Queries the Central Patient Index and retrieves authorized read-only records from indexed hospitals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="e.g., 880101-14-5678"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                disabled={isSearching}
                className="text-lg h-14 px-5 rounded-xl border-gray-200 bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              size="lg"
              className={`h-14 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg font-semibold`}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Querying Network...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Search Network
                </>
              )}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-500">
            <span>Sample ICs:</span>
            {['880101-14-5678', '950320-10-1234', '550715-07-9999', '900808-01-5555'].map((sampleIc) => (
              <button
                key={sampleIc}
                type="button"
                onClick={() => setIcNumber(sampleIc)}
                className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-700 font-mono transition-colors"
              >
                {sampleIc}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {querySteps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Federated Execution Trace ({querySteps.length} steps)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {querySteps.map((step) => (
                    <div
                      key={`${step.step}-${step.action}`}
                      className={`p-3 rounded-lg text-center border ${
                        step.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-200'
                          : step.status === 'failed'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold text-white ${
                          step.status === 'completed'
                            ? 'bg-emerald-500'
                            : step.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                      >
                        {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✕' : step.step}
                      </div>
                      <p className="text-xs font-medium truncate text-gray-800">{step.action}</p>
                      <p className="text-[11px] text-gray-500 truncate">{step.from} → {step.to}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {outcome === 'access_denied' && (
        <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-red-100 rounded-2xl">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <Badge variant="destructive" className="mb-2">Privacy Consent Blocked</Badge>
                  <h3 className="text-xl font-bold text-red-900">Cross-Hospital Access Restricted ({searchedIc})</h3>
                  <p className="text-red-800 text-sm mt-1">{outcomeMessage}</p>
                  <p className="text-xs text-red-600 mt-2">
                    This blocked query attempt has been recorded in the National Audit Ledger. The patient can grant access from their Patient Portal Privacy Settings.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}/new-record`)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Local Visit Only
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {outcome === 'not_found' && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-amber-100 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">No Network Records Found: {searchedIc}</h3>
                  <p className="text-amber-800 text-sm mt-1">{outcomeMessage}</p>
                </div>
              </div>
              <Button
                className={`bg-gradient-to-r ${theme.buttonGradient} text-white shrink-0`}
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}/new-record`)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register & Create First Record
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {outcome === 'network_error' && (
        <Card className="border-2 border-red-200 bg-red-50 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4 text-red-800">
            <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Query Failed</h3>
              <p className="text-sm">{outcomeMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {outcome === 'found' && (
        <div className="space-y-4">
          {failedNodes.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Partial Federated Response: <strong>{failedNodes.map((n) => n.hospitalName).join(', ')}</strong> failed to respond and may hold additional records.
              </span>
            </div>
          )}

          <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Search className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Patient Found: {searchedIc}
                    </h3>
                    <p className="text-emerald-700">
                      {totalRecords} record(s) retrieved across {hospitalResults.filter((h) => h.status === 'success' && h.recordCount > 0).length} hospital(s)
                    </p>
                  </div>
                </div>
                <div className="text-right p-4 bg-white/60 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-medium">Federated latency</p>
                  <p className="text-3xl font-bold text-emerald-700">{queryTime}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
            <CardHeader className={`${theme.bgLight} border-b border-gray-100 p-5`}>
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className={`p-2 ${theme.bgMedium} rounded-lg`}>
                  <Building2 className={`w-5 h-5 ${theme.iconColor}`} />
                </div>
                Indexed Hospital Nodes
              </CardTitle>
              <CardDescription className="text-gray-500">Per-hospital query status and record count</CardDescription>
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
                        isError
                          ? 'bg-red-50/60 border-red-200'
                          : 'bg-gradient-to-br from-gray-50 to-white border-gray-100 hover:shadow-md'
                      }`}
                      style={{ borderLeftColor: isError ? '#EF4444' : color, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Building2 className="h-5 w-5" style={{ color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-gray-800">{hospital.hospitalName}</h4>
                            <Badge variant={isError ? 'destructive' : 'outline'} className="text-[11px]">
                              {isError ? 'Node Error' : hospital.hospitalId === user?.hospitalId ? 'Local' : 'Read-Only'}
                            </Badge>
                          </div>
                          {isError ? (
                            <p className="text-xs text-red-600 mt-1.5">{hospital.error || 'Database unreachable'}</p>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mt-1.5">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">
                                  {hospital.recordCount} record(s)
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Response: {hospital.responseTime}ms
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-center gap-4 pt-2 pb-8">
            <Button
              onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}`)}
              size="lg"
              className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg font-semibold`}
            >
              View Complete Timeline
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={`h-12 px-6 rounded-xl ${theme.textColor} border-2 ${theme.borderColor} hover:bg-gray-50 font-semibold`}
              onClick={() => navigate(`/doctor/patient/${encodeURIComponent(searchedIc)}/new-record`)}
            >
              Create New Record
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
