export type HospitalId =
  | 'hospital-kl'
  | 'hospital-penang'
  | 'hospital-jb'
  | 'hospital-kuching'
  | 'hospital-kk';

export type UserRole = 'patient' | 'doctor' | 'hospital_admin' | 'central_admin';

export type AuditAction =
  | 'query'
  | 'view'
  | 'create'
  | 'update'
  | 'login'
  | 'logout'
  | 'emergency_access';

export type ActorType = UserRole | 'system' | 'emergency';

export type VisitType = 'outpatient' | 'inpatient' | 'emergency';

export interface HospitalConfig {
  id: HospitalId;
  name: string;
  shortName: string;
  adminDisplayName: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  port: number;
  envVar: string;
  apiEndpoint: string;
}

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

export interface MedicalRecord {
  id: string;
  icNumber: string;
  hospitalId: string;
  hospitalName?: string;
  doctorId: string;
  doctorName?: string;
  visitDate: string;
  visitType: VisitType;
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

export interface CreateMedicalRecordInput {
  id?: string;
  icNumber: string;
  doctorId: string;
  visitDate?: string;
  visitType: VisitType;
  chiefComplaint?: string;
  diagnosis: string[];
  diagnosisCodes?: string[];
  symptoms?: string[];
  notes?: string;
  vitalSigns?: VitalSigns;
  prescriptions?: Prescription[];
  labReports?: LabReport[];
  followUpDate?: string;
  patientName?: string;
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

export interface User {
  id: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  passwordHash: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthenticatedUserProfile {
  id: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  doctorId?: string;
  fullName?: string;
  specialization?: string;
  department?: string;
}

export interface PatientIndex {
  icNumber: string;
  hospitals: string[];
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorId?: string;
  actorType: ActorType;
  actorHospitalId?: string;
  targetIcNumber?: string;
  targetHospitalId?: string;
  details: string;
  ipAddress: string;
  success: boolean;
}

export interface EnrichedAuditLog extends AuditLog {
  actorName: string;
  hospitalName: string;
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

export interface HospitalQueryResult {
  hospitalId: string;
  hospitalName: string;
  records: MedicalRecord[];
  recordCount: number;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  error?: string;
}

export interface CrossHospitalQueryResult {
  icNumber: string;
  querySteps: QueryFlowStep[];
  hospitals: HospitalQueryResult[];
  totalRecords: number;
  queryTime: number;
  accessDenied?: boolean;
  message?: string;
}

export interface CentralStats {
  totalPatients: number;
  activeHospitals: number;
  todayQueries: number;
  yesterdayQueries: number;
  queryChangePercent: number;
  newHospitalsThisMonth: number;
  avgResponseTime: number;
}

export interface HospitalStats {
  totalPatients: number;
  totalRecords: number;
  totalDoctors: number;
  activeDoctors: number;
  todayVisits: number;
  recentRecords: MedicalRecord[];
}

export interface JwtPayload {
  userId: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  iat?: number;
  exp?: number;
}
