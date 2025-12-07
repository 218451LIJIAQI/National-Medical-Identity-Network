import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

// Layouts
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import HospitalLayout from '@/layouts/hospital'

// Pages
import LandingPage from '@/pages/LandingV2'
import LoginPage from '@/pages/Login'
import DoctorDashboard from '@/pages/doctor/dashboards'
import PatientSearch from '@/pages/doctor/PatientSearch'
import HospitalWorkstation from '@/pages/doctor/HospitalWorkstation'
import PatientTimeline from '@/pages/doctor/PatientTimeline'
import NewRecord from '@/pages/doctor/NewRecord'
import NewRecordSearch from '@/pages/doctor/NewRecordSearch'
import QueuePage from '@/pages/doctor/QueuePage'
import PrescriptionPage from '@/pages/doctor/PrescriptionPage'
import LabOrdersPage from '@/pages/doctor/LabOrdersPage'
import MCPage from '@/pages/doctor/MCPage'
import ReferralPage from '@/pages/doctor/ReferralPage'
import AppointmentsPage from '@/pages/doctor/AppointmentsPage'
import RadiologyPage from '@/pages/doctor/RadiologyPage'
import NursingPage from '@/pages/doctor/NursingPage'
import BillingPage from '@/pages/doctor/BillingPage'
import PatientDashboard from '@/pages/patient/Dashboard'
import PatientRecords from '@/pages/patient/Records'
import PatientPrivacy from '@/pages/patient/Privacy'
import HospitalAdminDashboard from '@/pages/admin/HospitalAdmin'
import CentralAdminDashboard from '@/pages/admin/CentralAdmin'
import AuditLogs from '@/pages/admin/AuditLogs'
import StaffPage from '@/pages/admin/StaffPage'
import BedPage from '@/pages/admin/BedPage'
import InventoryPage from '@/pages/admin/InventoryPage'
import FinancePage from '@/pages/admin/FinancePage'
import DepartmentPage from '@/pages/admin/DepartmentPage'
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

        {/* Hospital Workstation - Full system (standalone) */}
        <Route
          path="/doctor/workstation"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <HospitalWorkstation />
            </ProtectedRoute>
          }
        />

        {/* Doctor routes - Using Hospital-specific layouts */}
        <Route element={<HospitalLayout />}>
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
          
          {/* Hospital Module Routes */}
          <Route
            path="/doctor/queue"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <QueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/prescription"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <PrescriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/lab"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <LabOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/mc"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <MCPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/referral"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <ReferralPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/radiology"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <RadiologyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/nursing"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <NursingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/billing"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
                <BillingPage />
              </ProtectedRoute>
            }
          />

          {/* Hospital Admin routes - Also use hospital-specific layouts */}
          <Route
            path="/admin/hospital"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <HospitalAdminDashboard />
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
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/beds"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <BedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/finance"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <FinancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <DepartmentPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Patient routes - Standard layout */}
        <Route element={<MainLayout />}>
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

          {/* Central Admin routes - Standard layout */}
          <Route
            path="/admin/central"
            element={
              <ProtectedRoute allowedRoles={['central_admin']}>
                <CentralAdminDashboard />
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
