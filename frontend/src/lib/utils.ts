import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getHospitalTheme } from './hospital-themes'

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
  if (ic.includes('-')) return ic
  if (ic.length === 12) {
    return `${ic.slice(0, 6)}-${ic.slice(6, 8)}-${ic.slice(8)}`
  }
  return ic
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

export function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime()
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
