import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getHospitalDb, findPatientInHospitals } from '../database/hospital-multi';
import {
  updatePatientIndex,
  createAuditLog,
  getPatientIndex,
  getBlockedHospitals,
  getBlockedPatientIcsForHospital,
} from '../database/central-multi';
import {
  authenticate,
  authorize,
  authorizeHospital,
  requireHospitalVerification,
} from '../middleware/auth';
import { getHospitalById } from '../config';
import {
  AuditAction,
  ClinicAppointment,
  HospitalDepartment,
  HospitalWard,
  InventorySku,
  MedicalRecord,
  Patient,
  QueueTicket,
  StaffRosterMember,
  VitalSigns,
  inferDemographicsFromMyKad,
  isValidMyKadIc,
  normalizeIcNumber,
} from '../types';

const router = Router();

const DUPLICATE_SUBMISSION_WINDOW_MS = 2000;
const recentRecordFingerprints = new Map<string, number>();

export function clearRecordSubmissionGuardForTesting(): void {
  recentRecordFingerprints.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentRecordFingerprints.entries()) {
    if (now - ts > DUPLICATE_SUBMISSION_WINDOW_MS * 2) {
      recentRecordFingerprints.delete(key);
    }
  }
}, 120_000).unref();

const staffAuthChain = [authenticate, requireHospitalVerification];

function withHospitalRoute(
  errorLabel: string,
  fallbackMessage: string,
  handler: (req: Request, res: Response, hospitalId: string) => Promise<void> | void
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { hospitalId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }
      await handler(req, res, hospitalId);
    } catch (error) {
      console.error(`${errorLabel}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: fallbackMessage });
      }
    }
  };
}

function ensureValidIc(rawIc: unknown, res: Response): string | null {
  const icNumber = normalizeIcNumber(String(rawIc || ''));
  if (!icNumber || !isValidMyKadIc(icNumber)) {
    res.status(400).json({
      success: false,
      error: 'Valid Malaysian MyKad IC number (YYMMDD-PB-XXXX) is required',
    });
    return null;
  }
  return icNumber;
}

function isValidIsoCalendarDate(raw: unknown): boolean {
  const str = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const parsed = new Date(`${str}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === str;
}

function isValidClockTime(raw: unknown): boolean {
  const str = String(raw || '').trim();
  if (!/^\d{2}:\d{2}$/.test(str)) return false;
  const [hh, mm] = str.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

async function enforcePatientPrivacyConsent(
  req: Request,
  res: Response,
  hospitalId: string,
  rawIcNumber: string,
  action: AuditAction
): Promise<boolean> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const blockedHospitals = await getBlockedHospitals(icNumber);
  if (blockedHospitals.includes(hospitalId)) {
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action,
      actorId: req.user?.userId,
      actorType: (req.user?.role || 'doctor') as 'doctor' | 'hospital_admin' | 'central_admin',
      actorHospitalId: hospitalId,
      targetIcNumber: icNumber,
      targetHospitalId: hospitalId,
      details: `Access denied: patient ${icNumber} blocked ${hospitalId}`,
      ipAddress: req.ip || 'unknown',
      success: false,
    });
    res.status(403).json({
      success: false,
      accessDenied: true,
      error: 'Patient has blocked access from your hospital',
    });
    return false;
  }
  return true;
}

async function loadScopedHospitalStats(hospitalId: string, callerRole?: string) {
  const blockedIcs = await getBlockedPatientIcsForHospital(hospitalId);
  return getHospitalDb(hospitalId).getStats({
    blockedIcs,
    redactClinicalDetails: callerRole !== 'doctor',
  });
}

type CreateOrUpdateRecordPayload = Partial<MedicalRecord> & {
  patientName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  allergies?: string[];
  chronicConditions?: string[];
  replaceAllergiesAndConditions?: boolean;
};

const VITAL_BOUNDS: Array<[keyof VitalSigns, number, number, string]> = [
  ['bloodPressureSystolic', 30, 300, 'Systolic blood pressure (30-300 mmHg)'],
  ['bloodPressureDiastolic', 15, 220, 'Diastolic blood pressure (15-220 mmHg)'],
  ['heartRate', 15, 300, 'Heart rate (15-300 bpm)'],
  ['respiratoryRate', 4, 60, 'Respiratory rate (4-60 breaths/min)'],
  ['temperature', 25, 45, 'Body temperature (25-45 °C)'],
  ['oxygenSaturation', 30, 100, 'Oxygen saturation SpO2 (30-100 %)'],
  ['weight', 0.3, 500, 'Weight (0.3-500 kg)'],
  ['height', 20, 260, 'Height (20-260 cm)'],
];

const VALID_WARD_TYPES: ReadonlyArray<HospitalWard['type']> = [
  'general',
  'icu',
  'maternity',
  'pediatric',
  'isolation',
];
const VALID_DEPT_STATUSES: ReadonlyArray<HospitalDepartment['status']> = ['active', 'limited', 'closed'];
const VALID_STAFF_ROLES: ReadonlyArray<StaffRosterMember['role']> = [
  'doctor',
  'nurse',
  'admin',
  'pharmacist',
  'technician',
];
const VALID_STAFF_STATUSES: ReadonlyArray<StaffRosterMember['status']> = ['active', 'on_leave', 'inactive'];
const VALID_INVENTORY_CATEGORIES: ReadonlyArray<InventorySku['category']> = [
  'medicine',
  'equipment',
  'consumable',
  'ppe',
];
const VALID_QUEUE_STATUSES: ReadonlyArray<QueueTicket['status']> = [
  'waiting',
  'called',
  'in-progress',
  'completed',
];
const VALID_APPOINTMENT_STATUSES: ReadonlyArray<ClinicAppointment['status']> = [
  'confirmed',
  'pending',
  'cancelled',
  'completed',
];

