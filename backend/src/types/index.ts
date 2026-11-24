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

export interface QueueTicket {
  queueNo: string;
  name: string;
  icNumber: string;
  age: number;
  gender: 'M' | 'F';
  category: 'Green' | 'Yellow' | 'Red';
  waitTime: string;
  status: 'waiting' | 'in-progress' | 'called' | 'completed';
  complaint: string;
  createdAt: string;
}

export interface ClinicAppointment {
  id: string;
  patientName: string;
  icNumber: string;
  phone: string;
  date: string;
  time: string;
  type: 'follow-up' | 'new' | 'procedure' | 'review';
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

export interface NursingObservation {
  id: string;
  timestamp: string;
  bp: string;
  pulse: number;
  temp: number;
  rr: number;
  spo2: number;
  gcs: string;
  painScore: number;
  bloodSugar?: number;
  recordedBy: string;
}

export interface NursingProgressNote {
  id: string;
  timestamp: string;
  type: 'assessment' | 'intervention' | 'evaluation' | 'handover';
  content: string;
  nurse: string;
  priority: 'routine' | 'important' | 'urgent';
}

export interface PatientFluidBalance {
  oralMl: number;
  ivFluidMl: number;
  bloodMl: number;
  urineMl: number;
  drainMl: number;
  vomitusMl: number;
  updatedAt: string;
}

export interface PatientNursingChart {
  icNumber: string;
  ward: string;
  bedNumber: string;
  vitalsHistory: NursingObservation[];
  notes: NursingProgressNote[];
  ioChart: PatientFluidBalance;
}

export interface BillingLineItem {
  id: string;
  category: string;
  description: string;
  originalPrice: number;
  subsidyPercent: number;
}

export interface BillingReceipt {
  receiptNo: string;
  paidAt: string;
  paymentMethod: 'counter' | 'online' | 'waived';
  grossAmount: number;
  subsidyAmount: number;
  netAmount: number;
}

export interface PatientBillingAccount {
  icNumber: string;
  subsidyStatus: 'eligible' | 'not-eligible' | 'pending';
  items: BillingLineItem[];
  receipt: BillingReceipt | null;
}

export interface HospitalWard {
  id: string;
  name: string;
  nameMY: string;
  totalBeds: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  type: 'general' | 'icu' | 'maternity' | 'pediatric' | 'isolation';
}

export interface HospitalDepartment {
  id: string;
  name: string;
  nameMY: string;
  head: string;
  headTitle: string;
  staffCount: number;
  doctorCount: number;
  nurseCount: number;
  location: string;
  extension: string;
  operatingHours: string;
  status: 'active' | 'limited' | 'closed';
  specialties: string[];
}

export interface StaffRosterMember {
  id: string;
  name: string;
  icNumber: string;
  role: 'doctor' | 'nurse' | 'admin' | 'pharmacist' | 'technician';
  department: string;
  email: string;
  phone: string;
  status: 'active' | 'on_leave' | 'inactive';
  joinDate: string;
  specialization?: string;
  licenseNumber?: string;
}

export interface InventorySku {
  id: string;
  name: string;
  nameMY: string;
  category: 'medicine' | 'equipment' | 'consumable' | 'ppe';
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastRestocked: string;
  expiryDate?: string;
  supplier: string;
  pricePerUnit: number;
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

export function parseMyKadParts(rawIc: string): {
  formatted: string;
  dateOfBirth: string;
  age: number;
  gender: 'male' | 'female';
  placeOfBirthCode: number;
} | null {
  const digits = String(rawIc || '').replace(/[-\s]/g, '');
  if (!/^\d{12}$/.test(digits)) return null;

  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  const pb = parseInt(digits.slice(6, 8), 10);
  if (pb < 1 || pb > 99) return null;

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentTwoDigitYear = currentYear % 100;
  const year = yy <= currentTwoDigitYear ? 2000 + yy : 1900 + yy;
  const candidate = new Date(Date.UTC(year, mm - 1, dd));
  const isValidDate =
    !Number.isNaN(candidate.getTime()) &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === mm - 1 &&
    candidate.getUTCDate() === dd;

  if (!isValidDate) return null;

  const lastDigit = parseInt(digits[11], 10);
  const gender: 'male' | 'female' = lastDigit % 2 === 1 ? 'male' : 'female';
  const age = Math.max(0, currentYear - year);

  return {
    formatted: `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`,
    dateOfBirth: candidate.toISOString().split('T')[0],
    age,
    gender,
    placeOfBirthCode: pb,
  };
}

export function isValidMyKadIc(rawIc: string): boolean {
  return parseMyKadParts(rawIc) !== null;
}

export function inferDemographicsFromMyKad(icNumber: string): {
  dateOfBirth: string;
  gender: 'male' | 'female';
} {
  const parsed = parseMyKadParts(icNumber);
  if (parsed) {
    return {
      dateOfBirth: parsed.dateOfBirth,
      gender: parsed.gender,
    };
  }
  const digits = String(icNumber || '').replace(/\D/g, '');
  const gender: 'male' | 'female' =
    digits.length === 12 && parseInt(digits[11], 10) % 2 === 0 ? 'female' : 'male';
  return { dateOfBirth: '1990-01-01', gender };
}
