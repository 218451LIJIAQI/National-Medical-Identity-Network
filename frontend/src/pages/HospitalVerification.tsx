import { useState, useEffect, useRef } from 'react'
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
import {
  Loader2, Lock, Shield, Building2, Stethoscope,
  Heart, Brain, Activity, CheckCircle2,
  MapPin, Clock, Users, Fingerprint, CreditCard, ArrowRight, LogOut
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
  const { user, isAuthenticated, isHospitalVerified, _hasHydrated, completeHospitalVerification, logout } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showChipScan, setShowChipScan] = useState(false)
  const [chipPhase, setChipPhase] = useState<(typeof CHIP_PHASES)[number]>('detecting')
  const mountedRef = useRef(true)

  const theme: HospitalTheme = getHospitalTheme(user?.hospitalId)
  const decoration = hospitalDecorations[user?.hospitalId || 'hospital-kl'] || hospitalDecorations['hospital-kl']

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (user) {
      setUsername(user.icNumber || '')
      setPassword(user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
    }
  }, [user])

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <div className="text-center">
            <p className="text-gray-600 font-medium">Preparing Hospital Verification...</p>
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mt-2" />
          </div>
        </motion.div>
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

  const finishVerification = async (toastTitle: string) => {
    setShowSuccess(true)
    completeHospitalVerification()
    toast({
      title: toastTitle,
      description: `Access granted to ${theme.name}`,
    })
    await new Promise((resolve) => setTimeout(resolve, 900))
    if (mountedRef.current) {
      navigate(getRoleHomePath(user.role, true))
    }
  }

  const handleIcScan = async () => {
    setIsLoading(true)
    setShowChipScan(true)
    setChipPhase('detecting')
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (!mountedRef.current) return
    setChipPhase('reading')

    const response = await authApi.verifyHospital({
      staffId: user.icNumber,
      method: 'ic_card',
    })

    if (!mountedRef.current) return

    if (!response.success) {
      setShowChipScan(false)
      setIsLoading(false)
      toast({
        title: 'Verification Failed',
        description: response.error || 'Could not verify staff IC card against hospital directory',
        variant: 'destructive',
      })
      return
    }

    setChipPhase('success')
    await new Promise((resolve) => setTimeout(resolve, 600))
    if (!mountedRef.current) return
    setShowChipScan(false)
    setIsLoading(false)
    await finishVerification('✓ IC Card Verified')
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      toast({
        title: 'Verification Required',
        description: 'Please enter your hospital credentials',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.verifyHospital({
        staffId: username.trim(),
        password,
        method: 'credentials',
      })

      if (!response.success) {
        toast({
          title: 'Hospital Verification Denied',
          description: response.error || 'Invalid hospital staff credentials',
          variant: 'destructive',
        })
        return
      }

      await finishVerification('✓ Hospital Verification Complete')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleSwitchAccount = () => {
    authApi.logout().catch(() => {})
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
              <motion.div
                className="relative w-72 h-44 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm shadow-2xl overflow-hidden border border-white/30"
                initial={{ scale: 0.8, rotateY: -20 }}
                animate={{ scale: 1, rotateY: chipPhase === 'reading' ? [0, 3, -3, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="absolute top-5 left-5 w-12 h-10 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg"
                  animate={chipPhase === 'reading' ? {
                    boxShadow: ['0 0 15px rgba(251,191,36,0.5)', '0 0 30px rgba(251,191,36,0.8)', '0 0 15px rgba(251,191,36,0.5)'],
                  } : chipPhase === 'success' ? {
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    boxShadow: '0 0 25px rgba(34,197,94,0.8)',
                  } : {}}
                  transition={{ duration: 0.4, repeat: chipPhase === 'reading' ? Infinity : 0 }}
                >
                  <div className="absolute inset-1 grid grid-cols-3 gap-px opacity-50">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-amber-700/50 rounded-sm" />
                    ))}
                  </div>
                </motion.div>

                <div className="absolute top-5 right-5 text-white/60 text-xs font-mono">{theme.shortName}</div>
                <div className="absolute bottom-5 left-5 right-5 space-y-2">
                  <div className="h-2 bg-white/20 rounded" />
                  <div className="h-2 bg-white/20 rounded w-2/3" />
                </div>

                {chipPhase === 'reading' && (
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                {chipPhase === 'success' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-green-500/30 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-xl"
                    >
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                className="mt-8 text-center"
                key={chipPhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-white mb-1">
                  {chipPhase === 'detecting' && 'Detecting IC Card...'}
                  {chipPhase === 'reading' && 'Verifying Hospital Credentials...'}
                  {chipPhase === 'success' && 'Verified!'}
                </h2>
                <p className="text-white/70 text-sm">
                  {chipPhase === 'detecting' && 'Place your card on the reader'}
                  {chipPhase === 'reading' && `Authenticating against ${theme.shortName} node`}
                  {chipPhase === 'success' && 'Entering hospital system...'}
                </p>
              </motion.div>

              <div className="flex gap-2 mt-6">
                {CHIP_PHASES.map((phase, i) => (
                  <motion.div
                    key={phase}
                    className={`w-2 h-2 rounded-full ${
                      chipPhase === phase
                        ? 'bg-white'
                        : i < CHIP_PHASES.indexOf(chipPhase)
                          ? 'bg-green-400'
                          : 'bg-white/30'
                    }`}
                    animate={chipPhase === phase ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}08 0%, ${theme.secondaryColor}05 50%, ${theme.accentColor}08 100%)`,
          }}
        />

        <div className="absolute inset-0" style={{ background: decoration.pattern }} />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => {
            const IconComponent = decoration.icons[i % decoration.icons.length]
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${10 + i * 12}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 10, 0],
                  rotate: [0, 5, -5, 0],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                <IconComponent className="w-12 h-12" style={{ color: theme.primaryColor }} />
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full max-w-lg relative z-10"
        >
          <Card className="border-0 shadow-2xl overflow-hidden backdrop-blur-sm bg-white/95">
            <div className={`relative p-8 bg-gradient-to-r ${theme.headerGradient} text-white overflow-hidden`}>
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />

              <div className="relative flex items-center justify-between gap-4">
                <motion.div
                  className="flex items-center gap-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                      <span className="text-2xl font-black tracking-tight">{theme.shortName}</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{theme.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-white/80">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{theme.city}</span>
                    </div>
                  </div>
                </motion.div>

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                  title="Sign out or switch account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-8 -mt-4 relative z-10">
              <Badge className={`${theme.badgeClass} border shadow-lg px-4 py-2 text-sm font-medium`}>
                <Shield className="w-4 h-4 mr-2" />
                Hospital System Verification
              </Badge>
            </div>

            <CardContent className="p-8 pt-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{decoration.welcomeText}</h2>
                <p className="text-gray-500 mt-1">{decoration.securityText}</p>
              </div>

              <div className={`p-4 rounded-2xl ${theme.bgLight} border ${theme.borderColor} mb-6`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow-lg`}>
                    {user.role === 'doctor' ? (
                      <Stethoscope className="w-6 h-6 text-white" />
                    ) : (
                      <Building2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{user.fullName}</p>
                    <p className={`text-sm ${theme.textColor}`}>
                      {user.role === 'doctor' ? 'Medical Staff' : 'Hospital Administrator'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleDateString('en-MY', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showSuccess ? (
                  <motion.form
                    onSubmit={handleVerification}
                    className="space-y-5"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Hospital Staff ID
                      </Label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.iconColor}`}>
                          <Fingerprint className="w-5 h-5" />
                        </div>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`pl-12 h-14 text-lg rounded-xl border-2 ${theme.borderColor} focus:ring-2 focus:ring-offset-0 bg-white/80`}
                          style={{ '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
                          placeholder="Enter Staff ID"
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 ml-1">
                        Verified server-side against your assigned hospital node ({theme.shortName})
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Hospital Password
                      </Label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.iconColor}`}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`pl-12 h-14 text-lg rounded-xl border-2 ${theme.borderColor} focus:ring-2 focus:ring-offset-0 bg-white/80`}
                          style={{ '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
                          placeholder="Enter Password"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r ${theme.buttonGradient} hover:shadow-xl transition-all duration-300 text-white border-0`}
                      style={{ boxShadow: `0 10px 30px -10px ${theme.primaryColor}50` }}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Verifying Access...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5" />
                          <span>Verify & Enter System</span>
                        </div>
                      )}
                    </Button>

                    <div className="relative flex items-center gap-4 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      <span className="text-sm text-gray-400 font-medium px-2">or</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    </div>

                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleIcScan}
                        disabled={isLoading}
                        className="relative w-full h-14 hover:border-gray-300 rounded-xl text-gray-700 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <CreditCard className="w-5 h-5" style={{ color: theme.primaryColor }} />
                          <span className="font-semibold">Scan Staff IC Card</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow-2xl mb-4`}
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900">Verification Successful</h3>
                    <p className={`${theme.textColor} mt-2`}>Entering {theme.shortName} System...</p>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-1 rounded-full bg-gradient-to-r ${theme.buttonGradient} mt-6 mx-auto max-w-[200px]`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs">256-bit SSL Encrypted • Hospital Private Network</span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium"
                >
                  Switch Account
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-gray-500 text-sm">{theme.tagline}</p>
        </motion.div>
      </div>
    </>
  )
}
