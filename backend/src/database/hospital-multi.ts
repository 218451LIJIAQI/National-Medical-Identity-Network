import crypto from 'crypto';
import {
  Patient,
  MedicalRecord,
  Doctor,
  VitalSigns,
  Prescription,
  LabReport,
  QueueTicket,
  ClinicAppointment,
  PatientNursingChart,
  NursingObservation,
  NursingProgressNote,
  PatientFluidBalance,
  PatientBillingAccount,
  BillingLineItem,
  HospitalWard,
  HospitalDepartment,
  StaffRosterMember,
  InventorySku,
  normalizeIcNumber,
  parseMyKadParts,
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

function parseOptionalDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePrescriptionInput(p: Partial<Prescription>) {
  return {
    medicationName: String(p.medicationName || '').trim(),
    dosage: String(p.dosage || '').trim(),
    frequency: String(p.frequency || '').trim(),
    duration: p.duration ? String(p.duration).trim() : null,
    quantity: typeof p.quantity === 'number' && !Number.isNaN(p.quantity) ? Math.max(1, Math.trunc(p.quantity)) : null,
    instructions: p.instructions ? String(p.instructions).trim() : null,
    isActive: p.isActive !== false,
  };
}

function normalizeLabReportInput(l: Partial<LabReport>, fallbackDate: Date) {
  const parsedDate = parseOptionalDate(l.reportDate);
  return {
    testType: String(l.testType || 'General Lab').trim(),
    testName: String(l.testName || '').trim(),
    result: String(l.result || 'Pending').trim(),
    unit: l.unit ? String(l.unit).trim() : null,
    referenceRange: l.referenceRange ? String(l.referenceRange).trim() : null,
    isAbnormal: Boolean(l.isAbnormal),
    reportDate: parsedDate || fallbackDate,
    notes: l.notes ? String(l.notes).trim() : null,
  };
}

const HOSPITAL_PREFIX: Record<string, string> = {
  'hospital-kl': 'KL',
  'hospital-penang': 'PG',
  'hospital-jb': 'JB',
  'hospital-kuching': 'KC',
  'hospital-kk': 'KK',
};

function createDefaultWards(prefix: string): HospitalWard[] {
  const scale = prefix === 'KL' ? 1.2 : prefix === 'PG' || prefix === 'JB' ? 1.0 : 0.85;
  const cap = (n: number) => Math.max(6, Math.round(n * scale));
  return [
    { id: `${prefix}-W1`, name: 'Medical Ward 4A (Male)', nameMY: 'Wad Perubatan 4A (Lelaki)', totalBeds: cap(32), occupied: cap(26), reserved: 2, maintenance: 1, type: 'general' },
    { id: `${prefix}-W2`, name: 'Medical Ward 4B (Female)', nameMY: 'Wad Perubatan 4B (Perempuan)', totalBeds: cap(32), occupied: cap(24), reserved: 2, maintenance: 0, type: 'general' },
    { id: `${prefix}-W3`, name: 'Intensive Care Unit (ICU)', nameMY: 'Unit Rawatan Rapi (ICU)', totalBeds: cap(14), occupied: cap(11), reserved: 1, maintenance: 0, type: 'icu' },
    { id: `${prefix}-W4`, name: 'Obstetrics & Maternity Ward', nameMY: 'Wad Bersalin & Obstetrik', totalBeds: cap(26), occupied: cap(18), reserved: 3, maintenance: 1, type: 'maternity' },
    { id: `${prefix}-W5`, name: 'Paediatric Care Ward 2C', nameMY: 'Wad Pediatrik 2C', totalBeds: cap(22), occupied: cap(15), reserved: 1, maintenance: 1, type: 'pediatric' },
    { id: `${prefix}-W6`, name: 'Negative-Pressure Isolation Ward', nameMY: 'Wad Isolasi Tekanan Negatif', totalBeds: cap(10), occupied: cap(4), reserved: 2, maintenance: 0, type: 'isolation' },
  ];
}

function createDefaultDepartments(prefix: string, shortName: string): HospitalDepartment[] {
  return [
    {
      id: `${prefix}-DEP-EM`,
      name: 'Emergency & Trauma',
      nameMY: 'Kecemasan & Trauma',
      head: `Dato' Dr. Kamarul (${shortName})`,
      headTitle: 'Senior Consultant Emergency Physician',
      staffCount: 46,
      doctorCount: 14,
      nurseCount: 32,
      location: 'Block A, Ground Floor',
      extension: '2100',
      operatingHours: '24 Hours Daily',
      status: 'active',
      specialties: ['Resuscitation', 'Trauma', 'Pre-Hospital Care', 'Toxicology'],
    },
    {
      id: `${prefix}-DEP-IM`,
      name: 'Internal Medicine',
      nameMY: 'Perubatan Dalaman',
      head: `Dr. Lim Siew Mei (${shortName})`,
      headTitle: 'Head of Internal Medicine',
      staffCount: 38,
      doctorCount: 12,
      nurseCount: 26,
      location: 'Block B, Level 3',
      extension: '2310',
      operatingHours: '08:00 - 17:00 (Mon-Fri)',
      status: 'active',
      specialties: ['Endocrinology', 'Infectious Disease', 'Nephrology', 'Respiratory'],
    },
    {
      id: `${prefix}-DEP-CD`,
      name: 'Cardiology & Coronary Care',
      nameMY: 'Kardiologi & Rawatan Koronari',
      head: `Dr. Rajendran Subramaniam (${shortName})`,
      headTitle: 'Consultant Interventional Cardiologist',
      staffCount: 29,
      doctorCount: 9,
      nurseCount: 20,
      location: 'Block C, Level 4',
      extension: '2420',
      operatingHours: '24 Hours Cath Lab / 08:00 - 17:00 Clinic',
      status: 'active',
      specialties: ['Interventional Cardiology', 'Heart Failure', 'Arrhythmia'],
    },
    {
      id: `${prefix}-DEP-PD`,
      name: 'Paediatrics',
      nameMY: 'Pediatrik',
      head: `Dr. Nurul Hidayah (${shortName})`,
      headTitle: 'Consultant Paediatrician',
      staffCount: 31,
      doctorCount: 9,
      nurseCount: 22,
      location: 'Women & Children Wing, Level 2',
      extension: '2510',
      operatingHours: '08:00 - 17:00 (24h Inpatient)',
      status: 'active',
      specialties: ['General Paediatrics', 'NICU', 'Adolescent Medicine'],
    },
    {
      id: `${prefix}-DEP-RD`,
      name: 'Diagnostic Imaging & Radiology',
      nameMY: 'Pengimejan Diagnostik & Radiologi',
      head: `Dr. Wong Kah Wai (${shortName})`,
      headTitle: 'Consultant Radiologist',
      staffCount: 22,
      doctorCount: 6,
      nurseCount: 16,
      location: 'Block A, Level 1',
      extension: '2180',
      operatingHours: '24 Hours Emergency CT/X-Ray',
      status: 'limited',
      specialties: ['CT', 'MRI', 'Ultrasound', 'Digital Radiography'],
    },
  ];
}

function createDefaultSupportStaff(prefix: string, hospitalId: string): StaffRosterMember[] {
  const domain = `${hospitalId.replace('hospital-', '')}.moh.gov.my`;
  return [
    {
      id: `staff-${prefix.toLowerCase()}-n1`,
      name: 'SN Siti Nurhaliza Binti Othman',
      icNumber: '910412-10-5432',
      role: 'nurse',
      department: 'Internal Medicine',
      email: `siti.nur@${domain}`,
      phone: '+60 12-388 4101',
      status: 'active',
      joinDate: '2021-03-15',
    },
    {
      id: `staff-${prefix.toLowerCase()}-n2`,
      name: 'SN Kavitha A/P Krishnan',
      icNumber: '930824-07-5812',
      role: 'nurse',
      department: 'Emergency & Trauma',
      email: `kavitha.k@${domain}`,
      phone: '+60 16-492 7720',
      status: 'active',
      joinDate: '2022-07-01',
    },
    {
      id: `staff-${prefix.toLowerCase()}-p1`,
      name: 'RPh Chong Wei Jian',
      icNumber: '890619-14-5219',
      role: 'pharmacist',
      department: 'Outpatient Pharmacy',
      email: `weijian.chong@${domain}`,
      phone: '+60 17-219 6305',
      status: 'active',
      joinDate: '2019-11-10',
    },
    {
      id: `staff-${prefix.toLowerCase()}-t1`,
      name: 'MLT Mohd Hafiz Bin Zulkifli',
      icNumber: '940215-01-5691',
      role: 'technician',
      department: 'Pathology & Laboratory',
      email: `hafiz.zul@${domain}`,
      phone: '+60 19-774 3088',
      status: 'on_leave',
      joinDate: '2023-01-20',
    },
  ];
}

function createDefaultInventory(prefix: string): InventorySku[] {
  return [
    { id: `${prefix}-INV-01`, name: 'Paracetamol 500mg Tablet', nameMY: 'Tablet Paracetamol 500mg', category: 'medicine', sku: `${prefix}-MED-001`, currentStock: 14500, minStock: 5000, maxStock: 30000, unit: 'tablets', lastRestocked: '2026-05-02', expiryDate: '2028-04-30', supplier: 'Pharmaniaga Logistics Sdn Bhd', pricePerUnit: 0.08 },
    { id: `${prefix}-INV-02`, name: 'Metformin HCl 500mg Tablet', nameMY: 'Tablet Metformin 500mg', category: 'medicine', sku: `${prefix}-MED-002`, currentStock: 8200, minStock: 4000, maxStock: 25000, unit: 'tablets', lastRestocked: '2026-04-28', expiryDate: '2027-11-30', supplier: 'Duopharma Biotech Berhad', pricePerUnit: 0.14 },
    { id: `${prefix}-INV-03`, name: 'Amoxicillin 500mg Capsule', nameMY: 'Kapsul Amoxicillin 500mg', category: 'medicine', sku: `${prefix}-MED-003`, currentStock: 1200, minStock: 2500, maxStock: 12000, unit: 'capsules', lastRestocked: '2026-04-10', expiryDate: '2027-06-30', supplier: 'Pharmaniaga Logistics Sdn Bhd', pricePerUnit: 0.32 },
    { id: `${prefix}-INV-04`, name: 'N95 Particulate Respirator Mask', nameMY: 'Pelitup Muka Respirator N95', category: 'ppe', sku: `${prefix}-PPE-010`, currentStock: 680, minStock: 1000, maxStock: 8000, unit: 'pieces', lastRestocked: '2026-03-19', expiryDate: '2029-03-01', supplier: 'Medidata Bekalan KKM', pricePerUnit: 3.4 },
    { id: `${prefix}-INV-05`, name: 'Sterile Nitrile Examination Gloves (M)', nameMY: 'Sarung Tangan Pemeriksaan Nitril (M)', category: 'consumable', sku: `${prefix}-CON-021`, currentStock: 420, minStock: 250, maxStock: 1500, unit: 'boxes', lastRestocked: '2026-05-08', expiryDate: '2028-12-31', supplier: 'Top Glove Medical Malaysia', pricePerUnit: 16.5 },
    { id: `${prefix}-INV-06`, name: 'Multiparameter Bedside Vital Monitor', nameMY: 'Monitor Tanda Vital Tepi Katil', category: 'equipment', sku: `${prefix}-EQP-104`, currentStock: 28, minStock: 20, maxStock: 40, unit: 'units', lastRestocked: '2025-11-15', supplier: 'IDS Medical Systems Malaysia', pricePerUnit: 6800.0 },
  ];
}

function createDefaultQueue(prefix: string): QueueTicket[] {
  return [
    {
      queueNo: `${prefix}-1001`,
      name: 'Tan Wei Ming',
      icNumber: '850505-10-5111',
      age: 41,
      gender: 'M',
      category: 'Yellow',
      waitTime: '14 min',
      status: 'in-progress',
      complaint: 'Glycemic review & home BP elevation',
      createdAt: '2026-05-16T08:30:00.000Z',
    },
    {
      queueNo: `${prefix}-1002`,
      name: 'Aisyah Binti Ismail',
      icNumber: '900202-07-5222',
      age: 36,
      gender: 'F',
      category: 'Red',
      waitTime: '4 min',
      status: 'called',
      complaint: 'Acute wheezing & nocturnal dyspnoea',
      createdAt: '2026-05-16T08:42:00.000Z',
    },
    {
      queueNo: `${prefix}-1003`,
      name: 'Rajesh A/L Muthusamy',
      icNumber: '780915-08-5333',
      age: 48,
      gender: 'M',
      category: 'Green',
      waitTime: '22 min',
      status: 'waiting',
      complaint: 'Lipid panel review & medication refill',
      createdAt: '2026-05-16T08:50:00.000Z',
    },
  ];
}

function createDefaultAppointments(prefix: string): ClinicAppointment[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return [
    {
      id: `${prefix}-APT-1`,
      patientName: 'Tan Wei Ming',
      icNumber: '850505-10-5111',
      phone: '+60 12-345 6789',
      date: todayStr,
      time: '09:30',
      type: 'follow-up',
      status: 'confirmed',
    },
    {
      id: `${prefix}-APT-2`,
      patientName: 'Aisyah Binti Ismail',
      icNumber: '900202-07-5222',
      phone: '+60 17-222 3333',
      date: todayStr,
      time: '11:00',
      type: 'review',
      status: 'pending',
    },
    {
      id: `${prefix}-APT-3`,
      patientName: 'Mei Ling Wong',
      icNumber: '950620-13-5444',
      phone: '+60 16-888 4412',
      date: todayStr,
      time: '14:30',
      type: 'new',
      status: 'confirmed',
    },
  ];
}

export class HospitalDatabaseMulti {
  private hospitalId: string;
  private prisma: HospitalPrismaClient;
  private prefix: string;
  private queueSeq = 1004;
  private queueTickets: QueueTicket[];
  private appointments: ClinicAppointment[];
  private nursingCharts = new Map<string, PatientNursingChart>();
  private billingAccounts = new Map<string, PatientBillingAccount>();
  private wards: HospitalWard[];
  private departments: HospitalDepartment[];
  private supportStaff: StaffRosterMember[];
  private inventory: InventorySku[];
  private settledRevenueTotal = 0;
  private settledSubsidyTotal = 0;
  private settledReceiptsCount = 0;

  constructor(hospitalId: string) {
    this.hospitalId = hospitalId;
    this.prisma = getHospitalDbClient(hospitalId);
    this.prefix = HOSPITAL_PREFIX[hospitalId] || hospitalId.replace('hospital-', '').slice(0, 3).toUpperCase();
    const shortName = getHospitalById(hospitalId)?.shortName || this.prefix;
    this.queueTickets = createDefaultQueue(this.prefix);
    this.appointments = createDefaultAppointments(this.prefix);
    this.wards = createDefaultWards(this.prefix);
    this.departments = createDefaultDepartments(this.prefix, shortName);
    this.supportStaff = createDefaultSupportStaff(this.prefix, hospitalId);
    this.inventory = createDefaultInventory(this.prefix);
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
    const safeDob = parseOptionalDate(patient.dateOfBirth) || new Date('1990-01-01T00:00:00.000Z');

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
        allergies: JSON.stringify(Array.from(new Set((patient.allergies || []).map(a => a.trim()).filter(Boolean)))),
        chronicConditions: JSON.stringify(Array.from(new Set((patient.chronicConditions || []).map(c => c.trim()).filter(Boolean)))),
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

  async updatePatient(
    rawIcNumber: string,
    updates: Partial<Patient>,
    options?: { replaceArrays?: boolean }
  ): Promise<Patient | null> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    const existing = await this.getPatient(icNumber);
    if (!existing) return null;

    const cleanList = (arr: string[]) =>
      Array.from(new Set(arr.map(item => String(item || '').trim()).filter(Boolean)));

    const mergedAllergies =
      updates.allergies !== undefined
        ? options?.replaceArrays
          ? cleanList(updates.allergies)
          : cleanList([...existing.allergies, ...updates.allergies])
        : existing.allergies;

    const mergedConditions =
      updates.chronicConditions !== undefined
        ? options?.replaceArrays
          ? cleanList(updates.chronicConditions)
          : cleanList([...existing.chronicConditions, ...updates.chronicConditions])
        : existing.chronicConditions;

    const safeDob = parseOptionalDate(updates.dateOfBirth) || new Date(existing.dateOfBirth);

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
    const safeVisitDate = parseOptionalDate(record.visitDate) || new Date();
    const safeFollowUpDate = parseOptionalDate(record.followUpDate);
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
        followUpDate: safeFollowUpDate,
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

    const safeVisitDate = parseOptionalDate(updates.visitDate) || existing.visitDate;
    const safeFollowUpDate =
      updates.followUpDate !== undefined
        ? parseOptionalDate(updates.followUpDate)
        : existing.followUpDate;

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
      followUpDate: safeFollowUpDate,
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

  async getStats(options?: { blockedIcs?: Set<string>; redactClinicalDetails?: boolean }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const blockedSet = options?.blockedIcs;
    const blockedList = blockedSet && blockedSet.size > 0 ? Array.from(blockedSet) : [];
    const icExclusion = blockedList.length > 0 ? { icNumber: { notIn: blockedList } } : {};

    const [totalPatients, totalRecords, totalDoctors, todayVisits, recentRecords] = await Promise.all([
      this.prisma.patient.count(blockedList.length > 0 ? { where: icExclusion } : undefined),
      this.prisma.medicalRecord.count(blockedList.length > 0 ? { where: icExclusion } : undefined),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.medicalRecord.count({
        where: {
          visitDate: { gte: today },
          ...icExclusion,
        },
      }),
      this.prisma.medicalRecord.findMany({
        include: { doctor: true, prescriptions: true, labReports: true },
        orderBy: { visitDate: 'desc' },
        take: 25,
      }),
    ]);

    const filteredRecords = recentRecords
      .filter(r => !blockedSet || !blockedSet.has(normalizeIcNumber(r.icNumber)))
      .slice(0, 10)
      .map(r => {
        const formatted = this.formatRecord(r);
        if (options?.redactClinicalDetails) {
          return {
            ...formatted,
            notes: '',
            prescriptions: [],
            labReports: [],
          };
        }
        return formatted;
      });

    return {
      totalPatients,
      totalRecords,
      totalDoctors,
      todayVisits,
      recentRecords: filteredRecords,
    };
  }

  // ---------------------------------------------------------------------------
  // Clinical Workstation Modules: Queue, Appointments, Nursing Chart & Billing
  // ---------------------------------------------------------------------------
  getQueue(blockedIcs?: Set<string>): QueueTicket[] {
    return this.queueTickets.filter(
      q => !blockedIcs || !blockedIcs.has(normalizeIcNumber(q.icNumber))
    );
  }

  enqueuePatient(input: {
    name: string;
    icNumber: string;
    category: 'Green' | 'Yellow' | 'Red';
    complaint: string;
  }): QueueTicket {
    const icNumber = normalizeIcNumber(input.icNumber);
    const parsed = parseMyKadParts(icNumber);
    const ticket: QueueTicket = {
      queueNo: `${this.prefix}-${this.queueSeq++}`,
      name: String(input.name || '').trim() || `Patient ${icNumber}`,
      icNumber,
      age: parsed?.age ?? 35,
      gender: parsed?.gender === 'female' ? 'F' : 'M',
      category: input.category,
      waitTime: '0 min',
      status: 'waiting',
      complaint: String(input.complaint || '').trim() || 'General outpatient consultation',
      createdAt: new Date().toISOString(),
    };
    this.queueTickets.push(ticket);
    return ticket;
  }

  updateQueueTicket(queueNo: string, status: QueueTicket['status']): QueueTicket | null {
    const ticket = this.queueTickets.find(q => q.queueNo === queueNo);
    if (!ticket) return null;
    ticket.status = status;
    return { ...ticket };
  }

  removeQueueTicket(queueNo: string): boolean {
    const before = this.queueTickets.length;
    this.queueTickets = this.queueTickets.filter(q => q.queueNo !== queueNo);
    return this.queueTickets.length < before;
  }

  getAppointments(blockedIcs?: Set<string>): ClinicAppointment[] {
    return this.appointments.filter(
      a => !blockedIcs || !blockedIcs.has(normalizeIcNumber(a.icNumber))
    );
  }

  createAppointment(input: Omit<ClinicAppointment, 'id' | 'status'> & { status?: ClinicAppointment['status'] }): ClinicAppointment {
    const created: ClinicAppointment = {
      id: `${this.prefix}-APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`,
      patientName: String(input.patientName || '').trim(),
      icNumber: normalizeIcNumber(input.icNumber),
      phone: String(input.phone || '').trim() || '-',
      date: input.date,
      time: input.time,
      type: input.type,
      status: input.status || 'confirmed',
    };
    this.appointments.unshift(created);
    return created;
  }

  updateAppointmentStatus(id: string, status: ClinicAppointment['status']): ClinicAppointment | null {
    const found = this.appointments.find(a => a.id === id);
    if (!found) return null;
    found.status = status;
    return { ...found };
  }

  async getOrInitNursingChart(rawIcNumber: string): Promise<PatientNursingChart> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    const existing = this.nursingCharts.get(icNumber);
    if (existing) return existing;

    const records = await this.getRecordsByPatient(icNumber);
    const latestWithVitals = records.find(r => r.vitalSigns);
    const initialVitals: NursingObservation[] = [];

    if (latestWithVitals?.vitalSigns) {
      const v = latestWithVitals.vitalSigns;
      const sys = v.bloodPressureSystolic ?? 120;
      const dia = v.bloodPressureDiastolic ?? 80;
      initialVitals.push({
        id: `obs-init-${icNumber}`,
        timestamp: latestWithVitals.visitDate,
        bp: `${sys}/${dia}`,
        pulse: v.heartRate ?? 76,
        temp: v.temperature ?? 36.8,
        rr: v.respiratoryRate ?? 16,
        spo2: v.oxygenSaturation ?? 98,
        gcs: '15/15 (E4V5M6)',
        painScore: 1,
        recordedBy: latestWithVitals.doctorName || 'Triage RN',
      });
    }

    const chart: PatientNursingChart = {
      icNumber,
      ward: `${this.prefix}-W1`,
      bedNumber: `B-${(parseInt(icNumber.replace(/\D/g, '').slice(-2), 10) % 24) + 1}`,
      vitalsHistory: initialVitals,
      notes: [],
      ioChart: {
        oralMl: 0,
        ivFluidMl: 0,
        bloodMl: 0,
        urineMl: 0,
        drainMl: 0,
        vomitusMl: 0,
        updatedAt: new Date().toISOString(),
      },
    };
    this.nursingCharts.set(icNumber, chart);
    return chart;
  }

  async addNursingObservation(
    rawIcNumber: string,
    obs: Omit<NursingObservation, 'id' | 'timestamp'>
  ): Promise<PatientNursingChart> {
    const chart = await this.getOrInitNursingChart(rawIcNumber);
    chart.vitalsHistory.unshift({
      ...obs,
      id: `obs-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    });
    return chart;
  }

  async addNursingNote(
    rawIcNumber: string,
    note: Omit<NursingProgressNote, 'id' | 'timestamp'>
  ): Promise<PatientNursingChart> {
    const chart = await this.getOrInitNursingChart(rawIcNumber);
    chart.notes.unshift({
      ...note,
      id: `nn-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    });
    return chart;
  }

  async updateFluidBalance(
    rawIcNumber: string,
    updates: Partial<Omit<PatientFluidBalance, 'updatedAt'>> & { ward?: string; bedNumber?: string }
  ): Promise<PatientNursingChart> {
    const chart = await this.getOrInitNursingChart(rawIcNumber);
    if (updates.ward) chart.ward = updates.ward;
    if (updates.bedNumber) chart.bedNumber = updates.bedNumber;
    const nonNeg = (val: unknown, prev: number) =>
      val !== undefined && Number.isFinite(Number(val)) ? Math.max(0, Math.round(Number(val))) : prev;
    chart.ioChart = {
      oralMl: nonNeg(updates.oralMl, chart.ioChart.oralMl),
      ivFluidMl: nonNeg(updates.ivFluidMl, chart.ioChart.ivFluidMl),
      bloodMl: nonNeg(updates.bloodMl, chart.ioChart.bloodMl),
      urineMl: nonNeg(updates.urineMl, chart.ioChart.urineMl),
      drainMl: nonNeg(updates.drainMl, chart.ioChart.drainMl),
      vomitusMl: nonNeg(updates.vomitusMl, chart.ioChart.vomitusMl),
      updatedAt: new Date().toISOString(),
    };
    return chart;
  }

  async getOrInitBillingAccount(rawIcNumber: string): Promise<PatientBillingAccount> {
    const icNumber = normalizeIcNumber(rawIcNumber);
    const existing = this.billingAccounts.get(icNumber);
    if (existing) return existing;

    const records = await this.getRecordsByPatient(icNumber);
    const items: BillingLineItem[] = [
      {
        id: `bil-reg-${icNumber}`,
        category: 'Outpatient Consultation',
        description: 'MOH Specialist / Outpatient Clinic Registration (Akta Fi 1951)',
        originalPrice: 30.0,
        subsidyPercent: 96.67,
      },
    ];

    const latestRecord = records[0];
    if (latestRecord) {
      for (const rx of (latestRecord.prescriptions || []).slice(0, 4)) {
        items.push({
          id: `bil-rx-${rx.id || rx.medicationName}`,
          category: 'Pharmacy Dispensing',
          description: `${rx.medicationName} ${rx.dosage} (${rx.duration || rx.frequency})`,
          originalPrice: 28.0,
          subsidyPercent: 100,
        });
      }
      for (const lab of (latestRecord.labReports || []).slice(0, 4)) {
        items.push({
          id: `bil-lab-${lab.id || lab.testName}`,
          category: 'Diagnostic Investigation',
          description: `${lab.testType}: ${lab.testName}`,
          originalPrice: 45.0,
          subsidyPercent: 95,
        });
      }
    }

    const account: PatientBillingAccount = {
      icNumber,
      subsidyStatus: 'eligible',
      items,
      receipt: null,
    };
    this.billingAccounts.set(icNumber, account);
    return account;
  }

  async addBillingItem(
    rawIcNumber: string,
    item: Omit<BillingLineItem, 'id'>
  ): Promise<PatientBillingAccount> {
    const account = await this.getOrInitBillingAccount(rawIcNumber);
    account.receipt = null;
    account.items.push({
      id: `bil-${crypto.randomUUID().slice(0, 8)}`,
      category: String(item.category || 'Clinical Service').trim(),
      description: String(item.description || '').trim(),
      originalPrice: Math.max(0, Number(item.originalPrice) || 0),
      subsidyPercent: Math.min(100, Math.max(0, Number(item.subsidyPercent ?? (account.subsidyStatus === 'eligible' ? 95 : 0)))),
    });
    return account;
  }

  async removeBillingItem(rawIcNumber: string, itemId: string): Promise<PatientBillingAccount> {
    const account = await this.getOrInitBillingAccount(rawIcNumber);
    account.items = account.items.filter(i => i.id !== itemId);
    account.receipt = null;
    return account;
  }

  async setBillingSubsidyStatus(
    rawIcNumber: string,
    subsidyStatus: PatientBillingAccount['subsidyStatus']
  ): Promise<PatientBillingAccount> {
    const account = await this.getOrInitBillingAccount(rawIcNumber);
    account.subsidyStatus = subsidyStatus;
    account.items = account.items.map(item => ({
      ...item,
      subsidyPercent:
        subsidyStatus === 'not-eligible'
          ? 0
          : subsidyStatus === 'pending'
            ? 50
            : item.category === 'Pharmacy Dispensing'
              ? 100
              : 95,
    }));
    account.receipt = null;
    return account;
  }

  async settleBillingAccount(
    rawIcNumber: string,
    paymentMethod: 'counter' | 'online' | 'waived'
  ): Promise<PatientBillingAccount> {
    const account = await this.getOrInitBillingAccount(rawIcNumber);
    const grossAmount = Number(account.items.reduce((s, i) => s + i.originalPrice, 0).toFixed(2));
    const netAmount =
      paymentMethod === 'waived'
        ? 0
        : Number(
            account.items
              .reduce((s, i) => {
                const effSubsidy = account.subsidyStatus === 'eligible' ? i.subsidyPercent : account.subsidyStatus === 'pending' ? Math.min(50, i.subsidyPercent) : 0;
                return s + i.originalPrice * (1 - effSubsidy / 100);
              }, 0)
              .toFixed(2)
          );
    const subsidyAmount = Number(Math.max(0, grossAmount - netAmount).toFixed(2));

    if (!account.receipt) {
      this.settledRevenueTotal = Number((this.settledRevenueTotal + netAmount).toFixed(2));
      this.settledSubsidyTotal = Number((this.settledSubsidyTotal + subsidyAmount).toFixed(2));
      this.settledReceiptsCount += 1;
    }

    account.receipt = {
      receiptNo: `RCP-${this.prefix}-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString(),
      paymentMethod,
      grossAmount,
      subsidyAmount,
      netAmount,
    };
    return account;
  }

  // ---------------------------------------------------------------------------
  // Hospital Admin Modules: Wards, Departments, Staff Roster, Inventory, Finance
  // ---------------------------------------------------------------------------
  getWards(): HospitalWard[] {
    return this.wards.map(w => ({ ...w }));
  }

  createWard(input: Omit<HospitalWard, 'id'>): HospitalWard {
    const created: HospitalWard = {
      ...input,
      id: `${this.prefix}-W${this.wards.length + 1}-${Date.now().toString(36).slice(-3).toUpperCase()}`,
    };
    this.wards.push(created);
    return { ...created };
  }

  updateWard(wardId: string, updates: Partial<Omit<HospitalWard, 'id'>>): HospitalWard | null {
    const ward = this.wards.find(w => w.id === wardId);
    if (!ward) return null;
    Object.assign(ward, updates);
    return { ...ward };
  }

  getDepartments(): HospitalDepartment[] {
    return this.departments.map(d => ({ ...d, specialties: [...d.specialties] }));
  }

  createDepartment(input: Omit<HospitalDepartment, 'id'>): HospitalDepartment {
    const created: HospitalDepartment = {
      ...input,
      id: `${this.prefix}-DEP-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      specialties: [...(input.specialties || [])],
    };
    this.departments.push(created);
    return { ...created };
  }

  updateDepartment(deptId: string, updates: Partial<Omit<HospitalDepartment, 'id'>>): HospitalDepartment | null {
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) return null;
    Object.assign(dept, updates);
    if (updates.specialties) dept.specialties = [...updates.specialties];
    return { ...dept, specialties: [...dept.specialties] };
  }

  async getStaffRoster(): Promise<StaffRosterMember[]> {
    const doctors = await this.getDoctors();
    const doctorMembers: StaffRosterMember[] = doctors.map(doc => ({
      id: doc.id,
      name: doc.fullName,
      icNumber: doc.icNumber,
      role: 'doctor',
      department: doc.department || doc.specialization || 'General Medicine',
      email: doc.email || `${doc.id}@${this.hospitalId}.gov.my`,
      phone: doc.phone || '+60 3-2615 5555',
      status: doc.isActive ? 'active' : 'inactive',
      joinDate: '2020-01-15',
      specialization: doc.specialization,
      licenseNumber: doc.licenseNumber,
    }));
    return [...doctorMembers, ...this.supportStaff.map(s => ({ ...s }))];
  }

  async upsertStaffMember(input: Partial<StaffRosterMember> & { id?: string }): Promise<StaffRosterMember> {
    const normalizedIc = normalizeIcNumber(String(input.icNumber || ''));
    const role = input.role || 'nurse';
    const status = input.status || 'active';

    if (role === 'doctor') {
      const existingById = input.id ? await this.prisma.doctor.findUnique({ where: { id: input.id } }) : null;
      const existingByIc = !existingById && normalizedIc ? await this.prisma.doctor.findFirst({ where: { icNumber: normalizedIc } }) : null;
      const target = existingById || existingByIc;

      if (target) {
        const updatedDoc = await this.prisma.doctor.update({
          where: { id: target.id },
          data: {
            fullName: input.name ? String(input.name).trim() : target.fullName,
            specialization: input.specialization ? String(input.specialization).trim() : target.specialization,
            department: input.department ? String(input.department).trim() : target.department,
            licenseNumber: input.licenseNumber !== undefined ? String(input.licenseNumber).trim() : target.licenseNumber,
            phone: input.phone !== undefined ? String(input.phone).trim() : target.phone,
            email: input.email !== undefined ? String(input.email).trim() : target.email,
            isActive: status === 'active',
          },
        });
        return {
          id: updatedDoc.id,
          name: updatedDoc.fullName,
          icNumber: updatedDoc.icNumber,
          role: 'doctor',
          department: updatedDoc.department || updatedDoc.specialization,
          email: updatedDoc.email || '',
          phone: updatedDoc.phone || '',
          status: updatedDoc.isActive ? 'active' : 'inactive',
          joinDate: input.joinDate || '2020-01-15',
          specialization: updatedDoc.specialization,
          licenseNumber: updatedDoc.licenseNumber || '',
        };
      }

      const newId = input.id || `doc-${this.prefix.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
      const createdDoc = await this.prisma.doctor.create({
        data: {
          id: newId,
          icNumber: normalizedIc,
          fullName: String(input.name || '').trim(),
          specialization: String(input.specialization || input.department || 'General Medicine').trim(),
          licenseNumber: String(input.licenseNumber || `MMC-${Math.floor(40000 + Math.random() * 50000)}`).trim(),
          department: String(input.department || 'General Medicine').trim(),
          phone: String(input.phone || '').trim(),
          email: String(input.email || '').trim(),
          isActive: status === 'active',
        },
      });
      return {
        id: createdDoc.id,
        name: createdDoc.fullName,
        icNumber: createdDoc.icNumber,
        role: 'doctor',
        department: createdDoc.department || createdDoc.specialization,
        email: createdDoc.email || '',
        phone: createdDoc.phone || '',
        status: createdDoc.isActive ? 'active' : 'inactive',
        joinDate: input.joinDate || new Date().toISOString().split('T')[0],
        specialization: createdDoc.specialization,
        licenseNumber: createdDoc.licenseNumber || '',
      };
    }

    const existingIdx = this.supportStaff.findIndex(
      s => (input.id && s.id === input.id) || (normalizedIc && s.icNumber === normalizedIc)
    );
    if (existingIdx >= 0) {
      const curr = this.supportStaff[existingIdx];
      const updated: StaffRosterMember = {
        ...curr,
        name: input.name ? String(input.name).trim() : curr.name,
        icNumber: normalizedIc || curr.icNumber,
        role,
        department: input.department ? String(input.department).trim() : curr.department,
        email: input.email !== undefined ? String(input.email).trim() : curr.email,
        phone: input.phone !== undefined ? String(input.phone).trim() : curr.phone,
        status,
      };
      this.supportStaff[existingIdx] = updated;
      return { ...updated };
    }

    const created: StaffRosterMember = {
      id: `staff-${this.prefix.toLowerCase()}-${Date.now().toString(36).slice(-4)}`,
      name: String(input.name || '').trim(),
      icNumber: normalizedIc,
      role,
      department: String(input.department || 'General Ward').trim(),
      email: String(input.email || '').trim(),
      phone: String(input.phone || '').trim(),
      status,
      joinDate: input.joinDate || new Date().toISOString().split('T')[0],
    };
    this.supportStaff.push(created);
    return { ...created };
  }

  async deactivateOrRemoveStaff(staffId: string): Promise<boolean> {
    const doc = await this.prisma.doctor.findUnique({ where: { id: staffId } });
    if (doc) {
      await this.prisma.doctor.update({
        where: { id: staffId },
        data: { isActive: false },
      });
      return true;
    }
    const before = this.supportStaff.length;
    this.supportStaff = this.supportStaff.filter(s => s.id !== staffId);
    return this.supportStaff.length < before;
  }

  getInventory(): InventorySku[] {
    return this.inventory.map(item => ({ ...item }));
  }

  createInventoryItem(input: Omit<InventorySku, 'id'>): InventorySku {
    const created: InventorySku = {
      ...input,
      id: `${this.prefix}-INV-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    };
    this.inventory.unshift(created);
    return { ...created };
  }

  updateInventoryItem(itemId: string, updates: Partial<Omit<InventorySku, 'id'>>): InventorySku | null {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) return null;
    Object.assign(item, updates);
    return { ...item };
  }

  deleteInventoryItem(itemId: string): boolean {
    const before = this.inventory.length;
    this.inventory = this.inventory.filter(i => i.id !== itemId);
    return this.inventory.length < before;
  }

  async getFinancialSummary() {
    const mult =
      this.prefix === 'KL' ? 1.35 : this.prefix === 'PG' ? 1.1 : this.prefix === 'JB' ? 1.05 : 0.88;
    const roundRM = (v: number) => Math.round(v * mult);
    const inventoryValuation = Number(
      this.inventory.reduce((sum, i) => sum + i.currentStock * i.pricePerUnit, 0).toFixed(2)
    );

    const monthlySeries = [
      { month: 'Dec', mohAllocation: roundRM(4100000), patientCollection: roundRM(185000), operatingExpense: roundRM(3890000), subsidyAbsorbed: roundRM(2640000) },
      { month: 'Jan', mohAllocation: roundRM(4250000), patientCollection: roundRM(192000), operatingExpense: roundRM(3960000), subsidyAbsorbed: roundRM(2710000) },
      { month: 'Feb', mohAllocation: roundRM(4180000), patientCollection: roundRM(178000), operatingExpense: roundRM(3840000), subsidyAbsorbed: roundRM(2590000) },
      { month: 'Mar', mohAllocation: roundRM(4380000), patientCollection: roundRM(204000), operatingExpense: roundRM(4080000), subsidyAbsorbed: roundRM(2830000) },
      { month: 'Apr', mohAllocation: roundRM(4420000), patientCollection: roundRM(211000), operatingExpense: roundRM(4120000), subsidyAbsorbed: roundRM(2890000) },
      {
        month: 'May',
        mohAllocation: roundRM(4500000),
        patientCollection: roundRM(216000) + this.settledRevenueTotal,
        operatingExpense: roundRM(4170000),
        subsidyAbsorbed: roundRM(2940000) + this.settledSubsidyTotal,
      },
    ];

    const expenseBreakdown = [
      { category: 'Clinical & Nursing Emoluments', amount: roundRM(1890000), sharePercent: 45.3 },
      { category: 'Pharmaceuticals & Vaccines (Pharmaniaga/KKM)', amount: roundRM(960000), sharePercent: 23.0 },
      { category: 'Diagnostic Reagents & Imaging Maintenance', amount: roundRM(610000), sharePercent: 14.6 },
      { category: 'Ward Consumables, PPE & Sterile Supply', amount: roundRM(430000), sharePercent: 10.3 },
      { category: 'Facility Utilities & Biomedical Engineering', amount: roundRM(280000), sharePercent: 6.8 },
    ];

    return {
      hospitalId: this.hospitalId,
      hospitalName: getHospitalById(this.hospitalId)?.name || this.hospitalId,
      fiscalYear: 'FY 2026 (KKM Operating Vote B42)',
      settledReceiptsCount: this.settledReceiptsCount,
      liveSettledRevenue: this.settledRevenueTotal,
      liveSubsidyAbsorbed: this.settledSubsidyTotal,
      inventoryValuation,
      monthlySeries,
      expenseBreakdown,
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
