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
  MedicalRecord,
  Patient,
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

function ensureValidHospital(req: Request, res: Response): string | null {
  const { hospitalId } = req.params;
  if (!getHospitalById(hospitalId)) {
    res.status(404).json({ success: false, error: 'Hospital not found' });
    return null;
  }
  return hospitalId;
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
      if (Number.isNaN(num) || num < min || num > max) {
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

router.get(
  '/:hospitalId',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
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
    } catch (error) {
      console.error('Get hospital error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital information',
      });
    }
  }
);

router.get(
  '/:hospitalId/stats',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const stats = await loadScopedHospitalStats(hospitalId, req.user?.role);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get hospital stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital statistics',
      });
    }
  }
);

router.get(
  '/:hospitalId/doctors',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const doctors = await getHospitalDb(hospitalId).getDoctors();
      res.json({ success: true, data: doctors });
    } catch (error) {
      console.error('Get hospital doctors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital doctors',
      });
    }
  }
);

router.get(
  '/:hospitalId/patients/:icNumber',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view');
      if (!consentAllowed) return;

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
    } catch (error) {
      console.error('Get hospital patient error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient profile',
      });
    }
  }
);

router.get(
  '/:hospitalId/records/:recordId',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const { recordId } = req.params;

      const record = await getHospitalDb(hospitalId).getRecordById(recordId);
      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Medical record not found in this hospital',
        });
        return;
      }

      const consentAllowed = await enforcePatientPrivacyConsent(
        req,
        res,
        hospitalId,
        record.icNumber,
        'view'
      );
      if (!consentAllowed) return;

      res.json({
        success: true,
        data: {
          ...record,
          isReadOnly: false,
        },
      });
    } catch (error) {
      console.error('Get hospital record error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch medical record',
      });
    }
  }
);

