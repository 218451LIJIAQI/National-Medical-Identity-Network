import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { centralApi } from '@/lib/api'
import { Search, Loader2, Building2, FileText, Clock, AlertCircle, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatIC, getHospitalColor } from '@/lib/utils'

// Network visualization during query
function QueryNetworkVisualization({ step }: { step: number }) {
  const hospitalPositions = [
    { x: 20, y: 30 },
    { x: 80, y: 30 },
    { x: 10, y: 70 },
    { x: 50, y: 80 },
    { x: 90, y: 70 },
  ]

  return (
    <div className="relative h-48 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      {/* Central Hub */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        animate={{ 
          scale: step >= 1 ? [1, 1.2, 1] : 1,
          boxShadow: step >= 1 ? ['0 0 0 0 rgba(6, 182, 212, 0)', '0 0 30px 10px rgba(6, 182, 212, 0.5)', '0 0 0 0 rgba(6, 182, 212, 0)'] : 'none'
        }}
        transition={{ duration: 1, repeat: step >= 1 && step < 4 ? Infinity : 0 }}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <Database className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs text-white text-center mt-1 font-medium">Central Index</p>
      </motion.div>

      {/* Hospital Nodes */}
      {hospitalPositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute z-10"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
          initial={{ opacity: 0.3 }}
          animate={{ 
            opacity: step >= 3 ? 1 : 0.3,
            scale: step >= 3 ? [1, 1.1, 1] : 1
          }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            step >= 4 ? 'bg-green-500' : step >= 3 ? 'bg-blue-500' : 'bg-gray-600'
          }`}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
        </motion.div>
      ))}

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
        {hospitalPositions.map((pos, i) => (
          <motion.line
            key={i}
            x1="50%"
            y1="50%"
            x2={`${pos.x}%`}
            y2={`${pos.y}%`}
            stroke={step >= 3 ? '#06b6d4' : '#374151'}
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ 
              pathLength: step >= 3 ? 1 : 0,
              opacity: step >= 3 ? 1 : 0.3
            }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          />
        ))}
      </svg>

      {/* Data Packets Animation */}
      <AnimatePresence>
        {step >= 3 && step < 5 && hospitalPositions.map((pos, i) => (
          <motion.div
            key={`packet-${i}`}
            className="absolute w-3 h-3 bg-cyan-400 rounded-full z-30"
            style={{ left: '50%', top: '50%' }}
            animate={{
              left: [`50%`, `${pos.x}%`, `50%`],
              top: [`50%`, `${pos.y}%`, `50%`],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </AnimatePresence>

      {/* Status Text */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <motion.p 
          className="text-cyan-400 text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {step === 1 && '🔐 Authenticating...'}
          {step === 2 && '🔍 Looking up patient index...'}
          {step === 3 && '📡 Broadcasting to hospitals...'}
          {step === 4 && '📥 Collecting responses...'}
          {step >= 5 && '✅ Query complete!'}
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Search</h1>
        <p className="text-gray-500">Search for patient records using their IC number</p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Patient IC Number</CardTitle>
          <CardDescription>
            The system will query all connected hospitals for matching records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="e.g., 880101-14-5678"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                disabled={isSearching}
                className="text-lg"
              />
            </div>
            <Button type="submit" disabled={isSearching} size="lg">
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
              <Button onClick={viewPatientTimeline} size="lg">
                View Complete Timeline
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(icNumber)}/new-record`)}
              >
                Create New Record
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
