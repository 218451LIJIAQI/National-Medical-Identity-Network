import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  FileText,
  Activity,
  ArrowRight,
  Users,
  Zap,
  Plus,
  Globe,
  Clock,
  Calendar,
  TrendingUp,
  MapPin,
  Building2,
  ChevronRight,
  Heart,
  Shield,
  Sparkles,
  Pill,
  FlaskConical,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatStaffDisplayName, LiveClock, LiveDate } from '@/layouts/hospital/shared'
import { useDoctorDashboard } from './useDoctorDashboard'
import { cn } from '@/lib/utils'

export interface DoctorHospitalDashboardProps {
  heroIcon?: LucideIcon
  badgeLabel?: string
}

export function DoctorHospitalDashboard({
  heroIcon: HeroIcon = Building2,
  badgeLabel = 'Federated Clinical Node',
}: DoctorHospitalDashboardProps) {
  const navigate = useNavigate()
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(6)

  const kpiCards = [
    {
      label: 'Connected Hospitals',
      value: loading ? '—' : stats.activeHospitals,
      sub: `${stats.localDoctors || 2} active doctors locally`,
      icon: Globe,
    },
    {
      label: 'Queries Today',
      value: loading ? '—' : stats.todayQueries,
      sub: `${stats.todayVisits} visits recorded today`,
      icon: Activity,
    },
    {
      label: 'Indexed Patients',
      value: loading ? '—' : stats.totalPatients.toLocaleString(),
      sub: `${stats.localPatients} registered at ${theme.shortName}`,
      icon: Users,
    },
    {
      label: 'Avg Federated Latency',
      value: loading ? '—' : `${stats.avgResponseTime.toFixed(1)}s`,
      sub: `${stats.localRecords} local clinical records`,
      icon: Zap,
    },
  ]

  const quickClinicalLinks = [
    { label: 'Patient Queue', path: '/doctor/queue', icon: Users },
    { label: 'e-Prescription', path: '/doctor/prescription', icon: Pill },
    { label: 'Lab Orders', path: '/doctor/lab', icon: FlaskConical },
    { label: 'Appointments', path: '/doctor/appointments', icon: Calendar },
  ]

  return (
    <div className={cn('space-y-6', theme.fontClass)}>
      {/* Hospital Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative overflow-hidden rounded-3xl bg-gradient-to-br border p-7 lg:p-8 shadow-lg',
          theme.heroSoftGradient,
          theme.borderColor
        )}
      >
        <div
          className={cn(
            'absolute top-0 right-0 w-80 h-80 bg-gradient-to-br rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none',
            theme.orbPrimaryClass
          )}
        />
        <div
          className={cn(
            'absolute bottom-0 left-1/4 w-48 h-48 bg-gradient-to-tr rounded-full blur-2xl translate-y-1/3 pointer-events-none',
            theme.orbSecondaryClass
          )}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className={cn('flex items-center gap-2 px-3.5 py-1.5 bg-white/80 rounded-xl border text-sm font-medium text-slate-700', theme.borderColor)}>
                <Calendar className={cn('w-4 h-4', theme.textColor)} />
                <LiveDate />
              </div>
              <div className={cn('flex items-center gap-2 px-3.5 py-1.5 bg-white/80 rounded-xl border text-sm font-medium text-slate-700', theme.borderColor)}>
                <Clock className={cn('w-4 h-4', theme.textColor)} />
                <LiveClock className="tabular-nums" />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">{badgeLabel}</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg', theme.buttonGradient)}>
                  <HeroIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', theme.textColor)}>Welcome back,</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {formatStaffDisplayName(user, 'full')}
                  </h1>
                  <p className="text-sm text-slate-600 mt-0.5">{theme.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/doctor/search"
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r shadow-md hover:opacity-95 transition-all',
                    theme.buttonGradient
                  )}
                >
                  <Search className="w-4 h-4" />
                  <span>Search Federated Records</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/doctor/new-record"
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-white border-2 hover:bg-slate-50 transition-all',
                    theme.textColor,
                    theme.borderColor
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Medical Record</span>
                </Link>
                <Link
                  to="/doctor/workstation"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Clinical Workstation</span>
                </Link>
              </div>
            </div>

            <div className={cn('p-5 bg-white/85 backdrop-blur-sm rounded-2xl border shadow-sm min-w-[240px]', theme.borderColor)}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center font-bold border', theme.badgeClass)}>
                  {theme.shortName}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{theme.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {theme.city}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className={cn('p-2.5 rounded-xl', theme.bgLight)}>
                  <p className="text-lg font-bold text-slate-900">{theme.departments}</p>
                  <p className={cn('text-xs font-medium', theme.textColor)}>Departments</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', theme.bgLight)}>
                  <p className="text-lg font-bold text-slate-900">{theme.bedCount}</p>
                  <p className={cn('text-xs font-medium', theme.textColor)}>Total Beds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((stat) => (
          <div
            key={stat.label}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm', theme.buttonGradient)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <TrendingUp className={cn('w-4 h-4', theme.textColor)} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{stat.label}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Clinical Shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {quickClinicalLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 hover:shadow-md transition-all group'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', theme.bgMedium, theme.textColor)}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-800 group-hover:text-slate-950">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
          </Link>
        ))}
      </div>

      {/* Recent Activity & Specialties */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className={cn('p-5 border-b border-slate-100 bg-gradient-to-r flex items-center justify-between', theme.cardHeaderGradient)}>
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', theme.buttonGradient)}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Clinical Activity</h2>
                <p className="text-xs text-slate-500">Your audited record queries and clinical entries</p>
              </div>
            </div>
            <Link to="/doctor/search" className={cn('text-sm font-semibold flex items-center gap-1', theme.textColor)}>
              Search Network <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-5">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <div className={cn('w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center', theme.bgLight, theme.textColor)}>
                  <Sparkles className="w-7 h-7" />
                </div>
                <p className="text-slate-700 font-medium">No recent patient queries yet</p>
                <p className="text-xs text-slate-400 mt-1">Query a MyKad IC number to view federated records</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((activity, index) => (
                  <div
                    key={`${activity.ic}-${index}`}
                    onClick={() => {
                      if (activity.rawIc) {
                        navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 transition-all',
                      activity.rawIc && 'cursor-pointer hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        activity.type === 'view' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      )}
                    >
                      {activity.type === 'view' ? <FileText className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{activity.patient}</p>
                      <p className="text-xs text-slate-500 truncate">{activity.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400">{activity.time}</p>
                      <code className={cn('text-[11px] px-2 py-0.5 rounded mt-1 inline-block', theme.bgLight, theme.textColor)}>
                        {activity.ic}
                      </code>
                    </div>
                    {activity.rawIc && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className={cn('p-5 border-b border-slate-100 bg-gradient-to-r flex items-center gap-3', theme.cardHeaderGradient)}>
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', theme.buttonGradient)}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital Specialties</h2>
              <p className="text-xs text-slate-500">{theme.shortName} Centers of Excellence</p>
            </div>
          </div>
          <div className="p-5 space-y-2.5">
            {theme.specialties.map((specialty) => (
              <div
                key={specialty}
                className={cn('flex items-center gap-3 p-3 rounded-xl border', theme.bgLight, theme.borderColor)}
              >
                <div className={cn('w-2 h-2 rounded-full', theme.iconBg)} />
                <span className="text-sm font-medium text-slate-800">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorHospitalDashboard
