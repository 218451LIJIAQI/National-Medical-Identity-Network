import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getHospitalTheme } from './hospital-themes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatIC(ic: string): string {
  const trimmed = String(ic || '').trim()
  const digits = trimmed.replace(/[-\s]/g, '')
  if (/^\d{12}$/.test(digits)) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
  }
  return trimmed
}

export function parseMyKadDemographics(ic: string): {
  dateOfBirth: string
  gender: 'male' | 'female'
} | null {
  const digits = String(ic || '').replace(/\D/g, '')
  if (digits.length !== 12) return null
  const yy = parseInt(digits.slice(0, 2), 10)
  const mm = parseInt(digits.slice(2, 4), 10)
  const dd = parseInt(digits.slice(4, 6), 10)
  const currentYY = new Date().getFullYear() % 100
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy
  const candidate = new Date(Date.UTC(year, mm - 1, dd))
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== mm - 1 ||
    candidate.getUTCDate() !== dd
  ) {
    return null
  }
  const gender: 'male' | 'female' = parseInt(digits[11], 10) % 2 === 1 ? 'male' : 'female'
  return {
    dateOfBirth: candidate.toISOString().split('T')[0],
    gender,
  }
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

export function formatTimeAgo(timestamp: string): string {
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return '-'
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

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const escapeCsv = (val: string | number | boolean | null | undefined): string => {
    const str = val === null || val === undefined ? '' : String(val)
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
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
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    window.print()
    return
  }
  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #111827; padding: 32px; line-height: 1.5; }
    h1, h2, h3 { margin: 0 0 8px 0; color: #0f172a; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`)
  printWindow.document.close()
}