function validateClinicalRecordPayload(payload: CreateOrUpdateRecordPayload): string | null {
  if (payload.chiefComplaint !== undefined && String(payload.chiefComplaint).length > 500) {
    return 'Chief complaint exceeds maximum length of 500 characters';
  }
  if (payload.notes !== undefined && String(payload.notes).length > 10_000) {
    return 'Clinical notes exceed maximum length of 10,000 characters';
  }
  if (payload.patientName !== undefined && String(payload.patientName).length > 150) {
    return 'Patient full name exceeds maximum length of 150 characters';
  }

  if (payload.visitDate !== undefined && payload.visitDate !== '') {
    const parsedVisit = new Date(payload.visitDate);
    if (Number.isNaN(parsedVisit.getTime())) {
      return 'Invalid visitDate format';
    }
  }

  if (payload.followUpDate !== undefined && payload.followUpDate !== null && payload.followUpDate !== '') {
    const parsedFollowUp = new Date(payload.followUpDate);
    if (Number.isNaN(parsedFollowUp.getTime())) {
      return 'Invalid followUpDate format';
    }
  }

  if (Array.isArray(payload.diagnosis)) {
    if (payload.diagnosis.length > 30) {
      return 'Maximum of 30 diagnosis entries per record exceeded';
    }
    if (payload.diagnosis.some(d => String(d).length > 300)) {
      return 'Individual diagnosis entry exceeds maximum length of 300 characters';
    }
  }

  if (payload.vitalSigns && typeof payload.vitalSigns === 'object') {
    for (const [key, min, max, label] of VITAL_BOUNDS) {
      const val = payload.vitalSigns[key];
      if (val === undefined || val === null || (val as unknown) === '') continue;
      const num = Number(val);
      if (!Number.isFinite(num) || num < min || num > max) {
        return `Vital sign out of physiological bounds: ${label}`;
      }
    }
    const sys = payload.vitalSigns.bloodPressureSystolic;
    const dia = payload.vitalSigns.bloodPressureDiastolic;
    if (
      sys !== undefined &&
      sys !== null &&
      dia !== undefined &&
      dia !== null &&
      Number(dia) >= Number(sys)
    ) {
      return 'Diastolic blood pressure must be lower than systolic blood pressure';
    }
  }

  if (Array.isArray(payload.prescriptions)) {
    if (payload.prescriptions.length > 50) {
      return 'Maximum of 50 prescriptions per record exceeded';
    }
    for (const rx of payload.prescriptions) {
      const med = String(rx?.medicationName || '').trim();
      const dose = String(rx?.dosage || '').trim();
      const freq = String(rx?.frequency || '').trim();
      const instr = String(rx?.instructions || '').trim();
      const dur = String(rx?.duration || '').trim();
      const isCompletelyBlank = !med && !dose && !freq && !instr && !dur;
      if (isCompletelyBlank) continue;
      if (!med || !dose || !freq) {
        return 'Incomplete prescription item: medicationName, dosage, and frequency are all required';
      }
      if (med.length > 200 || dose.length > 100 || freq.length > 100 || instr.length > 500) {
        return 'Prescription field exceeds maximum allowed length';
      }
    }
  }

  if (Array.isArray(payload.labReports)) {
    if (payload.labReports.length > 50) {
      return 'Maximum of 50 lab report items per record exceeded';
    }
    for (const lab of payload.labReports) {
      const name = String(lab?.testName || '').trim();
      const result = String(lab?.result || '').trim();
      const unit = String(lab?.unit || '').trim();
      const refRange = String(lab?.referenceRange || '').trim();
      const notes = String(lab?.notes || '').trim();
      const hasAuxiliaryInput = Boolean(
        (result && result.toLowerCase() !== 'pending') || unit || refRange || notes
      );
      if (!name && hasAuxiliaryInput) {
        return 'Incomplete lab report item: testName is required when result or reference values are provided';
      }
      if (name.length > 200 || result.length > 200 || notes.length > 1000) {
        return 'Lab report field exceeds maximum allowed length';
      }
      if (lab?.reportDate) {
        const parsedLabDate = new Date(lab.reportDate);
        if (Number.isNaN(parsedLabDate.getTime())) {
          return 'Invalid lab reportDate format';
        }
      }
    }
  }

  return null;
}

function hasPatientFieldUpdates(payload: CreateOrUpdateRecordPayload): boolean {
  return Boolean(
    payload.replaceAllergiesAndConditions ||
      payload.bloodType !== undefined ||
      payload.phone !== undefined ||
      payload.email !== undefined ||
      payload.address !== undefined ||
      payload.emergencyContact !== undefined ||
      payload.emergencyPhone !== undefined ||
      (Array.isArray(payload.allergies) && payload.allergies.length > 0) ||
      (Array.isArray(payload.chronicConditions) && payload.chronicConditions.length > 0)
  );
}

router.get(
  '/:hospitalId',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get hospital error', 'Failed to fetch hospital information', async (req, res, hospitalId) => {
    const hospital = getHospitalById(hospitalId)!;
    const stats = await loadScopedHospitalStats(hospitalId, req.user?.role);
    res.json({
      success: true,
      data: {
        ...hospital,
        isActive: true,
        stats,
      },
    });
  })
);

router.get(
  '/:hospitalId/stats',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get hospital stats error', 'Failed to fetch hospital statistics', async (req, res, hospitalId) => {
    const stats = await loadScopedHospitalStats(hospitalId, req.user?.role);
    res.json({ success: true, data: stats });
  })
);

router.get(
  '/:hospitalId/doctors',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get hospital doctors error', 'Failed to fetch hospital doctors', async (_req, res, hospitalId) => {
    const doctors = await getHospitalDb(hospitalId).getDoctors();
    res.json({ success: true, data: doctors });
  })
);

router.get(
  '/:hospitalId/patients/:icNumber',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Get hospital patient error', 'Failed to fetch patient profile', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view'))) return;

    const hospitalDb = getHospitalDb(hospitalId);
    const localPatient = await hospitalDb.getPatient(icNumber);
    if (localPatient) {
      res.json({
        success: true,
        data: { patient: localPatient, isLocal: true },
      });
      return;
    }

    const index = await getPatientIndex(icNumber);
    if (index && index.hospitals.length > 0) {
      const federatedPatient = await findPatientInHospitals(icNumber, index.hospitals);
      if (federatedPatient) {
        res.json({
          success: true,
          data: { patient: federatedPatient, isLocal: false, federatedFrom: index.hospitals },
        });
        return;
      }
    }

    res.status(404).json({
      success: false,
      notFound: true,
      error: 'Patient not found',
    });
  })
);

router.get(
  '/:hospitalId/records/:recordId',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Get hospital record error', 'Failed to fetch medical record', async (req, res, hospitalId) => {
    const record = await getHospitalDb(hospitalId).getRecordById(req.params.recordId);
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Medical record not found in this hospital',
      });
      return;
    }

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, record.icNumber, 'view'))) return;

    res.json({
      success: true,
      data: {
        ...record,
        isReadOnly: false,
      },
    });
  })
);