router.post(
  '/:hospitalId/records',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;

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
        res.status(400).json({
          success: false,
          error: validationError,
        });
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

      const consentAllowed = await enforcePatientPrivacyConsent(
        req,
        res,
        hospitalId,
        icNumber,
        'create'
      );
      if (!consentAllowed) return;

      const fingerprint = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            hospitalId,
            doctorId: authDoctor.id,
            icNumber,
            visitType: recordData.visitType || 'outpatient',
            chiefComplaint: String(recordData.chiefComplaint || '').trim(),
            diagnosis: diagnosisList,
            notes: String(recordData.notes || '').trim(),
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

      const existingPatient = await hospitalDb.getPatient(icNumber);
      const nowIso = new Date().toISOString();

      if (!existingPatient) {
        let federatedPatient: Patient | null = null;
        const patientIndex = await getPatientIndex(icNumber);
        if (patientIndex && patientIndex.hospitals.length > 0) {
          federatedPatient = await findPatientInHospitals(icNumber, patientIndex.hospitals);
        }

        const inferred = inferDemographicsFromMyKad(icNumber);
        const mergedAllergies = recordData.replaceAllergiesAndConditions && Array.isArray(recordData.allergies)
          ? Array.from(new Set(recordData.allergies.map(a => String(a).trim()).filter(Boolean)))
          : Array.from(
              new Set([
                ...(federatedPatient?.allergies || []),
                ...(Array.isArray(recordData.allergies) ? recordData.allergies : []),
              ].filter(Boolean))
            );
        const mergedConditions = recordData.replaceAllergiesAndConditions && Array.isArray(recordData.chronicConditions)
          ? Array.from(new Set(recordData.chronicConditions.map(c => String(c).trim()).filter(Boolean)))
          : Array.from(
              new Set([
                ...(federatedPatient?.chronicConditions || []),
                ...(Array.isArray(recordData.chronicConditions) ? recordData.chronicConditions : []),
              ].filter(Boolean))
            );

        await hospitalDb.createPatient({
          icNumber,
          fullName:
            recordData.patientName?.trim() ||
            federatedPatient?.fullName ||
            `Patient ${icNumber}`,
          dateOfBirth:
            recordData.dateOfBirth?.trim() ||
            federatedPatient?.dateOfBirth ||
            inferred.dateOfBirth,
          gender:
            recordData.gender === 'female' || recordData.gender === 'male'
              ? recordData.gender
              : federatedPatient?.gender || inferred.gender,
          bloodType: recordData.bloodType?.trim() || federatedPatient?.bloodType || '',
          phone: recordData.phone?.trim() || federatedPatient?.phone || '',
          email: recordData.email?.trim() || federatedPatient?.email || '',
          address: recordData.address?.trim() || federatedPatient?.address || '',
          emergencyContact:
            recordData.emergencyContact?.trim() || federatedPatient?.emergencyContact || '',
          emergencyPhone:
            recordData.emergencyPhone?.trim() || federatedPatient?.emergencyPhone || '',
          allergies: mergedAllergies,
          chronicConditions: mergedConditions,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } else if (
        recordData.replaceAllergiesAndConditions ||
        recordData.bloodType ||
        (Array.isArray(recordData.allergies) && recordData.allergies.length > 0) ||
        (Array.isArray(recordData.chronicConditions) && recordData.chronicConditions.length > 0) ||
        recordData.emergencyContact ||
        recordData.emergencyPhone
      ) {
        await hospitalDb.updatePatient(
          icNumber,
          {
            bloodType: recordData.bloodType?.trim() || existingPatient.bloodType,
            emergencyContact: recordData.emergencyContact?.trim() || existingPatient.emergencyContact,
            emergencyPhone: recordData.emergencyPhone?.trim() || existingPatient.emergencyPhone,
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
    } catch (error) {
      console.error('Create record error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create medical record',
      });
    }
  }
);

router.put(
  '/:hospitalId/records/:recordId',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
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
        res.status(400).json({
          success: false,
          error: validationError,
        });
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

      const consentAllowed = await enforcePatientPrivacyConsent(
        req,
        res,
        hospitalId,
        existingRecord.icNumber,
        'update'
      );
      if (!consentAllowed) return;

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

      if (
        updates.replaceAllergiesAndConditions ||
        updates.bloodType ||
        (Array.isArray(updates.allergies) && updates.allergies.length > 0) ||
        (Array.isArray(updates.chronicConditions) && updates.chronicConditions.length > 0)
      ) {
        await hospitalDb.updatePatient(
          existingRecord.icNumber,
          {
            bloodType: updates.bloodType?.trim(),
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
        res.status(404).json({
          success: false,
          error: 'Medical record not found',
        });
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
        data: {
          record: updatedRecord,
        },
        message: 'Medical record updated successfully',
      });
    } catch (error) {
      console.error('Update record error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update medical record',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Outpatient Queue & Clinic Appointments (Hospital-Scoped, Privacy-Aware)
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/queue',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const blockedIcs = await getBlockedPatientIcsForHospital(hospitalId);
      res.json({ success: true, data: getHospitalDb(hospitalId).getQueue(blockedIcs) });
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch outpatient queue' });
    }
  }
);

router.post(
  '/:hospitalId/queue',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const { name, icNumber: rawIc, category, complaint } = req.body || {};
      const icNumber = ensureValidIc(rawIc, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'create');
      if (!consentAllowed) return;

      const validCategory = category === 'Red' || category === 'Yellow' ? category : 'Green';
      const ticket = getHospitalDb(hospitalId).enqueuePatient({
        name: String(name || '').trim(),
        icNumber,
        category: validCategory,
        complaint: String(complaint || '').trim(),
      });
      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      console.error('Enqueue patient error:', error);
      res.status(500).json({ success: false, error: 'Failed to register queue ticket' });
    }
  }
);

router.put(
  '/:hospitalId/queue/:queueNo',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const { status } = req.body || {};
    if (!['waiting', 'called', 'in-progress', 'completed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid queue status' });
      return;
    }
    const updated = getHospitalDb(hospitalId).updateQueueTicket(req.params.queueNo, status);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Queue ticket not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);

router.delete(
  '/:hospitalId/queue/:queueNo',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const removed = getHospitalDb(hospitalId).removeQueueTicket(req.params.queueNo);
    if (!removed) {
      res.status(404).json({ success: false, error: 'Queue ticket not found' });
      return;
    }
    res.json({ success: true, message: 'Queue ticket removed' });
  }
);

