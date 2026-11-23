import { Link, useNavigate } from 'react-router-dom'
import {
  Search, FileText, Activity, ArrowRight,
  Users, Plus, Crown, Award, Sparkles,
  TrendingUp, MapPin, Building2, ChevronRight,
  Heart, BookOpen, History, Star
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatStaffDisplayName, LiveDate } from '@/layouts/hospital/shared'
import { useDoctorDashboard } from './useDoctorDashboard'

export default function QueenElizabethDashboard() {
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(5)
  const navigate = useNavigate()

  return (
    <motion.div className="space-y-6 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-amber-50/30 to-rose-50/50 rounded-3xl border border-amber-200/60 shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl border border-amber-300/50">
                  <Crown className="w-10 h-10 text-red-800" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border border-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                    Welcome back
                  </span>
                  <LiveDate
                    className="text-sm text-gray-500"
                    options={{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }}
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {formatStaffDisplayName(user, 'full')}
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {theme.name} • {theme.city}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/doctor/search">
                <button className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl font-semibold shadow-xl">
                  <Search className="w-5 h-5" />
                  Search Patients
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link to="/doctor/new-record">
                <button className="flex items-center gap-3 px-6 py-4 bg-white text-red-700 rounded-2xl font-semibold border-2 border-red-200 hover:bg-red-50 shadow-lg">
                  <Plus className="w-5 h-5" />
                  New Record
                </button>
              </Link>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {[
          { label: 'Connected Hospitals', value: loading ? '—' : stats.activeHospitals, icon: Building2, desc: 'Active in network' },
          { label: 'Queries Today', value: loading ? '—' : stats.todayQueries, icon: Activity, desc: 'Audited accesses' },
          { label: 'Network Patients', value: loading ? '—' : stats.totalPatients.toLocaleString(), icon: Users, desc: `${stats.avgResponseTime.toFixed(1)}s avg latency` },
        ].map((stat) => (
          <div key={stat.label} className="relative overflow-hidden bg-white rounded-2xl border border-amber-100 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-2">{stat.desc}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl border border-amber-200/50">
                  <stat.icon className="w-7 h-7 text-amber-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-amber-100">
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Active</span>
                </div>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative bg-white rounded-2xl border border-amber-100 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <div className="p-6 border-b border-amber-100 bg-gradient-to-r from-amber-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
              <p className="text-sm text-gray-500">Click an entry to open the patient timeline</p>
            </div>
          </div>
          <Link
            to="/doctor/search"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl"
          >
            Search <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-3xl flex items-center justify-center border border-amber-200">
                <BookOpen className="w-12 h-12 text-amber-500" />
              </div>
              <p className="text-lg font-semibold text-gray-700">No recent activity</p>
              <p className="text-sm text-gray-400 mt-2">Start by searching for patient records</p>
              <Link to="/doctor/search">
                <button className="mt-6 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg">
                  Search Patients
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  onClick={() => activity.rawIc && navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)}
                  className={`group p-5 bg-gradient-to-r from-amber-50/50 via-white to-rose-50/30 rounded-2xl border border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all ${
                    activity.rawIc ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      activity.type === 'view'
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}>
                      {activity.type === 'view' ? (
                        <FileText className="w-6 h-6 text-white" />
                      ) : (
                        <Heart className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{activity.patient}</p>
                      <p className="text-sm text-gray-500">{activity.action}</p>
                      <code className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg mt-2 inline-block border border-amber-200 font-mono">
                        {activity.ic}
                      </code>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-400">{activity.time}</p>
                      <ChevronRight className="w-6 h-6 text-amber-300 mt-2 ml-auto group-hover:text-amber-500 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative bg-white rounded-2xl border border-amber-100 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg">
              <Crown className="w-6 h-6 text-red-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Centers of Excellence</h2>
              <p className="text-sm text-gray-500">Our specialized medical departments</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {theme.specialties.map((specialty) => (
              <div
                key={specialty}
                className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-50 to-white rounded-2xl border border-amber-200"
              >
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-gray-800">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
