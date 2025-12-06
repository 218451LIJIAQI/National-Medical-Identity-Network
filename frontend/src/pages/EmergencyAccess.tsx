import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { 
  AlertTriangle, Heart, Pill, Phone, User,
  Shield, Wifi, WifiOff, ArrowLeft, Search, Loader2, CheckCircle
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

export default function EmergencyAccess() {
  const [icNumber, setIcNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientInfo, setPatientInfo] = useState<EmergencyInfo | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  const handleSearch = async () => {
    if (!icNumber.trim()) return
    
    setLoading(true)
    
    try {
      // Use emergency access API - no authentication required
      const response = await centralApi.emergencyQuery(icNumber)
      
      if (response.success && response.data && response.data.found) {
        const data = response.data
        
        const emergencyData: EmergencyInfo = {
          icNumber: icNumber,
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
        // Patient not found - show empty state
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
      {/* Premium Header */}
      <motion.header 
        className="relative bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white py-5 shadow-xl shadow-red-500/20 overflow-hidden"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {/* Animated background */}
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
              <Link to="/">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
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
        {/* Warning Banner - Premium Design */}
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

        {/* Search Section - Premium Design */}
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
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-lg py-7 px-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-8 h-14 rounded-xl shadow-lg shadow-red-500/25 font-semibold"
                    onClick={handleSearch}
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
              
              {isOffline && (
                <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                  <WifiOff className="w-4 h-4" />
                  Offline mode: Only cached patient data will be available
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {patientInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Critical Info */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Patient Identity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-blue-600" />
                      Patient Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="text-xl font-bold">{patientInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">IC Number</p>
                        <p className="font-mono text-lg">{patientInfo.icNumber}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Blood Type</p>
                          <Badge className="text-lg px-4 py-1 bg-red-100 text-red-700 font-bold">
                            {patientInfo.bloodType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card className="border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="text-xl font-bold">{patientInfo.emergencyContact.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Relationship</p>
                        <p>{patientInfo.emergencyContact.relationship}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <a 
                          href={`tel:${patientInfo.emergencyContact.phone}`}
                          className="text-xl font-bold text-green-600 hover:underline"
                        >
                          {patientInfo.emergencyContact.phone}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Allergies - Critical */}
              <Card className="border-red-300 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    ⚠️ ALLERGIES - CRITICAL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {patientInfo.allergies.map((allergy, i) => (
                      <Badge 
                        key={i} 
                        className="text-lg px-4 py-2 bg-red-600 text-white font-bold"
                      >
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chronic Conditions */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-orange-700">
                    <Heart className="w-5 h-5" />
                    Chronic Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {patientInfo.chronicConditions.map((condition, i) => (
                      <Badge 
                        key={i} 
                        className="text-base px-4 py-2 bg-orange-200 text-orange-800"
                      >
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Medications */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Pill className="w-5 h-5 text-purple-600" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {patientInfo.currentMedications.map((med, i) => (
                      <div key={i} className="p-4 bg-purple-50 rounded-lg">
                        <p className="font-bold text-purple-900">{med.name}</p>
                        <p className="text-sm text-purple-700">{med.dosage}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Access Log Notice */}
              <Card className="bg-gray-100">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
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
          )}
        </AnimatePresence>

        {/* Quick Access Cards when no search */}
        {!patientInfo && !loading && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Critical Allergies</h3>
              <p className="text-gray-600 text-sm">
                View patient allergies and drug interactions
              </p>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <Pill className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Current Medications</h3>
              <p className="text-gray-600 text-sm">
                Access active prescriptions and dosages
              </p>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <Phone className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Emergency Contacts</h3>
              <p className="text-gray-600 text-sm">
                Quickly reach family members
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
