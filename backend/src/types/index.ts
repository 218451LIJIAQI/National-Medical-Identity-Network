export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  apiEndpoint: string;
  isActive: boolean;
}

export interface Patient {
  icNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string[];
  chronicConditions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  icNumber: string;
  hospitalId: string;
  hospitalName?: string;
  doctorId: string;
  doctorName?: string;
  visitDate: string;
  visitType: 'outpatient' | 'inpatient' | 'emergency';
  chiefComplaint: string;
  diagnosis: string[];
  diagnosisCodes: string[];
  symptoms: string[];
  notes: string;
  vitalSigns?: VitalSigns;
  prescriptions?: Prescription[];
  labReports?: LabReport[];
  followUpDate?: string;
  isReadOnly?: boolean;
  sourceHospital?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface Prescription {
  id?: string;
  recordId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  isActive: boolean;
}

export interface LabReport {
  id?: string;
  recordId?: string;
  testType: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  reportDate: string;
  notes: string;
}

export interface Doctor {
  id: string;
  icNumber: string;
  fullName: string;
  specialization: string;
  licenseNumber: string;
  hospitalId: string;
  department: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export type UserRole = 'patient' | 'doctor' | 'hospital_admin' | 'central_admin';

export interface User {
  id: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  passwordHash: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface PatientIndex {
  icNumber: string;
  hospitals: string[];
  lastUpdated: string;
}

export type AuditAction =
  | 'query'
  | 'view'
  | 'create'
  | 'update'
  | 'login'
  | 'logout'
  | 'verify'
  | 'emergency_access';

export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorId?: string;
  actorType: 'doctor' | 'patient' | 'hospital_admin' | 'central_admin' | 'system' | 'emergency';
  actorHospitalId?: string;
  targetIcNumber?: string;
  targetHospitalId?: string;
  details: string;
  ipAddress: string;
  success: boolean;
}

export interface QueryFlowStep {
  step: number;
  action: string;
  from: string;
  to: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp: string;
  data?: unknown;
}

export interface CrossHospitalQueryResult {
  icNumber: string;
  querySteps: QueryFlowStep[];
  hospitals: HospitalQueryResult[];
  totalRecords: number;
  queryTime: number;
  accessDenied?: boolean;
  notFound?: boolean;
  partialFailure?: boolean;
  failedHospitals?: string[];
  message?: string;
}

export interface HospitalQueryResult {
  hospitalId: string;
  hospitalName: string;
  records: MedicalRecord[];
  recordCount: number;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  hospitalVerified?: boolean;
  jti?: string;
  iat?: number;
  exp?: number;
}

export function normalizeIcNumber(raw: string): string {
  const trimmed = String(raw || '').trim();
  const digitsOnly = trimmed.replace(/[-\s]/g, '');
  if (/^\d{12}$/.test(digitsOnly)) {
    return `${digitsOnly.slice(0, 6)}-${digitsOnly.slice(6, 8)}-${digitsOnly.slice(8)}`;
  }
  return trimmed;
}

export function inferDemographicsFromMyKad(icNumber: string): {
  dateOfBirth: string;
  gender: 'male' | 'female';
} {
  const digits = icNumber.replace(/\D/g, '');
  if (digits.length === 12) {
    const yy = parseInt(digits.slice(0, 2), 10);
    const mm = parseInt(digits.slice(2, 4), 10);
    const dd = parseInt(digits.slice(4, 6), 10);
    const currentTwoDigitYear = new Date().getFullYear() % 100;
    const year = yy <= currentTwoDigitYear ? 2000 + yy : 1900 + yy;
    const candidate = new Date(Date.UTC(year, mm - 1, dd));
    const isValidDate =
      !Number.isNaN(candidate.getTime()) &&
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === mm - 1 &&
      candidate.getUTCDate() === dd;

    const lastDigit = parseInt(digits[11], 10);
    const gender: 'male' | 'female' = lastDigit % 2 === 1 ? 'male' : 'female';

    if (isValidDate) {
      return {
        dateOfBirth: candidate.toISOString().split('T')[0],
        gender,
      };
    }
    return { dateOfBirth: '1990-01-01', gender };
  }
  return { dateOfBirth: '1990-01-01', gender: 'male' };
}
