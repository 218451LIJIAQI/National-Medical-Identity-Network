import {
  Patient,
  MedicalRecord,
  Doctor,
  VitalSigns,
  Prescription,
  LabReport,
  ActiveEmergencyMedication,
} from '../types';
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
      gender: patient.gender === 'female' ? 'female' : 'male',
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
    const created = await this.prisma.patient.create({
      data: {
        icNumber: patient.icNumber,
        fullName: patient.fullName,
        dateOfBirth: new Date(patient.dateOfBirth),
        gender: patient.gender,
        bloodType: patient.bloodType || null,
        phone: patient.phone || null,
        email: patient.email || null,
        address: patient.address || null,
        emergencyContact: patient.emergencyContact || null,
        emergencyPhone: patient.emergencyPhone || null,
        allergies: JSON.stringify(patient.allergies || []),
        chronicConditions: JSON.stringify(patient.chronicConditions || []),
      },
    });

    return {
      ...patient,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async countRecordsByPatient(icNumber: string): Promise<number> {
    return this.prisma.medicalRecord.count({ where: { icNumber } });
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
    const prescriptionsInput = (record.prescriptions || [])
      .filter(p => p.medicationName?.trim())
      .map((p: Prescription) => ({
        medicationName: p.medicationName.trim(),
        dosage: p.dosage?.trim() || 'As directed',
        frequency: p.frequency?.trim() || 'Once daily',
        duration: p.duration?.trim() || null,
        quantity: typeof p.quantity === 'number' && !Number.isNaN(p.quantity) ? p.quantity : null,
        instructions: p.instructions?.trim() || null,
        isActive: p.isActive !== false,
      }));

    const labReportsInput = (record.labReports || [])
      .filter(l => l.testName?.trim())
      .map((l: LabReport) => ({
        testType: l.testType?.trim() || 'General Lab',
        testName: l.testName.trim(),
        result: l.result?.trim() || 'Pending',
        unit: l.unit?.trim() || null,
        referenceRange: l.referenceRange?.trim() || null,
        isAbnormal: Boolean(l.isAbnormal),
        reportDate: l.reportDate ? new Date(l.reportDate) : visitDate,
        notes: l.notes?.trim() || null,
      }));

    const created = await this.prisma.medicalRecord.create({
      data: {
        id: record.id,
        icNumber: record.icNumber,
        doctorId: record.doctorId,
        visitDate,
        visitType: record.visitType,
        chiefComplaint: record.chiefComplaint || null,
        diagnosis: JSON.stringify(record.diagnosis || []),
        diagnosisCodes: JSON.stringify(record.diagnosisCodes || []),
        symptoms: JSON.stringify(record.symptoms || []),
        notes: record.notes || null,
        vitalSigns: record.vitalSigns ? JSON.stringify(record.vitalSigns) : null,
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : null,
        ...(prescriptionsInput.length > 0
          ? { prescriptions: { create: prescriptionsInput } }
          : {}),
        ...(labReportsInput.length > 0
          ? { labReports: { create: labReportsInput } }
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

  async updateRecord(
    recordId: string,
    updates: Partial<MedicalRecord>
  ): Promise<MedicalRecord | null> {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });
    if (!existing) return null;

    if (updates.prescriptions !== undefined) {
      await this.prisma.prescription.deleteMany({ where: { recordId } });
    }
    if (updates.labReports !== undefined) {
      await this.prisma.labReport.deleteMany({ where: { recordId } });
    }

    const visitDate = updates.visitDate ? new Date(updates.visitDate) : existing.visitDate;
    const prescriptionsInput = updates.prescriptions
      ?.filter(p => p.medicationName?.trim())
      .map(p => ({
        medicationName: p.medicationName.trim(),
        dosage: p.dosage?.trim() || 'As directed',
        frequency: p.frequency?.trim() || 'Once daily',
        duration: p.duration?.trim() || null,
        quantity: typeof p.quantity === 'number' && !Number.isNaN(p.quantity) ? p.quantity : null,
        instructions: p.instructions?.trim() || null,
        isActive: p.isActive !== false,
      }));

    const labReportsInput = updates.labReports
      ?.filter(l => l.testName?.trim())
      .map(l => ({
        testType: l.testType?.trim() || 'General Lab',
        testName: l.testName.trim(),
        result: l.result?.trim() || 'Pending',
        unit: l.unit?.trim() || null,
        referenceRange: l.referenceRange?.trim() || null,
        isAbnormal: Boolean(l.isAbnormal),
        reportDate: l.reportDate ? new Date(l.reportDate) : visitDate,
        notes: l.notes?.trim() || null,
      }));

    const updated = await this.prisma.medicalRecord.update({
      where: { id: recordId },
      data: {
        ...(updates.visitDate ? { visitDate } : {}),
        ...(updates.visitType ? { visitType: updates.visitType } : {}),
        ...(updates.chiefComplaint !== undefined ? { chiefComplaint: updates.chiefComplaint || null } : {}),
        ...(updates.diagnosis !== undefined ? { diagnosis: JSON.stringify(updates.diagnosis) } : {}),
        ...(updates.diagnosisCodes !== undefined ? { diagnosisCodes: JSON.stringify(updates.diagnosisCodes) } : {}),
        ...(updates.symptoms !== undefined ? { symptoms: JSON.stringify(updates.symptoms) } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes || null } : {}),
        ...(updates.vitalSigns !== undefined
          ? { vitalSigns: updates.vitalSigns ? JSON.stringify(updates.vitalSigns) : null }
          : {}),
        ...(updates.followUpDate !== undefined
          ? { followUpDate: updates.followUpDate ? new Date(updates.followUpDate) : null }
          : {}),
        ...(prescriptionsInput && prescriptionsInput.length > 0
          ? { prescriptions: { create: prescriptionsInput } }
          : {}),
        ...(labReportsInput && labReportsInput.length > 0
          ? { labReports: { create: labReportsInput } }
          : {}),
      },
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

  async getDoctorByIc(icNumber: string): Promise<Doctor | null> {
    const doctor = await this.prisma.doctor.findFirst({ where: { icNumber, isActive: true } });
    return doctor ? this.mapDoctor(doctor) : null;
  }

  async getDoctors(): Promise<Doctor[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
    });
    return doctors.map(d => this.mapDoctor(d));
  }

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalPatients, totalRecords, totalDoctors, todayVisits] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.medicalRecord.count(),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.medicalRecord.count({ where: { visitDate: { gte: startOfToday } } }),
    ]);

    return {
      totalPatients,
      totalRecords,
      totalDoctors,
      todayVisits,
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

export async function findPatientInHospitals(icNumber: string, hospitalIds: string[]): Promise<Patient | null> {
  const results = await Promise.all(
    hospitalIds.map(async hospitalId => {
      try {
        return await getHospitalDb(hospitalId).getPatient(icNumber);
      } catch {
        return null;
      }
    })
  );

  const validPatients = results.filter((p): p is Patient => p !== null);
  if (validPatients.length === 0) return null;

  const base = { ...validPatients[0] };
  const allergiesSet = new Set<string>(base.allergies);
  const conditionsSet = new Set<string>(base.chronicConditions);

  for (const p of validPatients.slice(1)) {
    if (!base.fullName && p.fullName) base.fullName = p.fullName;
    if (!base.bloodType && p.bloodType) base.bloodType = p.bloodType;
    if (!base.phone && p.phone) base.phone = p.phone;
    if (!base.email && p.email) base.email = p.email;
    if (!base.address && p.address) base.address = p.address;
    if (!base.emergencyContact && p.emergencyContact) base.emergencyContact = p.emergencyContact;
    if (!base.emergencyPhone && p.emergencyPhone) base.emergencyPhone = p.emergencyPhone;
    if (p.updatedAt > base.updatedAt) base.updatedAt = p.updatedAt;
    for (const a of p.allergies) allergiesSet.add(a);
    for (const c of p.chronicConditions) conditionsSet.add(c);
  }

  base.allergies = Array.from(allergiesSet);
  base.chronicConditions = Array.from(conditionsSet);
  return base;
}

export async function getActiveMedicationsInHospitals(
  icNumber: string,
  hospitalIds: string[]
): Promise<ActiveEmergencyMedication[]> {
  const perHospital = await Promise.all(
    hospitalIds.map(async hospitalId => {
      try {
        const hospitalName = getHospitalById(hospitalId)?.shortName || hospitalId;
        const records = await getHospitalDb(hospitalId).getRecordsByPatient(icNumber);
        const meds: ActiveEmergencyMedication[] = [];
        for (const record of records) {
          for (const rx of record.prescriptions || []) {
            if (rx.isActive) {
              meds.push({
                medicationName: rx.medicationName,
                dosage: rx.dosage,
                frequency: rx.frequency,
                hospitalName,
              });
            }
          }
        }
        return meds;
      } catch {
        return [];
      }
    })
  );

  const seen = new Set<string>();
  const aggregated: ActiveEmergencyMedication[] = [];
  for (const list of perHospital) {
    for (const med of list) {
      const key = `${med.medicationName.toLowerCase()}|${med.dosage.toLowerCase()}|${med.hospitalName}`;
      if (!seen.has(key)) {
        seen.add(key);
        aggregated.push(med);
      }
    }
  }
  return aggregated;
}
