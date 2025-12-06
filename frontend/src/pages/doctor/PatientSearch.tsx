import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { Search, Loader2, Building2, FileText, Clock, AlertCircle, CreditCard, MapPin, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { formatIC, getHospitalColor } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

// Network visualization during query - Clean Step Progress Design
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
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <motion.div
              className={`flex flex-col items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                  step > s.id 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : step === s.id 
                      ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' 
                      : 'bg-gray-100 text-gray-400'
                }`}
                animate={step === s.id ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.8, repeat: step === s.id ? Infinity : 0 }}
              >
                {step > s.id ? '✓' : s.icon}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${
                step >= s.id ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </motion.div>
            
            {/* Connector Line */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 bg-gray-200 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ width: step > s.id ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Hospital Icons Row */}
      <div className="flex justify-center gap-3 py-4 border-t border-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              step >= 3 
                ? step >= 5 
                  ? 'bg-emerald-100' 
                  : 'bg-blue-100' 
                : 'bg-gray-100'
            }`}
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ 
              opacity: step >= 3 ? 1 : 0.5,
              scale: step >= 3 && step < 5 ? [0.9, 1, 0.9] : 1,
            }}
            transition={{ 
              delay: i * 0.1,
              duration: 0.8,
              repeat: step >= 3 && step < 5 ? Infinity : 0 
            }}
          >
            <Building2 className={`w-5 h-5 ${
              step >= 3 
                ? step >= 5 
                  ? 'text-emerald-600' 
                  : 'text-blue-600' 
                : 'text-gray-400'
            }`} />
          </motion.div>
        ))}
      </div>
      
      {/* Status Message */}
      <div className="text-center pt-4 border-t border-gray-100">
        <motion.p 
          className={`text-sm font-medium ${step >= 5 ? 'text-emerald-600' : 'text-blue-600'}`}
          key={step}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {step === 1 && 'Verifying your credentials...'}
          {step === 2 && 'Searching central patient index...'}
          {step === 3 && 'Broadcasting query to hospitals...'}
          {step === 4 && 'Receiving medical records...'}
          {step >= 5 && 'All records retrieved successfully!'}
        </motion.p>
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
  status: string
  responseTime: number
}

export default function PatientSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const [icNumber, setIcNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [hospitalResults, setHospitalResults] = useState<HospitalResult[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [queryTime, setQueryTime] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!icNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an IC number',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    setShowResults(false)
    setQuerySteps([])
    setHospitalResults([])

    // Simulate query steps animation
    const steps: QueryStep[] = [
      { step: 1, action: 'Initiating query', from: 'Doctor Portal', to: 'Central Hub', status: 'completed', timestamp: new Date().toISOString() },
      { step: 2, action: 'Authenticating request', from: 'Central Hub', to: 'Auth Service', status: 'completed', timestamp: new Date().toISOString() },
      { step: 3, action: 'Looking up patient index', from: 'Central Hub', to: 'Index DB', status: 'completed', timestamp: new Date().toISOString() },
      { step: 4, action: 'Querying hospitals', from: 'Central Hub', to: 'Hospital Network', status: 'in_progress', timestamp: new Date().toISOString() },
    ]

    // Animate steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setQuerySteps(prev => [...prev, steps[i]])
    }

    try {
      const response = await centralApi.queryPatient(icNumber)
      
      if (response.success && response.data) {
        setQuerySteps(prev => prev.map(s => ({ ...s, status: 'completed' })))
        setHospitalResults(response.data.hospitals as HospitalResult[])
        setTotalRecords(response.data.totalRecords)
        setQueryTime(response.data.queryTime)
        setShowResults(true)
      } else {
        toast({
          title: 'Patient Not Found',
          description: response.error || 'No records found for this IC number',
          variant: 'destructive',
        })
        setQuerySteps([])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search for patient',
        variant: 'destructive',
      })
      setQuerySteps([])
    } finally {
      setIsSearching(false)
    }
  }

  const viewPatientTimeline = () => {
    navigate(`/doctor/patient/${encodeURIComponent(icNumber)}`)
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header - Hospital Themed */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.headerGradient} p-8 text-white shadow-2xl ${theme.shadowColor}`}
      >
        <motion.div 
          className={`absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br ${theme.backgroundGlow} rounded-full blur-3xl`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <div className="relative z-10">
          {/* Hospital Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex items-center justify-center font-bold text-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {theme.shortName}
              </motion.div>
              <div>
                <p className="text-sm text-white/80 font-medium">{theme.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <MapPin className="w-3 h-3" />
                  {theme.city}
                </div>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Stethoscope className="w-3 h-3 mr-1" />
              Cross-Hospital Query
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Search className="w-7 h-7" />
            </motion.div>
          </div>
          <h1 className="text-3xl font-bold mb-2 drop-shadow-lg">Patient Search</h1>
          <p className="text-white/80 text-lg">Search patient records across the National Medical Network</p>
        </div>
      </motion.div>

      {/* Search Form - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <motion.div 
            className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`}
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`p-2 ${theme.bgLight} rounded-lg`}>
                <CreditCard className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              Enter Patient IC Number
            </CardTitle>
            <CardDescription className="text-base">
              The system will securely query all connected hospitals for matching records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative group">
                <motion.div
                  className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl opacity-0 blur transition-all duration-300 group-hover:opacity-40"
                />
                <div className="relative">
                  <Input
                    placeholder="e.g., 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    disabled={isSearching}
                    className="text-lg h-14 px-5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  disabled={isSearching} 
                  size="lg"
                  className={`h-14 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg ${theme.shadowColor} font-semibold`}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Search Network
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Query Animation with Network Visualization */}
      <AnimatePresence>
        {querySteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Network Visualization */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <QueryNetworkVisualization step={querySteps.length} />
              </CardContent>
            </Card>

            {/* Step Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Query Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {querySteps.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg text-center ${
                        step.status === 'completed' ? 'bg-green-50 border border-green-200' :
                        step.status === 'in_progress' ? 'bg-blue-50 border border-blue-200 animate-pulse' :
                        'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold ${
                        step.status === 'completed' ? 'bg-green-500 text-white' :
                        step.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {step.status === 'completed' ? '✓' : step.step}
                      </div>
                      <p className="text-xs font-medium truncate">{step.action}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">
                      Patient Found: {formatIC(icNumber)}
                    </h3>
                    <p className="text-green-700">
                      {totalRecords} records found across {hospitalResults.filter(h => h.recordCount > 0).length} hospitals
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">Query completed in</p>
                    <p className="text-2xl font-bold text-green-900">{queryTime}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hospital Results */}
            <Card>
              <CardHeader>
                <CardTitle>Hospital Records</CardTitle>
                <CardDescription>Records found at each connected hospital</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hospitalResults.map((hospital) => (
                    <motion.div
                      key={hospital.hospitalId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 border rounded-lg"
                      style={{ borderLeftColor: getHospitalColor(hospital.hospitalId), borderLeftWidth: 4 }}
                    >
                      <div className="flex items-start gap-3">
                        <Building2 
                          className="h-5 w-5 mt-0.5" 
                          style={{ color: getHospitalColor(hospital.hospitalId) }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{hospital.hospitalName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {hospital.recordCount} records
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Response: {hospital.responseTime}ms
                          </p>
                        </div>
                        {hospital.recordCount === 0 && (
                          <AlertCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={viewPatientTimeline} 
                  size="lg"
                  className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg ${theme.shadowColor} font-semibold`}
                >
                  View Complete Timeline
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  size="lg"
                  className={`h-12 px-6 rounded-xl ${theme.textColor} ${theme.borderColor} hover:${theme.bgLight}`}
                  onClick={() => {
                    const targetUrl = `/doctor/patient/${encodeURIComponent(icNumber)}/new-record`
                    console.log('[PatientSearch] Navigating to:', targetUrl)
                    console.log('[PatientSearch] Current user:', user)
                    navigate(targetUrl)
                  }}
                >
                  Create New Record
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
