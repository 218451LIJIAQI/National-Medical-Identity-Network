import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore, type UserRole } from '@/store/auth'
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
  { label: 'Lim Wei Ming (Patient View)', city: 'Kuala Lumpur', desc: 'Hyperlipidemia - Dual-Role Account', ic: '750101-14-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
  { label: 'Tan Mei Ling (Patient View)', city: 'George Town', desc: 'Migraine - Dual-Role Account', ic: '760612-07-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
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

const ROLE_CARD_META: Record<UserRole, {
  title: string
  description: string
  icon: LucideIcon
  borderClass: string
  bgClass: string
  iconBgClass: string
  iconTextClass: string
}> = {
  doctor: {
    title: 'Doctor',
    description: 'Access clinical workstation & federated patient timeline',
    icon: Stethoscope,
    borderClass: 'border-blue-200 hover:border-blue-400',
    bgClass: 'from-blue-50 to-cyan-50 hover:shadow-blue-500/20',
    iconBgClass: 'bg-blue-100',
    iconTextClass: 'text-blue-600',
  },
  patient: {
    title: 'Patient',
    description: 'View your personal health records, privacy & access logs',
    icon: User,
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    bgClass: 'from-emerald-50 to-teal-50 hover:shadow-emerald-500/20',
    iconBgClass: 'bg-emerald-100',
    iconTextClass: 'text-emerald-600',
  },
  hospital_admin: {
    title: 'Hospital Admin',
    description: 'Manage hospital staff, beds, inventory & local audit logs',
    icon: Building2,
    borderClass: 'border-indigo-200 hover:border-indigo-400',
    bgClass: 'from-indigo-50 to-purple-50 hover:shadow-indigo-500/20',
    iconBgClass: 'bg-indigo-100',
    iconTextClass: 'text-indigo-600',
  },
  central_admin: {
    title: 'Central Admin',
    description: 'Monitor national patient index, nodes & break-glass audits',
    icon: Network,
    borderClass: 'border-cyan-200 hover:border-cyan-400',
    bgClass: 'from-cyan-50 to-sky-50 hover:shadow-cyan-500/20',
    iconBgClass: 'bg-cyan-100',
    iconTextClass: 'text-cyan-600',
  },
}

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
    subtitle: 'Choose from 5 connected hospitals',
    headerGradient: 'from-blue-500 via-cyan-500 to-emerald-500',
    icon: Stethoscope,
    accounts: DOCTOR_ACCOUNTS,
  },
  hospital_admin: {
    title: 'Select Hospital Admin',
    subtitle: 'Choose from 5 connected hospitals',
    headerGradient: 'from-indigo-500 via-purple-500 to-pink-500',
    icon: Building2,
    accounts: HOSPITAL_ADMIN_ACCOUNTS,
  },
  patient: {
    title: 'Select Patient',
    subtitle: 'Choose from 8 demo patient profiles',
    headerGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    icon: User,
    accounts: PATIENT_ACCOUNTS,
    showIcInMeta: true,
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ModalKind>(null)
  const [showChipAnimation, setShowChipAnimation] = useState(false)
  const [chipScanPhase, setChipScanPhase] = useState<(typeof CHIP_PHASES)[number]>('detecting')
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [pendingLogin, setPendingLogin] = useState<{ ic: string; password: string; roles: UserRole[] } | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const normalizedInputIc = formatIC(icNumber)

  const selectedDoctor = DOCTOR_ACCOUNTS.find(
    (d) => d.ic === normalizedInputIc && (selectedRole === 'doctor' || (!selectedRole && !PATIENT_ACCOUNTS.some((p) => p.ic === normalizedInputIc)))
  )
  const selectedHospitalAdmin = HOSPITAL_ADMIN_ACCOUNTS.find((a) => a.ic === icNumber.trim())
  const selectedPatient = PATIENT_ACCOUNTS.find(
    (p) => p.ic === normalizedInputIc && (selectedRole === 'patient' || (!selectedRole && !DOCTOR_ACCOUNTS.some((d) => d.ic === normalizedInputIc)))
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
    role?: UserRole,
    customWelcome?: { title: string; description: string }
  ) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(ic.trim(), pwd, role)

      if (response.success && response.data?.requiresRoleSelection && response.data.availableRoles?.length) {
        setPendingLogin({
          ic: response.data.icNumber || formatIC(ic),
          password: pwd,
          roles: response.data.availableRoles,
        })
        setShowRoleSelection(true)
        return true
      }

      if (response.success && response.data?.token && response.data?.user) {
        const authUser = response.data.user
        login(response.data.token, authUser)

        const targetPath = getRoleHomePath(authUser.role, false)
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
      if (mountedRef.current) {
        setIsLoading(false)
      }
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
      title: role === 'doctor' || role === 'hospital_admin' ? 'Access Granted' : 'Welcome!',
      description:
        role === 'doctor' || role === 'hospital_admin'
          ? 'Proceeding to hospital verification...'
          : `Logged in as ${ROLE_CARD_META[role].title}`,
    })
  }

  const runChipScanAnimation = async (successHoldMs: number) => {
    setShowChipAnimation(true)
    setChipScanPhase('detecting')
    await new Promise((resolve) => setTimeout(resolve, 900))
    if (!mountedRef.current) return
    setChipScanPhase('reading')
    await new Promise((resolve) => setTimeout(resolve, 1100))
    if (!mountedRef.current) return
    setChipScanPhase('success')
    await new Promise((resolve) => setTimeout(resolve, successHoldMs))
  }

  const handleIcScan = async () => {
    const selectedDemo =
      ALL_DEMO_ACCOUNTS.find((d) => (d.ic === normalizedInputIc || d.ic === icNumber.trim()) && (!selectedRole || d.role === selectedRole)) ||
      ALL_DEMO_ACCOUNTS.find((d) => d.ic === normalizedInputIc || d.ic === icNumber.trim())

    if (!selectedDemo && (!icNumber.trim() || !password)) {
      toast({
        title: 'No IC Card Selected',
        description: 'Please select a demo account below or enter credentials first, then scan the IC card',
        variant: 'destructive',
      })
      return
    }

    const loginIc = selectedDemo ? selectedDemo.ic : icNumber.trim()
    const loginPassword = password || selectedDemo?.password || ''
    // When scanning an IC without an explicit role pre-selection, let the server detect multi-role accounts
    const loginRole = selectedRole || undefined

    await runChipScanAnimation(600)
    if (!mountedRef.current) return
    setShowChipAnimation(false)

    await executeLogin(
      loginIc,
      loginPassword,
      loginRole,
      selectedDemo && selectedDemo.role !== 'doctor' && selectedDemo.role !== 'hospital_admin'
        ? { title: 'Access Granted', description: `Welcome, ${selectedDemo.label}!` }
        : undefined
    )
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
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                  backgroundSize: '50px 50px',
                }}
              />
            </div>

            <motion.div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              initial={{ top: '0%' }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            <div className="relative flex flex-col items-center">
              <motion.div
                className="relative w-80 h-48 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-2xl shadow-blue-500/30 overflow-hidden"
                initial={{ scale: 0.8, rotateY: -30 }}
                animate={{
                  scale: 1,
                  rotateY: chipScanPhase === 'reading' ? [0, 5, -5, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-4 w-16 h-12 rounded bg-gradient-to-br from-amber-300 to-yellow-500" />
                  <div className="absolute top-4 right-4 text-white/50 text-xs font-mono">MYKAD</div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="h-2 bg-white/20 rounded mb-2" />
                    <div className="h-2 bg-white/20 rounded w-2/3" />
                  </div>
                </div>

                <motion.div
                  className="absolute top-6 left-6 w-14 h-11 rounded-md bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg"
                  animate={
                    chipScanPhase === 'reading'
                      ? { boxShadow: ['0 0 20px rgba(251,191,36,0.5)', '0 0 40px rgba(251,191,36,0.8)', '0 0 20px rgba(251,191,36,0.5)'] }
                      : chipScanPhase === 'success'
                        ? { boxShadow: '0 0 30px rgba(34,197,94,0.8)', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }
                        : {}
                  }
                  transition={{ duration: 0.5, repeat: chipScanPhase === 'reading' ? Infinity : 0 }}
                >
                  <div className="absolute inset-1 grid grid-cols-3 gap-px opacity-60">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-amber-700/50 rounded-sm" />
                    ))}
                  </div>
                </motion.div>

                {chipScanPhase === 'reading' && (
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                {chipScanPhase === 'success' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/50"
                    >
                      <motion.svg
                        viewBox="0 0 24 24"
                        className="w-10 h-10 text-white"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                      </motion.svg>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                className="mt-10 text-center"
                key={chipScanPhase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {chipScanPhase === 'detecting' && 'Detecting IC Card...'}
                  {chipScanPhase === 'reading' && 'Reading Chip Data...'}
                  {chipScanPhase === 'success' && 'IC Card Verified!'}
                </h2>
                <p className="text-gray-400">
                  {chipScanPhase === 'detecting' && 'Please place your IC card on the reader'}
                  {chipScanPhase === 'reading' && 'Extracting identity information'}
                  {chipScanPhase === 'success' && 'Proceeding to authentication...'}
                </p>
              </motion.div>

              <div className="flex gap-3 mt-8">
                {CHIP_PHASES.map((phase, i) => (
                  <motion.div
                    key={phase}
                    className={`w-3 h-3 rounded-full ${
                      chipScanPhase === phase
                        ? 'bg-cyan-400'
                        : i < CHIP_PHASES.indexOf(chipScanPhase)
                          ? 'bg-green-500'
                          : 'bg-gray-600'
                    }`}
                    animate={chipScanPhase === phase ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="relative border-0 shadow-2xl shadow-gray-200/50 overflow-hidden backdrop-blur-sm bg-white/95">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 via-emerald-500 to-blue-500 opacity-100" style={{ padding: '2px' }}>
              <div className="absolute inset-[2px] bg-white rounded-[inherit]" />
            </div>
            <motion.div
              className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 via-emerald-500 via-violet-500 to-blue-500"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            <div className="relative p-8 pt-10">
              <div className="text-center mb-8">
                <motion.div
                  className="relative w-20 h-20 mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl shadow-xl shadow-blue-500/30"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    animate={{
                      boxShadow: [
                        '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                        '0 10px 40px -10px rgba(6, 182, 212, 0.5)',
                        '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-white drop-shadow-lg" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    Welcome Back
                  </h1>
                  <p className="text-gray-500 mt-2 text-base">Sign in to access the National Medical Network</p>
                </motion.div>
              </div>

              {selectedRole && (
                <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
                  <span>
                    Target Role: <strong className="capitalize">{selectedRole.replace('_', ' ')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('')}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Ask role on login
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label htmlFor="ic" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-blue-500" />
                    IC Number / Username
                  </Label>
                  <div className="relative group">
                    <motion.div
                      className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'ic' ? 'opacity-50' : 'group-hover:opacity-30'}`}
                    />
                    <div className="relative">
                      <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === 'ic' ? 'text-blue-500' : 'text-gray-400'}`} />
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
                        className="pl-12 h-14 text-base bg-white border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    Password
                  </Label>
                  <div className="relative group">
                    <motion.div
                      className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'password' ? 'opacity-50' : 'group-hover:opacity-30'}`}
                    />
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="pl-12 h-14 text-base bg-white border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    className="relative w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 shadow-xl shadow-blue-500/25 rounded-xl overflow-hidden group"
                    disabled={isLoading}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    />
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>

                <motion.div
                  className="relative flex items-center gap-4 py-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                >
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  <span className="text-sm text-gray-400 font-medium px-2">or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="relative group/btn"
                >
                  <motion.div
                    className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl blur-lg"
                    animate={{ opacity: [0.35, 0.6, 0.35] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  <Button
                    type="button"
                    onClick={handleIcScan}
                    className="relative w-full h-[4.5rem] text-base font-semibold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-400 hover:to-cyan-500 shadow-xl shadow-emerald-500/30 rounded-xl overflow-hidden group border-0 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/40"
                    disabled={isLoading}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    />

                    <div className="relative flex items-center justify-center gap-4 px-4">
                      <div className="relative flex items-center justify-center w-14 h-14">
                        <motion.div
                          className="absolute w-10 h-10 rounded-full border-2 border-white/40"
                          animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity }}
                        />
                        <motion.div
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <CreditCard className="h-7 w-7 text-white drop-shadow-md" />
                        </motion.div>
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="text-white font-bold text-[15px]">Scan IC Card</span>
                        <span className="text-xs text-white/80">Tap to scan MyKad chip and login</span>
                      </div>

                      <motion.div
                        className="ml-auto flex items-center gap-1"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowRight className="h-5 w-5 text-white" />
                      </motion.div>
                    </div>
                  </Button>
                </motion.div>
              </form>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden backdrop-blur-sm bg-white/95">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-lg shadow-amber-500/25 px-3 py-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Demo
                  </Badge>
                </motion.div>
                <div>
                  <h2 className="font-bold text-gray-900">Quick Access</h2>
                  <p className="text-sm text-gray-500">Click any role to auto-fill credentials (all 10 doctors also hold patient profiles)</p>
                </div>
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {quickAccessCards.map((card, idx) => {
                  const Icon = card.icon
                  const isSelected = Boolean(card.selected)
                  return (
                    <motion.div
                      key={card.key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={card.onClick}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                        isSelected
                          ? `bg-gradient-to-br ${card.selected!.bgGradient} text-white shadow-xl ${card.selected!.glowColor}`
                          : `bg-gradient-to-br from-gray-50 to-gray-100 border ${card.inactiveHover}`
                      }`}
                    >
                      <div className="relative flex items-start gap-3">
                        <motion.div
                          className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/20' : `bg-gradient-to-br ${card.defaultIconBg}`} shadow-lg`}
                          whileHover={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {isSelected ? card.selected!.label : card.defaultTitle}
                          </p>
                          <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {card.subtitle}
                          </p>
                          <p className={`text-xs font-mono mt-1 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                            {card.meta}
                          </p>
                        </div>
                        {card.hasChevron ? (
                          <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`} />
                        ) : isSelected ? (
                          <div className="w-3 h-3 rounded-full bg-white shadow-lg" />
                        ) : null}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`relative p-6 bg-gradient-to-r ${currentModalConfig.headerGradient} text-white`}>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    title="Close"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <currentModalConfig.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{currentModalConfig.title}</h3>
                      <p className="text-sm text-white/80">{currentModalConfig.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 max-h-[400px] overflow-y-auto">
                  <div className="space-y-3">
                    {currentModalConfig.accounts.map((account, index) => {
                      const AccountIcon = account.icon
                      const isPicked = normalizedInputIc === account.ic && (!selectedRole || selectedRole === account.role)
                      return (
                        <motion.div
                          key={`${account.role}-${account.ic}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => fillDemo(account)}
                          className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                            isPicked
                              ? 'shadow-lg'
                              : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                          style={{
                            background: isPicked ? `linear-gradient(135deg, ${account.color}15, ${account.color}05)` : undefined,
                            borderColor: isPicked ? account.color : undefined,
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shrink-0"
                              style={{ backgroundColor: account.color }}
                            >
                              <AccountIcon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900">{account.label}</p>
                              <p className="text-sm text-gray-600">{account.hospital || account.desc}</p>
                              {account.city && (
                                <div className="flex items-center gap-2 mt-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{account.city}</span>
                                  {currentModalConfig.showIcInMeta ? (
                                    <>
                                      <span className="text-xs text-gray-300">•</span>
                                      <span className="text-xs font-mono text-gray-400">{account.ic}</span>
                                    </>
                                  ) : account.hospital ? (
                                    <>
                                      <span className="text-xs text-gray-300">•</span>
                                      <span className="text-xs text-gray-500">{account.desc}</span>
                                    </>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <ChevronRight
                              className="w-5 h-5 text-gray-300"
                              style={{ color: isPicked ? account.color : undefined }}
                            />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <Link to="/emergency">
            <Card className="relative border-2 border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 hover:border-red-300 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 cursor-pointer overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
                style={{ backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="p-3.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/30"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-red-900 text-lg">Emergency Access</p>
                    <p className="text-sm text-red-700/80">Access critical patient information without login</p>
                  </div>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6 text-red-400" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>

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
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative p-8 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-center">
                <button
                  onClick={() => setShowRoleSelection(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <CreditCard className="w-10 h-10" />
                </motion.div>

                <h3 className="text-2xl font-bold mb-1">Multiple Roles Detected</h3>
                <p className="text-white/80">Choose which portal you want to enter</p>
                <p className="text-sm text-white/60 mt-2 font-mono">{pendingLogin.ic}</p>
              </div>

              <div className="p-8">
                <p className="text-center text-gray-600 mb-6">Select active identity role:</p>

                <div className="grid grid-cols-2 gap-4">
                  {pendingLogin.roles.map((roleOption) => {
                    const meta = ROLE_CARD_META[roleOption]
                    const RoleIcon = meta.icon
                    return (
                      <motion.button
                        key={roleOption}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSelect(roleOption)}
                        className={`relative group p-6 rounded-2xl border-2 ${meta.borderClass} bg-gradient-to-br ${meta.bgClass} transition-all duration-300 hover:shadow-xl`}
                      >
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${meta.iconBgClass} flex items-center justify-center`}>
                          <RoleIcon className={`w-8 h-8 ${meta.iconTextClass}`} />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{meta.title}</h4>
                        <p className="text-sm text-gray-500">{meta.description}</p>
                      </motion.button>
                    )
                  })}
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                  You can also switch roles directly inside the portal header at any time
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
