import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { Loader2, CreditCard, Lock, ArrowRight, Shield, Building2, Stethoscope, User, Network, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!icNumber || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both IC number and password',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await authApi.login(icNumber, password, selectedRole || undefined)
      
      if (response.success && response.data) {
        const { token, user } = response.data
        login(token, user as any)
        
        toast({
          title: 'Welcome!',
          description: 'Login successful',
        })

        const userRole = (user as any).role as string
        const redirectPath: Record<string, string> = {
          doctor: '/doctor',
          patient: '/patient',
          hospital_admin: '/admin/hospital',
          central_admin: '/admin/central',
        }
        const targetPath = redirectPath[userRole] || '/'
        
        navigate(targetPath)
      } else {
        toast({
          title: 'Login Failed',
          description: response.error || 'Invalid credentials',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const demoAccounts = [
    { label: 'Doctor', desc: 'KL General Hospital', ic: '750101-14-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Patient', desc: 'Ahmad bin Abdullah', ic: '880101-14-5678', password: 'patient123', role: 'patient', icon: User, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Hospital Admin', desc: 'KL General Hospital', ic: 'admin-kl', password: 'admin123', role: 'hospital_admin', icon: Building2, color: 'violet', gradient: 'from-violet-500 to-violet-600' },
    { label: 'Central Admin', desc: 'National Network', ic: 'central-admin', password: 'central123', role: 'central_admin', icon: Network, color: 'cyan', gradient: 'from-cyan-500 to-cyan-600' },
  ]

  const fillDemo = (demo: typeof demoAccounts[0]) => {
    setIcNumber(demo.ic)
    setPassword(demo.password)
    setSelectedRole(demo.role)
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Login Form Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div 
              className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-1">Sign in to access the medical network</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ic" className="text-sm font-medium">IC Number / Username</Label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="ic"
                  placeholder="XXXXXX-XX-XXXX"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Demo Accounts */}
      <Card className="border-0 shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Demo</Badge>
            <h2 className="font-semibold text-gray-900">Quick Access</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">Click any role to auto-fill credentials</p>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {demoAccounts.map((demo) => (
              <motion.div
                key={demo.ic}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fillDemo(demo)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  icNumber === demo.ic 
                    ? `border-${demo.color}-500 bg-${demo.color}-50` 
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${demo.gradient} shadow-md`}>
                    <demo.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{demo.label}</p>
                    <p className="text-xs text-gray-500 truncate">{demo.desc}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{demo.ic}</p>
                  </div>
                  {icNumber === demo.ic && (
                    <div className={`w-2 h-2 rounded-full bg-${demo.color}-500 animate-pulse`} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Access */}
      <motion.div
        whileHover={{ scale: 1.01 }}
      >
        <Link to="/emergency">
          <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 hover:border-red-300 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Emergency Access</p>
                  <p className="text-sm text-red-700">Access critical patient info without login</p>
                </div>
                <ArrowRight className="w-5 h-5 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  )
}
