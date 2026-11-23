import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore, type UserRole } from '@/store/auth'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import HospitalLayout from '@/layouts/hospital'

import LandingPage from '@/pages/LandingV2'
import LoginPage from '@/pages/Login'
import AboutPage from '@/pages/About'
import EmergencyAccess from '@/pages/EmergencyAccess'
import HospitalVerification from '@/pages/HospitalVerification'

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
  Radiology,
  MedicalCertificate,
  Referral,
  Appointments,
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

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function HydrationLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <motion.div
        className="flex flex-col items-center gap-5"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-gray-700 font-semibold">Loading MedLink MY...</p>
          <p className="text-gray-400 text-xs mt-1">National Medical Identity Network</p>
        </div>
      </motion.div>
    </div>
  )
}

function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  if (!_hasHydrated) {
    return <HydrationLoader />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/emergency" element={<EmergencyAccess />} />
        <Route path="/verify" element={<HospitalVerification />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor/workstation" element={<HospitalWorkstation />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/records" element={<PatientRecords />} />
            <Route path="/patient/privacy" element={<PatientPrivacy />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['central_admin']} />}>
            <Route path="/admin/central" element={<CentralAdminDashboard />} />
            <Route path="/admin/patient-index" element={<PatientIndexPage />} />
            <Route path="/central/audit" element={<AuditLogs />} />
            <Route path="/central/emergency" element={<EmergencyManagement />} />
          </Route>
        </Route>

        <Route element={<HospitalLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/search" element={<PatientSearch />} />
            <Route path="/doctor/new-record" element={<NewRecordSearch />} />
            <Route path="/doctor/patient/:icNumber/new-record" element={<NewRecord />} />
            <Route path="/doctor/patient/:icNumber" element={<PatientTimeline />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['doctor', 'hospital_admin']} />}>
            <Route path="/doctor/queue" element={<QueueManagement />} />
            <Route path="/doctor/prescription" element={<EPrescription />} />
            <Route path="/doctor/lab" element={<LabOrders />} />
            <Route path="/doctor/mc" element={<MedicalCertificate />} />
            <Route path="/doctor/referral" element={<Referral />} />
            <Route path="/doctor/appointments" element={<Appointments />} />
            <Route path="/doctor/radiology" element={<Radiology />} />
            <Route path="/doctor/nursing" element={<NursingNotes />} />
            <Route path="/doctor/billing" element={<Billing />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['hospital_admin']} />}>
            <Route path="/admin/hospital" element={<HospitalAdminDashboard />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/beds" element={<BedManagement />} />
            <Route path="/admin/inventory" element={<InventoryManagement />} />
            <Route path="/admin/finance" element={<FinancialReports />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['hospital_admin', 'central_admin']} />}>
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
