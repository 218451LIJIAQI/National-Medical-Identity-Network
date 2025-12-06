import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import {
  Home,
  Search,
  FileText,
  LogOut,
  User,
  Building2,
  Shield,
  Menu,
  X,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Define navigation items based on user role
  const getNavItems = () => {
    switch (user?.role) {
      case 'doctor':
        return [
          { icon: Home, label: 'Dashboard', path: '/doctor' },
          { icon: Search, label: 'Patient Search', path: '/doctor/search' },
        ]
      case 'patient':
        return [
          { icon: Home, label: 'Dashboard', path: '/patient' },
          { icon: FileText, label: 'My Records', path: '/patient/records' },
          { icon: Shield, label: 'Privacy Settings', path: '/patient/privacy' },
        ]
      case 'hospital_admin':
        return [
          { icon: Home, label: 'Dashboard', path: '/admin/hospital' },
          { icon: Activity, label: 'Audit Logs', path: '/admin/audit' },
        ]
      case 'central_admin':
        return [
          { icon: Home, label: 'Dashboard', path: '/admin/central' },
          { icon: Activity, label: 'Audit Logs', path: '/admin/audit' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Premium Design */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-xl border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-xl shadow-gray-200/50",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Enhanced */}
          <motion.div 
            className="flex items-center gap-3 p-6 border-b border-gray-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div 
              className="w-11 h-11 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Building2 className="w-6 h-6 text-white drop-shadow" />
            </motion.div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">MedLink MY</h1>
              <p className="text-xs text-gray-500">National Medical Network</p>
            </div>
          </motion.div>

          {/* User info - Enhanced */}
          <motion.div 
            className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900">
                  {user?.fullName || user?.icNumber}
                </p>
                <p className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Navigation - Enhanced */}
          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Logout - Enhanced */}
          <div className="p-4 border-t border-gray-100">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-11"
                onClick={handleLogout}
              >
                <LogOut size={20} className="mr-3" />
                Logout
              </Button>
            </motion.div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
