// ============================================================================
// Core Types for National Medical Identity Network
// ============================================================================

// Hospital Information
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

// Patient Information
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

// Medical Record
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
  diagnosisCodes: string[]; // ICD-10 codes
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

// Vital Signs
export interface VitalSigns {
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
}

// Prescription
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

// Lab Report
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

// Doctor Information
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

// User (for authentication)
export interface User {
  id: string;
  icNumber: string;
  role: 'patient' | 'doctor' | 'hospital_admin' | 'central_admin';
  hospitalId?: string;
  passwordHash: string;
  lastLogin?: string;
  isActive: boolean;
}

// Central Index Entry
export interface PatientIndex {
  icNumber: string;
  hospitals: string[]; // Hospital IDs where patient has records
  lastUpdated: string;
}

// Audit Log Entry
export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'query' | 'view' | 'create' | 'update' | 'login' | 'logout';
  actorId: string;
  actorType: 'doctor' | 'patient' | 'hospital_admin' | 'central_admin' | 'system';
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

// Drug Interaction Warning
export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  recommendation: string;
  sourceHospital?: string;
  sourceDate?: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  icNumber: string;
  role: string;
  hospitalId?: string;
  iat?: number;
  exp?: number;
}
