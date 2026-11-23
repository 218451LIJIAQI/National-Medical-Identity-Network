import { Link, useNavigate } from 'react-router-dom'
import {
  Search, FileText, Activity, ArrowRight,
  Users, Zap, Plus, Globe,
  Clock, Calendar, TrendingUp, MapPin,
  Building2, ChevronRight, Heart, Shield, Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatStaffDisplayName, LiveClock, LiveDate } from '@/layouts/hospital/shared'
import { useDoctorDashboard } from './useDoctorDashboard'

export default function KLGeneralDashboard() {
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(5)
  const navigate = useNavigate()

  return (
    <motion.div className="space-y-6 font-inter" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 border border-blue-100/60 shadow-xl shadow-blue-100/30">
        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <LiveDate className="text-sm font-medium text-blue-800" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm">
                <Clock className="w-4 h-4 text-sky-600" />
                <LiveClock className="text-sm font-medium text-sky-800" />
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 backdrop-blur-sm rounded-xl border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Connected</span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Welcome back,</p>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {formatStaffDisplayName(user)}
                  </h1>
                </div>
              </div>
              <p className="text-blue-700/70 text-lg max-w-lg">{theme.tagline}</p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/doctor/search">
                  <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Search className="w-5 h-5" />
                    Search Patients
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link to="/doctor/new-record">
                  <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <Plus className="w-5 h-5" />
                    New Record
                  </button>
                </Link>
                <Link to="/doctor/workstation">
                  <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Building2 className="w-5 h-5" />
                    Full Workstation
                  </button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 shadow-lg min-w-[220px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-sky-100 rounded-xl flex items-center justify-center border border-blue-200">
                    <span className="text-lg font-bold text-blue-700">{theme.shortName}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{theme.name}</p>
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <MapPin className="w-3 h-3" />
                      <span>{theme.city}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-800">{theme.departments}</p>
                    <p className="text-xs text-blue-600 font-medium">Departments</p>
                  </div>
                  <div className="p-2.5 bg-sky-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-800">{theme.bedCount}</p>
                    <p className="text-xs text-sky-600 font-medium">Beds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Globe, gradient: 'from-blue-50 to-sky-50', iconBg: 'from-blue-400 to-blue-500' },
          { label: 'Queries Today', value: loading ? '—' : stats.todayQueries, icon: Activity, gradient: 'from-sky-50 to-cyan-50', iconBg: 'from-sky-400 to-sky-500' },
          { label: 'Total Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, gradient: 'from-cyan-50 to-teal-50', iconBg: 'from-cyan-400 to-cyan-500' },
          { label: 'Response Time', value: loading ? '—' : `${stats.avgResponseTime.toFixed(1)}s`, icon: Zap, gradient: 'from-teal-50 to-emerald-50', iconBg: 'from-teal-400 to-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className={`p-5 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-blue-100/50 shadow-lg shadow-blue-50/50`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-0.5">{stat.value}</p>
            <p className="text-sm font-medium text-blue-600/70">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                <p className="text-sm text-gray-500">Click an entry to open the patient timeline</p>
              </div>
            </div>
            <Link to="/doctor/search" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
              Search <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-5">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-gray-600 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Start by searching for a patient</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => activity.rawIc && navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)}
                    className={`group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all ${
                      activity.rawIc ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.type === 'view' ? 'bg-blue-100 text-blue-600' : 'bg-sky-100 text-sky-600'
                    }`}>
                      {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{activity.time}</p>
                      <code className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                        {activity.ic}
                      </code>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-sky-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Specialties</h2>
                <p className="text-sm text-gray-500">Centers of Excellence</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-2.5">
            {theme.specialties.map((specialty) => (
              <div
                key={specialty}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-sky-50/30 rounded-xl border border-blue-100/50"
              >
                <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
