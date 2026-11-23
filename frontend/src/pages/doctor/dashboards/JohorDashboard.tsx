import { Link, useNavigate } from 'react-router-dom'
import {
  Search, FileText, Activity, ArrowRight,
  Users, Zap, Sparkles, Plus,
  Star, Clock, TrendingUp,
  Building2, ChevronRight, Heart
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatStaffDisplayName, LiveClock } from '@/layouts/hospital/shared'
import { useDoctorDashboard } from './useDoctorDashboard'

export default function JohorDashboard() {
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(4)
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  return (
    <motion.div className="space-y-6 max-w-6xl mx-auto font-poppins" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100/60 shadow-xl shadow-amber-100/30 p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 rounded-2xl border border-amber-100 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <LiveClock className="text-sm font-semibold text-amber-800" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 rounded-2xl border border-amber-200/50">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Specialist Portal</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 px-5 py-3 bg-white/90 rounded-2xl border border-amber-100 shadow-lg">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">{theme.shortName}</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{theme.name}</p>
              <p className="text-xs text-amber-600">{theme.city}</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-amber-600 font-semibold text-lg">{greeting}</p>
              <h1 className="text-4xl font-bold text-gray-800 mt-1">
                {formatStaffDisplayName(user)} ✨
              </h1>
            </div>
            <p className="text-amber-700/70 text-lg max-w-md">{theme.tagline}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/doctor/search">
                <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg">
                  <Search className="w-5 h-5" />
                  Search Patients
                </button>
              </Link>
              <Link to="/doctor/new-record">
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-amber-700 rounded-xl font-semibold border-2 border-amber-200 hover:bg-amber-50">
                  <Plus className="w-5 h-5" />
                  New Record
                </button>
              </Link>
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/80 rounded-2xl border border-amber-100 shadow-md text-center min-w-[100px]">
              <p className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.activeHospitals}</p>
              <p className="text-xs text-amber-600 font-medium">Hospitals</p>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-amber-100 shadow-md text-center min-w-[100px]">
              <p className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.todayQueries}</p>
              <p className="text-xs text-amber-600 font-medium">Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Building2, bg: 'from-amber-50 to-orange-50', iconBg: 'from-amber-400 to-amber-500' },
          { label: 'Queries Today', value: loading ? '—' : stats.todayQueries, icon: Activity, bg: 'from-orange-50 to-amber-50', iconBg: 'from-orange-400 to-orange-500' },
          { label: 'Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, bg: 'from-yellow-50 to-amber-50', iconBg: 'from-yellow-400 to-amber-400' },
          { label: 'Avg Response', value: loading ? '—' : `${stats.avgResponseTime.toFixed(1)}s`, icon: Zap, bg: 'from-amber-50 to-yellow-50', iconBg: 'from-amber-500 to-yellow-500' },
        ].map((stat) => (
          <div key={stat.label} className={`p-5 bg-gradient-to-br ${stat.bg} rounded-2xl border border-amber-100/60 shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 bg-gradient-to-br ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</p>
            <p className="text-sm font-medium text-amber-700/70">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                <p className="text-sm text-gray-500">Click an entry to open the patient timeline</p>
              </div>
            </div>
            <Link to="/doctor/search" className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700">
              Search <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-5">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-gray-600 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Start searching for patients</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => activity.rawIc && navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)}
                    className={`group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all ${
                      activity.rawIc ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.type === 'view' ? 'bg-amber-100 text-amber-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{activity.patient}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.action}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{activity.time}</p>
                      <code className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                        {activity.ic}
                      </code>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
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
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/30 rounded-xl border border-amber-100/50"
              >
                <div className="w-2 h-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
