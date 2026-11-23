import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatUserDisplayName } from '@/lib/utils'
import {
  LayoutDashboard, Users, Search, FileText, Pill, FlaskConical, Calendar,
  ArrowRightLeft, Building2, ChevronRight, LogOut, Globe, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import {
  QueueManagement,
  EPrescription,
  LabOrders,
  MedicalCertificate,
  Referral,
  Appointments,
} from './modules'

type ModuleId = 'dashboard' | 'queue' | 'search' | 'prescription' | 'lab' | 'mc' | 'referral' | 'appointments'

const WORKSTATION_MODULES: Array<{
  id: ModuleId
  label: string
  sublabel: string
  icon: typeof LayoutDashboard
  activeClass: string
  iconActiveClass: string
}> = [
  { id: 'dashboard', label: 'Workstation Home', sublabel: 'Quick Launcher', icon: LayoutDashboard, activeClass: 'bg-blue-50 text-blue-700 border-blue-200', iconActiveClass: 'bg-blue-600 text-white' },
  { id: 'queue', label: 'Queue', sublabel: 'Patient Triage', icon: Users, activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconActiveClass: 'bg-emerald-600 text-white' },
  { id: 'search', label: 'National Search', sublabel: 'Federated Lookup', icon: Search, activeClass: 'bg-purple-50 text-purple-700 border-purple-200', iconActiveClass: 'bg-purple-600 text-white' },
  { id: 'prescription', label: 'e-Prescription', sublabel: 'Dispensing', icon: Pill, activeClass: 'bg-teal-50 text-teal-700 border-teal-200', iconActiveClass: 'bg-teal-600 text-white' },
  { id: 'lab', label: 'Lab Orders', sublabel: 'Pathology', icon: FlaskConical, activeClass: 'bg-violet-50 text-violet-700 border-violet-200', iconActiveClass: 'bg-violet-600 text-white' },
  { id: 'mc', label: 'Medical Cert', sublabel: 'Sijil Cuti Sakit', icon: FileText, activeClass: 'bg-sky-50 text-sky-700 border-sky-200', iconActiveClass: 'bg-sky-600 text-white' },
  { id: 'referral', label: 'Referral', sublabel: 'Inter-Hospital', icon: ArrowRightLeft, activeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconActiveClass: 'bg-indigo-600 text-white' },
  { id: 'appointments', label: 'Appointments', sublabel: 'Clinic Schedule', icon: Calendar, activeClass: 'bg-amber-50 text-amber-800 border-amber-200', iconActiveClass: 'bg-amber-500 text-white' },
]

export default function HospitalWorkstation() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  const theme = getHospitalTheme(user?.hospitalId)
  const displayName = formatUserDisplayName(user)

  const renderContent = () => {
    switch (activeModule) {
      case 'queue':
        return <QueueManagement />
      case 'search':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <Globe className="w-12 h-12 text-purple-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">National Federated Record Query</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Search longitudinal records across all 5 MedLink MY hospitals using the patient&apos;s MyKad IC.
            </p>
            <Link
              to="/doctor/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow"
            >
              Open National Patient Search
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )
      case 'prescription':
        return <EPrescription />
      case 'lab':
        return <LabOrders />
      case 'mc':
        return <MedicalCertificate doctorName={displayName} hospitalName={theme.name} />
      case 'referral':
        return <Referral fromHospital={theme.name} />
      case 'appointments':
        return <Appointments />
      default:
        return (
          <div className="space-y-6">
            <div className={`rounded-2xl bg-gradient-to-r ${theme.headerGradient} p-7 text-white shadow-lg`}>
              <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">Integrated Clinical Workstation</p>
              <h1 className="text-2xl font-bold mt-1">Welcome, {displayName}</h1>
              <p className="text-sm text-white/85 mt-1">{theme.name} &middot; {theme.city}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WORKSTATION_MODULES.filter((m) => m.id !== 'dashboard').map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md text-left transition-all flex items-start gap-4"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconActiveClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.sublabel}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ${collapsed ? 'w-20' : 'w-68'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{theme.shortName}</p>
                <p className="text-xs text-gray-500 truncate">{theme.city}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-700"
            aria-label="Toggle sidebar width"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {WORKSTATION_MODULES.map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                  isActive ? item.activeClass : 'border-transparent text-gray-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? item.iconActiveClass : 'bg-slate-100 text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!collapsed && (
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{item.label}</p>
                    <p className="text-[11px] opacity-75 truncate">{item.sublabel}</p>
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <Link
            to="/doctor"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            {!collapsed ? 'Back to Hospital Portal' : 'Portal'}
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{renderContent()}</main>
    </div>
  )
}
