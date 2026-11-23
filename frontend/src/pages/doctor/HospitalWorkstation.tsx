import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  useHospitalHeaderMetrics,
  PortalPreferencesInline,
  ActivityNotificationsPopover,
  QuickCommandTrigger,
} from '@/layouts/hospital/shared'
import {
  LayoutDashboard, Users, Search, FileText, Pill,
  FlaskConical, Calendar, ArrowRightLeft, ScanLine, Stethoscope, Receipt,
  Building2, ChevronRight, LogOut, Globe, Activity, ArrowLeft
} from 'lucide-react'
import {
  QueueManagement,
  EPrescription,
  LabOrders,
  MedicalCertificate,
  Referral,
  Appointments,
  Radiology,
  NursingNotes,
  Billing,
} from './modules'

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
  label: string
  labelMY: string
  icon: typeof LayoutDashboard
  activeItemClass: string
  activeIconBgClass: string
  activeIconTextClass: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelMY: 'Overview', icon: LayoutDashboard, activeItemClass: 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm', activeIconBgClass: 'bg-blue-100', activeIconTextClass: 'text-blue-600' },
  { id: 'queue', label: 'Queue', labelMY: 'Patient Queue', icon: Users, activeItemClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm', activeIconBgClass: 'bg-emerald-100', activeIconTextClass: 'text-emerald-600' },
  { id: 'search', label: 'Patient Search', labelMY: 'Federated Query', icon: Search, activeItemClass: 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm', activeIconBgClass: 'bg-purple-100', activeIconTextClass: 'text-purple-600' },
  { id: 'prescription', label: 'e-Prescription', labelMY: 'Medications', icon: Pill, activeItemClass: 'bg-teal-50 text-teal-700 border border-teal-200 shadow-sm', activeIconBgClass: 'bg-teal-100', activeIconTextClass: 'text-teal-600' },
  { id: 'lab', label: 'Lab Orders', labelMY: 'Lab Tests', icon: FlaskConical, activeItemClass: 'bg-violet-50 text-violet-700 border border-violet-200 shadow-sm', activeIconBgClass: 'bg-violet-100', activeIconTextClass: 'text-violet-600' },
  { id: 'radiology', label: 'Radiology', labelMY: 'Imaging & PACS', icon: ScanLine, activeItemClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm', activeIconBgClass: 'bg-cyan-100', activeIconTextClass: 'text-cyan-600' },
  { id: 'mc', label: 'Medical Cert', labelMY: 'Sijil MC', icon: FileText, activeItemClass: 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm', activeIconBgClass: 'bg-sky-100', activeIconTextClass: 'text-sky-600' },
  { id: 'referral', label: 'Referral', labelMY: 'Inter-Hospital', icon: ArrowRightLeft, activeItemClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm', activeIconBgClass: 'bg-indigo-100', activeIconTextClass: 'text-indigo-600' },
  { id: 'appointments', label: 'Appointments', labelMY: 'Schedule', icon: Calendar, activeItemClass: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm', activeIconBgClass: 'bg-amber-100', activeIconTextClass: 'text-amber-600' },
  { id: 'nursing', label: 'Nursing Notes', labelMY: 'MAR & Vitals', icon: Stethoscope, activeItemClass: 'bg-pink-50 text-pink-700 border border-pink-200 shadow-sm', activeIconBgClass: 'bg-pink-100', activeIconTextClass: 'text-pink-600' },
  { id: 'billing', label: 'Billing', labelMY: 'Subsidy & Invoice', icon: Receipt, activeItemClass: 'bg-green-50 text-green-700 border border-green-200 shadow-sm', activeIconBgClass: 'bg-green-100', activeIconTextClass: 'text-green-600' },
]

export default function HospitalWorkstation() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const theme = getHospitalTheme(user?.hospitalId)
  const metrics = useHospitalHeaderMetrics(user?.hospitalId)
  const activeNav = navItems.find((n) => n.id === activeModule)

  const handleLogout = () => {
    authApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'queue':
        return <QueueManagement />
      case 'search':
        return (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Link
              to="/doctor/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold shadow-lg hover:bg-purple-700"
            >
              <Globe className="w-5 h-5" />
              Open National Patient Search
              <ChevronRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-gray-500">Query federated patient records from all 5 connected Malaysian hospitals</p>
          </div>
        )
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
        return <DashboardContent theme={theme} metrics={metrics} setActiveModule={setActiveModule} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        className="bg-white border-r border-gray-200 flex flex-col shadow-lg shrink-0"
      >
        <div className="p-4 border-b border-gray-100">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="font-bold text-gray-800 text-sm">{theme.shortName} HIS</p>
                <p className="text-xs text-gray-500">{theme.city}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeModule === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? item.activeItemClass : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? item.activeIconBgClass : 'bg-gray-100'
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? item.activeIconTextClass : 'text-gray-500'}`} />
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className="text-xs opacity-70 truncate">{item.labelMY}</p>
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-2">
          <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.specialization || 'Doctor'}</p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/doctor"
                className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Portal Home
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          title="Toggle sidebar"
        >
          <ChevronRight className={`w-5 h-5 mx-auto transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </motion.aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{activeNav?.label}</h1>
              <p className="text-sm text-gray-500">{activeNav?.labelMY}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <QuickCommandTrigger />
              <PortalPreferencesInline />
              <ActivityNotificationsPopover />

              <Link
                to="/doctor/search"
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                National Search
              </Link>
            </div>
          </div>
        </header>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function DashboardContent({
  theme,
  metrics,
  setActiveModule,
}: {
  theme: ReturnType<typeof getHospitalTheme>
  metrics: ReturnType<typeof useHospitalHeaderMetrics>
  setActiveModule: (m: ModuleType) => void
}) {
  const moduleCards: Array<{
    module: ModuleType
    label: string
    subtitle: string
    icon: typeof Users
    cardClass: string
    iconBgClass: string
    iconTextClass: string
  }> = [
    { module: 'queue', label: 'Queue Management', subtitle: 'Outpatient triage & rooms', icon: Users, cardClass: 'bg-emerald-50 border-emerald-100', iconBgClass: 'bg-emerald-100', iconTextClass: 'text-emerald-600' },
    { module: 'prescription', label: 'e-Prescription', subtitle: 'Formulary & interaction checks', icon: Pill, cardClass: 'bg-teal-50 border-teal-100', iconBgClass: 'bg-teal-100', iconTextClass: 'text-teal-600' },
    { module: 'lab', label: 'Lab Orders', subtitle: 'Pathology panels & specimens', icon: FlaskConical, cardClass: 'bg-violet-50 border-violet-100', iconBgClass: 'bg-violet-100', iconTextClass: 'text-violet-600' },
    { module: 'radiology', label: 'Radiology & PACS', subtitle: 'X-Ray, CT, MRI & Ultrasound', icon: ScanLine, cardClass: 'bg-cyan-50 border-cyan-100', iconBgClass: 'bg-cyan-100', iconTextClass: 'text-cyan-600' },
    { module: 'mc', label: 'Medical Certificate', subtitle: 'Official Sijil Cuti Sakit', icon: FileText, cardClass: 'bg-sky-50 border-sky-100', iconBgClass: 'bg-sky-100', iconTextClass: 'text-sky-600' },
    { module: 'referral', label: 'Patient Referral', subtitle: 'Inter-hospital & specialist transfer', icon: ArrowRightLeft, cardClass: 'bg-indigo-50 border-indigo-100', iconBgClass: 'bg-indigo-100', iconTextClass: 'text-indigo-600' },
    { module: 'appointments', label: 'Appointments', subtitle: 'Clinic schedule & bookings', icon: Calendar, cardClass: 'bg-amber-50 border-amber-100', iconBgClass: 'bg-amber-100', iconTextClass: 'text-amber-600' },
    { module: 'nursing', label: 'Nursing & MAR', subtitle: 'Vital charts & medication admin', icon: Stethoscope, cardClass: 'bg-pink-50 border-pink-100', iconBgClass: 'bg-pink-100', iconTextClass: 'text-pink-600' },
  ]

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
      >
        <div className="relative z-10">
          <p className="text-white/80 mb-1">Unified Clinical Workstation</p>
          <h2 className="text-3xl font-bold mb-2">{theme.name}</h2>
          <p className="text-white/75">{theme.tagline}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Hospital Patients', value: metrics.loaded ? metrics.totalPatients : '—', icon: Users },
              { label: 'Medical Records', value: metrics.loaded ? metrics.totalRecords : '—', icon: FileText },
              { label: 'Visits Today', value: metrics.loaded ? metrics.todayVisits : '—', icon: Activity },
              { label: 'Active Doctors', value: metrics.loaded ? metrics.totalDoctors : '—', icon: Stethoscope },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-white/15 backdrop-blur-sm rounded-xl">
                <stat.icon className="w-6 h-6 mb-2 text-white/80" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/75">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {moduleCards.map((action) => (
          <button
            key={action.module}
            onClick={() => setActiveModule(action.module)}
            className={`p-5 ${action.cardClass} rounded-xl border hover:shadow-md transition-all text-left`}
          >
            <div className={`w-11 h-11 ${action.iconBgClass} rounded-xl flex items-center justify-center mb-3`}>
              <action.icon className={`w-5 h-5 ${action.iconTextClass}`} />
            </div>
            <p className="font-bold text-gray-800">{action.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{action.subtitle}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveModule('billing')}
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800">Billing & MOH Subsidy</p>
            <p className="text-sm text-gray-500">Calculate citizen subsidy tiers & print receipts</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </button>

        <Link
          to="/doctor/new-record"
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800">Create Federated Medical Record</p>
            <p className="text-sm text-gray-500">Persist new visit, vitals, prescriptions & lab results</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
      </div>
    </div>
  )
}