router.get(
  '/:hospitalId/appointments',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const blockedIcs = await getBlockedPatientIcsForHospital(hospitalId);
      res.json({ success: true, data: getHospitalDb(hospitalId).getAppointments(blockedIcs) });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch clinic appointments' });
    }
  }
);

router.post(
  '/:hospitalId/appointments',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const { patientName, icNumber: rawIc, phone, date, time, type } = req.body || {};
      const icNumber = ensureValidIc(rawIc, res);
      if (!icNumber) return;

      if (!String(patientName || '').trim() || !date || !time) {
        res.status(400).json({ success: false, error: 'Patient name, date, and time are required' });
        return;
      }

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'create');
      if (!consentAllowed) return;

      const validType = ['follow-up', 'new', 'procedure', 'review'].includes(type) ? type : 'follow-up';
      const created = getHospitalDb(hospitalId).createAppointment({
        patientName: String(patientName).trim(),
        icNumber,
        phone: String(phone || '').trim(),
        date: String(date),
        time: String(time),
        type: validType,
      });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ success: false, error: 'Failed to schedule appointment' });
    }
  }
);

router.put(
  '/:hospitalId/appointments/:appointmentId',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const { status } = req.body || {};
    if (!['confirmed', 'pending', 'cancelled', 'completed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid appointment status' });
      return;
    }
    const updated = getHospitalDb(hospitalId).updateAppointmentStatus(req.params.appointmentId, status);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Appointment not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);

// -----------------------------------------------------------------------------
// Patient-Scoped Nursing Chart & Subsidised Billing (Zero Cross-Patient Leak)
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/patients/:icNumber/nursing',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view');
      if (!consentAllowed) return;

      const chart = await getHospitalDb(hospitalId).getOrInitNursingChart(icNumber);
      res.json({ success: true, data: chart });
    } catch (error) {
      console.error('Get nursing chart error:', error);
      res.status(500).json({ success: false, error: 'Failed to load nursing chart' });
    }
  }
);

router.post(
  '/:hospitalId/patients/:icNumber/nursing/vitals',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const { bp, pulse, temp, rr, spo2, gcs, painScore, bloodSugar, recordedBy } = req.body || {};
      const pulseNum = Number(pulse);
      const tempNum = Number(temp);
      const rrNum = Number(rr);
      const spo2Num = Number(spo2);

      if (
        !String(bp || '').includes('/') ||
        Number.isNaN(pulseNum) || pulseNum < 15 || pulseNum > 300 ||
        Number.isNaN(tempNum) || tempNum < 25 || tempNum > 45 ||
        Number.isNaN(rrNum) || rrNum < 4 || rrNum > 60 ||
        Number.isNaN(spo2Num) || spo2Num < 30 || spo2Num > 100
      ) {
        res.status(400).json({ success: false, error: 'Nursing vital signs out of physiological bounds' });
        return;
      }

      const chart = await getHospitalDb(hospitalId).addNursingObservation(icNumber, {
        bp: String(bp).trim(),
        pulse: pulseNum,
        temp: tempNum,
        rr: rrNum,
        spo2: spo2Num,
        gcs: String(gcs || '15/15').trim(),
        painScore: Math.min(10, Math.max(0, Number(painScore) || 0)),
        bloodSugar: bloodSugar !== undefined && bloodSugar !== '' ? Number(bloodSugar) : undefined,
        recordedBy: String(recordedBy || `Dr. ${req.user!.icNumber}`).trim(),
      });
      res.status(201).json({ success: true, data: chart });
    } catch (error) {
      console.error('Add nursing vitals error:', error);
      res.status(500).json({ success: false, error: 'Failed to record nursing observation' });
    }
  }
);

router.post(
  '/:hospitalId/patients/:icNumber/nursing/notes',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const { type, content, priority, nurse } = req.body || {};
      if (!String(content || '').trim()) {
        res.status(400).json({ success: false, error: 'Nursing progress note content is required' });
        return;
      }

      const chart = await getHospitalDb(hospitalId).addNursingNote(icNumber, {
        type: ['assessment', 'intervention', 'evaluation', 'handover'].includes(type) ? type : 'assessment',
        content: String(content).trim(),
        priority: ['routine', 'important', 'urgent'].includes(priority) ? priority : 'routine',
        nurse: String(nurse || `Clinician (${req.user!.icNumber})`).trim(),
      });
      res.status(201).json({ success: true, data: chart });
    } catch (error) {
      console.error('Add nursing note error:', error);
      res.status(500).json({ success: false, error: 'Failed to record nursing progress note' });
    }
  }
);

