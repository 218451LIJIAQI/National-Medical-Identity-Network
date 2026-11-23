import { useAuthStore, type User, type UserRole } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  status?: number
  accessDenied?: boolean
  rateLimited?: boolean
  retryAfter?: number
}

export interface PrescriptionPayload {
  id?: string
  recordId?: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string
  isActive: boolean
}

export interface LabReportPayload {
  id?: string
  recordId?: string
  testType: string
  testName: string
  result: string
  unit: string
  referenceRange: string
  isAbnormal: boolean
  reportDate: string
  notes: string
}

export interface MedicalRecordPayload {
  id: string
  icNumber: string
  hospitalId: string
  hospitalName?: string
  doctorId: string
  doctorName?: string
  visitDate: string
  visitType: 'outpatient' | 'inpatient' | 'emergency'
  chiefComplaint: string
  diagnosis: string[]
  diagnosisCodes?: string[]
  symptoms: string[]
  notes: string
  vitalSigns?: Record<string, number>
  prescriptions?: PrescriptionPayload[]
  labReports?: LabReportPayload[]
  followUpDate?: string
  isReadOnly?: boolean
  sourceHospital?: string
  createdAt?: string
  updatedAt?: string
}

export interface HospitalDetailResponse {
  id: string
  name: string
  shortName: string
  city: string
  state: string
  address: string
  phone: string
  email: string
  isActive: boolean
  stats?: {
    totalPatients: number
    totalRecords: number
    totalDoctors: number
    todayVisits?: number
  }
}

export interface HospitalDoctorItem {
  id: string
  icNumber: string
  fullName: string
  specialization: string
  licenseNumber: string
  hospitalId: string
  department: string
  phone: string
  email: string
  isActive: boolean
}

function getToken(): string | null {
  return useAuthStore.getState().token
}

const AUTH_EXEMPT_401 = ['/auth/login', '/auth/verify-hospital']

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

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const isExempt = AUTH_EXEMPT_401.some(p => endpoint.startsWith(p))
      if (response.status === 401 && !isExempt && getToken()) {
        useAuthStore.getState().logout()
      }
      return {
        success: false,
        status: response.status,
        error: data.error || 'An error occurred',
        data: data.data,
        accessDenied: Boolean(data.accessDenied),
        rateLimited: Boolean(data.rateLimited),
        retryAfter: typeof data.retryAfter === 'number' ? data.retryAfter : undefined,
      }
    }

    return {
      ...data,
      status: response.status,
    }
  } catch (error) {
    console.error('API Error:', error)
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    }
  }
}

export interface LoginResult {
  token?: string
  user?: User
  requiresRoleSelection?: boolean
  icNumber?: string
  availableRoles?: UserRole[]
}

export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ icNumber, password, role }),
    }),

  verifyHospital: (payload: {
    staffId?: string
    password?: string
    method?: 'credentials' | 'ic_card'
  }) =>
    fetchApi<{ verified: boolean; hospitalId: string; hospitalName: string }>(
      '/auth/verify-hospital',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  me: () => fetchApi<{ user: User }>('/auth/me'),

  switchRole: (role: UserRole) =>
    fetchApi<{ token: string; user: User }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
}

export const centralApi = {
  getHospitals: () =>
    fetchApi<Array<{
      id: string
      name: string
      shortName: string
      city: string
      state: string
      address: string
      phone: string
      email: string
      isActive: boolean
    }>>('/central/hospitals'),

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
      found: boolean
      accessDenied?: boolean
      message?: string
      querySteps: Array<{
        step: number
        action: string
        from: string
        to: string
        status: string
        timestamp: string
        data?: Record<string, unknown>
      }>
      hospitals: Array<{
        hospitalId: string
        hospitalName: string
        records: MedicalRecordPayload[]
        recordCount: number
        status: 'success' | 'error' | 'timeout'
        responseTime: number
        error?: string
      }>
      totalRecords: number
      queryTime: number
    }>(`/central/query/${encodeURIComponent(icNumber.trim())}`),

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
      activeMedications?: Array<{
        medicationName: string
        dosage: string
        frequency: string
        hospitalName: string
      }>
      hospitalsWithRecords?: number
      lastUpdated?: string
      accessType?: string
      warning?: string
      message?: string
    }>(`/central/emergency/${encodeURIComponent(icNumber.trim())}`, { method: 'GET' }, true),

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: {
        icNumber: string
        fullName: string
        dateOfBirth: string
        gender: 'male' | 'female'
        bloodType: string
        phone?: string
        email?: string
        address?: string
        emergencyContact?: string
        emergencyPhone?: string
        allergies: string[]
        chronicConditions: string[]
      } | null
      hospitals: string[]
      lastUpdated: string
    }>(`/central/patient/${encodeURIComponent(icNumber.trim())}`),

  getAuditLogs: (params?: {
    actorId?: string
    targetIcNumber?: string
    action?: string
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.actorId) searchParams.set('actorId', params.actorId)
    if (params?.targetIcNumber) searchParams.set('targetIcNumber', params.targetIcNumber)
    if (params?.action) searchParams.set('action', params.action)
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
    }>(`/central/index/${encodeURIComponent(icNumber.trim())}`),

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
    }>>('/central/privacy-settings'),

  setHospitalAccess: (hospitalId: string, isBlocked: boolean) =>
    fetchApi<{ message: string }>('/central/privacy-settings/hospital-access', {
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
    fetchApi<HospitalDetailResponse>(`/hospitals/${encodeURIComponent(hospitalId)}`),

  getStats: (hospitalId: string) =>
    fetchApi<{
      totalPatients: number
      totalRecords: number
      totalDoctors: number
      todayVisits: number
    }>(`/hospitals/${encodeURIComponent(hospitalId)}/stats`),

  getDoctors: (hospitalId: string) =>
    fetchApi<HospitalDoctorItem[]>(`/hospitals/${encodeURIComponent(hospitalId)}/doctors`),

  createRecord: (
    hospitalId: string,
    record: {
      icNumber: string
      doctorId: string
      visitDate: string
      visitType: string
      chiefComplaint?: string
      diagnosis: string[]
      diagnosisCodes?: string[]
      symptoms?: string[]
      notes?: string
      vitalSigns?: Record<string, number>
      prescriptions?: PrescriptionPayload[]
      labReports?: LabReportPayload[]
      followUpDate?: string
      patientName?: string
      dateOfBirth?: string
      gender?: 'male' | 'female'
      bloodType?: string
      emergencyContact?: string
      emergencyPhone?: string
      allergies?: string[]
      chronicConditions?: string[]
    }
  ) =>
    fetchApi<{ recordId: string; record: MedicalRecordPayload }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/records`,
      {
        method: 'POST',
        body: JSON.stringify(record),
      }
    ),

  updateRecord: (
    hospitalId: string,
    recordId: string,
    updates: Partial<MedicalRecordPayload>
  ) =>
    fetchApi<{ record: MedicalRecordPayload }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    ),
}
