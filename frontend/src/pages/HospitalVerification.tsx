import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { getRoleHomePath } from '@/lib/utils'
import { getHospitalTheme, type HospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import {
  Loader2,
  Lock,
  Shield,
  Building2,
  Stethoscope,
  Heart,
  Brain,
  Activity,
  CheckCircle2,
  MapPin,
  Clock,
  Users,
  Fingerprint,
  CreditCard,
  ArrowRight,
  LogOut,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const hospitalDecorations: Record<string, {
  pattern: string
  icons: typeof Stethoscope[]
  welcomeText: string
  securityText: string
}> = {
  'hospital-kl': {
    pattern: 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 40%)',
    icons: [Heart, Brain, Activity],
    welcomeText: 'Welcome to KL General Hospital',
    securityText: 'Secure Hospital Network Access',
  },
  'hospital-penang': {
    pattern: 'radial-gradient(circle at 10% 90%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(20, 184, 166, 0.1) 0%, transparent 40%)',
    icons: [Stethoscope, Heart, Users],
    welcomeText: 'Welcome to Penang Medical Centre',
    securityText: 'Pearl of the Orient Healthcare',
  },
  'hospital-jb': {
    pattern: 'radial-gradient(circle at 30% 70%, rgba(245, 158, 11, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(249, 115, 22, 0.1) 0%, transparent 40%)',
    icons: [Activity, Brain, Heart],
    welcomeText: 'Welcome to Johor Specialist Hospital',
    securityText: 'Southern Gateway Healthcare',
  },
  'hospital-kuching': {
    pattern: 'radial-gradient(circle at 15% 85%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.1) 0%, transparent 40%)',
    icons: [Brain, Stethoscope, Activity],
    welcomeText: 'Welcome to Sarawak General Hospital',
    securityText: "Borneo's Medical Excellence",
  },
  'hospital-kk': {
    pattern: 'radial-gradient(circle at 25% 75%, rgba(239, 68, 68, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(244, 63, 94, 0.1) 0%, transparent 40%)',
    icons: [Heart, Activity, Users],
    welcomeText: 'Welcome to Queen Elizabeth Hospital',
    securityText: "Sabah's Premier Healthcare",
  },
}

const CHIP_PHASES = ['detecting', 'reading', 'success'] as const

export default function HospitalVerification() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const {
    user,
    isAuthenticated,
    isHospitalVerified,
    _hasHydrated,
    completeHospitalVerification,
    logout,
  } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showChipScan, setShowChipScan] = useState(false)
  const [chipPhase, setChipPhase] = useState<(typeof CHIP_PHASES)[number]>('detecting')

  const theme: HospitalTheme = getHospitalTheme(user?.hospitalId)
  const decoration = hospitalDecorations[user?.hospitalId || 'hospital-kl'] || hospitalDecorations['hospital-kl']

  useEffect(() => {
    if (user) {
      setUsername(user.icNumber || '')
      setPassword(user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
    }
  }, [user])

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Preparing Hospital Verification...</p>
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'doctor' && user.role !== 'hospital_admin') {
    return <Navigate to={getRoleHomePath(user.role, true)} replace />
  }

  if (isHospitalVerified && !showSuccess) {
    return <Navigate to={getRoleHomePath(user.role, true)} replace />
  }

  const handleIcScan = async () => {
    setIsLoading(true)
    setShowChipScan(true)
    setChipPhase('detecting')
    await new Promise((resolve) => setTimeout(resolve, 600))
    setChipPhase('reading')

    const res = await authApi.verifyHospital({
      method: 'ic_chip',
      icNumber: user.icNumber,
    })

    if (!res.success || !res.data?.token || !res.data?.user) {
      setShowChipScan(false)
      setIsLoading(false)
      toast({
        title: 'IC Card Verification Failed',
        description: res.error || 'Staff MyKad could not be verified against hospital roster',
        variant: 'destructive',
      })
      return
    }

    setChipPhase('success')
    await new Promise((resolve) => setTimeout(resolve, 500))
    setShowChipScan(false)
    setShowSuccess(true)
    completeHospitalVerification(res.data.token, res.data.user)
    toast({
      title: 'IC Card Verified',
      description: `Authenticated into ${theme.name}`,
    })
    await new Promise((resolve) => setTimeout(resolve, 600))
    navigate(getRoleHomePath(res.data.user.role, true))
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      toast({
        title: 'Verification Required',
        description: 'Please enter both Hospital Staff ID and Password',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await authApi.verifyHospital({
        method: 'credentials',
        username: username.trim(),
        password,
      })

      if (!res.success || !res.data?.token || !res.data?.user) {
        toast({
          title: 'Hospital Verification Rejected',
          description: res.error || 'Invalid hospital staff credentials',
          variant: 'destructive',
        })
        return
      }

      setShowSuccess(true)
      completeHospitalVerification(res.data.token, res.data.user)
      toast({
        title: 'Hospital Verification Complete',
        description: `Access granted to ${theme.name}`,
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
      navigate(getRoleHomePath(res.data.user.role, true))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAndSignOut = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors
    }
    logout()
    navigate('/login')
  }

  return (
    <>
      <AnimatePresence>
        {showChipScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${theme.primaryColor}ee 0%, ${theme.secondaryColor}dd 100%)` }}
          >
            <div className="relative flex flex-col items-center">
              <div className="relative w-72 h-44 rounded-2xl bg-white/15 backdrop-blur-sm shadow-2xl overflow-hidden border border-white/30 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-10 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg" />
                  <span className="text-white/75 text-xs font-mono">{theme.shortName}</span>
                </div>
                <div className="text-white/90 text-xs font-mono">{user.icNumber}</div>
              </div>
              <div className="mt-6 text-center text-white">
                <h2 className="text-xl font-bold">
                  {chipPhase === 'detecting' && 'Detecting Staff MyKad...'}
                  {chipPhase === 'reading' && `Verifying Active Roster at ${theme.shortName}...`}
                  {chipPhase === 'success' && 'Hospital Credentials Verified!'}
                </h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}08 0%, ${theme.secondaryColor}05 50%, ${theme.accentColor}08 100%)`,
          }}
        />
        <div className="absolute inset-0" style={{ background: decoration.pattern }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg relative z-10"
        >
          <Card className="border-0 shadow-2xl overflow-hidden bg-white/95">
            <div className={`relative p-8 bg-gradient-to-r ${theme.headerGradient} text-white`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <span className="text-xl font-black tracking-tight">{theme.shortName}</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{theme.name}</h1>
                    <div className="flex items-center gap-1.5 mt-1 text-white/80 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{theme.city}</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAndSignOut}
                  className="text-white/85 hover:text-white hover:bg-white/15 rounded-xl"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Exit
                </Button>
              </div>
            </div>

            <div className="px-8 -mt-4 relative z-10">
              <Badge className={`${theme.badgeClass} border shadow-md px-4 py-1.5 text-xs font-semibold`}>
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                {t.verifyHospitalTitle}
              </Badge>
            </div>

            <CardContent className="p-8 pt-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{decoration.welcomeText}</h2>
                <p className="text-gray-500 text-sm mt-1">{t.verifyHospitalSubtitle}</p>
              </div>

              <div className={`p-4 rounded-2xl ${theme.bgLight} border ${theme.borderColor} mb-6`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow`}>
                    {user.role === 'doctor' ? (
                      <Stethoscope className="w-5 h-5 text-white" />
                    ) : (
                      <Building2 className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                    <p className={`text-xs font-medium ${theme.textColor}`}>
                      {user.role === 'doctor' ? 'Medical Practitioner' : 'Hospital Administrator'} • {user.icNumber}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showSuccess ? (
                  <motion.form
                    onSubmit={handleVerification}
                    className="space-y-4"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Hospital Staff ID / MyKad IC
                      </Label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.iconColor}`}>
                          <Fingerprint className="w-5 h-5" />
                        </div>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`pl-12 h-12 rounded-xl border ${theme.borderColor} bg-white`}
                          placeholder="Enter Staff IC or Admin ID"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Hospital Intranet Password
                      </Label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.iconColor}`}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`pl-12 h-12 rounded-xl border ${theme.borderColor} bg-white`}
                          placeholder="Enter Hospital Password"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-12 py-3.5 text-base font-bold rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white border-0 shadow-lg`}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying Roster & Credentials...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          {t.verifyAndEnter}
                        </span>
                      )}
                    </Button>

                    <div className="relative flex items-center gap-4 py-1">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 uppercase font-semibold">or</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleIcScan}
                      disabled={isLoading}
                      className="w-full h-12 rounded-xl text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-center gap-2.5">
                        <CreditCard className="w-5 h-5" style={{ color: theme.primaryColor }} />
                        <span className="font-semibold">{t.scanIcCard}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow-xl mb-4`}>
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Verification Successful</h3>
                    <p className={`${theme.textColor} text-sm mt-1`}>Entering {theme.shortName} Clinical Intranet...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Zero-Trust Signed Hospital Token • Audited Access</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
