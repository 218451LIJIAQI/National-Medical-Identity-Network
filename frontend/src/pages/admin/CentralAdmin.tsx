import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi } from '@/lib/api'
import { Building2, Users, Activity, Globe, Loader2, Shield, TrendingUp, MapPin, CheckCircle, ArrowRight, Network, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

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
  isActive: boolean
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, hospitalsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getHospitals(),
        ])
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        if (hospitalsRes.success && hospitalsRes.data) {
          setHospitals(hospitalsRes.data as unknown as Hospital[])
        }
      } catch (error) {
        console.error('Failed to load central admin data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

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
      {/* Header */}
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
            <Link to="/admin/audit">
              <Button className="bg-white text-cyan-600 hover:bg-cyan-50 gap-2">
                <Shield className="w-4 h-4" />
                View All Audit Logs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
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

      {/* Hospital Network */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hospital Network Status</h2>
                <p className="text-sm text-gray-500">Real-time connectivity status of all hospitals</p>
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
                          <span>{hospital.city}</span>
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

      {/* Network Activity */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">Recent Network Activity</h2>
            <p className="text-sm text-gray-500">Cross-hospital queries and data access</p>
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              {[
                { from: 'KL General Hospital', to: 'Penang General Hospital', type: 'Patient Query', patient: '880101-XX-XXXX', time: '2 mins ago' },
                { from: 'Sultanah Aminah Hospital', to: 'KL General Hospital', type: 'Record Access', patient: '750315-XX-XXXX', time: '5 mins ago' },
                { from: 'Sarawak General Hospital', to: 'Queen Elizabeth Hospital', type: 'Patient Query', patient: '920512-XX-XXXX', time: '12 mins ago' },
                { from: 'Penang General Hospital', to: 'Sultanah Aminah Hospital', type: 'Record Access', patient: '681224-XX-XXXX', time: '18 mins ago' },
              ].map((activity, i) => (
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
