import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, FileText, Search, UserPlus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { centralApi } from '@/lib/api'
import { formatIC } from '@/lib/utils'

export default function NewRecordSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [icNumber, setIcNumber] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanIC = formatIC(icNumber)
    if (!cleanIC) {
      toast({
        title: 'Error',
        description: 'Please enter a patient IC number',
        variant: 'destructive',
      })
      return
    }

    setIsChecking(true)

    try {
      const response = await centralApi.getPatient(cleanIC)

      if (response.accessDenied) {
        toast({
          title: 'Cross-Hospital Profile Restricted',
          description: 'Patient restricted cross-hospital sharing; proceeding with local visit registration.',
        })
      } else if (response.success && response.data?.hospitals && response.data.hospitals.length > 0) {
        toast({
          title: 'Patient Found',
          description: 'Demographics synced from network. Proceeding to create record...',
        })
      } else {
        toast({
          title: 'New Patient',
          description: 'Patient will be registered when you save the record.',
        })
      }
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
    } catch {
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <motion.div
      className="min-h-[80vh] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} mb-4`}>
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Record</h1>
          <p className="text-gray-500 mt-2">Enter patient IC number to begin consultation entry</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-gray-200/50 overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 tracking-wide">
                  Patient IC Number
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g., 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    disabled={isChecking}
                    className="text-lg h-16 px-5 pr-14 rounded-xl border-2 border-gray-200 bg-white font-medium"
                    autoFocus
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-lg">
                    <Search className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Existing network demographics (DOB, gender, blood type, allergies) sync automatically when authorized
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isChecking}
                  className="flex-1 h-14 rounded-xl border-2 font-semibold"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isChecking || !icNumber.trim()}
                  className={`flex-[2] h-14 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-xl font-semibold text-base`}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking Patient...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Continue to Record
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
