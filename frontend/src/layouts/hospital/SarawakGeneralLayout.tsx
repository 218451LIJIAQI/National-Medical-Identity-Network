import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Menu, X, Hexagon, Shield, Wifi, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  getHospitalNavSections,
  formatStaffDisplayName,
  formatStaffSubtitle,
  LiveClock,
  QuickCommandTrigger,
  ActivityNotificationsPopover,
  PortalPreferencesInline,
} from './shared'

export default function SarawakGeneralLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const theme = getHospitalTheme(user?.hospitalId)
  const navSections = getHospitalNavSections(user?.role)

  const handleLogout = () => {
    authApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen transition-all duration-500',
          'bg-white/80 backdrop-blur-xl border-r border-violet-100 shadow-xl shadow-violet-100/30',
          sidebarOpen ? 'w-72' : 'w-0 lg:w-20'
        )}
        initial={{ x: -100 }}
        animate={{ x: 0 }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-violet-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200/50">
                <Hexagon className="w-7 h-7 text-white" />
              </div>

              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-lg text-gray-800">{theme.shortName}</h1>
                  <p className="text-sm text-violet-600">{theme.city}</p>
                </div>
              )}
            </div>
          </div>

          {sidebarOpen && (
            <div className="px-6 py-4 border-b border-violet-100">
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">SYSTEM ONLINE</span>
                  </div>
                  <Wifi className="w-4 h-4 text-violet-500" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white rounded-lg p-2 border border-violet-100">
                    <p className="text-lg font-mono font-bold text-gray-800 tabular-nums">
                      <LiveClock showSeconds hour12={false} />
                    </p>
                    <p className="text-[10px] text-violet-600 uppercase">Local Time</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-violet-100">
                    <p className="text-lg font-mono font-bold text-emerald-600">99.9%</p>
                    <p className="text-[10px] text-violet-600 uppercase">Uptime</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.title} className="mb-4">
                {sidebarOpen && (
                  <div className="px-3 mb-3 mt-4 first:mt-0">
                    <div className="flex items-center gap-2 bg-violet-100 rounded-lg px-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                        {section.title}
                      </p>
                    </div>
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
                          'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group',
                          isActive
                            ? 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 border-l-4 border-violet-500 shadow-md shadow-violet-100/50'
                            : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                        )}
                        title={!sidebarOpen ? item.label : undefined}
                      >
                        <div
                          className={cn(
                            'p-2.5 rounded-lg transition-all',
                            isActive
                              ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                              : 'bg-violet-100 text-violet-600 group-hover:bg-violet-200'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {sidebarOpen && (
                          <div className="flex-1">
                            <span className="font-medium block">{item.label}</span>
                            <span className="text-xs text-gray-400">{item.desc}</span>
                          </div>
                        )}
                        {isActive && sidebarOpen && (
                          <div className="w-2 h-2 bg-violet-500 rounded-full" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {sidebarOpen && (
            <div className="p-4 border-t border-violet-100">
              <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200/50">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{formatStaffDisplayName(user)}</p>
                    <p className="text-xs text-violet-600 truncate">{formatStaffSubtitle(user)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-violet-500 rounded-xl text-white lg:hidden shadow-lg shadow-violet-200/50"
        aria-label="Toggle sidebar navigation"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <main
        className={cn(
          'min-h-screen transition-all duration-500 relative z-10',
          sidebarOpen ? 'lg:pl-72' : 'lg:pl-20'
        )}
      >
        <div className="p-6 lg:p-10">
          <div className="mb-6 flex items-center justify-end gap-3 flex-wrap">
            <QuickCommandTrigger />
            <PortalPreferencesInline />
            <ActivityNotificationsPopover />
          </div>
          <Outlet />
        </div>
      </main>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
