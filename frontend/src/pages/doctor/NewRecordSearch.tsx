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

export default function NewRecordSearch() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  
  const [icNumber, setIcNumber] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanIC = icNumber.trim()
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
      // Check if patient exists (optional - just for showing feedback)
      const response = await centralApi.queryPatient(cleanIC)
      
      if (response.success && response.data?.hospitals && response.data.hospitals.length > 0) {
        toast({
          title: 'Patient Found',
          description: 'Redirecting to create record...',
        })
      } else {
        toast({
          title: 'New Patient',
          description: 'Patient will be registered when you save the record.',
        })
      }
      
      // Navigate to new record page
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
    } catch {
      // Even if check fails, still navigate - backend will handle patient creation
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div 
            className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} mb-4`}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <FileText className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Record</h1>
          <p className="text-gray-500 mt-2">Enter patient IC number to begin</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`} />
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Patient IC Number
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="e.g., 880101-14-5678"
                      value={icNumber}
                      onChange={(e) => setIcNumber(e.target.value)}
                      disabled={isChecking}
                      className="text-lg h-14 px-4 pr-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    If patient doesn't exist, they will be registered automatically
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                    disabled={isChecking}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isChecking || !icNumber.trim()}
                    className={`flex-[2] h-12 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-lg`}
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Continue to Record
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          <p>💡 Tip: You can also search for existing patients in the Patient Search page</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