router.post(
  '/:hospitalId/records',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Create record error', 'Failed to create medical record', async (req, res, hospitalId) => {
    const recordData: CreateOrUpdateRecordPayload = req.body || {};
    const icNumber = ensureValidIc(recordData.icNumber, res);
    if (!icNumber) return;

    const diagnosisList = Array.isArray(recordData.diagnosis)
      ? recordData.diagnosis.map(d => String(d).trim()).filter(Boolean)
      : [];
    if (diagnosisList.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one diagnosis is required',
      });
      return;
    }

    const validationError = validateClinicalRecordPayload(recordData);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const hospitalDb = getHospitalDb(hospitalId);
    const authDoctor = await hospitalDb.getDoctorByIc(req.user!.icNumber);

    if (!authDoctor || !authDoctor.isActive) {
      res.status(403).json({
        success: false,
        error: 'Authenticated user does not hold an active clinician license at this hospital',
      });
      return;
    }

    if (recordData.doctorId && recordData.doctorId !== authDoctor.id) {
      res.status(403).json({
        success: false,
        error: 'Doctor ID mismatch: medical records must be authored under your own active clinician identity',
      });
      return;
    }

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'create'))) return;

    const fingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          hospitalId,
          doctorId: authDoctor.id,
          icNumber,
          visitDate: recordData.visitDate || '',
          visitType: recordData.visitType || 'outpatient',
          chiefComplaint: String(recordData.chiefComplaint || '').trim(),
          diagnosis: diagnosisList,
          notes: String(recordData.notes || '').trim(),
          prescriptions: Array.isArray(recordData.prescriptions) ? recordData.prescriptions : [],
          labReports: Array.isArray(recordData.labReports) ? recordData.labReports : [],
        })
      )
      .digest('hex');

    const lastSubmitAt = recentRecordFingerprints.get(fingerprint);
    const nowMs = Date.now();
    if (lastSubmitAt && nowMs - lastSubmitAt < DUPLICATE_SUBMISSION_WINDOW_MS) {
      res.status(409).json({
        success: false,
        duplicateSubmission: true,
        error: 'Duplicate record submission detected. Please wait a moment before submitting an identical clinical entry.',
      });
      return;
    }
    recentRecordFingerprints.set(fingerprint, nowMs);

    try {
      const existingPatient = await hospitalDb.getPatient(icNumber);
      const nowIso = new Date().toISOString();

      if (!existingPatient) {
        let federatedPatient: Patient | null = null;
        const patientIndex = await getPatientIndex(icNumber);
        if (patientIndex && patientIndex.hospitals.length > 0) {
          federatedPatient = await findPatientInHospitals(icNumber, patientIndex.hospitals);
        }

        const inferred = inferDemographicsFromMyKad(icNumber);
        const mergedAllergies =
          recordData.replaceAllergiesAndConditions && Array.isArray(recordData.allergies)
            ? Array.from(new Set(recordData.allergies.map(a => String(a).trim()).filter(Boolean)))
            : Array.from(
                new Set([
                  ...(federatedPatient?.allergies || []),
                  ...(Array.isArray(recordData.allergies) ? recordData.allergies : []),
                ].filter(Boolean))
              );
        const mergedConditions =
          recordData.replaceAllergiesAndConditions && Array.isArray(recordData.chronicConditions)
            ? Array.from(new Set(recordData.chronicConditions.map(c => String(c).trim()).filter(Boolean)))
            : Array.from(
                new Set([
                  ...(federatedPatient?.chronicConditions || []),
                  ...(Array.isArray(recordData.chronicConditions) ? recordData.chronicConditions : []),
                ].filter(Boolean))
              );

        const resolveNewField = (val: string | undefined, fallback?: string) =>
          val !== undefined ? String(val).trim() : fallback || '';

        await hospitalDb.createPatient({
          icNumber,
          fullName: recordData.patientName?.trim() || federatedPatient?.fullName || `Patient ${icNumber}`,
          dateOfBirth: recordData.dateOfBirth?.trim() || federatedPatient?.dateOfBirth || inferred.dateOfBirth,
          gender:
            recordData.gender === 'female' || recordData.gender === 'male'
              ? recordData.gender
              : federatedPatient?.gender || inferred.gender,
          bloodType: resolveNewField(recordData.bloodType, federatedPatient?.bloodType),
          phone: resolveNewField(recordData.phone, federatedPatient?.phone),
          email: resolveNewField(recordData.email, federatedPatient?.email),
          address: resolveNewField(recordData.address, federatedPatient?.address),
          emergencyContact: resolveNewField(recordData.emergencyContact, federatedPatient?.emergencyContact),
          emergencyPhone: resolveNewField(recordData.emergencyPhone, federatedPatient?.emergencyPhone),
          allergies: mergedAllergies,
          chronicConditions: mergedConditions,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } else if (hasPatientFieldUpdates(recordData)) {
        await hospitalDb.updatePatient(
          icNumber,
          {
            bloodType: recordData.bloodType,
            phone: recordData.phone,
            email: recordData.email,
            address: recordData.address,
            emergencyContact: recordData.emergencyContact,
            emergencyPhone: recordData.emergencyPhone,
            allergies: Array.isArray(recordData.allergies) ? recordData.allergies : undefined,
            chronicConditions: Array.isArray(recordData.chronicConditions)
              ? recordData.chronicConditions
              : undefined,
          },
          { replaceArrays: Boolean(recordData.replaceAllergiesAndConditions) }
        );
      }

      const createdRecord = await hospitalDb.createRecord({
        id: crypto.randomUUID(),
        icNumber,
        hospitalId,
        doctorId: authDoctor.id,
        visitDate: recordData.visitDate || nowIso,
        visitType:
          recordData.visitType === 'inpatient' || recordData.visitType === 'emergency'
            ? recordData.visitType
            : 'outpatient',
        chiefComplaint: recordData.chiefComplaint || '',
        diagnosis: diagnosisList,
        diagnosisCodes: Array.isArray(recordData.diagnosisCodes)
          ? recordData.diagnosisCodes.map(c => String(c).trim()).filter(Boolean)
          : [],
        symptoms: Array.isArray(recordData.symptoms)
          ? recordData.symptoms.map(s => String(s).trim()).filter(Boolean)
          : [],
        notes: recordData.notes || '',
        vitalSigns: recordData.vitalSigns,
        prescriptions: Array.isArray(recordData.prescriptions) ? recordData.prescriptions : [],
        labReports: Array.isArray(recordData.labReports) ? recordData.labReports : [],
        followUpDate: recordData.followUpDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await updatePatientIndex(icNumber, hospitalId);

      await createAuditLog({
        timestamp: nowIso,
        action: 'create',
        actorId: req.user!.userId,
        actorType: 'doctor',
        actorHospitalId: hospitalId,
        targetIcNumber: icNumber,
        targetHospitalId: hospitalId,
        details: `Created medical record ${createdRecord.id} (${createdRecord.prescriptions?.length || 0} Rx, ${createdRecord.labReports?.length || 0} Labs)`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.status(201).json({
        success: true,
        data: {
          recordId: createdRecord.id,
          record: createdRecord,
        },
        message: 'Medical record created successfully',
      });
    } catch (writeErr) {
      recentRecordFingerprints.delete(fingerprint);
      throw writeErr;
    }
  })
);

router.put(
  '/:hospitalId/records/:recordId',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Update record error', 'Failed to update medical record', async (req, res, hospitalId) => {
    const { recordId } = req.params;
    const updates: CreateOrUpdateRecordPayload = req.body || {};

    if (updates.hospitalId && updates.hospitalId !== hospitalId) {
      res.status(403).json({
        success: false,
        error: 'Cross-hospital medical records are strictly read-only',
      });
      return;
    }

    const validationError = validateClinicalRecordPayload(updates);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const hospitalDb = getHospitalDb(hospitalId);
    const authDoctor = await hospitalDb.getDoctorByIc(req.user!.icNumber);
    if (!authDoctor || !authDoctor.isActive) {
      res.status(403).json({
        success: false,
        error: 'Authenticated user does not hold an active clinician license at this hospital',
      });
      return;
    }

    const existingRecord = await hospitalDb.getRecordById(recordId);
    if (!existingRecord) {
      res.status(404).json({
        success: false,
        error: 'Medical record not found in your hospital (cross-hospital records are read-only)',
      });
      return;
    }

    if (
      updates.doctorId &&
      updates.doctorId !== authDoctor.id &&
      updates.doctorId !== existingRecord.doctorId
    ) {
      res.status(403).json({
        success: false,
        error: 'Doctor ID mismatch: cannot attribute record updates to another doctor',
      });
      return;
    }

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, existingRecord.icNumber, 'update'))) return;

    if (updates.diagnosis !== undefined) {
      const cleanDiagnosis = Array.isArray(updates.diagnosis)
        ? updates.diagnosis.map(d => String(d).trim()).filter(Boolean)
        : [];
      if (cleanDiagnosis.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one diagnosis is required',
        });
        return;
      }
      updates.diagnosis = cleanDiagnosis;
    }

    if (hasPatientFieldUpdates(updates)) {
      await hospitalDb.updatePatient(
        existingRecord.icNumber,
        {
          bloodType: updates.bloodType,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
          emergencyContact: updates.emergencyContact,
          emergencyPhone: updates.emergencyPhone,
          allergies: Array.isArray(updates.allergies) ? updates.allergies : undefined,
          chronicConditions: Array.isArray(updates.chronicConditions)
            ? updates.chronicConditions
            : undefined,
        },
        { replaceArrays: Boolean(updates.replaceAllergiesAndConditions) }
      );
    }

    const updatedRecord = await hospitalDb.updateRecord(recordId, {
      visitDate: updates.visitDate,
      visitType: updates.visitType,
      chiefComplaint: updates.chiefComplaint,
      diagnosis: updates.diagnosis,
      diagnosisCodes: updates.diagnosisCodes,
      symptoms: updates.symptoms,
      notes: updates.notes,
      vitalSigns: updates.vitalSigns,
      prescriptions: updates.prescriptions,
      labReports: updates.labReports,
      followUpDate: updates.followUpDate,
    });

    if (!updatedRecord) {
      res.status(404).json({ success: false, error: 'Medical record not found' });
      return;
    }

    await updatePatientIndex(existingRecord.icNumber, hospitalId);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user!.userId,
      actorType: 'doctor',
      actorHospitalId: hospitalId,
      targetIcNumber: existingRecord.icNumber,
      targetHospitalId: hospitalId,
      details: `Updated medical record ${recordId} (${updatedRecord.prescriptions?.length || 0} Rx, ${updatedRecord.labReports?.length || 0} Labs)`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: { record: updatedRecord },
      message: 'Medical record updated successfully',
    });
  })
);

