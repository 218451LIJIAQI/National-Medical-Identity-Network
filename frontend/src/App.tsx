import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore, resetClinicalSessionContext } from '@/store/clinical'
import { useSettingsStore } from '@/store/settings'
import { getRoleHomePath } from '@/lib/utils'
import { Building2, Loader2 } from 'lucide-react'

import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import HospitalLayout from '@/layouts/hospital'

import LandingPage from '@/pages/LandingV2'
import LoginPage from '@/pages/Login'
import DoctorDashboard from '@/pages/doctor/dashboards'
import PatientSearch from '@/pages/doctor/PatientSearch'
import HospitalWorkstation from '@/pages/doctor/HospitalWorkstation'
import PatientTimeline from '@/pages/doctor/PatientTimeline'
import NewRecord from '@/pages/doctor/NewRecord'
import NewRecordSearch from '@/pages/doctor/NewRecordSearch'
import {
  QueueManagement,
  EPrescription,
  LabOrders,
  MedicalCertificate,
  Referral,
  Appointments,
  Radiology,
  NursingNotes,
  Billing,
} from '@/pages/doctor/modules'
import PatientDashboard from '@/pages/patient/Dashboard'
import PatientRecords from '@/pages/patient/Records'
import PatientPrivacy from '@/pages/patient/Privacy'
import HospitalAdminDashboard from '@/pages/admin/HospitalAdmin'
import CentralAdminDashboard from '@/pages/admin/CentralAdmin'
import PatientIndexPage from '@/pages/admin/PatientIndex'
import EmergencyManagement from '@/pages/admin/EmergencyManagement'
import AuditLogs from '@/pages/admin/AuditLogs'
import StaffManagement from '@/pages/admin/modules/StaffManagement'
import BedManagement from '@/pages/admin/modules/BedManagement'
import InventoryManagement from '@/pages/admin/modules/InventoryManagement'
import FinancialReports from '@/pages/admin/modules/FinancialReports'
import DepartmentManagement from '@/pages/admin/modules/DepartmentManagement'
import EmergencyAccess from '@/pages/EmergencyAccess'
import AboutPage from '@/pages/About'
import HospitalVerification from '@/pages/HospitalVerification'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function GlobalSessionAndAccessibilitySync() {
  const { language, fontSize, highContrast } = useSettingsStore()
  const { isAuthenticated, user, isHospitalVerified } = useAuthStore()
  const activePatient = useClinicalStore((s) => s.activePatient)

  useEffect(() => {
    const root = document.documentElement
    root.lang = language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : 'en-MY'
    root.dataset.fontScale = fontSize
    root.classList.toggle('high-contrast', highContrast)
  }, [language, fontSize, highContrast])

  useEffect(() => {
    if (!activePatient) return
    if (!isAuthenticated || !user || user.role !== 'doctor' || !isHospitalVerified) {
      resetClinicalSessionContext()
      return
    }
    if (activePatient.scopedHospitalId && activePatient.scopedHospitalId !== user.hospitalId) {
      resetClinicalSessionContext()
    }
  }, [isAuthenticated, user, isHospitalVerified, activePatient])

  return null
}

function SessionHydrationLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Initializing MedLink MY Session…</span>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) {
  const { isAuthenticated, isHospitalVerified, user, _hasHydrated } = useAuthStore()

  if (!_hasHydrated) {
    return <SessionHydrationLoader />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role, isHospitalVerified)} replace />
  }

  const requiresHospitalCheck = user.role === 'doctor' || user.role === 'hospital_admin'
  if (requiresHospitalCheck && !isHospitalVerified) {
    return <Navigate to="/verify" replace />
  }

  return <>{children}</>
}

const DOCTOR_CLINICAL_MODULES: Array<{ path: string; Component: React.ComponentType }> = [
  { path: '/doctor/queue', Component: QueueManagement },
  { path: '/doctor/prescription', Component: EPrescription },
  { path: '/doctor/lab', Component: LabOrders },
  { path: '/doctor/mc', Component: MedicalCertificate },
  { path: '/doctor/referral', Component: Referral },
  { path: '/doctor/appointments', Component: Appointments },
  { path: '/doctor/radiology', Component: Radiology },
  { path: '/doctor/nursing', Component: NursingNotes },
  { path: '/doctor/billing', Component: Billing },
]

const HOSPITAL_ADMIN_MODULES: Array<{ path: string; Component: React.ComponentType }> = [
  { path: '/admin/hospital', Component: HospitalAdminDashboard },
  { path: '/admin/staff', Component: StaffManagement },
  { path: '/admin/beds', Component: BedManagement },
  { path: '/admin/inventory', Component: InventoryManagement },
  { path: '/admin/finance', Component: FinancialReports },
  { path: '/admin/departments', Component: DepartmentManagement },
]

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalSessionAndAccessibilitySync />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/emergency" element={<EmergencyAccess />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/verify" element={<HospitalVerification />} />

        <Route
          path="/doctor/workstation"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <HospitalWorkstation />
            </ProtectedRoute>
          }
        />

        <Route element={<MainLayout />}>
          <Route path="/patient" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/records" element={<ProtectedRoute allowedRoles={['patient']}><PatientRecords /></ProtectedRoute>} />
          <Route path="/patient/privacy" element={<ProtectedRoute allowedRoles={['patient']}><PatientPrivacy /></ProtectedRoute>} />
          <Route path="/admin/central" element={<ProtectedRoute allowedRoles={['central_admin']}><CentralAdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/patient-index" element={<ProtectedRoute allowedRoles={['central_admin']}><PatientIndexPage /></ProtectedRoute>} />
          <Route path="/central/audit" element={<ProtectedRoute allowedRoles={['central_admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/central/emergency" element={<ProtectedRoute allowedRoles={['central_admin']}><EmergencyManagement /></ProtectedRoute>} />
        </Route>

        <Route element={<HospitalLayout />}>
          <Route path="/doctor" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/search" element={<ProtectedRoute allowedRoles={['doctor']}><PatientSearch /></ProtectedRoute>} />
          <Route path="/doctor/new-record" element={<ProtectedRoute allowedRoles={['doctor']}><NewRecordSearch /></ProtectedRoute>} />
          <Route path="/doctor/patient/:icNumber/new-record" element={<ProtectedRoute allowedRoles={['doctor']}><NewRecord /></ProtectedRoute>} />
          <Route path="/doctor/patient/:icNumber/records/:recordId/edit" element={<ProtectedRoute allowedRoles={['doctor']}><NewRecord /></ProtectedRoute>} />
          <Route path="/doctor/patient/:icNumber" element={<ProtectedRoute allowedRoles={['doctor']}><PatientTimeline /></ProtectedRoute>} />

          {DOCTOR_CLINICAL_MODULES.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <Component />
                </ProtectedRoute>
              }
            />
          ))}

          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {HOSPITAL_ADMIN_MODULES.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={['hospital_admin']}>
                  <Component />
                </ProtectedRoute>
              }
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