router.put(
  '/:hospitalId/patients/:icNumber/nursing/io',
  authenticate,
  requireHospitalVerification,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const chart = await getHospitalDb(hospitalId).updateFluidBalance(icNumber, req.body || {});
      res.json({ success: true, data: chart });
    } catch (error) {
      console.error('Update fluid balance error:', error);
      res.status(500).json({ success: false, error: 'Failed to update fluid balance chart' });
    }
  }
);

router.get(
  '/:hospitalId/patients/:icNumber/billing',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'view');
      if (!consentAllowed) return;

      const account = await getHospitalDb(hospitalId).getOrInitBillingAccount(icNumber);
      res.json({ success: true, data: account });
    } catch (error) {
      console.error('Get billing account error:', error);
      res.status(500).json({ success: false, error: 'Failed to load billing account' });
    }
  }
);

router.post(
  '/:hospitalId/patients/:icNumber/billing/items',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const { category, description, originalPrice, subsidyPercent } = req.body || {};
      if (!String(description || '').trim() || Number(originalPrice) < 0 || Number.isNaN(Number(originalPrice))) {
        res.status(400).json({ success: false, error: 'Item description and valid originalPrice are required' });
        return;
      }

      const account = await getHospitalDb(hospitalId).addBillingItem(icNumber, {
        category: String(category || 'Clinical Procedure'),
        description: String(description),
        originalPrice: Number(originalPrice),
        subsidyPercent: subsidyPercent !== undefined ? Number(subsidyPercent) : 95,
      });
      res.status(201).json({ success: true, data: account });
    } catch (error) {
      console.error('Add billing item error:', error);
      res.status(500).json({ success: false, error: 'Failed to add billing item' });
    }
  }
);

router.delete(
  '/:hospitalId/patients/:icNumber/billing/items/:itemId',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const account = await getHospitalDb(hospitalId).removeBillingItem(icNumber, req.params.itemId);
      res.json({ success: true, data: account });
    } catch (error) {
      console.error('Remove billing item error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove billing item' });
    }
  }
);

router.put(
  '/:hospitalId/patients/:icNumber/billing/subsidy',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const { subsidyStatus } = req.body || {};
      if (!['eligible', 'not-eligible', 'pending'].includes(subsidyStatus)) {
        res.status(400).json({ success: false, error: 'Invalid subsidy status' });
        return;
      }

      const account = await getHospitalDb(hospitalId).setBillingSubsidyStatus(icNumber, subsidyStatus);
      res.json({ success: true, data: account });
    } catch (error) {
      console.error('Update billing subsidy error:', error);
      res.status(500).json({ success: false, error: 'Failed to update subsidy status' });
    }
  }
);

router.post(
  '/:hospitalId/patients/:icNumber/billing/settle',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const icNumber = ensureValidIc(req.params.icNumber, res);
      if (!icNumber) return;

      const consentAllowed = await enforcePatientPrivacyConsent(req, res, hospitalId, icNumber, 'update');
      if (!consentAllowed) return;

      const { paymentMethod } = req.body || {};
      const validMethod = ['counter', 'online', 'waived'].includes(paymentMethod) ? paymentMethod : 'counter';
      const account = await getHospitalDb(hospitalId).settleBillingAccount(icNumber, validMethod);

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
    } catch (error) {
      console.error('Settle billing error:', error);
      res.status(500).json({ success: false, error: 'Failed to settle billing account' });
    }
  }
);

// -----------------------------------------------------------------------------
// Hospital Administration Modules: Wards, Departments, Staff, Inventory, Finance
// -----------------------------------------------------------------------------
router.get(
  '/:hospitalId/wards',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    res.json({ success: true, data: getHospitalDb(hospitalId).getWards() });
  }
);

