// ============================================================================
// Hospital Database Operations - Multi-Database Version
// 每个医院使用独立的 PostgreSQL 数据库
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Patient, MedicalRecord, Prescription, LabReport, Doctor, VitalSigns } from '../types';
import { getHospitalDbClient } from './multi-db-manager';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';

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
// Hospital Database Class - 独立数据库版本
// ============================================================================

export class HospitalDatabaseMulti {
  private hospitalId: string;
  private prisma: HospitalPrismaClient;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    this.prisma = getHospitalDbClient(hospitalId);
  }

  // 获取医院ID（用于外部查询）
  getHospitalId(): string {
    return this.hospitalId;
  }

  // ============================================================================
  // Patient Operations
  // ============================================================================

  async getPatient(icNumber: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findUnique({
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
    const patients = await this.prisma.patient.findMany();

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
    const created = await this.prisma.patient.create({
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

    await this.prisma.patient.update({
      where: { icNumber },
      data,
    });

    return this.getPatient(icNumber);
  }

  // ============================================================================
  // Medical Record Operations
  // ============================================================================

  async getMedicalRecord(id: string): Promise<MedicalRecord | null> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    if (!record) return null;

    return this.formatRecord(record);
  }

  async getMedicalRecordsByPatient(icNumber: string): Promise<MedicalRecord[]> {
    const records = await this.prisma.medicalRecord.findMany({
      where: { icNumber },
      include: {
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
    const created = await this.prisma.medicalRecord.create({
      data: {
        id: record.id,
        icNumber: record.icNumber,
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

  async createMedicalRecord(record: Partial<MedicalRecord> & Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt' | 'hospitalId'>): Promise<MedicalRecord> {
    const id = uuidv4();
    
    const created = await this.prisma.medicalRecord.create({
      data: {
        id,
        icNumber: record.icNumber,
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
      hospitalId: this.hospitalId, // 来自当前数据库实例
      hospitalName: this.getHospitalName(),
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

  private getHospitalName(): string {
    const names: Record<string, string> = {
      'hospital-kl': 'Kuala Lumpur General Hospital',
      'hospital-penang': 'Penang General Hospital',
      'hospital-jb': 'Sultanah Aminah Hospital',
      'hospital-kuching': 'Sarawak General Hospital',
      'hospital-kk': 'Queen Elizabeth Hospital',
    };
    return names[this.hospitalId] || this.hospitalId;
  }

  // ============================================================================
  // Prescription Operations
  // ============================================================================

  async getPrescriptionsByRecord(recordId: string): Promise<Prescription[]> {
    const prescriptions = await this.prisma.prescription.findMany({
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
    const records = await this.prisma.medicalRecord.findMany({
      where: { icNumber },
      select: { id: true },
    });

    const recordIds = records.map(r => r.id);

    const prescriptions = await this.prisma.prescription.findMany({
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
    const created = await this.prisma.prescription.create({
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
    const reports = await this.prisma.labReport.findMany({
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
    const created = await this.prisma.labReport.create({
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
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) return null;

    return {
      id: doctor.id,
      icNumber: doctor.icNumber,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber || '',
      hospitalId: this.hospitalId,
      department: doctor.department || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      isActive: doctor.isActive,
    };
  }

  async getDoctorByIc(icNumber: string): Promise<Doctor | null> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { icNumber },
    });

    if (!doctor) return null;

    return {
      id: doctor.id,
      icNumber: doctor.icNumber,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber || '',
      hospitalId: this.hospitalId,
      department: doctor.department || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      isActive: doctor.isActive,
    };
  }

  async getDoctors(): Promise<Doctor[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isActive: true },
    });

    return doctors.map(d => ({
      id: d.id,
      icNumber: d.icNumber,
      fullName: d.fullName,
      specialization: d.specialization,
      licenseNumber: d.licenseNumber || '',
      hospitalId: this.hospitalId,
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
    await this.prisma.doctor.create({
      data: {
        id: doctor.id,
        icNumber: doctor.icNumber,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
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
      this.prisma.patient.count(),
      this.prisma.medicalRecord.count(),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.medicalRecord.findMany({
        include: { doctor: true, prescriptions: true, labReports: true },
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
// 工厂函数 - 获取医院数据库实例
// ============================================================================
const hospitalDbInstances: Map<string, HospitalDatabaseMulti> = new Map();

export function getHospitalDb(hospitalId: string): HospitalDatabaseMulti {
  if (!hospitalDbInstances.has(hospitalId)) {
    hospitalDbInstances.set(hospitalId, new HospitalDatabaseMulti(hospitalId));
  }
  return hospitalDbInstances.get(hospitalId)!;
}
