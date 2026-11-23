import { useAuthStore, type User, type UserRole } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export interface VitalSignsDto {
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  temperature?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
}

export interface PrescriptionDto {
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

export interface LabReportDto {
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

export interface MedicalRecordDto {
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
  diagnosisCodes: string[]
  symptoms: string[]
  notes: string
  vitalSigns?: VitalSignsDto
  prescriptions?: PrescriptionDto[]
  labReports?: LabReportDto[]
  followUpDate?: string
  isReadOnly?: boolean
  sourceHospital?: string
  createdAt?: string
  updatedAt?: string
}

export interface PatientDto {
  icNumber: string
  fullName: string
  dateOfBirth: string
  gender: 'male' | 'female'
  bloodType: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  allergies: string[]
  chronicConditions: string[]
}

export interface RoleOptionDto {
  role: UserRole
  hospitalId?: string
  fullName?: string
}

export interface LoginResponseDto {
  token?: string
  user?: User
  requiresRoleSelection?: boolean
  roles?: RoleOptionDto[]
}

export interface QueryFlowStepDto {
  step: number
  action: string
  from: string
  to: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  timestamp: string
}

export interface HospitalQueryResultDto {
  hospitalId: string
  hospitalName: string
  records: MedicalRecordDto[]
  recordCount: number
  status: 'success' | 'error' | 'timeout'
  responseTime: number
  error?: string
}

export interface CrossHospitalQueryDto {
  icNumber: string
  querySteps: QueryFlowStepDto[]
  hospitals: HospitalQueryResultDto[]
  totalRecords: number
  queryTime: number
  accessDenied?: boolean
  message?: string
}

export interface EmergencyQueryDto {
  found: boolean
  icNumber: string
  fullName?: string
  dateOfBirth?: string
  gender?: string
  bloodType?: string
  allergies?: string[]
  chronicConditions?: string[]
  currentMedications?: Array<{
    medicationName: string
    dosage: string
    frequency: string
  }>
  emergencyContact?: string
  emergencyPhone?: string
  hospitalsWithRecords?: number
  accessType?: string
  warning?: string
  message?: string
}

export interface AuditLogDto {
  id: string
  timestamp: string
  action: string
  actorId?: string
  actorName?: string
  actorType: string
  actorHospitalId?: string
  hospitalName?: string
  targetIcNumber?: string
  targetHospitalId?: string
  details: string
  ipAddress?: string
  success: boolean
}

function getToken(): string | null {
  return useAuthStore.getState().token
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<ApiResponse<T>> {
  const token = skipAuth ? null : getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login')) {
        if (getToken()) {
          useAuthStore.getState().logout()
        }
      }
      return {
        success: false,
        error: data.error || 'Request failed',
        statusCode: response.status,
      }
    }

    return {
      ...data,
      statusCode: response.status,
    }
  } catch {
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    }
  }
}

export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<LoginResponseDto>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ icNumber, password, role }),
      },
      true
    ),

  me: () => fetchApi<User>('/auth/me'),

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
      apiEndpoint: string
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
    fetchApi<CrossHospitalQueryDto>(`/central/query/${encodeURIComponent(icNumber)}`),

  emergencyQuery: (icNumber: string) =>
    fetchApi<EmergencyQueryDto>(
      `/central/emergency/${encodeURIComponent(icNumber)}`,
      { method: 'GET' },
      true
    ),

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: PatientDto | null
      hospitals: string[]
      lastUpdated?: string
    }>(`/central/patient/${encodeURIComponent(icNumber)}`),

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
    const query = searchParams.toString()
    return fetchApi<AuditLogDto[]>(`/central/audit-logs${query ? `?${query}` : ''}`)
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
    }>(`/central/index/${encodeURIComponent(icNumber)}`),

  getMyAccessLogs: (limit?: number) => {
    const searchParams = new URLSearchParams()
    if (limit) searchParams.set('limit', limit.toString())
    const query = searchParams.toString()
    return fetchApi<AuditLogDto[]>(`/central/my-access-logs${query ? `?${query}` : ''}`)
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
    const query = searchParams.toString()
    return fetchApi<Array<{
      id: string
      timestamp: string
      action: string
      targetIcNumber?: string
      patientName: string
      details: string
      success: boolean
    }>>(`/central/my-activity-logs${query ? `?${query}` : ''}`)
  },
}

export const hospitalApi = {
  getHospital: (hospitalId: string) =>
    fetchApi<{
      id: string
      name: string
      shortName: string
      city: string
      state: string
      address: string
      phone: string
      email: string
      isActive: boolean
    }>(`/hospitals/${encodeURIComponent(hospitalId)}`),

  getStats: (hospitalId: string) =>
    fetchApi<{
      totalPatients: number
      totalRecords: number
      totalDoctors: number
      activeDoctors: number
      todayVisits: number
      recentRecords: MedicalRecordDto[]
    }>(`/hospitals/${encodeURIComponent(hospitalId)}/stats`),

  getDoctors: (hospitalId: string) =>
    fetchApi<Array<{
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
    }>>(`/hospitals/${encodeURIComponent(hospitalId)}/doctors`),

  createRecord: (
    hospitalId: string,
    record: {
      icNumber: string
      doctorId?: string
      visitDate?: string
      visitType: 'outpatient' | 'inpatient' | 'emergency'
      chiefComplaint?: string
      diagnosis: string[]
      diagnosisCodes?: string[]
      symptoms?: string[]
      notes?: string
      vitalSigns?: VitalSignsDto
      prescriptions?: PrescriptionDto[]
      labReports?: LabReportDto[]
      followUpDate?: string
      patientName?: string
    }
  ) =>
    fetchApi<{ recordId: string }>(`/hospitals/${encodeURIComponent(hospitalId)}/records`, {
      method: 'POST',
      body: JSON.stringify(record),
    }),
}
