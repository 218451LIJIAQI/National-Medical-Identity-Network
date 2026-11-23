import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { centralApi, type EmergencyQueryDto } from '@/lib/api'
import { formatIC } from '@/lib/utils'
import ChipScanOverlay, { type ScanPhase } from '@/components/ChipScanOverlay'
import {
  AlertTriangle, Heart, Phone, Droplets, Pill, Shield, Clock,
  ArrowLeft, Search, Loader2, Activity, CreditCard, UserX,
} from 'lucide-react'

const EMERGENCY_DEMO_PATIENTS = [
  { ic: '880101-14-5678', label: 'Ahmad bin Abdullah (Penicillin Allergy)' },
  { ic: '550715-07-9999', label: 'Tan Ah Kow (Cardiac + CKD)' },
  { ic: '820425-12-7777', label: 'Aishah binti Mohd Yusof (O- Negative)' },
]

const SESSION_DURATION_SECONDS = 300

export default function EmergencyAccess() {
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EmergencyQueryDto | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearScanTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(() => () => clearScanTimers(), [])

  useEffect(() => {
    if (remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setResult(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingSeconds])

  const runEmergencyLookup = async (rawIc: string) => {
    const formattedIc = formatIC(rawIc)
    if (!formattedIc) return

    setLoading(true)
    setErrorMessage(null)
    setRateLimited(false)
    setResult(null)

    try {
      const response = await centralApi.emergencyQuery(formattedIc)
      if (response.statusCode === 429) {
        setRateLimited(true)
        setErrorMessage(response.error || 'Emergency break-glass cooldown active (1 request per 60 seconds per IP).')
        return
      }
      if (!response.success || !response.data) {
        setErrorMessage(response.error || 'Unable to complete emergency query.')
        return
      }
      setResult(response.data)
      if (response.data.found) {
        setRemainingSeconds(SESSION_DURATION_SECONDS)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runEmergencyLookup(icNumber)
  }

  const handleQuickMyKadScan = (targetIc: string, label: string) => {
    clearScanTimers()
    setIcNumber(targetIc)
    setScanPhase('insert')
    timersRef.current.push(
      setTimeout(() => setScanPhase('reading'), 400),
      setTimeout(() => setScanPhase('verifying'), 850),
      setTimeout(async () => {
        setScanPhase('success')
        await runEmergencyLookup(targetIc)
        setScanPhase('idle')
      }, 1250)
    )
    void label
  }

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0')
  const secs = String(remainingSeconds % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-slate-950 to-slate-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-red-200 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Exit Emergency Mode
          </Link>
          <Badge className="bg-red-600/30 text-red-200 border-red-500/50 px-3 py-1">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Audited Break-Glass Protocol
          </Badge>
        </div>

        <div className="rounded-2xl bg-red-900/35 border border-red-500/40 p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Emergency Break-Glass Medical Lookup</h1>
            <p className="text-sm text-red-100/90 mt-1">
              For life-threatening emergencies when a patient is unconscious or unable to authenticate.
              Returns only critical triage data (blood group, allergies, chronic conditions, active medications, and emergency contact).
              Every lookup is permanently recorded in the MOH National Audit Log.
            </p>
          </div>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 text-white">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <Input
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  placeholder="Enter Patient MyKad IC (e.g. 880101-14-5678)"
                  className="pl-10 h-11 bg-slate-950 border-slate-700 text-white font-mono placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !icNumber.trim()}
                className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Querying...
                  </>
                ) : (
                  'Retrieve Critical Info'
                )}
              </Button>
            </form>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Simulate Unconscious Patient MyKad Tap
              </p>
              <div className="flex flex-wrap gap-2">
                {EMERGENCY_DEMO_PATIENTS.map((demo) => (
                  <button
                    key={demo.ic}
                    type="button"
                    onClick={() => handleQuickMyKadScan(demo.ic, demo.label)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>{demo.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className={`border ${rateLimited ? 'bg-amber-950/60 border-amber-500/50' : 'bg-red-950/60 border-red-500/50'} text-white`}>
            <CardContent className="p-5 flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${rateLimited ? 'text-amber-400' : 'text-red-400'}`} />
              <div>
                <p className="font-semibold">
                  {rateLimited ? 'Emergency Rate Limit Reached (HTTP 429)' : 'Emergency Lookup Error'}
                </p>
                <p className="text-sm text-slate-300 mt-1">{errorMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && !result.found && (
          <Card className="bg-slate-900 border-amber-500/40 text-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <UserX className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">No National Medical Record Found</h2>
                <p className="text-sm text-slate-300 mt-0.5">
                  {result.message || `No indexed hospital records were found for IC ${result.icNumber}. Proceed with standard clinical trauma assessment.`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.found && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 border border-slate-800 px-5 py-3.5">
              <div>
                <h2 className="text-xl font-bold text-white">{result.fullName}</h2>
                <p className="text-xs font-mono text-slate-400">
                  IC: {result.icNumber} &middot; Indexed in {result.hospitalsWithRecords || 0} hospital(s)
                </p>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-950 border border-red-700 text-red-200 text-sm font-mono">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Session expires in {mins}:{secs}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-slate-900 border-red-500/40 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-red-400" />
                    Blood Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-red-400">{result.bloodType || 'Unknown'}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-amber-500/40 text-white md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Known Drug &amp; Material Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.allergies && result.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.allergies.map((allergy) => (
                        <Badge key={allergy} className="bg-red-600 text-white border-red-500 text-sm px-3 py-1">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-400 font-medium">No known allergies recorded</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    Chronic Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.chronicConditions && result.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.chronicConditions.map((cond) => (
                        <Badge key={cond} className="bg-slate-800 text-slate-100 border-slate-700 px-3 py-1">
                          {cond}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">None recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-cyan-400" />
                    Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.currentMedications && result.currentMedications.length > 0 ? (
                    <ul className="space-y-1.5 text-sm">
                      {result.currentMedications.map((med) => (
                        <li key={`${med.medicationName}-${med.dosage}`} className="flex items-center justify-between bg-slate-800/70 px-3 py-1.5 rounded-lg">
                          <span className="font-medium text-white">{med.medicationName}</span>
                          <span className="text-xs text-cyan-300">{med.dosage} &middot; {med.frequency}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No active prescriptions on file</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Next-of-Kin / Emergency Contact</p>
                    <p className="font-semibold">{result.emergencyContact || 'Not listed'}</p>
                  </div>
                </div>
                {result.emergencyPhone && (
                  <a
                    href={`tel:${result.emergencyPhone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                  >
                    <Activity className="w-4 h-4" />
                    {result.emergencyPhone}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ChipScanOverlay
        open={scanPhase !== 'idle'}
        phase={scanPhase}
        title="Emergency MyKad Triage Read"
        subtitle="Bypassing PIN for life-critical medical summary"
        icNumber={icNumber}
        accentFrom="from-red-600"
        accentTo="to-amber-600"
        onCancel={() => {
          clearScanTimers()
          setScanPhase('idle')
        }}
      />
    </div>
  )
}