router.post(
  '/:hospitalId/wards',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const { name, nameMY, totalBeds, occupied = 0, reserved = 0, maintenance = 0, type = 'general' } = req.body || {};
    const total = Number(totalBeds);
    const occ = Number(occupied);
    const rsv = Number(reserved);
    const mnt = Number(maintenance);
    if (!String(name || '').trim() || !Number.isFinite(total) || total < 1 || occ < 0 || rsv < 0 || mnt < 0 || occ + rsv + mnt > total) {
      res.status(400).json({ success: false, error: 'Invalid ward capacity allocation (occupied + reserved + maintenance cannot exceed totalBeds)' });
      return;
    }
    const created = getHospitalDb(hospitalId).createWard({
      name: String(name).trim(),
      nameMY: String(nameMY || name).trim(),
      totalBeds: Math.trunc(total),
      occupied: Math.trunc(occ),
      reserved: Math.trunc(rsv),
      maintenance: Math.trunc(mnt),
      type: ['general', 'icu', 'maternity', 'pediatric', 'isolation'].includes(type) ? type : 'general',
    });
    res.status(201).json({ success: true, data: created });
  }
);

router.put(
  '/:hospitalId/wards/:wardId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const existing = getHospitalDb(hospitalId).getWards().find(w => w.id === req.params.wardId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Ward not found' });
      return;
    }
    const total = req.body.totalBeds !== undefined ? Number(req.body.totalBeds) : existing.totalBeds;
    const occ = req.body.occupied !== undefined ? Number(req.body.occupied) : existing.occupied;
    const rsv = req.body.reserved !== undefined ? Number(req.body.reserved) : existing.reserved;
    const mnt = req.body.maintenance !== undefined ? Number(req.body.maintenance) : existing.maintenance;
    if (!Number.isFinite(total) || total < 1 || occ < 0 || rsv < 0 || mnt < 0 || occ + rsv + mnt > total) {
      res.status(400).json({ success: false, error: 'Invalid ward bed counts (sum cannot exceed totalBeds)' });
      return;
    }
    const updated = getHospitalDb(hospitalId).updateWard(req.params.wardId, {
      name: req.body.name ? String(req.body.name).trim() : existing.name,
      nameMY: req.body.nameMY ? String(req.body.nameMY).trim() : existing.nameMY,
      totalBeds: Math.trunc(total),
      occupied: Math.trunc(occ),
      reserved: Math.trunc(rsv),
      maintenance: Math.trunc(mnt),
      type: ['general', 'icu', 'maternity', 'pediatric', 'isolation'].includes(req.body.type) ? req.body.type : existing.type,
    });
    res.json({ success: true, data: updated });
  }
);

router.get(
  '/:hospitalId/departments',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    res.json({ success: true, data: getHospitalDb(hospitalId).getDepartments() });
  }
);

router.post(
  '/:hospitalId/departments',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const body = req.body || {};
    if (!String(body.name || '').trim()) {
      res.status(400).json({ success: false, error: 'Department name is required' });
      return;
    }
    const docs = Math.max(0, Math.trunc(Number(body.doctorCount) || 0));
    const nurses = Math.max(0, Math.trunc(Number(body.nurseCount) || 0));
    const created = getHospitalDb(hospitalId).createDepartment({
      name: String(body.name).trim(),
      nameMY: String(body.nameMY || body.name).trim(),
      head: String(body.head || 'Department Head').trim(),
      headTitle: String(body.headTitle || 'Consultant Specialist').trim(),
      doctorCount: docs,
      nurseCount: nurses,
      staffCount: Math.max(docs + nurses, Math.trunc(Number(body.staffCount) || docs + nurses)),
      location: String(body.location || 'Main Clinical Block').trim(),
      extension: String(body.extension || '2000').trim(),
      operatingHours: String(body.operatingHours || '08:00 - 17:00').trim(),
      status: ['active', 'limited', 'closed'].includes(body.status) ? body.status : 'active',
      specialties: Array.isArray(body.specialties) ? body.specialties.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
    });
    res.status(201).json({ success: true, data: created });
  }
);

router.put(
  '/:hospitalId/departments/:deptId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const updated = getHospitalDb(hospitalId).updateDepartment(req.params.deptId, req.body || {});
    if (!updated) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);

router.get(
  '/:hospitalId/staff',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const staff = await getHospitalDb(hospitalId).getStaffRoster();
      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Get staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch staff roster' });
    }
  }
);

