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
  LogOut,
  User as UserIcon,
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
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore, type User, type UserRole } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { authApi } from '@/lib/api'
import { useTranslation, type Language, type TranslationKey } from '@/lib/i18n'
import { getHospitalTheme, type HospitalShellVariant } from '@/lib/hospital-themes'
import { cn, formatIC, getRoleHomePath, isValidMyKad } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModalDialog } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'

interface HospitalNavItem {
  icon: LucideIcon
  labelKey: TranslationKey
  path: string
}

interface HospitalNavSection {
  titleKey: TranslationKey
  items: HospitalNavItem[]
}

const DOCTOR_NAV_SECTIONS: HospitalNavSection[] = [
  {
    titleKey: 'navMainSection',
    items: [
      { icon: Home, labelKey: 'dashboard', path: '/doctor' },
      { icon: Search, labelKey: 'patientSearch', path: '/doctor/search' },
      { icon: FileText, labelKey: 'newRecord', path: '/doctor/new-record' },
    ],
  },
  {
    titleKey: 'clinicalModules',
    items: [
      { icon: Users, labelKey: 'queue', path: '/doctor/queue' },
      { icon: Pill, labelKey: 'ePrescription', path: '/doctor/prescription' },
      { icon: FlaskConical, labelKey: 'labOrders', path: '/doctor/lab' },
      { icon: ScanLine, labelKey: 'radiology', path: '/doctor/radiology' },
      { icon: FileText, labelKey: 'medicalCert', path: '/doctor/mc' },
    ],
  },
  {
    titleKey: 'managementModules',
    items: [
      { icon: ArrowRightLeft, labelKey: 'referral', path: '/doctor/referral' },
      { icon: Calendar, labelKey: 'appointments', path: '/doctor/appointments' },
      { icon: Stethoscope, labelKey: 'nursingNotes', path: '/doctor/nursing' },
      { icon: Receipt, labelKey: 'billing', path: '/doctor/billing' },
    ],
  },
]

const ADMIN_NAV_SECTIONS: HospitalNavSection[] = [
  {
    titleKey: 'navMainSection',
    items: [
      { icon: Home, labelKey: 'dashboard', path: '/admin/hospital' },
      { icon: Activity, labelKey: 'auditLogs', path: '/admin/audit' },
    ],
  },
  {
    titleKey: 'hospitalAdminModules',
    items: [
      { icon: Users, labelKey: 'staffManagement', path: '/admin/staff' },
      { icon: Building2, labelKey: 'departments', path: '/admin/departments' },
      { icon: Bed, labelKey: 'bedManagement', path: '/admin/beds' },
      { icon: Package, labelKey: 'inventory', path: '/admin/inventory' },
      { icon: DollarSign, labelKey: 'financialReports', path: '/admin/finance' },
    ],
  },
]

function getHospitalNavSections(role?: string): HospitalNavSection[] {
  return role === 'doctor' ? DOCTOR_NAV_SECTIONS : ADMIN_NAV_SECTIONS
}

export function LanguageSwitcher({
  inverted = false,
  activeClassName = 'bg-blue-600 text-white shadow-sm',
  showIcon = true,
  className,
}: {
  inverted?: boolean
  activeClassName?: string
  showIcon?: boolean
  className?: string
}) {
  const { language, setLanguage } = useTranslation()

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 p-1 rounded-xl border',
        inverted ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200',
        className
      )}
      role="group"
      aria-label="Language Switcher"
    >
      {showIcon && (
        <Globe
          className={cn(
            'w-3.5 h-3.5 mx-1 shrink-0',
            inverted ? 'text-white/85' : 'text-slate-500'
          )}
        />
      )}
      {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          className={cn(
            'px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0',
            language === lang
              ? inverted
                ? 'bg-white text-slate-900 shadow-sm'
                : activeClassName
              : inverted
                ? 'text-white/85 hover:bg-white/15'
                : 'text-slate-700 hover:bg-slate-200/70'
          )}
        >
          {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
        </button>
      ))}
    </div>
  )
}

export function DisplayAccessibilityControls({
  compact = false,
  inverted = false,
  className,
}: {
  compact?: boolean
  inverted?: boolean
  className?: string
}) {
  const { fontSize, setFontSize, highContrast, toggleHighContrast } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border',
        inverted ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-200',
        className
      )}
    >
      <div className="flex items-center gap-1" role="group" aria-label={t.fontScaleLabel}>
        <Type className={cn('w-3.5 h-3.5 mr-0.5 shrink-0', inverted ? 'text-white/80' : 'text-slate-500')} />
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
            aria-pressed={fontSize === scale}
            className={cn(
              'px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors',
              fontSize === scale
                ? inverted
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-900 text-white'
                : inverted
                  ? 'text-white/85 hover:bg-white/15'
                  : 'text-slate-700 hover:bg-slate-200/70'
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
          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0',
          highContrast
            ? inverted
              ? 'bg-white text-slate-900 border-white'
              : 'bg-slate-900 text-white border-slate-900'
            : inverted
              ? 'bg-white/10 text-white border-white/25 hover:bg-white/20'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
        )}
      >
        <Eye className="w-3 h-3 shrink-0" />
        <span>{compact ? 'HC' : t.highContrastLabel}</span>
      </button>
    </div>
  )
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

