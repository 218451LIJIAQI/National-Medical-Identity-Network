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
import { cn, formatIC, getRoleHomePath } from '@/lib/utils'
import { getHospitalTheme, type HospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { DisplayAccessibilityControls, LanguageSwitcher } from '@/layouts/hospital/shared'
import {
  Loader2,
  Lock,
  Shield,
  Building2,
  Stethoscope,
  CheckCircle2,
  MapPin,
  Clock,
  Fingerprint,
  CreditCard,
  ArrowRight,
  LogOut,
} from 'lucide-react'

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

  const theme: HospitalTheme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    if (user) {
      setUsername(user.icNumber || '')
      setPassword(user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
    }
  }, [user])

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">
            Preparing Hospital Secondary Verification…
          </span>
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
    try {
      const res = await authApi.verifyHospital({
        method: 'ic_chip',
        icNumber: user.icNumber,
      })

      if (!res.success || !res.data?.token || !res.data?.user) {
        toast({
          title: 'IC Card Verification Failed',
          description: res.error || 'Staff MyKad could not be verified against hospital roster',
          variant: 'destructive',
        })
        return
      }

      setShowSuccess(true)
      completeHospitalVerification(res.data.token, res.data.user)
      toast({
        title: 'Hospital MyKad Verified',
        description: `Authenticated into ${theme.name}`,
        variant: 'success',
      })
      navigate(getRoleHomePath(res.data.user.role, true))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      toast({
        title: 'Verification Required',
        description: 'Please enter both Hospital Staff ID and Intranet Password',
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
        variant: 'success',
      })
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
    <div className={cn('min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-br', theme.heroSoftGradient)}>
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="outline" className="bg-white/90 text-slate-700 border-slate-200 px-3 py-1">
            Step 2 of 2 • Hospital Node Step-Up Auth
          </Badge>
          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSwitcher showIcon={false} activeClassName={`${theme.iconBg} text-white shadow-sm`} className="bg-white shadow-sm" />
            <DisplayAccessibilityControls compact className="shadow-sm" />
          </div>
        </div>

        <Card className="border border-slate-200 shadow-xl overflow-hidden bg-white">
          <div className={cn('p-6 bg-gradient-to-r text-white', theme.headerGradient)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 px-3 py-2.5 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-base font-extrabold tracking-tight">{theme.code}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold truncate">{theme.name}</h1>
                  <div className="flex items-center gap-1.5 mt-0.5 text-white/85 text-xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{theme.city}</span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelAndSignOut}
                className="text-white hover:bg-white/15 shrink-0"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                {t.logout}
              </Button>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            <div>
              <Badge className={cn('border mb-2', theme.badgeClass)}>
                <Shield className="w-3.5 h-3.5 mr-1" />
                {t.verifyHospitalTitle}
              </Badge>
              <p className="text-slate-600 text-xs leading-relaxed">{t.verifyHospitalSubtitle}</p>
            </div>

            <div className={cn('p-4 rounded-xl border', theme.bgLight, theme.borderColor)}>
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0',
                    theme.buttonGradient
                  )}
                >
                  {user.role === 'doctor' ? (
                    <Stethoscope className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{user.fullName}</p>
                  <p className={cn('text-xs font-semibold font-mono tabular-nums', theme.textColor)}>
                    {user.role === 'doctor' ? 'Clinician' : 'Hospital Admin'} • {formatIC(user.icNumber)}
                    {user.licenseNumber ? ` • ${user.licenseNumber}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{theme.tagline}</span>
                  </div>
                </div>
              </div>
            </div>

            {!showSuccess ? (
              <form onSubmit={handleVerification} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-id" className="text-xs font-bold text-slate-700">
                    Hospital Staff ID / MMC License / MyKad IC
                  </Label>
                  <div className="relative">
                    <Fingerprint className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', theme.iconColor)} />
                    <Input
                      id="staff-id"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 font-mono text-sm bg-white"
                      placeholder="Enter Staff IC, MMC License, or Admin ID"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="staff-pwd" className="text-xs font-bold text-slate-700">
                    Hospital Intranet Password
                  </Label>
                  <div className="relative">
                    <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', theme.iconColor)} />
                    <Input
                      id="staff-pwd"
                      type="password"
                    autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 text-sm bg-white"
                      placeholder="Enter Hospital Password"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn('w-full h-11 font-bold text-white bg-gradient-to-r', theme.buttonGradient)}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying Active Roster…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {t.verifyAndEnter}
                    </span>
                  )}
                </Button>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">or</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleIcScan}
                  disabled={isLoading}
                  className="w-full h-11 font-semibold"
                >
                  <CreditCard className="w-4 h-4 mr-2" style={{ color: theme.primaryColor }} />
                  <span>{t.scanIcCard}</span>
                  <ArrowRight className="w-4 h-4 ml-2 text-slate-400" />
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div
                  className={cn(
                    'w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-md mb-3',
                    theme.buttonGradient
                  )}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Verification Complete</h3>
                <p className={cn('text-xs font-semibold mt-1', theme.textColor)}>
                  Entering {theme.name} Clinical Intranet…
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Trust Signed Hospital Token • Central Audit Logged</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
