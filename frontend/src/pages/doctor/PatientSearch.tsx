import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi, type CrossHospitalQueryDto } from '@/lib/api'
import { formatIC } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  Search, Loader2, Building2, FileText, Clock, CreditCard, ShieldOff, ArrowRight, UserPlus,
} from 'lucide-react'

const SAMPLE_PATIENTS = [
  { ic: '880101-14-5678', name: 'Ahmad bin Abdullah (5 Hospitals)' },
  { ic: '950320-10-1234', name: 'Siti Nurhaliza binti Mohd' },
  { ic: '550715-07-9999', name: 'Tan Ah Kow' },
  { ic: '820425-12-7777', name: 'Aishah binti Mohd Yusof' },
]

export default function PatientSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [icInput, setIcInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<CrossHospitalQueryDto | null>(null)

  const runSearch = async (rawIc: string) => {
    const formatted = formatIC(rawIc)
    if (!formatted) {
      toast({
        title: 'Enter a valid IC number',
        description: 'Provide a Malaysian MyKad IC number (e.g. 880101-14-5678).',
        variant: 'destructive',
      })
      return
    }

    setIcInput(formatted)
    setLoading(true)
    setQueryResult(null)
    try {
      const response = await centralApi.queryPatient(formatted)
      if (!response.success || !response.data) {
        toast({
          title: 'Query failed',
          description: response.error || 'Unable to query federated index.',
          variant: 'destructive',
        })
        return
      }
      setQueryResult(response.data)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(icInput)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">National Federated Patient Search</h1>
        <p className="text-gray-500 mt-1">
          Query longitudinal medical records across all authorized MedLink MY hospitals using the patient&apos;s MyKad IC
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Search by MyKad Identity Number</CardTitle>
          <CardDescription>
            Consent rules and immutable audit logging are enforced automatically by the MOH Central Hub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                value={icInput}
                onChange={(e) => setIcInput(e.target.value)}
                placeholder="e.g. 880101-14-5678"
                className="pl-10 h-11 font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className={`h-11 px-6 rounded-xl text-white bg-gradient-to-r ${theme.buttonGradient}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Querying Network...
                </>
              ) : (
                'Query National Network'
              )}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Sample MyKad Identities
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PATIENTS.map((sample) => (
                <button
                  key={sample.ic}
                  type="button"
                  onClick={() => void runSearch(sample.ic)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 text-xs text-gray-700 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>{sample.name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {queryResult && queryResult.accessDenied && (
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldOff className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">Access Denied by Patient Privacy Settings</h2>
                <p className="text-sm text-red-700 mt-1">
                  {queryResult.message || `Patient (${queryResult.icNumber}) has restricted cross-hospital record access for ${theme.name}.`}
                </p>
                <p className="text-xs text-red-600/80 mt-1">
                  This blocked attempt has been recorded in the patient&apos;s audit log. Ask the patient to grant consent in their Privacy portal if clinical access is required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {queryResult && !queryResult.accessDenied && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 font-mono">{queryResult.icNumber}</h2>
                <Badge variant={queryResult.totalRecords > 0 ? 'success' : 'secondary'}>
                  {queryResult.totalRecords} record(s) found
                </Badge>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5" />
                Federated query completed in {queryResult.queryTime}ms across {queryResult.hospitals.length} hospital node(s)
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {queryResult.totalRecords > 0 && (
                <Button
                  onClick={() => navigate(`/doctor/patient/${encodeURIComponent(queryResult.icNumber)}`)}
                  className={`rounded-xl gap-2 text-white bg-gradient-to-r ${theme.buttonGradient}`}
                >
                  Open Unified Timeline
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(queryResult.icNumber)}/new-record`)}
                className="rounded-xl gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Local Record
              </Button>
            </div>
          </div>

          {queryResult.hospitals.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {queryResult.hospitals.map((hosp) => {
                const hospTheme = getHospitalTheme(hosp.hospitalId)
                return (
                  <Card key={hosp.hospitalId} className="border-slate-200/80 overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: hospTheme.primaryColor }} />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hospTheme.bgLight} ${hospTheme.textColor}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{hosp.hospitalName}</p>
                            <p className="text-xs text-gray-500">{hosp.responseTime}ms response</p>
                          </div>
                        </div>
                        <Badge className={hospTheme.badgeClass}>
                          <FileText className="w-3 h-3 mr-1" />
                          {hosp.recordCount}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-slate-200/80">
              <CardContent className="p-8 text-center text-gray-500">
                No existing medical records were found in the national index for IC <span className="font-mono font-semibold">{queryResult.icNumber}</span>.
                You can register this patient by creating a new clinical record.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
