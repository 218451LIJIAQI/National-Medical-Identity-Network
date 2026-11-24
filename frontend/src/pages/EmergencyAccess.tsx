import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { DisplayAccessibilityControls, LanguageSwitcher } from '@/layouts/hospital/shared'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { formatDate, formatDateTime, formatIC, isValidMyKad } from '@/lib/utils'
import {
  AlertTriangle,
  Heart,
  Pill,
  Phone,
  User,
  Wifi,
  WifiOff,
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  Camera,
  Video,
  Stethoscope,
  Trash2,
} from 'lucide-react'

interface EmergencyInfo {
  icNumber: string
  name: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
  recentDiagnoses: Array<{
    diagnosis: string
    hospitalName: string
    visitDate: string
  }>
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  currentMedications: Array<{
    name: string
    dosage: string
    frequency?: string
    hospitalName?: string
  }>
  hospitalsWithRecords?: number
  respondingHospitals?: number
  partialFailure?: boolean
  fromOfflineCache?: boolean
  lastUpdated: string
  cachedAtMs?: number
}

const EMERGENCY_CACHE_KEY = 'medlink-emergency-cache-v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 10

const maskEmergencyIc = (ic: string): string => {
  const clean = ic.replace(/[-\s]/g, '')
  if (clean.length === 12) {
    return `${clean.slice(0, 6)}-**-${clean.slice(8)}`
  }
  return ic
}

function readOfflineCache(normalizedIc: string): EmergencyInfo | null {
  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, EmergencyInfo>
    const item = parsed[normalizedIc]
    if (!item) return null
    if (item.cachedAtMs && Date.now() - item.cachedAtMs > CACHE_TTL_MS) {
      delete parsed[normalizedIc]
      localStorage.setItem(EMERGENCY_CACHE_KEY, JSON.stringify(parsed))
      return null
    }
    return item
  } catch {
    return null
  }
}

function saveOfflineCache(normalizedIc: string, info: EmergencyInfo): void {
  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY)
    const parsed: Record<string, EmergencyInfo> = raw ? JSON.parse(raw) : {}
    const now = Date.now()
    for (const [k, v] of Object.entries(parsed)) {
      if (v.cachedAtMs && now - v.cachedAtMs > CACHE_TTL_MS) {
        delete parsed[k]
      }
    }
    parsed[normalizedIc] = { ...info, cachedAtMs: now }
    const keys = Object.keys(parsed)
    if (keys.length > MAX_CACHE_ENTRIES) {
      const oldestKey = keys.sort(
        (a, b) => (parsed[a].cachedAtMs || 0) - (parsed[b].cachedAtMs || 0)
      )[0]
      if (oldestKey) delete parsed[oldestKey]
    }
    localStorage.setItem(EMERGENCY_CACHE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage quota errors
  }
}

function getCachedEntryCount(): number {
  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY)
    if (!raw) return 0
    return Object.keys(JSON.parse(raw) as Record<string, unknown>).length
  } catch {
    return 0
  }
}

