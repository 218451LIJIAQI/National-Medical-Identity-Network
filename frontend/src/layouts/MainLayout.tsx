import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
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
  Activity,
  Database,
  Siren,
  ArrowRightLeft,
  Globe,
  Eye,
  Type,
} from 'lucide-react'
import { cn, formatIC, getRoleHomePath } from '@/lib/utils'

export default function MainLayout() {
  const { user, logout, setSession } = useAuthStore()
  const { fontSize, setFontSize, highContrast, toggleHighContrast } = useSettingsStore()
  const { t, language, setLanguage } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
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
          description: `Active session switched to ${res.data.user.role.replace('_', ' ')}`,
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
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="sticky top-0 h-screen shrink-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <Link
            to={user?.role === 'central_admin' ? '/admin/central' : '/patient'}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-slate-900 truncate">{t.appName}</h1>
              <p className="text-xs font-medium text-blue-700 truncate">
                {user?.role === 'central_admin' ? t.centralPortal : t.patientPortal}
              </p>
            </div>
          </Link>
        </div>

        {/* Active Identity Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700">
                <User className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-900">
                {user?.fullName || user?.icNumber}
              </p>
              <p className="text-xs font-mono text-slate-600 truncate">
                {user?.icNumber ? formatIC(user.icNumber) : ''}
              </p>
            </div>
          </div>

          {alternateRoles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-1.5">
              {alternateRoles.map((altRole) => (
                <Button
                  key={altRole}
                  variant="outline"
                  size="sm"
                  disabled={switchingRole}
                  onClick={() => handleSwitchRole(altRole)}
                  className="w-full justify-between text-xs h-8 rounded-lg border-blue-200 text-blue-800 bg-white hover:bg-blue-50"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {t.switchRole}: <strong className="capitalize">{altRole.replace('_', ' ')}</strong>
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Portal Navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Language, Accessibility & Logout */}
        <div className="p-3.5 border-t border-slate-200 space-y-2.5 bg-slate-50/50">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Lang</span>
            </span>
            <div className="flex items-center gap-1">
              {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'px-2 py-0.5 text-xs font-semibold rounded-md transition-colors',
                    language === lang
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-1" role="group" aria-label={t.fontScaleLabel}>
              <Type className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
              {(
                [
                  ['normal', 'A'],
                  ['large', 'A+'],
                  ['xlarge', 'A++'],
                ] as const
              ).map(([scale, label]) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setFontSize(scale)}
                  className={cn(
                    'px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors',
                    fontSize === scale
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title={t.highContrastLabel}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors',
                highContrast
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              )}
            >
              <Eye className="w-3 h-3" />
              <span>HC</span>
            </button>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-red-700 hover:text-red-800 hover:bg-red-50 rounded-xl h-9 text-sm font-semibold"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2.5" />
            {t.logout}
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-6 xl:p-8 max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
