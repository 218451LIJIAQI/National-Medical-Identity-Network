import { useAuthStore, type User, type UserRole } from '@/store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  status?: number
  accessDenied?: boolean
  notFound?: boolean
  verificationRequired?: boolean
  rateLimited?: boolean
  retryAfter?: number
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
  vitalSigns?: {
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    heartRate?: number
    temperature?: number
    respiratoryRate?: number
    oxygenSaturation?: number
    weight?: number
    height?: number
  }
  prescriptions?: PrescriptionDto[]
  labReports?: LabReportDto[]
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
    recentRecords: MedicalRecordDto[]
  }
}

export interface DoctorDto {
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

export interface QueueTicketDto {
  queueNo: string
  name: string
  icNumber: string
  age: number
  gender: 'M' | 'F'
  category: 'Green' | 'Yellow' | 'Red'
  waitTime: string
  status: 'waiting' | 'in-progress' | 'called' | 'completed'
  complaint: string
  createdAt: string
}

export interface ClinicAppointmentDto {
  id: string
  patientName: string
  icNumber: string
  phone: string
  date: string
  time: string
  type: 'follow-up' | 'new' | 'procedure' | 'review'
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
}

export interface PatientNursingChartDto {
  icNumber: string
  ward: string
  bedNumber: string
  vitalsHistory: Array<{
    id: string
    timestamp: string
    bp: string
    pulse: number
    temp: number
    rr: number
    spo2: number
    gcs: string
    painScore: number
    bloodSugar?: number
    recordedBy: string
  }>
  notes: Array<{
    id: string
    timestamp: string
    type: 'assessment' | 'intervention' | 'evaluation' | 'handover'
    content: string
    nurse: string
    priority: 'routine' | 'important' | 'urgent'
  }>
  ioChart: {
    oralMl: number
    ivFluidMl: number
    bloodMl: number
    urineMl: number
    drainMl: number
    vomitusMl: number
    updatedAt: string
  }
}

export interface PatientBillingAccountDto {
  icNumber: string
  subsidyStatus: 'eligible' | 'not-eligible' | 'pending'
  items: Array<{
    id: string
    category: string
    description: string
    originalPrice: number
    subsidyPercent: number
  }>
  receipt: {
    receiptNo: string
    paidAt: string
    paymentMethod: 'counter' | 'online' | 'waived'
    grossAmount: number
    subsidyAmount: number
    netAmount: number
  } | null
}

export interface HospitalWardDto {
  id: string
  name: string
  nameMY: string
  totalBeds: number
  occupied: number
  reserved: number
  maintenance: number
  type: 'general' | 'icu' | 'maternity' | 'pediatric' | 'isolation'
}

export interface HospitalDepartmentDto {
  id: string
  name: string
  nameMY: string
  head: string
  headTitle: string
  staffCount: number
  doctorCount: number
  nurseCount: number
  location: string
  extension: string
  operatingHours: string
  status: 'active' | 'limited' | 'closed'
  specialties: string[]
}

export interface StaffRosterMemberDto {
  id: string
  name: string
  icNumber: string
  role: 'doctor' | 'nurse' | 'admin' | 'pharmacist' | 'technician'
  department: string
  email: string
  phone: string
  status: 'active' | 'on_leave' | 'inactive'
  joinDate: string
  specialization?: string
  licenseNumber?: string
}

export interface InventorySkuDto {
  id: string
  name: string
  nameMY: string
  category: 'medicine' | 'equipment' | 'consumable' | 'ppe'
  sku: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  lastRestocked: string
  expiryDate?: string
  supplier: string
  pricePerUnit: number
}

export interface HospitalFinanceSummaryDto {
  hospitalId: string
  hospitalName: string
  fiscalYear: string
  settledReceiptsCount: number
  liveSettledRevenue: number
  liveSubsidyAbsorbed: number
  inventoryValuation: number
  monthlySeries: Array<{
    month: string
    mohAllocation: number
    patientCollection: number
    operatingExpense: number
    subsidyAbsorbed: number
  }>
  expenseBreakdown: Array<{
    category: string
    amount: number
    sharePercent: number
  }>
}

function getToken(): string | null {
  return useAuthStore.getState().token
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

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/verify-hospital') &&
        getToken()
      ) {
        useAuthStore.getState().logout()
      } else if (response.status === 403 && data.verificationRequired) {
        useAuthStore.getState().markHospitalUnverified()
      }

