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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-6 border-b">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">MedLink MY</h1>
              <p className="text-xs text-gray-500">National Medical Network</p>
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || user?.icNumber}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={20} className="mr-3" />
              Logout
            </Button>
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
