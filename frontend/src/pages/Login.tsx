import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { Loader2, CreditCard, Lock, ArrowRight, Shield, Building2, Stethoscope, User, Network, AlertTriangle, Sparkles, Fingerprint, X, MapPin, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [icNumber, setIcNumber] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showChipAnimation, setShowChipAnimation] = useState(false)
  const [chipScanPhase, setChipScanPhase] = useState<'detecting' | 'reading' | 'success'>('detecting')
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [pendingLogin, setPendingLogin] = useState<{ ic: string; password: string; roles: string[] } | null>(null)

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

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

    // Check if this is a multi-role user - show role selection first
    // These ICs have both doctor and patient roles
    const multiRoleICs = ['750101-14-5001', '760612-07-5001']
    if (multiRoleICs.includes(icNumber)) {
      setPendingLogin({ ic: icNumber, password: password, roles: ['doctor', 'patient'] })
      setShowRoleSelection(true)
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
          description: 'Platform authentication successful',
        })

        const userRole = (user as any).role as string
        
        // Small delay to ensure state is fully synced before navigation
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Hospital users (doctor & hospital_admin) need second verification
        if (userRole === 'doctor' || userRole === 'hospital_admin') {
          navigate('/verify')
        } else {
          // Other users go directly to their dashboard
          const redirectPath: Record<string, string> = {
            patient: '/patient',
            central_admin: '/admin/central',
          }
          navigate(redirectPath[userRole] || '/')
        }
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

  // Doctor accounts - separate for modal selection
  const doctorAccounts = [
    { label: 'Dr. Lim Wei Ming', hospital: 'KL General Hospital', city: 'Kuala Lumpur', desc: 'Internal Medicine', ic: '750101-14-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-blue-500 via-blue-600 to-indigo-600', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
    { label: 'Dr. Tan Mei Ling', hospital: 'Penang Medical Centre', city: 'Georgetown', desc: 'Neurology', ic: '760612-07-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-emerald-500 via-teal-600 to-green-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
    { label: 'Dr. Siti Aishah', hospital: 'Johor Specialist Hospital', city: 'Johor Bahru', desc: 'Oncology', ic: '770808-01-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-amber-500 via-orange-500 to-yellow-600', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
    { label: 'Dr. James Wong', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Nephrology', ic: '790303-13-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-violet-500 via-purple-600 to-indigo-600', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
    { label: 'Dr. Maria Gonzales', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Pulmonology', ic: '810707-12-5001', password: 'doctor123', role: 'doctor', icon: Stethoscope, bgGradient: 'from-red-500 via-rose-500 to-pink-600', glowColor: 'shadow-red-500/25', color: '#EF4444' },
  ]

  // Patient accounts - diverse patients across Malaysia
  const patientAccounts = [
    { label: 'Ahmad bin Abdullah', city: 'Kuala Lumpur', desc: 'Hypertension, Diabetes', ic: '880101-14-5678', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-emerald-500 via-teal-600 to-cyan-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
    { label: 'Siti Nurhaliza binti Mohd', city: 'George Town', desc: 'Asthma', ic: '950320-10-1234', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-pink-500 via-rose-500 to-red-500', glowColor: 'shadow-pink-500/25', color: '#EC4899' },
    { label: 'Tan Ah Kow', city: 'Johor Bahru', desc: 'Coronary Disease, CKD', ic: '550715-07-9999', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-amber-500 via-orange-500 to-red-500', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
    { label: 'Raj Kumar a/l Muthu', city: 'Kuching', desc: 'Epilepsy', ic: '900808-01-5555', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-violet-500 via-purple-500 to-fuchsia-500', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
    { label: 'Aishah binti Mohd Yusof', city: 'Kota Kinabalu', desc: 'Asthma', ic: '820425-12-7777', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-blue-500 via-indigo-500 to-violet-500', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
    { label: 'Lee Mei Fong', city: 'Kuala Lumpur', desc: 'Rheumatoid Arthritis', ic: '780312-14-2345', password: 'patient123', role: 'patient', icon: User, bgGradient: 'from-cyan-500 via-teal-500 to-emerald-500', glowColor: 'shadow-cyan-500/25', color: '#06B6D4' },
    { label: 'Lim Wei Ming (Doctor)', city: 'Kuala Lumpur', desc: 'Hyperlipidemia - Also a Doctor', ic: '750101-14-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
    { label: 'Tan Mei Ling (Doctor)', city: 'George Town', desc: 'Migraine - Also a Doctor', ic: '760612-07-5001', password: 'doctor123', role: 'patient', icon: User, bgGradient: 'from-slate-500 via-gray-600 to-zinc-600', glowColor: 'shadow-slate-500/25', color: '#64748B' },
  ]

  // Hospital Admin accounts - each hospital has unique style
  const hospitalAdminAccounts = [
    { label: 'KL General Admin', hospital: 'KL General Hospital', city: 'Kuala Lumpur', desc: 'Hospital Administrator', ic: 'admin-kl', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-blue-600 via-indigo-600 to-violet-600', glowColor: 'shadow-blue-500/25', color: '#3B82F6' },
    { label: 'Penang MC Admin', hospital: 'Penang Medical Centre', city: 'Georgetown', desc: 'Hospital Administrator', ic: 'admin-penang', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-emerald-500 via-teal-600 to-green-600', glowColor: 'shadow-emerald-500/25', color: '#10B981' },
    { label: 'Johor Specialist Admin', hospital: 'Johor Specialist Hospital', city: 'Johor Bahru', desc: 'Hospital Administrator', ic: 'admin-jb', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-amber-500 via-orange-500 to-yellow-600', glowColor: 'shadow-amber-500/25', color: '#F59E0B' },
    { label: 'Sarawak General Admin', hospital: 'Sarawak General Hospital', city: 'Kuching', desc: 'Hospital Administrator', ic: 'admin-kuching', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-violet-500 via-purple-600 to-indigo-600', glowColor: 'shadow-violet-500/25', color: '#8B5CF6' },
    { label: 'Queen Elizabeth Admin', hospital: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', desc: 'Hospital Administrator', ic: 'admin-kk', password: 'admin123', role: 'hospital_admin', icon: Building2, bgGradient: 'from-red-500 via-rose-500 to-pink-600', glowColor: 'shadow-red-500/25', color: '#EF4444' },
  ]

  // Other demo accounts (Central Admin only)
  const demoAccounts = [
    { label: 'Central Admin', desc: 'National Network', ic: 'central-admin', password: 'central123', role: 'central_admin', icon: Network, bgGradient: 'from-cyan-500 via-blue-500 to-indigo-600', glowColor: 'shadow-cyan-500/25' },
  ]

  // Users with multiple roles (doctor who is also a patient)
  const multiRoleUsers: Record<string, { roles: string[]; doctorInfo: typeof doctorAccounts[0] }> = {
    '750101-14-5001': { 
      roles: ['doctor', 'patient'], 
      doctorInfo: doctorAccounts[0] 
    },
    '760612-07-5001': { 
      roles: ['doctor', 'patient'], 
      doctorInfo: doctorAccounts[1] 
    },
  }

  // Check if selected IC is a doctor, hospital admin, or patient
  const selectedDoctor = doctorAccounts.find(d => d.ic === icNumber)
  const selectedHospitalAdmin = hospitalAdminAccounts.find(a => a.ic === icNumber)
  const selectedPatient = patientAccounts.find(p => p.ic === icNumber)
  const [showHospitalAdminModal, setShowHospitalAdminModal] = useState(false)
  const [showPatientModal, setShowPatientModal] = useState(false)

  const fillDemo = (demo: { ic: string; password: string; role: string }) => {
    setIcNumber(demo.ic)
    setPassword(demo.password)
    setSelectedRole(demo.role)
  }

  const selectDoctor = (doctor: typeof doctorAccounts[0]) => {
    fillDemo(doctor)
    setShowDoctorModal(false)
  }

  const selectHospitalAdmin = (admin: typeof hospitalAdminAccounts[0]) => {
    fillDemo(admin)
    setShowHospitalAdminModal(false)
  }

  const selectPatient = (patient: typeof patientAccounts[0]) => {
    fillDemo(patient)
    setShowPatientModal(false)
  }

  // Handle role selection for multi-role users
  const handleRoleSelect = async (role: string) => {
    if (!pendingLogin) return
    
    setShowRoleSelection(false)
    setSelectedRole(role)
    
    if (role === 'patient') {
      // For patient role: use the doctor's own IC as patient
      // Doctors now have their own patient accounts in the database
      // Use the same password as the doctor account (unified password per IC)
      try {
        const response = await authApi.login(pendingLogin.ic, pendingLogin.password, 'patient')
        
        if (response.success && response.data) {
          const { token, user } = response.data
          login(token, user as any)
          
          toast({
            title: 'Welcome!',
            description: `Logged in as Patient`,
          })
          
          await new Promise(resolve => setTimeout(resolve, 100))
          navigate('/patient')
        } else {
          toast({
            title: 'Login Failed',
            description: 'Unable to login as patient',
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Error',
          description: 'An error occurred',
          variant: 'destructive',
        })
      }
      
      setPendingLogin(null)
      return
    } else {
      // For doctor role: Normal login flow with second verification
      try {
        const response = await authApi.login(pendingLogin.ic, pendingLogin.password, 'doctor')
        
        if (response.success && response.data) {
          const { token, user } = response.data
          login(token, user as any)
          
          toast({
            title: 'Access Granted',
            description: 'Proceeding to hospital verification...',
          })

          await new Promise(resolve => setTimeout(resolve, 100))
          navigate('/verify')
        } else {
          toast({
            title: 'Login Failed',
            description: response.error || 'Invalid credentials',
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Login Failed',
          description: 'An error occurred',
          variant: 'destructive',
        })
      }
    }
    
    setPendingLogin(null)
  }

  // Mock IC Scan - 全屏芯片扫描动画
  const handleIcScan = async () => {
    // Check all account types
    const allAccounts = [...doctorAccounts, ...hospitalAdminAccounts, ...demoAccounts]
    const selectedDemo = allAccounts.find(demo => demo.ic === icNumber)
    
    if (!selectedDemo) {
      toast({
        title: 'No IC Card Selected',
        description: 'Please select an account below first, then scan the IC card',
        variant: 'destructive',
      })
      return
    }
    
    // Check if this is a multi-role user
    const multiRole = multiRoleUsers[icNumber]
    
    if (multiRole) {
      // Show chip animation first
      setShowChipAnimation(true)
      setChipScanPhase('detecting')
      await new Promise(resolve => setTimeout(resolve, 1500))
      setChipScanPhase('reading')
      await new Promise(resolve => setTimeout(resolve, 2000))
      setChipScanPhase('success')
      await new Promise(resolve => setTimeout(resolve, 800))
      setShowChipAnimation(false)
      
      // Then show role selection
      setPendingLogin({ ic: icNumber, password: selectedDemo.password, roles: multiRole.roles })
      setShowRoleSelection(true)
      return
    }
    
    // Normal single-role login flow continues below...
    if (!icNumber) {
      toast({
        title: 'No IC Card Selected',
        description: 'Please select an account below first',
        variant: 'destructive',
      })
      return
    }
    
    // 显示全屏芯片扫描动画
    setShowChipAnimation(true)
    setChipScanPhase('detecting')
    
    // Phase 1: Detecting (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setChipScanPhase('reading')
    
    // Phase 2: Reading chip data (2s)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setChipScanPhase('success')
    
    // Phase 3: Success (1s)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      const response = await authApi.login(selectedDemo.ic, selectedDemo.password, selectedDemo.role)
      
      if (response.success && response.data) {
        const { token, user } = response.data
        login(token, user as any)

        const userRole = (user as any).role as string
        
        // Small delay to ensure state is fully synced before navigation
        await new Promise(resolve => setTimeout(resolve, 100))
        
        setShowChipAnimation(false)
        
        // Hospital users need second verification
        if (userRole === 'doctor' || userRole === 'hospital_admin') {
          navigate('/verify')
        } else {
          toast({
            title: 'Access Granted',
            description: `Welcome, ${selectedDemo.label}!`,
          })
          const redirectPath: Record<string, string> = {
            patient: '/patient',
            central_admin: '/admin/central',
          }
          navigate(redirectPath[userRole] || '/')
        }
      } else {
        toast({
          title: 'Authentication Failed',
          description: response.error || 'IC card not recognized',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Scan Error',
        description: 'Unable to read IC card. Please try again.',
        variant: 'destructive',
      })
      setShowChipAnimation(false)
    }
  }

  return (
    <>
      {/* Full-screen Chip Scan Animation Overlay */}
      <AnimatePresence>
        {showChipAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center"
          >
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
              }} />
            </div>
            
            {/* Scanning beam effect */}
            <motion.div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              initial={{ top: '0%' }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            
            <div className="relative flex flex-col items-center">
              {/* IC Card with Chip */}
              <motion.div
                className="relative w-80 h-48 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-2xl shadow-blue-500/30 overflow-hidden"
                initial={{ scale: 0.8, rotateY: -30 }}
                animate={{ 
                  scale: 1,
                  rotateY: chipScanPhase === 'reading' ? [0, 5, -5, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Card pattern */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-4 w-16 h-12 rounded bg-gradient-to-br from-amber-300 to-yellow-500" />
                  <div className="absolute top-4 right-4 text-white/50 text-xs font-mono">MYKAD</div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="h-2 bg-white/20 rounded mb-2" />
                    <div className="h-2 bg-white/20 rounded w-2/3" />
                  </div>
                </div>
                
                {/* Chip */}
                <motion.div
                  className="absolute top-6 left-6 w-14 h-11 rounded-md bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg"
                  animate={chipScanPhase === 'reading' ? {
                    boxShadow: ['0 0 20px rgba(251,191,36,0.5)', '0 0 40px rgba(251,191,36,0.8)', '0 0 20px rgba(251,191,36,0.5)'],
                  } : chipScanPhase === 'success' ? {
                    boxShadow: '0 0 30px rgba(34,197,94,0.8)',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  } : {}}
                  transition={{ duration: 0.5, repeat: chipScanPhase === 'reading' ? Infinity : 0 }}
                >
                  {/* Chip pattern */}
                  <div className="absolute inset-1 grid grid-cols-3 gap-px opacity-60">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-amber-700/50 rounded-sm" />
                    ))}
                  </div>
                </motion.div>
                
                {/* Scanning line on card */}
                {chipScanPhase === 'reading' && (
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                
                {/* Success checkmark overlay */}
                {chipScanPhase === 'success' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                      className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/50"
                    >
                      <motion.svg
                        viewBox="0 0 24 24"
                        className="w-10 h-10 text-white"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                      </motion.svg>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
              
              {/* Status Text */}
              <motion.div
                className="mt-10 text-center"
                key={chipScanPhase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {chipScanPhase === 'detecting' && 'Detecting IC Card...'}
                  {chipScanPhase === 'reading' && 'Reading Chip Data...'}
                  {chipScanPhase === 'success' && 'IC Card Verified!'}
                </h2>
                <p className="text-gray-400">
                  {chipScanPhase === 'detecting' && 'Please place your IC card on the reader'}
                  {chipScanPhase === 'reading' && 'Extracting identity information'}
                  {chipScanPhase === 'success' && 'Proceeding to hospital verification...'}
                </p>
              </motion.div>
              
              {/* Progress dots */}
              <div className="flex gap-3 mt-8">
                {['detecting', 'reading', 'success'].map((phase, i) => (
                  <motion.div
                    key={phase}
                    className={`w-3 h-3 rounded-full ${
                      chipScanPhase === phase 
                        ? 'bg-cyan-400' 
                        : i < ['detecting', 'reading', 'success'].indexOf(chipScanPhase)
                          ? 'bg-green-500'
                          : 'bg-gray-600'
                    }`}
                    animate={chipScanPhase === phase ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

              {/* Divider */}
              <motion.div 
                className="relative flex items-center gap-4 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <span className="text-sm text-gray-400 font-medium px-2">or</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </motion.div>

              {/* Scan IC Card Button - Premium */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="relative group/btn"
              >
                {/* Animated gradient border */}
                <motion.div
                  className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  style={{ backgroundSize: '200% 200%' }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                {/* Breathing glow - enhanced */}
                <motion.div
                  className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl blur-lg"
                  animate={{ opacity: [0.35, 0.6, 0.35] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                
                <Button 
                  type="button"
                  onClick={handleIcScan}
                  className="relative w-full h-[4.5rem] text-base font-semibold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-400 hover:to-cyan-500 shadow-xl shadow-emerald-500/30 rounded-xl overflow-hidden group border-0 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/40" 
                  disabled={isLoading}
                >
                  {/* Dual shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                  
                  {/* Flowing light on border - top and bottom */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <motion.div
                      className="absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r from-transparent via-white/90 to-transparent"
                      animate={{ x: ['-96px', '400px'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                    />
                    <motion.div
                      className="absolute bottom-0 right-0 w-24 h-[2px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
                      animate={{ x: ['96px', '-400px'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1.5, delay: 1 }}
                    />
                  </div>
                  
                  {/* Inner glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10 pointer-events-none" />

                  <div className="relative flex items-center justify-center gap-4 px-4">
                    {/* NFC Icon with signal waves */}
                    <div className="relative flex items-center justify-center w-14 h-14">
                      {/* Signal waves - three layers */}
                      <motion.div
                        className="absolute w-10 h-10 rounded-full border-2 border-white/40"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute w-10 h-10 rounded-full border border-white/30"
                        animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                      />
                      <motion.div
                        className="absolute w-10 h-10 rounded-full border border-white/20"
                        animate={{ scale: [1, 1.9], opacity: [0.2, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
                      />
                      
                      {/* Inner glow */}
                      <motion.div
                        className="absolute w-8 h-8 rounded-full bg-white/10 blur-sm"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      {/* Card icon */}
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <CreditCard className="h-7 w-7 text-white drop-shadow-md" />
                      </motion.div>
                    </div>
                    
                    {/* Text */}
                    <div className="flex flex-col items-start">
                      <span className="text-white font-bold text-[15px]">Scan IC Card</span>
                      <span className="text-xs text-white/80">Tap to scan and login instantly</span>
                    </div>
                    
                    {/* Animated arrow with dots */}
                    <motion.div
                      className="ml-auto flex items-center gap-1"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <motion.span
                        className="w-1 h-1 bg-white/50 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.span
                        className="w-1 h-1 bg-white/70 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                      <ArrowRight className="h-5 w-5 text-white" />
                    </motion.div>
                  </div>
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
              {/* Doctor Card - Opens Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDoctorModal(true)}
                className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                  selectedDoctor 
                    ? `bg-gradient-to-br ${selectedDoctor.bgGradient} text-white shadow-xl ${selectedDoctor.glowColor}` 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200'
                }`}
              >
                {selectedDoctor && (
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
                    className={`p-2.5 rounded-xl ${selectedDoctor ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500'} shadow-lg`}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <Stethoscope className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${selectedDoctor ? 'text-white' : 'text-gray-900'}`}>
                      {selectedDoctor ? selectedDoctor.label : 'Doctor'}
                    </p>
                    <p className={`text-xs truncate ${selectedDoctor ? 'text-white/80' : 'text-gray-500'}`}>
                      {selectedDoctor ? selectedDoctor.hospital : '5 hospitals available'}
                    </p>
                    <p className={`text-xs font-mono mt-1 ${selectedDoctor ? 'text-white/70' : 'text-gray-400'}`}>
                      {selectedDoctor ? selectedDoctor.ic : 'Click to select →'}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${selectedDoctor ? 'text-white/70' : 'text-gray-400'}`} />
                </div>
              </motion.div>

              {/* Hospital Admin Card - Opens Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowHospitalAdminModal(true)}
                className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                  selectedHospitalAdmin 
                    ? `bg-gradient-to-br ${selectedHospitalAdmin.bgGradient} text-white shadow-xl ${selectedHospitalAdmin.glowColor}` 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200'
                }`}
              >
                {selectedHospitalAdmin && (
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
                    className={`p-2.5 rounded-xl ${selectedHospitalAdmin ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'} shadow-lg`}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${selectedHospitalAdmin ? 'text-white' : 'text-gray-900'}`}>
                      {selectedHospitalAdmin ? selectedHospitalAdmin.label : 'Hospital Admin'}
                    </p>
                    <p className={`text-xs truncate ${selectedHospitalAdmin ? 'text-white/80' : 'text-gray-500'}`}>
                      {selectedHospitalAdmin ? selectedHospitalAdmin.hospital : '5 hospitals available'}
                    </p>
                    <p className={`text-xs font-mono mt-1 ${selectedHospitalAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                      {selectedHospitalAdmin ? selectedHospitalAdmin.ic : 'Click to select →'}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${selectedHospitalAdmin ? 'text-white/70' : 'text-gray-400'}`} />
                </div>
              </motion.div>

              {/* Patient Selection Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPatientModal(true)}
                className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                  selectedPatient
                    ? `bg-gradient-to-br ${selectedPatient.bgGradient} text-white shadow-xl ${selectedPatient.glowColor}` 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-emerald-50 hover:to-teal-50 border border-gray-200 hover:border-emerald-200'
                }`}
              >
                {selectedPatient && (
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
                    className={`p-2.5 rounded-xl ${selectedPatient ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500'} shadow-lg`}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${selectedPatient ? 'text-white' : 'text-gray-900'}`}>
                      {selectedPatient ? selectedPatient.label : 'Patient'}
                    </p>
                    <p className={`text-xs truncate ${selectedPatient ? 'text-white/80' : 'text-gray-500'}`}>
                      {selectedPatient ? selectedPatient.desc : '8 patients available'}
                    </p>
                    <p className={`text-xs font-mono mt-1 ${selectedPatient ? 'text-white/70' : 'text-gray-400'}`}>
                      {selectedPatient ? selectedPatient.ic : 'Click to select →'}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${selectedPatient ? 'text-white/70' : 'text-gray-400'}`} />
                </div>
              </motion.div>

              {/* Other Demo Accounts */}
              <AnimatePresence>
                {demoAccounts.map((demo, index) => (
                  <motion.div
                    key={demo.ic}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => fillDemo(demo)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                      icNumber === demo.ic 
                        ? `bg-gradient-to-br ${demo.bgGradient} text-white shadow-xl ${demo.glowColor}` 
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200'
                    }`}
                  >
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
                        <demo.icon className="w-5 h-5 text-white" />
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
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Doctor Selection Modal */}
      <AnimatePresence>
        {showDoctorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDoctorModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-6 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 text-white">
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Select Doctor</h3>
                    <p className="text-sm text-white/80">Choose from 5 hospitals</p>
                  </div>
                </div>
              </div>

              {/* Doctor List */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {doctorAccounts.map((doctor, index) => (
                    <motion.div
                      key={doctor.ic}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectDoctor(doctor)}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                        icNumber === doctor.ic
                          ? 'border-transparent bg-gradient-to-r shadow-lg'
                          : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      style={{
                        background: icNumber === doctor.ic 
                          ? `linear-gradient(135deg, ${doctor.color}15, ${doctor.color}05)` 
                          : undefined,
                        borderColor: icNumber === doctor.ic ? doctor.color : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Hospital Color Badge */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg"
                          style={{ backgroundColor: doctor.color }}
                        >
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{doctor.label}</p>
                          <p className="text-sm text-gray-600">{doctor.hospital}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{doctor.city}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-500">{doctor.desc}</span>
                          </div>
                        </div>

                        <ChevronRight 
                          className="w-5 h-5 text-gray-300" 
                          style={{ color: icNumber === doctor.ic ? doctor.color : undefined }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hospital Admin Selection Modal */}
      <AnimatePresence>
        {showHospitalAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHospitalAdminModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                <button
                  onClick={() => setShowHospitalAdminModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Select Hospital Admin</h3>
                    <p className="text-sm text-white/80">Choose from 5 hospitals</p>
                  </div>
                </div>
              </div>

              {/* Hospital Admin List */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {hospitalAdminAccounts.map((admin, index) => (
                    <motion.div
                      key={admin.ic}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectHospitalAdmin(admin)}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                        icNumber === admin.ic
                          ? 'border-transparent bg-gradient-to-r shadow-lg'
                          : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      style={{
                        background: icNumber === admin.ic 
                          ? `linear-gradient(135deg, ${admin.color}15, ${admin.color}05)` 
                          : undefined,
                        borderColor: icNumber === admin.ic ? admin.color : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Hospital Color Badge */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg"
                          style={{ backgroundColor: admin.color }}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{admin.label}</p>
                          <p className="text-sm text-gray-600">{admin.hospital}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{admin.city}</span>
                          </div>
                        </div>

                        <ChevronRight 
                          className="w-5 h-5 text-gray-300" 
                          style={{ color: icNumber === admin.ic ? admin.color : undefined }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Selection Modal */}
      <AnimatePresence>
        {showPatientModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPatientModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Select Patient</h3>
                    <p className="text-sm text-white/80">Choose from 8 patients</p>
                  </div>
                </div>
              </div>

              {/* Patient List */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {patientAccounts.map((patient, index) => (
                    <motion.div
                      key={patient.ic}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectPatient(patient)}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                        icNumber === patient.ic
                          ? 'border-transparent bg-gradient-to-r shadow-lg'
                          : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      style={{
                        background: icNumber === patient.ic 
                          ? `linear-gradient(135deg, ${patient.color}15, ${patient.color}05)` 
                          : undefined,
                        borderColor: icNumber === patient.ic ? patient.color : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Patient Color Badge */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg"
                          style={{ backgroundColor: patient.color }}
                        >
                          <User className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{patient.label}</p>
                          <p className="text-sm text-gray-600">{patient.desc}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{patient.city}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs font-mono text-gray-400">{patient.ic}</span>
                          </div>
                        </div>

                        <ChevronRight 
                          className="w-5 h-5 text-gray-300" 
                          style={{ color: icNumber === patient.ic ? patient.color : undefined }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleSelection && pendingLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRoleSelection(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-8 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-center">
                <button
                  onClick={() => setShowRoleSelection(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {/* IC Card Icon */}
                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <CreditCard className="w-10 h-10" />
                </motion.div>
                
                <h3 className="text-2xl font-bold mb-1">IC Card Verified</h3>
                <p className="text-white/80">Multiple roles detected for this IC</p>
                <p className="text-sm text-white/60 mt-2 font-mono">{pendingLogin.ic}</p>
              </div>

              {/* Role Selection */}
              <div className="p-8">
                <p className="text-center text-gray-600 mb-6">How would you like to login?</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Doctor Role */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('doctor')}
                    className="relative group p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
                  >
                    {/* Doctor Illustration */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      {/* Body */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-3xl" />
                      {/* White coat */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-10 bg-white rounded-t-2xl border-2 border-blue-200" />
                      {/* Head */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-amber-200 to-amber-300 rounded-full" />
                      {/* Hair */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-6 bg-gray-800 rounded-t-full" />
                      {/* Stethoscope */}
                      <motion.div
                        className="absolute bottom-3 left-1/2 -translate-x-1/2"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Stethoscope className="w-6 h-6 text-blue-500" />
                      </motion.div>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Doctor</h4>
                    <p className="text-sm text-gray-500">Access medical records & create diagnoses</p>
                    
                    {/* Hover glow */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </motion.button>

                  {/* Patient Role */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('patient')}
                    className="relative group p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20"
                  >
                    {/* Patient Illustration */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      {/* Body */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-emerald-400 to-emerald-500 rounded-t-3xl" />
                      {/* Hospital gown */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-10 bg-emerald-100 rounded-t-2xl border-2 border-emerald-200" />
                      {/* Head */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-amber-200 to-amber-300 rounded-full" />
                      {/* Hair */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-7 bg-gray-700 rounded-t-full" />
                      {/* Heart icon */}
                      <motion.div
                        className="absolute bottom-3 left-1/2 -translate-x-1/2"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <User className="w-6 h-6 text-emerald-500" />
                      </motion.div>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Patient</h4>
                    <p className="text-sm text-gray-500">View your health records & appointments</p>
                    
                    {/* Hover glow */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </motion.button>
                </div>
                
                <p className="text-center text-xs text-gray-400 mt-6">
                  You can switch roles anytime from your dashboard
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
