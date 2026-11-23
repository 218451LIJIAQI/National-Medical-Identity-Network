import { Link, useNavigate } from 'react-router-dom'
import {
  Search, FileText, Activity, ArrowRight,
  Users, Zap, Sparkles, Plus,
  Clock, TrendingUp, Globe,
  ChevronRight, Heart, Cpu, Wifi
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatStaffDisplayName, LiveClock } from '@/layouts/hospital/shared'
import { useDoctorDashboard } from './useDoctorDashboard'

export default function SarawakDashboard() {
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(4)
  const navigate = useNavigate()

  return (
    <motion.div className="space-y-6 font-space" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl border border-violet-100/60 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-violet-100 shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">System Online</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-xl border border-violet-100/50">
            <Wifi className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-violet-700">Connected to National Network</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-violet-100 shadow-sm">
          <Clock className="w-4 h-4 text-violet-500" />
          <LiveClock showSeconds className="text-sm font-mono font-medium text-violet-800" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden p-8 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-3xl border border-violet-100/60 shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-medium text-violet-600 uppercase tracking-wider">Doctor Interface</span>
              </div>

              <div className="flex items-start justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                      Welcome, {formatStaffDisplayName(user)}
                    </h1>
                    <p className="text-violet-600/80 text-lg mt-1">{theme.tagline}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link to="/doctor/search">
                      <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg">
                        <Search className="w-5 h-5" />
                        Search Patients
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link to="/doctor/new-record">
                      <button className="flex items-center gap-2 px-6 py-3 bg-white text-violet-700 rounded-xl font-semibold border-2 border-violet-200 hover:border-violet-400">
                        <Plus className="w-5 h-5" />
                        New Record
                      </button>
                    </Link>
                  </div>
                </div>

                <div className="hidden lg:block p-5 bg-white/80 rounded-2xl border border-violet-100 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold">{theme.shortName}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{theme.name}</p>
                      <p className="text-sm text-violet-600">{theme.city}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-violet-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-800">{theme.departments}</p>
                      <p className="text-xs text-violet-600">Depts</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-800">{theme.bedCount}</p>
                      <p className="text-xs text-purple-600">Beds</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Globe, gradient: 'from-violet-50 to-purple-50', iconBg: 'from-violet-400 to-violet-500' },
              { label: 'Queries', value: loading ? '—' : stats.todayQueries, icon: Activity, gradient: 'from-purple-50 to-fuchsia-50', iconBg: 'from-purple-400 to-purple-500' },
              { label: 'Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, gradient: 'from-fuchsia-50 to-pink-50', iconBg: 'from-fuchsia-400 to-fuchsia-500' },
              { label: 'Response', value: loading ? '—' : `${stats.avgResponseTime.toFixed(1)}s`, icon: Zap, gradient: 'from-pink-50 to-violet-50', iconBg: 'from-pink-400 to-violet-400' },
            ].map((stat) => (
              <div key={stat.label} className={`p-5 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-violet-100/50 shadow-md`}>
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-md mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-violet-600/70">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Activity Log</h2>
                  <p className="text-sm text-gray-500">Click an entry to open the patient timeline</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">LIVE</span>
              </div>
            </div>

            <div className="p-5">
              {recentActivity.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">Start by searching for patients</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      onClick={() => activity.rawIc && navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)}
                      className={`group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all ${
                        activity.rawIc ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activity.type === 'view' ? 'bg-violet-100 text-violet-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                      </div>
                      <div className="text-right">
                        <code className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded font-mono">
                          {activity.ic}
                        </code>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/60 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Network Status</p>
                <p className="text-sm text-emerald-600">All systems operational</p>
              </div>
            </div>
            <div className="space-y-2">
              {['Central Hub', 'Hospital Network', 'Auth Service'].map((service) => (
                <div key={service} className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-600">{service}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-emerald-600 font-medium">Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Specialties</h2>
                  <p className="text-sm text-gray-500">Excellence Centers</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-2">
              {theme.specialties.map((specialty) => (
                <div
                  key={specialty}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-100/50"
                >
                  <div className="w-2 h-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">{specialty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
