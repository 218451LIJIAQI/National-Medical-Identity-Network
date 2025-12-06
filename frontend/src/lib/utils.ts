import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatIC(ic: string): string {
  // Format IC number: XXXXXX-XX-XXXX
  if (ic.includes('-')) return ic
  if (ic.length === 12) {
    return `${ic.slice(0, 6)}-${ic.slice(6, 8)}-${ic.slice(8)}`
  }
  return ic
}

export function getHospitalColor(hospitalId: string): string {
  const colors: Record<string, string> = {
    'hospital-kl': '#3B82F6',
    'hospital-penang': '#10B981',
    'hospital-jb': '#F59E0B',
    'hospital-kuching': '#8B5CF6',
    'hospital-kk': '#EF4444',
  }
  return colors[hospitalId] || '#6B7280'
}

export function getHospitalBadgeClass(hospitalId: string): string {
  const classes: Record<string, string> = {
    'hospital-kl': 'hospital-badge-kl',
    'hospital-penang': 'hospital-badge-penang',
    'hospital-jb': 'hospital-badge-jb',
    'hospital-kuching': 'hospital-badge-kuching',
    'hospital-kk': 'hospital-badge-kk',
  }
  return classes[hospitalId] || 'bg-gray-100 text-gray-800'
}

