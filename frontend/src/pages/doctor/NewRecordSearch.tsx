import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, FileText, Search, UserPlus, Loader2, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { centralApi } from '@/lib/api'
import { formatIC } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export default function NewRecordSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [icNumber, setIcNumber] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [privacyBlockedMessage, setPrivacyBlockedMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPrivacyBlockedMessage(null)

    const formattedIC = formatIC(icNumber.trim())
    if (!formattedIC) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a patient MyKad IC number',
        variant: 'destructive',
      })
      return
    }

    setIsChecking(true)
    try {
      const response = await centralApi.getPatient(formattedIC)

      if (response.accessDenied) {
        setPrivacyBlockedMessage(response.error || t.privacyRestrictedDesc)
        toast({
          title: t.privacyRestrictedTitle,
          description: response.error || t.privacyRestrictedDesc,
          variant: 'destructive',
        })
        return
      }

      if (response.success && response.data?.hospitals && response.data.hospitals.length > 0) {
        toast({
          title: 'Patient Profile Found',
          description: 'Demographics and allergies will be automatically inherited.',
        })
      } else {
        toast({
          title: 'First-Time Network Patient',
          description: 'Demographics will be initialized from MyKad IC.',
        })
      }
      navigate(`/doctor/patient/${encodeURIComponent(formattedIC)}/new-record`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <motion.div
      className="min-h-[75vh] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} mb-4 shadow-lg`}>
            <FileText className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.newRecord}</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Enter patient MyKad IC number to start consultation</p>
        </div>

        <Card className="border border-slate-200 shadow-xl overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-gray-700">Patient MyKad IC Number</label>
                <div className="relative">
                  <Input
                    placeholder="e.g., 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => {
                      setIcNumber(e.target.value)
                      setPrivacyBlockedMessage(null)
                    }}
                    disabled={isChecking}
                    className="text-lg h-14 px-4 pr-12 rounded-xl font-mono"
                    autoFocus
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs text-gray-500">
                  Existing federated patients inherit verified demographics and allergies automatically.
                </p>
              </div>

              {privacyBlockedMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t.privacyRestrictedTitle}</p>
                    <p className="text-xs mt-0.5">{privacyBlockedMessage}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isChecking}
                  className="flex-1 h-12 rounded-xl font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isChecking || !icNumber.trim()}
                  className={`flex-[2] h-12 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white shadow-md font-semibold`}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying Policy...
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
    </motion.div>
  )
}
