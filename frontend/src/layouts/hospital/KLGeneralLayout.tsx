// ============================================================================
// KL General Hospital Layout - Enterprise Corporate Style
// Dual navigation: Fixed top header + Left sidebar
// Professional, data-driven, clean lines
// ============================================================================

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home, Search, FileText, LogOut, User, Activity,
  Menu, X, Bell, Settings, ChevronDown, MapPin, Clock, Shield,
  Users, Pill, FlaskConical, Calendar, ArrowRightLeft, Globe,
  ScanLine, Stethoscope, Receipt, Building, Bed, Package, DollarSign
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function KLGeneralLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  
  const theme = getHospitalTheme(user?.hospitalId)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Define navigation sections for doctor
  const doctorNavSections = [
    {
      title: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', labelMY: 'Papan Pemuka', path: '/doctor' },
        { icon: Globe, label: 'Patient Search', labelMY: 'Cari Rekod Kebangsaan', path: '/doctor/search' },
        { icon: FileText, label: 'New Record', labelMY: 'Rekod Baru', path: '/doctor/new-record' },
      ]
    },
    {
      title: 'Clinical',
      items: [
        { icon: Users, label: 'Queue', labelMY: 'Giliran Pesakit', path: '/doctor/queue' },
        { icon: Pill, label: 'e-Prescription', labelMY: 'e-Preskripsi', path: '/doctor/prescription' },
        { icon: FlaskConical, label: 'Lab Orders', labelMY: 'Ujian Makmal', path: '/doctor/lab' },
        { icon: ScanLine, label: 'Radiology', labelMY: 'Radiologi', path: '/doctor/radiology' },
        { icon: FileText, label: 'Medical Cert', labelMY: 'Sijil MC', path: '/doctor/mc' },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: ArrowRightLeft, label: 'Referral', labelMY: 'Rujukan', path: '/doctor/referral' },
        { icon: Calendar, label: 'Appointments', labelMY: 'Temujanji', path: '/doctor/appointments' },
        { icon: Stethoscope, label: 'Nursing', labelMY: 'Kejururawatan', path: '/doctor/nursing' },
        { icon: Receipt, label: 'Billing', labelMY: 'Bil & Subsidi', path: '/doctor/billing' },
      ]
    }
  ]

  const adminNavItems = [
    { icon: Home, label: 'Dashboard', labelMY: 'Papan Pemuka', path: '/admin/hospital' },
    { icon: Activity, label: 'Audit Logs', labelMY: 'Log Audit', path: '/admin/audit' },
    { icon: Users, label: 'Staff', labelMY: 'Kakitangan', path: '/admin/staff' },
    { icon: Building, label: 'Departments', labelMY: 'Jabatan', path: '/admin/departments' },
    { icon: Bed, label: 'Beds', labelMY: 'Katil', path: '/admin/beds' },
    { icon: Package, label: 'Inventory', labelMY: 'Inventori', path: '/admin/inventory' },
    { icon: DollarSign, label: 'Finance', labelMY: 'Kewangan', path: '/admin/finance' },
  ]

  const navItems = user?.role === 'doctor' ? [] : adminNavItems

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ================================================================== */}
      {/* TOP HEADER - Fixed Enterprise Navigation */}
      {/* ================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left Section: Logo & Hospital */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-md transition-colors lg:hidden"
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
                  <span>{theme.city}</span>
                </div>
              </div>
            </div>

            {/* Breadcrumb / Current Section */}
            <div className="hidden lg:flex items-center gap-2 ml-6 pl-6 border-l border-slate-200">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                {user?.role === 'doctor' ? 'Doctor Portal' : 'Admin Portal'}
              </Badge>
            </div>
          </div>

          {/* Center: Quick Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-600 gap-2">
              <Search className="w-4 h-4" />
              Quick Search
              <kbd className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500">⌘K</kbd>
            </Button>
          </div>

          {/* Right Section: Status & Profile */}
          <div className="flex items-center gap-3">
            {/* Time & Status */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-600 font-medium">Online</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-600 tabular-nums">{formatTime(currentTime)}</span>
              </div>
            </div>

            {/* Notifications */}
            <button 
              className="relative p-2 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-md flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user?.role === 'doctor' ? `Dr. ${user?.fullName?.split(' ').pop()}` : user?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">{user?.specialization || user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
                      <p className="text-xs text-slate-500">{user?.icNumber}</p>
                    </div>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button 
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

      {/* ================================================================== */}
      {/* LEFT SIDEBAR - Secondary Navigation */}
      {/* ================================================================== */}
      <aside
        className={cn(
          "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 lg:w-16"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {user?.role === 'doctor' ? (
              // Doctor Navigation with Sections
              doctorNavSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sidebarOpen && (
                    <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item, index) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      return (
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * (sectionIndex * 3 + index) }}
                        >
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                              isActive
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-3 border-blue-600 shadow-sm"
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                              isActive ? "bg-blue-100" : "bg-slate-100 group-hover:bg-slate-200"
                            )}>
                              <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-500")} />
                            </div>
                            {sidebarOpen && (
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{item.label}</span>
                                <p className="text-xs text-slate-400 truncate">{item.labelMY}</p>
                              </div>
                            )}
                            {isActive && sidebarOpen && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                            )}
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              // Admin Navigation (simple list)
              navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-3 border-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        isActive ? "bg-blue-100" : "bg-slate-100"
                      )}>
                        <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-500")} />
                      </div>
                      {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.label}</span>
                          <p className="text-xs text-slate-400 truncate">{item.labelMY}</p>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                )
              })
            )}
          </nav>

          {/* Sidebar Footer */}
          {sidebarOpen && (
            <div className="p-3 border-t border-slate-200">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">MedLink MY</span>
                </div>
                <p className="text-xs text-slate-600">
                  Connected to National Medical Identity Network
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================================== */}
      <main 
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        )}
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
