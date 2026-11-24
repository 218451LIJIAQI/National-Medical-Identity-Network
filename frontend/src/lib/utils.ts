import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getHospitalTheme } from './hospital-themes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function isPendingLabValue(result?: string | null): boolean {
  const normalized = String(result || '').trim()
  return !normalized || /^(?:pending\b|imaging scheduled\b|ordered$)/i.test(normalized)
}

export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function toDateInputValue(isoOrDate?: string | null): string {
  if (!isoOrDate) return ''
  const trimmed = String(isoOrDate).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10)
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatMYR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `RM ${safe.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatIC(ic: string): string {
  const trimmed = String(ic || '').trim()
  const digits = trimmed.replace(/[-\s]/g, '')
  if (/^\d{12}$/.test(digits)) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
  }
  return trimmed
}

function buildValidUtcDate(year: number, month: number, day: number): Date | null {
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }
  return candidate
}

export function parseMyKadDemographics(ic: string): {
  dateOfBirth: string
  gender: 'male' | 'female'
} | null {
  const digits = String(ic || '').replace(/[-\s]/g, '')
  if (!/^\d{12}$/.test(digits)) return null
  const yy = parseInt(digits.slice(0, 2), 10)
  const mm = parseInt(digits.slice(2, 4), 10)
  const dd = parseInt(digits.slice(4, 6), 10)
  const pb = parseInt(digits.slice(6, 8), 10)
  if (pb < 1 || pb > 99) return null

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentYY = currentYear % 100
  const todayUtcMs = Date.UTC(currentYear, now.getUTCMonth(), now.getUTCDate())

  let year = yy <= currentYY ? 2000 + yy : 1900 + yy
  let candidate = buildValidUtcDate(year, mm, dd)

  if (year >= 2000 && (!candidate || candidate.getTime() > todayUtcMs)) {
    year = 1900 + yy
    candidate = buildValidUtcDate(year, mm, dd)
  }

  if (!candidate) return null

  const gender: 'male' | 'female' = parseInt(digits[11], 10) % 2 === 1 ? 'male' : 'female'
  return {
    dateOfBirth: candidate.toISOString().split('T')[0],
    gender,
  }
}

export function isValidMyKad(ic: string): boolean {
  return parseMyKadDemographics(ic) !== null
}

export function maskIC(ic?: string): string {
  if (!ic) return '******-**-****'
  const clean = ic.replace(/-/g, '')
  if (clean.length >= 12 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 6)}-${clean.slice(6, 8)}-****`
  }
  if (ic.length > 6) {
    return `${ic.slice(0, 6)}****`
  }
  return ic
}

export function formatBloodPressure(
  sys?: number | null,
  dia?: number | null
): string | null {
  if (sys !== undefined && sys !== null && dia !== undefined && dia !== null) {
    return `${sys}/${dia}`
  }
  if (sys !== undefined && sys !== null) {
    return `${sys}/—`
  }
  if (dia !== undefined && dia !== null) {
    return `—/${dia}`
  }
  return null
}

export function formatTimeAgo(timestamp: string): string {
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return '—'
  const diffMs = Date.now() - time
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

export function downloadJsonFile(filename: string, payload: unknown): void {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const SAFE_E164_PHONE = /^\+\d{1,3}(?:[\s-]?\d{1,5}){2,4}$/
const SAFE_PLAIN_SIGNED_NUM = /^[+-]\d+(?:\.\d+)?$/

export function sanitizeCsvCell(val: string | number | boolean | null | undefined): string {
  const raw = val === null || val === undefined ? '' : String(val)
  const trimmed = raw.trimStart()
  let needsQuotePrefix = false

  if (/^[=@\t\r]/.test(trimmed) || /^[\t\r]/.test(raw)) {
    needsQuotePrefix = true
  } else if (/^[+-]/.test(trimmed)) {
    const isBenignPhoneOrNumber =
      (raw.replace(/\D/g, '').length >= 8 && SAFE_E164_PHONE.test(raw.trim())) ||
      SAFE_PLAIN_SIGNED_NUM.test(raw.trim())
    if (!isBenignPhoneOrNumber) {
      needsQuotePrefix = true
    }
  }

  const safe = needsQuotePrefix ? `'${raw}` : raw
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const lines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map(row => row.map(sanitizeCsvCell).join(',')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printHtmlDocument(title: string, bodyHtml: string): void {
  const printWindow = window.open('', '_blank', 'width=940,height=740')
  if (!printWindow) {
    window.print()
    return
  }
  const safeTitle = escapeHtml(title)
  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #0f172a; padding: 32px; line-height: 1.55; font-variant-numeric: tabular-nums; }
    h1, h2, h3 { margin: 0 0 8px 0; color: #0f172a; }
    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .meta { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`)
  printWindow.document.close()
}
