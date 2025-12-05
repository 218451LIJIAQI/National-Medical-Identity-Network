import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { Search, FileText, Clock, Building2, Activity, ArrowRight, TrendingUp, Stethoscope, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ totalPatients: 0, activeHospitals: 0, todayQueries: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await centralApi.getStats()
        if (response.success && response.data) {
          setStats(response.data)
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const recentActivity = [
    { patient: 'Ahmad bin Abdullah', ic: '880101-XX-XXXX', action: 'Viewed records', time: '10 mins ago', hospitals: 3, type: 'view' },
    { patient: 'Siti Nurhaliza', ic: '750315-XX-XXXX', action: 'Created prescription', time: '1 hour ago', hospitals: 1, type: 'create' },
    { patient: 'Tan Ah Kow', ic: '920512-XX-XXXX', action: 'Drug interaction check', time: '2 hours ago', hospitals: 5, type: 'alert' },
  ]

  const hospitals = [
    { name: 'KL General Hospital', city: 'Kuala Lumpur', status: 'online', latency: '45ms', color: '#3B82F6' },
    { name: 'Penang General Hospital', city: 'George Town', status: 'online', latency: '52ms', color: '#10B981' },
    { name: 'Sultanah Aminah Hospital', city: 'Johor Bahru', status: 'online', latency: '38ms', color: '#F59E0B' },
    { name: 'Sarawak General Hospital', city: 'Kuching', status: 'online', latency: '89ms', color: '#8B5CF6' },
    { name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', status: 'online', latency: '95ms', color: '#EF4444' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header with Gradient */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <span className="text-blue-100 text-sm font-medium">Doctor Portal</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, Dr. {user?.fullName?.split(' ').pop() || 'Doctor'} 👋
          </h1>
          <p className="text-blue-100 max-w-xl">
            You have access to the National Medical Identity Network. Search any patient by IC number to view their complete medical history.
          </p>
          
          <div className="mt-6">
            <Link to="/doctor/search">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 gap-2 shadow-lg">
                <Search className="w-5 h-5" />
                Search Patient Records
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
            value: loading ? '-' : stats.activeHospitals, 
            icon: Building2, 
            color: 'blue',
            gradient: 'from-blue-500 to-blue-600',
            change: '+2 this month'
          },
          { 
            label: 'Queries Today', 
            value: loading ? '-' : stats.todayQueries, 
            icon: Activity, 
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-600',
            change: '+12% vs yesterday'
          },
          { 
            label: 'Network Patients', 
            value: loading ? '-' : stats.totalPatients.toLocaleString(), 
            icon: FileText, 
            color: 'violet',
            gradient: 'from-violet-500 to-violet-600',
            change: 'Nationwide records'
          },
          { 
            label: 'Avg Response', 
            value: '~1.2s', 
            icon: Clock, 
            color: 'amber',
            gradient: 'from-amber-500 to-amber-600',
            change: '99.9% uptime'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className={`w-3 h-3 text-${stat.color}-500`} />
                      <span className={`text-xs text-${stat.color}-600`}>{stat.change}</span>
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <p className="text-sm text-gray-500">Your latest patient queries and actions</p>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <motion.div 
                    key={index} 
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        activity.type === 'view' ? 'bg-blue-100' :
                        activity.type === 'create' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {activity.type === 'view' && <FileText className="w-5 h-5 text-blue-600" />}
                        {activity.type === 'create' && <Activity className="w-5 h-5 text-emerald-600" />}
                        {activity.type === 'alert' && <Shield className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{activity.patient}</p>
                          <span className="text-xs text-gray-400 font-mono">{activity.ic}</span>
                        </div>
                        <p className="text-sm text-gray-500">{activity.action}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">{activity.time}</p>
                        <p className="text-xs text-blue-600 font-medium">{activity.hospitals} hospitals</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Status */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg h-full">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Network Status</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">All systems operational</p>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {hospitals.map((hospital, i) => (
                  <motion.div
                    key={hospital.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: hospital.color + '20' }}
                    >
                      <Building2 className="w-5 h-5" style={{ color: hospital.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{hospital.name}</p>
                      <p className="text-xs text-gray-500">{hospital.city}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs text-emerald-600 font-medium">Online</span>
                      </div>
                      <p className="text-xs text-gray-400">{hospital.latency}</p>
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
