import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getHospitalTheme } from './hospital-themes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateString)
}

export function normalizeIC(ic: string): string {
  const digits = ic.replace(/[^0-9]/g, '')
  if (digits.length === 12) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
  }
  return ic.trim()
}

export function formatIC(ic?: string | null): string {
  if (!ic) return ''
  return normalizeIC(ic)
}

export function maskIcNumber(ic?: string | null): string {
  if (!ic) return 'N/A'
  const formatted = formatIC(ic)
  if (formatted.length >= 14) {
    return `${formatted.slice(0, 9)}-XXXX`
  }
  return formatted
}

export function formatDoctorName(name?: string | null): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Attending Physician'
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`
}

export function formatUserDisplayName(user?: {
  fullName?: string
  role?: string
  hospitalId?: string
} | null): string {
  if (!user) return 'Guest'
  if (user.fullName?.trim()) {
    return user.role === 'doctor' ? formatDoctorName(user.fullName) : user.fullName.trim()
  }
  if (user.role === 'hospital_admin') {
    return getHospitalTheme(user.hospitalId).adminDisplayName
  }
  if (user.role === 'central_admin') {
    return 'MOH National Administrator'
  }
  if (user.role === 'doctor') {
    return 'Attending Physician'
  }
  return 'Patient'
}

export function getHospitalColor(hospitalId: string): string {
  return getHospitalTheme(hospitalId).primaryColor
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

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
