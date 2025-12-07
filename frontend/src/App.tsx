import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

// Layouts
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'

// Pages
import LandingPage from '@/pages/LandingV2'
import LoginPage from '@/pages/Login'
import DoctorDashboard from '@/pages/doctor/Dashboard'
import PatientSearch from '@/pages/doctor/PatientSearch'
import PatientTimeline from '@/pages/doctor/PatientTimeline'
import NewRecord from '@/pages/doctor/NewRecord'
import NewRecordSearch from '@/pages/doctor/NewRecordSearch'
import PatientDashboard from '@/pages/patient/Dashboard'
import PatientRecords from '@/pages/patient/Records'
import PatientPrivacy from '@/pages/patient/Privacy'
import HospitalAdminDashboard from '@/pages/admin/HospitalAdmin'
import CentralAdminDashboard from '@/pages/admin/CentralAdmin'
import AuditLogs from '@/pages/admin/AuditLogs'
import EmergencyAccess from '@/pages/EmergencyAccess'
import AboutPage from '@/pages/About'
import HospitalVerification from '@/pages/HospitalVerification'

// Premium Loading Component
function PremiumLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <motion.div 
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30"
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Building2 className="w-10 h-10 text-white drop-shadow-lg" />
          <motion.div
            className="absolute inset-0 rounded-3xl border-4 border-white/30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
        <div className="text-center">
          <motion.p 
            className="text-gray-600 font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading...
          </motion.p>
          <p className="text-gray-400 text-sm mt-1">MedLink MY</p>
        </div>
      </motion.div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  // Try localStorage as fallback if zustand state is empty
  let effectiveUser = user
  let effectiveAuth = isAuthenticated
  
  if (!user) {
    const storedUser = localStorage.getItem('medlink-user')
    if (storedUser) {
      try {
        effectiveUser = JSON.parse(storedUser)
        effectiveAuth = true
      } catch {
        // Invalid JSON
      }
    }
  }

  // Wait for hydration before checking auth
  if (!_hasHydrated) {
    return <PremiumLoader />
  }

  if (!effectiveAuth) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && effectiveUser && !allowedRoles.includes(effectiveUser.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/emergency" element={<EmergencyAccess />} />
        
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        
        {/* Hospital Verification - Second layer authentication (standalone, no AuthLayout redirect) */}
        <Route path="/verify" element={<HospitalVerification />} />

        {/* Doctor routes */}
        <Route element={<MainLayout />}>
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/search"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/new-record"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <NewRecordSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patient/:icNumber/new-record"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <NewRecord />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patient/:icNumber"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientTimeline />
              </ProtectedRoute>
            }
          />

          {/* Patient routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/records"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientRecords />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/privacy"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientPrivacy />
              </ProtectedRoute>
            }
          />

          {/* Hospital Admin routes */}
          <Route
            path="/admin/hospital"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <HospitalAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Central Admin routes */}
          <Route
            path="/admin/central"
            element={
              <ProtectedRoute allowedRoles={['central_admin']}>
                <CentralAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['central_admin', 'hospital_admin']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