router.post(
  '/:hospitalId/staff',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const body = req.body || {};
      const icNumber = ensureValidIc(body.icNumber, res);
      if (!icNumber) return;
      if (!String(body.name || '').trim()) {
        res.status(400).json({ success: false, error: 'Staff full name is required' });
        return;
      }
      const member = await getHospitalDb(hospitalId).upsertStaffMember({ ...body, icNumber });
      res.status(201).json({ success: true, data: member });
    } catch (error) {
      console.error('Create staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to save staff member' });
    }
  }
);

router.put(
  '/:hospitalId/staff/:staffId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const body = req.body || {};
      if (body.icNumber) {
        const validIc = ensureValidIc(body.icNumber, res);
        if (!validIc) return;
        body.icNumber = validIc;
      }
      const member = await getHospitalDb(hospitalId).upsertStaffMember({ ...body, id: req.params.staffId });
      res.json({ success: true, data: member });
    } catch (error) {
      console.error('Update staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to update staff member' });
    }
  }
);

router.delete(
  '/:hospitalId/staff/:staffId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospitalId = ensureValidHospital(req, res);
      if (!hospitalId) return;
      const ok = await getHospitalDb(hospitalId).deactivateOrRemoveStaff(req.params.staffId);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }
      res.json({ success: true, message: 'Staff member deactivated/removed' });
    } catch (error) {
      console.error('Delete staff error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove staff member' });
    }
  }
);

router.get(
  '/:hospitalId/inventory',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    res.json({ success: true, data: getHospitalDb(hospitalId).getInventory() });
  }
);

router.post(
  '/:hospitalId/inventory',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const body = req.body || {};
    if (!String(body.name || '').trim() || !String(body.sku || '').trim()) {
      res.status(400).json({ success: false, error: 'Item name and SKU code are required' });
      return;
    }
    const stock = Math.max(0, Math.trunc(Number(body.currentStock) || 0));
    const min = Math.max(0, Math.trunc(Number(body.minStock) || 0));
    const max = Math.max(min + 1, Math.trunc(Number(body.maxStock) || stock + 100));
    const created = getHospitalDb(hospitalId).createInventoryItem({
      name: String(body.name).trim(),
      nameMY: String(body.nameMY || body.name).trim(),
      category: ['medicine', 'equipment', 'consumable', 'ppe'].includes(body.category) ? body.category : 'medicine',
      sku: String(body.sku).trim().toUpperCase(),
      currentStock: stock,
      minStock: min,
      maxStock: max,
      unit: String(body.unit || 'units').trim(),
      lastRestocked: new Date().toISOString().split('T')[0],
      expiryDate: body.expiryDate ? String(body.expiryDate) : undefined,
      supplier: String(body.supplier || 'KKM Central Medical Store').trim(),
      pricePerUnit: Math.max(0, Number(body.pricePerUnit) || 0),
    });
    res.status(201).json({ success: true, data: created });
  }
);

router.put(
  '/:hospitalId/inventory/:itemId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const body = req.body || {};
    if (body.currentStock !== undefined && (Number.isNaN(Number(body.currentStock)) || Number(body.currentStock) < 0)) {
      res.status(400).json({ success: false, error: 'Inventory stock cannot be negative' });
      return;
    }
    const updated = getHospitalDb(hospitalId).updateInventoryItem(req.params.itemId, {
      ...body,
      ...(body.currentStock !== undefined ? { currentStock: Math.trunc(Number(body.currentStock)), lastRestocked: new Date().toISOString().split('T')[0] } : {}),
    });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Inventory item not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);

router.delete(
  '/:hospitalId/inventory/:itemId',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const removed = getHospitalDb(hospitalId).deleteInventoryItem(req.params.itemId);
    if (!removed) {
      res.status(404).json({ success: false, error: 'Inventory item not found' });
      return;
    }
    res.json({ success: true, message: 'Inventory item deleted' });
  }
);

router.get(
  '/:hospitalId/finance',
  authenticate,
  requireHospitalVerification,
  authorize('hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    const hospitalId = ensureValidHospital(req, res);
    if (!hospitalId) return;
    const summary = await getHospitalDb(hospitalId).getFinancialSummary();
    res.json({ success: true, data: summary });
  }
);

export default router;
