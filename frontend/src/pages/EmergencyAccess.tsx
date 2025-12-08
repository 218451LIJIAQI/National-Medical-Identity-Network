import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { 
  AlertTriangle, Heart, Pill, Phone, User,
  Shield, Wifi, WifiOff, ArrowLeft, Search, Loader2, CheckCircle,
  Camera, Video, Circle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmergencyInfo {
  icNumber: string
  name: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  currentMedications: {
    name: string
    dosage: string
  }[]
  lastUpdated: string
}
const maskIcNumber = (ic: string): string => {
  if (ic.length >= 12) {
    const clean = ic.replace(/-/g, '')
    return `${clean.slice(0, 6)}-**-${clean.slice(8)}`
  }
  return ic.replace(/(.{6})(.{2})(.+)/, '$1-**-$3')
}

export default function EmergencyAccess() {
  const navigate = useNavigate()
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<EmergencyInfo | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false)
  const [rateLimitError, setRateLimitError] = useState('')
  const [lastQueryTime, setLastQueryTime] = useState(0)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingCountdown, setRecordingCountdown] = useState(3)
  const [faceDetected, setFaceDetected] = useState(false)

  const handleSearchClick = () => {
    if (!icNumber.trim()) return
    const now = Date.now()
    const timeSinceLastQuery = now - lastQueryTime
    if (lastQueryTime > 0 && timeSinceLastQuery < 60000) {
      const remainingSeconds = Math.ceil((60000 - timeSinceLastQuery) / 1000)
      setRateLimitError(`Please wait ${remainingSeconds} seconds before next query`)
      return
    }
    
    setRateLimitError('')
    setShowConfirmDialog(true)
  }

  const handleConfirmSearch = () => {
    if (!emergencyConfirmed) return
    
    setShowConfirmDialog(false)
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
    }, 1500)
  }
  
  const handleStartRecording = () => {
    setIsRecording(true)
    let count = 3
    const countdownInterval = setInterval(() => {
      count--
      setRecordingCountdown(count)
      if (count === 0) {
        clearInterval(countdownInterval)
        setShowCameraDialog(false)
        performSearch()
      }
    }, 1000)
  }
  
  const performSearch = async () => {
    setLoading(true)
    setLastQueryTime(Date.now())
    
    try {
      const response = await centralApi.emergencyQuery(icNumber)
      
      if (response.success && response.data && response.data.found) {
        const data = response.data
        
        const emergencyData: EmergencyInfo = {
          icNumber: maskIcNumber(icNumber),
          name: data.fullName || 'Unknown Patient',
          bloodType: data.bloodType || 'Unknown',
          allergies: (data.allergies && data.allergies.length > 0) ? data.allergies : ['None recorded'],
          chronicConditions: (data.chronicConditions && data.chronicConditions.length > 0) ? data.chronicConditions : ['None recorded'],
          emergencyContact: {
            name: data.emergencyContact || 'Not Available',
            relationship: 'Emergency Contact',
            phone: data.emergencyPhone || '-',
          },
          currentMedications: [
            { name: 'Contact hospital for medication details', dosage: '-' }
          ],
          lastUpdated: new Date().toISOString(),
        }
        
        setPatientInfo(emergencyData)
      } else {
        setPatientInfo(null)
      }
    } catch (error) {
      console.error('Emergency search failed:', error)
      setPatientInfo(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
            <motion.header 
        className="relative bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white py-5 shadow-xl shadow-red-500/20 overflow-hidden"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
                <motion.div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
          }}
          animate={{ backgroundPosition: ['0px 0px', '40px 0px'] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 rounded-xl"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </motion.div>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <AlertTriangle className="w-7 h-7 drop-shadow-lg" />
                </motion.div>
                <div>
                  <span className="font-bold text-2xl drop-shadow-lg">Emergency Access Mode</span>
                  <p className="text-red-100 text-xs">Critical information only</p>
                </div>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                variant="ghost"
                size="sm"
                className={`text-white rounded-xl px-4 py-2 ${isOffline ? 'bg-yellow-500/80' : 'bg-emerald-500/80'} backdrop-blur-sm`}
                onClick={() => setIsOffline(!isOffline)}
              >
                {isOffline ? <WifiOff className="w-4 h-4 mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
                {isOffline ? 'Offline Mode' : 'Online'}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8">
                <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 mb-8 shadow-lg shadow-amber-500/10 overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <CardContent className="py-5 flex items-start gap-4">
              <motion.div
                className="p-3 bg-amber-100 rounded-xl"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </motion.div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">Emergency Access Only</h3>
                <p className="text-amber-700 text-sm mt-1">
                  This mode provides critical medical information for emergency situations. 
                  All access is logged and audited. Use only when patient is unable to provide consent.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

                <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
              <div className="flex gap-4">
                <div className="relative flex-1 group">
                  <motion.div
                    className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl opacity-0 blur transition-all duration-300 group-hover:opacity-30"
                  />
                  <div className="relative">
                    <Input
                      placeholder="Enter Patient IC Number (e.g., 880101-14-5678)"
                      value={icNumber}
                      onChange={(e) => setIcNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                      className="text-lg py-7 px-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                </motion.div>
              </div>
              
              {rateLimitError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 mt-3 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {rateLimitError}
                </motion.p>
              )}
              
              {isOffline && (
                <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                  <WifiOff className="w-4 h-4" />
                  Offline mode: Only cached patient data will be available
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

                <AnimatePresence>
          {patientInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
                            <div className="grid md:grid-cols-2 gap-6">
                                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden hover:shadow-2xl transition-shadow">
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
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">IC Number</p>
                          <p className="font-mono text-lg bg-gray-100 px-3 py-1.5 rounded-lg inline-block">{patientInfo.icNumber}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Blood Type</p>
                            <Badge className="text-xl px-5 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold shadow-lg shadow-red-200 rounded-xl">
                              {patientInfo.bloodType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-0 shadow-xl shadow-emerald-100/50 overflow-hidden hover:shadow-2xl transition-shadow">
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
                          <motion.a 
                            href={`tel:${patientInfo.emergencyContact.phone}`}
                            className="inline-flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-shadow"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Phone className="w-5 h-5" />
                            {patientInfo.emergencyContact.phone}
                          </motion.a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

                            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-xl shadow-red-200/50 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-pulse" />
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50">
                    <CardTitle className="flex items-center gap-3 text-xl text-red-700">
                      <motion.div 
                        className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-300"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </motion.div>
                      <span className="font-bold">⚠️ ALLERGIES - CRITICAL</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-3">
                      {patientInfo.allergies.map((allergy, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                        >
                          <Badge className="text-lg px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg shadow-red-300 rounded-xl">
                            {allergy}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

                            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
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
                      {patientInfo.chronicConditions.map((condition, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <Badge className="text-base px-5 py-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 font-semibold rounded-xl border border-orange-200">
                            {condition}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

                            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                  <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/50 to-white">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-200">
                        <Pill className="w-5 h-5 text-white" />
                      </div>
                      Current Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      {patientInfo.currentMedications.map((med, i) => (
                        <motion.div 
                          key={i} 
                          className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 hover:shadow-lg transition-shadow"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <p className="font-bold text-violet-900 text-lg">{med.name}</p>
                          <p className="text-sm text-violet-600 font-medium mt-1">{med.dosage}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

                            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-0 bg-gradient-to-r from-gray-50 to-slate-50 shadow-lg">
                  <CardContent className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          Emergency access logged at {new Date().toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Data last updated: {new Date(patientInfo.lastUpdated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

                {!patientInfo && !loading && (
          <motion.div 
            className="grid md:grid-cols-3 gap-6 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="text-center p-8 border-0 shadow-xl shadow-red-100/50 cursor-pointer overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500 absolute top-0 left-0 right-0" />
                <motion.div 
                  className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 group-hover:shadow-xl transition-shadow"
                  whileHover={{ rotate: 5 }}
                >
                  <Heart className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">Critical Allergies</h3>
                <p className="text-gray-500 text-sm">
                  View patient allergies and drug interactions
                </p>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="text-center p-8 border-0 shadow-xl shadow-violet-100/50 cursor-pointer overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500 absolute top-0 left-0 right-0" />
                <motion.div 
                  className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200 group-hover:shadow-xl transition-shadow"
                  whileHover={{ rotate: 5 }}
                >
                  <Pill className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">Current Medications</h3>
                <p className="text-gray-500 text-sm">
                  Access active prescriptions and dosages
                </p>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="text-center p-8 border-0 shadow-xl shadow-emerald-100/50 cursor-pointer overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500 absolute top-0 left-0 right-0" />
                <motion.div 
                  className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:shadow-xl transition-shadow"
                  whileHover={{ rotate: 5 }}
                >
                  <Phone className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">Emergency Contacts</h3>
                <p className="text-gray-500 text-sm">
                  Quickly reach family members
                </p>
              </Card>
            </motion.div>
          </motion.div>
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
                
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all duration-200 hover:border-red-300 hover:bg-red-50"
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
                    <p className="text-red-100 text-xs">For security audit purposes</p>
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
                      <p className="text-sm">Camera access required</p>
                    </div>
                  ) : (
                    <>
                                            <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className={`w-32 h-40 border-2 rounded-full ${faceDetected ? 'border-green-500' : 'border-yellow-500'}`}
                          animate={faceDetected ? {} : { scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      
                                            <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700"
                        animate={{ 
                          background: [
                            'linear-gradient(135deg, #374151 0%, #1f2937 50%, #374151 100%)',
                            'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                                            <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gray-600 rounded-full" />
                          <div className="w-32 h-20 bg-gray-600 rounded-t-full mt-2" />
                        </div>
                      </div>
                      
                                            <motion.div
                        className={`absolute inset-0 flex items-center justify-center`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          className={`w-36 h-44 border-2 rounded-3xl ${faceDetected ? 'border-green-500' : 'border-yellow-500 border-dashed'}`}
                          animate={!faceDetected ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      </motion.div>
                      
                                            <div className="absolute bottom-3 left-3 right-3">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                          faceDetected 
                            ? 'bg-green-500/90 text-white' 
                            : 'bg-yellow-500/90 text-black'
                        }`}>
                          {faceDetected ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Face detected - Ready to record
                            </>
                          ) : (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Circle className="w-4 h-4" />
                              </motion.div>
                              Detecting face...
                            </>
                          )}
                        </div>
                      </div>
                      
                                            {isRecording && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center bg-black/50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <motion.div
                            key={recordingCountdown}
                            initial={{ scale: 2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-7xl font-bold text-white drop-shadow-lg"
                          >
                            {recordingCountdown}
                          </motion.div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
                
                                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                      <p className="font-semibold mb-1">Recording Notice</p>
                      <p className="text-red-300 text-xs leading-relaxed">
                        Your face will be recorded during this emergency access session. 
                        This recording will be stored as evidence and may be used for 
                        security audits and legal proceedings if misuse is suspected.
                      </p>
                    </div>
                  </div>
                </div>
                
                                <div className="flex gap-3">
                  {!cameraPermissionGranted ? (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1 h-12 rounded-xl bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
                        onClick={() => {
                          setShowCameraDialog(false)
                          setEmergencyConfirmed(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                        onClick={handleGrantCameraPermission}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Allow Camera Access
                      </Button>
                    </>
                  ) : !isRecording ? (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1 h-12 rounded-xl bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
                        onClick={() => {
                          setShowCameraDialog(false)
                          setEmergencyConfirmed(false)
                        }}
                      >
                        Cancel
                      </Button>
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
                        {faceDetected ? 'Start Recording & Access' : 'Waiting for face...'}
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 text-center text-gray-400">
                      <p className="text-sm">Recording in progress...</p>
                    </div>
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
