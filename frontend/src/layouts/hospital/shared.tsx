import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  FileText,
  Activity,
  Users,
  Pill,
  FlaskConical,
  Calendar,
  ArrowRightLeft,
  ScanLine,
  Stethoscope,
  Receipt,
  Building2,
  Bed,
  Package,
  DollarSign,
  Leaf,
  Heart,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Bell,
  ChevronDown,
  MapPin,
  Clock,
  Shield,
  Crown,
  Hexagon,
  Zap,
  Globe,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, type User, type UserRole } from '@/store/auth'
import { authApi } from '@/lib/api'
import { useTranslation, type Language, type TranslationKey } from '@/lib/i18n'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { cn, formatIC, getRoleHomePath } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

export interface HospitalNavItem {
  icon: LucideIcon
  labelKey: TranslationKey
  label: string
  shortLabel: string
  labelMY: string
  desc: string
  path: string
}

export interface HospitalNavSection {
  title: string
  sectionIcon: LucideIcon
  items: HospitalNavItem[]
}

const DOCTOR_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    sectionIcon: Leaf,
    items: [
      { icon: Home, labelKey: 'dashboard', label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/doctor' },
      { icon: Search, labelKey: 'patientSearch', label: 'Patient Search', shortLabel: 'Search', labelMY: 'Cari Rekod Kebangsaan', desc: 'Find Records', path: '/doctor/search' },
      { icon: FileText, labelKey: 'newRecord', label: 'New Record', shortLabel: 'Record', labelMY: 'Rekod Baru', desc: 'Create Entry', path: '/doctor/new-record' },
    ],
  },
  {
    title: 'Clinical',
    sectionIcon: Heart,
    items: [
      { icon: Users, labelKey: 'queue', label: 'Queue', shortLabel: 'Queue', labelMY: 'Giliran Pesakit', desc: 'Giliran', path: '/doctor/queue' },
      { icon: Pill, labelKey: 'ePrescription', label: 'e-Prescription', shortLabel: 'Rx', labelMY: 'e-Preskripsi', desc: 'e-Preskripsi', path: '/doctor/prescription' },
      { icon: FlaskConical, labelKey: 'labOrders', label: 'Lab Orders', shortLabel: 'Lab', labelMY: 'Ujian Makmal', desc: 'Ujian Makmal', path: '/doctor/lab' },
      { icon: ScanLine, labelKey: 'radiology', label: 'Radiology', shortLabel: 'Imaging', labelMY: 'Radiologi', desc: 'Radiologi', path: '/doctor/radiology' },
      { icon: FileText, labelKey: 'medicalCert', label: 'Medical Cert', shortLabel: 'MC', labelMY: 'Sijil MC', desc: 'Sijil MC', path: '/doctor/mc' },
    ],
  },
  {
    title: 'Management',
    sectionIcon: Calendar,
    items: [
      { icon: ArrowRightLeft, labelKey: 'referral', label: 'Referral', shortLabel: 'Refer', labelMY: 'Rujukan', desc: 'Rujukan', path: '/doctor/referral' },
      { icon: Calendar, labelKey: 'appointments', label: 'Appointments', shortLabel: 'Appt', labelMY: 'Temujanji', desc: 'Temujanji', path: '/doctor/appointments' },
      { icon: Stethoscope, labelKey: 'nursingNotes', label: 'Nursing', shortLabel: 'Nurse', labelMY: 'Kejururawatan', desc: 'Kejururawatan', path: '/doctor/nursing' },
      { icon: Receipt, labelKey: 'billing', label: 'Billing', shortLabel: 'Bill', labelMY: 'Bil & Subsidi', desc: 'Bil & Subsidi', path: '/doctor/billing' },
    ],
  },
]

const ADMIN_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    sectionIcon: Home,
    items: [
      { icon: Home, labelKey: 'dashboard', label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/admin/hospital' },
      { icon: Activity, labelKey: 'auditLogs', label: 'Audit Logs', shortLabel: 'Audit', labelMY: 'Log Audit', desc: 'Activity', path: '/admin/audit' },
    ],
  },
  {
    title: 'Hospital Management',
    sectionIcon: Building2,
    items: [
      { icon: Users, labelKey: 'staffManagement', label: 'Staff', shortLabel: 'Staff', labelMY: 'Kakitangan', desc: 'Kakitangan', path: '/admin/staff' },
      { icon: Building2, labelKey: 'departments', label: 'Departments', shortLabel: 'Dept', labelMY: 'Jabatan', desc: 'Jabatan', path: '/admin/departments' },
      { icon: Bed, labelKey: 'bedManagement', label: 'Beds', shortLabel: 'Beds', labelMY: 'Katil', desc: 'Katil', path: '/admin/beds' },
      { icon: Package, labelKey: 'inventory', label: 'Inventory', shortLabel: 'Stock', labelMY: 'Inventori', desc: 'Inventori', path: '/admin/inventory' },
      { icon: DollarSign, labelKey: 'financialReports', label: 'Finance', shortLabel: 'Finance', labelMY: 'Kewangan', desc: 'Kewangan', path: '/admin/finance' },
    ],
  },
]

