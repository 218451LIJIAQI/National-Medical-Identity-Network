import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Monitor,
  Bell,
  Type,
  Moon,
  Sun,
  X,
  RefreshCw,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore, type User, type UserRole } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { authApi, centralApi, hospitalApi } from '@/lib/api'
import { formatIC, formatTimeAgo, getRoleHomePath } from '@/lib/utils'
import { translations, type Language } from '@/lib/i18n'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface HospitalNavItem {
  icon: LucideIcon
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
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/doctor' },
      { icon: Monitor, label: 'Workstation', shortLabel: 'HIS', labelMY: 'Stesen Kerja', desc: 'Unified HIS', path: '/doctor/workstation' },
      { icon: Search, label: 'Patient Search', shortLabel: 'Search', labelMY: 'Cari Rekod Kebangsaan', desc: 'Find Records', path: '/doctor/search' },
      { icon: FileText, label: 'New Record', shortLabel: 'Record', labelMY: 'Rekod Baru', desc: 'Create Entry', path: '/doctor/new-record' },
    ],
  },
  {
    title: 'Clinical',
    sectionIcon: Heart,
    items: [
      { icon: Users, label: 'Queue', shortLabel: 'Queue', labelMY: 'Giliran Pesakit', desc: 'Giliran', path: '/doctor/queue' },
      { icon: Pill, label: 'e-Prescription', shortLabel: 'Rx', labelMY: 'e-Preskripsi', desc: 'e-Preskripsi', path: '/doctor/prescription' },
      { icon: FlaskConical, label: 'Lab Orders', shortLabel: 'Lab', labelMY: 'Ujian Makmal', desc: 'Ujian Makmal', path: '/doctor/lab' },
      { icon: ScanLine, label: 'Radiology', shortLabel: 'Imaging', labelMY: 'Radiologi', desc: 'Radiologi', path: '/doctor/radiology' },
      { icon: FileText, label: 'Medical Cert', shortLabel: 'MC', labelMY: 'Sijil MC', desc: 'Sijil MC', path: '/doctor/mc' },
    ],
  },
  {
    title: 'Management',
    sectionIcon: Calendar,
    items: [
      { icon: ArrowRightLeft, label: 'Referral', shortLabel: 'Refer', labelMY: 'Rujukan', desc: 'Rujukan', path: '/doctor/referral' },
      { icon: Calendar, label: 'Appointments', shortLabel: 'Appt', labelMY: 'Temujanji', desc: 'Temujanji', path: '/doctor/appointments' },
      { icon: Stethoscope, label: 'Nursing', shortLabel: 'Nurse', labelMY: 'Kejururawatan', desc: 'Kejururawatan', path: '/doctor/nursing' },
      { icon: Receipt, label: 'Billing', shortLabel: 'Bill', labelMY: 'Bil & Subsidi', desc: 'Bil & Subsidi', path: '/doctor/billing' },
    ],
  },
]

const ADMIN_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    sectionIcon: Home,
    items: [
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/admin/hospital' },
      { icon: Activity, label: 'Audit Logs', shortLabel: 'Audit', labelMY: 'Log Audit', desc: 'Activity', path: '/admin/audit' },
    ],
  },
  {
    title: 'Hospital Management',
    sectionIcon: Building2,
    items: [
      { icon: Users, label: 'Staff', shortLabel: 'Staff', labelMY: 'Kakitangan', desc: 'Kakitangan', path: '/admin/staff' },
      { icon: Building2, label: 'Departments', shortLabel: 'Dept', labelMY: 'Jabatan', desc: 'Jabatan', path: '/admin/departments' },
      { icon: Bed, label: 'Beds', shortLabel: 'Beds', labelMY: 'Katil', desc: 'Katil', path: '/admin/beds' },
      { icon: Package, label: 'Inventory', shortLabel: 'Stock', labelMY: 'Inventori', desc: 'Inventori', path: '/admin/inventory' },
      { icon: DollarSign, label: 'Finance', shortLabel: 'Finance', labelMY: 'Kewangan', desc: 'Kewangan', path: '/admin/finance' },
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

export function useHospitalHeaderMetrics(hospitalId?: string) {
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    totalRecords: 0,
    totalDoctors: 0,
    todayVisits: 0,
    loaded: false,
  })

  useEffect(() => {
    if (!hospitalId) return
    let active = true
    hospitalApi.getStats(hospitalId).then((res) => {
      if (active && res.success && res.data) {
        setMetrics({
          totalPatients: res.data.totalPatients,
          totalRecords: res.data.totalRecords,
          totalDoctors: res.data.totalDoctors,
          todayVisits: res.data.todayVisits,
          loaded: true,
        })
      }
    })
    return () => {
      active = false
    }
  }, [hospitalId])

  return metrics
}

