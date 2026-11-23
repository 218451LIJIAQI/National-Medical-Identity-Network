import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Menu, X, Leaf, Sun } from 'lucide-react'
import { useState } from 'react'
import { cn, formatUserDisplayName } from '@/lib/utils'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import LiveClock from '@/components/LiveClock'
import { getHospitalNavSections, findActiveNavItem } from './nav-config'

export default function PenangMCLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const theme = getHospitalTheme('hospital-penang')
  const sections = getHospitalNavSections(user?.role)
  const activeItem = findActiveNavItem(location.pathname, user?.role)
  const displayName = formatUserDisplayName(user)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-emerald-600 via-teal-600 to-emerald-700 shadow-2xl shadow-emerald-500/25 transition-all duration-300 hidden lg:flex flex-col',
          sidebarExpanded ? 'w-60' : 'w-20'
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4 flex items-center justify-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg shrink-0">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          {sidebarExpanded && (
            <div className="ml-3 min-w-0">
              <span className="text-white font-bold text-sm block truncate">{theme.name}</span>
              <p className="text-white/75 text-xs truncate">{theme.city}, {theme.state}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 flex flex-col gap-3 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="px-3">
              {sidebarExpanded && (
                <p className="px-3 mb-1.5 text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!sidebarExpanded ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all',
                        isActive
                          ? 'bg-white text-emerald-700 font-semibold shadow-md'
                          : 'text-emerald-50 hover:bg-white/15'
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0 mx-auto lg:mx-0" />
                      {sidebarExpanded && <span className="text-sm truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/15">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-emerald-50 hover:bg-white/15 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarExpanded && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="lg:pl-20 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-emerald-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 text-emerald-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900">{activeItem?.label || theme.name}</h1>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hidden sm:inline-flex">
                    {theme.shortName}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-700">{theme.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <LiveClock />
              </div>

              <div className="flex items-center gap-2.5 bg-emerald-50/70 px-3 py-1.5 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
                  <p className="text-xs text-emerald-700 capitalize">
                    {user?.specialization || user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="lg:hidden text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pt-4 border-t border-emerald-100 space-y-3">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs font-bold uppercase text-emerald-700 mb-1.5">{section.title}</p>
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
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                            isActive ? 'bg-emerald-600 text-white font-medium' : 'text-gray-700 hover:bg-emerald-50'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          )}
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
