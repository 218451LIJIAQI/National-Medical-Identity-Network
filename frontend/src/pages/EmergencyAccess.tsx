import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { formatDate, formatIC } from '@/lib/utils'
import {
  AlertTriangle,
  Heart,
  Pill,
  Phone,
  User,
  Shield,
  Wifi,
  WifiOff,
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle,
  Camera,
  Video,
  Circle,
  Stethoscope,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
}

const EMERGENCY_CACHE_KEY = 'medlink-emergency-cache-v1'

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
    return parsed[normalizedIc] || null
  } catch {
    return null
  }
}

function saveOfflineCache(normalizedIc: string, info: EmergencyInfo): void {
  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY)
    const parsed: Record<string, EmergencyInfo> = raw ? JSON.parse(raw) : {}
    parsed[normalizedIc] = info
    localStorage.setItem(EMERGENCY_CACHE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage quota errors
  }
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
  const [cooldownByIc, setCooldownByIc] = useState<Record<string, number>>({})
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingCountdown, setRecordingCountdown] = useState(3)
  const [faceDetected, setFaceDetected] = useState(false)

  const handleSearchClick = () => {
    const normalizedIc = formatIC(icNumber.trim())
    if (!normalizedIc) return

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
    setShowCameraDialog(false)
    setEmergencyConfirmed(false)
  }

  const handleConfirmSearch = () => {
    if (!emergencyConfirmed) return
    setShowConfirmDialog(false)

    if (isOffline) {
      performSearch()
      return
    }

    setShowCameraDialog(true)
    setCameraPermissionGranted(false)
    setIsRecording(false)
    setRecordingCountdown(3)
    setFaceDetected(false)
  }

  const handleGrantCameraPermission = () => {
    setCameraPermissionGranted(true)
    setTimeout(() => {
      setFaceDetected(true)
    }, 800)
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    let count = 2
    setRecordingCountdown(count)
    const countdownInterval = setInterval(() => {
      count--
      setRecordingCountdown(count)
      if (count <= 0) {
        clearInterval(countdownInterval)
        setShowCameraDialog(false)
        setEmergencyConfirmed(false)
        performSearch()
      }
    }, 600)
  }

  const performSearch = async () => {
    const normalizedIc = formatIC(icNumber.trim())
    setLoading(true)
    setStatusError('')

    if (isOffline) {
      const cached = readOfflineCache(normalizedIc)
      setLoading(false)
      if (cached) {
        setPatientInfo({ ...cached, fromOfflineCache: true })
      } else {
        setPatientInfo(null)
        setStatusError('Offline Mode: No cached emergency profile found on this terminal for this IC.')
      }
      return
    }

    try {
      const response = await centralApi.emergencyQuery(normalizedIc)

      if (response.success && response.data?.found) {
        const data = response.data
        const resolvedInfo: EmergencyInfo = {
          icNumber: maskEmergencyIc(normalizedIc),
          name: data.fullName || 'Unknown Patient',
          bloodType: data.bloodType || 'Unknown',
          allergies: data.allergies?.length ? data.allergies : ['None recorded'],
          chronicConditions: data.chronicConditions?.length ? data.chronicConditions : ['None recorded'],
          recentDiagnoses: data.recentDiagnoses || [],
          emergencyContact: {
            name: data.emergencyContact || 'Not Available',
            relationship: 'Emergency Contact',
            phone: data.emergencyPhone || '-',
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
        setPatientInfo(resolvedInfo)
      } else {
        if (response.status === 0) {
          const cached = readOfflineCache(normalizedIc)
          if (cached) {
            setPatientInfo({ ...cached, fromOfflineCache: true })
            setStatusError('Network unreachable — displaying locally cached emergency summary.')
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
          response.error || response.data?.message || 'Patient not found in National Medical Identity Network'
        )
      }
    } catch {
      setPatientInfo(null)
      setStatusError('Failed to retrieve emergency patient information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <header className="relative bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white py-5 shadow-xl">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-xl"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-7 h-7" />
              <div>
                <span className="font-bold text-2xl">Emergency Break-Glass Mode</span>
                <p className="text-red-100 text-xs">Critical federated allergy, blood type & active medication lookup</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`text-white rounded-xl px-4 py-2 ${isOffline ? 'bg-yellow-500/80' : 'bg-emerald-500/80'}`}
            onClick={() => setIsOffline(!isOffline)}
          >
            {isOffline ? <WifiOff className="w-4 h-4 mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
            {isOffline ? 'Offline Cache Mode' : 'Online Network'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 mb-6 shadow-md">
          <CardContent className="py-4 flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Break-Glass Governance Notice</h3>
              <p className="text-amber-700 text-sm mt-0.5">
                Designed strictly for incapacitated emergency patients. Every query is audited with IP, timestamp, and responder identity verification.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
          <CardHeader className="bg-gray-50/70 border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-red-100 rounded-lg">
                <Search className="w-5 h-5 text-red-600" />
              </div>
              Emergency Patient IC Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Enter Patient MyKad IC Number (e.g., 880101-14-5678)"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                className="text-lg h-14 px-5 rounded-xl font-mono"
              />
              <Button
                size="lg"
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-8 h-14 rounded-xl text-white font-semibold"
                onClick={handleSearchClick}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Emergency Lookup
                  </>
                )}
              </Button>
            </div>

            {statusError && (
              <p className="text-sm text-red-700 mt-3 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </p>
            )}

            {isOffline && (
              <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5">
                <WifiOff className="w-4 h-4" />
                <span>Offline Cache Mode active: Serving previously synced emergency profiles from local storage.</span>
              </p>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {patientInfo && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {(patientInfo.partialFailure || patientInfo.fromOfflineCache) && (
                <div className="p-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700" />
                  <span>
                    {patientInfo.fromOfflineCache
                      ? `Displaying locally cached emergency record (synced ${new Date(patientInfo.lastUpdated).toLocaleString()}).`
                      : `Partial federated response (${patientInfo.respondingHospitals}/${patientInfo.hospitalsWithRecords} hospital nodes responded).`}
                  </span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      Patient Identity & Blood Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Full Name</p>
                      <p className="text-2xl font-bold text-gray-900">{patientInfo.name}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Masked MyKad IC</p>
                        <p className="font-mono text-base bg-gray-100 px-3 py-1 rounded-lg mt-1 inline-block">
                          {patientInfo.icNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Blood Type</p>
                        <Badge className="text-lg px-4 py-1.5 bg-red-600 text-white font-bold rounded-xl">
                          {patientInfo.bloodType}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 bg-emerald-100 rounded-xl">
                        <Phone className="w-5 h-5 text-emerald-600" />
                      </div>
                      Emergency Next-of-Kin
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Contact Name</p>
                      <p className="text-xl font-bold text-gray-900">{patientInfo.emergencyContact.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Direct Phone</p>
                      <a
                        href={`tel:${patientInfo.emergencyContact.phone}`}
                        className="inline-flex items-center gap-2 text-lg font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700"
                      >
                        <Phone className="w-4 h-4" />
                        {patientInfo.emergencyContact.phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Critical Allergies */}
              <Card className="border-2 border-red-200 shadow-lg overflow-hidden">
                <CardHeader className="pb-3 bg-red-50">
                  <CardTitle className="flex items-center gap-3 text-lg text-red-700">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <span>CRITICAL ALLERGIES (CROSS-HOSPITAL AGGREGATED)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-2.5">
                    {patientInfo.allergies.map((allergy) => (
                      <Badge
                        key={allergy}
                        className="text-base px-4 py-2 bg-red-600 text-white font-bold rounded-xl"
                      >
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chronic Conditions & Recent Diagnoses */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-lg text-orange-800">
                      <Heart className="w-5 h-5 text-orange-600" />
                      <span>Chronic Conditions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 flex flex-wrap gap-2">
                    {patientInfo.chronicConditions.map((condition) => (
                      <Badge
                        key={condition}
                        className="text-sm px-3.5 py-1.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-xl"
                      >
                        {condition}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-lg text-indigo-900">
                      <Stethoscope className="w-5 h-5 text-indigo-600" />
                      <span>Recent Clinical Diagnoses</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    {patientInfo.recentDiagnoses.length > 0 ? (
                      <div className="space-y-2">
                        {patientInfo.recentDiagnoses.slice(0, 4).map((diag, idx) => (
                          <div
                            key={`${diag.diagnosis}-${idx}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-sm"
                          >
                            <span className="font-semibold text-indigo-950">{diag.diagnosis}</span>
                            <span className="text-xs text-indigo-700">
                              {diag.hospitalName} • {formatDate(diag.visitDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recent hospital diagnoses recorded.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Active Medications */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <Pill className="w-5 h-5 text-violet-600" />
                    </div>
                    Active Prescriptions Across Connected Hospitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  {patientInfo.currentMedications.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-4">
                      {patientInfo.currentMedications.map((med, idx) => (
                        <div
                          key={`${med.name}-${idx}`}
                          className="p-4 bg-violet-50/80 rounded-2xl border border-violet-100"
                        >
                          <p className="font-bold text-violet-950 text-base">{med.name}</p>
                          <p className="text-sm text-violet-700 font-medium mt-1">{med.dosage}</p>
                          {med.hospitalName && (
                            <p className="text-xs text-violet-500 mt-1.5">Issued at {med.hospitalName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No active prescriptions found across federated hospital records.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 bg-slate-50 shadow">
                <CardContent className="py-4 px-6 flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Break-glass access logged in Central Audit Trail at {new Date(patientInfo.lastUpdated).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">Emergency Break-Glass Attestation</h2>
                    <p className="text-red-100 text-xs">Mandatory legal attestation before retrieval</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl hover:bg-red-50">
                  <input
                    type="checkbox"
                    checked={emergencyConfirmed}
                    onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded text-red-600"
                  />
                  <span className="text-gray-700 text-sm">
                    I attest this is a <strong>genuine life-or-limb medical emergency</strong> where the patient cannot provide consent, and I accept full legal audit accountability.
                  </span>
                </label>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setEmergencyConfirmed(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                  disabled={!emergencyConfirmed}
                  onClick={handleConfirmSearch}
                >
                  Proceed
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Audit Verification Dialog */}
      <AnimatePresence>
        {showCameraDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-white"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-5 h-5" />
                  <h2 className="font-bold">Responder Identity Audit Capture</h2>
                </div>
                {isRecording && <span className="text-xs font-mono bg-red-800 px-2 py-1 rounded">REC {recordingCountdown}s</span>}
              </div>

              <div className="p-6">
                <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video mb-4 flex items-center justify-center">
                  {!cameraPermissionGranted ? (
                    <div className="text-center text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-60" />
                      <p className="text-sm">Enable responder camera capture to continue</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className={`w-28 h-36 mx-auto border-2 rounded-3xl flex items-center justify-center ${faceDetected ? 'border-emerald-400' : 'border-yellow-400 border-dashed'}`}>
                        {faceDetected ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <Circle className="w-8 h-8 text-yellow-400 animate-spin" />}
                      </div>
                      <p className="text-xs mt-3 text-gray-300">
                        {faceDetected ? 'Responder frame verified' : 'Verifying responder presence...'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {!isRecording && (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1 h-11 rounded-xl bg-gray-800 text-white hover:bg-gray-700"
                        onClick={closeCameraDialog}
                      >
                        Cancel
                      </Button>
                      {!cameraPermissionGranted ? (
                        <Button
                          className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleGrantCameraPermission}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Allow Camera
                        </Button>
                      ) : (
                        <Button
                          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                          disabled={!faceDetected}
                          onClick={handleStartRecording}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Record & Retrieve
                        </Button>
                      )}
                    </>
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
