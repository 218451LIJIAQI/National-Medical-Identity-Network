import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Patient, MedicalRecord, Prescription, LabReport, Doctor } from '../types';
import { CONFIG } from '../config';

// In-memory hospital database with JSON persistence
interface HospitalData {
  patients: Map<string, Patient>;
  medicalRecords: Map<string, MedicalRecord>;
  prescriptions: Map<string, Prescription>;
  labReports: Map<string, LabReport>;
  doctors: Map<string, Doctor>;
}

export class HospitalDatabase {
  private data: HospitalData;
  private hospitalId: string;
  private dbFile: string;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    
    const dataDir = CONFIG.database.hospitalDbPrefix;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbFile = path.join(dataDir, `${hospitalId}.json`);
    
    this.data = {
      patients: new Map(),
      medicalRecords: new Map(),
      prescriptions: new Map(),
      labReports: new Map(),
      doctors: new Map(),
    };
    
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, 'utf-8'));
        this.data.patients = new Map(raw.patients || []);
        this.data.medicalRecords = new Map(raw.medicalRecords || []);
        this.data.prescriptions = new Map(raw.prescriptions || []);
        this.data.labReports = new Map(raw.labReports || []);
        this.data.doctors = new Map(raw.doctors || []);
      }
    } catch (e) {
      console.log(`Starting fresh database for hospital ${this.hospitalId}`);
    }
  }

  private saveData(): void {
    try {
      const data = {
        patients: Array.from(this.data.patients.entries()),
        medicalRecords: Array.from(this.data.medicalRecords.entries()),
        prescriptions: Array.from(this.data.prescriptions.entries()),
        labReports: Array.from(this.data.labReports.entries()),
        doctors: Array.from(this.data.doctors.entries()),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to save hospital database:', e);
    }
  }

  // ============================================================================
  // Patient Operations
  // ============================================================================

  getPatient(icNumber: string): Patient | null {
    return this.data.patients.get(icNumber) || null;
  }

  getPatients(): Patient[] {
    return Array.from(this.data.patients.values());
  }

  // Alias for route compatibility
  getAllPatients(): Patient[] {
    return this.getPatients();
  }

  createPatient(patient: Patient): Patient {
    const now = new Date().toISOString();
    const newPatient = { ...patient, createdAt: now, updatedAt: now };
    this.data.patients.set(patient.icNumber, newPatient);
    this.saveData();
    return newPatient;
  }

  updatePatient(icNumber: string, updates: Partial<Patient>): Patient | null {
    const patient = this.data.patients.get(icNumber);
    if (!patient) return null;
    
    const updated = { ...patient, ...updates, updatedAt: new Date().toISOString() };
    this.data.patients.set(icNumber, updated);
    this.saveData();
    return updated;
  }

  // ============================================================================
  // Medical Record Operations
  // ============================================================================

  getMedicalRecord(id: string): MedicalRecord | null {
    return this.data.medicalRecords.get(id) || null;
  }

  getMedicalRecordsByPatient(icNumber: string): MedicalRecord[] {
    return Array.from(this.data.medicalRecords.values())
      .filter(r => r.icNumber === icNumber)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  }

  // Alias for route compatibility
  getRecordsByPatient(icNumber: string): MedicalRecord[] {
    return this.getMedicalRecordsByPatient(icNumber);
  }

  getRecordById(id: string): MedicalRecord | null {
    return this.getMedicalRecord(id);
  }

  createRecord(record: MedicalRecord): string {
    this.data.medicalRecords.set(record.id, record);
    this.saveData();
    return record.id;
  }

  createMedicalRecord(record: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>): MedicalRecord {
    const now = new Date().toISOString();
    const newRecord: MedicalRecord = {
      ...record,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.medicalRecords.set(newRecord.id, newRecord);
    this.saveData();
    return newRecord;
  }

  // ============================================================================
  // Prescription Operations
  // ============================================================================

  getPrescriptionsByRecord(recordId: string): Prescription[] {
    return Array.from(this.data.prescriptions.values())
      .filter(p => p.recordId === recordId);
  }

  getActivePrescriptionsByPatient(icNumber: string): Prescription[] {
    const recordIds = this.getMedicalRecordsByPatient(icNumber).map(r => r.id);
    return Array.from(this.data.prescriptions.values())
      .filter(p => recordIds.includes(p.recordId) && p.isActive);
  }

  // Alias for route compatibility
  getActivePrescriptions(icNumber: string): Prescription[] {
    return this.getActivePrescriptionsByPatient(icNumber);
  }

  createPrescription(prescription: Omit<Prescription, 'id'>): Prescription {
    const newPrescription: Prescription = {
      ...prescription,
      id: uuidv4(),
    };
    this.data.prescriptions.set(newPrescription.id, newPrescription);
    this.saveData();
    return newPrescription;
  }

  // ============================================================================
  // Lab Report Operations
  // ============================================================================

  getLabReportsByRecord(recordId: string): LabReport[] {
    return Array.from(this.data.labReports.values())
      .filter(l => l.recordId === recordId);
  }

  createLabReport(labReport: Omit<LabReport, 'id'>): LabReport {
    const newLabReport: LabReport = {
      ...labReport,
      id: uuidv4(),
    };
    this.data.labReports.set(newLabReport.id, newLabReport);
    this.saveData();
    return newLabReport;
  }

  // ============================================================================
  // Doctor Operations
  // ============================================================================

  getDoctor(id: string): Doctor | null {
    return this.data.doctors.get(id) || null;
  }

  getDoctorByIc(icNumber: string): Doctor | null {
    for (const doctor of this.data.doctors.values()) {
      if (doctor.icNumber === icNumber) return doctor;
    }
    return null;
  }

  getDoctors(): Doctor[] {
    return Array.from(this.data.doctors.values()).filter(d => d.isActive);
  }

  // Alias for route compatibility
  getAllDoctors(): Doctor[] {
    return this.getDoctors();
  }

  createDoctor(doctor: Doctor): Doctor {
    this.data.doctors.set(doctor.id, doctor);
    this.saveData();
    return doctor;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStats() {
    return {
      totalPatients: this.data.patients.size,
      totalRecords: this.data.medicalRecords.size,
      totalDoctors: Array.from(this.data.doctors.values()).filter(d => d.isActive).length,
      recentRecords: Array.from(this.data.medicalRecords.values())
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
        .slice(0, 10),
    };
  }
}

// Cache of hospital database instances
const hospitalDatabases = new Map<string, HospitalDatabase>();

export function getHospitalDb(hospitalId: string): HospitalDatabase {
  if (!hospitalDatabases.has(hospitalId)) {
    hospitalDatabases.set(hospitalId, new HospitalDatabase(hospitalId));
  }
  return hospitalDatabases.get(hospitalId)!;
}
