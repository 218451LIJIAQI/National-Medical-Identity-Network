import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth'

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
import PatientDashboard from '@/pages/patient/Dashboard'
import PatientRecords from '@/pages/patient/Records'
import PatientPrivacy from '@/pages/patient/Privacy'
import HospitalAdminDashboard from '@/pages/admin/HospitalAdmin'
import CentralAdminDashboard from '@/pages/admin/CentralAdmin'
import AuditLogs from '@/pages/admin/AuditLogs'
import EmergencyAccess from '@/pages/EmergencyAccess'
import AboutPage from '@/pages/About'

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
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
            path="/doctor/patient/:icNumber"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientTimeline />
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
