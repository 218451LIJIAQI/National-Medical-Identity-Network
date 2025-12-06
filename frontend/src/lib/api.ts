import { useAuthStore } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Get token from zustand store or fallback to localStorage
function getToken(): string | null {
  const storeToken = useAuthStore.getState().token
  if (storeToken) return storeToken
  
  // Fallback: try to get from localStorage directly
  const directToken = localStorage.getItem('medlink-token')
  if (directToken) return directToken
  
  // Fallback: try to get from zustand persist storage
  try {
    const stored = localStorage.getItem('medlink-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
    // ignore parse errors
  }
  
  return null
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken()

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
      // Handle 401 - only logout if we have a token (meaning it's expired/invalid)
      // Don't logout on login failure
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

// Auth API
export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ icNumber, password, role }),
    }),

}

// Central API
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

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: Record<string, unknown>
      hospitals: string[]
      lastUpdated: string
    }>(`/central/patient/${icNumber}`),

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

  // Search patient index (central admin) - shows which hospitals patient has visited
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

  // Get access logs for the current patient (who accessed my records)
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

  // Get privacy settings (blocked hospitals)
  getPrivacySettings: () =>
    fetchApi<Array<{
      hospitalId: string
      hospitalName: string
      city: string
      isBlocked: boolean
    }>>(`/central/privacy-settings`),

  // Update hospital access (block/unblock)
  setHospitalAccess: (hospitalId: string, isBlocked: boolean) =>
    fetchApi<{ message: string }>(`/central/privacy-settings/hospital-access`, {
      method: 'POST',
      body: JSON.stringify({ hospitalId, isBlocked }),
    }),

  // Get my activity logs (for doctors to see their own query history)
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

// Hospital API
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

  // Get patient info from a specific hospital
  getPatient: (hospitalId: string, icNumber: string) =>
    fetchApi<{
      icNumber: string
      fullName: string
      dateOfBirth: string
      gender: string
      bloodType: string
      phone?: string
      email?: string
      address?: string
      emergencyContact?: string
      emergencyPhone?: string
      allergies: string[]
      chronicConditions: string[]
    }>(`/hospitals/${hospitalId}/patients/${icNumber}`),

  // Get all patients in hospital
  getPatients: (hospitalId: string) =>
    fetchApi<Array<{
      icNumber: string
      fullName: string
      dateOfBirth: string
      gender: string
      bloodType: string
    }>>(`/hospitals/${hospitalId}/patients`),

  // Get patient records from a specific hospital
  getRecords: (hospitalId: string, icNumber: string) =>
    fetchApi<Array<{
      id: string
      icNumber: string
      hospitalId: string
      hospitalName: string
      doctorId: string
      doctorName: string
      visitDate: string
      visitType: string
      chiefComplaint: string
      diagnosis: string[]
      diagnosisCodes: string[]
      symptoms: string[]
      notes: string
      vitalSigns?: {
        bloodPressureSystolic?: number
        bloodPressureDiastolic?: number
        heartRate?: number
        temperature?: number
        weight?: number
        height?: number
        oxygenSaturation?: number
      }
      prescriptions: Array<{
        id: string
        medicationName: string
        dosage: string
        frequency: string
        duration: string
        quantity: number
        instructions: string
        isActive: boolean
      }>
      labReports: Array<{
        id: string
        testType: string
        testName: string
        result: string
        unit: string
        referenceRange: string
        isAbnormal: boolean
        reportDate: string
        notes: string
      }>
      isReadOnly: boolean
      sourceHospital: string
      createdAt: string
      updatedAt: string
    }>>(`/hospitals/${hospitalId}/records/${icNumber}`),

  // Get a single record by ID
  getRecord: (hospitalId: string, recordId: string) =>
    fetchApi<{
      id: string
      icNumber: string
      hospitalId: string
      hospitalName: string
      doctorId: string
      doctorName: string
      visitDate: string
      visitType: string
      chiefComplaint: string
      diagnosis: string[]
      diagnosisCodes: string[]
      symptoms: string[]
      notes: string
      vitalSigns?: Record<string, unknown>
      prescriptions: Array<Record<string, unknown>>
      labReports: Array<Record<string, unknown>>
      isReadOnly: boolean
      sourceHospital: string
    }>(`/hospitals/${hospitalId}/record/${recordId}`),

  // Create a new medical record
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

  // Get doctors in hospital
  getDoctors: (hospitalId: string) =>
    fetchApi<Array<{
      id: string
      icNumber: string
      fullName: string
      specialization: string
      department: string
      hospitalId: string
    }>>(`/hospitals/${hospitalId}/doctors`),

  // Get active prescriptions for patient
  getPrescriptions: (hospitalId: string, icNumber: string) =>
    fetchApi<Array<{
      id: string
      recordId: string
      medicationName: string
      dosage: string
      frequency: string
      duration: string
      quantity: number
      instructions: string
      isActive: boolean
    }>>(`/hospitals/${hospitalId}/prescriptions/${icNumber}`),
}

export default fetchApi
