import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home, Search, FileText, LogOut, User, Activity,
  Menu, X, Leaf, Heart, Sun, Users, Pill, FlaskConical,
  Calendar, ArrowRightLeft, ScanLine, Stethoscope, Receipt,
  Building2, Bed, Package, DollarSign
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function PenangMCLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const theme = getHospitalTheme(user?.hospitalId)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  const doctorNavSections = [
    {
      title: 'Main',
      icon: Leaf,
      items: [
        { icon: Home, label: 'Dashboard', path: '/doctor' },
        { icon: Search, label: 'Search', path: '/doctor/search' },
        { icon: FileText, label: 'New Record', path: '/doctor/new-record' },
      ]
    },
    {
      title: 'Clinical',
      icon: Heart,
      items: [
        { icon: Users, label: 'Queue', path: '/doctor/queue' },
        { icon: Pill, label: 'Prescription', path: '/doctor/prescription' },
        { icon: FlaskConical, label: 'Lab', path: '/doctor/lab' },
        { icon: ScanLine, label: 'Radiology', path: '/doctor/radiology' },
        { icon: FileText, label: 'MC', path: '/doctor/mc' },
      ]
    },
    {
      title: 'Management',
      icon: Calendar,
      items: [
        { icon: ArrowRightLeft, label: 'Referral', path: '/doctor/referral' },
        { icon: Calendar, label: 'Appointments', path: '/doctor/appointments' },
        { icon: Stethoscope, label: 'Nursing', path: '/doctor/nursing' },
        { icon: Receipt, label: 'Billing', path: '/doctor/billing' },
      ]
    }
  ]

  const adminNavSections = [
    {
      title: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', path: '/admin/hospital' },
        { icon: Activity, label: 'Audit', path: '/admin/audit' },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: Users, label: 'Staff', path: '/admin/staff' },
        { icon: Building2, label: 'Dept', path: '/admin/departments' },
        { icon: Bed, label: 'Beds', path: '/admin/beds' },
        { icon: Package, label: 'Inventory', path: '/admin/inventory' },
        { icon: DollarSign, label: 'Finance', path: '/admin/finance' },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

                        <motion.aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-emerald-600 via-teal-600 to-emerald-700 shadow-2xl shadow-emerald-500/30 transition-all duration-500",
          sidebarExpanded ? "w-56" : "w-20",
          "hidden lg:flex flex-col"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
                <div className="p-4 flex items-center justify-center">
          <motion.div
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Leaf className="w-6 h-6 text-white" />
          </motion.div>
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3"
            >
              <span className="text-white font-bold text-sm">{theme.shortName}</span>
              <p className="text-white/60 text-xs">Medical Centre</p>
            </motion.div>
          )}
        </div>

                <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto scrollbar-hide">
          {user?.role === 'doctor' ? (
            doctorNavSections.map((section, sectionIndex) => (
              <div key={section.title} className="px-3">
                {sidebarExpanded && (
                  <div className="px-3 mb-3 mt-4 first:mt-0">
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <section.icon className="w-4 h-4 text-white/80" />
                      <p className="text-xs font-bold text-white/90 uppercase tracking-wider">
                        {section.title}
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item, index) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * (sectionIndex * 3 + index) }}
                      >
                        <Link
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group",
                            isActive
                              ? "bg-white/25 text-white shadow-lg backdrop-blur-sm"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          )}
                          title={!sidebarExpanded ? item.label : undefined}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                              isActive ? "bg-white/20" : "group-hover:bg-white/10"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </motion.div>
                          {sidebarExpanded && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="font-medium whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                          {isActive && sidebarExpanded && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse ml-auto" />
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3">
              {adminNavSections.map((section, sectionIndex) => (
                <div key={section.title} className={sectionIndex > 0 ? 'mt-5 pt-5 border-t border-white/20' : ''}>
                  {sidebarExpanded && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${section.title === 'Main' ? 'bg-white' : 'bg-amber-400'}`} />
                      <p className={`text-xs uppercase tracking-widest font-bold ${section.title === 'Main' ? 'text-white' : 'text-amber-300'}`}>{section.title}</p>
                    </div>
                  )}
                  {section.items.map((item, index) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * (sectionIndex * 3 + index) }}
                      >
                        <Link
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group",
                            isActive
                              ? "bg-white/25 text-white shadow-lg backdrop-blur-sm"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                              isActive ? "bg-white/20" : "group-hover:bg-white/10"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </motion.div>
                          {sidebarExpanded && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="font-medium whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </nav>

                <div className="p-4 space-y-3">
                    <motion.div
            className={cn(
              "p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20",
              sidebarExpanded ? "flex items-center gap-3" : "flex justify-center"
            )}
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            {sidebarExpanded && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-white text-sm font-medium truncate">
                  Dr. {user?.fullName?.split(' ').pop()}
                </p>
                <p className="text-white/60 text-xs">{user?.specialization}</p>
              </motion.div>
            )}
          </motion.div>

                    <motion.button
            onClick={handleLogout}
            className={cn(
              "w-full p-3 text-white/70 hover:bg-red-500/20 hover:text-red-200 rounded-2xl transition-all",
              sidebarExpanded ? "flex items-center gap-3" : "flex justify-center"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            {sidebarExpanded && <span className="font-medium">Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

                        <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{theme.name}</p>
              <p className="text-white/70 text-xs">{theme.city}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

                {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-xl border-b border-emerald-100 p-4 shadow-xl"
          >
            {user?.role === 'doctor' ? (
              doctorNavSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <div className="flex items-center gap-2 bg-emerald-100 rounded-lg px-3 py-2 mb-2">
                    <section.icon className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      {section.title}
                    </p>
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl mb-1",
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))
            ) : (
              adminNavSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-2">{section.title}</p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl mb-2",
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))
            )}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-600 hover:bg-red-50 mt-2"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </motion.div>
        )}
      </div>

                        <main className="lg:pl-20 pt-16 lg:pt-0 min-h-screen relative z-10">
        <div className="p-6 lg:p-10">
                    <motion.div
            className="mb-8 flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-emerald-600 font-medium">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Welcome, Dr. {user?.fullName?.split(' ').pop()}
                <motion.span
                  className="inline-block ml-2"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  🌿
                </motion.span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                <Heart className="w-3 h-3 mr-1.5" />
                Caring for Penang
              </Badge>
            </div>
          </motion.div>

          <Outlet />
        </div>
      </main>
    </div>
  )
}
