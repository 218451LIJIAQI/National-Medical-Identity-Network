import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Building2 } from 'lucide-react'

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore()

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    const redirectPath = {
      doctor: '/doctor',
      patient: '/patient',
      hospital_admin: '/admin/hospital',
      central_admin: '/admin/central',
    }[user.role] || '/'
    
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">MedLink MY</h1>
            <p className="text-blue-100 text-sm">National Medical Identity Network</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Your IC is your<br />
              <span className="text-cyan-200">Universal Medical Key</span>
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-md">
              Access your complete medical history from any hospital in Malaysia. 
              One identity, all your health records.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">5</div>
              <div className="text-blue-100 text-sm">Connected Hospitals</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">10s</div>
              <div className="text-blue-100 text-sm">Record Retrieval</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-blue-100 text-sm">Data Sovereignty</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">🔒</div>
              <div className="text-blue-100 text-sm">Read-Only Access</div>
            </div>
          </div>
        </div>

        <div className="text-blue-100 text-sm">
          Built for GoDamLah 2.0: Identity Hackathon
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