// -----------------------------------------------------------------------------
// Outpatient Queue & Clinic Appointments (Hospital-Scoped, Privacy-Aware)
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/queue',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Get queue error', 'Failed to fetch outpatient queue', async (_req, res, hospitalId) => {
    const blockedIcs = await getBlockedPatientIcsForHospital(hospitalId);
    res.json({ success: true, data: getHospitalDb(hospitalId).getQueue(blockedIcs) });
  })
);

router.post(
  '/:hospitalId/queue',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Enqueue patient error', 'Failed to register queue ticket', async (req, res, hospitalId) => {
    const { name, icNumber: rawIc, category, complaint } = req.body || {};
    const icNumber = ensureValidIc(rawIc, res);
    if (!icNumber) return;

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'create'))) return;

    const validCategory = category === 'Red' || category === 'Yellow' ? category : 'Green';
    const ticket = getHospitalDb(hospitalId).enqueuePatient({
      name: String(name || '').trim(),
      icNumber,
      category: validCategory,
      complaint: String(complaint || '').trim(),
    });
    res.status(201).json({ success: true, data: ticket });
  })
);

router.put(
  '/:hospitalId/queue/:queueNo',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Update queue error', 'Failed to update queue ticket', async (req, res, hospitalId) => {
    const { status } = req.body || {};
    if (!VALID_QUEUE_STATUSES.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid queue status' });
      return;
    }
    const db = getHospitalDb(hospitalId);
    const target = db.getQueueTicketByNo(req.params.queueNo);
    if (!target) {
      res.status(404).json({ success: false, error: 'Queue ticket not found' });
      return;
    }
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, target.icNumber, 'update'))) return;

    const updated = db.updateQueueTicket(req.params.queueNo, status);
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:hospitalId/queue/:queueNo',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Delete queue error', 'Failed to remove queue ticket', async (req, res, hospitalId) => {
    const db = getHospitalDb(hospitalId);
    const target = db.getQueueTicketByNo(req.params.queueNo);
    if (!target) {
      res.status(404).json({ success: false, error: 'Queue ticket not found' });
      return;
    }
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, target.icNumber, 'update'))) return;

    db.removeQueueTicket(req.params.queueNo);
    res.json({ success: true, message: 'Queue ticket removed' });
  })
);

router.get(
  '/:hospitalId/appointments',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Get appointments error', 'Failed to fetch clinic appointments', async (_req, res, hospitalId) => {
    const blockedIcs = await getBlockedPatientIcsForHospital(hospitalId);
    res.json({ success: true, data: getHospitalDb(hospitalId).getAppointments(blockedIcs) });
  })
);

