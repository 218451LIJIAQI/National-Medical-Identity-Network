import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore, type User as AuthUser, type UserRole } from '@/store/auth'
import { useTranslation } from '@/lib/i18n'
import { authApi } from '@/lib/api'
import { cn, formatIC, getRoleHomePath } from '@/lib/utils'
import {
  Loader2,
  CreditCard,
  Lock,
  ArrowRight,
  Shield,
  Building2,
  Stethoscope,
  User,
  Network,
  Fingerprint,
  MapPin,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

interface DemoAccount {
  label: string
  hospital?: string
  city?: string
  desc: string
  ic: string
  password: string
  role: UserRole
  icon: LucideIcon
  color: string
}

const DOCTOR_ACCOUNTS: DemoAccount[] = [
  { label: 'Dr. Lim Wei Ming', hospital: 'Kuala Lumpur General Hospital', city: 'Kuala Lumpur', desc: 'Internal Medicine (Dual-Role)', ic: '750101-14-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: '#2563EB' },
  { label: 'Dr. Tan Mei Ling', hospital: 'Penang General Hospital', city: 'George Town', desc: 'Neurology (Dual-Role)', ic: '760612-07-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: '#059669' },
  { label: 'Dr. Siti Aishah', hospital: 'Sultanah Aminah Hospital', city: 'Johor Bahru', desc: 'Oncology (Dual-Role)', ic: '770808-01-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: '#D97706' },
  { label: 'Dr. James Wong', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Nephrology (Dual-Role)', ic: '790303-13-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: '#7C3AED' },
  { label: 'Dr. Maria Gonzales', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Pulmonology (Dual-Role)', ic: '810707-12-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: '#DC2626' },
]

const HOSPITAL_ADMIN_ACCOUNTS: DemoAccount[] = [
  { label: 'KL General Admin', hospital: 'Kuala Lumpur General Hospital', city: 'Kuala Lumpur', desc: 'Hospital Administrator', ic: 'admin-kl', password: 'admin123', role: 'hospital_admin', icon: Building2, color: '#2563EB' },
  { label: 'Penang General Admin', hospital: 'Penang General Hospital', city: 'George Town', desc: 'Hospital Administrator', ic: 'admin-penang', password: 'admin123', role: 'hospital_admin', icon: Building2, color: '#059669' },
  { label: 'Sultanah Aminah Admin', hospital: 'Sultanah Aminah Hospital', city: 'Johor Bahru', desc: 'Hospital Administrator', ic: 'admin-jb', password: 'admin123', role: 'hospital_admin', icon: Building2, color: '#D97706' },
  { label: 'Sarawak General Admin', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Hospital Administrator', ic: 'admin-kuching', password: 'admin123', role: 'hospital_admin', icon: Building2, color: '#7C3AED' },
  { label: 'Queen Elizabeth Admin', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Hospital Administrator', ic: 'admin-kk', password: 'admin123', role: 'hospital_admin', icon: Building2, color: '#DC2626' },
]

const PATIENT_ACCOUNTS: DemoAccount[] = [
  { label: 'Ahmad bin Abdullah', city: 'Kuala Lumpur', desc: 'Hypertension, Type 2 Diabetes', ic: '880101-14-5678', password: 'patient123', role: 'patient', icon: User, color: '#059669' },
  { label: 'Siti Nurhaliza binti Mohd', city: 'George Town', desc: 'Bronchial Asthma', ic: '950320-10-1234', password: 'patient123', role: 'patient', icon: User, color: '#0D9488' },
  { label: 'Tan Ah Kow', city: 'Johor Bahru', desc: 'Coronary Artery Disease, CKD', ic: '550715-07-9999', password: 'patient123', role: 'patient', icon: User, color: '#D97706' },
  { label: 'Raj Kumar a/l Muthu', city: 'Kuching', desc: 'Epilepsy', ic: '900808-01-5555', password: 'patient123', role: 'patient', icon: User, color: '#7C3AED' },
  { label: 'Aishah binti Mohd Yusof', city: 'Kota Kinabalu', desc: 'Asthma', ic: '820425-12-7777', password: 'patient123', role: 'patient', icon: User, color: '#2563EB' },
  { label: 'Lee Mei Fong', city: 'Kuala Lumpur', desc: 'Rheumatoid Arthritis', ic: '780312-14-2345', password: 'patient123', role: 'patient', icon: User, color: '#0284C7' },
  { label: 'Lim Wei Ming (Patient Role)', city: 'Kuala Lumpur', desc: 'Dual-Role Doctor & Patient', ic: '750101-14-5001', password: 'doctor123', role: 'patient', icon: User, color: '#475569' },
  { label: 'Tan Mei Ling (Patient Role)', city: 'George Town', desc: 'Dual-Role Doctor & Patient', ic: '760612-07-5001', password: 'doctor123', role: 'patient', icon: User, color: '#475569' },
]

const CENTRAL_ADMIN_ACCOUNT: DemoAccount = {
  label: 'Central Administrator',
  desc: 'National Federated Hub Governance',
  ic: 'central-admin',
  password: 'central123',
  role: 'central_admin',
  icon: Network,
  color: '#0284C7',
}

const ALL_DEMO_ACCOUNTS: DemoAccount[] = [
  ...DOCTOR_ACCOUNTS,
  ...HOSPITAL_ADMIN_ACCOUNTS,
  ...PATIENT_ACCOUNTS,
  CENTRAL_ADMIN_ACCOUNT,
]

type ModalKind = 'doctor' | 'hospital_admin' | 'patient' | null

const MODAL_CONFIG: Record<
  Exclude<ModalKind, null>,
  {
    title: string
    subtitle: string
    icon: LucideIcon
    accounts: DemoAccount[]
  }
> = {
  doctor: {
    title: 'Select Clinician Account',
    subtitle: '5 federated hospital clinician accounts (requires step-up verification)',
    icon: Stethoscope,
    accounts: DOCTOR_ACCOUNTS,
  },
  hospital_admin: {
    title: 'Select Hospital Administrator',
    subtitle: '5 hospital-scoped administrative accounts',
    icon: Building2,
    accounts: HOSPITAL_ADMIN_ACCOUNTS,
  },
  patient: {
    title: 'Select Citizen Patient Account',
    subtitle: '8 patient identities including dual-role clinician-patients',
    icon: User,
    accounts: PATIENT_ACCOUNTS,
  },
}

const ROLE_CARD_META: Record<
  UserRole,
  {
    title: string
    subtitle: string
    icon: LucideIcon
    borderClass: string
    bgClass: string
    iconWrapClass: string
  }
> = {
  doctor: {
    title: 'Doctor Portal',
    subtitle: 'Query cross-hospital timelines & author local consultations',
    icon: Stethoscope,
    borderClass: 'border-blue-200 hover:border-blue-500',
    bgClass: 'bg-blue-50/70',
    iconWrapClass: 'bg-blue-100 text-blue-700',
  },
  patient: {
    title: 'Patient Portal',
    subtitle: 'Review personal medical records & control hospital consent',
    icon: User,
    borderClass: 'border-emerald-200 hover:border-emerald-500',
    bgClass: 'bg-emerald-50/70',
    iconWrapClass: 'bg-emerald-100 text-emerald-700',
  },
  hospital_admin: {
    title: 'Hospital Admin',
    subtitle: 'Manage hospital operations & inspect hospital audit trail',
    icon: Building2,
    borderClass: 'border-indigo-200 hover:border-indigo-500',
    bgClass: 'bg-indigo-50/70',
    iconWrapClass: 'bg-indigo-100 text-indigo-700',
  },
  central_admin: {
    title: 'Central Admin',
    subtitle: 'Monitor national patient index & cross-hospital audit logs',
    icon: Network,
    borderClass: 'border-cyan-200 hover:border-cyan-500',
    bgClass: 'bg-cyan-50/70',
    iconWrapClass: 'bg-cyan-100 text-cyan-700',
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { login } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [chipScanning, setChipScanning] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [pendingLogin, setPendingLogin] = useState<{
    ic: string
    password: string
    roles: UserRole[]
  } | null>(null)

  const normalizedInputIc = formatIC(icNumber)
  const selectedDoctor = DOCTOR_ACCOUNTS.find(
    (d) => d.ic === normalizedInputIc && (!selectedRole || selectedRole === 'doctor')
  )
  const selectedHospitalAdmin = HOSPITAL_ADMIN_ACCOUNTS.find((a) => a.ic === icNumber.trim())
  const selectedPatient = PATIENT_ACCOUNTS.find(
    (p) => p.ic === normalizedInputIc && (!selectedDoctor || selectedRole === 'patient')
  )

  const fillDemo = (demo: { ic: string; password: string; role: UserRole }) => {
    setIcNumber(demo.ic)
    setPassword(demo.password)
    setSelectedRole(demo.role)
    setActiveModal(null)
  }

  const executeLogin = async (
    ic: string,
    pwd: string,
    role?: string,
    customWelcome?: { title: string; description: string }
  ) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(ic.trim(), pwd, role || undefined)

      if (response.success && response.data) {
        if (response.data.requiresRoleSelection && response.data.availableRoles?.length) {
          setPendingLogin({
            ic: response.data.icNumber || formatIC(ic),
            password: pwd,
            roles: response.data.availableRoles,
          })
          setShowRoleSelection(true)
          return true
        }

        if (response.data.token && response.data.user) {
          const authUser = response.data.user as AuthUser
          login(response.data.token, authUser)

          const targetPath = getRoleHomePath(authUser.role, Boolean(authUser.hospitalVerified))
          toast(
            customWelcome || {
              title: 'Authenticated',
              description:
                targetPath === '/verify'
                  ? 'Proceeding to hospital secondary verification…'
                  : 'Signed in to MedLink MY.',
              variant: 'success',
            }
          )
          navigate(targetPath)
          return true
        }
      }

      toast({
        title: 'Authentication Failed',
        description: response.error || 'Invalid MyKad IC or password',
        variant: 'destructive',
      })
      return false
    } catch {
      toast({
        title: 'Connection Error',
        description: t.networkError,
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!icNumber.trim() || !password) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter both IC number / Staff ID and password.',
        variant: 'destructive',
      })
      return
    }

    await executeLogin(icNumber, password, selectedRole || undefined)
  }

  const handleRoleSelect = async (role: UserRole) => {
    if (!pendingLogin) return
    setShowRoleSelection(false)
    setSelectedRole(role)
    const { ic, password: pwd } = pendingLogin
    setPendingLogin(null)

    await executeLogin(ic, pwd, role, {
      title: role === 'doctor' || role === 'hospital_admin' ? 'Identity Verified' : 'Authenticated',
      description:
        role === 'doctor' || role === 'hospital_admin'
          ? 'Proceeding to hospital secondary verification…'
          : `Signed in as ${role.replace('_', ' ')}`,
    })
  }

  const handleIcScan = async () => {
    const selectedDemo =
      ALL_DEMO_ACCOUNTS.find((d) => d.ic === normalizedInputIc && (!selectedRole || d.role === selectedRole)) ||
      ALL_DEMO_ACCOUNTS.find((d) => d.ic === icNumber.trim() || d.ic === normalizedInputIc)

    if (!selectedDemo && (!icNumber.trim() || !password)) {
      toast({
        title: 'Select Identity First',
        description: 'Choose a Quick Access identity below or enter credentials before scanning.',
        variant: 'destructive',
      })
      return
    }

    setChipScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 450))
    setChipScanning(false)

    const loginIc = selectedDemo ? selectedDemo.ic : icNumber
    const loginPwd = selectedDemo ? selectedDemo.password : password
    await executeLogin(loginIc, loginPwd, selectedRole || undefined)
  }

  const quickAccessCards = [
    {
      key: 'doctor',
      selected: selectedDoctor,
      defaultTitle: 'Doctor',
      subtitle: selectedDoctor ? selectedDoctor.hospital : '5 hospitals',
      meta: selectedDoctor ? selectedDoctor.ic : 'Select clinician →',
      icon: Stethoscope,
      onClick: () => setActiveModal('doctor'),
      hasChevron: true,
    },
    {
      key: 'hospital_admin',
      selected: selectedHospitalAdmin,
      defaultTitle: 'Hospital Admin',
      subtitle: selectedHospitalAdmin ? selectedHospitalAdmin.hospital : '5 hospitals',
      meta: selectedHospitalAdmin ? selectedHospitalAdmin.ic : 'Select admin →',
      icon: Building2,
      onClick: () => setActiveModal('hospital_admin'),
      hasChevron: true,
    },
    {
      key: 'patient',
      selected: selectedPatient,
      defaultTitle: 'Patient',
      subtitle: selectedPatient ? selectedPatient.desc : '8 citizens',
      meta: selectedPatient ? selectedPatient.ic : 'Select patient →',
      icon: User,
      onClick: () => setActiveModal('patient'),
      hasChevron: true,
    },
    {
      key: 'central_admin',
      selected: icNumber.trim() === CENTRAL_ADMIN_ACCOUNT.ic ? CENTRAL_ADMIN_ACCOUNT : undefined,
      defaultTitle: 'Central Admin',
      subtitle: 'National Hub',
      meta: CENTRAL_ADMIN_ACCOUNT.ic,
      icon: CENTRAL_ADMIN_ACCOUNT.icon,
      onClick: () => fillDemo(CENTRAL_ADMIN_ACCOUNT),
      hasChevron: false,
    },
  ]

  const currentModalConfig = activeModal ? MODAL_CONFIG[activeModal] : null

  return (
    <div className="space-y-4">
      {/* Main Authentication Card */}
      <Card className="border border-slate-200 shadow-lg overflow-hidden bg-white">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600" />
        <div className="p-5 xl:p-7">
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-11 h-11 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t.login}</h1>
              <p className="text-slate-600 text-xs mt-0.5">
                Authenticate with MyKad IC or assigned administrative ID
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ic" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                MyKad IC Number / Staff ID
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="ic"
                  autoComplete="username"
                  placeholder="880101-14-5678"
                  value={icNumber}
                  onChange={(e) => {
                    setIcNumber(e.target.value)
                    setSelectedRole('')
                  }}
                  className="pl-9 pr-3 h-11 font-mono tabular-nums text-[13px] bg-white border-slate-300 rounded-xl"
                  disabled={isLoading || chipScanning}
                />
              </div>
              {selectedRole && (
                <p className="text-xs text-blue-700 font-medium flex items-center justify-between">
                  <span>
                    Target role: <strong className="capitalize">{selectedRole.replace('_', ' ')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('')}
                    className="underline text-slate-600 hover:text-slate-900"
                  >
                    Choose dynamically
                  </button>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-3 h-11 text-[13px] bg-white border-slate-300 rounded-xl"
                  disabled={isLoading || chipScanning}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="submit"
                className="h-11 font-bold"
                disabled={isLoading || chipScanning}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <span>{t.login}</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleIcScan}
                disabled={isLoading || chipScanning}
                className="h-11 font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                {chipScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reading Chip…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4 text-emerald-700" />
                    <span>{t.scanIcCard}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Demo Quick Access Selector */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Quick Demo Role Accounts
            </h2>
            <p className="text-[11px] text-slate-600">
              Select a role profile to prefill verified test credentials
            </p>
          </div>
          <Badge variant="info" className="text-[11px]">4 Roles</Badge>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2.5">
            {quickAccessCards.map((card) => {
              const Icon = card.icon
              const isSelected = Boolean(card.selected)
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-colors flex items-start gap-2.5',
                    isSelected
                      ? 'bg-blue-50 border-blue-400 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0 text-white',
                      isSelected ? 'bg-blue-600' : 'bg-slate-700'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {isSelected ? card.selected!.label : card.defaultTitle}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate">{card.subtitle}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate tabular-nums">
                      {card.meta}
                    </p>
                  </div>
                  {card.hasChevron && (
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Picker Modal */}
      <ModalDialog
        open={Boolean(currentModalConfig)}
        onClose={() => setActiveModal(null)}
        title={currentModalConfig?.title || ''}
        description={currentModalConfig?.subtitle}
        icon={
          currentModalConfig ? (
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <currentModalConfig.icon className="w-5 h-5" />
            </div>
          ) : undefined
        }
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-2">
          {currentModalConfig?.accounts.map((account) => {
            const AccountIcon = account.icon
            const isPicked =
              normalizedInputIc === account.ic && (!selectedRole || selectedRole === account.role)
            return (
              <button
                key={`${account.role}-${account.ic}`}
                type="button"
                onClick={() => fillDemo(account)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-colors flex items-center gap-3',
                  isPicked
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: account.color }}
                >
                  <AccountIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{account.label}</p>
                  <p className="text-xs text-slate-600 truncate">{account.hospital || account.desc}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                    {account.city && (
                      <>
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{account.city}</span>
                        <span>•</span>
                      </>
                    )}
                    <span className="font-mono tabular-nums">{account.ic}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )
          })}
        </div>
      </ModalDialog>

      {/* Password-Verified Multi-Role Selection Modal */}
      <ModalDialog
        open={showRoleSelection && Boolean(pendingLogin)}
        onClose={() => setShowRoleSelection(false)}
        title="Credentials Verified — Choose Session Role"
        description={
          pendingLogin
            ? `Multiple authorized roles are linked to MyKad ${pendingLogin.ic}`
            : undefined
        }
        icon={
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
            <CreditCard className="w-5 h-5" />
          </div>
        }
        maxWidthClassName="max-w-lg"
      >
        {pendingLogin && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {pendingLogin.roles.map((roleKey) => {
                const cfg = ROLE_CARD_META[roleKey]
                const RoleIcon = cfg.icon
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleRoleSelect(roleKey)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                      cfg.borderClass,
                      cfg.bgClass
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 mb-3 rounded-xl flex items-center justify-center',
                        cfg.iconWrapClass
                      )}
                    >
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{cfg.title}</h4>
                    <p className="text-xs text-slate-600 leading-snug">{cfg.subtitle}</p>
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-slate-500">
              You can switch roles anytime inside your active session without re-entering your password.
            </p>
          </div>
        )}
      </ModalDialog>
    </div>
  )
}
