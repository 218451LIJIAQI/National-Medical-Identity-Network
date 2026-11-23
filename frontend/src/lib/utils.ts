import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getHospitalTheme } from './hospital-themes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatIC(ic: string): string {
  const trimmed = ic.trim()
  const digits = trimmed.replace(/-/g, '')
  if (/^\d{12}$/.test(digits)) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
  }
  return trimmed
}

export function maskIC(ic?: string): string {
  if (!ic) return '******-**-****'
  const clean = ic.replace(/-/g, '')
  if (clean.length >= 12) {
    return `${clean.slice(0, 6)}-${clean.slice(6, 8)}-****`
  }
  if (ic.length > 6) {
    return `${ic.slice(0, 6)}****`
  }
  return ic
}

export function parseMyKadDemographics(ic: string): {
  dateOfBirth: string
  age: number | null
  gender: 'male' | 'female'
} {
  const digits = ic.replace(/-/g, '')
  if (/^\d{12}$/.test(digits)) {
    const yy = parseInt(digits.slice(0, 2), 10)
    const mm = parseInt(digits.slice(2, 4), 10)
    const dd = parseInt(digits.slice(4, 6), 10)
    const nowYear = new Date().getFullYear()
    const century = yy <= nowYear % 100 ? 2000 : 1900
    const year = century + yy
    const iso = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    const valid = mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && !Number.isNaN(Date.parse(iso))
    const lastDigit = parseInt(digits.slice(11, 12), 10)
    return {
      dateOfBirth: valid ? iso : '1990-01-01',
      age: valid ? Math.max(0, nowYear - year) : null,
      gender: lastDigit % 2 === 1 ? 'male' : 'female',
    }
  }
  return { dateOfBirth: '1990-01-01', age: null, gender: 'male' }
}

export function formatTimeAgo(timestamp: string): string {
  const parsed = new Date(timestamp).getTime()
  if (Number.isNaN(parsed)) return '-'
  const diffMs = Date.now() - parsed
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function formatActorDisplayName(
  actorName?: string,
  actorId?: string,
  actorType?: string
): string {
  const raw = actorName || actorId || ''
  if (!raw || UUID_PATTERN.test(raw)) {
    if (actorType === 'doctor') return 'Healthcare Provider'
    if (actorType === 'hospital_admin') return 'Hospital Administrator'
    if (actorType === 'patient') return 'Patient'
    if (actorType === 'emergency') return 'Emergency Responder'
    return 'System User'
  }
  return raw
}

export function getRoleHomePath(role?: string, isHospitalVerified = true): string {
  if ((role === 'doctor' || role === 'hospital_admin') && !isHospitalVerified) {
    return '/verify'
  }
  switch (role) {
    case 'doctor':
      return '/doctor'
    case 'patient':
      return '/patient'
    case 'hospital_admin':
      return '/admin/hospital'
    case 'central_admin':
      return '/admin/central'
    default:
      return '/'
  }
}

export function deduplicateByWindow<T extends { timestamp: string }>(
  logs: T[],
  isSameGroup: (prev: T, curr: T) => boolean,
  windowMs = 5 * 60 * 1000
): T[] {
  const result: T[] = []
  for (const log of logs) {
    const prev = result[result.length - 1]
    if (prev && isSameGroup(prev, log)) {
      const timeDiff = Math.abs(new Date(prev.timestamp).getTime() - new Date(log.timestamp).getTime())
      if (timeDiff < windowMs) continue
    }
    result.push(log)
  }
  return result
}

export function getHospitalColor(hospitalId: string): string {
  return getHospitalTheme(hospitalId).primaryColor
}