export function getHospitalNavSections(role?: string): HospitalNavSection[] {
  return role === 'doctor' ? DOCTOR_NAV_SECTIONS : ADMIN_NAV_SECTIONS
}

export function formatStaffDisplayName(user?: User | null, mode: 'short' | 'full' = 'short'): string {
  if (!user) return 'Staff'
  if (user.role === 'doctor') {
    const clean = (user.fullName || '').replace(/^Dr\.\s*/i, '').trim()
    if (!clean) return `Dr. ${user.icNumber}`
    return mode === 'full' ? `Dr. ${clean}` : `Dr. ${clean.split(' ').pop()}`
  }
  return user.fullName || user.icNumber
}

export function formatStaffSubtitle(user?: User | null): string {
  if (!user) return ''
  if (user.specialization) return user.specialization
  if (user.role === 'hospital_admin') return 'Hospital Administrator'
  return user.role.replace('_', ' ')
}

export function LiveClock({
  showSeconds = false,
  hour12 = true,
  className,
}: {
  showSeconds?: boolean
  hour12?: boolean
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), showSeconds ? 1000 : 60000)
    return () => clearInterval(timer)
  }, [showSeconds])

  const formatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  })

  return <span className={className}>{formatted}</span>
}

export function LiveDate({
  options = { weekday: 'short', month: 'short', day: 'numeric' },
  locale = 'en-US',
  className,
}: {
  options?: Intl.DateTimeFormatOptions
  locale?: string
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return <span className={className}>{now.toLocaleDateString(locale, options)}</span>
}

export type HospitalShellVariant = 'sidebar' | 'hover-rail' | 'bottom-dock' | 'glass-sidebar' | 'royal-top'

export interface HospitalPortalShellProps {
  hospitalId: string
  variant: HospitalShellVariant
  brandSubtitle?: string
}

const VARIANT_ICONS: Record<HospitalShellVariant, LucideIcon> = {
  sidebar: Building2,
  'hover-rail': Leaf,
  'bottom-dock': Zap,
  'glass-sidebar': Hexagon,
  'royal-top': Crown,
}

export function HospitalPortalShell({
  hospitalId,
  variant,
  brandSubtitle,
}: HospitalPortalShellProps) {
  const { user, logout, setSession } = useAuthStore()
  const { t, language, setLanguage } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const theme = getHospitalTheme(user?.hospitalId || hospitalId)
  const navSections = getHospitalNavSections(user?.role)
  const BrandIcon = VARIANT_ICONS[variant]

  const [sidebarOpen, setSidebarOpen] = useState(variant !== 'hover-rail')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [quickIc, setQuickIc] = useState('')
  const [switchingRole, setSwitchingRole] = useState(false)
  const dockScrollRef = useRef<HTMLDivElement>(null)

  const alternateRoles = (user?.availableRoles || []).filter((r) => r !== user?.role)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowQuickSearch((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleLogout = async () => {
    setShowProfileMenu(false)
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors during logout
    }
    logout()
    navigate('/login')
  }

  const handleSwitchRole = async (targetRole: UserRole) => {
    setSwitchingRole(true)
    setShowProfileMenu(false)
    try {
      const res = await authApi.switchRole(targetRole)
      if (res.success && res.data?.token && res.data?.user) {
        setSession(res.data.token, res.data.user)
        const nextPath = getRoleHomePath(res.data.user.role, Boolean(res.data.user.hospitalVerified))
        toast({
          title: t.switchRole,
          description: `Switched session to ${res.data.user.role.replace('_', ' ')}`,
        })
        navigate(nextPath)
      } else {
        toast({
          title: 'Role Switch Failed',
          description: res.error || 'Could not switch role',
          variant: 'destructive',
        })
      }
    } finally {
      setSwitchingRole(false)
    }
  }

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = formatIC(quickIc.trim())
    if (!normalized) return
    setShowQuickSearch(false)
    setQuickIc('')
    if (user?.role === 'doctor') {
      navigate(`/doctor/patient/${encodeURIComponent(normalized)}`)
    } else {
      navigate(`/admin/audit?targetIcNumber=${encodeURIComponent(normalized)}`)
    }
  }

  const scrollDock = (dir: 'left' | 'right') => {
    dockScrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' })
  }

  const renderToolbarActions = (inverted = false) => (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowQuickSearch(true)}
        className={cn(
          'hidden md:inline-flex items-center gap-2 rounded-xl',
          inverted ? 'text-white/90 hover:bg-white/15 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
        )}
      >
        <Search className="w-4 h-4" />
        <span>{t.patientSearch}</span>
        <kbd
          className={cn(
            'ml-1 px-1.5 py-0.5 rounded text-[11px]',
            inverted ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          )}
        >
          ⌘K
        </kbd>
      </Button>

      <div
        className={cn(
          'hidden sm:flex items-center gap-1 p-1 rounded-xl border',
          inverted ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'
        )}
      >
        <Globe className={cn('w-3.5 h-3.5 ml-1', inverted ? 'text-white/80' : 'text-slate-400')} />
        {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cn(
              'px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors',
              language === lang
                ? inverted
                  ? 'bg-white text-slate-900'
                  : `${theme.iconBg} text-white`
                : inverted
                  ? 'text-white/80 hover:bg-white/10'
                  : 'text-slate-600 hover:bg-slate-200/70'
            )}
          >
            {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowNotifications(!showNotifications)
            setShowProfileMenu(false)
          }}
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            inverted ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'
          )}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-left"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Node Telemetry
              </p>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                  <strong>{theme.shortName}</strong> federated node verified & active
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  Cross-hospital records strictly enforced as read-only
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu(!showProfileMenu)
            setShowNotifications(false)
          }}
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-xl transition-colors',
            inverted ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-900'
          )}
        >
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              inverted ? 'bg-white/20 text-white' : `${theme.bgMedium} ${theme.textColor}`
            )}
          >
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold leading-tight">{formatStaffDisplayName(user)}</p>
            <p className={cn('text-xs leading-tight', inverted ? 'text-white/75' : 'text-slate-500')}>
              {formatStaffSubtitle(user)}
            </p>
          </div>
          <ChevronDown className={cn('w-4 h-4', inverted ? 'text-white/70' : 'text-slate-400')} />
        </button>

        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800"
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900">{user?.fullName}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{user?.icNumber}</p>
                <Badge className={cn('mt-2 text-xs border', theme.badgeClass)}>
                  {theme.shortName} • {user?.role === 'doctor' ? t.doctorPortal : t.adminPortal}
                </Badge>
              </div>

              {alternateRoles.length > 0 && (
                <div className="px-2 py-2 border-b border-slate-100">
                  {alternateRoles.map((altRole) => (
                    <button
                      key={altRole}
                      type="button"
                      disabled={switchingRole}
                      onClick={() => handleSwitchRole(altRole)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>
                        {t.switchRole}: <strong className="capitalize">{altRole.replace('_', ' ')}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {user?.role === 'doctor' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    navigate('/doctor/workstation')
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Stethoscope className="w-4 h-4 text-slate-500" />
                  <span>Full Workstation View</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  const renderItemLabel = (item: HospitalNavItem) => t[item.labelKey] || item.label

  return (
    <div className={cn('min-h-screen bg-gradient-to-br', theme.heroSoftGradient)}>
      {/* Top Bar */}
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-colors',
          variant === 'royal-top'
            ? `bg-gradient-to-r ${theme.headerGradient} text-white border-white/15 shadow-xl`
            : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-sm'
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileMenuOpen(!mobileMenuOpen)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
              className={cn(
                'p-2 rounded-xl transition-colors',
                variant === 'bottom-dock' || variant === 'royal-top' ? 'lg:hidden' : '',
                variant === 'royal-top' ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'
              )}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link
              to={user?.role === 'doctor' ? '/doctor' : '/admin/hospital'}
              className="flex items-center gap-3"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-md',
                  variant === 'royal-top'
                    ? 'bg-white/20 text-white border border-white/30'
                    : `bg-gradient-to-br ${theme.buttonGradient} text-white`
                )}
              >
                <BrandIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-bold text-sm sm:text-base leading-tight',
                      variant === 'royal-top' ? 'text-white' : 'text-slate-900'
                    )}
                  >
                    {theme.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'hidden xl:inline-flex text-[11px]',
                      variant === 'royal-top'
                        ? 'bg-white/15 text-white border-white/30'
                        : theme.badgeClass
                    )}
                  >
                    {user?.role === 'doctor' ? t.doctorPortal : t.adminPortal}
                  </Badge>
                </div>
                <div
                  className={cn(
                    'hidden sm:flex items-center gap-2 text-xs',
                    variant === 'royal-top' ? 'text-white/80' : 'text-slate-500'
                  )}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{brandSubtitle || theme.city}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <LiveClock className="tabular-nums" />
                </div>
              </div>
            </Link>
          </div>

          {variant === 'royal-top' && (
            <nav className="hidden lg:flex items-center max-w-[44vw] overflow-hidden">
              <button
                type="button"
                onClick={() => scrollDock('left')}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                ref={dockScrollRef}
                className="flex items-center gap-1 bg-white/10 rounded-xl p-1 overflow-x-auto scrollbar-hide"
              >
                {navSections.flatMap((s) => s.items).map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                        isActive ? 'bg-white text-red-700 shadow' : 'text-white/85 hover:bg-white/15'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{renderItemLabel(item)}</span>
                    </Link>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollDock('right')}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}

          {renderToolbarActions(variant === 'royal-top')}
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 shadow-xl max-h-[80vh] overflow-y-auto text-slate-800"
            >
              {navSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className={cn('text-xs font-bold uppercase tracking-wider px-3 mb-1.5', theme.textColor)}>
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                            isActive ? theme.activeNavClass : 'text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{renderItemLabel(item)}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Desktop Left Sidebar for sidebar / hover-rail / glass-sidebar */}
      {(variant === 'sidebar' || variant === 'hover-rail' || variant === 'glass-sidebar') && (
        <aside
          onMouseEnter={variant === 'hover-rail' ? () => setSidebarOpen(true) : undefined}
          onMouseLeave={variant === 'hover-rail' ? () => setSidebarOpen(false) : undefined}
          className={cn(
            'hidden lg:flex flex-col fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] transition-all duration-300 border-r',
            variant === 'hover-rail'
              ? `bg-gradient-to-b ${theme.headerGradient} text-white border-white/10 shadow-xl`
              : variant === 'glass-sidebar'
                ? 'bg-white/85 backdrop-blur-xl border-violet-100 shadow-lg'
                : 'bg-white border-slate-200',
            sidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.title}>
                {sidebarOpen && (
                  <p
                    className={cn(
                      'px-3 mb-2 text-[11px] font-bold uppercase tracking-wider',
                      variant === 'hover-rail' ? 'text-white/75' : theme.textColor
                    )}
                  >
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={!sidebarOpen ? renderItemLabel(item) : undefined}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                          variant === 'hover-rail'
                            ? isActive
                              ? 'bg-white/25 text-white font-semibold shadow-sm'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                            : isActive
                              ? theme.activeNavClass
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                          !sidebarOpen && 'justify-center'
                        )}
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                            variant === 'hover-rail'
                              ? isActive
                                ? 'bg-white/20'
                                : 'bg-white/5'
                              : isActive
                                ? `${theme.bgMedium} ${theme.textColor}`
                                : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {sidebarOpen && (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">
                              {renderItemLabel(item)}
                            </span>
                            <span
                              className={cn(
                                'text-[11px] block truncate',
                                variant === 'hover-rail' ? 'text-white/65' : 'text-slate-400'
                              )}
                            >
                              {item.labelMY}
                            </span>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {sidebarOpen && (
            <div
              className={cn(
                'p-3 border-t',
                variant === 'hover-rail' ? 'border-white/15' : 'border-slate-200'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-xl border text-xs',
                  variant === 'hover-rail'
                    ? 'bg-white/10 border-white/20 text-white/90'
                    : `${theme.bgLight} ${theme.borderColor} text-slate-600`
                )}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Shield className={cn('w-4 h-4', variant === 'hover-rail' ? 'text-white' : theme.textColor)} />
                  <span>MedLink MY Federated Node</span>
                </div>
                <p className="opacity-80">Zero-trust verified session ({theme.shortName})</p>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
          (variant === 'sidebar' || variant === 'glass-sidebar') && (sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'),
          variant === 'hover-rail' && 'lg:pl-20',
          variant === 'bottom-dock' && 'pb-28'
        )}
      >
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Floating Dock for Johor Specialist */}
      {variant === 'bottom-dock' && (
        <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-200/70 px-3 py-2.5 max-w-6xl flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollDock('left')}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div ref={dockScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-2">
              {navSections.flatMap((s) => s.items).map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl min-w-[78px] transition-all',
                      isActive
                        ? `bg-gradient-to-br ${theme.buttonGradient} text-white shadow-md`
                        : 'text-amber-700 hover:bg-amber-50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-bold whitespace-nowrap">{item.shortLabel}</span>
                  </Link>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollDock('right')}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </nav>
      )}

      {/* Quick Patient Search Modal (⌘K) */}
      <AnimatePresence>
        {showQuickSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 p-4"
            onClick={() => setShowQuickSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleQuickJump} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className={cn('w-5 h-5', theme.textColor)} />
                    <h3 className="font-bold text-slate-900">{t.patientSearch}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickSearch(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  autoFocus
                  value={quickIc}
                  onChange={(e) => setQuickIc(e.target.value)}
                  placeholder="Enter MyKad IC Number (e.g. 880101-14-5678)"
                  className="h-12 font-mono text-base"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Press Enter to open federated timeline</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowQuickSearch(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
                      Open Patient
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
