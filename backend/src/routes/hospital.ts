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
};

const VITAL_BOUNDS: Array<[keyof VitalSigns, number, number, string]> = [
  ['bloodPressureSystolic', 30, 300, 'Systolic blood pressure (30-300 mmHg)'],
  ['bloodPressureDiastolic', 15, 220, 'Diastolic blood pressure (15-220 mmHg)'],
  ['heartRate', 15, 300, 'Heart rate (15-300 bpm)'],
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
      const { hospitalId } = req.params;
      const hospital = getHospitalById(hospitalId);

      if (!hospital) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

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
      const { hospitalId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

      const stats = await loadScopedHospitalStats(hospitalId, req.user?.role);

      res.json({
        success: true,
        data: stats,
      });
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
      const { hospitalId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

      const doctors = await getHospitalDb(hospitalId).getDoctors();
      res.json({
        success: true,
        data: doctors,
      });
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
      const { hospitalId } = req.params;
      const icNumber = normalizeIcNumber(req.params.icNumber);

      if (!getHospitalById(hospitalId)) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }

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
      const { hospitalId, recordId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }

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
      const { hospitalId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

      const recordData: CreateOrUpdateRecordPayload = req.body || {};
      const icNumber = normalizeIcNumber(String(recordData.icNumber || ''));

      if (!icNumber) {
        res.status(400).json({
          success: false,
          error: 'Patient IC number is required',
        });
        return;
      }

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
        const mergedAllergies = Array.from(
          new Set([
            ...(federatedPatient?.allergies || []),
            ...(Array.isArray(recordData.allergies) ? recordData.allergies : []),
          ].filter(Boolean))
        );
        const mergedConditions = Array.from(
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
        recordData.bloodType ||
        (Array.isArray(recordData.allergies) && recordData.allergies.length > 0) ||
        (Array.isArray(recordData.chronicConditions) && recordData.chronicConditions.length > 0) ||
        recordData.emergencyContact ||
        recordData.emergencyPhone
      ) {
        await hospitalDb.updatePatient(icNumber, {
          bloodType: recordData.bloodType?.trim() || existingPatient.bloodType,
          emergencyContact: recordData.emergencyContact?.trim() || existingPatient.emergencyContact,
          emergencyPhone: recordData.emergencyPhone?.trim() || existingPatient.emergencyPhone,
          allergies: Array.isArray(recordData.allergies) ? recordData.allergies : undefined,
          chronicConditions: Array.isArray(recordData.chronicConditions)
            ? recordData.chronicConditions
            : undefined,
        });
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
      const { hospitalId, recordId } = req.params;
      if (!getHospitalById(hospitalId)) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

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
        updates.bloodType ||
        (Array.isArray(updates.allergies) && updates.allergies.length > 0) ||
        (Array.isArray(updates.chronicConditions) && updates.chronicConditions.length > 0)
      ) {
        await hospitalDb.updatePatient(existingRecord.icNumber, {
          bloodType: updates.bloodType?.trim(),
          allergies: Array.isArray(updates.allergies) ? updates.allergies : undefined,
          chronicConditions: Array.isArray(updates.chronicConditions)
            ? updates.chronicConditions
            : undefined,
        });
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

export default router;