function formatStaffSubtitle(user?: User | null): string {
  if (!user) return ''
  if (user.specialization) return user.specialization
  if (user.role === 'hospital_admin') return 'Hospital Administrator'
  return user.role.replace('_', ' ')
}

export function LiveClock({
  showSeconds = false,
  hour12 = false,
  className,
}: {
  showSeconds?: boolean
  hour12?: boolean
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), showSeconds ? 1000 : 30000)
    return () => clearInterval(timer)
  }, [showSeconds])

  const formatted = now.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  })

  return <span className={cn('tabular-nums', className)}>{formatted}</span>
}

export function LiveDate({
  options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  locale = 'en-MY',
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

  return <span className={cn('tabular-nums', className)}>{now.toLocaleDateString(locale, options)}</span>
}

const VARIANT_ICONS: Record<HospitalShellVariant, LucideIcon> = {
  sidebar: Building2,
  'hover-rail': Leaf,
  'bottom-dock': Zap,
  'glass-sidebar': Hexagon,
  'royal-top': Crown,
}

export default function HospitalLayout() {
  const { user, logout, setSession } = useAuthStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const theme = getHospitalTheme(user?.hospitalId || 'hospital-kl')
  const variant = theme.shellVariant
  const navSections = getHospitalNavSections(user?.role)
  const BrandIcon = VARIANT_ICONS[variant]

  const [sidebarOpen, setSidebarOpen] = useState(variant !== 'hover-rail')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [quickIc, setQuickIc] = useState('')
  const [quickError, setQuickError] = useState('')
  const [switchingRole, setSwitchingRole] = useState(false)
  const dockScrollRef = useRef<HTMLDivElement>(null)
  const toolbarMenuRef = useRef<HTMLDivElement>(null)

  const alternateRoles = (user?.availableRoles || []).filter((r) => r !== user?.role)

  useEffect(() => {
    setSidebarOpen(variant !== 'hover-rail')
  }, [variant])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowQuickSearch((prev) => !prev)
      } else if (e.key === 'Escape') {
        setShowNotifications(false)
        setShowProfileMenu(false)
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
        setShowProfileMenu(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  useEffect(() => {
    setShowNotifications(false)
    setShowProfileMenu(false)
  }, [location.pathname])

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
    if (!isValidMyKad(normalized)) {
      setQuickError(t.invalidMyKadFormat)
      return
    }
    setQuickError('')
    setShowQuickSearch(false)
    setQuickIc('')
    if (user?.role === 'doctor') {
      navigate(`/doctor/patient/${encodeURIComponent(normalized)}`)
    } else {
      navigate(`/admin/audit?targetIcNumber=${encodeURIComponent(normalized)}`)
    }
  }

  const scrollDock = (dir: 'left' | 'right') => {
    dockScrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' })
  }

  const hasLeftSidebar =
    variant === 'sidebar' || variant === 'hover-rail' || variant === 'glass-sidebar'

  const renderToolbarActions = (inverted = false) => (
    <div ref={toolbarMenuRef} className="flex items-center gap-2 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowQuickSearch(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border',
          inverted
            ? 'text-white border-white/25 bg-white/10 hover:bg-white/20 hover:text-white'
            : 'text-slate-700 border-slate-200 bg-slate-50/80 hover:bg-slate-100'
        )}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-semibold hidden lg:inline">{t.patientSearch}</span>
        <kbd
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono',
            inverted ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-slate-600'
          )}
        >
          ⌘K
        </kbd>
      </Button>

      <LanguageSwitcher
        inverted={inverted}
        activeClassName={`${theme.iconBg} text-white shadow-sm`}
      />

      {/* Node Telemetry Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowNotifications(!showNotifications)
            setShowProfileMenu(false)
          }}
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            inverted ? 'text-white hover:bg-white/15' : 'text-slate-700 hover:bg-slate-100'
          )}
          aria-label="Node telemetry notifications"
          aria-expanded={showNotifications}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
        </button>

        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Federated Node Status
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <strong>{theme.name} ({theme.code})</strong> secondary staff verification active
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                Cross-hospital records are enforced read-only; all queries write to central audit log
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Staff Profile & Role Switcher Menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu(!showProfileMenu)
            setShowNotifications(false)
          }}
          aria-expanded={showProfileMenu}
          className={cn(
            'flex items-center gap-2 p-1.5 pr-2.5 rounded-xl transition-colors',
            inverted ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-900'
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              inverted ? 'bg-white/20 text-white' : `${theme.bgMedium} ${theme.textColor}`
            )}
          >
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold leading-tight">{formatStaffDisplayName(user)}</p>
            <p className={cn('text-[11px] leading-tight', inverted ? 'text-white/80' : 'text-slate-600')}>
              {formatStaffSubtitle(user)}
            </p>
          </div>
          <ChevronDown className={cn('w-3.5 h-3.5', inverted ? 'text-white/80' : 'text-slate-500')} />
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">{user?.fullName}</p>
              <p className="text-xs font-mono text-slate-600 mt-0.5 tabular-nums">
                {user?.icNumber ? formatIC(user.icNumber) : ''}
                {user?.licenseNumber ? ` • ${user.licenseNumber}` : ''}
              </p>
              <Badge className={cn('mt-2 text-xs border', theme.badgeClass)}>
                {theme.code} • {user?.role === 'doctor' ? t.doctorPortal : t.adminPortal}
              </Badge>
            </div>

            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
              <DisplayAccessibilityControls className="border-0 bg-transparent px-1 py-0.5" />
            </div>

            {alternateRoles.length > 0 && (
              <div className="px-2 py-1.5 border-b border-slate-100">
                {alternateRoles.map((altRole) => (
                  <button
                    key={altRole}
                    type="button"
                    disabled={switchingRole}
                    onClick={() => handleSwitchRole(altRole)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
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
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Stethoscope className="w-4 h-4 text-slate-500" />
                <span>{t.workstationView}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('min-h-screen bg-gradient-to-br', theme.heroSoftGradient)}>
      {/* Top Institutional Header */}
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-colors',
          variant === 'royal-top'
            ? `bg-gradient-to-r ${theme.headerGradient} text-white border-white/15 shadow-md`
            : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-sm'
        )}
      >
        <div className="max-w-[1600px] mx-auto px-5 min-h-[4rem] py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {hasLeftSidebar && (
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            )}

            <Link
              to={user?.role === 'doctor' ? '/doctor' : '/admin/hospital'}
              className="flex items-center gap-3 min-w-0"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0',
                  variant === 'royal-top'
                    ? 'bg-white/20 text-white border border-white/30'
                    : `bg-gradient-to-br ${theme.buttonGradient} text-white`
                )}
              >
                <BrandIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-bold text-sm xl:text-base leading-tight truncate',
                      variant === 'royal-top' ? 'text-white' : 'text-slate-900'
                    )}
                  >
                    {theme.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'hidden xl:inline-flex text-[11px] shrink-0',
                      variant === 'royal-top'
                        ? 'bg-white/15 text-white border-white/30'
                        : theme.badgeClass
                    )}
                  >
                    {theme.code} • {user?.role === 'doctor' ? t.doctorPortal : t.adminPortal}
                  </Badge>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    variant === 'royal-top' ? 'text-white/85' : 'text-slate-600'
                  )}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{theme.city}, {theme.state}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3 shrink-0" />
                  <LiveClock />
                </div>
              </div>
            </Link>
          </div>

          {renderToolbarActions(variant === 'royal-top')}
        </div>

        {/* Dedicated Second-Tier Ribbon for Queen Elizabeth Hospital (royal-top) — Zero Truncation Across Viewports & High Zoom */}
        {variant === 'royal-top' && (
          <div className="border-t border-white/15 bg-black/10">
            <nav
              className="max-w-[1600px] mx-auto px-5 py-1.5 flex items-center gap-1.5"
              aria-label="Hospital Navigation"
            >
              <button
                type="button"
                onClick={() => scrollDock('left')}
                className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                aria-label="Scroll navigation left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                ref={dockScrollRef}
                className="flex items-center gap-1 overflow-x-auto flex-1 py-0.5"
              >
                {navSections.flatMap((s) => s.items).map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                        isActive ? 'bg-white text-red-800 shadow-sm' : 'text-white/90 hover:bg-white/15 hover:text-white'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{t[item.labelKey]}</span>
                    </Link>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollDock('right')}
                className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                aria-label="Scroll navigation right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Left Sidebar for sidebar / hover-rail / glass-sidebar */}
        {hasLeftSidebar && (
          <aside
            onMouseEnter={variant === 'hover-rail' ? () => setSidebarOpen(true) : undefined}
            onMouseLeave={variant === 'hover-rail' ? () => setSidebarOpen(false) : undefined}
            onFocusCapture={variant === 'hover-rail' ? () => setSidebarOpen(true) : undefined}
            onBlurCapture={
              variant === 'hover-rail'
                ? (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setSidebarOpen(false)
                    }
                  }
                : undefined
            }
            className={cn(
              'flex flex-col z-30 h-[calc(100vh-4rem)] transition-all duration-200 border-r',
              variant === 'hover-rail' ? 'fixed top-16 left-0' : 'sticky top-16 shrink-0',
              variant === 'hover-rail'
                ? `bg-gradient-to-b ${theme.headerGradient} text-white border-white/15 shadow-lg`
                : variant === 'glass-sidebar'
                  ? 'bg-white/92 backdrop-blur-xl border-violet-200/80 shadow-sm'
                  : 'bg-white border-slate-200',
              sidebarOpen ? 'w-60' : 'w-[72px]'
            )}
          >
            <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto" aria-label="Hospital Portal Navigation">
              {navSections.map((section) => (
                <div key={section.titleKey}>
                  {sidebarOpen && (
                    <p
                      className={cn(
                        'px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider truncate',
                        variant === 'hover-rail' ? 'text-white/80' : theme.textColor
                      )}
                    >
                      {t[section.titleKey]}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      const label = t[item.labelKey]
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          title={!sidebarOpen ? label : undefined}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors',
                            variant === 'hover-rail'
                              ? isActive
                                ? 'bg-white text-emerald-900 font-bold shadow-sm'
                                : 'text-white/85 hover:bg-white/15 hover:text-white'
                              : isActive
                                ? theme.activeNavClass
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                            !sidebarOpen && 'justify-center'
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              variant === 'hover-rail'
                                ? isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-white/10 text-white'
                                : isActive
                                  ? `${theme.bgMedium} ${theme.textColor}`
                                  : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {sidebarOpen && (
                            <span className="text-xs font-semibold truncate flex-1">{label}</span>
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
                    'p-2.5 rounded-xl border text-xs',
                    variant === 'hover-rail'
                      ? 'bg-white/10 border-white/20 text-white'
                      : `${theme.bgLight} ${theme.borderColor} text-slate-700`
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <Shield className={cn('w-3.5 h-3.5 shrink-0', variant === 'hover-rail' ? 'text-white' : theme.textColor)} />
                    <span className="truncate">{theme.code} Federated Node</span>
                  </div>
                  <p className="text-[11px] opacity-85 truncate">Zero-trust verified session</p>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Clinical / Administrative Content Area */}
        <main
          className={cn(
            'flex-1 min-w-0 transition-all duration-200',
            variant === 'hover-rail' && 'pl-[72px]',
            variant === 'bottom-dock' && 'pb-28'
          )}
        >
          <div className="max-w-[1440px] mx-auto p-5 lg:p-6 xl:p-7">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Floating Dock for Sultanah Aminah Hospital (bottom-dock) */}
      {variant === 'bottom-dock' && (
        <nav
          className="flex fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 justify-center pointer-events-none"
          aria-label="Hospital Dock Navigation"
        >
          <div className="pointer-events-auto bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-300/80 px-2.5 py-2 max-w-[94vw] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollDock('left')}
              className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg shrink-0"
              aria-label="Scroll dock left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={dockScrollRef} className="flex items-center gap-1 overflow-x-auto px-1">
              {navSections.flatMap((s) => s.items).map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-colors',
                      isActive
                        ? `bg-gradient-to-r ${theme.buttonGradient} text-white shadow-sm`
                        : 'text-amber-900 hover:bg-amber-50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t[item.labelKey]}</span>
                  </Link>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollDock('right')}
              className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg shrink-0"
              aria-label="Scroll dock right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      )}

      {/* Quick Patient Jump Dialog (⌘K / Ctrl+K) */}
      <ModalDialog
        open={showQuickSearch}
        onClose={() => {
          setShowQuickSearch(false)
          setQuickError('')
        }}
        title={t.patientSearch}
        description={t.quickSearchHint}
        icon={<Search className={cn('w-5 h-5', theme.textColor)} />}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleQuickJump} className="space-y-4">
          <div className="space-y-1.5">
            <Input
              autoFocus
              value={quickIc}
              onChange={(e) => {
                setQuickIc(e.target.value)
                if (quickError) setQuickError('')
              }}
              placeholder={t.quickSearchPlaceholder}
              aria-invalid={Boolean(quickError)}
              className="h-11 font-mono text-sm tabular-nums"
            />
            {quickError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {quickError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowQuickSearch(false)
                setQuickError('')
              }}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!quickIc.trim()}
              className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}
            >
              {t.openPatient}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

