import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme, type HospitalTheme } from '@/lib/hospital-themes'
import {
  Loader2, Lock, Shield, Building2, Stethoscope,
  Heart, Brain, Activity, CheckCircle2,
  MapPin, Clock, Users, Fingerprint, CreditCard, ArrowRight
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

export default function HospitalVerification() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user: storeUser, _hasHydrated } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showChipScan, setShowChipScan] = useState(false)
  const [chipPhase, setChipPhase] = useState<'detecting' | 'reading' | 'success'>('detecting')
  const getStoredUser = () => {
    const storedUser = localStorage.getItem('medlink-user')
    if (storedUser) {
      try {
        return JSON.parse(storedUser)
      } catch {
        return null
      }
    }
    return null
  }

  const [localUser, setLocalUser] = useState<typeof storeUser>(() => getStoredUser())

  useEffect(() => {
    if (storeUser) {
      setLocalUser(storeUser)
    } else if (!localUser) {
      const stored = getStoredUser()
      if (stored) {
        setLocalUser(stored)
      }
    }
  }, [storeUser, localUser])
  const user = storeUser || localUser

  const theme: HospitalTheme = getHospitalTheme(user?.hospitalId)
  const decoration = hospitalDecorations[user?.hospitalId || 'hospital-kl'] || hospitalDecorations['hospital-kl']
  useEffect(() => {
    if (user) {
      setUsername(user.icNumber || '')
      setPassword(user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
    }
  }, [user])
  useEffect(() => {
    if (!_hasHydrated) return
    if (user) {
      if (user.role !== 'doctor' && user.role !== 'hospital_admin') {
        const redirectPath: Record<string, string> = {
          patient: '/patient',
          central_admin: '/admin/central',
        }
        navigate(redirectPath[user.role] || '/')
      }
      return
    }
    const storedUser = localStorage.getItem('medlink-user')
    if (!storedUser) {
      const timer = setTimeout(() => {
        navigate('/login')
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [user, navigate, _hasHydrated])
  if (!_hasHydrated || !user) {
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
  const handleIcScan = async () => {
    setShowChipScan(true)
    setChipPhase('detecting')
    await new Promise(resolve => setTimeout(resolve, 1200))
    setChipPhase('reading')
    await new Promise(resolve => setTimeout(resolve, 1500))
    setChipPhase('success')
    await new Promise(resolve => setTimeout(resolve, 800))

    setShowChipScan(false)
    setShowSuccess(true)

    toast({
      title: '✓ IC Card Verified',
      description: `Access granted to ${theme.name}`,
    })

    await new Promise(resolve => setTimeout(resolve, 1200))

    const redirectPath = user?.role === 'doctor' ? '/doctor' : '/admin/hospital'
    navigate(redirectPath)
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast({
        title: 'Verification Required',
        description: 'Please enter your hospital credentials',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setShowSuccess(true)

    toast({
      title: '✓ Hospital Verification Complete',
      description: `Access granted to ${theme.name}`,
    })
    await new Promise(resolve => setTimeout(resolve, 1200))

    const redirectPath = user?.role === 'doctor' ? '/doctor' : '/admin/hospital'
    navigate(redirectPath)
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
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
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
                      transition={{ type: "spring", damping: 10 }}
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
                  {chipPhase === 'reading' && 'Reading Hospital Credentials...'}
                  {chipPhase === 'success' && 'Verified!'}
                </h2>
                <p className="text-white/70 text-sm">
                  {chipPhase === 'detecting' && 'Place your card on the reader'}
                  {chipPhase === 'reading' && `Connecting to ${theme.shortName} system`}
                  {chipPhase === 'success' && 'Entering hospital system...'}
                </p>
              </motion.div>

                            <div className="flex gap-2 mt-6">
                {['detecting', 'reading', 'success'].map((phase, i) => (
                  <motion.div
                    key={phase}
                    className={`w-2 h-2 rounded-full ${
                      chipPhase === phase ? 'bg-white' :
                      i < ['detecting', 'reading', 'success'].indexOf(chipPhase) ? 'bg-green-400' : 'bg-white/30'
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

            <div
        className="absolute inset-0"
        style={{ background: decoration.pattern }}
      />

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => {
          const IconComponent = decoration.icons[i % decoration.icons.length]
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${15 + (i * 15)}%`,
                top: `${10 + (i * 12)}%`,
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
              <IconComponent
                className="w-12 h-12"
                style={{ color: theme.primaryColor }}
              />
            </motion.div>
          )
        })}
      </div>

            <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%, ${theme.primaryColor}10 0%, transparent 70%)`,
            `radial-gradient(circle at 50% 50%, ${theme.primaryColor}20 0%, transparent 70%)`,
            `radial-gradient(circle at 50% 50%, ${theme.primaryColor}10 0%, transparent 70%)`,
          ],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

            <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="border-0 shadow-2xl overflow-hidden backdrop-blur-sm bg-white/95">
                    <div className={`relative p-8 bg-gradient-to-r ${theme.headerGradient} text-white overflow-hidden`}>
                        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />

                        <motion.div
              className="relative flex items-center gap-4"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="relative">
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl"
                  animate={{
                    boxShadow: [
                      '0 10px 30px rgba(0,0,0,0.2)',
                      '0 20px 40px rgba(0,0,0,0.3)',
                      '0 10px 30px rgba(0,0,0,0.2)',
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <span className="text-2xl font-black tracking-tight">{theme.shortName}</span>
                </motion.div>
                                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-white/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{theme.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-white/80">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{theme.city}</span>
                </div>
              </div>
            </motion.div>
          </div>

                    <div className="px-8 -mt-4 relative z-10">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge
                className={`${theme.badgeClass} border shadow-lg px-4 py-2 text-sm font-medium`}
              >
                <Shield className="w-4 h-4 mr-2" />
                Hospital System Verification
              </Badge>
            </motion.div>
          </div>

          <CardContent className="p-8 pt-6">
                        <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-bold text-gray-900">{decoration.welcomeText}</h2>
              <p className="text-gray-500 mt-1">{decoration.securityText}</p>
            </motion.div>

                        <motion.div
              className={`p-4 rounded-2xl ${theme.bgLight} border ${theme.borderColor} mb-6`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow-lg`}
                >
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
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

                        <AnimatePresence mode="wait">
              {!showSuccess ? (
                <motion.form
                  onSubmit={handleVerification}
                  className="space-y-5"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                                    <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
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
                        style={{
                          '--tw-ring-color': theme.primaryColor,
                        } as React.CSSProperties}
                        placeholder="Enter Staff ID"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">
                      Demo: Auto-filled with your platform credentials
                    </p>
                  </motion.div>

                                    <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
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
                        style={{
                          '--tw-ring-color': theme.primaryColor,
                        } as React.CSSProperties}
                        placeholder="Enter Password"
                        disabled={isLoading}
                      />
                    </div>
                  </motion.div>

                                    <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r ${theme.buttonGradient} hover:shadow-xl transition-all duration-300 text-white border-0`}
                      style={{
                        boxShadow: `0 10px 30px -10px ${theme.primaryColor}50`,
                      }}
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
                  </motion.div>

                                    <motion.div
                    className="relative flex items-center gap-4 py-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                  >
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <span className="text-sm text-gray-400 font-medium px-2">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  </motion.div>

                                    <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="relative"
                  >
                    <motion.div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${theme.buttonGradient} rounded-xl blur-sm opacity-40`}
                      animate={{ opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleIcScan}
                      disabled={isLoading}
                      className="relative w-full h-14 hover:border-gray-300 rounded-xl text-gray-700 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="relative">
                          <CreditCard className="w-5 h-5" style={{ color: theme.primaryColor }} />
                          <motion.div
                            className="absolute -inset-1 rounded bg-current opacity-20"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ color: theme.primaryColor }}
                          />
                        </div>
                        <span className="font-semibold">Scan IC Card</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </div>
                    </Button>
                  </motion.div>
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
                    transition={{ type: "spring", damping: 10 }}
                    className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center shadow-2xl mb-4`}
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-bold text-gray-900"
                  >
                    Verification Successful
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`${theme.textColor} mt-2`}
                  >
                    Entering {theme.shortName} System...
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className={`h-1 rounded-full bg-gradient-to-r ${theme.buttonGradient} mt-6 mx-auto max-w-[200px]`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

                        <motion.div
              className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Shield className="w-4 h-4" />
              <span className="text-xs">256-bit SSL Encrypted • Hospital Private Network</span>
            </motion.div>
          </CardContent>
        </Card>

                <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-6 text-gray-500 text-sm"
        >
          {theme.tagline}
        </motion.p>
      </motion.div>
      </div>
    </>
  )
}
