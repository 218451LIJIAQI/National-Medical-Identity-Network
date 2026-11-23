import { Patient, MedicalRecord, Doctor, VitalSigns, Prescription, LabReport, normalizeIcNumber } from '../types';
import { getHospitalDbClient } from './multi-db-manager';
import { getHospitalById } from '../config';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';

function parseJson<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

function normalizePrescriptionInput(p: Partial<Prescription>) {
  return {
    medicationName: String(p.medicationName || '').trim(),
    dosage: String(p.dosage || '').trim(),
    frequency: String(p.frequency || '').trim(),
    duration: p.duration ? String(p.duration).trim() : null,
    quantity: typeof p.quantity === 'number' && !Number.isNaN(p.quantity) ? Math.max(0, Math.trunc(p.quantity)) : null,
    instructions: p.instructions ? String(p.instructions).trim() : null,
    isActive: p.isActive !== false,
  };
}

function normalizeLabReportInput(l: Partial<LabReport>, fallbackDate: Date) {
  const parsedDate = l.reportDate ? new Date(l.reportDate) : fallbackDate;
  return {
    testType: String(l.testType || 'General Lab').trim(),
    testName: String(l.testName || '').trim(),
    result: String(l.result || 'Pending').trim(),
    unit: l.unit ? String(l.unit).trim() : null,
    referenceRange: l.referenceRange ? String(l.referenceRange).trim() : null,
    isAbnormal: Boolean(l.isAbnormal),
    reportDate: Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate,
    notes: l.notes ? String(l.notes).trim() : null,
  };
}

