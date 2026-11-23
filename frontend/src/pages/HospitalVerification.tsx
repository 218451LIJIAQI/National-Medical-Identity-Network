import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatUserDisplayName } from '@/lib/utils'
import ChipScanOverlay, { type ScanPhase } from '@/components/ChipScanOverlay'
import {
  Loader2, Lock, Shield, Stethoscope, MapPin, CreditCard, ArrowRight, LogOut,
} from 'lucide-react'

export default function HospitalVerification() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, isAuthenticated, _hasHydrated, login, logout } = useAuthStore()

  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!_hasHydrated) return
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.role !== 'doctor' && user.role !== 'hospital_admin') {
      navigate(user.role === 'patient' ? '/patient' : '/admin/central', { replace: true })
      return
    }
    setStaffId(user.icNumber)
    setPassword(user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
  }, [_hasHydrated, isAuthenticated, user, navigate])

  if (!_hasHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">Preparing hospital workstation verification...</p>
        </div>
      </div>
    )
  }

  const theme = getHospitalTheme(user.hospitalId)
  const targetRoute = user.role === 'doctor' ? '/doctor' : '/admin/hospital'
  const displayName = formatUserDisplayName(user)

  const completeVerification = async (idValue: string, pwdValue: string) => {
    setIsLoading(true)
    try {
      const res = await authApi.login(idValue.trim(), pwdValue, user.role)
      if (!res.success || !res.data?.token || !res.data?.user) {
        toast({
          title: 'Hospital workstation verification failed',
          description: res.error || 'Credentials rejected by hospital node.',
          variant: 'destructive',
        })
        return false
      }
      login(res.data.token, res.data.user)
      toast({
        title: `Connected to ${theme.name}`,
        description: `Welcome, ${formatUserDisplayName(res.data.user)}`,
      })
      navigate(targetRoute, { replace: true })
      return true
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await completeVerification(staffId, password)
  }

  const handleSmartBadgeTap = () => {
    clearTimers()
    const demoPwd = password || (user.role === 'hospital_admin' ? 'admin123' : 'doctor123')
    setScanPhase('insert')
    timersRef.current.push(
      setTimeout(() => setScanPhase('reading'), 400),
      setTimeout(() => setScanPhase('verifying'), 850),
      setTimeout(async () => {
        setScanPhase('success')
        await completeVerification(user.icNumber, demoPwd)
        setScanPhase('idle')
      }, 1250)
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        <Card className="border-slate-200 shadow-2xl overflow-hidden">
          <div className={`bg-gradient-to-r ${theme.headerGradient} p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-white/20 text-white border-white/30">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Local Hospital Node Verification
              </Badge>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="text-xs text-white/80 hover:text-white inline-flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Switch Account
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-lg shadow-lg">
                {theme.shortName}
              </div>
              <div>
                <h1 className="text-xl font-bold">{theme.name}</h1>
                <p className="text-sm text-white/85 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {theme.city}, {theme.state}
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className={`p-4 rounded-xl border ${theme.bgLight} ${theme.borderColor} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${theme.bgMedium} flex items-center justify-center`}>
                  <Stethoscope className={`w-5 h-5 ${theme.textColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-600 capitalize">
                    {user.specialization || user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <Badge className={theme.badgeClass}>Step 2 of 2</Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staffId">Hospital Staff / MyKad ID</Label>
                <Input
                  id="staffId"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospitalPin">Workstation Access PIN / Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="hospitalPin"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSmartBadgeTap}
                  disabled={isLoading}
                  className="h-11 rounded-xl gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Tap Staff Smart Badge
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`h-11 rounded-xl gap-2 text-white bg-gradient-to-r ${theme.buttonGradient}`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Enter Workstation
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ChipScanOverlay
        open={scanPhase !== 'idle'}
        phase={scanPhase}
        title={`${theme.shortName} Staff Badge Verification`}
        subtitle={theme.name}
        icNumber={user.icNumber}
        holderName={displayName}
        onCancel={() => {
          clearTimers()
          setScanPhase('idle')
        }}
      />
    </div>
  )
}
