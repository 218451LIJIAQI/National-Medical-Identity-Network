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
    const steps: QueryStep[] = [
      { step: 1, action: 'Initiating query', from: 'Doctor Portal', to: 'Central Hub', status: 'completed', timestamp: new Date().toISOString() },
      { step: 2, action: 'Authenticating request', from: 'Central Hub', to: 'Auth Service', status: 'completed', timestamp: new Date().toISOString() },
      { step: 3, action: 'Looking up patient index', from: 'Central Hub', to: 'Index DB', status: 'completed', timestamp: new Date().toISOString() },
      { step: 4, action: 'Querying hospitals', from: 'Central Hub', to: 'Hospital Network', status: 'in_progress', timestamp: new Date().toISOString() },
    ]
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
            <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.bgLight} border ${theme.borderColor}/30 p-8 shadow-xl ${theme.shadowColor}/20`}
      >
                <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-br ${theme.bgMedium}/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4`} />
        <div className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr ${theme.bgLight}/60 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4`} />
        
        <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div 
                className={`w-14 h-14 bg-gradient-to-br ${theme.buttonGradient} rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg ${theme.shadowColor}/30`}
                whileHover={{ scale: 1.05, rotate: 3 }}
              >
                {theme.shortName}
              </motion.div>
              <div>
                <p className="font-semibold text-gray-800">{theme.name}</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {theme.city}
                </div>
              </div>
            </div>
            <Badge className={`${theme.bgMedium} ${theme.textColor} border ${theme.borderColor}/50 px-4 py-1.5`}>
              <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
              Cross-Hospital Query
            </Badge>
          </div>
          
          <div className="flex items-start gap-4">
            <motion.div 
              className={`p-4 bg-gradient-to-br ${theme.buttonGradient} rounded-2xl shadow-lg ${theme.shadowColor}/30`}
              whileHover={{ scale: 1.05, rotate: 3 }}
            >
              <Search className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Search</h1>
              <p className="text-gray-600 text-lg">Search patient records across the National Medical Network</p>
            </div>
          </div>
        </div>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border border-gray-100 shadow-xl shadow-gray-100/50 rounded-2xl overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardHeader className={`bg-gradient-to-r ${theme.bgLight}/30 to-white border-b border-gray-100 p-6`}>
            <CardTitle className="flex items-center gap-3 text-xl text-gray-800">
              <div className={`p-2.5 ${theme.bgMedium} rounded-xl`}>
                <CreditCard className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              Enter Patient IC Number
            </CardTitle>
            <CardDescription className="text-base text-gray-500 mt-2">
              The system will securely query all connected hospitals for matching records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative group">
                <motion.div
                  className={`absolute -inset-0.5 bg-gradient-to-r ${theme.buttonGradient} rounded-xl opacity-0 blur transition-all duration-300 group-hover:opacity-30 group-focus-within:opacity-40`}
                />
                <div className="relative">
                  <Input
                    placeholder="e.g., 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    disabled={isSearching}
                    className={`text-lg h-14 px-5 rounded-xl border-gray-200 bg-white focus:border-${theme.iconColor.replace('text-', '')} focus:ring-2 focus:ring-${theme.iconColor.replace('text-', '')}/20 transition-all`}
                  />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  disabled={isSearching} 
                  size="lg"
                  className={`h-14 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg ${theme.shadowColor}/40 hover:shadow-xl font-semibold transition-all`}
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

            <AnimatePresence>
        {querySteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
                        <Card className="overflow-hidden">
              <CardContent className="p-0">
                <QueryNetworkVisualization step={querySteps.length} />
              </CardContent>
            </Card>

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

            <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
                        <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg shadow-emerald-100/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
                      <Search className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Patient Found: {formatIC(icNumber)}
                      </h3>
                      <p className="text-emerald-700">
                        {totalRecords} records found across {hospitalResults.filter(h => h.recordCount > 0).length} hospitals
                      </p>
                    </div>
                  </div>
                  <div className="text-right p-4 bg-white/60 rounded-xl border border-emerald-100">
                    <p className="text-sm text-emerald-600 font-medium">Query completed in</p>
                    <p className="text-3xl font-bold text-emerald-700">{queryTime}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

                        <Card className="border border-gray-100 rounded-2xl shadow-lg shadow-gray-100/40 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
              <CardHeader className={`bg-gradient-to-r ${theme.bgLight}/30 to-white border-b border-gray-100 p-5`}>
                <CardTitle className="flex items-center gap-3 text-gray-800">
                  <div className={`p-2 ${theme.bgMedium} rounded-lg`}>
                    <Building2 className={`w-5 h-5 ${theme.iconColor}`} />
                  </div>
                  Hospital Records
                </CardTitle>
                <CardDescription className="text-gray-500">Records found at each connected hospital</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hospitalResults.map((hospital, index) => (
                    <motion.div
                      key={hospital.hospitalId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                      style={{ borderLeftColor: getHospitalColor(hospital.hospitalId), borderLeftWidth: 3 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${getHospitalColor(hospital.hospitalId)}15` }}
                        >
                          <Building2 
                            className="h-5 w-5" 
                            style={{ color: getHospitalColor(hospital.hospitalId) }}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{hospital.hospitalName}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">
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

                        <div className="flex justify-center gap-4 pt-2 pb-8">
              <motion.div whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={viewPatientTimeline} 
                  size="lg"
                  className={`h-13 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg ${theme.shadowColor}/40 hover:shadow-xl font-semibold transition-all`}
                >
                  View Complete Timeline
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  size="lg"
                  className={`h-13 px-6 rounded-xl ${theme.textColor} border-2 ${theme.borderColor} hover:${theme.bgLight} font-semibold transition-all`}
                  onClick={() => navigate(`/doctor/patient/${encodeURIComponent(icNumber)}/new-record`)}
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
