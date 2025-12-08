import { Patient, MedicalRecord, Prescription, Doctor, VitalSigns } from '../types';
import { getHospitalDbClient } from './multi-db-manager';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';

function parseJson<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

export class HospitalDatabaseMulti {
  private hospitalId: string;
  private prisma: HospitalPrismaClient;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    this.prisma = getHospitalDbClient(hospitalId);
  }

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

  async getAllPatients(): Promise<Patient[]> {
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

  async getRecordById(id: string): Promise<MedicalRecord | null> {
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

  async getRecordsByPatient(icNumber: string): Promise<MedicalRecord[]> {
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
      hospitalId: this.hospitalId,
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

  async getActivePrescriptions(icNumber: string): Promise<Prescription[]> {
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

  async getAllDoctors(): Promise<Doctor[]> {
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

const hospitalDbInstances: Map<string, HospitalDatabaseMulti> = new Map();

export function getHospitalDb(hospitalId: string): HospitalDatabaseMulti {
  if (!hospitalDbInstances.has(hospitalId)) {
    hospitalDbInstances.set(hospitalId, new HospitalDatabaseMulti(hospitalId));
  }
  return hospitalDbInstances.get(hospitalId)!;
}
