import crypto from 'crypto';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';
import {
  CreateMedicalRecordInput,
  Doctor,
  HospitalStats,
  MedicalRecord,
  Patient,
  VitalSigns,
} from '../types';
import { findHospitalConfig } from '../config';
import { getHospitalDbClient } from './db-manager';

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface RawRecordRow {
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
}

export class HospitalDatabase {
  private readonly hospitalId: string;
  private readonly prisma: HospitalPrismaClient;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    this.prisma = getHospitalDbClient(hospitalId);
  }

  private getHospitalName(): string {
    return findHospitalConfig(this.hospitalId)?.name || this.hospitalId;
  }

  private mapDoctor(doctor: {
    id: string;
    icNumber: string;
    fullName: string;
    specialization: string;
    licenseNumber: string | null;
    department: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
  }): Doctor {
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

  async getPatient(icNumber: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findUnique({ where: { icNumber } });
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

  async createPatient(patient: Omit<Patient, 'createdAt' | 'updatedAt'>): Promise<Patient> {
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

    return records.map((record) => this.formatRecord(record));
  }

  async createRecord(record: CreateMedicalRecordInput): Promise<string> {
    const visitDate = record.visitDate ? new Date(record.visitDate) : new Date();
    const created = await this.prisma.medicalRecord.create({
      data: {
        id: record.id || crypto.randomUUID(),
        icNumber: record.icNumber,
        doctorId: record.doctorId,
        visitDate,
        visitType: record.visitType || 'outpatient',
        chiefComplaint: record.chiefComplaint || null,
        diagnosis: JSON.stringify(record.diagnosis || []),
        diagnosisCodes: JSON.stringify(record.diagnosisCodes || []),
        symptoms: JSON.stringify(record.symptoms || []),
        notes: record.notes || null,
        vitalSigns: record.vitalSigns ? JSON.stringify(record.vitalSigns) : null,
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
        ...(record.prescriptions && record.prescriptions.length > 0
          ? {
              prescriptions: {
                create: record.prescriptions.map((rx) => ({
                  medicationName: rx.medicationName,
                  dosage: rx.dosage,
                  frequency: rx.frequency,
                  duration: rx.duration || null,
                  quantity: rx.quantity ?? null,
                  instructions: rx.instructions || null,
                  isActive: rx.isActive ?? true,
                })),
              },
            }
          : {}),
        ...(record.labReports && record.labReports.length > 0
          ? {
              labReports: {
                create: record.labReports.map((lab) => ({
                  testType: lab.testType,
                  testName: lab.testName,
                  result: lab.result,
                  unit: lab.unit || null,
                  referenceRange: lab.referenceRange || null,
                  isAbnormal: lab.isAbnormal ?? false,
                  reportDate: lab.reportDate ? new Date(lab.reportDate) : visitDate,
                  notes: lab.notes || null,
                })),
              },
            }
          : {}),
      },
    });

    return created.id;
  }

  private formatRecord(record: RawRecordRow): MedicalRecord {
    return {
      id: record.id,
      icNumber: record.icNumber,
      hospitalId: this.hospitalId,
      hospitalName: this.getHospitalName(),
      doctorId: record.doctorId,
      doctorName: record.doctor.fullName,
      visitDate: record.visitDate.toISOString(),
      visitType: record.visitType as MedicalRecord['visitType'],
      chiefComplaint: record.chiefComplaint || '',
      diagnosis: parseJson<string[]>(record.diagnosis, []),
      diagnosisCodes: parseJson<string[]>(record.diagnosisCodes, []),
      symptoms: parseJson<string[]>(record.symptoms, []),
      notes: record.notes || '',
      vitalSigns: parseJson<VitalSigns | undefined>(record.vitalSigns, undefined),
      prescriptions: record.prescriptions.map((rx) => ({
        id: rx.id,
        recordId: rx.recordId,
        medicationName: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration || '',
        quantity: rx.quantity || 0,
        instructions: rx.instructions || '',
        isActive: rx.isActive,
      })),
      labReports: record.labReports.map((lab) => ({
        id: lab.id,
        recordId: lab.recordId,
        testType: lab.testType,
        testName: lab.testName,
        result: lab.result,
        unit: lab.unit || '',
        referenceRange: lab.referenceRange || '',
        isAbnormal: lab.isAbnormal,
        reportDate: lab.reportDate.toISOString(),
        notes: lab.notes || '',
      })),
      followUpDate: record.followUpDate?.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async getDoctor(id: string): Promise<Doctor | null> {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    return doctor ? this.mapDoctor(doctor) : null;
  }

  async getDoctorByIc(icNumber: string): Promise<Doctor | null> {
    const doctor = await this.prisma.doctor.findFirst({ where: { icNumber } });
    return doctor ? this.mapDoctor(doctor) : null;
  }

  async getDoctors(): Promise<Doctor[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
    });
    return doctors.map((d) => this.mapDoctor(d));
  }

  async getStats(): Promise<HospitalStats> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalPatients, totalRecords, activeDoctors, todayVisits, recentRecords] =
      await Promise.all([
        this.prisma.patient.count(),
        this.prisma.medicalRecord.count(),
        this.prisma.doctor.count({ where: { isActive: true } }),
        this.prisma.medicalRecord.count({ where: { visitDate: { gte: startOfToday } } }),
        this.prisma.medicalRecord.findMany({
          include: { doctor: true, prescriptions: true, labReports: true },
          orderBy: { visitDate: 'desc' },
          take: 10,
        }),
      ]);

    return {
      totalPatients,
      totalRecords,
      totalDoctors: activeDoctors,
      activeDoctors,
      todayVisits,
      recentRecords: recentRecords.map((record) => this.formatRecord(record)),
    };
  }
}

const hospitalDbInstances = new Map<string, HospitalDatabase>();

export function getHospitalDb(hospitalId: string): HospitalDatabase {
  let instance = hospitalDbInstances.get(hospitalId);
  if (!instance) {
    instance = new HospitalDatabase(hospitalId);
    hospitalDbInstances.set(hospitalId, instance);
  }
  return instance;
}

export function resetHospitalDbCache(): void {
  hospitalDbInstances.clear();
}

/**
 * Resolves a patient's demographic profile from the first reachable hospital in their index.
 */
export async function findPatientAcrossHospitals(
  icNumber: string,
  hospitalIds: readonly string[]
): Promise<Patient | null> {
  for (const hospitalId of hospitalIds) {
    try {
      const patient = await getHospitalDb(hospitalId).getPatient(icNumber);
      if (patient) return patient;
    } catch {
      // Continue trying remaining hospitals if one node is unreachable
    }
  }
  return null;
}
