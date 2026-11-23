import { useState, useEffect } from 'react'
import {
  Home,
  Search,
  FileText,
  Activity,
  Users,
  Pill,
  FlaskConical,
  Calendar,
  ArrowRightLeft,
  ScanLine,
  Stethoscope,
  Receipt,
  Building2,
  Bed,
  Package,
  DollarSign,
  Leaf,
  Heart,
  type LucideIcon,
} from 'lucide-react'
import type { User } from '@/store/auth'

export interface HospitalNavItem {
  icon: LucideIcon
  label: string
  shortLabel: string
  labelMY: string
  desc: string
  path: string
}

export interface HospitalNavSection {
  title: string
  sectionIcon: LucideIcon
  items: HospitalNavItem[]
}

const DOCTOR_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    sectionIcon: Leaf,
    items: [
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/doctor' },
      { icon: Search, label: 'Patient Search', shortLabel: 'Search', labelMY: 'Cari Rekod Kebangsaan', desc: 'Find Records', path: '/doctor/search' },
      { icon: FileText, label: 'New Record', shortLabel: 'Record', labelMY: 'Rekod Baru', desc: 'Create Entry', path: '/doctor/new-record' },
    ],
  },
  {
    title: 'Clinical',
    sectionIcon: Heart,
    items: [
      { icon: Users, label: 'Queue', shortLabel: 'Queue', labelMY: 'Giliran Pesakit', desc: 'Giliran', path: '/doctor/queue' },
      { icon: Pill, label: 'e-Prescription', shortLabel: 'Rx', labelMY: 'e-Preskripsi', desc: 'e-Preskripsi', path: '/doctor/prescription' },
      { icon: FlaskConical, label: 'Lab Orders', shortLabel: 'Lab', labelMY: 'Ujian Makmal', desc: 'Ujian Makmal', path: '/doctor/lab' },
      { icon: ScanLine, label: 'Radiology', shortLabel: 'Imaging', labelMY: 'Radiologi', desc: 'Radiologi', path: '/doctor/radiology' },
      { icon: FileText, label: 'Medical Cert', shortLabel: 'MC', labelMY: 'Sijil MC', desc: 'Sijil MC', path: '/doctor/mc' },
    ],
  },
  {
    title: 'Management',
    sectionIcon: Calendar,
    items: [
      { icon: ArrowRightLeft, label: 'Referral', shortLabel: 'Refer', labelMY: 'Rujukan', desc: 'Rujukan', path: '/doctor/referral' },
      { icon: Calendar, label: 'Appointments', shortLabel: 'Appt', labelMY: 'Temujanji', desc: 'Temujanji', path: '/doctor/appointments' },
      { icon: Stethoscope, label: 'Nursing', shortLabel: 'Nurse', labelMY: 'Kejururawatan', desc: 'Kejururawatan', path: '/doctor/nursing' },
      { icon: Receipt, label: 'Billing', shortLabel: 'Bill', labelMY: 'Bil & Subsidi', desc: 'Bil & Subsidi', path: '/doctor/billing' },
    ],
  },
]

const ADMIN_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    sectionIcon: Home,
    items: [
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', desc: 'Overview', path: '/admin/hospital' },
      { icon: Activity, label: 'Audit Logs', shortLabel: 'Audit', labelMY: 'Log Audit', desc: 'Activity', path: '/admin/audit' },
    ],
  },
  {
    title: 'Hospital Management',
    sectionIcon: Building2,
    items: [
      { icon: Users, label: 'Staff', shortLabel: 'Staff', labelMY: 'Kakitangan', desc: 'Kakitangan', path: '/admin/staff' },
      { icon: Building2, label: 'Departments', shortLabel: 'Dept', labelMY: 'Jabatan', desc: 'Jabatan', path: '/admin/departments' },
      { icon: Bed, label: 'Beds', shortLabel: 'Beds', labelMY: 'Katil', desc: 'Katil', path: '/admin/beds' },
      { icon: Package, label: 'Inventory', shortLabel: 'Stock', labelMY: 'Inventori', desc: 'Inventori', path: '/admin/inventory' },
      { icon: DollarSign, label: 'Finance', shortLabel: 'Finance', labelMY: 'Kewangan', desc: 'Kewangan', path: '/admin/finance' },
    ],
  },
]

export function getHospitalNavSections(role?: string): HospitalNavSection[] {
  return role === 'doctor' ? DOCTOR_NAV_SECTIONS : ADMIN_NAV_SECTIONS
}

export function formatStaffDisplayName(user?: User | null, mode: 'short' | 'full' = 'short'): string {
  if (!user) return 'Staff'
  if (user.role === 'doctor') {
    const clean = (user.fullName || '').replace(/^Dr\.\s*/i, '').trim()
    if (!clean) return `Dr. ${user.icNumber}`
    return mode === 'full' ? `Dr. ${clean}` : `Dr. ${clean.split(' ').pop()}`
  }
  return user.fullName || user.icNumber
}

export function formatStaffSubtitle(user?: User | null): string {
  if (!user) return ''
  if (user.specialization) return user.specialization
  if (user.role === 'hospital_admin') return 'Hospital Administrator'
  return user.role.replace('_', ' ')
}

export function LiveClock({
  showSeconds = false,
  hour12 = true,
  className,
}: {
  showSeconds?: boolean
  hour12?: boolean
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), showSeconds ? 1000 : 60000)
    return () => clearInterval(timer)
  }, [showSeconds])

  const formatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  })

  return <span className={className}>{formatted}</span>
}

export function LiveDate({
  options = { weekday: 'short', month: 'short', day: 'numeric' },
  locale = 'en-US',
  className,
}: {
  options?: Intl.DateTimeFormatOptions
  locale?: string
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return <span className={className}>{now.toLocaleDateString(locale, options)}</span>
}
