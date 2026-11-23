import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { authApi } from '@/lib/api'
import { translations } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { PortalPreferencesInline } from '@/layouts/hospital/shared'
import {
  Home,
  FileText,
  LogOut,
  User,
  Building2,
  Shield,
  Menu,
  X,
  Activity,
  Database,
  Siren,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const { language } = useSettingsStore()
  const t = translations[language]
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    authApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  const navItems =
    user?.role === 'patient'
      ? [
          { icon: Home, label: t.dashboard, path: '/patient' },
          { icon: FileText, label: t.myRecords, path: '/patient/records' },
          { icon: Shield, label: t.privacySettings, path: '/patient/privacy' },
        ]
      : user?.role === 'central_admin'
        ? [
            { icon: Home, label: t.dashboard, path: '/admin/central' },
            { icon: Database, label: t.patientIndex, path: '/admin/patient-index' },
            { icon: Siren, label: t.emergencyAccess, path: '/central/emergency' },
            { icon: Activity, label: t.auditLogs, path: '/central/audit' },
          ]
        : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <motion.button
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </motion.button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-2xl border-r border-gray-100/80 transform transition-all duration-500 ease-out lg:translate-x-0 shadow-2xl shadow-gray-300/30',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="w-6 h-6 text-white drop-shadow" />
              </div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {t.appName}
                </h1>
                <p className="text-xs text-gray-500">National Medical Network</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900">
                  {user?.fullName || user?.icNumber}
                </p>
                <p className="text-xs capitalize px-2 py-0.5 rounded-full inline-block mt-0.5 text-gray-500 bg-gray-100">
                  {user?.role === 'patient' ? t.patientPortal : t.centralPortal}
                </p>
              </div>
            </div>

            <PortalPreferencesInline />
          </div>

          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-11"
              onClick={handleLogout}
            >
              <LogOut size={20} className="mr-3" />
              {t.logout}
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-72 relative z-10">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
