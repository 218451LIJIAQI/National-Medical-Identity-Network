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
      navigate(`/doctor/patient/${encodeURIComponent(cleanIC)}/new-record`)
    } catch {
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

                <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-2xl shadow-gray-200/50 overflow-hidden">
            <motion.div 
              className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`}
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 tracking-wide">
                    Patient IC Number
                  </label>
                  <div className="relative group">
                    <motion.div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${theme.cardAccentGradient} rounded-2xl opacity-0 blur transition-all duration-300 group-hover:opacity-30`}
                    />
                    <div className="relative">
                      <Input
                        placeholder="e.g., 880101-14-5678"
                        value={icNumber}
                        onChange={(e) => setIcNumber(e.target.value)}
                        disabled={isChecking}
                        className="text-lg h-16 px-5 pr-14 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white/80 backdrop-blur-sm font-medium"
                        autoFocus
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-lg">
                        <Search className="w-5 h-5 text-gray-500" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    💡 If patient doesn't exist, they will be registered automatically
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate(-1)}
                      disabled={isChecking}
                      className="w-full h-14 rounded-xl border-2 font-semibold"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} className="flex-[2]">
                    <Button 
                      type="submit" 
                      disabled={isChecking || !icNumber.trim()}
                      className={`w-full h-14 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-xl ${theme.shadowColor}/40 hover:shadow-2xl font-semibold transition-all text-base`}
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
                  </motion.div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

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
