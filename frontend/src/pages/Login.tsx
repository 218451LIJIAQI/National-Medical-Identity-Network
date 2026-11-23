import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore, type UserRole } from '@/store/auth'
import { authApi, type RoleOptionDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import ChipScanOverlay, { type ScanPhase } from '@/components/ChipScanOverlay'
import {
  Loader2, CreditCard, Lock, User, Stethoscope, Building2, Shield, ArrowLeft, ChevronRight, X,
} from 'lucide-react'

interface DemoAccount {
  label: string
  sublabel: string
  icNumber: string
  password: string
  role: UserRole
  hospitalId?: string
}

const DEMO_GROUPS: Array<{
  id: UserRole
  title: string
  icon: typeof User
  badgeClass: string
  accounts: DemoAccount[]
}> = [
  {
    id: 'patient',
    title: 'Patient MyKad',
    icon: User,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    accounts: [
      { label: 'Ahmad bin Abdullah', sublabel: '5 Connected Hospitals', icNumber: '880101-14-5678', password: 'patient123', role: 'patient' },
      { label: 'Siti Nurhaliza binti Mohd', sublabel: 'Penang, KL & JB Records', icNumber: '950320-10-1234', password: 'patient123', role: 'patient' },
      { label: 'Tan Ah Kow', sublabel: 'Cardiology & Renal Care', icNumber: '550715-07-9999', password: 'patient123', role: 'patient' },
      { label: 'Dr. Lim Wei Ming (Patient View)', sublabel: 'Dual-Role MyKad Holder', icNumber: '750101-14-5001', password: 'doctor123', role: 'patient' },
    ],
  },
  {
    id: 'doctor',
    title: 'Clinician Card',
    icon: Stethoscope,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    accounts: [
      { label: 'Dr. Lim Wei Ming', sublabel: 'Kuala Lumpur General Hospital', icNumber: '750101-14-5001', password: 'doctor123', role: 'doctor', hospitalId: 'hospital-kl' },
      { label: 'Dr. Tan Mei Ling', sublabel: 'Penang Medical Centre', icNumber: '760612-07-5001', password: 'doctor123', role: 'doctor', hospitalId: 'hospital-penang' },
      { label: 'Dr. Siti Aishah', sublabel: 'Johor Specialist Hospital', icNumber: '770808-01-5001', password: 'doctor123', role: 'doctor', hospitalId: 'hospital-jb' },
      { label: 'Dr. James Wong', sublabel: 'Sarawak General Hospital', icNumber: '790303-13-5001', password: 'doctor123', role: 'doctor', hospitalId: 'hospital-kuching' },
      { label: 'Dr. Maria Gonzales', sublabel: 'Queen Elizabeth Hospital', icNumber: '810707-12-5001', password: 'doctor123', role: 'doctor', hospitalId: 'hospital-kk' },
    ],
  },
  {
    id: 'hospital_admin',
    title: 'Hospital Admin',
    icon: Building2,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    accounts: [
      { label: 'KL General Admin', sublabel: 'Kuala Lumpur General Hospital', icNumber: 'admin-kl', password: 'admin123', role: 'hospital_admin', hospitalId: 'hospital-kl' },
      { label: 'Penang MC Admin', sublabel: 'Penang Medical Centre', icNumber: 'admin-penang', password: 'admin123', role: 'hospital_admin', hospitalId: 'hospital-penang' },
      { label: 'Johor Specialist Admin', sublabel: 'Johor Specialist Hospital', icNumber: 'admin-jb', password: 'admin123', role: 'hospital_admin', hospitalId: 'hospital-jb' },
      { label: 'Sarawak General Admin', sublabel: 'Sarawak General Hospital', icNumber: 'admin-kuching', password: 'admin123', role: 'hospital_admin', hospitalId: 'hospital-kuching' },
      { label: 'Queen Elizabeth Admin', sublabel: 'Queen Elizabeth Hospital', icNumber: 'admin-kk', password: 'admin123', role: 'hospital_admin', hospitalId: 'hospital-kk' },
    ],
  },
  {
    id: 'central_admin',
    title: 'MOH Central',
    icon: Shield,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    accounts: [
      { label: 'MOH National Hub Admin', sublabel: 'Ministry of Health Putrajaya', icNumber: 'central-admin', password: 'central123', role: 'central_admin' },
    ],
  },
]

function resolvePostLoginRoute(role: UserRole): string {
  switch (role) {
    case 'doctor':
    case 'hospital_admin':
      return '/verify'
    case 'patient':
      return '/patient'
    case 'central_admin':
      return '/admin/central'
    default:
      return '/'
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const login = useAuthStore((s) => s.login)

  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<UserRole | null>(null)
  const [roleOptions, setRoleOptions] = useState<RoleOptionDto[] | null>(null)
  const [scanState, setScanState] = useState<{
    open: boolean
    phase: ScanPhase
    holderName?: string
    ic?: string
  }>({ open: false, phase: 'idle' })

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  const executeLogin = async (targetIc: string, targetPassword: string, preferredRole?: UserRole) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(targetIc.trim(), targetPassword, preferredRole)
      if (!response.success || !response.data) {
        toast({
          title: 'Sign-in failed',
          description: response.error || 'Invalid IC number or password.',
          variant: 'destructive',
        })
        return false
      }

      if (response.data.requiresRoleSelection && response.data.roles?.length) {
        setIcNumber(targetIc.trim())
        setPassword(targetPassword)
        setRoleOptions(response.data.roles)
        return false
      }

      if (response.data.token && response.data.user) {
        const authedUser = response.data.user
        login(response.data.token, authedUser)
        toast({
          title: 'Identity verified',
          description: `Signed in as ${authedUser.fullName || authedUser.icNumber}`,
        })
        navigate(resolvePostLoginRoute(authedUser.role))
        return true
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!icNumber.trim() || !password) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both your IC / Staff ID and password.',
        variant: 'destructive',
      })
      return
    }
    await executeLogin(icNumber, password)
  }

  const handleSmartCardDemo = (account: DemoAccount) => {
    setActiveGroupId(null)
    setIcNumber(account.icNumber)
    setPassword(account.password)
    clearTimers()

    setScanState({
      open: true,
      phase: 'insert',
      holderName: account.label,
      ic: account.icNumber,
    })

    timersRef.current.push(
      setTimeout(() => setScanState((prev) => ({ ...prev, phase: 'reading' })), 450),
      setTimeout(() => setScanState((prev) => ({ ...prev, phase: 'verifying' })), 950),
      setTimeout(async () => {
        setScanState((prev) => ({ ...prev, phase: 'success' }))
        await executeLogin(account.icNumber, account.password, account.role)
        setScanState({ open: false, phase: 'idle' })
      }, 1350)
    )
  }

  const activeGroup = DEMO_GROUPS.find((g) => g.id === activeGroupId) || null

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <Card className="border-slate-200/80 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">Sign In to MedLink MY</CardTitle>
          <CardDescription>
            Authenticate with your Malaysian IC number or authorized hospital ID
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="icNumber">MyKad IC Number / Staff ID</Label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="icNumber"
                  placeholder="e.g. 880101-14-5678"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="pl-10 font-mono"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password / Smart-Card PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {roleOptions && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-950">
                  Multiple portals linked to this MyKad
                </p>
                <button
                  type="button"
                  onClick={() => setRoleOptions(null)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  Cancel
                </button>
              </div>
              <div className="grid gap-2">
                {roleOptions.map((option) => {
                  const hospitalTheme = option.hospitalId ? getHospitalTheme(option.hospitalId) : null
                  return (
                    <button
                      key={`${option.role}-${option.hospitalId || 'national'}`}
                      type="button"
                      onClick={() => {
                        setRoleOptions(null)
                        void executeLogin(icNumber, password, option.role)
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-400 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 capitalize">
                          {option.role.replace('_', ' ')} Portal
                        </p>
                        <p className="text-xs text-gray-500">
                          {hospitalTheme ? hospitalTheme.name : 'Personal MyKad Health Records'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Smart-Card Quick Demo
              </span>
              <Badge variant="secondary" className="text-[11px]">Tap MyKad</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_GROUPS.map((group) => {
                const Icon = group.icon
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() =>
                      group.accounts.length === 1
                        ? handleSmartCardDemo(group.accounts[0])
                        : setActiveGroupId(group.id)
                    }
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${group.badgeClass}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{group.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Select {activeGroup.title}</h3>
                <p className="text-xs text-gray-500">Tap an identity card to simulate smart-chip sign-in</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGroupId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {activeGroup.accounts.map((acc) => (
                <button
                  key={`${acc.role}-${acc.icNumber}`}
                  type="button"
                  onClick={() => handleSmartCardDemo(acc)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{acc.label}</p>
                    <p className="text-xs text-gray-500 truncate">{acc.sublabel}</p>
                    <p className="text-[11px] font-mono text-blue-600 mt-0.5">{acc.icNumber}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ChipScanOverlay
        open={scanState.open}
        phase={scanState.phase}
        title="MyKad Smart-Chip Authentication"
        subtitle="Establishing encrypted session with MOH Identity Hub"
        icNumber={scanState.ic}
        holderName={scanState.holderName}
        onCancel={() => {
          clearTimers()
          setScanState({ open: false, phase: 'idle' })
        }}
      />
    </div>
  )
}
