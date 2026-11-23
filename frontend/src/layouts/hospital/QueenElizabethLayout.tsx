import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LogOut, User, Menu, X, Crown, Clock, Award, MapPin,
  Sparkles, Shield, Heart, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { cn, formatUserDisplayName } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import LiveClock from '@/components/LiveClock'
import { getHospitalNavSections, findActiveNavItem } from './nav-config'

export default function QueenElizabethLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navScrollRef = useRef<HTMLDivElement>(null)

  const theme = getHospitalTheme('hospital-kk')
  const sections = getHospitalNavSections(user?.role)
  const activeItem = findActiveNavItem(location.pathname, user?.role)
  const displayName = formatUserDisplayName(user)

  const scrollNav = (direction: 'left' | 'right') => {
    navScrollRef.current?.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-rose-50 to-red-50">
      <header className="relative z-20">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-xl">
          <div className="border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-rose-100">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <LiveClock showDate showSeconds className="font-mono text-rose-100" dateClassName="text-rose-100" />
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-rose-100">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span>{theme.city}, {theme.state}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-0.5 rounded-full">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-amber-200 font-medium">System Active</span>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg border border-amber-300/50">
                  <Crown className="w-8 h-8 text-red-800" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">{theme.name}</h1>
                <div className="flex items-center gap-2.5 mt-1">
                  <Badge className="bg-amber-500/30 text-amber-100 border-amber-400/50 text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Sabah Referral Centre
                  </Badge>
                  <span className="text-rose-200 text-xs hidden sm:inline">{theme.tagline}</span>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center max-w-[46vw] overflow-hidden">
              <button
                type="button"
                onClick={() => scrollNav('left')}
                className="p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div ref={navScrollRef} className="flex items-center gap-1 bg-white/10 rounded-2xl p-1.5 border border-white/10 overflow-x-auto">
                {sections.flatMap((s) => s.items).map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap text-sm',
                        isActive
                          ? 'bg-white text-red-700 font-semibold shadow'
                          : 'text-rose-100 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.shortLabel}</span>
                    </Link>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollNav('right')}
                className="p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl"
                aria-label="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2.5 bg-white/15 rounded-2xl px-3.5 py-2 border border-white/20">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                  <User className="w-4 h-4 text-red-800" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-white leading-tight">{displayName}</p>
                  <p className="text-xs text-amber-200 capitalize">
                    {user?.specialization || user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-rose-100 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Exit</span>
              </Button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-xl"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-amber-200 shadow-xl overflow-hidden"
            >
              <nav className="p-4 space-y-3">
                {sections.map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-bold uppercase text-red-700 mb-1.5">{section.title}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm',
                              isActive ? 'bg-red-600 text-white font-medium' : 'text-gray-700 hover:bg-amber-50'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-md border border-amber-100 p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl flex items-center justify-center shadow">
              {(() => {
                const ActiveIcon = activeItem?.icon || Shield
                return <ActiveIcon className="w-6 h-6 text-white" />
              })()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeItem?.label || 'Dashboard'}</h2>
              <p className="text-sm text-gray-500">
                {user?.role === 'doctor' ? 'Medical Professional Portal' : 'Administrative Control Center'}
              </p>
            </div>
          </div>
          <Badge className="hidden sm:inline-flex bg-rose-50 text-rose-700 border-rose-200 px-3 py-1">
            <Heart className="w-3.5 h-3.5 mr-1.5" />
            MedLink Connected
          </Badge>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
