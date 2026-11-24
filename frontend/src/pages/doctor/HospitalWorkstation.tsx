import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { authApi, hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation, type TranslationKey } from '@/lib/i18n'
import { DisplayAccessibilityControls, LanguageSwitcher } from '@/layouts/hospital/shared'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Search,
  FileText,
  Pill,
  FlaskConical,
  Calendar,
  ArrowRightLeft,
  Building2,
  ChevronRight,
  LogOut,
  Activity,
  ScanLine,
  Stethoscope,
  Receipt,
  ArrowLeft,
} from 'lucide-react'
import PatientSearch from './PatientSearch'
import QueueManagement from './modules/QueueManagement'
import EPrescription from './modules/EPrescription'
import LabOrders from './modules/LabOrders'
import MedicalCertificate from './modules/MedicalCertificate'
import Referral from './modules/Referral'
import Appointments from './modules/Appointments'
import Radiology from './modules/Radiology'
import NursingNotes from './modules/NursingNotes'
import Billing from './modules/Billing'

type ModuleType =
  | 'dashboard'
  | 'queue'
  | 'search'
  | 'prescription'
  | 'lab'
  | 'radiology'
  | 'mc'
  | 'referral'
  | 'appointments'
  | 'nursing'
  | 'billing'

interface NavItem {
  id: ModuleType
  labelKey: TranslationKey
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'search', labelKey: 'patientSearch', icon: Search },
  { id: 'queue', labelKey: 'queue', icon: Users },
  { id: 'prescription', labelKey: 'ePrescription', icon: Pill },
  { id: 'lab', labelKey: 'labOrders', icon: FlaskConical },
  { id: 'radiology', labelKey: 'radiology', icon: ScanLine },
  { id: 'mc', labelKey: 'medicalCert', icon: FileText },
  { id: 'referral', labelKey: 'referral', icon: ArrowRightLeft },
  { id: 'appointments', labelKey: 'appointments', icon: Calendar },
  { id: 'nursing', labelKey: 'nursingNotes', icon: Stethoscope },
  { id: 'billing', labelKey: 'billing', icon: Receipt },
]

export default function HospitalWorkstation() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [hospitalMetrics, setHospitalMetrics] = useState({
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
  })

  const theme = getHospitalTheme(user?.hospitalId)
  const activeNav = NAV_ITEMS.find((n) => n.id === activeModule)

  useEffect(() => {
    const controller = new AbortController()
    const hospitalId = user?.hospitalId || 'hospital-kl'
    hospitalApi.getStats(hospitalId, controller.signal).then((res) => {
      if (res.aborted || !res.success || !res.data) return
      setHospitalMetrics({
        totalPatients: res.data.totalPatients,
        totalRecords: res.data.totalRecords,
        totalDoctors: res.data.totalDoctors,
        todayVisits: res.data.todayVisits || 0,
      })
    })
    return () => controller.abort()
  }, [user?.hospitalId])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors
    }
    logout()
    navigate('/login')
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'search':
        return <PatientSearch />
      case 'queue':
        return <QueueManagement />
      case 'prescription':
        return <EPrescription />
      case 'lab':
        return <LabOrders />
      case 'radiology':
        return <Radiology />
      case 'mc':
        return <MedicalCertificate />
      case 'referral':
        return <Referral />
      case 'appointments':
        return <Appointments />
      case 'nursing':
        return <NursingNotes />
      case 'billing':
        return <Billing />
      default:
        return (
          <div className="space-y-6">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl p-7 text-white bg-gradient-to-r shadow-md',
                theme.headerGradient
              )}
            >
              <p className="text-white/85 text-xs font-bold uppercase tracking-wider mb-1">
                {t.workstationView}
              </p>
              <h2 className="text-2xl font-bold mb-1">{theme.name}</h2>
              <p className="text-white/80 text-xs">{theme.tagline}</p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                {[
                  { label: 'Registered Patients', value: hospitalMetrics.totalPatients, icon: Users },
                  { label: 'Clinical Records', value: hospitalMetrics.totalRecords, icon: FileText },
                  { label: 'Active Doctors', value: hospitalMetrics.totalDoctors, icon: Stethoscope },
                  { label: 'Visits Today', value: hospitalMetrics.todayVisits, icon: Activity },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 bg-white/15 backdrop-blur-sm rounded-xl border border-white/15">
                    <stat.icon className="w-4 h-4 mb-1.5 text-white/90" />
                    <p className="text-2xl font-extrabold tabular-nums">{stat.value}</p>
                    <p className="text-xs text-white/85">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {NAV_ITEMS.slice(1).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      theme.bgMedium,
                      theme.textColor
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-slate-900 text-xs truncate">{t[item.labelKey]}</p>
                </button>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          'bg-white border-r border-slate-200 flex flex-col shadow-sm shrink-0 transition-all duration-200',
          sidebarCollapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm text-white shrink-0',
              theme.buttonGradient
            )}
          >
            <Building2 className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs truncate">{theme.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{theme.code} Workstation</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto" aria-label="Workstation Modules">
          {NAV_ITEMS.map((item) => {
            const isActive = activeModule === item.id
            const label = t[item.labelKey]
            return (
              <button
                key={item.id}
                type="button"
                title={sidebarCollapsed ? label : undefined}
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors',
                  isActive ? theme.activeNavClass : 'text-slate-700 hover:bg-slate-100',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? `${theme.bgMedium} ${theme.textColor}` : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <p className="font-semibold text-xs truncate text-left">{label}</p>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          {!sidebarCollapsed && (
            <Link
              to="/doctor"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Standard Portal</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>{t.logout}</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2.5 border-t border-slate-100 text-slate-500 hover:text-slate-800"
          aria-label={sidebarCollapsed ? 'Expand workstation sidebar' : 'Collapse workstation sidebar'}
        >
          <ChevronRight
            className={cn('w-4 h-4 mx-auto transition-transform', !sidebarCollapsed && 'rotate-180')}
          />
        </button>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 min-h-[3.5rem] py-1.5 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-base font-bold text-slate-900 truncate">
            {activeNav ? t[activeNav.labelKey] : t.dashboard}
          </h1>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <LanguageSwitcher activeClassName={`${theme.iconBg} text-white shadow-sm`} />
            <DisplayAccessibilityControls compact />

            <Link
              to="/doctor/new-record"
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r',
                theme.buttonGradient
              )}
            >
              + {t.newRecord}
            </Link>
            <button
              type="button"
              onClick={() => setActiveModule('search')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold hover:bg-blue-100"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.patientSearch}</span>
            </button>
          </div>
        </header>

        <div className="p-6 max-w-[1440px] mx-auto">{renderModule()}</div>
      </main>
    </div>
  )
}
