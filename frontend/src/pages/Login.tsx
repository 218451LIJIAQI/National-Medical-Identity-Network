import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { Loader2, CreditCard, Lock, ArrowRight, Shield, Building2, Stethoscope, User, Network, AlertTriangle, Sparkles, Fingerprint } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const { toast } = useToast()
  const { login } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
        window.location.href = targetPath
      } else {
        toast({
          title: 'Login Failed',
          description: response.error || 'Invalid credentials',
          variant: 'destructive',
        })
      }
    } catch {
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
    { label: 'Doctor', desc: 'KL General Hospital', ic: '750101-14-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-blue-500 via-blue-600 to-indigo-600', glowColor: 'shadow-blue-500/25' },
    { label: 'Patient', desc: 'Ahmad bin Abdullah', ic: '880101-14-5678', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-emerald-500 via-emerald-600 to-teal-600', glowColor: 'shadow-emerald-500/25' },
    { label: 'Hospital Admin', desc: 'KL General Hospital', ic: 'admin-kl', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-violet-500 via-purple-600 to-indigo-600', glowColor: 'shadow-violet-500/25' },
    { label: 'Central Admin', desc: 'National Network', ic: 'central-admin', password: 'central123', role: 'central_admin', icon: Network, bgGradient: 'from-cyan-500 via-blue-500 to-indigo-600', glowColor: 'shadow-cyan-500/25' },
  ]

  const fillDemo = (demo: typeof demoAccounts[0]) => {
    setIcNumber(demo.ic)
    setPassword(demo.password)
    setSelectedRole(demo.role)
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Login Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="relative border-0 shadow-2xl shadow-gray-200/50 overflow-hidden backdrop-blur-sm bg-white/95">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 via-emerald-500 to-blue-500 opacity-100" style={{ padding: '2px' }}>
            <div className="absolute inset-[2px] bg-white rounded-[inherit]" />
          </div>
          <motion.div 
            className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 via-emerald-500 via-violet-500 to-blue-500"
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          
          <div className="relative p-8 pt-10">
            <div className="text-center mb-10">
              {/* Animated logo */}
              <motion.div 
                className="relative w-20 h-20 mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl shadow-xl shadow-blue-500/30"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  animate={{ 
                    boxShadow: [
                      '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                      '0 10px 40px -10px rgba(6, 182, 212, 0.5)',
                      '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
                {/* Sparkle effect */}
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Welcome Back
                </h1>
                <p className="text-gray-500 mt-2 text-base">Sign in to access the National Medical Network</p>
              </motion.div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="ic" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-blue-500" />
                  IC Number / Username
                </Label>
                <div className="relative group">
                  <motion.div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'ic' ? 'opacity-50' : 'group-hover:opacity-30'}`}
                  />
                  <div className="relative">
                    <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === 'ic' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <Input
                      id="ic"
                      placeholder="XXXXXX-XX-XXXX"
                      value={icNumber}
                      onChange={(e) => setIcNumber(e.target.value)}
                      onFocus={() => setFocusedField('ic')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-12 h-14 text-base bg-white border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Password
                </Label>
                <div className="relative group">
                  <motion.div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'password' ? 'opacity-50' : 'group-hover:opacity-30'}`}
                  />
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-12 h-14 text-base bg-white border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  type="submit" 
                  className="relative w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 shadow-xl shadow-blue-500/25 rounded-xl overflow-hidden group" 
                  disabled={isLoading}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  />
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </Card>
      </motion.div>

      {/* Demo Accounts */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden backdrop-blur-sm bg-white/95">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-lg shadow-amber-500/25 px-3 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Demo
                </Badge>
              </motion.div>
              <div>
                <h2 className="font-bold text-gray-900">Quick Access</h2>
                <p className="text-sm text-gray-500">Click any role to auto-fill credentials</p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {demoAccounts.map((demo, index) => (
                  <motion.div
                    key={demo.ic}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => fillDemo(demo)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                      icNumber === demo.ic 
                        ? `bg-gradient-to-br ${demo.bgGradient} text-white shadow-xl ${demo.glowColor}` 
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200'
                    }`}
                  >
                    {/* Background glow for selected */}
                    {icNumber === demo.ic && (
                      <motion.div
                        className="absolute inset-0 opacity-30"
                        animate={{ 
                          background: [
                            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                            'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    )}
                    
                    <div className="relative flex items-start gap-3">
                      <motion.div 
                        className={`p-2.5 rounded-xl ${icNumber === demo.ic ? 'bg-white/20' : `bg-gradient-to-br ${demo.bgGradient}`} shadow-lg`}
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <demo.icon className={`w-5 h-5 ${icNumber === demo.ic ? 'text-white' : 'text-white'}`} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${icNumber === demo.ic ? 'text-white' : 'text-gray-900'}`}>
                          {demo.label}
                        </p>
                        <p className={`text-xs truncate ${icNumber === demo.ic ? 'text-white/80' : 'text-gray-500'}`}>
                          {demo.desc}
                        </p>
                        <p className={`text-xs font-mono mt-1 ${icNumber === demo.ic ? 'text-white/70' : 'text-gray-400'}`}>
                          {demo.ic}
                        </p>
                      </div>
                      {icNumber === demo.ic && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 rounded-full bg-white shadow-lg"
                        >
                          <motion.div
                            className="w-full h-full rounded-full bg-white"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Emergency Access */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ scale: 1.02, y: -2 }}
      >
        <Link to="/emergency">
          <Card className="relative border-2 border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 hover:border-red-300 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 cursor-pointer overflow-hidden">
            {/* Animated warning stripe */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/30"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                      '0 15px 35px -5px rgba(239, 68, 68, 0.5)',
                      '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1">
                  <p className="font-bold text-red-900 text-lg">Emergency Access</p>
                  <p className="text-sm text-red-700/80">Access critical patient information without login</p>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6 text-red-400" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  )
}
