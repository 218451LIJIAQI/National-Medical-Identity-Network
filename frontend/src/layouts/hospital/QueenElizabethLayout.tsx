import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home, Search, FileText, LogOut, User, Activity,
  Menu, X, Crown, Clock, Calendar, Award, MapPin, 
  Sparkles, Shield, Heart, Users, Pill, FlaskConical,
  ArrowRightLeft, ScanLine, Stethoscope, Receipt,
  ChevronLeft, ChevronRight, Building2, Bed, Package, DollarSign
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function QueenElizabethLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const navScrollRef = useRef<HTMLDivElement>(null)

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const scrollAmount = 200
      navScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }
  
  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  const doctorNavSections = [
    {
      title: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', path: '/doctor' },
        { icon: Search, label: 'Search', path: '/doctor/search' },
        { icon: FileText, label: 'New Record', path: '/doctor/new-record' },
      ]
    },
    {
      title: 'Clinical',
      items: [
        { icon: Users, label: 'Queue', path: '/doctor/queue' },
        { icon: Pill, label: 'Prescription', path: '/doctor/prescription' },
        { icon: FlaskConical, label: 'Lab', path: '/doctor/lab' },
        { icon: ScanLine, label: 'Radiology', path: '/doctor/radiology' },
        { icon: FileText, label: 'MC', path: '/doctor/mc' },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: ArrowRightLeft, label: 'Referral', path: '/doctor/referral' },
        { icon: Calendar, label: 'Appt', path: '/doctor/appointments' },
        { icon: Stethoscope, label: 'Nursing', path: '/doctor/nursing' },
        { icon: Receipt, label: 'Billing', path: '/doctor/billing' },
      ]
    }
  ]

  const adminNavItems = [
    { icon: Home, label: 'Dashboard', path: '/admin/hospital' },
    { icon: Activity, label: 'Audit', path: '/admin/audit' },
    { icon: Users, label: 'Staff', path: '/admin/staff' },
    { icon: Building2, label: 'Departments', path: '/admin/departments' },
    { icon: Bed, label: 'Beds', path: '/admin/beds' },
    { icon: Package, label: 'Inventory', path: '/admin/inventory' },
    { icon: DollarSign, label: 'Finance', path: '/admin/finance' },
  ]

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-red-50">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="royal-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="#B91C1C" />
                <path d="M30 10 L35 25 L30 20 L25 25 Z" fill="#B91C1C" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#royal-pattern)" />
          </svg>
        </div>
                <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-rose-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-red-200/20 to-amber-200/20 rounded-full blur-3xl" />
      </div>

                        <header className="relative z-20">
                <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        
                <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-2xl">
                    <div className="border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-300" />
                  <span className="text-rose-100">{formatDate()}</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span className="text-rose-100 font-mono">{formatTime()}</span>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span className="text-rose-100">{theme.city}, Sabah</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-200 text-xs font-medium">System Active</span>
                </div>
              </div>
            </div>
          </div>

                    <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-300/50">
                    <Crown className="w-9 h-9 text-red-800" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">{theme.name}</h1>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Badge className="bg-amber-500/30 text-amber-100 border-amber-400/50 text-xs px-2.5">
                      <Award className="w-3 h-3 mr-1.5" />
                      Royal Excellence
                    </Badge>
                    <span className="text-rose-200 text-sm hidden sm:inline">{theme.tagline}</span>
                  </div>
                </div>
              </div>

                            <nav className="hidden lg:flex items-center max-w-[50vw] overflow-hidden">
                <button
                  onClick={() => scrollNav('left')}
                  className="flex-shrink-0 p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div ref={navScrollRef} className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10 overflow-x-auto scrollbar-hide">
                  {user?.role === 'doctor' ? (
                    doctorNavSections.map((section, sectionIndex) => (
                      <div key={section.title} className="flex items-center gap-1">
                                                <div className="flex flex-col items-center justify-center px-3 py-1.5 bg-amber-500/20 rounded-lg border border-amber-400/30">
                          <span className="text-[10px] font-black text-amber-200 uppercase tracking-wide">
                            {section.title}
                          </span>
                          <div className="w-4 h-0.5 bg-amber-400 rounded-full mt-1" />
                        </div>
                                                {section.items.map((item) => {
                          const Icon = item.icon
                          const isActive = location.pathname === item.path
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap",
                                isActive
                                  ? "bg-white text-red-700 font-semibold shadow-lg"
                                  : "text-rose-100 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{item.label}</span>
                            </Link>
                          )
                        })}
                                                {sectionIndex < doctorNavSections.length - 1 && (
                          <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-400/50 to-transparent mx-2" />
                        )}
                      </div>
                    ))
                  ) : (
                    adminNavItems.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap",
                            isActive
                              ? "bg-white text-red-700 font-semibold shadow-lg"
                              : "text-rose-100 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      )
                    })
                  )}
                </div>
                <button
                  onClick={() => scrollNav('right')}
                  className="flex-shrink-0 p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>

                            <div className="flex items-center gap-4">
                                <motion.div 
                  className="hidden md:flex items-center gap-3 bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/20"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-inner">
                    <User className="w-5 h-5 text-red-800" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{user?.fullName}</p>
                    <p className="text-xs text-amber-200">{user?.specialization || user?.role}</p>
                  </div>
                </motion.div>

                                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-rose-200 hover:text-white hover:bg-white/10 rounded-xl"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Exit</span>
                </Button>

                                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

                <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white/95 backdrop-blur-lg border-b border-amber-200 shadow-xl overflow-hidden"
            >
              <nav className="p-4 space-y-1">
                {user?.role === 'doctor' ? (
                  doctorNavSections.map((section) => (
                    <div key={section.title} className="mb-4">
                      <div className="flex items-center gap-2 bg-gradient-to-r from-red-100 to-amber-50 rounded-lg px-4 py-2 mb-3 border border-red-200">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <p className="text-xs font-black text-red-700 uppercase tracking-wider">
                          {section.title}
                        </p>
                        <div className="flex-1" />
                        <div className="w-6 h-1 bg-gradient-to-r from-red-400 to-amber-400 rounded-full" />
                      </div>
                      {section.items.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1",
                              isActive
                                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium shadow-lg"
                                : "text-gray-700 hover:bg-amber-50"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  adminNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all",
                          isActive
                            ? "bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium shadow-lg"
                            : "text-gray-700 hover:bg-amber-50"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

                        <main className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
                    <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-red-100/50 border border-amber-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 via-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                    {(() => {
                      const allItems = user?.role === 'doctor' 
                        ? doctorNavSections.flatMap(s => s.items)
                        : adminNavItems
                      const currentNav = allItems.find(item => item.path === location.pathname)
                      if (currentNav) {
                        const Icon = currentNav.icon
                        return <Icon className="w-7 h-7 text-white" />
                      }
                      return <Shield className="w-7 h-7 text-white" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {(() => {
                        const allItems = user?.role === 'doctor' 
                          ? doctorNavSections.flatMap(s => s.items)
                          : adminNavItems
                        return allItems.find(item => item.path === location.pathname)?.label || 'Dashboard'
                      })()}
                    </h2>
                    <p className="text-gray-500 mt-0.5">
                      {user?.role === 'doctor' ? 'Medical Professional Portal' : 'Administrative Control Center'}
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <Badge className="bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200 px-3 py-1.5">
                    <Heart className="w-3.5 h-3.5 mr-1.5" />
                    Connected
                  </Badge>
                  <Badge className="bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200 px-3 py-1.5">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                    Royal Standard
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>

                    <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

                        <footer className="relative z-10 mt-auto">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        <div className="bg-gradient-to-r from-red-800 via-rose-800 to-red-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-medium">{theme.name}</span>
                </div>
                <span className="text-rose-300 text-sm hidden sm:inline">Excellence in Healthcare</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-rose-200">MedLink MY Network</span>
                <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-300">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
