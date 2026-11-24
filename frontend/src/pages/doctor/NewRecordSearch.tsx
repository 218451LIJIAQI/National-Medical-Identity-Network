import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, FileText, Search, UserPlus, Loader2, ShieldAlert, WifiOff } from 'lucide-react'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { centralApi } from '@/lib/api'
import { cn, formatIC } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export default function NewRecordSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [icNumber, setIcNumber] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [blockingBanner, setBlockingBanner] = useState<{
    kind: 'privacy' | 'network'
    message: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBlockingBanner(null)

    const formattedIC = formatIC(icNumber.trim())
    if (!formattedIC) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid patient MyKad IC number',
        variant: 'destructive',
      })
      return
    }

    setIsChecking(true)
    try {
      const response = await centralApi.getPatient(formattedIC)

      if (response.accessDenied) {
        const msg = response.error || t.privacyRestrictedDesc
        setBlockingBanner({ kind: 'privacy', message: msg })
        toast({
          title: t.privacyRestrictedTitle,
          description: msg,
          variant: 'destructive',
        })
        return
      }

      if (response.success && response.data?.hospitals && response.data.hospitals.length > 0) {
        toast({
          title: 'Patient Profile Verified',
          description: 'Demographics and recorded allergies will be automatically inherited.',
          variant: 'success',
        })
        navigate(`/doctor/patient/${encodeURIComponent(formattedIC)}/new-record`)
        return
      }

      if (response.notFound || response.status === 404) {
        toast({
          title: 'First-Time Network Patient',
          description: 'Demographics will be initialized from MyKad IC. Please verify allergies.',
        })
        navigate(`/doctor/patient/${encodeURIComponent(formattedIC)}/new-record`)
        return
      }

      const netMsg = response.error || t.networkError
      setBlockingBanner({ kind: 'network', message: netMsg })
      toast({
        title: 'Verification Unavailable',
        description: netMsg,
        variant: 'destructive',
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="py-10 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div
            className={cn(
              'inline-flex p-3.5 rounded-2xl bg-gradient-to-br mb-3 shadow-md text-white',
              theme.buttonGradient
            )}
          >
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.newRecord}</h1>
          <p className="text-slate-600 mt-1 text-xs">
            Enter patient MyKad IC number to verify consent policy and start clinical consultation
          </p>
        </div>

        <Card className="border border-slate-200 shadow-md overflow-hidden bg-white">
          <div className={cn('h-1.5 bg-gradient-to-r', theme.cardAccentGradient)} />
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="new-rec-ic" className="text-xs font-bold text-slate-700">
                  Patient MyKad IC Number
                </label>
                <div className="relative">
                  <Input
                    id="new-rec-ic"
                    placeholder="e.g., 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => {
                      setIcNumber(e.target.value)
                      setBlockingBanner(null)
                    }}
                    disabled={isChecking}
                    className="text-base h-12 px-4 pr-11 font-mono tabular-nums"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs text-slate-500">
                  Existing federated patients inherit verified demographics and allergies automatically.
                </p>
              </div>

              {blockingBanner?.kind === 'privacy' && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t.privacyRestrictedTitle}</p>
                    <p className="mt-0.5">{blockingBanner.message}</p>
                  </div>
                </div>
              )}

              {blockingBanner?.kind === 'network' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Unable to Verify Consent & Allergies</p>
                    <p className="mt-0.5">{blockingBanner.message}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isChecking}
                  className="flex-1 h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isChecking || !icNumber.trim()}
                  className={cn(
                    'flex-[2] h-11 bg-gradient-to-r text-white font-bold',
                    theme.buttonGradient
                  )}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying Policy…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Continue to Consultation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
