// ============================================================================
// Hospital Database Operations - Prisma Version
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Patient, MedicalRecord, Prescription, LabReport, Doctor, VitalSigns } from '../types';
import prisma from './prisma';

// Helper to parse JSON fields safely
function parseJson<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// Hospital Database Class - Prisma Implementation
// ============================================================================

export class HospitalDatabase {
  private hospitalId: string;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
  }

  // ============================================================================
  // Patient Operations
  // ============================================================================

  async getPatient(icNumber: string): Promise<Patient | null> {
    const patient = await prisma.patient.findUnique({
      where: { icNumber },
    });

    if (!patient) return null;

    return {
      icNumber: patient.icNumber,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
      gender: patient.gender as 'male' | 'female',
      bloodType: patient.bloodType || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      emergencyPhone: patient.emergencyPhone || '',
      allergies: parseJson<string[]>(patient.allergies, []),
      chronicConditions: parseJson<string[]>(patient.chronicConditions, []),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }

  async getPatients(): Promise<Patient[]> {
    // Get patients that have records in this hospital
    const records = await prisma.medicalRecord.findMany({
      where: { hospitalId: this.hospitalId },
      select: { icNumber: true },
      distinct: ['icNumber'],
    });

    const icNumbers = records.map(r => r.icNumber);
    
    const patients = await prisma.patient.findMany({
      where: { icNumber: { in: icNumbers } },
    });

    return patients.map(p => ({
      icNumber: p.icNumber,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
      gender: p.gender as 'male' | 'female',
      bloodType: p.bloodType || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      emergencyContact: p.emergencyContact || '',
      emergencyPhone: p.emergencyPhone || '',
      allergies: parseJson<string[]>(p.allergies, []),
      chronicConditions: parseJson<string[]>(p.chronicConditions, []),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  getAllPatients(): Promise<Patient[]> {
    return this.getPatients();
  }

  async createPatient(patient: Patient): Promise<Patient> {
    const created = await prisma.patient.create({
      data: {
        icNumber: patient.icNumber,
        fullName: patient.fullName,
        dateOfBirth: new Date(patient.dateOfBirth),
        gender: patient.gender,
        bloodType: patient.bloodType,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        emergencyPhone: patient.emergencyPhone,
        allergies: JSON.stringify(patient.allergies),
        chronicConditions: JSON.stringify(patient.chronicConditions),
      },
    });

    return {
      ...patient,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updatePatient(icNumber: string, updates: Partial<Patient>): Promise<Patient | null> {
    const data: Record<string, unknown> = {};
    
    if (updates.fullName) data.fullName = updates.fullName;
    if (updates.dateOfBirth) data.dateOfBirth = new Date(updates.dateOfBirth);
    if (updates.gender) data.gender = updates.gender;
    if (updates.bloodType) data.bloodType = updates.bloodType;
    if (updates.phone) data.phone = updates.phone;
    if (updates.email) data.email = updates.email;
    if (updates.address) data.address = updates.address;
    if (updates.emergencyContact) data.emergencyContact = updates.emergencyContact;
    if (updates.emergencyPhone) data.emergencyPhone = updates.emergencyPhone;
    if (updates.allergies) data.allergies = JSON.stringify(updates.allergies);
    if (updates.chronicConditions) data.chronicConditions = JSON.stringify(updates.chronicConditions);

    const updated = await prisma.patient.update({
      where: { icNumber },
      data,
    });

    return this.getPatient(icNumber);
  }

  // ============================================================================
  // Medical Record Operations
  // ============================================================================

  async getMedicalRecord(id: string): Promise<MedicalRecord | null> {
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        hospital: true,
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    if (!record) return null;

    return this.formatRecord(record);
  }

  async getMedicalRecordsByPatient(icNumber: string): Promise<MedicalRecord[]> {
    const records = await prisma.medicalRecord.findMany({
      where: { icNumber, hospitalId: this.hospitalId },
      include: {
        hospital: true,
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
      orderBy: { visitDate: 'desc' },
    });

    return records.map(r => this.formatRecord(r));
  }

  getRecordsByPatient(icNumber: string): Promise<MedicalRecord[]> {
    return this.getMedicalRecordsByPatient(icNumber);
  }

  getRecordById(id: string): Promise<MedicalRecord | null> {
    return this.getMedicalRecord(id);
  }

  async createRecord(record: MedicalRecord): Promise<string> {
    const created = await prisma.medicalRecord.create({
      data: {
        id: record.id,
        icNumber: record.icNumber,
        hospitalId: record.hospitalId,
        doctorId: record.doctorId,
        visitDate: new Date(record.visitDate),
        visitType: record.visitType,
        chiefComplaint: record.chiefComplaint,
        diagnosis: JSON.stringify(record.diagnosis),
        diagnosisCodes: JSON.stringify(record.diagnosisCodes),
        symptoms: JSON.stringify(record.symptoms),
        notes: record.notes,
        vitalSigns: record.vitalSigns ? JSON.stringify(record.vitalSigns) : null,
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
      },
    });

    return created.id;
  }

  async createMedicalRecord(record: Partial<MedicalRecord> & Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicalRecord> {
    const id = uuidv4();
    
    const created = await prisma.medicalRecord.create({
      data: {
        id,
        icNumber: record.icNumber,
        hospitalId: this.hospitalId,
        doctorId: record.doctorId,
        visitDate: new Date(record.visitDate),
        visitType: record.visitType,
        chiefComplaint: record.chiefComplaint || '',
        diagnosis: JSON.stringify(record.diagnosis || []),
        diagnosisCodes: JSON.stringify(record.diagnosisCodes || []),
        symptoms: JSON.stringify(record.symptoms || []),
        notes: record.notes || '',
        vitalSigns: record.vitalSigns ? JSON.stringify(record.vitalSigns) : null,
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
      },
      include: {
        hospital: true,
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    return this.formatRecord(created);
  }

  private formatRecord(record: {
    id: string;
    icNumber: string;
    hospitalId: string;
    doctorId: string;
    visitDate: Date;
    visitType: string;
    chiefComplaint: string | null;
    diagnosis: string | null;
    diagnosisCodes: string | null;
    symptoms: string | null;
    notes: string | null;
    vitalSigns: string | null;
    followUpDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    hospital: { name: string };
    doctor: { fullName: string };
    prescriptions: Array<{
      id: string;
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string | null;
      quantity: number | null;
      instructions: string | null;
      isActive: boolean;
      recordId: string;
    }>;
    labReports: Array<{
      id: string;
      testType: string;
      testName: string;
      result: string;
      unit: string | null;
      referenceRange: string | null;
      isAbnormal: boolean;
      reportDate: Date;
      notes: string | null;
      recordId: string;
    }>;
  }): MedicalRecord {
    return {
      id: record.id,
      icNumber: record.icNumber,
      hospitalId: record.hospitalId,
      hospitalName: record.hospital.name,
      doctorId: record.doctorId,
      doctorName: record.doctor.fullName,
      visitDate: record.visitDate.toISOString(),
      visitType: record.visitType as 'outpatient' | 'inpatient' | 'emergency',
      chiefComplaint: record.chiefComplaint || '',
      diagnosis: parseJson<string[]>(record.diagnosis, []),
      diagnosisCodes: parseJson<string[]>(record.diagnosisCodes, []),
      symptoms: parseJson<string[]>(record.symptoms, []),
      notes: record.notes || '',
      vitalSigns: parseJson<VitalSigns | undefined>(record.vitalSigns, undefined),
      prescriptions: record.prescriptions.map(p => ({
        id: p.id,
        recordId: p.recordId,
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration || '',
        quantity: p.quantity || 0,
        instructions: p.instructions || '',
        isActive: p.isActive,
      })),
      labReports: record.labReports.map(l => ({
        id: l.id,
        recordId: l.recordId,
        testType: l.testType,
        testName: l.testName,
        result: l.result,
        unit: l.unit || '',
        referenceRange: l.referenceRange || '',
        isAbnormal: l.isAbnormal,
        reportDate: l.reportDate.toISOString(),
        notes: l.notes || '',
      })),
      followUpDate: record.followUpDate?.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Prescription Operations
  // ============================================================================

  async getPrescriptionsByRecord(recordId: string): Promise<Prescription[]> {
    const prescriptions = await prisma.prescription.findMany({
      where: { recordId },
    });

    return prescriptions.map(p => ({
      id: p.id,
      recordId: p.recordId,
      medicationName: p.medicationName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration || '',
      quantity: p.quantity || 0,
      instructions: p.instructions || '',
      isActive: p.isActive,
    }));
  }

  async getActivePrescriptionsByPatient(icNumber: string): Promise<Prescription[]> {
    const records = await prisma.medicalRecord.findMany({
      where: { icNumber, hospitalId: this.hospitalId },
      select: { id: true },
    });

    const recordIds = records.map(r => r.id);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        recordId: { in: recordIds },
        isActive: true,
      },
    });

    return prescriptions.map(p => ({
      id: p.id,
      recordId: p.recordId,
      medicationName: p.medicationName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration || '',
      quantity: p.quantity || 0,
      instructions: p.instructions || '',
      isActive: p.isActive,
    }));
  }

  getActivePrescriptions(icNumber: string): Promise<Prescription[]> {
    return this.getActivePrescriptionsByPatient(icNumber);
  }

  async createPrescription(prescription: Omit<Prescription, 'id'>): Promise<Prescription> {
    const created = await prisma.prescription.create({
      data: {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        quantity: prescription.quantity,
        instructions: prescription.instructions,
        isActive: prescription.isActive,
        recordId: prescription.recordId!,
      },
    });

    return {
      id: created.id,
      recordId: created.recordId,
      medicationName: created.medicationName,
      dosage: created.dosage,
      frequency: created.frequency,
      duration: created.duration || '',
      quantity: created.quantity || 0,
      instructions: created.instructions || '',
      isActive: created.isActive,
    };
  }

  // ============================================================================
  // Lab Report Operations
  // ============================================================================

  async getLabReportsByRecord(recordId: string): Promise<LabReport[]> {
    const reports = await prisma.labReport.findMany({
      where: { recordId },
    });

    return reports.map(l => ({
      id: l.id,
      recordId: l.recordId,
      testType: l.testType,
      testName: l.testName,
      result: l.result,
      unit: l.unit || '',
      referenceRange: l.referenceRange || '',
      isAbnormal: l.isAbnormal,
      reportDate: l.reportDate.toISOString(),
      notes: l.notes || '',
    }));
  }

  async createLabReport(labReport: Omit<LabReport, 'id'>): Promise<LabReport> {
    const created = await prisma.labReport.create({
      data: {
        testType: labReport.testType,
        testName: labReport.testName,
        result: labReport.result,
        unit: labReport.unit,
        referenceRange: labReport.referenceRange,
        isAbnormal: labReport.isAbnormal,
        reportDate: new Date(labReport.reportDate),
        notes: labReport.notes,
        recordId: labReport.recordId!,
      },
    });

    return {
      id: created.id,
      recordId: created.recordId,
      testType: created.testType,
      testName: created.testName,
      result: created.result,
      unit: created.unit || '',
      referenceRange: created.referenceRange || '',
      isAbnormal: created.isAbnormal,
      reportDate: created.reportDate.toISOString(),
      notes: created.notes || '',
    };
  }

  // ============================================================================
  // Doctor Operations
  // ============================================================================

  async getDoctor(id: string): Promise<Doctor | null> {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) return null;

    return {
      id: doctor.id,
      icNumber: doctor.icNumber,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber || '',
      hospitalId: doctor.hospitalId,
      department: doctor.department || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      isActive: doctor.isActive,
    };
  }

  async getDoctorByIc(icNumber: string): Promise<Doctor | null> {
    const doctor = await prisma.doctor.findFirst({
      where: { icNumber, hospitalId: this.hospitalId },
    });

    if (!doctor) return null;

    return {
      id: doctor.id,
      icNumber: doctor.icNumber,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber || '',
      hospitalId: doctor.hospitalId,
      department: doctor.department || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      isActive: doctor.isActive,
    };
  }

  async getDoctors(): Promise<Doctor[]> {
    const doctors = await prisma.doctor.findMany({
      where: { hospitalId: this.hospitalId, isActive: true },
    });

    return doctors.map(d => ({
      id: d.id,
      icNumber: d.icNumber,
      fullName: d.fullName,
      specialization: d.specialization,
      licenseNumber: d.licenseNumber || '',
      hospitalId: d.hospitalId,
      department: d.department || '',
      phone: d.phone || '',
      email: d.email || '',
      isActive: d.isActive,
    }));
  }

  getAllDoctors(): Promise<Doctor[]> {
    return this.getDoctors();
  }

  async createDoctor(doctor: Doctor): Promise<Doctor> {
    const created = await prisma.doctor.create({
      data: {
        id: doctor.id,
        icNumber: doctor.icNumber,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        hospitalId: this.hospitalId,
        department: doctor.department,
        phone: doctor.phone,
        email: doctor.email,
        isActive: doctor.isActive,
      },
    });

    return doctor;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats() {
    const [totalPatients, totalRecords, totalDoctors, recentRecords] = await Promise.all([
      prisma.medicalRecord.groupBy({
        by: ['icNumber'],
        where: { hospitalId: this.hospitalId },
      }).then(r => r.length),
      prisma.medicalRecord.count({ where: { hospitalId: this.hospitalId } }),
      prisma.doctor.count({ where: { hospitalId: this.hospitalId, isActive: true } }),
      prisma.medicalRecord.findMany({
        where: { hospitalId: this.hospitalId },
        include: { hospital: true, doctor: true, prescriptions: true, labReports: true },
        orderBy: { visitDate: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalPatients,
      totalRecords,
      totalDoctors,
      recentRecords: recentRecords.map(r => this.formatRecord(r)),
    };
  }
}

// ============================================================================
// Hospital Database Factory
// ============================================================================

const hospitalDatabases = new Map<string, HospitalDatabase>();

export function getHospitalDb(hospitalId: string): HospitalDatabase {
  if (!hospitalDatabases.has(hospitalId)) {
    hospitalDatabases.set(hospitalId, new HospitalDatabase(hospitalId));
  }
  return hospitalDatabases.get(hospitalId)!;
}
