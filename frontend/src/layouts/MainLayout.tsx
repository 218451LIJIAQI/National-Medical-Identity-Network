import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  MapPin,
  Stethoscope,
  Database,
  Siren,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const theme = getHospitalTheme(user?.hospitalId)
  const isHospitalUser = user?.role === 'doctor' || user?.role === 'hospital_admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
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
          { icon: Database, label: 'Patient Index', path: '/admin/patient-index' },
          { icon: Siren, label: 'Emergency Access', path: '/central/emergency' },
          { icon: Activity, label: 'Audit Logs', path: '/central/audit' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <motion.button
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </motion.button>

            <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-2xl border-r border-gray-100/80 transform transition-all duration-500 ease-out lg:translate-x-0 shadow-2xl shadow-gray-300/30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
                    <motion.div
            className={`p-5 border-b ${isHospitalUser ? `bg-gradient-to-br ${theme.headerGradient}` : 'border-gray-100'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isHospitalUser ? (
              <div className="text-white">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex items-center justify-center shadow-lg font-bold text-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {theme.shortName}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-base leading-tight truncate">{theme.name}</h1>
                    <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{theme.city}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-2 py-0">
                    <Stethoscope className="w-2.5 h-2.5 mr-1" />
                    {user?.role === 'doctor' ? 'Doctor Portal' : 'Admin Portal'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/70">Online</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
              </div>
            )}
          </motion.div>

                    <motion.div
            className={`p-4 border-b border-gray-100 ${isHospitalUser ? theme.bgLight : 'bg-gradient-to-r from-gray-50 to-white'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isHospitalUser ? theme.bgMedium : 'bg-gradient-to-br from-blue-100 to-cyan-100'}`}>
                  <User className={`w-5 h-5 ${isHospitalUser ? theme.iconColor : 'text-blue-600'}`} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900">
                  {user?.role === 'doctor' ? `Dr. ${user?.fullName?.split(' ').pop() || user?.icNumber}` : user?.fullName || user?.icNumber}
                </p>
                <p className={`text-xs capitalize px-2 py-0.5 rounded-full inline-block mt-0.5 ${isHospitalUser ? theme.badgeClass : 'text-gray-500 bg-gray-100'}`}>
                  {user?.specialization || user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </motion.div>

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
                        ? isHospitalUser
                          ? `bg-gradient-to-r ${theme.buttonGradient} text-white shadow-lg ${theme.shadowColor}`
                          : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                        : `text-gray-600 hover:${isHospitalUser ? theme.bgLight : 'bg-gray-50'} hover:text-gray-900`
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

            {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

            <main className="lg:pl-72 relative z-10">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
