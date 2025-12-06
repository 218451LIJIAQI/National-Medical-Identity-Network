import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Building2, Shield, Zap, Globe, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AuthLayout() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  // Wait for hydration before checking auth
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Building2 className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </motion.div>
      </div>
    )
  }

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    const redirectPath = {
      doctor: '/doctor',
      patient: '/patient',
      hospital_admin: '/admin/hospital',
      central_admin: '/admin/central',
    }[user.role] || '/'
    
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      {/* Left side - Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
        
        <motion.div 
          className="flex items-center gap-3 relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Building2 className="w-8 h-8 text-white drop-shadow" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">MedLink MY</h1>
            <p className="text-blue-100 text-sm">National Medical Identity Network</p>
          </div>
        </motion.div>

        <motion.div 
          className="space-y-8 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div>
            <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">
              Your IC is your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-emerald-200">Universal Medical Key</span>
            </h2>
            <p className="mt-6 text-blue-100 text-lg max-w-md leading-relaxed">
              Access your complete medical history from any hospital in Malaysia. 
              One identity, all your health records.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '5', label: 'Connected Hospitals', icon: Globe },
              { value: '10s', label: 'Record Retrieval', icon: Zap },
              { value: '100%', label: 'Data Sovereignty', icon: Shield },
              { value: '🔒', label: 'Read-Only Access', icon: Lock },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-cyan-200" />
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </div>
                <div className="text-blue-100 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="text-blue-200 text-sm relative z-10 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-lg">🏆</span> Built for GoDamLah 2.0: Identity Hackathon
        </motion.div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <motion.div 
          className="absolute top-10 right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
