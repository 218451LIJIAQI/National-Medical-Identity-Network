import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { Users, FileText, Activity, Building2, Loader2, Shield, TrendingUp, Clock, CheckCircle, Server, Database, Wifi, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface HospitalStats {
  totalPatients: number
  totalRecords: number
  totalDoctors: number
}

export default function HospitalAdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<HospitalStats>({ totalPatients: 0, totalRecords: 0, totalDoctors: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      if (!user?.hospitalId) return
      try {
        const response = await hospitalApi.getStats(user.hospitalId)
        if (response.success && response.data) {
          setStats({
            totalPatients: response.data.totalPatients || 0,
            totalRecords: response.data.totalRecords || 0,
            totalDoctors: response.data.activeDoctors || 0,
          })
        }
      } catch (error) {
        console.error('Failed to load hospital stats:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [user?.hospitalId])

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
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading hospital data...</p>
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
      {/* Header with Hospital Info */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white mb-1">Hospital Administrator</Badge>
              <h1 className="text-3xl font-bold">KL General Hospital</h1>
            </div>
          </div>
          <p className="text-purple-100 max-w-xl mb-6">
            Manage your hospital's medical records and monitor network connectivity with the National Medical Identity Network.
          </p>
          <div className="flex gap-3">
            <Link to="/admin/audit">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 gap-2">
                <Shield className="w-4 h-4" />
                View Audit Logs
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
            label: 'Total Patients', 
            value: stats.totalPatients.toLocaleString(), 
            icon: Users, 
            gradient: 'from-blue-500 to-blue-600',
            change: '+12 this week',
            changeType: 'up'
          },
          { 
            label: 'Medical Records', 
            value: stats.totalRecords.toLocaleString(), 
            icon: FileText, 
            gradient: 'from-emerald-500 to-emerald-600',
            change: '+45 this week',
            changeType: 'up'
          },
          { 
            label: 'Queries Today', 
            value: '24', 
            icon: Activity, 
            gradient: 'from-violet-500 to-violet-600',
            change: '+8% vs yesterday',
            changeType: 'up'
          },
          { 
            label: 'Active Doctors', 
            value: stats.totalDoctors, 
            icon: Users, 
            gradient: 'from-amber-500 to-amber-600',
            change: 'Currently online',
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
                      {stat.changeType === 'status' && <Clock className="w-3 h-3 text-amber-500" />}
                      <span className={`text-xs ${stat.changeType === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
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

      {/* System Status & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Status */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">All systems operational</p>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { name: 'Central Hub Connection', status: 'Connected', icon: Wifi, latency: '23ms' },
                  { name: 'Database Status', status: 'Healthy', icon: Database, latency: '5ms' },
                  { name: 'API Gateway', status: 'Online', icon: Server, latency: '12ms' },
                  { name: 'Security Module', status: 'Active', icon: Shield, latency: '-' },
                ].map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <item.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.latency !== '-' && (
                        <span className="text-xs text-gray-500">{item.latency}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600 font-medium">{item.status}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-sm text-gray-500">Latest actions in your hospital</p>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {[
                  { action: 'New patient record created', user: 'Dr. Nurul Huda', time: '5 mins ago', type: 'create' },
                  { action: 'External query from Penang GH', user: 'System', time: '12 mins ago', type: 'query' },
                  { action: 'Lab results uploaded', user: 'Lab Tech Ahmad', time: '25 mins ago', type: 'upload' },
                  { action: 'Prescription updated', user: 'Dr. Tan Wei Ming', time: '1 hour ago', type: 'update' },
                ].map((activity, i) => (
                  <motion.div 
                    key={i}
                    className="p-4 hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'create' ? 'bg-blue-100' :
                        activity.type === 'query' ? 'bg-violet-100' :
                        activity.type === 'upload' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        <Activity className={`w-4 h-4 ${
                          activity.type === 'create' ? 'text-blue-600' :
                          activity.type === 'query' ? 'text-violet-600' :
                          activity.type === 'upload' ? 'text-emerald-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.user}</p>
                      </div>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