router.post(
  '/:hospitalId/appointments',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Create appointment error', 'Failed to schedule appointment', async (req, res, hospitalId) => {
    const { patientName, icNumber: rawIc, phone, date, time, type } = req.body || {};
    const icNumber = ensureValidIc(rawIc, res);
    if (!icNumber) return;

    if (!String(patientName || '').trim() || !isValidIsoCalendarDate(date) || !isValidClockTime(time)) {
      res.status(400).json({
        success: false,
        error: 'Patient name, valid date (YYYY-MM-DD), and valid time (HH:MM) are required',
      });
      return;
    }

    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'create'))) return;

    const validType = ['follow-up', 'new', 'procedure', 'review'].includes(type) ? type : 'follow-up';
    const created = getHospitalDb(hospitalId).createAppointment({
      patientName: String(patientName).trim(),
      icNumber,
      phone: String(phone || '').trim(),
      date: String(date).trim(),
      time: String(time).trim(),
      type: validType,
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.put(
  '/:hospitalId/appointments/:appointmentId',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Update appointment error', 'Failed to update appointment', async (req, res, hospitalId) => {
    const { status } = req.body || {};
    if (!VALID_APPOINTMENT_STATUSES.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid appointment status' });
      return;
    }
    const db = getHospitalDb(hospitalId);
    const target = db.getAppointmentById(req.params.appointmentId);
    if (!target) {
      res.status(404).json({ success: false, error: 'Appointment not found' });
      return;
    }
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, target.icNumber, 'update'))) return;

    const updated = db.updateAppointmentStatus(req.params.appointmentId, status);
    res.json({ success: true, data: updated });
  })
);

// -----------------------------------------------------------------------------
// Patient-Scoped Nursing Chart & Subsidised Billing (Zero Cross-Patient Leak)
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/patients/:icNumber/nursing',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Get nursing chart error', 'Failed to load nursing chart', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view'))) return;

    const chart = await getHospitalDb(hospitalId).getOrInitNursingChart(icNumber);
    res.json({ success: true, data: chart });
  })
);

router.post(
  '/:hospitalId/patients/:icNumber/nursing/vitals',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Add nursing vitals error', 'Failed to record nursing observation', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const { bp, pulse, temp, rr, spo2, gcs, painScore, bloodSugar, recordedBy } = req.body || {};
    const bpMatch = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(String(bp || ''));
    const sysNum = bpMatch ? Number(bpMatch[1]) : NaN;
    const diaNum = bpMatch ? Number(bpMatch[2]) : NaN;
    const pulseNum = Number(pulse);
    const tempNum = Number(temp);
    const rrNum = Number(rr);
    const spo2Num = Number(spo2);
    const painNum = painScore === undefined || painScore === '' ? 0 : Number(painScore);
    const hasBloodSugar = bloodSugar !== undefined && bloodSugar !== null && bloodSugar !== '';
    const sugarNum = hasBloodSugar ? Number(bloodSugar) : undefined;

    if (
      !Number.isFinite(sysNum) || sysNum < 30 || sysNum > 300 ||
      !Number.isFinite(diaNum) || diaNum < 15 || diaNum > 220 ||
      diaNum >= sysNum ||
      !Number.isFinite(pulseNum) || pulseNum < 15 || pulseNum > 300 ||
      !Number.isFinite(tempNum) || tempNum < 25 || tempNum > 45 ||
      !Number.isFinite(rrNum) || rrNum < 4 || rrNum > 60 ||
      !Number.isFinite(spo2Num) || spo2Num < 30 || spo2Num > 100 ||
      !Number.isFinite(painNum) || painNum < 0 || painNum > 10 ||
      (sugarNum !== undefined && (!Number.isFinite(sugarNum) || sugarNum < 0.5 || sugarNum > 60))
    ) {
      res.status(400).json({ success: false, error: 'Nursing vital signs out of physiological bounds' });
      return;
    }

    const chart = await getHospitalDb(hospitalId).addNursingObservation(icNumber, {
      bp: `${sysNum}/${diaNum}`,
      pulse: pulseNum,
      temp: tempNum,
      rr: rrNum,
      spo2: spo2Num,
      gcs: String(gcs || '15/15').trim(),
      painScore: Math.round(painNum),
      bloodSugar: sugarNum,
      recordedBy: String(recordedBy || `Dr. ${req.user!.icNumber}`).trim(),
    });
    res.status(201).json({ success: true, data: chart });
  })
);

router.post(
  '/:hospitalId/patients/:icNumber/nursing/notes',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Add nursing note error', 'Failed to record nursing progress note', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const { type, content, priority, nurse } = req.body || {};
    const cleanContent = String(content || '').trim();
    if (!cleanContent || cleanContent.length > 4000) {
      res.status(400).json({
        success: false,
        error: 'Nursing progress note content is required (max 4,000 characters)',
      });
      return;
    }

    const chart = await getHospitalDb(hospitalId).addNursingNote(icNumber, {
      type: ['assessment', 'intervention', 'evaluation', 'handover'].includes(type) ? type : 'assessment',
      content: cleanContent,
      priority: ['routine', 'important', 'urgent'].includes(priority) ? priority : 'routine',
      nurse: String(nurse || `Clinician (${req.user!.icNumber})`).trim(),
    });
    res.status(201).json({ success: true, data: chart });
  })
);

router.put(
  '/:hospitalId/patients/:icNumber/nursing/io',
  ...staffAuthChain,
  authorize('doctor'),
  authorizeHospital,
  withHospitalRoute('Update fluid balance error', 'Failed to update fluid balance chart', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const chart = await getHospitalDb(hospitalId).updateFluidBalance(icNumber, req.body || {});
    res.json({ success: true, data: chart });
  })
);

router.get(
  '/:hospitalId/patients/:icNumber/billing',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Get billing account error', 'Failed to load billing account', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view'))) return;

    const account = await getHospitalDb(hospitalId).getOrInitBillingAccount(icNumber);
    res.json({ success: true, data: account });
  })
);

router.post(
  '/:hospitalId/patients/:icNumber/billing/items',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Add billing item error', 'Failed to add billing item', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const { category, description, originalPrice, subsidyPercent } = req.body || {};
    const priceNum = Number(originalPrice);
    const hasSubsidy = subsidyPercent !== undefined && subsidyPercent !== null && subsidyPercent !== '';
    const subsidyNum = hasSubsidy ? Number(subsidyPercent) : undefined;

    if (
      !String(description || '').trim() ||
      !Number.isFinite(priceNum) ||
      priceNum < 0 ||
      priceNum > 1_000_000 ||
      (subsidyNum !== undefined && (!Number.isFinite(subsidyNum) || subsidyNum < 0 || subsidyNum > 100))
    ) {
      res.status(400).json({
        success: false,
        error: 'Item description, valid originalPrice (0-1,000,000), and valid subsidyPercent (0-100) are required',
      });
      return;
    }

    const account = await getHospitalDb(hospitalId).addBillingItem(icNumber, {
      category: String(category || 'Clinical Procedure'),
      description: String(description),
      originalPrice: priceNum,
      subsidyPercent: subsidyNum,
    });
    res.status(201).json({ success: true, data: account });
  })
);

