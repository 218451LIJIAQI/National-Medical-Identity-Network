import { useState, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  LogOut, User, Zap, Sparkles, Star, Users, FileText,
  Stethoscope, ChevronLeft, ChevronRight, Clock, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  getHospitalNavSections,
  formatStaffDisplayName,
  formatStaffSubtitle,
  LiveClock,
  LiveDate,
  useHospitalHeaderMetrics,
  QuickCommandTrigger,
  ActivityNotificationsPopover,
  PortalPreferencesInline,
} from './shared'

export default function JohorSpecialistLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navScrollRef = useRef<HTMLDivElement>(null)

  const theme = getHospitalTheme(user?.hospitalId)
  const navSections = getHospitalNavSections(user?.role)
  const staffSubtitle = formatStaffSubtitle(user)
  const metrics = useHospitalHeaderMetrics(user?.hospitalId)

  const scrollNav = (direction: 'left' | 'right') => {
    navScrollRef.current?.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    })
  }

  const handleLogout = () => {
    authApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-28">
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

      <motion.header
        className="sticky top-0 z-40 mx-4 mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-200/30 border border-amber-100/50 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-300/40">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{theme.shortName}</h1>
                <p className="text-xs text-amber-600 font-medium">{theme.city}</p>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-3">
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-100">
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">
                    <LiveDate locale="en-MY" options={{ weekday: 'short', day: 'numeric', month: 'short' }} />
                  </p>
                  <p className="text-sm font-mono font-bold text-amber-800">
                    <LiveClock />
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>

              <div className="flex items-center gap-3 bg-white/80 px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <div className="text-center">
                    <p className="text-base font-bold text-amber-600">{metrics.loaded ? metrics.totalPatients : '—'}</p>
                    <p className="text-[10px] text-gray-500">Patients</p>
                  </div>
                </div>
                <div className="w-px h-7 bg-amber-200" />
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" />
                  <div className="text-center">
                    <p className="text-base font-bold text-green-600">{metrics.loaded ? metrics.totalRecords : '—'}</p>
                    <p className="text-[10px] text-gray-500">Records</p>
                  </div>
                </div>
                <div className="w-px h-7 bg-amber-200" />
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <div className="text-center">
                    <p className="text-base font-bold text-orange-600">{metrics.loaded ? metrics.todayVisits : '—'}</p>
                    <p className="text-[10px] text-gray-500">Today</p>
                  </div>
                </div>
                <div className="w-px h-7 bg-amber-200" />
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <div className="text-center">
                    <p className="text-base font-bold text-blue-600">{metrics.loaded ? metrics.totalDoctors : '—'}</p>
                    <p className="text-[10px] text-gray-500">Doctors</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <QuickCommandTrigger />
              <PortalPreferencesInline />
              <ActivityNotificationsPopover />
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 px-3.5 py-1.5 text-xs font-bold rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {user?.role === 'doctor' ? 'Doctor' : 'Admin'}
              </Badge>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded-2xl transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900">
                    {formatStaffDisplayName(user)}
                  </p>
                  <p className="text-xs text-amber-600">{staffSubtitle}</p>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl shadow-amber-200/40 border border-amber-100 py-2 z-50"
                  >
                    <div className="px-5 py-4 border-b border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user?.fullName}</p>
                          <p className="text-xs text-amber-600 font-mono">{user?.icNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 border-b border-amber-100 lg:hidden">
                      <PortalPreferencesInline />
                    </div>
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>{staffSubtitle}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-amber-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 px-4 pt-6">
        <Outlet />
      </main>

      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 flex justify-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-amber-300/30 border border-amber-100/50 px-3 py-4 overflow-hidden max-w-6xl">
          <div className="flex items-center">
            <button
              onClick={() => scrollNav('left')}
              className="flex-shrink-0 p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
              title="Scroll Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div ref={navScrollRef} className="flex items-center gap-2 overflow-x-auto px-4 scrollbar-hide flex-1">
              {navSections.map((section, sectionIndex) => (
                <div key={section.title} className="flex items-center gap-2">
                  {sectionIndex > 0 && (
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-amber-200 to-transparent mx-1" />
                  )}
                  <div className="flex flex-col items-center justify-center px-3 h-[76px] min-w-[60px] bg-gradient-to-b from-amber-100/80 to-amber-50/50 rounded-xl border border-amber-200/50">
                    <span className="text-[11px] font-black text-amber-600 uppercase tracking-wide whitespace-nowrap">
                      {section.title}
                    </span>
                    <div className="w-6 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mt-1.5" />
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link key={item.path} to={item.path}>
                        <div
                          className={cn(
                            'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl min-w-[80px] h-[76px] transition-all',
                            isActive
                              ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-300/40'
                              : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-bold">{item.shortLabel}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollNav('right')}
              className="flex-shrink-0 p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
              title="Scroll Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.nav>

      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  )
}
