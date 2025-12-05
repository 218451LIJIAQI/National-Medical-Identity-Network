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

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50',
    moderate: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  }
  return colors[severity] || 'text-gray-600 bg-gray-50'
}
