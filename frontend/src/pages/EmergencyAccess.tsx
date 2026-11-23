import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { formatIC, maskIC } from '@/lib/utils'
import { useSessionState } from '@/lib/workstation-storage'
import {
  AlertTriangle, Heart, Pill, Phone, User,
  Shield, Wifi, WifiOff, ArrowLeft, Search, Loader2, CheckCircle,
  Camera, Video, Circle, Building2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmergencyInfo {
  icNumber: string
  rawIc: string
  name: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
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
  hospitalsWithRecords: number
  lastUpdated: string
  accessedAt: string
  fromCache?: boolean
}

export default function EmergencyAccess() {
  const navigate = useNavigate()
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<EmergencyInfo | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingCountdown, setRecordingCountdown] = useState(3)
  const [faceDetected, setFaceDetected] = useState(false)
  const [cachedEmergencyRecords, setCachedEmergencyRecords] = useSessionState<Record<string, EmergencyInfo>>(
    'emergency-cache',
    {}
  )

  const faceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearCameraTimers = useCallback(() => {
    if (faceTimerRef.current) {
      clearTimeout(faceTimerRef.current)
      faceTimerRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearCameraTimers()
  }, [clearCameraTimers])

  const handleSearchClick = () => {
    const clean = formatIC(icNumber)
    if (!clean) {
      setStatusError('Please enter a valid patient IC number')
      return
    }
    const remainingMs = cooldownUntil - Date.now()
    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000)
      setStatusError(`Rate limit active: please wait ${remainingSeconds} seconds before the next emergency query`)
      return
    }

    setStatusError('')
    setShowConfirmDialog(true)
  }

  const closeCameraDialog = () => {
    clearCameraTimers()
    setShowCameraDialog(false)
    setIsRecording(false)
    setEmergencyConfirmed(false)
  }

  const handleConfirmSearch = () => {
    if (!emergencyConfirmed) return
    clearCameraTimers()
    setShowConfirmDialog(false)
    setShowCameraDialog(true)
    setCameraPermissionGranted(false)
    setIsRecording(false)
    setRecordingCountdown(3)
    setFaceDetected(false)
  }

  const handleGrantCameraPermission = () => {
    clearCameraTimers()
    setCameraPermissionGranted(true)
    faceTimerRef.current = setTimeout(() => {
      setFaceDetected(true)
    }, 900)
  }

  const performSearch = async () => {
    const normalizedIc = formatIC(icNumber)
    setLoading(true)
    setStatusError('')

    if (isOffline) {
      const cached = cachedEmergencyRecords[normalizedIc]
      setLoading(false)
      if (cached) {
        setPatientInfo({ ...cached, fromCache: true })
      } else {
        setPatientInfo(null)
        setStatusError(`Offline mode active: no session-cached emergency data found for ${normalizedIc}`)
      }
      return
    }

    try {
      const response = await centralApi.emergencyQuery(normalizedIc)

      if (response.rateLimited || response.status === 429) {
        const waitSec = response.retryAfter || 60
        setCooldownUntil(Date.now() + waitSec * 1000)
        setPatientInfo(null)
        setStatusError(response.error || `Emergency query rate-limited. Please wait ${waitSec} seconds.`)
        return
      }

      if (response.success && response.data?.found) {
        setCooldownUntil(Date.now() + 60_000)
        const data = response.data
        const activeMeds =
          data.activeMedications && data.activeMedications.length > 0
            ? data.activeMedications.map((m) => ({
                name: m.medicationName,
                dosage: m.dosage,
                frequency: m.frequency,
                hospitalName: m.hospitalName,
              }))
            : []

        const resolvedInfo: EmergencyInfo = {
          icNumber: maskIC(normalizedIc),
          rawIc: normalizedIc,
          name: data.fullName || 'Unknown Patient',
          bloodType: data.bloodType || 'Unknown',
          allergies: data.allergies?.length ? data.allergies : ['None recorded'],
          chronicConditions: data.chronicConditions?.length ? data.chronicConditions : ['None recorded'],
          emergencyContact: {
            name: data.emergencyContact || 'Not Available',
            relationship: 'Registered Emergency Contact',
            phone: data.emergencyPhone || '-',
          },
          currentMedications: activeMeds,
          hospitalsWithRecords: data.hospitalsWithRecords ?? 0,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          accessedAt: new Date().toISOString(),
          fromCache: false,
        }

        setPatientInfo(resolvedInfo)
        setCachedEmergencyRecords((prev) => ({
          ...prev,
          [normalizedIc]: resolvedInfo,
        }))
      } else {
        if (response.status !== 400) {
          setCooldownUntil(Date.now() + 60_000)
        }
        const cached = cachedEmergencyRecords[normalizedIc]
        if (!response.status && cached) {
          setPatientInfo({ ...cached, fromCache: true })
          setStatusError('Network unreachable — displaying cached emergency profile from earlier in this session.')
          return
        }
        setPatientInfo(null)
        setStatusError(response.error || response.data?.message || 'Patient not found in any connected hospital')
      }
    } catch (error) {
      console.error('Emergency search failed:', error)
      setPatientInfo(null)
      setStatusError('Failed to retrieve emergency patient information')
    } finally {
      setLoading(false)
      setEmergencyConfirmed(false)
    }
  }

  const handleStartRecording = () => {
    clearCameraTimers()
    setIsRecording(true)
    let count = 3
    setRecordingCountdown(count)
    countdownIntervalRef.current = setInterval(() => {
      count -= 1
      setRecordingCountdown(count)
      if (count <= 0) {
        clearCameraTimers()
        setShowCameraDialog(false)
        setIsRecording(false)
        performSearch()
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <motion.header
        className="relative bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white py-5 shadow-xl shadow-red-500/20 overflow-hidden"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-xl"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 drop-shadow-lg" />
                <div>
                  <span className="font-bold text-2xl drop-shadow-lg">Emergency Access Mode</span>
                  <p className="text-red-100 text-xs">Critical break-glass medical summary • All lookups audited</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`text-white rounded-xl px-4 py-2 ${isOffline ? 'bg-yellow-500/80 hover:bg-yellow-500' : 'bg-emerald-500/80 hover:bg-emerald-500'} backdrop-blur-sm`}
              onClick={() => setIsOffline(!isOffline)}
            >
              {isOffline ? <WifiOff className="w-4 h-4 mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
              {isOffline ? `Offline Cache (${Object.keys(cachedEmergencyRecords).length})` : 'Online'}
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8">
        <Card className="relative border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 mb-8 shadow-lg shadow-amber-500/10 overflow-hidden">
          <CardContent className="py-5 flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-lg">Emergency Break-Glass Access Only</h3>
              <p className="text-amber-700 text-sm mt-1">
                Provides life-critical allergies, blood type, chronic conditions, active prescriptions, and emergency contact details when a patient cannot consent. Every query is permanently recorded in the National Audit Ledger and rate-limited (1 query / minute).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-100 rounded-lg">
                <Search className="w-5 h-5 text-red-600" />
              </div>
              Quick Patient Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Enter Patient IC Number (e.g., 880101-14-5678)"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                  className="text-lg py-7 px-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-8 h-14 rounded-xl shadow-lg shadow-red-500/25 font-semibold"
                onClick={handleSearchClick}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-500">
              <span>Demo emergency ICs:</span>
              {['880101-14-5678', '550715-07-9999', '950320-10-1234'].map((demoIc) => (
                <button
                  key={demoIc}
                  type="button"
                  onClick={() => setIcNumber(demoIc)}
                  className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-700 font-mono transition-colors"
                >
                  {demoIc}
                </button>
              ))}
            </div>

            {statusError && (
              <p className="text-sm text-red-700 mt-3 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {statusError}
              </p>
            )}

            {isOffline && (
              <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <WifiOff className="w-4 h-4 shrink-0" />
                Offline mode enabled: lookups read from emergency profiles cached during this browser session ({Object.keys(cachedEmergencyRecords).length} cached).
              </p>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {patientInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {patientInfo.fromCache && (
                <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-sm font-medium flex items-center gap-2">
                  <WifiOff className="w-4 h-4" />
                  Showing Offline Session Cache snapshot captured at {new Date(patientInfo.accessedAt).toLocaleString()}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/50 to-white">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-200">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      Patient Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Full Name</p>
                        <p className="text-2xl font-bold text-gray-900">{patientInfo.name}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Masked IC</p>
                          <p className="font-mono text-lg bg-gray-100 px-3 py-1.5 rounded-lg inline-block">{patientInfo.icNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Blood Type</p>
                          <Badge className="text-xl px-5 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold shadow-lg shadow-red-200 rounded-xl">
                            {patientInfo.bloodType}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Connected Nodes</p>
                          <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {patientInfo.hospitalsWithRecords} hospital(s)
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-emerald-100/50 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
                  <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50/50 to-white">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-200">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Name</p>
                        <p className="text-2xl font-bold text-gray-900">{patientInfo.emergencyContact.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Relationship</p>
                        <p className="text-gray-700 font-medium">{patientInfo.emergencyContact.relationship}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Phone</p>
                        {patientInfo.emergencyContact.phone !== '-' ? (
                          <a
                            href={`tel:${patientInfo.emergencyContact.phone}`}
                            className="inline-flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-shadow"
                          >
                            <Phone className="w-5 h-5" />
                            {patientInfo.emergencyContact.phone}
                          </a>
                        ) : (
                          <span className="text-gray-500 font-medium">No phone number on file</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-xl shadow-red-200/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-500" />
                <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50">
                  <CardTitle className="flex items-center gap-3 text-xl text-red-700">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-300">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold">ALLERGIES - CRITICAL</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {patientInfo.allergies.map((allergy) => (
                      <Badge
                        key={allergy}
                        className="text-lg px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg shadow-red-300 rounded-xl"
                      >
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl shadow-orange-100/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-3 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
                  <CardTitle className="flex items-center gap-3 text-xl text-orange-700">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-200">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    Chronic Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {patientInfo.chronicConditions.map((condition) => (
                      <Badge
                        key={condition}
                        className="text-base px-5 py-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 font-semibold rounded-xl border border-orange-200"
                      >
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/50 to-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-200">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    Active Prescriptions Across Connected Hospitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {patientInfo.currentMedications.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-4">
                      {patientInfo.currentMedications.map((med, idx) => (
                        <div
                          key={`${med.name}-${idx}`}
                          className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100"
                        >
                          <p className="font-bold text-violet-900 text-lg">{med.name}</p>
                          <p className="text-sm text-violet-700 font-medium mt-1">
                            {med.dosage} {med.frequency ? `• ${med.frequency}` : ''}
                          </p>
                          {med.hospitalName && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {med.hospitalName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No active prescriptions recorded in connected hospitals.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-r from-gray-50 to-slate-50 shadow-lg">
                <CardContent className="py-5 px-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        Emergency access logged at {new Date(patientInfo.accessedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Central index last updated: {new Date(patientInfo.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!patientInfo && !loading && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              {
                icon: Heart,
                title: 'Critical Allergies',
                desc: 'Aggregated drug & food allergies across all connected hospitals',
                topBar: 'from-red-500 to-rose-500',
                cardShadow: 'shadow-red-100/50',
                iconShadow: 'shadow-red-200',
              },
              {
                icon: Pill,
                title: 'Current Medications',
                desc: 'Live active prescriptions and dosages to avoid interactions',
                topBar: 'from-violet-500 to-purple-500',
                cardShadow: 'shadow-violet-100/50',
                iconShadow: 'shadow-violet-200',
              },
              {
                icon: Phone,
                title: 'Emergency Contacts',
                desc: 'Direct tap-to-call family & next-of-kin contact numbers',
                topBar: 'from-emerald-500 to-green-500',
                cardShadow: 'shadow-emerald-100/50',
                iconShadow: 'shadow-emerald-200',
              },
            ].map((card) => (
              <Card key={card.title} className={`relative text-center p-8 border-0 shadow-xl ${card.cardShadow} overflow-hidden`}>
                <div className={`h-1 bg-gradient-to-r ${card.topBar} absolute top-0 left-0 right-0`} />
                <div className={`w-16 h-16 mx-auto mb-5 bg-gradient-to-br ${card.topBar} rounded-2xl flex items-center justify-center shadow-lg ${card.iconShadow}`}>
                  <card.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">{card.title}</h3>
                <p className="text-gray-500 text-sm">{card.desc}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Emergency Access Confirmation</h2>
                    <p className="text-red-100 text-sm">Please read carefully before proceeding</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5" />
                    Legal Warning
                  </h3>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    This emergency access system is intended <strong>only for genuine medical emergencies</strong>.
                    All access is logged and monitored. Misuse of this system may result in:
                  </p>
                  <ul className="text-amber-700 text-sm mt-2 space-y-1 ml-4">
                    <li>• Criminal prosecution under data protection laws</li>
                    <li>• Civil liability for privacy violations</li>
                    <li>• Professional disciplinary action</li>
                  </ul>
                </div>

                <label
                  className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all duration-200 hover:border-red-300 hover:bg-red-50"
                  style={{ borderColor: emergencyConfirmed ? '#dc2626' : '#e5e7eb' }}
                >
                  <input
                    type="checkbox"
                    checked={emergencyConfirmed}
                    onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700 text-sm leading-relaxed">
                    I confirm this is a <strong>genuine medical emergency</strong> and I understand that
                    my access will be logged and may be audited. I accept legal responsibility for this access.
                  </span>
                </label>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setEmergencyConfirmed(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 h-12 rounded-xl transition-all duration-200 ${
                    emergencyConfirmed
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg shadow-red-500/25'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!emergencyConfirmed}
                  onClick={handleConfirmSearch}
                >
                  <Search className="w-5 h-5 mr-2" />
                  Proceed with Emergency Access
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCameraDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Identity Verification Recording</h2>
                    <p className="text-red-100 text-xs">Simulated responder verification capture for audit trail</p>
                  </div>
                  {isRecording && (
                    <div className="ml-auto flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 bg-red-500 rounded-full"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-sm font-mono">REC</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video mb-4">
                  {!cameraPermissionGranted ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Camera className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-sm">Responder verification check required</p>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto" />
                          <div className="w-32 h-20 bg-gray-600 rounded-t-full mt-2" />
                        </div>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className={`w-36 h-44 border-2 rounded-3xl ${faceDetected ? 'border-green-500' : 'border-yellow-500 border-dashed'}`}
                          animate={!faceDetected ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                            faceDetected ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-black'
                          }`}
                        >
                          {faceDetected ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Responder verified - Ready to log break-glass access
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 animate-spin" />
                              Verifying responder frame...
                            </>
                          )}
                        </div>
                      </div>

                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-7xl font-bold text-white drop-shadow-lg">
                            {recordingCountdown}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                      <p className="font-semibold mb-1">Audit Trail Notice</p>
                      <p className="text-red-300 text-xs leading-relaxed">
                        Break-glass emergency access metadata (timestamp, client IP, user-agent, and queried IC) is recorded in the Central Audit Ledger for compliance review.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 rounded-xl bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
                    onClick={closeCameraDialog}
                  >
                    Cancel
                  </Button>
                  {!isRecording && !cameraPermissionGranted && (
                    <Button
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                      onClick={handleGrantCameraPermission}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Verify Responder
                    </Button>
                  )}
                  {!isRecording && cameraPermissionGranted && (
                    <Button
                      className={`flex-1 h-12 rounded-xl transition-all duration-300 text-white ${
                        faceDetected
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                          : 'bg-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!faceDetected}
                      onClick={handleStartRecording}
                    >
                      <Video className="w-5 h-5 mr-2" />
                      {faceDetected ? 'Confirm & Retrieve Critical Data' : 'Waiting...'}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