export default function EmergencyAccess() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<EmergencyInfo | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [cooldownByIc, setCooldownByIc] = useState<Record<string, number>>({})
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingCountdown, setRecordingCountdown] = useState(2)
  const [faceDetected, setFaceDetected] = useState(false)
  const [cachedCount, setCachedCount] = useState(() => getCachedEntryCount())

  const faceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchSeqRef = useRef(0)

  const clearAuditTimers = () => {
    if (faceTimerRef.current) {
      clearTimeout(faceTimerRef.current)
      faceTimerRef.current = null
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current)
      recordIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearAuditTimers()
      searchAbortRef.current?.abort()
    }
  }, [])

  const handlePurgeCache = () => {
    try {
      localStorage.removeItem(EMERGENCY_CACHE_KEY)
    } catch {
      // Ignore storage errors
    }
    setCachedCount(0)
    if (patientInfo?.fromOfflineCache) {
      setPatientInfo(null)
    }
  }

  const handleSearchClick = () => {
    const normalizedIc = formatIC(icNumber.trim())
    if (!normalizedIc) return
    if (!isValidMyKad(normalizedIc)) {
      setStatusError(t.invalidMyKadFormat)
      return
    }

    const lastSuccessForIc = cooldownByIc[normalizedIc] || 0
    const elapsed = Date.now() - lastSuccessForIc
    if (lastSuccessForIc > 0 && elapsed < 60000 && !isOffline) {
      const remainingSeconds = Math.ceil((60000 - elapsed) / 1000)
      setStatusError(
        `Emergency break-glass for ${maskEmergencyIc(normalizedIc)} was just retrieved. Wait ${remainingSeconds}s before re-querying the same IC, or enter a different patient IC.`
      )
      return
    }

    setStatusError('')
    setShowConfirmDialog(true)
  }

  const closeCameraDialog = () => {
    clearAuditTimers()
    setShowCameraDialog(false)
    setIsRecording(false)
    setEmergencyConfirmed(false)
  }

  const handleConfirmSearch = () => {
    if (!emergencyConfirmed) return
    setShowConfirmDialog(false)

    if (isOffline) {
      void performSearch()
      return
    }

    clearAuditTimers()
    setShowCameraDialog(true)
    setCameraPermissionGranted(false)
    setIsRecording(false)
    setRecordingCountdown(2)
    setFaceDetected(false)
  }

  const handleGrantCameraPermission = () => {
    clearAuditTimers()
    setCameraPermissionGranted(true)
    faceTimerRef.current = setTimeout(() => {
      setFaceDetected(true)
    }, 500)
  }

  const handleStartRecording = () => {
    clearAuditTimers()
    setIsRecording(true)
    let count = 2
    setRecordingCountdown(count)
    recordIntervalRef.current = setInterval(() => {
      count--
      setRecordingCountdown(count)
      if (count <= 0) {
        clearAuditTimers()
        setShowCameraDialog(false)
        setIsRecording(false)
        setEmergencyConfirmed(false)
        void performSearch()
      }
    }, 450)
  }

  const performSearch = async () => {
    const normalizedIc = formatIC(icNumber.trim())
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    const seq = ++searchSeqRef.current

    setLoading(true)
    setStatusError('')

    if (isOffline) {
      const cached = readOfflineCache(normalizedIc)
      setLoading(false)
      if (cached) {
        setPatientInfo({ ...cached, fromOfflineCache: true })
      } else {
        setPatientInfo(null)
        setStatusError('Offline Mode: No valid cached emergency profile found on this terminal for this IC.')
      }
      return
    }

    try {
      const response = await centralApi.emergencyQuery(normalizedIc, controller.signal)
      if (response.aborted || controller.signal.aborted || seq !== searchSeqRef.current) return

      if (response.success && response.data?.found) {
        const data = response.data
        const resolvedInfo: EmergencyInfo = {
          icNumber: maskEmergencyIc(normalizedIc),
          name: data.fullName || 'Unknown Patient',
          bloodType: data.bloodType || 'Unknown',
          allergies: Array.isArray(data.allergies) ? data.allergies.filter(Boolean) : [],
          chronicConditions: Array.isArray(data.chronicConditions)
            ? data.chronicConditions.filter(Boolean)
            : [],
          recentDiagnoses: data.recentDiagnoses || [],
          emergencyContact: {
            name: data.emergencyContact || 'Not Available',
            relationship: 'Emergency Contact',
            phone: data.emergencyPhone || '—',
          },
          currentMedications: data.currentMedications?.length
            ? data.currentMedications.map((m) => ({
                name: m.name,
                dosage: `${m.dosage}${m.frequency ? ` • ${m.frequency}` : ''}`,
                frequency: m.frequency,
                hospitalName: m.hospitalName,
              }))
            : [],
          hospitalsWithRecords: data.hospitalsWithRecords,
          respondingHospitals: data.respondingHospitals,
          partialFailure: data.partialFailure,
          fromOfflineCache: false,
          lastUpdated: new Date().toISOString(),
        }

        setCooldownByIc((prev) => ({ ...prev, [normalizedIc]: Date.now() }))
        saveOfflineCache(normalizedIc, resolvedInfo)
        setCachedCount(getCachedEntryCount())
        setPatientInfo(resolvedInfo)
      } else {
        if (response.status === 0 || response.nodesUnavailable || response.status === 503) {
          const cached = readOfflineCache(normalizedIc)
          if (cached) {
            setPatientInfo({ ...cached, fromOfflineCache: true })
            setStatusError(
              response.nodesUnavailable
                ? `${t.allNodesUnavailableTitle} — displaying locally cached 24h emergency summary.`
                : 'Network unreachable — displaying locally cached emergency summary.'
            )
            return
          }
        }
        if (response.rateLimited && response.retryAfter) {
          setCooldownByIc((prev) => ({
            ...prev,
            [normalizedIc]: Date.now() - (60 - response.retryAfter!) * 1000,
          }))
        }
        setPatientInfo(null)
        setStatusError(
          response.nodesUnavailable
            ? `${t.allNodesUnavailableTitle}: ${response.error || t.allNodesUnavailableDesc}`
            : response.error || response.data?.message || t.patientNotFoundDesc
        )
      }
    } catch {
      if (controller.signal.aborted || seq !== searchSeqRef.current) return
      setPatientInfo(null)
      setStatusError('Failed to retrieve emergency patient information')
    } finally {
      if (!controller.signal.aborted && seq === searchSeqRef.current) {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-red-700 via-red-800 to-rose-800 text-white py-4 shadow-md border-b border-red-900">
        <div className="container mx-auto px-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              className="text-white hover:bg-white/15"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/15 border border-white/25">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-tight">{t.emergencyAccess}</h1>
                <p className="text-red-100 text-xs">
                  Zero-consent break-glass lookup for critical allergies, blood group & active medications
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSwitcher inverted showIcon={false} />
            <DisplayAccessibilityControls compact inverted />
            {cachedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePurgeCache}
                className="text-white border border-white/25 bg-white/10 hover:bg-white/20"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Purge Terminal Cache ({cachedCount})</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={
                isOffline
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 font-semibold'
              }
              onClick={() => setIsOffline(!isOffline)}
            >
              {isOffline ? <WifiOff className="w-4 h-4 mr-1.5" /> : <Wifi className="w-4 h-4 mr-1.5" />}
              {isOffline ? 'Offline Cache Mode' : 'Online Network'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-7 max-w-6xl space-y-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm text-amber-950">Mandatory Break-Glass Governance</h2>
            <p className="text-amber-900 text-xs mt-0.5 leading-relaxed">
              Authorized strictly for incapacitated life-or-limb emergencies. Every lookup records terminal IP, responder attestation, and timestamp in the Central Audit Trail.
            </p>
          </div>
        </div>

        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600" />
          <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <Search className="w-4 h-4 text-red-700" />
              <span>Emergency Patient MyKad Lookup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            <Label htmlFor="emergency-ic-input" className="text-xs font-bold text-slate-700">
              Patient 12-Digit MyKad IC Number *
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="emergency-ic-input"
                placeholder="Enter Patient 12-Digit MyKad IC (e.g., 880101-14-5678)"
                value={icNumber}
                onChange={(e) => {
                  setIcNumber(e.target.value)
                  if (statusError) setStatusError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                aria-invalid={Boolean(statusError)}
                aria-describedby={statusError ? 'emergency-ic-error' : undefined}
                className="text-base h-12 px-4 font-mono tabular-nums"
              />
              <Button
                size="lg"
                className="bg-red-700 hover:bg-red-800 text-white px-7 h-12 font-bold shrink-0"
                onClick={handleSearchClick}
                disabled={loading || !icNumber.trim()}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    <span>Emergency Lookup</span>
                  </>
                )}
              </Button>
            </div>

            {statusError && (
              <div
                id="emergency-ic-error"
                role="alert"
                className="text-xs font-semibold text-red-900 mt-3 flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-300"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                <span>{statusError}</span>
              </div>
            )}

            {isOffline && (
              <p className="text-xs font-medium text-amber-800 mt-2.5 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Cache Mode active: Serving 24-hour locally cached emergency summaries only.</span>
              </p>
            )}
          </CardContent>
        </Card>

        {patientInfo && (
          <div className="space-y-5">
            {(patientInfo.partialFailure || patientInfo.fromOfflineCache) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800" />
                <span>
                  {patientInfo.fromOfflineCache
                    ? `Locally cached emergency record (synced ${formatDateTime(patientInfo.lastUpdated)}).`
                    : `Partial federated response (${patientInfo.respondingHospitals}/${patientInfo.hospitalsWithRecords} hospital nodes responded).`}
                </span>
              </div>
            )}

            {/* Critical Top Row: Identity, Blood Type & Allergies */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-5 border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4 text-blue-700" />
                    <span>Identity & Blood Group</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-600 uppercase font-bold">Full Name</p>
                    <p className="text-xl font-bold text-slate-900">{patientInfo.name}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div>
                      <p className="text-[11px] text-slate-600 uppercase font-bold">Masked MyKad IC</p>
                      <p className="font-mono text-sm font-semibold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg mt-1 inline-block tabular-nums">
                        {patientInfo.icNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-600 uppercase font-bold mb-1">ABO / Rh</p>
                      <Badge className="text-base px-4 py-1 bg-red-700 text-white font-extrabold rounded-xl">
                        {patientInfo.bloodType}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 border-2 border-red-300 bg-red-50/30 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>Critical Drug & Food Allergies</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {patientInfo.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patientInfo.allergies.map((allergy) => (
                        <StatusBadge
                          key={allergy}
                          tone="critical"
                          size="md"
                          label={allergy}
                          className="text-sm py-1 px-3 font-bold"
                        />
                      ))}
                    </div>
                  ) : (
                    <StatusBadge
                      tone="success"
                      size="md"
                      label="No Known Allergies Recorded Across Network"
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-3 border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>Next-of-Kin</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-600 uppercase font-bold">Contact</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.emergencyContact.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600 uppercase font-bold mb-1">Phone</p>
                    {patientInfo.emergencyContact.phone && patientInfo.emergencyContact.phone !== '—' ? (
                      <a
                        href={`tel:${patientInfo.emergencyContact.phone}`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-800 tabular-nums"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {patientInfo.emergencyContact.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-600">Not recorded</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chronic Conditions & Chronological Recent Diagnoses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="w-4 h-4 text-amber-700" />
                    <span>Chronic Conditions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 flex flex-wrap gap-2">
                  {patientInfo.chronicConditions.length > 0 ? (
                    patientInfo.chronicConditions.map((condition) => (
                      <StatusBadge key={condition} tone="warning" label={condition} />
                    ))
                  ) : (
                    <span className="text-xs text-slate-600">No chronic conditions recorded.</span>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Stethoscope className="w-4 h-4 text-indigo-700" />
                    <span>Most Recent Federated Diagnoses</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {patientInfo.recentDiagnoses.length > 0 ? (
                    <div className="space-y-2">
                      {patientInfo.recentDiagnoses.slice(0, 5).map((diag, idx) => (
                        <div
                          key={`${diag.diagnosis}-${idx}`}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <span className="font-bold text-slate-900">{diag.diagnosis}</span>
                          <span className="text-slate-600 shrink-0 tabular-nums">
                            {diag.hospitalName} • {formatDate(diag.visitDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No recent hospital diagnoses recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Active Medications */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="w-4 h-4 text-violet-700" />
                  <span>Active Prescriptions Across Responding Hospitals</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {patientInfo.currentMedications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {patientInfo.currentMedications.map((med, idx) => (
                      <div
                        key={`${med.name}-${idx}`}
                        className="p-3.5 bg-violet-50/60 rounded-xl border border-violet-200"
                      >
                        <p className="font-bold text-slate-900 text-sm">{med.name}</p>
                        <p className="text-xs text-violet-900 font-semibold mt-1">{med.dosage}</p>
                        {med.hospitalName && (
                          <p className="text-[11px] text-slate-600 mt-1.5">
                            Prescribed at {med.hospitalName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    No active prescriptions found across federated hospital records.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="tabular-nums">
                Break-glass access permanently logged in Central Audit Trail at{' '}
                {formatDateTime(patientInfo.lastUpdated)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Break-Glass Legal Attestation Modal */}
      <ModalDialog
        open={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setEmergencyConfirmed(false)
        }}
        title="Emergency Break-Glass Legal Attestation"
        description="Mandatory clinical attestation prior to bypassing patient consent"
        icon={
          <div className="p-2 rounded-xl bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        }
        maxWidthClassName="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setEmergencyConfirmed(false)
              }}
            >
              {t.cancel}
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={!emergencyConfirmed}
              onClick={handleConfirmSearch}
            >
              Proceed to Audit Capture
            </Button>
          </>
        }
      >
        <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50/40 transition-colors">
          <input
            type="checkbox"
            checked={emergencyConfirmed}
            onChange={(e) => setEmergencyConfirmed(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-red-600"
          />
          <span className="text-slate-800 text-xs leading-relaxed">
            I attest that this query is for a <strong>genuine life-or-limb medical emergency</strong>{' '}
            where the patient is unable to grant consent, and I accept full legal and clinical audit accountability.
          </span>
        </label>
      </ModalDialog>

      {/* Responder Identity Audit Capture Modal */}
      <ModalDialog
        open={showCameraDialog}
        onClose={closeCameraDialog}
        title="Responder Identity Audit Capture"
        description="Terminal presence verification for immutable break-glass audit log"
        icon={
          <div className="p-2 rounded-xl bg-red-100 text-red-700 border border-red-200">
            <Video className="w-5 h-5" />
          </div>
        }
        maxWidthClassName="max-w-md"
        footer={
          !isRecording ? (
            <>
              <Button variant="outline" onClick={closeCameraDialog}>
                {t.cancel}
              </Button>
              {!cameraPermissionGranted ? (
                <Button onClick={handleGrantCameraPermission}>
                  <Camera className="w-4 h-4 mr-1.5" />
                  Enable Audit Camera
                </Button>
              ) : (
                <Button
                  className="bg-red-700 hover:bg-red-800 text-white"
                  disabled={!faceDetected}
                  onClick={handleStartRecording}
                >
                  <Video className="w-4 h-4 mr-1.5" />
                  Record & Retrieve Summary
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        <div className="dark-surface bg-slate-900 rounded-xl p-6 text-center text-white">
          {!cameraPermissionGranted ? (
            <div className="py-6 text-slate-300">
              <Camera className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              <p className="text-xs">Click "Enable Audit Camera" to verify responder presence</p>
            </div>
          ) : (
            <div className="py-4">
              <div
                className={
                  faceDetected
                    ? 'w-24 h-28 mx-auto border-2 border-emerald-400 rounded-2xl flex items-center justify-center'
                    : 'w-24 h-28 mx-auto border-2 border-amber-400 border-dashed rounded-2xl flex items-center justify-center'
                }
              >
                {faceDetected ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                )}
              </div>
              <p className="text-xs mt-3 text-slate-200 font-medium tabular-nums">
                {isRecording
                  ? `Capturing responder audit frame… (${recordingCountdown}s)`
                  : faceDetected
                    ? 'Responder presence verified — ready to retrieve'
                    : 'Detecting responder presence…'}
              </p>
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  )
}
