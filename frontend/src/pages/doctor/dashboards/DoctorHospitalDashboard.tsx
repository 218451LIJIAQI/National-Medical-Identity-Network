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
import { formatStaffDisplayName, LiveClock, LiveDate } from '@/layouts/hospital/shared'
import { useTranslation } from '@/lib/i18n'
import { useDoctorDashboard } from './useDoctorDashboard'
import { StatusBadge } from '@/components/ui/modal-dialog'
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
  const { t } = useTranslation()
  const { user, theme, stats, recentActivity, loading } = useDoctorDashboard(6)

  const kpiCards = [
    {
      label: t.connectedHospitals,
      value: loading ? '—' : stats.activeHospitals,
      sub: `${stats.localDoctors || 2} active clinicians locally`,
      icon: Globe,
    },
    {
      label: 'Federated Queries Today',
      value: loading ? '—' : stats.todayQueries,
      sub: `${stats.todayVisits} encounters recorded today`,
      icon: Activity,
    },
    {
      label: 'National Indexed Patients',
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
    { label: t.queue, path: '/doctor/queue', icon: Users },
    { label: t.ePrescription, path: '/doctor/prescription', icon: Pill },
    { label: t.labOrders, path: '/doctor/lab', icon: FlaskConical },
    { label: t.appointments, path: '/doctor/appointments', icon: Calendar },
  ]

  return (
    <div className={cn('space-y-6', theme.fontClass)}>
      {/* Hospital Hero Banner */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-gradient-to-br border p-6 xl:p-7 shadow-sm',
          theme.heroSoftGradient,
          theme.borderColor
        )}
      >
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1 bg-white/90 rounded-xl border text-xs font-semibold text-slate-700',
                  theme.borderColor
                )}
              >
                <Calendar className={cn('w-3.5 h-3.5', theme.textColor)} />
                <LiveDate />
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1 bg-white/90 rounded-xl border text-xs font-semibold text-slate-700',
                  theme.borderColor
                )}
              >
                <Clock className={cn('w-3.5 h-3.5', theme.textColor)} />
                <LiveClock />
              </div>
            </div>

            <StatusBadge tone="success" label={badgeLabel} />
          </div>

          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-md shrink-0',
                    theme.buttonGradient
                  )}
                >
                  <HeroIcon className="w-7 h-7" />
                </div>
                <div>
                  <p className={cn('text-xs font-bold uppercase tracking-wider', theme.textColor)}>
                    Verified Clinician Session
                  </p>
                  <h1 className="text-2xl xl:text-3xl font-bold text-slate-900">
                    {formatStaffDisplayName(user, 'full')}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">{theme.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/doctor/search"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r shadow-sm hover:opacity-95 transition-opacity',
                    theme.buttonGradient
                  )}
                >
                  <Search className="w-4 h-4" />
                  <span>{t.patientSearch}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/doctor/new-record"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border hover:bg-slate-50 transition-colors',
                    theme.textColor,
                    theme.borderColor
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.newRecord}</span>
                </Link>
                <Link
                  to="/doctor/workstation"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>{t.workstationView}</span>
                </Link>
              </div>
            </div>

            <div
              className={cn(
                'p-4 bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm min-w-[250px]',
                theme.borderColor
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'px-2.5 py-1.5 rounded-xl flex items-center justify-center font-extrabold text-xs border shrink-0',
                    theme.badgeClass
                  )}
                >
                  {theme.code}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{theme.name}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{theme.city}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className={cn('p-2 rounded-xl', theme.bgLight)}>
                  <p className="text-base font-bold text-slate-900 tabular-nums">{theme.departments}</p>
                  <p className={cn('text-[11px] font-semibold', theme.textColor)}>{t.departments}</p>
                </div>
                <div className={cn('p-2 rounded-xl', theme.bgLight)}>
                  <p className="text-base font-bold text-slate-900 tabular-nums">
                    {theme.bedCount.toLocaleString()}
                  </p>
                  <p className={cn('text-[11px] font-semibold', theme.textColor)}>Beds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((stat) => (
          <div
            key={stat.label}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm',
                  theme.buttonGradient
                )}
              >
                <stat.icon className="w-5 h-5" />
              </div>
              <TrendingUp className={cn('w-4 h-4', theme.textColor)} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{stat.label}</p>
            <p className="text-xs text-slate-600 mt-1 tabular-nums">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Clinical Shortcuts */}
      <div className="grid grid-cols-4 gap-3.5">
        {quickClinicalLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                theme.bgMedium,
                theme.textColor
              )}
            >
              <item.icon className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 group-hover:text-slate-950 truncate">
              {item.label}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent Activity & Specialties */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className={cn(
              'p-5 border-b border-slate-100 bg-gradient-to-r flex items-center justify-between',
              theme.cardHeaderGradient
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                  theme.buttonGradient
                )}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Clinical Activity</h2>
                <p className="text-xs text-slate-600">Your audited record queries and clinical entries</p>
              </div>
            </div>
            <Link
              to="/doctor/search"
              className={cn('text-xs font-bold flex items-center gap-1', theme.textColor)}
            >
              {t.patientSearch} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-5">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div
                  className={cn(
                    'w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center',
                    theme.bgLight,
                    theme.textColor
                  )}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-slate-700 font-semibold text-sm">No recent patient queries yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Query a MyKad IC number to open federated timelines
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <button
                    key={`${activity.ic}-${index}`}
                    type="button"
                    disabled={!activity.rawIc}
                    onClick={() => {
                      if (activity.rawIc) {
                        navigate(`/doctor/patient/${encodeURIComponent(activity.rawIc)}`)
                      }
                    }}
                    className={cn(
                      'w-full text-left flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 transition-colors',
                      activity.rawIc && 'hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        activity.type === 'view'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      )}
                    >
                      {activity.type === 'view' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{activity.patient}</p>
                      <p className="text-xs text-slate-600 truncate">{activity.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 tabular-nums">{activity.time}</p>
                      <code
                        className={cn(
                          'text-[11px] px-2 py-0.5 rounded mt-0.5 inline-block tabular-nums font-semibold',
                          theme.bgLight,
                          theme.textColor
                        )}
                      >
                        {activity.ic}
                      </code>
                    </div>
                    {activity.rawIc && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className={cn(
              'p-5 border-b border-slate-100 bg-gradient-to-r flex items-center gap-3',
              theme.cardHeaderGradient
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                theme.buttonGradient
              )}
            >
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Centers of Excellence</h2>
              <p className="text-xs text-slate-600">{theme.name}</p>
            </div>
          </div>
          <div className="p-5 space-y-2">
            {theme.specialties.map((specialty) => (
              <div
                key={specialty}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  theme.bgLight,
                  theme.borderColor
                )}
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0', theme.iconBg)} />
                <span className="text-xs font-bold text-slate-800">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorHospitalDashboard
