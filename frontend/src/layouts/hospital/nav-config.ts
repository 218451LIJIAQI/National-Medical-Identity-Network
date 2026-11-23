import {
  Home,
  Globe,
  FileText,
  Users,
  Pill,
  FlaskConical,
  ScanLine,
  ArrowRightLeft,
  Calendar,
  Stethoscope,
  Receipt,
  Activity,
  Building2,
  Bed,
  Package,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'

export interface HospitalNavItem {
  icon: LucideIcon
  label: string
  shortLabel: string
  labelMY: string
  path: string
}

export interface HospitalNavSection {
  title: string
  items: HospitalNavItem[]
}

export const DOCTOR_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    items: [
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', path: '/doctor' },
      { icon: Globe, label: 'Patient Search', shortLabel: 'Search', labelMY: 'Cari Rekod Kebangsaan', path: '/doctor/search' },
      { icon: FileText, label: 'New Record', shortLabel: 'Record', labelMY: 'Rekod Baru', path: '/doctor/new-record' },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { icon: Users, label: 'Queue', shortLabel: 'Queue', labelMY: 'Giliran Pesakit', path: '/doctor/queue' },
      { icon: Pill, label: 'e-Prescription', shortLabel: 'Rx', labelMY: 'e-Preskripsi', path: '/doctor/prescription' },
      { icon: FlaskConical, label: 'Lab Orders', shortLabel: 'Lab', labelMY: 'Ujian Makmal', path: '/doctor/lab' },
      { icon: ScanLine, label: 'Radiology', shortLabel: 'Imaging', labelMY: 'Radiologi', path: '/doctor/radiology' },
      { icon: FileText, label: 'Medical Cert', shortLabel: 'MC', labelMY: 'Sijil MC', path: '/doctor/mc' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: ArrowRightLeft, label: 'Referral', shortLabel: 'Referral', labelMY: 'Rujukan', path: '/doctor/referral' },
      { icon: Calendar, label: 'Appointments', shortLabel: 'Appt', labelMY: 'Temujanji', path: '/doctor/appointments' },
      { icon: Stethoscope, label: 'Nursing', shortLabel: 'Nursing', labelMY: 'Kejururawatan', path: '/doctor/nursing' },
      { icon: Receipt, label: 'Billing', shortLabel: 'Billing', labelMY: 'Bil & Subsidi', path: '/doctor/billing' },
    ],
  },
]

export const ADMIN_NAV_SECTIONS: HospitalNavSection[] = [
  {
    title: 'Main',
    items: [
      { icon: Home, label: 'Dashboard', shortLabel: 'Home', labelMY: 'Papan Pemuka', path: '/admin/hospital' },
      { icon: Activity, label: 'Audit Logs', shortLabel: 'Audit', labelMY: 'Log Audit', path: '/admin/audit' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: Users, label: 'Staff', shortLabel: 'Staff', labelMY: 'Kakitangan', path: '/admin/staff' },
      { icon: Building2, label: 'Departments', shortLabel: 'Dept', labelMY: 'Jabatan', path: '/admin/departments' },
      { icon: Bed, label: 'Beds', shortLabel: 'Beds', labelMY: 'Katil', path: '/admin/beds' },
      { icon: Package, label: 'Inventory', shortLabel: 'Stock', labelMY: 'Inventori', path: '/admin/inventory' },
      { icon: DollarSign, label: 'Finance', shortLabel: 'Finance', labelMY: 'Kewangan', path: '/admin/finance' },
    ],
  },
]

export function getHospitalNavSections(role?: string): HospitalNavSection[] {
  return role === 'doctor' ? DOCTOR_NAV_SECTIONS : ADMIN_NAV_SECTIONS
}

export function findActiveNavItem(pathname: string, role?: string): HospitalNavItem | undefined {
  const sections = getHospitalNavSections(role)
  for (const section of sections) {
    const exact = section.items.find((item) => item.path === pathname)
    if (exact) return exact
  }
  return undefined
}