export function PortalPreferencesInline({ inverted = false }: { inverted?: boolean }) {
  const { language, setLanguage, fontSize, setFontSize, highContrast, toggleHighContrast } = useSettingsStore()
  const { user, login } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [switching, setSwitching] = useState(false)

  const otherRoles = (user?.availableRoles || []).filter((r) => r !== user?.role)

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setSwitching(true)
    try {
      const res = await authApi.switchRole(targetRole)
      if (res.success && res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user)
        const dest = getRoleHomePath(res.data.user.role, false)
        toast({
          title: 'Role Switched',
          description: `Switched active session to ${res.data.user.role.replace('_', ' ')}`,
        })
        navigate(dest)
      } else {
        toast({
          title: 'Cannot Switch Role',
          description: res.error || 'Please sign in again to switch roles',
          variant: 'destructive',
        })
      }
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div
        className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${
          inverted ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200'
        }`}
      >
        {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
              language === lang
                ? inverted
                  ? 'bg-white text-gray-900'
                  : 'bg-white text-blue-600 shadow-sm'
                : inverted
                  ? 'text-white/80 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')}
        className={`p-1.5 rounded-lg border transition-colors ${
          inverted
            ? 'border-white/20 text-white/90 hover:bg-white/15'
            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
        title={`Font size: ${fontSize}`}
      >
        <Type className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={toggleHighContrast}
        className={`p-1.5 rounded-lg border transition-colors ${
          inverted
            ? 'border-white/20 text-white/90 hover:bg-white/15'
            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
        title="Toggle high contrast"
      >
        {highContrast ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
      </button>

      {otherRoles.map((r) => (
        <button
          key={r}
          type="button"
          disabled={switching}
          onClick={() => handleRoleSwitch(r)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            inverted
              ? 'bg-white/15 border-white/25 text-white hover:bg-white/25'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
          }`}
          title={`Switch active role to ${r}`}
        >
          <RefreshCw className={`w-3 h-3 ${switching ? 'animate-spin' : ''}`} />
          <span className="capitalize">{r.replace('_', ' ')}</span>
        </button>
      ))}
    </div>
  )
}

export function QuickCommandTrigger({ inverted = false }: { inverted?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { user } = useAuthStore()
  const { language } = useSettingsStore()
  const t = translations[language]
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const navItems = getHospitalNavSections(user?.role).flatMap((s) => s.items)
  const filteredNav = navItems.filter(
    (item) =>
      !query.trim() ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.labelMY.toLowerCase().includes(query.toLowerCase())
  )
  const looksLikeIc = /\d{6}/.test(query.replace(/-/g, ''))

  const goTo = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
          inverted
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Search className="w-3.5 h-3.5" />
        <span>{t.quickSearch}</span>
        <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${inverted ? 'bg-white/15 text-white/90' : 'bg-white border text-slate-500'}`}>
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (user?.role === 'doctor' && looksLikeIc) {
                      goTo(`/doctor/patient/${encodeURIComponent(formatIC(query))}`)
                    } else if (filteredNav[0]) {
                      goTo(filteredNav[0].path)
                    }
                  }
                }}
                placeholder={
                  user?.role === 'doctor'
                    ? 'Jump to module or type Patient IC (e.g. 880101-14-5678)...'
                    : 'Jump to hospital module...'
                }
                className="border-0 focus-visible:ring-0 h-9 px-0 text-sm"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {user?.role === 'doctor' && looksLikeIc && (
                <button
                  type="button"
                  onClick={() => goTo(`/doctor/patient/${encodeURIComponent(formatIC(query))}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium"
                >
                  <span>Open Federated Timeline for IC: {formatIC(query)}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              {filteredNav.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => goTo(item.path)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.labelMY}</p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{item.path}</span>
                  </button>
                )
              })}

              {filteredNav.length === 0 && !looksLikeIc && (
                <p className="text-center text-sm text-gray-400 py-6">No matching modules found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function ActivityNotificationsPopover({ inverted = false }: { inverted?: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Array<{ id: string; title: string; detail: string; time: string }>>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    const loader =
      user?.role === 'doctor'
        ? centralApi.getMyActivityLogs(5).then((res) => {
            if (!active) return
            if (res.success && res.data) {
              setItems(
                res.data.map((l) => ({
                  id: l.id,
                  title: l.patientName || l.action,
                  detail: l.details,
                  time: formatTimeAgo(l.timestamp),
                }))
              )
            }
          })
        : centralApi.getAuditLogs({ limit: 5 }).then((res) => {
            if (!active) return
            if (res.success && res.data) {
              setItems(
                res.data.map((l, idx) => ({
                  id: String(l.id || idx),
                  title: String(l.action || 'Audit Event'),
                  detail: String(l.details || l.targetIcNumber || 'Hospital activity'),
                  time: formatTimeAgo(String(l.timestamp || '')),
                }))
              )
            }
          })
    loader.finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [open, user?.role])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-xl transition-colors ${
          inverted ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-600'
        }`}
        aria-label="Recent activity notifications"
        title="Recent activity"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden text-gray-900">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Recent Audit Activity</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <p className="text-xs text-gray-500 p-4 text-center">Loading activity...</p>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                      <span className="text-[11px] text-gray-400 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 p-4 text-center">No recent activity recorded yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
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
