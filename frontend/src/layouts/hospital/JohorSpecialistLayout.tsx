import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { LogOut, User, Zap, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { cn, formatUserDisplayName } from '@/lib/utils'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import LiveClock from '@/components/LiveClock'
import { getHospitalNavSections } from './nav-config'

export default function JohorSpecialistLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const navScrollRef = useRef<HTMLDivElement>(null)

  const theme = getHospitalTheme('hospital-jb')
  const sections = getHospitalNavSections(user?.role)
  const displayName = formatUserDisplayName(user)

  const scrollNav = (direction: 'left' | 'right') => {
    navScrollRef.current?.scrollBy({
      left: direction === 'left' ? -220 : 220,
      behavior: 'smooth',
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-24">
      <header className="sticky top-0 z-40 mx-4 pt-4">
        <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-lg shadow-amber-200/30 border border-amber-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-md">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{theme.name}</h1>
                <p className="text-xs text-amber-700 font-medium">{theme.city}, {theme.state}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2.5 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200/70">
                <Clock className="w-4 h-4 text-amber-600" />
                <LiveClock showDate className="text-xs font-mono font-bold text-amber-900" dateClassName="text-xs text-amber-700" />
              </div>

              <div className="flex items-center gap-2.5 bg-orange-50/80 px-3 py-1.5 rounded-2xl border border-orange-200/60">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
                  <p className="text-xs text-amber-700 capitalize">
                    {user?.specialization || user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed bottom-4 inset-x-4 z-40">
        <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-amber-500/20 border border-amber-200/80 px-2 py-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollNav('left')}
            className="p-2 rounded-xl text-amber-700 hover:bg-amber-50 shrink-0"
            aria-label="Scroll navigation left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div ref={navScrollRef} className="flex items-center gap-1 overflow-x-auto flex-1 py-0.5">
            {sections.flatMap((section) => section.items).map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-amber-50 hover:text-amber-800'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.shortLabel}</span>
                </Link>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollNav('right')}
            className="p-2 rounded-xl text-amber-700 hover:bg-amber-50 shrink-0"
            aria-label="Scroll navigation right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </div>
  )
}
