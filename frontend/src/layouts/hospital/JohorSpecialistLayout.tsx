// ============================================================================
// Johor Specialist Hospital Layout - Modern Card-Based Style
// Bottom navigation with floating cards dashboard
// Touch-friendly, modular, contemporary design
// ============================================================================

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Badge } from '@/components/ui/badge'
import {
  Home, Search, FileText, LogOut, User, Activity,
  Zap, Sparkles, Star
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function JohorSpecialistLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const theme = getHospitalTheme(user?.hospitalId)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = user?.role === 'doctor' ? [
    { icon: Home, label: 'Home', path: '/doctor' },
    { icon: Search, label: 'Search', path: '/doctor/search' },
    { icon: FileText, label: 'Record', path: '/doctor/new-record' },
    { icon: User, label: 'Profile', path: '#profile' },
  ] : [
    { icon: Home, label: 'Home', path: '/admin/hospital' },
    { icon: Activity, label: 'Audit', path: '/admin/audit' },
    { icon: User, label: 'Profile', path: '#profile' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-28">
      {/* Background Mesh Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mesh" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1.5" fill="rgb(245, 158, 11)" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mesh)" />
        </svg>
      </div>

      {/* ================================================================== */}
      {/* FLOATING TOP HEADER */}
      {/* ================================================================== */}
      <motion.header 
        className="sticky top-0 z-40 mx-4 mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-200/30 border border-amber-100/50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Hospital */}
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-300/40"
                whileHover={{ rotate: 10, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{theme.shortName}</h1>
                <p className="text-xs text-amber-600 font-medium">{theme.city}</p>
              </div>
            </div>

            {/* Center Badge */}
            <div className="hidden md:block">
              <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200 px-4 py-1.5 text-sm font-bold rounded-full shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                {user?.role === 'doctor' ? 'Doctor Portal' : 'Admin Portal'}
              </Badge>
            </div>

            {/* User Profile */}
            <div className="relative">
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded-2xl transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900">
                    Dr. {user?.fullName?.split(' ').pop()}
                  </p>
                  <p className="text-xs text-amber-600">{user?.specialization}</p>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              </motion.button>

              {/* User Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl shadow-amber-200/40 border border-amber-100 py-2 z-50"
                  >
                    <div className="px-5 py-4 border-b border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user?.fullName}</p>
                          <p className="text-xs text-amber-600">{user?.icNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>{user?.specialization}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-amber-100">
                      <motion.button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                        whileHover={{ x: 4 }}
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ================================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================================== */}
      <main className="relative z-10 px-4 pt-6">
        <Outlet />
      </main>

      {/* ================================================================== */}
      {/* BOTTOM NAVIGATION - Floating Card Style */}
      {/* ================================================================== */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-amber-300/30 border border-amber-100/50 px-2 py-3">
          <div className="flex items-center justify-around">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isProfile = item.path === '#profile'
              
              if (isProfile) {
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-2xl min-w-[60px] transition-all",
                      "text-amber-400 hover:text-amber-600"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </motion.button>
                )
              }

              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-2xl min-w-[60px] transition-all",
                      isActive 
                        ? "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-300/40" 
                        : "text-amber-400 hover:text-amber-600 hover:bg-amber-50"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-bold">{item.label}</span>
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
                        layoutId="activeIndicator"
                      />
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </motion.nav>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  )
}
