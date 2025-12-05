import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Demo data - In production, this would try cached data first, then API
    const demoData: EmergencyInfo = {
      icNumber: icNumber,
      name: 'Ahmad bin Abdullah',
      bloodType: 'O+',
      allergies: ['Penicillin', 'Shellfish', 'Latex'],
      chronicConditions: ['Type 2 Diabetes', 'Hypertension', 'Asthma'],
      emergencyContact: {
        name: 'Siti binti Ahmad',
        relationship: 'Wife',
        phone: '+60 12-345 6789',
      },
      currentMedications: [
        { name: 'Metformin', dosage: '500mg twice daily' },
        { name: 'Amlodipine', dosage: '5mg once daily' },
        { name: 'Ventolin Inhaler', dosage: 'As needed' },
      ],
      lastUpdated: new Date().toISOString(),
    }
    
    setPatientInfo(demoData)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Header */}
      <header className="bg-red-600 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-red-700">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                <span className="font-bold text-xl">Emergency Access Mode</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`text-white ${isOffline ? 'bg-yellow-600' : 'bg-green-600'}`}
                onClick={() => setIsOffline(!isOffline)}
              >
                {isOffline ? <WifiOff className="w-4 h-4 mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
                {isOffline ? 'Offline Mode' : 'Online'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Warning Banner */}
        <Card className="border-yellow-400 bg-yellow-50 mb-6">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-800">Emergency Access Only</h3>
                <p className="text-yellow-700 text-sm">
                  This mode provides critical medical information for emergency situations. 
                  All access is logged and audited. Use only when patient is unable to provide consent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Quick Patient Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Enter Patient IC Number (e.g., 880101-14-5678)"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg py-6"
                />
              </div>
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 px-8"
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
            </div>
            
            {isOffline && (
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                <WifiOff className="w-4 h-4" />
                Offline mode: Only cached patient data will be available
              </p>
            )}
          </CardContent>
        </Card>

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