router.delete(
  '/:hospitalId/patients/:icNumber/billing/items/:itemId',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Remove billing item error', 'Failed to remove billing item', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const account = await getHospitalDb(hospitalId).removeBillingItem(icNumber, req.params.itemId);
    res.json({ success: true, data: account });
  })
);

router.put(
  '/:hospitalId/patients/:icNumber/billing/subsidy',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Update billing subsidy error', 'Failed to update subsidy status', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const { subsidyStatus } = req.body || {};
    if (!['eligible', 'not-eligible', 'pending'].includes(subsidyStatus)) {
      res.status(400).json({ success: false, error: 'Invalid subsidy status' });
      return;
    }

    const account = await getHospitalDb(hospitalId).setBillingSubsidyStatus(icNumber, subsidyStatus);
    res.json({ success: true, data: account });
  })
);

router.post(
  '/:hospitalId/patients/:icNumber/billing/settle',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  withHospitalRoute('Settle billing error', 'Failed to settle billing account', async (req, res, hospitalId) => {
    const icNumber = ensureValidIc(req.params.icNumber, res);
    if (!icNumber) return;
    if (!(await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update'))) return;

    const { paymentMethod = 'counter' } = req.body || {};
    if (!['counter', 'online', 'waived'].includes(paymentMethod)) {
      res.status(400).json({ success: false, error: 'Invalid payment method' });
      return;
    }

    const db = getHospitalDb(hospitalId);
    const currentAccount = await db.getOrInitBillingAccount(icNumber);
    if (currentAccount.items.length === 0) {
      res.status(400).json({ success: false, error: 'Cannot settle an empty billing account' });
      return;
    }

    const account = await db.settleBillingAccount(icNumber, paymentMethod);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'doctor' | 'hospital_admin',
      actorHospitalId: hospitalId,
      targetIcNumber: icNumber,
      targetHospitalId: hospitalId,
      details: `Settled patient bill ${account.receipt?.receiptNo} (Net RM ${account.receipt?.netAmount.toFixed(2)})`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({ success: true, data: account });
  })
);

// -----------------------------------------------------------------------------
// Hospital Administration Modules: Wards, Departments, Staff, Inventory, Finance
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/wards',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get wards error', 'Failed to fetch wards', (_req, res, hospitalId) => {
    res.json({ success: true, data: getHospitalDb(hospitalId).getWards() });
  })
);

