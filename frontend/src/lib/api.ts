import { useAuthStore } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = useAuthStore.getState().token

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
      // Handle 401 - unauthorized
      if (response.status === 401) {
        useAuthStore.getState().logout()
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

// Auth API
export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ icNumber, password, role }),
    }),

  me: () => fetchApi<Record<string, unknown>>('/auth/me'),

  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
}

// Central API
export const centralApi = {
  getHospitals: () =>
    fetchApi<Array<Record<string, unknown>>>('/central/hospitals'),

  getStats: () =>
    fetchApi<{ totalPatients: number; activeHospitals: number; todayQueries: number }>(
      '/central/stats'
    ),

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

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: Record<string, unknown>
      hospitals: string[]
      lastUpdated: string
    }>(`/central/patient/${icNumber}`),

  checkDrugInteractions: (icNumber: string, newMedication: string) =>
    fetchApi<{
      interactions: Array<{
        drug1: string
        drug2: string
        severity: string
        description: string
        recommendation: string
        sourceHospital?: string
      }>
      currentMedications: Array<{
        medication: string
        hospital: string
        date: string
      }>
    }>('/central/drug-interactions', {
      method: 'POST',
      body: JSON.stringify({ icNumber, newMedication }),
    }),

  getAuditLogs: (params?: {
    actorId?: string
    targetIcNumber?: string
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.actorId) searchParams.set('actorId', params.actorId)
    if (params?.targetIcNumber) searchParams.set('targetIcNumber', params.targetIcNumber)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return fetchApi<Array<Record<string, unknown>>>(
      `/central/audit-logs?${searchParams.toString()}`
    )
  },
}

// Hospital API
export const hospitalApi = {
  getHospital: (hospitalId: string) =>
    fetchApi<Record<string, unknown>>(`/hospitals/${hospitalId}`),

  getStats: (hospitalId: string) =>
    fetchApi<{
      totalPatients: number
      totalRecords: number
      activeDoctors: number
      todayVisits: number
    }>(`/hospitals/${hospitalId}/stats`),

  getPatient: (hospitalId: string, icNumber: string) =>
    fetchApi<Record<string, unknown>>(`/hospitals/${hospitalId}/patients/${icNumber}`),

  getPatients: (hospitalId: string) =>
    fetchApi<Array<Record<string, unknown>>>(`/hospitals/${hospitalId}/patients`),

  createPatient: (hospitalId: string, patient: Record<string, unknown>) =>
    fetchApi(`/hospitals/${hospitalId}/patients`, {
      method: 'POST',
      body: JSON.stringify(patient),
    }),

  getRecords: (hospitalId: string, icNumber: string) =>
    fetchApi<Array<Record<string, unknown>>>(
      `/hospitals/${hospitalId}/records/${icNumber}`
    ),

  getRecord: (hospitalId: string, recordId: string) =>
    fetchApi<Record<string, unknown>>(`/hospitals/${hospitalId}/record/${recordId}`),

  createRecord: (hospitalId: string, record: Record<string, unknown>) =>
    fetchApi<{ recordId: string }>(`/hospitals/${hospitalId}/records`, {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  getDoctors: (hospitalId: string) =>
    fetchApi<Array<Record<string, unknown>>>(`/hospitals/${hospitalId}/doctors`),

  getPrescriptions: (hospitalId: string, icNumber: string) =>
    fetchApi<Array<Record<string, unknown>>>(
      `/hospitals/${hospitalId}/prescriptions/${icNumber}`
    ),
}

export default fetchApi
