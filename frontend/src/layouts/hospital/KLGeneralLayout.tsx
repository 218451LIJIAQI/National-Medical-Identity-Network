import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search, LogOut, User, Menu, X, Bell, ChevronDown, MapPin, Clock, Shield,
} from 'lucide-react'
import { useState } from 'react'
import { cn, formatUserDisplayName } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import LiveClock from '@/components/LiveClock'
import { getHospitalNavSections } from './nav-config'

export default function KLGeneralLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const theme = getHospitalTheme('hospital-kl')
  const sections = getHospitalNavSections(user?.role)
  const displayName = formatUserDisplayName(user)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">{theme.shortName}</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-sm font-semibold text-slate-900">{theme.name}</h1>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span>{theme.city}, {theme.state}</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                {user?.role === 'doctor' ? 'Doctor Portal' : 'Admin Portal'}
              </Badge>
            </div>
          </div>

          {user?.role === 'doctor' && (
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 gap-2"
                onClick={() => navigate('/doctor/search')}
              >
                <Search className="w-4 h-4" />
                National Patient Search
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-600 font-medium">Online</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <LiveClock className="text-xs text-slate-600 tabular-nums" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(user?.role === 'doctor' ? '/doctor/queue' : '/admin/audit')}
              className="relative p-2 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-md flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-none">{displayName}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                    {user?.specialization || user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500 font-mono">{user?.icNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {sections.map((section) => (
              <div key={section.title}>
                {sidebarOpen && (
                  <div className="px-3 mb-2 mt-3 first:mt-0">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{section.title}</p>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-4 border-l-blue-600 shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                        title={!sidebarOpen ? item.label : undefined}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isActive ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-slate-200'
                        )}>
                          <Icon className={cn('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-500')} />
                        </div>
                        {sidebarOpen && (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{item.label}</span>
                            <p className="text-xs text-slate-400 truncate">{item.labelMY}</p>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {sidebarOpen && (
            <div className="p-3 border-t border-slate-200">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">MedLink MY</span>
                </div>
                <p className="text-xs text-slate-600">Connected to National Medical Identity Network</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={cn('pt-16 min-h-screen transition-all duration-300', sidebarOpen ? 'lg:pl-64' : 'lg:pl-16')}>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
