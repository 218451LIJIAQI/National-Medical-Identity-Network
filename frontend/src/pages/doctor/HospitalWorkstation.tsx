// ============================================================================
// Hospital Workstation - 完整医院工作站
// Integrated hospital management system with all modules
// ============================================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { 
  LayoutDashboard, Users, Search, FileText, Pill,
  FlaskConical, Calendar, ArrowRightLeft, ClipboardList,
  Building2, ChevronRight, Bell, Settings, LogOut,
  Globe, Activity, Clock, TrendingUp
} from 'lucide-react'

// Import modules
import { 
  QueueManagement, 
  EPrescription, 
  LabOrders, 
  MedicalCertificate, 
  Referral, 
  Appointments 
} from './modules'

type ModuleType = 'dashboard' | 'queue' | 'search' | 'prescription' | 'lab' | 'mc' | 'referral' | 'appointments'

interface NavItem {
  id: ModuleType
  label: string
  labelMY: string
  icon: typeof LayoutDashboard
  color: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelMY: 'Papan Pemuka', icon: LayoutDashboard, color: 'blue' },
  { id: 'queue', label: 'Queue', labelMY: 'Giliran', icon: Users, color: 'emerald' },
  { id: 'search', label: 'Patient Search', labelMY: 'Cari Pesakit', icon: Search, color: 'purple' },
  { id: 'prescription', label: 'e-Prescription', labelMY: 'e-Preskripsi', icon: Pill, color: 'teal' },
  { id: 'lab', label: 'Lab Orders', labelMY: 'Ujian Makmal', icon: FlaskConical, color: 'violet' },
  { id: 'mc', label: 'Medical Cert', labelMY: 'Sijil MC', icon: FileText, color: 'sky' },
  { id: 'referral', label: 'Referral', labelMY: 'Rujukan', icon: ArrowRightLeft, color: 'indigo' },
  { id: 'appointments', label: 'Appointments', labelMY: 'Temujanji', icon: Calendar, color: 'amber' },
]

export default function HospitalWorkstation() {
  const { user, logout } = useAuthStore()
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const theme = getHospitalTheme(user?.hospitalId)

  const renderModule = () => {
    switch (activeModule) {
      case 'queue':
        return <QueueManagement />
      case 'search':
        return (
          <div className="text-center py-12">
            <Link 
              to="/doctor/search" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold shadow-lg hover:bg-purple-700"
            >
              <Globe className="w-5 h-5" />
              Buka Carian Pesakit Kebangsaan
              <ChevronRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-gray-500">Cari rekod pesakit dari seluruh rangkaian hospital Malaysia</p>
          </div>
        )
      case 'prescription':
        return <EPrescription />
      case 'lab':
        return <LabOrders />
      case 'mc':
        return <MedicalCertificate doctorName={user?.fullName} hospitalName={theme.name} />
      case 'referral':
        return <Referral fromHospital={theme.name} />
      case 'appointments':
        return <Appointments doctorName={user?.fullName} />
      default:
        return <DashboardContent theme={theme} setActiveModule={setActiveModule} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        className="bg-white border-r border-gray-200 flex flex-col shadow-lg"
      >
        {/* Hospital Logo */}
        <div className="p-4 border-b border-gray-100">
          <motion.div 
            className="flex items-center gap-3"
            animate={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <p className="font-bold text-gray-800 text-sm">{theme.shortName}</p>
                  <p className="text-xs text-gray-500">{theme.city}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeModule === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? `bg-${item.color}-50 text-${item.color}-700 border border-${item.color}-200 shadow-sm` 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                whileHover={{ x: isActive ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isActive ? `bg-${item.color}-100` : 'bg-gray-100'
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? `text-${item.color}-600` : 'text-gray-500'}`} />
                </div>
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-left"
                    >
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs opacity-70">{item.labelMY}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-bold">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.role === 'doctor' ? 'Doktor' : 'Staff'}</p>
              </div>
            )}
          </div>
          
          {!sidebarCollapsed && (
            <div className="flex gap-2 mt-2">
              <button className="flex-1 p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 mx-auto" />
              </button>
              <button className="flex-1 p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 mx-auto" />
              </button>
              <button 
                onClick={logout}
                className="flex-1 p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-5 h-5 mx-auto" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        >
          <ChevronRight className={`w-5 h-5 mx-auto transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {navItems.find(n => n.id === activeModule)?.label}
              </h1>
              <p className="text-sm text-gray-500">
                {navItems.find(n => n.id === activeModule)?.labelMY}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-emerald-700">Online</span>
              </div>
              
              <Link 
                to="/doctor/search"
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Carian Kebangsaan</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// Dashboard Content Component
function DashboardContent({ theme, setActiveModule }: { theme: ReturnType<typeof getHospitalTheme>, setActiveModule: (m: ModuleType) => void }) {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div 
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-white/80 mb-2">Selamat Datang ke</p>
          <h2 className="text-3xl font-bold mb-2">{theme.name}</h2>
          <p className="text-white/70">{theme.tagline}</p>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Pesakit Hari Ini', value: '47', icon: Users },
              { label: 'Giliran Aktif', value: '12', icon: Activity },
              { label: 'Purata Tunggu', value: '23 min', icon: Clock },
              { label: 'Kadar Kehadiran', value: '94%', icon: TrendingUp },
            ].map(stat => (
              <div key={stat.label} className="p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <stat.icon className="w-6 h-6 mb-2 text-white/80" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { module: 'queue' as ModuleType, label: 'Giliran', labelEN: 'Queue', icon: Users, color: 'emerald' },
          { module: 'prescription' as ModuleType, label: 'Preskripsi', labelEN: 'Prescription', icon: Pill, color: 'teal' },
          { module: 'lab' as ModuleType, label: 'Ujian Lab', labelEN: 'Lab Orders', icon: FlaskConical, color: 'violet' },
          { module: 'mc' as ModuleType, label: 'MC / Sijil', labelEN: 'Med Cert', icon: FileText, color: 'sky' },
        ].map(action => (
          <motion.button
            key={action.module}
            onClick={() => setActiveModule(action.module)}
            className={`p-6 bg-${action.color}-50 rounded-xl border border-${action.color}-100 hover:shadow-lg transition-all text-left`}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`w-12 h-12 bg-${action.color}-100 rounded-xl flex items-center justify-center mb-4`}>
              <action.icon className={`w-6 h-6 text-${action.color}-600`} />
            </div>
            <p className="font-bold text-gray-800">{action.label}</p>
            <p className="text-sm text-gray-500">{action.labelEN}</p>
          </motion.button>
        ))}
      </div>

      {/* More Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          onClick={() => setActiveModule('referral')}
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all flex items-center gap-4"
          whileHover={{ x: 4 }}
        >
          <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ArrowRightLeft className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">Rujukan Pesakit</p>
            <p className="text-sm text-gray-500">Rujuk ke hospital / jabatan lain</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </motion.button>

        <motion.button
          onClick={() => setActiveModule('appointments')}
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all flex items-center gap-4"
          whileHover={{ x: 4 }}
        >
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-7 h-7 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">Temujanji</p>
            <p className="text-sm text-gray-500">Urus jadual temujanji</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </motion.button>
      </div>

      {/* National Search Banner */}
      <Link to="/doctor/search">
        <motion.div 
          className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white flex items-center justify-between"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-lg">Carian Rekod Kebangsaan</p>
              <p className="text-purple-200">Akses rekod pesakit dari semua hospital dalam rangkaian MyKad Health</p>
            </div>
          </div>
          <ChevronRight className="w-8 h-8" />
        </motion.div>
      </Link>
    </div>
  )
}
