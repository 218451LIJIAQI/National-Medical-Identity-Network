import { useAuthStore } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

function getToken(): string | null {
  const storeToken = useAuthStore.getState().token
  if (storeToken) return storeToken
  
  const directToken = localStorage.getItem('medlink-token')
  if (directToken) return directToken
  
  try {
    const stored = localStorage.getItem('medlink-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
  }
  
  return null
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth: boolean = false
): Promise<ApiResponse<T>> {
  const token = skipAuth ? null : getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        const hasToken = getToken()
        if (hasToken) {
          useAuthStore.getState().logout()
        }
      }
      return {
        success: false,
        error: data.error || 'An error occurred',
      }
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    return {
      success: false,
      error: 'Network error. Please try again.',
    }
  }
}

export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ icNumber, password, role }),
    }),

}

export const centralApi = {
  getHospitals: () =>
    fetchApi<Array<Record<string, unknown>>>('/central/hospitals'),

  getStats: () =>
    fetchApi<{ 
      totalPatients: number
      activeHospitals: number
      todayQueries: number
      yesterdayQueries: number
      queryChangePercent: number
      newHospitalsThisMonth: number
      avgResponseTime: number
    }>('/central/stats'),

  queryPatient: (icNumber: string) =>
    fetchApi<{
      icNumber: string
      querySteps: Array<{
        step: number
        action: string
        from: string
        to: string
        status: string
        timestamp: string
      }>
      hospitals: Array<{
        hospitalId: string
        hospitalName: string
        records: Array<Record<string, unknown>>
        recordCount: number
        status: string
        responseTime: number
      }>
      totalRecords: number
      queryTime: number
    }>(`/central/query/${icNumber}`),

  emergencyQuery: (icNumber: string) =>
    fetchApi<{
      found: boolean
      icNumber: string
      fullName?: string
      bloodType?: string
      allergies?: string[]
      chronicConditions?: string[]
      emergencyContact?: string
      emergencyPhone?: string
      hospitalsWithRecords?: number
      accessType?: string
      warning?: string
      message?: string
    }>(`/central/emergency/${icNumber}`, { method: 'GET' }, true),

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: Record<string, unknown>
      hospitals: string[]
      lastUpdated: string
    }>(`/central/patient/${icNumber}`),

  getAuditLogs: (params?: {
    actorId?: string
    targetIcNumber?: string
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.actorId) searchParams.set('actorId', params.actorId)
    if (params?.targetIcNumber) searchParams.set('targetIcNumber', params.targetIcNumber)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return fetchApi<Array<Record<string, unknown>>>(
      `/central/audit-logs?${searchParams.toString()}`
    )
  },

  getAllPatientIndexes: () =>
    fetchApi<Array<{
      icNumber: string
      hospitals: string[]
      lastUpdated: string
    }>>('/central/indexes'),

  searchPatientIndex: (icNumber: string) =>
    fetchApi<{
      icNumber: string
      patient: {
        fullName: string
        icNumber: string
        dateOfBirth: string
        gender: string
        bloodType: string
        allergies: string[]
        chronicConditions: string[]
      } | null
      hospitals: Array<{
        hospitalId: string
        hospitalName: string
        shortName: string
        city: string
        recordCount: number
        isActive: boolean
      }>
      totalHospitals: number
      totalRecords: number
      lastUpdated: string
    }>(`/central/index/${icNumber}`),

  getMyAccessLogs: (limit?: number) => {
    const searchParams = new URLSearchParams()
    if (limit) searchParams.set('limit', limit.toString())
    return fetchApi<Array<{
      id: string
      timestamp: string
      action: string
      actorId: string
      actorName: string
      actorType: string
      actorHospitalId?: string
      hospitalName: string
      targetIcNumber?: string
      details: string
      success: boolean
    }>>(`/central/my-access-logs?${searchParams.toString()}`)
  },

  getPrivacySettings: () =>
    fetchApi<Array<{
      hospitalId: string
      hospitalName: string
      city: string
      isBlocked: boolean
    }>>(`/central/privacy-settings`),

  setHospitalAccess: (hospitalId: string, isBlocked: boolean) =>
    fetchApi<{ message: string }>(`/central/privacy-settings/hospital-access`, {
      method: 'POST',
      body: JSON.stringify({ hospitalId, isBlocked }),
    }),

  getMyActivityLogs: (limit?: number) => {
    const searchParams = new URLSearchParams()
    if (limit) searchParams.set('limit', limit.toString())
    return fetchApi<Array<{
      id: string
      timestamp: string
      action: string
      targetIcNumber?: string
      patientName: string
      details: string
      success: boolean
    }>>(`/central/my-activity-logs?${searchParams.toString()}`)
  },
}

export const hospitalApi = {
  getHospital: (hospitalId: string) =>
    fetchApi<Record<string, unknown>>(`/hospitals/${hospitalId}`),

  getStats: (hospitalId: string) =>
    fetchApi<{
      totalPatients: number
      totalRecords: number
      totalDoctors: number
      activeDoctors?: number
      todayVisits?: number
      recentRecords: Array<Record<string, unknown>>
    }>(`/hospitals/${hospitalId}/stats`),

  createRecord: (hospitalId: string, record: {
    icNumber: string
    doctorId: string
    visitDate: string
    visitType: string
    chiefComplaint?: string
    diagnosis: string[]
    diagnosisCodes?: string[]
    symptoms?: string[]
    notes?: string
    vitalSigns?: Record<string, unknown>
  }) =>
    fetchApi<{ recordId: string }>(`/hospitals/${hospitalId}/records`, {
      method: 'POST',
      body: JSON.stringify(record),
    }),
}
