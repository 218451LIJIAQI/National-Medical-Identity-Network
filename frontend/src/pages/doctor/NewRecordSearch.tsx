import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, FileText, Search, UserPlus, Loader2 } from 'lucide-react'
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
        title: 'Enter patient IC number',
        description: 'A Malaysian IC number is required to create a clinical record.',
        variant: 'destructive',
      })
      return
    }

    setIsChecking(true)
    try {
      const response = await centralApi.getPatient(cleanIC)
      if (response.success && response.data?.patient) {
        toast({
          title: 'Patient Found',
          description: `Opening clinical form for ${response.data.patient.fullName}.`,
        })
      } else {
        toast({
          title: 'New Patient Registration',
          description: 'Patient profile will be registered automatically upon saving the record.',
        })
      }
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} mb-4 shadow-lg`}>
            <FileText className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Clinical Record</h1>
          <p className="text-gray-500 mt-1">Enter the patient&apos;s MyKad IC number to start documenting at {theme.name}</p>
        </div>

        <Card className="border-slate-200/80 shadow-xl overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardContent className="p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="newRecordIc" className="text-sm font-semibold text-gray-700">
                  Patient MyKad IC Number
                </label>
                <div className="relative">
                  <Input
                    id="newRecordIc"
                    placeholder="e.g. 880101-14-5678"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    disabled={isChecking}
                    className="h-12 pr-11 font-mono text-base"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-4 top-4" />
                </div>
                <p className="text-xs text-gray-500">
                  First-time patients are automatically added to the {theme.displayShortName} database and MOH Central Index.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/doctor')}
                  className="rounded-xl h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isChecking}
                  className={`flex-1 rounded-xl h-11 text-white bg-gradient-to-r ${theme.buttonGradient}`}
                >
                  {isChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Continue to Encounter Form
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
