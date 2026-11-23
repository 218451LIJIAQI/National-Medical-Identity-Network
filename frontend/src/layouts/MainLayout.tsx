import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/store/auth'
import { authApi } from '@/lib/api'
import { useTranslation, type Language } from '@/lib/i18n'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
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
  ArrowRightLeft,
  Globe,
} from 'lucide-react'
import { cn, getRoleHomePath } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function MainLayout() {
  const { user, logout, setSession } = useAuthStore()
  const { t, language, setLanguage } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [switchingRole, setSwitchingRole] = useState(false)

  const patientNav = [
    { icon: Home, label: t.dashboard, path: '/patient' },
    { icon: FileText, label: t.myRecords, path: '/patient/records' },
    { icon: Shield, label: t.privacySettings, path: '/patient/privacy' },
  ]

  const centralAdminNav = [
    { icon: Home, label: t.dashboard, path: '/admin/central' },
    { icon: Database, label: t.patientIndex, path: '/admin/patient-index' },
    { icon: Siren, label: t.emergencyAccess, path: '/central/emergency' },
    { icon: Activity, label: t.auditLogs, path: '/central/audit' },
  ]

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Proceed with local cleanup even if offline
    }
    logout()
    navigate('/login')
  }

  const alternateRoles = (user?.availableRoles || []).filter((r) => r !== user?.role)

  const handleSwitchRole = async (targetRole: UserRole) => {
    setSwitchingRole(true)
    try {
      const res = await authApi.switchRole(targetRole)
      if (res.success && res.data?.token && res.data?.user) {
        setSession(res.data.token, res.data.user)
        const nextPath = getRoleHomePath(res.data.user.role, Boolean(res.data.user.hospitalVerified))
        toast({
          title: t.switchRole,
          description: `Switched active session to ${res.data.user.role.replace('_', ' ')}`,
        })
        navigate(nextPath)
      } else {
        toast({
          title: 'Role Switch Failed',
          description: res.error || 'Unable to switch role',
          variant: 'destructive',
        })
      }
    } finally {
      setSwitchingRole(false)
    }
  }

  const navItems =
    user?.role === 'patient'
      ? patientNav
      : user?.role === 'central_admin'
        ? centralAdminNav
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
          <motion.div
            className="p-5 border-b border-gray-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Building2 className="w-6 h-6 text-white drop-shadow" />
              </motion.div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {t.appName}
                </h1>
                <p className="text-xs text-gray-500">
                  {user?.role === 'central_admin' ? t.centralPortal : t.patientPortal}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
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
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>

            {alternateRoles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {alternateRoles.map((altRole) => (
                  <Button
                    key={altRole}
                    variant="outline"
                    size="sm"
                    disabled={switchingRole}
                    onClick={() => handleSwitchRole(altRole)}
                    className="w-full justify-between text-xs h-9 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {t.switchRole}: {altRole.replace('_', ' ')}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </motion.div>

          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
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
                </motion.div>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Lang
              </span>
              <div className="flex items-center gap-1">
                {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-md transition-colors',
                      language === lang
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
                  </button>
                ))}
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-11"
                onClick={handleLogout}
              >
                <LogOut size={20} className="mr-3" />
                {t.logout}
              </Button>
            </motion.div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-72 relative z-10">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