      return {
        success: false,
        status: response.status,
        error: data.error || 'An error occurred',
        data: data.data,
        accessDenied: Boolean(data.accessDenied),
        notFound: Boolean(data.notFound || response.status === 404),
        verificationRequired: Boolean(data.verificationRequired),
        rateLimited: Boolean(data.rateLimited || response.status === 429),
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
      status: 0,
      error: 'Network error. Please try again.',
    }
  }
}

export interface LoginResponseData {
  token?: string
  user?: User
  requiresRoleSelection?: boolean
  icNumber?: string
  availableRoles?: UserRole[]
}

export const authApi = {
  login: (icNumber: string, password: string, role?: string) =>
    fetchApi<LoginResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ icNumber, password, role }),
    }, true),

  verifyHospital: (payload: {
    method: 'credentials' | 'ic_chip'
    username?: string
    password?: string
    icNumber?: string
  }) =>
    fetchApi<{ token: string; user: User }>('/auth/verify-hospital', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  switchRole: (role: UserRole) =>
    fetchApi<{ token: string; user: User }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    fetchApi<{ user: User }>('/auth/me'),
}

export const centralApi = {
  getHospitals: () =>
    fetchApi<Array<Record<string, unknown>>>('/central/hospitals', {}, true),

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
        records: MedicalRecordDto[]
        recordCount: number
        status: 'success' | 'error' | 'timeout'
        responseTime: number
        error?: string
      }>
      totalRecords: number
      queryTime: number
      accessDenied?: boolean
      notFound?: boolean
      partialFailure?: boolean
      failedHospitals?: string[]
      message?: string
    }>(`/central/query/${encodeURIComponent(icNumber)}`),

  emergencyQuery: (icNumber: string) =>
    fetchApi<{
      found: boolean
      icNumber: string
      fullName?: string
      dateOfBirth?: string
      gender?: string
      bloodType?: string
      allergies?: string[]
      chronicConditions?: string[]
      recentDiagnoses?: Array<{
        diagnosis: string
        hospitalName: string
        visitDate: string
      }>
      currentMedications?: Array<{
        name: string
        dosage: string
        frequency: string
        instructions?: string
        hospitalName?: string
        visitDate?: string
      }>
      emergencyContact?: string
      emergencyPhone?: string
      hospitalsWithRecords?: number
      respondingHospitals?: number
      partialFailure?: boolean
      accessType?: string
      warning?: string
      message?: string
    }>(`/central/emergency/${encodeURIComponent(icNumber)}`, { method: 'GET' }, true),

  getPatient: (icNumber: string) =>
    fetchApi<{
      patient: Record<string, unknown>
      hospitals: string[]
      lastUpdated: string
    }>(`/central/patient/${encodeURIComponent(icNumber)}`),

  getAuditLogs: (params?: {
    actorId?: string
    targetIcNumber?: string
    hospitalId?: string
    action?: string
    status?: 'success' | 'failed'
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.actorId) searchParams.set('actorId', params.actorId)
    if (params?.targetIcNumber) searchParams.set('targetIcNumber', params.targetIcNumber)
    if (params?.hospitalId) searchParams.set('hospitalId', params.hospitalId)
    if (params?.action) searchParams.set('action', params.action)
    if (params?.status) searchParams.set('status', params.status)
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

export interface SaveRecordRequest {
  icNumber: string
  doctorId?: string
  visitDate: string
  visitType: string
  chiefComplaint?: string
  diagnosis: string[]
  diagnosisCodes?: string[]
  symptoms?: string[]
  notes?: string
  vitalSigns?: Record<string, unknown>
  prescriptions?: PrescriptionDto[]
  labReports?: LabReportDto[]
  followUpDate?: string
  patientName?: string
  dateOfBirth?: string
  gender?: 'male' | 'female'
  bloodType?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string[]
  chronicConditions?: string[]
  replaceAllergiesAndConditions?: boolean
}

export const hospitalApi = {
  getHospital: (hospitalId: string) =>
    fetchApi<HospitalDetailResponse>(`/hospitals/${encodeURIComponent(hospitalId)}`),

  getStats: (hospitalId: string) =>
    fetchApi<NonNullable<HospitalDetailResponse['stats']>>(
      `/hospitals/${encodeURIComponent(hospitalId)}/stats`
    ),

  getDoctors: (hospitalId: string) =>
    fetchApi<DoctorDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/doctors`),

  getPatient: (hospitalId: string, icNumber: string) =>
    fetchApi<{
      patient: Record<string, unknown>
      isLocal: boolean
      federatedFrom?: string[]
    }>(`/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}`),

  getRecord: (hospitalId: string, recordId: string) =>
    fetchApi<MedicalRecordDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/records/${encodeURIComponent(recordId)}`
    ),

  createRecord: (hospitalId: string, record: SaveRecordRequest) =>
    fetchApi<{ recordId: string; record: MedicalRecordDto }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/records`,
      {
        method: 'POST',
        body: JSON.stringify(record),
      }
    ),

  updateRecord: (hospitalId: string, recordId: string, record: Partial<SaveRecordRequest>) =>
    fetchApi<{ record: MedicalRecordDto }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(record),
      }
    ),

  // Outpatient Queue & Clinic Appointments
  getQueue: (hospitalId: string) =>
    fetchApi<QueueTicketDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/queue`),

  enqueuePatient: (
    hospitalId: string,
    payload: { name: string; icNumber: string; category: 'Green' | 'Yellow' | 'Red'; complaint: string }
  ) =>
    fetchApi<QueueTicketDto>(`/hospitals/${encodeURIComponent(hospitalId)}/queue`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateQueueTicket: (hospitalId: string, queueNo: string, status: QueueTicketDto['status']) =>
    fetchApi<QueueTicketDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/queue/${encodeURIComponent(queueNo)}`,
      { method: 'PUT', body: JSON.stringify({ status }) }
    ),

  removeQueueTicket: (hospitalId: string, queueNo: string) =>
    fetchApi<{ message: string }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/queue/${encodeURIComponent(queueNo)}`,
      { method: 'DELETE' }
    ),

  getAppointments: (hospitalId: string) =>
    fetchApi<ClinicAppointmentDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/appointments`),

  createAppointment: (
    hospitalId: string,
    payload: Omit<ClinicAppointmentDto, 'id' | 'status'>
  ) =>
    fetchApi<ClinicAppointmentDto>(`/hospitals/${encodeURIComponent(hospitalId)}/appointments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointmentStatus: (
    hospitalId: string,
    appointmentId: string,
    status: ClinicAppointmentDto['status']
  ) =>
    fetchApi<ClinicAppointmentDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/appointments/${encodeURIComponent(appointmentId)}`,
      { method: 'PUT', body: JSON.stringify({ status }) }
    ),

  // Patient-Scoped Nursing Chart & Billing
  getNursingChart: (hospitalId: string, icNumber: string) =>
    fetchApi<PatientNursingChartDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/nursing`
    ),

  addNursingVitals: (
    hospitalId: string,
    icNumber: string,
    payload: {
      bp: string
      pulse: number
      temp: number
      rr: number
      spo2: number
      gcs: string
      painScore: number
      bloodSugar?: number
      recordedBy?: string
    }
  ) =>
    fetchApi<PatientNursingChartDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/nursing/vitals`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  addNursingNote: (
    hospitalId: string,
    icNumber: string,
    payload: {
      type: 'assessment' | 'intervention' | 'evaluation' | 'handover'
      content: string
      priority: 'routine' | 'important' | 'urgent'
      nurse?: string
    }
  ) =>
    fetchApi<PatientNursingChartDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/nursing/notes`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  updateFluidBalance: (
    hospitalId: string,
    icNumber: string,
    payload: Partial<PatientNursingChartDto['ioChart']> & { ward?: string; bedNumber?: string }
  ) =>
    fetchApi<PatientNursingChartDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/nursing/io`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  getBillingAccount: (hospitalId: string, icNumber: string) =>
    fetchApi<PatientBillingAccountDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/billing`
    ),

  addBillingItem: (
    hospitalId: string,
    icNumber: string,
    payload: { category: string; description: string; originalPrice: number; subsidyPercent?: number }
  ) =>
    fetchApi<PatientBillingAccountDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/billing/items`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  removeBillingItem: (hospitalId: string, icNumber: string, itemId: string) =>
    fetchApi<PatientBillingAccountDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/billing/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    ),

  updateBillingSubsidy: (
    hospitalId: string,
    icNumber: string,
    subsidyStatus: PatientBillingAccountDto['subsidyStatus']
  ) =>
    fetchApi<PatientBillingAccountDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/billing/subsidy`,
      { method: 'PUT', body: JSON.stringify({ subsidyStatus }) }
    ),

  settleBillingAccount: (
    hospitalId: string,
    icNumber: string,
    paymentMethod: 'counter' | 'online' | 'waived'
  ) =>
    fetchApi<PatientBillingAccountDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(icNumber)}/billing/settle`,
      { method: 'POST', body: JSON.stringify({ paymentMethod }) }
    ),

  // Hospital Admin Modules
  getWards: (hospitalId: string) =>
    fetchApi<HospitalWardDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/wards`),

  createWard: (hospitalId: string, payload: Omit<HospitalWardDto, 'id'>) =>
    fetchApi<HospitalWardDto>(`/hospitals/${encodeURIComponent(hospitalId)}/wards`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWard: (hospitalId: string, wardId: string, payload: Partial<Omit<HospitalWardDto, 'id'>>) =>
    fetchApi<HospitalWardDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/wards/${encodeURIComponent(wardId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  getDepartments: (hospitalId: string) =>
    fetchApi<HospitalDepartmentDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/departments`),

  createDepartment: (hospitalId: string, payload: Omit<HospitalDepartmentDto, 'id'>) =>
    fetchApi<HospitalDepartmentDto>(`/hospitals/${encodeURIComponent(hospitalId)}/departments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDepartment: (
    hospitalId: string,
    deptId: string,
    payload: Partial<Omit<HospitalDepartmentDto, 'id'>>
  ) =>
    fetchApi<HospitalDepartmentDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/departments/${encodeURIComponent(deptId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  getStaff: (hospitalId: string) =>
    fetchApi<StaffRosterMemberDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/staff`),

  createStaff: (hospitalId: string, payload: Omit<StaffRosterMemberDto, 'id'>) =>
    fetchApi<StaffRosterMemberDto>(`/hospitals/${encodeURIComponent(hospitalId)}/staff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStaff: (hospitalId: string, staffId: string, payload: Partial<StaffRosterMemberDto>) =>
    fetchApi<StaffRosterMemberDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/staff/${encodeURIComponent(staffId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  deleteStaff: (hospitalId: string, staffId: string) =>
    fetchApi<{ message: string }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/staff/${encodeURIComponent(staffId)}`,
      { method: 'DELETE' }
    ),

  getInventory: (hospitalId: string) =>
    fetchApi<InventorySkuDto[]>(`/hospitals/${encodeURIComponent(hospitalId)}/inventory`),

  createInventoryItem: (hospitalId: string, payload: Omit<InventorySkuDto, 'id'>) =>
    fetchApi<InventorySkuDto>(`/hospitals/${encodeURIComponent(hospitalId)}/inventory`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateInventoryItem: (
    hospitalId: string,
    itemId: string,
    payload: Partial<Omit<InventorySkuDto, 'id'>>
  ) =>
    fetchApi<InventorySkuDto>(
      `/hospitals/${encodeURIComponent(hospitalId)}/inventory/${encodeURIComponent(itemId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  deleteInventoryItem: (hospitalId: string, itemId: string) =>
    fetchApi<{ message: string }>(
      `/hospitals/${encodeURIComponent(hospitalId)}/inventory/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    ),

  getFinanceSummary: (hospitalId: string) =>
    fetchApi<HospitalFinanceSummaryDto>(`/hospitals/${encodeURIComponent(hospitalId)}/finance`),
}
