import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { LogOut, User, Menu, X, Hexagon, Wifi } from 'lucide-react'
import { useState } from 'react'
import { cn, formatUserDisplayName } from '@/lib/utils'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import LiveClock from '@/components/LiveClock'
import { getHospitalNavSections } from './nav-config'

export default function SarawakGeneralLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const theme = getHospitalTheme('hospital-kuching')
  const sections = getHospitalNavSections(user?.role)
  const displayName = formatUserDisplayName(user)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen transition-all duration-300 bg-white/85 backdrop-blur-xl border-r border-violet-100 shadow-xl shadow-violet-100/30',
          sidebarOpen ? 'w-72' : 'w-0 lg:w-20'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-violet-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Hexagon className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <h1 className="font-bold text-sm text-gray-900 truncate">{theme.name}</h1>
                  <p className="text-xs text-violet-600 truncate">{theme.city}, {theme.state}</p>
                </div>
              )}
            </div>
          </div>

          {sidebarOpen && (
            <div className="px-5 py-3 border-b border-violet-100 bg-violet-50/50 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-violet-700 font-medium">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                Borneo Node Online
              </span>
              <LiveClock showSeconds hour12={false} className="font-mono text-violet-800" />
            </div>
          )}

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {sections.map((section) => (
              <div key={section.title}>
                {sidebarOpen && (
                  <p className="px-3 mb-2 text-xs font-bold text-violet-600 uppercase tracking-wider">
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
                        title={!sidebarOpen ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25'
                            : 'text-gray-600 hover:bg-violet-50 hover:text-violet-900'
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {sidebarOpen && (
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            <p className={cn('text-xs truncate', isActive ? 'text-violet-200' : 'text-gray-400')}>
                              {item.labelMY}
                            </p>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-violet-100 space-y-2">
            {sidebarOpen && (
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-violet-600 capitalize truncate">
                    {user?.specialization || user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2 shrink-0" />
              {sidebarOpen && 'Logout'}
            </Button>
          </div>
        </div>
      </aside>

      <div className={cn('min-h-screen transition-all duration-300', sidebarOpen ? 'lg:pl-72' : 'lg:pl-20')}>
        <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-violet-100 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-violet-100 text-violet-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-xs font-medium text-violet-700">{theme.tagline}</span>
        </div>

        <main className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
