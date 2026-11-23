import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore, type User as AuthUser, type UserRole } from '@/store/auth'
import { authApi } from '@/lib/api'
import { formatIC, getRoleHomePath } from '@/lib/utils'
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
  AlertTriangle,
  Sparkles,
  Fingerprint,
  X,
  MapPin,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DemoAccount {
  label: string
  hospital?: string
  city?: string
  desc: string
  ic: string
  password: string
  role: UserRole
  icon: LucideIcon
  bgGradient: string
  glowColor: string
  color: string
}

const DOCTOR_ACCOUNTS: DemoAccount[] = [
  { label: 'Dr. Lim Wei Ming', hospital: 'KL General Hospital', city: 'Kuala Lumpur', desc: 'Internal Medicine (Dual-Role)', ic: '750101-14-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-blue-500 via-blue-600 to-indigo-600', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
  { label: 'Dr. Tan Mei Ling', hospital: 'Penang Medical Centre', city: 'Georgetown', desc: 'Neurology (Dual-Role)', ic: '760612-07-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-emerald-500 via-teal-600 to-green-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
  { label: 'Dr. Siti Aishah', hospital: 'Johor Specialist Hospital', city: 'Johor Bahru', desc: 'Oncology (Dual-Role)', ic: '770808-01-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-amber-500 via-orange-500 to-yellow-600', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
  { label: 'Dr. James Wong', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Nephrology (Dual-Role)', ic: '790303-13-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-violet-500 via-purple-600 to-indigo-600', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
  { label: 'Dr. Maria Gonzales', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Pulmonology (Dual-Role)', ic: '810707-12-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-red-500 via-rose-500 to-pink-600', glowColor: 'shadow-red-500/25', color: '#EF4444' },
]

const HOSPITAL_ADMIN_ACCOUNTS: DemoAccount[] = [
  { label: 'KL General Admin', hospital: 'KL General Hospital', city: 'Kuala Lumpur', desc: 'Hospital Administrator', ic: 'admin-kl', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-blue-600 via-indigo-600 to-violet-600', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
  { label: 'Penang MC Admin', hospital: 'Penang Medical Centre', city: 'Georgetown', desc: 'Hospital Administrator', ic: 'admin-penang', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-emerald-500 via-teal-600 to-green-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
  { label: 'Johor Specialist Admin', hospital: 'Johor Specialist Hospital', city: 'Johor Bahru', desc: 'Hospital Administrator', ic: 'admin-jb', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-amber-500 via-orange-500 to-yellow-600', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
  { label: 'Sarawak General Admin', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Hospital Administrator', ic: 'admin-kuching', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-violet-500 via-purple-600 to-indigo-600', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
  { label: 'Queen Elizabeth Admin', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Hospital Administrator', ic: 'admin-kk', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-red-500 via-rose-500 to-pink-600', glowColor: 'shadow-red-500/25', color: '#EF4444' },
]

const PATIENT_ACCOUNTS: DemoAccount[] = [
  { label: 'Ahmad bin Abdullah', city: 'Kuala Lumpur', desc: 'Hypertension, Diabetes', ic: '880101-14-5678', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-emerald-500 via-teal-600 to-cyan-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
  { label: 'Siti Nurhaliza binti Mohd', city: 'George Town', desc: 'Asthma', ic: '950320-10-1234', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-pink-500 via-rose-500 to-red-500', glowColor: 'shadow-pink-500/25', color: '#EC4899' },
  { label: 'Tan Ah Kow', city: 'Johor Bahru', desc: 'Coronary Disease, CKD', ic: '550715-07-9999', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-amber-500 via-orange-500 to-red-500', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
  { label: 'Raj Kumar a/l Muthu', city: 'Kuching', desc: 'Epilepsy', ic: '900808-01-5555', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-violet-500 via-purple-500 to-fuchsia-500', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
  { label: 'Aishah binti Mohd Yusof', city: 'Kota Kinabalu', desc: 'Asthma', ic: '820425-12-7777', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-blue-500 via-indigo-500 to-violet-500', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
  { label: 'Lee Mei Fong', city: 'Kuala Lumpur', desc: 'Rheumatoid Arthritis', ic: '780312-14-2345', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-cyan-500 via-teal-500 to-emerald-500', glowColor: 'shadow-cyan-500/25', color: '#06B6D4' },
  { label: 'Lim Wei Ming (Patient View)', city: 'Kuala Lumpur', desc: 'Hyperlipidemia - Also a Doctor', ic: '750101-14-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
  { label: 'Tan Mei Ling (Patient View)', city: 'George Town', desc: 'Migraine - Also a Doctor', ic: '760612-07-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
]

const CENTRAL_ADMIN_ACCOUNT: DemoAccount = {
  label: 'Central Admin',
  desc: 'National Network',
  ic: 'central-admin',
  password: 'central123',
  role: 'central_admin',
  icon: Network,
  bgGradient: 'from-cyan-500 via-blue-500 to-indigo-600',
  glowColor: 'shadow-cyan-500/25',
  color: '#06B6D4',
}

const ALL_DEMO_ACCOUNTS: DemoAccount[] = [
  ...DOCTOR_ACCOUNTS,
  ...HOSPITAL_ADMIN_ACCOUNTS,
  ...PATIENT_ACCOUNTS,
  CENTRAL_ADMIN_ACCOUNT,
]

const CHIP_PHASES = ['detecting', 'reading', 'success'] as const
type ModalKind = 'doctor' | 'hospital_admin' | 'patient' | null

const MODAL_CONFIG: Record<Exclude<ModalKind, null>, {
  title: string
  subtitle: string
  headerGradient: string
  icon: LucideIcon
  accounts: DemoAccount[]
  showIcInMeta?: boolean
}> = {
  doctor: {
    title: 'Select Doctor',
    subtitle: 'Choose from 5 hospitals',
    headerGradient: 'from-blue-500 via-cyan-500 to-emerald-500',
    icon: Stethoscope,
    accounts: DOCTOR_ACCOUNTS,
  },
  hospital_admin: {
    title: 'Select Hospital Admin',
    subtitle: 'Choose from 5 hospitals',
    headerGradient: 'from-indigo-500 via-purple-500 to-pink-500',
    icon: Building2,
    accounts: HOSPITAL_ADMIN_ACCOUNTS,
  },
  patient: {
    title: 'Select Patient',
    subtitle: 'Choose from 8 patients',
    headerGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    icon: User,
    accounts: PATIENT_ACCOUNTS,
    showIcInMeta: true,
  },
}

const ROLE_CARD_META: Record<UserRole, {
  title: string
  subtitle: string
  icon: LucideIcon
  borderClass: string
  bgClass: string
  iconWrapClass: string
}> = {
  doctor: {
    title: 'Doctor',
    subtitle: 'Access federated clinical records & author consultations',
    icon: Stethoscope,
    borderClass: 'border-blue-200 hover:border-blue-400',
    bgClass: 'from-blue-50 to-cyan-50',
    iconWrapClass: 'bg-blue-100 text-blue-600',
  },
  patient: {
    title: 'Patient',
    subtitle: 'View personal medical history & manage hospital privacy',
    icon: User,
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    bgClass: 'from-emerald-50 to-teal-50',
    iconWrapClass: 'bg-emerald-100 text-emerald-600',
  },
  hospital_admin: {
    title: 'Hospital Admin',
    subtitle: 'Manage hospital operations & view hospital audit logs',
    icon: Building2,
    borderClass: 'border-indigo-200 hover:border-indigo-400',
    bgClass: 'from-indigo-50 to-purple-50',
    iconWrapClass: 'bg-indigo-100 text-indigo-600',
  },
  central_admin: {
    title: 'Central Admin',
    subtitle: 'Oversee national index & federated audit governance',
    icon: Network,
    borderClass: 'border-cyan-200 hover:border-cyan-400',
    bgClass: 'from-cyan-50 to-blue-50',
    iconWrapClass: 'bg-cyan-100 text-cyan-600',
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [showChipAnimation, setShowChipAnimation] = useState(false)
  const [chipScanPhase, setChipScanPhase] = useState<(typeof CHIP_PHASES)[number]>('detecting')
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
              title: 'Welcome!',
              description:
                targetPath === '/verify'
                  ? 'Proceeding to hospital verification...'
                  : 'Platform authentication successful',
            }
          )
          navigate(targetPath)
          return true
        }
      }

      toast({
        title: 'Login Failed',
        description: response.error || 'Invalid credentials',
        variant: 'destructive',
      })
      return false
    } catch {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
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
        title: 'Error',
        description: 'Please enter both IC number and password',
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
      title: role === 'doctor' || role === 'hospital_admin' ? 'Identity Verified' : 'Welcome!',
      description:
        role === 'doctor' || role === 'hospital_admin'
          ? 'Proceeding to hospital verification...'
          : `Logged in as ${role.replace('_', ' ')}`,
    })
  }

  const runChipScanAnimation = async (successHoldMs: number) => {
    setShowChipAnimation(true)
    setChipScanPhase('detecting')
    await new Promise((resolve) => setTimeout(resolve, 700))
    setChipScanPhase('reading')
    await new Promise((resolve) => setTimeout(resolve, 900))
    setChipScanPhase('success')
    await new Promise((resolve) => setTimeout(resolve, successHoldMs))
  }

  const handleIcScan = async () => {
    const selectedDemo =
      ALL_DEMO_ACCOUNTS.find((d) => d.ic === normalizedInputIc && (!selectedRole || d.role === selectedRole)) ||
      ALL_DEMO_ACCOUNTS.find((d) => d.ic === icNumber.trim() || d.ic === normalizedInputIc)

    if (!selectedDemo && (!icNumber.trim() || !password)) {
      toast({
        title: 'No IC Card Selected',
        description: 'Please select a Quick Access card below or enter credentials first',
        variant: 'destructive',
      })
      return
    }

    await runChipScanAnimation(500)
    setShowChipAnimation(false)

    const loginIc = selectedDemo ? selectedDemo.ic : icNumber
    const loginPwd = selectedDemo ? selectedDemo.password : password
    const roleHint = selectedRole || undefined

    await executeLogin(loginIc, loginPwd, roleHint)
  }

  const quickAccessCards = [
    {
      key: 'doctor',
      selected: selectedDoctor,
      defaultTitle: 'Doctor',
      subtitle: selectedDoctor ? selectedDoctor.hospital : '5 hospitals available',
      meta: selectedDoctor ? selectedDoctor.ic : 'Click to select →',
      icon: Stethoscope,
      defaultIconBg: 'from-blue-500 via-cyan-500 to-emerald-500',
      inactiveHover: 'hover:from-gray-100 hover:to-gray-100 border-gray-200',
      onClick: () => setActiveModal('doctor'),
      hasChevron: true,
    },
    {
      key: 'hospital_admin',
      selected: selectedHospitalAdmin,
      defaultTitle: 'Hospital Admin',
      subtitle: selectedHospitalAdmin ? selectedHospitalAdmin.hospital : '5 hospitals available',
      meta: selectedHospitalAdmin ? selectedHospitalAdmin.ic : 'Click to select →',
      icon: Building2,
      defaultIconBg: 'from-indigo-500 via-purple-500 to-pink-500',
      inactiveHover: 'hover:from-gray-100 hover:to-gray-100 border-gray-200',
      onClick: () => setActiveModal('hospital_admin'),
      hasChevron: true,
    },
    {
      key: 'patient',
      selected: selectedPatient,
      defaultTitle: 'Patient',
      subtitle: selectedPatient ? selectedPatient.desc : '8 patients available',
      meta: selectedPatient ? selectedPatient.ic : 'Click to select →',
      icon: User,
      defaultIconBg: 'from-emerald-500 via-teal-500 to-cyan-500',
      inactiveHover: 'hover:from-emerald-50 hover:to-teal-50 border-gray-200 hover:border-emerald-200',
      onClick: () => setActiveModal('patient'),
      hasChevron: true,
    },
    {
      key: 'central_admin',
      selected: icNumber.trim() === CENTRAL_ADMIN_ACCOUNT.ic ? CENTRAL_ADMIN_ACCOUNT : undefined,
      defaultTitle: CENTRAL_ADMIN_ACCOUNT.label,
      subtitle: CENTRAL_ADMIN_ACCOUNT.desc,
      meta: CENTRAL_ADMIN_ACCOUNT.ic,
      icon: CENTRAL_ADMIN_ACCOUNT.icon,
      defaultIconBg: CENTRAL_ADMIN_ACCOUNT.bgGradient,
      inactiveHover: 'hover:from-gray-100 hover:to-gray-100 border-gray-200',
      onClick: () => fillDemo(CENTRAL_ADMIN_ACCOUNT),
      hasChevron: false,
    },
  ]

  const currentModalConfig = activeModal ? MODAL_CONFIG[activeModal] : null

  return (
    <>
      <AnimatePresence>
        {showChipAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center"
          >
            <div className="relative flex flex-col items-center">
              <motion.div
                className="relative w-80 h-48 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-2xl shadow-blue-500/30 overflow-hidden"
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
              >
                <div className="absolute top-4 right-4 text-white/60 text-xs font-mono">MYKAD</div>
                <div className="absolute top-6 left-6 w-14 h-11 rounded-md bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg" />
                <div className="absolute bottom-5 left-6 right-6 text-white/80 font-mono text-sm">
                  {formatIC(icNumber) || 'MYKAD CHIP AUTH'}
                </div>
              </motion.div>

              <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {chipScanPhase === 'detecting' && 'Detecting IC Card...'}
                  {chipScanPhase === 'reading' && 'Reading Chip Data...'}
                  {chipScanPhase === 'success' && 'IC Card Verified!'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {chipScanPhase === 'detecting' && 'Place your MyKad on the smart reader'}
                  {chipScanPhase === 'reading' && 'Validating National Medical Identity'}
                  {chipScanPhase === 'success' && 'Proceeding to authentication...'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative border border-slate-200/80 shadow-2xl shadow-gray-200/50 overflow-hidden bg-white/95">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />
          <div className="relative p-8 pt-9">
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-500 mt-1.5 text-sm">
                Sign in to access the National Medical Identity Network
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ic" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-blue-500" />
                  IC Number / Username
                </Label>
                <div className="relative">
                  <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${focusedField === 'ic' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Input
                    id="ic"
                    placeholder="XXXXXX-XX-XXXX"
                    value={icNumber}
                    onChange={(e) => {
                      setIcNumber(e.target.value)
                      setSelectedRole('')
                    }}
                    onFocus={() => setFocusedField('ic')}
                    onBlur={() => setFocusedField(null)}
                    className="pl-12 h-12 text-base bg-white border-gray-200 rounded-xl"
                    disabled={isLoading}
                  />
                </div>
                {selectedRole && (
                  <p className="text-xs text-blue-600 font-medium">
                    Target role: <span className="capitalize">{selectedRole.replace('_', ' ')}</span>{' '}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('')}
                      className="underline text-gray-500 ml-1"
                    >
                      (clear to choose dynamically)
                    </button>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Password
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="pl-12 h-12 text-base bg-white border-gray-200 rounded-xl"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 py-3.5 text-base font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="relative flex items-center gap-4 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase font-semibold">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <Button
                type="button"
                onClick={handleIcScan}
                className="w-full h-16 text-base font-semibold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl border-0"
                disabled={isLoading}
              >
                <div className="flex items-center justify-between w-full px-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-white" />
                    <div className="text-left">
                      <span className="block font-bold text-sm">Scan MyKad IC</span>
                      <span className="block text-xs text-white/80">Tap to authenticate with smart card</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white" />
                </div>
              </Button>
            </form>
          </div>
        </Card>

        {/* Demo Quick Access */}
        <Card className="border border-slate-200/80 shadow-xl shadow-gray-200/40 overflow-hidden bg-white/95">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                Demo
              </Badge>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Quick Access Credentials</h2>
                <p className="text-xs text-gray-500">Select any role to auto-fill demo account</p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-3.5">
              {quickAccessCards.map((card) => {
                const Icon = card.icon
                const isSelected = Boolean(card.selected)
                return (
                  <div
                    key={card.key}
                    onClick={card.onClick}
                    className={`relative p-3.5 rounded-2xl cursor-pointer transition-all overflow-hidden ${
                      isSelected
                        ? `bg-gradient-to-br ${card.selected!.bgGradient} text-white shadow-lg ${card.selected!.glowColor}`
                        : `bg-gradient-to-br from-gray-50 to-gray-100 border ${card.inactiveHover}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : `bg-gradient-to-br ${card.defaultIconBg}`} shadow`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {isSelected ? card.selected!.label : card.defaultTitle}
                        </p>
                        <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {card.subtitle}
                        </p>
                        <p className={`text-[11px] font-mono mt-1 truncate ${isSelected ? 'text-white/75' : 'text-gray-400'}`}>
                          {card.meta}
                        </p>
                      </div>
                      {card.hasChevron && (
                        <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/70' : 'text-gray-400'}`} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Modal */}
        <AnimatePresence>
          {currentModalConfig && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`relative p-6 bg-gradient-to-r ${currentModalConfig.headerGradient} text-white`}>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <currentModalConfig.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{currentModalConfig.title}</h3>
                      <p className="text-sm text-white/80">{currentModalConfig.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 max-h-[400px] overflow-y-auto space-y-2.5">
                  {currentModalConfig.accounts.map((account) => {
                    const AccountIcon = account.icon
                    const isPicked = normalizedInputIc === account.ic && (!selectedRole || selectedRole === account.role)
                    return (
                      <div
                        key={`${account.role}-${account.ic}`}
                        onClick={() => fillDemo(account)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border-2 ${
                          isPicked ? 'shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        style={{
                          borderColor: isPicked ? account.color : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: account.color }}
                          >
                            <AccountIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{account.label}</p>
                            <p className="text-xs text-gray-600 truncate">{account.hospital || account.desc}</p>
                            {account.city && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{account.city}</span>
                                <span>•</span>
                                <span className="font-mono text-gray-400">{account.ic}</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emergency Break-Glass Card */}
        <Link to="/emergency" className="block">
          <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 hover:border-red-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-md">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-900">Emergency Break-Glass Access</p>
                  <p className="text-xs text-red-700/80">
                    Retrieve critical allergies, blood type & active medications in life-threatening emergencies
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Password-Verified Multi-Role Selection Modal */}
      <AnimatePresence>
        {showRoleSelection && pendingLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRoleSelection(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative p-7 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-center">
                <button
                  type="button"
                  onClick={() => setShowRoleSelection(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                  aria-label="Close role dialog"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Credentials Verified</h3>
                <p className="text-white/85 text-sm mt-1">Multiple authorized roles found for this MyKad IC</p>
                <p className="text-xs text-white/70 mt-1.5 font-mono">{pendingLogin.ic}</p>
              </div>

              <div className="p-7">
                <p className="text-center text-gray-600 text-sm mb-5">Select which portal to enter:</p>
                <div className="grid grid-cols-2 gap-4">
                  {pendingLogin.roles.map((roleKey) => {
                    const cfg = ROLE_CARD_META[roleKey]
                    const RoleIcon = cfg.icon
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => handleRoleSelect(roleKey)}
                        className={`p-5 rounded-2xl border-2 ${cfg.borderClass} bg-gradient-to-br ${cfg.bgClass} transition-all hover:shadow-lg text-center`}
                      >
                        <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl ${cfg.iconWrapClass} flex items-center justify-center`}>
                          <RoleIcon className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">{cfg.title}</h4>
                        <p className="text-xs text-gray-500 leading-snug">{cfg.subtitle}</p>
                      </button>
                    )
                  })}
                </div>
                <p className="text-center text-xs text-gray-400 mt-5">
                  You can also switch roles anytime inside your active session without signing out
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
