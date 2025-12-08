import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { Building2, Users, Activity, Globe, Loader2, Shield, TrendingUp, MapPin, CheckCircle, ArrowRight, Network, Zap, Search, FileText, Database, AlertTriangle, Heart, User, Phone, Mail, MapPinned, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'

interface CentralStats {
  totalPatients: number
  activeHospitals: number
  todayQueries: number
}

interface Hospital {
  id: string
  name: string
  shortName: string
  city: string
  state: string
  address: string
  phone: string
  email: string
  isActive: boolean
}

interface NetworkActivity {
  from: string
  to: string
  type: string
  patient: string
  time: string
}

interface PatientIndexResult {
  icNumber: string
  patient: {
    fullName: string
    icNumber: string
    dateOfBirth: string
    gender: string
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null
  hospitals: Array<{
    hospitalId: string
    hospitalName: string
    shortName: string
    city: string
    recordCount: number
    isActive: boolean
  }>
  totalHospitals: number
  totalRecords: number
  lastUpdated: string
}

const hospitalColors: Record<string, string> = {
  'hospital-kl': '#3B82F6',
  'hospital-penang': '#10B981',
  'hospital-jb': '#F59E0B',
  'hospital-sarawak': '#8B5CF6',
  'hospital-sabah': '#EF4444',
}

export default function CentralAdminDashboard() {
  const [stats, setStats] = useState<CentralStats>({ totalPatients: 0, activeHospitals: 0, todayQueries: 0 })
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [networkActivity, setNetworkActivity] = useState<NetworkActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchIC, setSearchIC] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<PatientIndexResult | null>(null)
  const [searchError, setSearchError] = useState('')
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, hospitalsRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getHospitals(),
          centralApi.getAuditLogs({ limit: 20 }),
        ])
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        if (hospitalsRes.success && hospitalsRes.data) {
          setHospitals(hospitalsRes.data as unknown as Hospital[])
        }
        if (logsRes.success && logsRes.data) {
          const activities = (logsRes.data as any[])
            .filter((log: any) => ['query', 'view', 'create', 'emergency_access'].includes(log.action))
            .map((log: any) => {
              const logDate = new Date(log.timestamp)
              const now = new Date()
              const diffMs = now.getTime() - logDate.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              
              let timeAgo = ''
              if (diffMins < 60) {
                timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`
              } else {
                const diffHours = Math.floor(diffMs / 3600000)
                timeAgo = diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours/24)} days ago`
              }
              
              const icMasked = log.targetIcNumber 
                ? log.targetIcNumber.replace(/(.{6})(.*)(.{4})/, '$1-XX-$3')
                : 'System'
              
              const getActionType = (action: string) => {
                switch (action) {
                  case 'query': return 'Patient Query'
                  case 'view': return 'Record View'
                  case 'create': return 'Record Created'
                  case 'emergency_access': return 'Emergency Access'
                  default: return 'Record Access'
                }
              }
              
              return {
                from: log.actorHospitalId || 'Central Hub',
                to: 'Network',
                type: getActionType(log.action),
                patient: icMasked,
                time: timeAgo,
              }
            })
          setNetworkActivity(activities)
        }
      } catch (error) {
        console.error('Failed to load central admin data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchIC.trim()) return
    
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    
    try {
      const response = await centralApi.searchPatientIndex(searchIC.trim())
      if (response.success && response.data) {
        setSearchResult(response.data)
      } else {
        setSearchError(response.error || 'Patient not found in any hospital')
      }
    } catch {
      setSearchError('Failed to search patient index')
    } finally {
      setSearching(false)
    }
  }


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading network data...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
            <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-8 text-white"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Network className="w-8 h-8" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white mb-1">Central Administrator</Badge>
              <h1 className="text-3xl font-bold">National Medical Identity Network</h1>
            </div>
          </div>
          <p className="text-cyan-100 max-w-xl mb-6">
            Real-time overview of all connected hospitals and network activity across Malaysia.
          </p>
          <div className="flex gap-3">
            <Link to="/central/audit">
              <Button variant="outline" className="bg-white text-cyan-600 hover:bg-cyan-50 border-cyan-200 gap-2">
                <Shield className="w-4 h-4" />
                View All Audit Logs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Connected Hospitals', 
            value: stats.activeHospitals, 
            icon: Building2, 
            gradient: 'from-blue-500 to-blue-600',
            change: 'All operational',
            changeType: 'status'
          },
          { 
            label: 'Network Patients', 
            value: stats.totalPatients.toLocaleString(), 
            icon: Users, 
            gradient: 'from-emerald-500 to-emerald-600',
            change: '+1,234 this month',
            changeType: 'up'
          },
          { 
            label: 'Queries Today', 
            value: stats.todayQueries, 
            icon: Activity, 
            gradient: 'from-violet-500 to-violet-600',
            change: '+15% vs yesterday',
            changeType: 'up'
          },
          { 
            label: 'Network Uptime', 
            value: '99.9%', 
            icon: Globe, 
            gradient: 'from-cyan-500 to-cyan-600',
            change: 'Last 30 days',
            changeType: 'status'
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.changeType === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                      {stat.changeType === 'status' && <CheckCircle className="w-3 h-3 text-cyan-500" />}
                      <span className={`text-xs ${stat.changeType === 'up' ? 'text-emerald-600' : 'text-cyan-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

            <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Patient Index Lookup</h2>
                <p className="text-sm text-gray-500">Search which hospitals have records for a patient</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Enter Patient IC Number (e.g., 880101-14-5678)"
                  value={searchIC}
                  onChange={(e) => setSearchIC(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button 
                type="submit" 
                disabled={searching}
                className="h-12 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search Index
                  </>
                )}
              </Button>
            </form>

                        {searchError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{searchError}</p>
              </div>
            )}

                        {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                                {searchResult.patient && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <User className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{searchResult.patient.fullName}</h3>
                        <p className="text-gray-500 font-mono">{searchResult.patient.icNumber}</p>
                        <div className="flex items-center gap-4 mt-2">
                          {searchResult.patient.bloodType && (
                            <Badge className="bg-red-100 text-red-700">
                              <Heart className="w-3 h-3 mr-1" /> {searchResult.patient.bloodType}
                            </Badge>
                          )}
                          <Badge variant="outline">{searchResult.patient.gender}</Badge>
                        </div>
                        {searchResult.patient.allergies && searchResult.patient.allergies.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-amber-700">
                              Allergies: {searchResult.patient.allergies.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                                <div className="p-4 bg-gray-900 rounded-xl">
                  <div className="flex items-center justify-center gap-4 text-white">
                    <div className="text-center">
                      <div className="p-3 bg-cyan-500 rounded-xl mx-auto mb-2">
                        <Database className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">Central Index</p>
                    </div>
                    <div className="flex-1 relative h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 rounded">
                      <motion.div 
                        className="absolute w-3 h-3 bg-white rounded-full top-1/2 -translate-y-1/2"
                        animate={{ left: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-emerald-500 rounded-xl mx-auto mb-2">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">{searchResult.totalHospitals} Hospitals</p>
                    </div>
                  </div>
                </div>

                                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Hospitals with Patient Records
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {searchResult.hospitals.map((hospital) => {
                      const color = hospitalColors[hospital.hospitalId] || '#6B7280'
                      return (
                        <motion.div
                          key={hospital.hospitalId}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-xl border-2"
                          style={{ borderColor: color + '40', backgroundColor: color + '10' }}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: color + '30' }}
                            >
                              <Building2 className="w-5 h-5" style={{ color }} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{hospital.hospitalName}</h4>
                              <div className="flex items-center gap-1 text-gray-500 text-sm">
                                <MapPin className="w-3 h-3" />
                                <span>{hospital.city}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="font-bold text-gray-900">{hospital.recordCount}</span>
                              </div>
                              <p className="text-xs text-gray-500">records</p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">Total Records Across Network</p>
                    <p className="text-2xl font-bold text-gray-900">{searchResult.totalRecords} records</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="text-gray-700">{new Date(searchResult.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

            <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hospital Network Status</h2>
                <p className="text-sm text-gray-500">Click on a hospital card to view details</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-emerald-600 font-medium">All Online</span>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hospital, i) => {
                const color = hospitalColors[hospital.id] || '#6B7280'
                return (
                  <motion.div
                    key={hospital.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedHospital(hospital)}
                    className="p-4 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer"
                    style={{ borderColor: color + '40' }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: color + '20' }}
                      >
                        <Building2 className="w-6 h-6" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{hospital.name}</h3>
                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{hospital.city}, {hospital.state}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${hospital.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={`text-xs font-medium ${hospital.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {hospital.isActive ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Zap className="w-3 h-3" />
                            <span>{Math.floor(Math.random() * 50) + 20}ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <AnimatePresence>
        {selectedHospital && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHospital(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                            <div 
                className="p-6 text-white"
                style={{ backgroundColor: hospitalColors[selectedHospital.id] || '#6B7280' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedHospital.name}</h2>
                      <p className="text-white/80">{selectedHospital.shortName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedHospital(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
                            <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPinned className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{selectedHospital.address}</p>
                    <p className="text-gray-600">{selectedHospital.city}, {selectedHospital.state}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{selectedHospital.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{selectedHospital.email}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedHospital.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={selectedHospital.isActive ? 'text-emerald-600' : 'text-red-600'}>
                      {selectedHospital.isActive ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              
                            <div className="px-6 pb-6">
                <Button
                  className="w-full"
                  onClick={() => setSelectedHospital(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">Recent Network Activity</h2>
            <p className="text-sm text-gray-500">Cross-hospital queries and data access</p>
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              {networkActivity.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No recent network activity
                </div>
              ) : networkActivity.map((activity, i) => (
                <motion.div 
                  key={i}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Activity className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">{activity.from}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{activity.to}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                        <span className="text-xs text-gray-500 font-mono">{activity.patient}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