export class HospitalDatabaseMulti {
  private hospitalId: string;
  private prisma: HospitalPrismaClient;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    this.prisma = getHospitalDbClient(hospitalId);
  }

  async getPatient(rawIcNumber: string): Promise<Patient | null> {
    const icNumber = normalizeIcNumber(rawIcNumber);
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

  async createPatient(patient: Patient): Promise<Patient> {
    const icNumber = normalizeIcNumber(patient.icNumber);
    const dob = new Date(patient.dateOfBirth);
    const safeDob = Number.isNaN(dob.getTime()) ? new Date('1990-01-01T00:00:00.000Z') : dob;

    const created = await this.prisma.patient.create({
      data: {
        icNumber,
        fullName: patient.fullName,
        dateOfBirth: safeDob,
        gender: patient.gender === 'female' ? 'female' : 'male',
        bloodType: patient.bloodType || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        emergencyContact: patient.emergencyContact || '',
        emergencyPhone: patient.emergencyPhone || '',
        allergies: JSON.stringify(Array.from(new Set(patient.allergies || []))),
        chronicConditions: JSON.stringify(Array.from(new Set(patient.chronicConditions || []))),
      },
    });

    return {
      ...patient,
      icNumber,
      dateOfBirth: safeDob.toISOString().split('T')[0],
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updatePatient(rawIcNumber: string, updates: Partial<Patient>): Promise<Patient | null> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    const existing = await this.getPatient(icNumber);
    if (!existing) return null;

    const mergedAllergies = updates.allergies
      ? Array.from(new Set([...existing.allergies, ...updates.allergies].filter(Boolean)))
      : existing.allergies;
    const mergedConditions = updates.chronicConditions
      ? Array.from(new Set([...existing.chronicConditions, ...updates.chronicConditions].filter(Boolean)))
      : existing.chronicConditions;

    const nextDob = updates.dateOfBirth ? new Date(updates.dateOfBirth) : new Date(existing.dateOfBirth);
    const safeDob = Number.isNaN(nextDob.getTime()) ? new Date(existing.dateOfBirth) : nextDob;

    const updated = await this.prisma.patient.update({
      where: { icNumber },
      data: {
        fullName: updates.fullName || existing.fullName,
        dateOfBirth: safeDob,
        gender: updates.gender || existing.gender,
        bloodType: updates.bloodType ?? existing.bloodType,
        phone: updates.phone ?? existing.phone,
        email: updates.email ?? existing.email,
        address: updates.address ?? existing.address,
        emergencyContact: updates.emergencyContact ?? existing.emergencyContact,
        emergencyPhone: updates.emergencyPhone ?? existing.emergencyPhone,
        allergies: JSON.stringify(mergedAllergies),
        chronicConditions: JSON.stringify(mergedConditions),
      },
    });

    return {
      icNumber: updated.icNumber,
      fullName: updated.fullName,
      dateOfBirth: updated.dateOfBirth.toISOString().split('T')[0],
      gender: updated.gender as 'male' | 'female',
      bloodType: updated.bloodType || '',
      phone: updated.phone || '',
      email: updated.email || '',
      address: updated.address || '',
      emergencyContact: updated.emergencyContact || '',
      emergencyPhone: updated.emergencyPhone || '',
      allergies: mergedAllergies,
      chronicConditions: mergedConditions,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async countRecordsByPatient(rawIcNumber: string): Promise<number> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    return this.prisma.medicalRecord.count({ where: { icNumber } });
  }

  async getRecordsByPatient(rawIcNumber: string): Promise<MedicalRecord[]> {
    const icNumber = normalizeIcNumber(rawIcNumber);
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

  async getRecordById(recordId: string): Promise<MedicalRecord | null> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    return record ? this.formatRecord(record) : null;
  }

  async createRecord(record: MedicalRecord): Promise<MedicalRecord> {
    const visitDate = new Date(record.visitDate);
    const safeVisitDate = Number.isNaN(visitDate.getTime()) ? new Date() : visitDate;
    const validPrescriptions = (record.prescriptions || [])
      .map(normalizePrescriptionInput)
      .filter(p => p.medicationName && p.dosage && p.frequency);
    const validLabReports = (record.labReports || [])
      .map(l => normalizeLabReportInput(l, safeVisitDate))
      .filter(l => l.testName);

    const created = await this.prisma.medicalRecord.create({
      data: {
        id: record.id,
        icNumber: normalizeIcNumber(record.icNumber),
        doctorId: record.doctorId,
        visitDate: safeVisitDate,
        visitType: record.visitType || 'outpatient',
        chiefComplaint: record.chiefComplaint || '',
        diagnosis: JSON.stringify(record.diagnosis || []),
        diagnosisCodes: JSON.stringify(record.diagnosisCodes || []),
        symptoms: JSON.stringify(record.symptoms || []),
        notes: record.notes || '',
        vitalSigns: record.vitalSigns ? JSON.stringify(record.vitalSigns) : null,
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
        ...(validPrescriptions.length > 0
          ? { prescriptions: { create: validPrescriptions } }
          : {}),
        ...(validLabReports.length > 0
          ? { labReports: { create: validLabReports } }
          : {}),
      },
      include: {
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    return this.formatRecord(created);
  }

  async updateRecord(recordId: string, updates: Partial<MedicalRecord>): Promise<MedicalRecord | null> {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: { doctor: true, prescriptions: true, labReports: true },
    });

    if (!existing) return null;

    const visitDate = updates.visitDate ? new Date(updates.visitDate) : existing.visitDate;
    const safeVisitDate = Number.isNaN(visitDate.getTime()) ? existing.visitDate : visitDate;

    const data: Record<string, unknown> = {
      visitDate: safeVisitDate,
      visitType: updates.visitType || existing.visitType,
      chiefComplaint: updates.chiefComplaint !== undefined ? updates.chiefComplaint : existing.chiefComplaint,
      diagnosis: updates.diagnosis !== undefined ? JSON.stringify(updates.diagnosis) : existing.diagnosis,
      diagnosisCodes: updates.diagnosisCodes !== undefined ? JSON.stringify(updates.diagnosisCodes) : existing.diagnosisCodes,
      symptoms: updates.symptoms !== undefined ? JSON.stringify(updates.symptoms) : existing.symptoms,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      vitalSigns:
        updates.vitalSigns !== undefined
          ? updates.vitalSigns
            ? JSON.stringify(updates.vitalSigns)
            : null
          : existing.vitalSigns,
      followUpDate:
        updates.followUpDate !== undefined
          ? updates.followUpDate
            ? new Date(updates.followUpDate)
            : null
          : existing.followUpDate,
    };

    if (updates.prescriptions !== undefined) {
      await this.prisma.prescription.deleteMany({ where: { recordId } });
      const validPrescriptions = updates.prescriptions
        .map(normalizePrescriptionInput)
        .filter(p => p.medicationName && p.dosage && p.frequency);
      if (validPrescriptions.length > 0) {
        data.prescriptions = { create: validPrescriptions };
      }
    }

    if (updates.labReports !== undefined) {
      await this.prisma.labReport.deleteMany({ where: { recordId } });
      const validLabReports = updates.labReports
        .map(l => normalizeLabReportInput(l, safeVisitDate))
        .filter(l => l.testName);
      if (validLabReports.length > 0) {
        data.labReports = { create: validLabReports };
      }
    }

    const updated = await this.prisma.medicalRecord.update({
      where: { id: recordId },
      data,
      include: {
        doctor: true,
        prescriptions: true,
        labReports: true,
      },
    });

    return this.formatRecord(updated);
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
      hospitalName: getHospitalById(this.hospitalId)?.name || this.hospitalId,
      doctorId: record.doctorId,
      doctorName: record.doctor?.fullName || record.doctorId,
      visitDate: record.visitDate.toISOString(),
      visitType: record.visitType as 'outpatient' | 'inpatient' | 'emergency',
      chiefComplaint: record.chiefComplaint || '',
      diagnosis: parseJson<string[]>(record.diagnosis, []),
      diagnosisCodes: parseJson<string[]>(record.diagnosisCodes, []),
      symptoms: parseJson<string[]>(record.symptoms, []),
      notes: record.notes || '',
      vitalSigns: parseJson<VitalSigns | undefined>(record.vitalSigns, undefined),
      prescriptions: (record.prescriptions || []).map(p => ({
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
      labReports: (record.labReports || []).map(l => ({
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

  async getDoctor(id: string): Promise<Doctor | null> {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    return doctor ? this.mapDoctor(doctor) : null;
  }

  async getDoctorByIc(rawIcNumber: string): Promise<Doctor | null> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    const doctor = await this.prisma.doctor.findFirst({ where: { icNumber } });
    return doctor ? this.mapDoctor(doctor) : null;
  }

  async getDoctors(): Promise<Doctor[]> {
    const doctors = await this.prisma.doctor.findMany({
      orderBy: { fullName: 'asc' },
    });
    return doctors.map(d => this.mapDoctor(d));
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, totalRecords, totalDoctors, todayVisits, recentRecords] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.medicalRecord.count(),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.medicalRecord.count({ where: { visitDate: { gte: today } } }),
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
      todayVisits,
      recentRecords: recentRecords.map(r => this.formatRecord(r)),
    };
  }
}

const hospitalDbInstances = new Map<string, HospitalDatabaseMulti>();

export function getHospitalDb(hospitalId: string): HospitalDatabaseMulti {
  let instance = hospitalDbInstances.get(hospitalId);
  if (!instance) {
    instance = new HospitalDatabaseMulti(hospitalId);
    hospitalDbInstances.set(hospitalId, instance);
  }
  return instance;
}

export function resetHospitalDbInstances(): void {
  hospitalDbInstances.clear();
}

export async function findPatientInHospitals(rawIcNumber: string, hospitalIds: string[]): Promise<Patient | null> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  let merged: Patient | null = null;

  const results = await Promise.allSettled(
    hospitalIds.map(hospitalId => getHospitalDb(hospitalId).getPatient(icNumber))
  );

  for (const res of results) {
    if (res.status !== 'fulfilled' || !res.value) continue;
    const p = res.value;
    if (!merged) {
      merged = {
        ...p,
        allergies: [...p.allergies],
        chronicConditions: [...p.chronicConditions],
      };
    } else {
      merged.fullName = merged.fullName || p.fullName;
      merged.bloodType = merged.bloodType || p.bloodType;
      merged.phone = merged.phone || p.phone;
      merged.email = merged.email || p.email;
      merged.address = merged.address || p.address;
      merged.emergencyContact = merged.emergencyContact || p.emergencyContact;
      merged.emergencyPhone = merged.emergencyPhone || p.emergencyPhone;
      merged.allergies = Array.from(new Set([...merged.allergies, ...p.allergies]));
      merged.chronicConditions = Array.from(new Set([...merged.chronicConditions, ...p.chronicConditions]));
    }
  }

  return merged;
}