router.post(
  '/:hospitalId/wards',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Create ward error', 'Failed to create ward', (req, res, hospitalId) => {
    const { name, nameMY, totalBeds, occupied = 0, reserved = 0, maintenance = 0, type = 'general' } = req.body || {};
    const total = Number(totalBeds);
    const occ = Number(occupied);
    const rsv = Number(reserved);
    const mnt = Number(maintenance);
    if (
      !String(name || '').trim() ||
      !VALID_WARD_TYPES.includes(type) ||
      !Number.isFinite(total) ||
      !Number.isFinite(occ) ||
      !Number.isFinite(rsv) ||
      !Number.isFinite(mnt) ||
      total < 1 ||
      occ < 0 ||
      rsv < 0 ||
      mnt < 0 ||
      Math.trunc(occ) + Math.trunc(rsv) + Math.trunc(mnt) > Math.trunc(total)
    ) {
      res.status(400).json({
        success: false,
        error: 'Invalid ward capacity allocation (occupied + reserved + maintenance cannot exceed totalBeds)',
      });
      return;
    }
    const created = getHospitalDb(hospitalId).createWard({
      name: String(name).trim(),
      nameMY: String(nameMY || name).trim(),
      totalBeds: Math.trunc(total),
      occupied: Math.trunc(occ),
      reserved: Math.trunc(rsv),
      maintenance: Math.trunc(mnt),
      type,
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.put(
  '/:hospitalId/wards/:wardId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Update ward error', 'Failed to update ward', (req, res, hospitalId) => {
    const body = req.body || {};
    const existing = getHospitalDb(hospitalId).getWards().find(w => w.id === req.params.wardId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Ward not found' });
      return;
    }
    if (body.name !== undefined && !String(body.name).trim()) {
      res.status(400).json({ success: false, error: 'Ward name cannot be empty' });
      return;
    }
    if (body.type !== undefined && !VALID_WARD_TYPES.includes(body.type)) {
      res.status(400).json({ success: false, error: 'Invalid ward type' });
      return;
    }
    const total = body.totalBeds !== undefined ? Number(body.totalBeds) : existing.totalBeds;
    const occ = body.occupied !== undefined ? Number(body.occupied) : existing.occupied;
    const rsv = body.reserved !== undefined ? Number(body.reserved) : existing.reserved;
    const mnt = body.maintenance !== undefined ? Number(body.maintenance) : existing.maintenance;
    if (
      !Number.isFinite(total) ||
      !Number.isFinite(occ) ||
      !Number.isFinite(rsv) ||
      !Number.isFinite(mnt) ||
      total < 1 ||
      occ < 0 ||
      rsv < 0 ||
      mnt < 0 ||
      Math.trunc(occ) + Math.trunc(rsv) + Math.trunc(mnt) > Math.trunc(total)
    ) {
      res.status(400).json({ success: false, error: 'Invalid ward bed counts (sum cannot exceed totalBeds)' });
      return;
    }
    const updated = getHospitalDb(hospitalId).updateWard(req.params.wardId, {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      nameMY: body.nameMY !== undefined ? String(body.nameMY).trim() || existing.nameMY : existing.nameMY,
      totalBeds: Math.trunc(total),
      occupied: Math.trunc(occ),
      reserved: Math.trunc(rsv),
      maintenance: Math.trunc(mnt),
      type: body.type !== undefined ? body.type : existing.type,
    });
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/:hospitalId/departments',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get departments error', 'Failed to fetch departments', (_req, res, hospitalId) => {
    res.json({ success: true, data: getHospitalDb(hospitalId).getDepartments() });
  })
);

router.post(
  '/:hospitalId/departments',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Create department error', 'Failed to create department', (req, res, hospitalId) => {
    const body = req.body || {};
    if (!String(body.name || '').trim()) {
      res.status(400).json({ success: false, error: 'Department name is required' });
      return;
    }
    const rawDocs = body.doctorCount !== undefined ? Number(body.doctorCount) : 0;
    const rawNurses = body.nurseCount !== undefined ? Number(body.nurseCount) : 0;
    const rawStaff = body.staffCount !== undefined ? Number(body.staffCount) : rawDocs + rawNurses;
    if (
      !Number.isFinite(rawDocs) || rawDocs < 0 ||
      !Number.isFinite(rawNurses) || rawNurses < 0 ||
      !Number.isFinite(rawStaff) || rawStaff < 0 ||
      (body.status !== undefined && !VALID_DEPT_STATUSES.includes(body.status))
    ) {
      res.status(400).json({ success: false, error: 'Invalid department staff counts or status' });
      return;
    }
    const docs = Math.trunc(rawDocs);
    const nurses = Math.trunc(rawNurses);
    const created = getHospitalDb(hospitalId).createDepartment({
      name: String(body.name).trim(),
      nameMY: String(body.nameMY || body.name).trim(),
      head: String(body.head || 'Department Head').trim(),
      headTitle: String(body.headTitle || 'Consultant Specialist').trim(),
      doctorCount: docs,
      nurseCount: nurses,
      staffCount: Math.max(docs + nurses, Math.trunc(rawStaff)),
      location: String(body.location || 'Main Clinical Block').trim(),
      extension: String(body.extension || '2000').trim(),
      operatingHours: String(body.operatingHours || '08:00 - 17:00').trim(),
      status: body.status || 'active',
      specialties: Array.isArray(body.specialties)
        ? body.specialties.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.put(
  '/:hospitalId/departments/:deptId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Update department error', 'Failed to update department', (req, res, hospitalId) => {
    const body = req.body || {};
    const db = getHospitalDb(hospitalId);
    const existing = db.getDepartments().find(d => d.id === req.params.deptId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    if (body.name !== undefined && !String(body.name).trim()) {
      res.status(400).json({ success: false, error: 'Department name cannot be empty' });
      return;
    }
    if (body.status !== undefined && !VALID_DEPT_STATUSES.includes(body.status)) {
      res.status(400).json({ success: false, error: 'Invalid department status' });
      return;
    }
    const nextDocs = body.doctorCount !== undefined ? Number(body.doctorCount) : existing.doctorCount;
    const nextNurses = body.nurseCount !== undefined ? Number(body.nurseCount) : existing.nurseCount;
    const nextStaff = body.staffCount !== undefined ? Number(body.staffCount) : existing.staffCount;
    if (
      !Number.isFinite(nextDocs) || nextDocs < 0 ||
      !Number.isFinite(nextNurses) || nextNurses < 0 ||
      !Number.isFinite(nextStaff) || nextStaff < 0
    ) {
      res.status(400).json({ success: false, error: 'Department staff counts must be non-negative numbers' });
      return;
    }

    const docs = Math.trunc(nextDocs);
    const nurses = Math.trunc(nextNurses);
    const updated = db.updateDepartment(req.params.deptId, {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      nameMY: body.nameMY !== undefined ? String(body.nameMY).trim() || existing.nameMY : existing.nameMY,
      head: body.head !== undefined ? String(body.head).trim() || existing.head : existing.head,
      headTitle: body.headTitle !== undefined ? String(body.headTitle).trim() : existing.headTitle,
      doctorCount: docs,
      nurseCount: nurses,
      staffCount: Math.max(docs + nurses, Math.trunc(nextStaff)),
      location: body.location !== undefined ? String(body.location).trim() : existing.location,
      extension: body.extension !== undefined ? String(body.extension).trim() : existing.extension,
      operatingHours: body.operatingHours !== undefined ? String(body.operatingHours).trim() : existing.operatingHours,
      status: body.status !== undefined ? body.status : existing.status,
      specialties: Array.isArray(body.specialties)
        ? body.specialties.map((s: unknown) => String(s).trim()).filter(Boolean)
        : existing.specialties,
    });
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/:hospitalId/staff',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get staff error', 'Failed to fetch staff roster', async (_req, res, hospitalId) => {
    const staff = await getHospitalDb(hospitalId).getStaffRoster();
    res.json({ success: true, data: staff });
  })
);

router.post(
  '/:hospitalId/staff',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Create staff error', 'Failed to save staff member', async (req, res, hospitalId) => {
    const body = req.body || {};
    const icNumber = ensureValidIc(body.icNumber, res);
    if (!icNumber) return;
    if (!String(body.name || '').trim()) {
      res.status(400).json({ success: false, error: 'Staff full name is required' });
      return;
    }
    if (body.role !== undefined && !VALID_STAFF_ROLES.includes(body.role)) {
      res.status(400).json({ success: false, error: 'Invalid staff role' });
      return;
    }
    if (body.status !== undefined && !VALID_STAFF_STATUSES.includes(body.status)) {
      res.status(400).json({ success: false, error: 'Invalid staff status' });
      return;
    }

    const member = await getHospitalDb(hospitalId).createStaffMember({
      name: String(body.name).trim(),
      icNumber,
      role: body.role || 'nurse',
      department: body.department,
      email: body.email,
      phone: body.phone,
      status: body.status || 'active',
      joinDate: body.joinDate,
      specialization: body.specialization,
      licenseNumber: body.licenseNumber,
    });

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'create',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'hospital_admin' | 'central_admin',
      actorHospitalId: hospitalId,
      targetHospitalId: hospitalId,
      details: `Registered staff member ${member.name} (${member.role}, status: ${member.status})`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.status(201).json({ success: true, data: member });
  })
);

router.put(
  '/:hospitalId/staff/:staffId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Update staff error', 'Failed to update staff member', async (req, res, hospitalId) => {
    const body = req.body || {};
    let validatedIc: string | undefined;
    if (body.icNumber !== undefined && String(body.icNumber).trim() !== '') {
      const validIc = ensureValidIc(body.icNumber, res);
      if (!validIc) return;
      validatedIc = validIc;
    }
    if (body.name !== undefined && !String(body.name).trim()) {
      res.status(400).json({ success: false, error: 'Staff name cannot be empty' });
      return;
    }
    if (body.role !== undefined && !VALID_STAFF_ROLES.includes(body.role)) {
      res.status(400).json({ success: false, error: 'Invalid staff role' });
      return;
    }
    if (body.status !== undefined && !VALID_STAFF_STATUSES.includes(body.status)) {
      res.status(400).json({ success: false, error: 'Invalid staff status' });
      return;
    }

    const member = await getHospitalDb(hospitalId).updateStaffMember(req.params.staffId, {
      name: body.name,
      icNumber: validatedIc,
      role: body.role,
      department: body.department,
      email: body.email,
      phone: body.phone,
      status: body.status,
      joinDate: body.joinDate,
      specialization: body.specialization,
      licenseNumber: body.licenseNumber,
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'hospital_admin' | 'central_admin',
      actorHospitalId: hospitalId,
      targetHospitalId: hospitalId,
      details: `Updated staff member ${member.id} (${member.role} -> status: ${member.status})`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({ success: true, data: member });
  })
);

router.delete(
  '/:hospitalId/staff/:staffId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Delete staff error', 'Failed to remove staff member', async (req, res, hospitalId) => {
    const ok = await getHospitalDb(hospitalId).deactivateOrRemoveStaff(req.params.staffId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'hospital_admin' | 'central_admin',
      actorHospitalId: hospitalId,
      targetHospitalId: hospitalId,
      details: `Deactivated/removed staff member ${req.params.staffId}`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({ success: true, message: 'Staff member deactivated/removed' });
  })
);

router.get(
  '/:hospitalId/inventory',
  ...staffAuthChain,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get inventory error', 'Failed to fetch inventory', (_req, res, hospitalId) => {
    res.json({ success: true, data: getHospitalDb(hospitalId).getInventory() });
  })
);

router.post(
  '/:hospitalId/inventory',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Create inventory item error', 'Failed to create inventory item', (req, res, hospitalId) => {
    const body = req.body || {};
    if (!String(body.name || '').trim() || !String(body.sku || '').trim()) {
      res.status(400).json({ success: false, error: 'Item name and SKU code are required' });
      return;
    }
    if (body.category !== undefined && !VALID_INVENTORY_CATEGORIES.includes(body.category)) {
      res.status(400).json({ success: false, error: 'Invalid inventory category' });
      return;
    }
    const rawStock = body.currentStock !== undefined ? Number(body.currentStock) : 0;
    const rawMin = body.minStock !== undefined ? Number(body.minStock) : 0;
    const rawMax = body.maxStock !== undefined ? Number(body.maxStock) : Math.max(rawMin + 1, rawStock + 100);
    const rawPrice = body.pricePerUnit !== undefined ? Number(body.pricePerUnit) : 0;
    if (
      !Number.isFinite(rawStock) || rawStock < 0 ||
      !Number.isFinite(rawMin) || rawMin < 0 ||
      !Number.isFinite(rawMax) || rawMax <= rawMin ||
      !Number.isFinite(rawPrice) || rawPrice < 0 || rawPrice > 10_000_000
    ) {
      res.status(400).json({
        success: false,
        error: 'Invalid inventory stock levels or unit price (maxStock must exceed minStock)',
      });
      return;
    }

    const stock = Math.trunc(rawStock);
    const min = Math.trunc(rawMin);
    const max = Math.max(min + 1, Math.trunc(rawMax));
    const created = getHospitalDb(hospitalId).createInventoryItem({
      name: String(body.name).trim(),
      nameMY: String(body.nameMY || body.name).trim(),
      category: body.category || 'medicine',
      sku: String(body.sku).trim().toUpperCase(),
      currentStock: stock,
      minStock: min,
      maxStock: max,
      unit: String(body.unit || 'units').trim(),
      lastRestocked: new Date().toISOString().split('T')[0],
      expiryDate: body.expiryDate ? String(body.expiryDate).trim() : undefined,
      supplier: String(body.supplier || 'KKM Central Medical Store').trim(),
      pricePerUnit: Number(rawPrice.toFixed(2)),
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.put(
  '/:hospitalId/inventory/:itemId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Update inventory item error', 'Failed to update inventory item', (req, res, hospitalId) => {
    const body = req.body || {};
    const db = getHospitalDb(hospitalId);
    const existing = db.getInventory().find(i => i.id === req.params.itemId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Inventory item not found' });
      return;
    }
    if (body.name !== undefined && !String(body.name).trim()) {
      res.status(400).json({ success: false, error: 'Inventory item name cannot be empty' });
      return;
    }
    if (body.sku !== undefined && !String(body.sku).trim()) {
      res.status(400).json({ success: false, error: 'Inventory SKU cannot be empty' });
      return;
    }
    if (body.category !== undefined && !VALID_INVENTORY_CATEGORIES.includes(body.category)) {
      res.status(400).json({ success: false, error: 'Invalid inventory category' });
      return;
    }

    const nextStock = body.currentStock !== undefined ? Number(body.currentStock) : existing.currentStock;
    const nextMin = body.minStock !== undefined ? Number(body.minStock) : existing.minStock;
    const nextMax = body.maxStock !== undefined ? Number(body.maxStock) : existing.maxStock;
    const nextPrice = body.pricePerUnit !== undefined ? Number(body.pricePerUnit) : existing.pricePerUnit;

    if (
      !Number.isFinite(nextStock) || nextStock < 0 ||
      !Number.isFinite(nextMin) || nextMin < 0 ||
      !Number.isFinite(nextMax) || nextMax <= nextMin ||
      !Number.isFinite(nextPrice) || nextPrice < 0 || nextPrice > 10_000_000
    ) {
      res.status(400).json({
        success: false,
        error: 'Invalid inventory stock levels or unit price',
      });
      return;
    }

    const updated = db.updateInventoryItem(req.params.itemId, {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      nameMY: body.nameMY !== undefined ? String(body.nameMY).trim() || existing.nameMY : existing.nameMY,
      category: body.category !== undefined ? body.category : existing.category,
      sku: body.sku !== undefined ? String(body.sku).trim().toUpperCase() : existing.sku,
      currentStock: Math.trunc(nextStock),
      minStock: Math.trunc(nextMin),
      maxStock: Math.trunc(nextMax),
      unit: body.unit !== undefined ? String(body.unit).trim() || existing.unit : existing.unit,
      lastRestocked:
        body.currentStock !== undefined ? new Date().toISOString().split('T')[0] : existing.lastRestocked,
      expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? String(body.expiryDate).trim() : undefined) : existing.expiryDate,
      supplier: body.supplier !== undefined ? String(body.supplier).trim() || existing.supplier : existing.supplier,
      pricePerUnit: Number(nextPrice.toFixed(2)),
    });
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:hospitalId/inventory/:itemId',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Delete inventory item error', 'Failed to delete inventory item', (req, res, hospitalId) => {
    const removed = getHospitalDb(hospitalId).deleteInventoryItem(req.params.itemId);
    if (!removed) {
      res.status(404).json({ success: false, error: 'Inventory item not found' });
      return;
    }
    res.json({ success: true, message: 'Inventory item deleted' });
  })
);

router.get(
  '/:hospitalId/finance',
  ...staffAuthChain,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  withHospitalRoute('Get financial summary error', 'Failed to load financial summary', async (_req, res, hospitalId) => {
    const summary = await getHospitalDb(hospitalId).getFinancialSummary();
    res.json({ success: true, data: summary });
  })
);

export default router;
