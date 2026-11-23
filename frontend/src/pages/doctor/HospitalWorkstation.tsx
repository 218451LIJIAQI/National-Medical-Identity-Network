import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { authApi, hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
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
  Globe,
  Activity,
  ScanLine,
  Stethoscope,
  Receipt,
  ArrowLeft,
} from 'lucide-react'
import PatientSearch from './PatientSearch'
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
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Overview', labelMY: 'Ringkasan', icon: LayoutDashboard },
  { id: 'search', label: 'Patient Search', labelMY: 'Carian Kebangsaan', icon: Search },
  { id: 'queue', label: 'Queue', labelMY: 'Giliran Pesakit', icon: Users },
  { id: 'prescription', label: 'e-Prescription', labelMY: 'e-Preskripsi', icon: Pill },
  { id: 'lab', label: 'Lab Orders', labelMY: 'Ujian Makmal', icon: FlaskConical },
  { id: 'radiology', label: 'Radiology', labelMY: 'Radiologi', icon: ScanLine },
  { id: 'mc', label: 'Medical Cert', labelMY: 'Sijil MC', icon: FileText },
  { id: 'referral', label: 'Referral', labelMY: 'Rujukan', icon: ArrowRightLeft },
  { id: 'appointments', label: 'Appointments', labelMY: 'Temujanji', icon: Calendar },
  { id: 'nursing', label: 'Nursing Notes', labelMY: 'Kejururawatan', icon: Stethoscope },
  { id: 'billing', label: 'Billing', labelMY: 'Bil & Subsidi', icon: Receipt },
]

export default function HospitalWorkstation() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [hospitalMetrics, setHospitalMetrics] = useState({
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
  })

  const theme = getHospitalTheme(user?.hospitalId)
  const activeNav = navItems.find((n) => n.id === activeModule)

  useEffect(() => {
    const hospitalId = user?.hospitalId || 'hospital-kl'
    hospitalApi.getStats(hospitalId).then((res) => {
      if (res.success && res.data) {
        setHospitalMetrics({
          totalPatients: res.data.totalPatients,
          totalRecords: res.data.totalRecords,
          totalDoctors: res.data.totalDoctors,
          todayVisits: res.data.todayVisits || 0,
        })
      }
    })
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
              className="relative overflow-hidden rounded-2xl p-8 text-white"
              style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
            >
              <p className="text-white/80 text-sm mb-1">Unified Clinical Workstation</p>
              <h2 className="text-3xl font-bold mb-1">{theme.name}</h2>
              <p className="text-white/75 text-sm">{theme.tagline}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Registered Patients', value: hospitalMetrics.totalPatients, icon: Users },
                  { label: 'Clinical Records', value: hospitalMetrics.totalRecords, icon: FileText },
                  { label: 'Active Doctors', value: hospitalMetrics.totalDoctors, icon: Stethoscope },
                  { label: 'Visits Today', value: hospitalMetrics.todayVisits, icon: Activity },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 bg-white/15 backdrop-blur-sm rounded-xl">
                    <stat.icon className="w-5 h-5 mb-1.5 text-white/85" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-white/75">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {navItems.slice(1).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className="p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-left flex items-center gap-3.5"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${theme.bgMedium} ${theme.textColor}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.labelMY}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 264 }}
        className="bg-white border-r border-slate-200 flex flex-col shadow-sm shrink-0"
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{theme.shortName} Workstation</p>
              <p className="text-xs text-slate-500 truncate">{theme.city}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeModule === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? theme.activeNavClass : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? `${theme.bgMedium} ${theme.textColor}` : 'bg-slate-100 text-slate-500'}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.labelMY}</p>
                  </div>
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
              Standard Portal View
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2.5 border-t border-slate-100 text-slate-400 hover:text-slate-600"
          title="Collapse sidebar"
        >
          <ChevronRight className={`w-4 h-4 mx-auto transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </motion.aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{activeNav?.label}</h1>
            <p className="text-xs text-slate-500">{activeNav?.labelMY}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/doctor/new-record"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r ${theme.buttonGradient}`}
            >
              + New Consultation
            </Link>
            <button
              type="button"
              onClick={() => setActiveModule('search')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100"
            >
              <Globe className="w-3.5 h-3.5" />
              National Search
            </button>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
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
