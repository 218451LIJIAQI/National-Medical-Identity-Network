import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getHospitalDb, findPatientInHospitals } from '../database/hospital-multi';
import {
  getPatientIndex,
  updatePatientIndex,
  createAuditLog,
  getBlockedHospitals,
} from '../database/central-multi';
import { authenticate, authorize, authorizeHospital } from '../middleware/auth';
import { getHospitalById, inferDemographicsFromMyKad, normalizeIcNumber } from '../config';
import { MedicalRecord, Prescription, LabReport } from '../types';

const router = Router();

router.get(
  '/:hospitalId',
  authenticate,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const { hospitalId } = req.params;
      const hospital = getHospitalById(hospitalId)!;
      const stats = await getHospitalDb(hospitalId).getStats();

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
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const stats = await getHospitalDb(req.params.hospitalId).getStats();

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
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const doctors = await getHospitalDb(req.params.hospitalId).getDoctors();
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
  '/:hospitalId/patients/:icNumber/records',
  authenticate,
  authorize('doctor', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const { hospitalId } = req.params;
      const icNumber = normalizeIcNumber(req.params.icNumber || '');
      const currentUser = req.user!;

      if (currentUser.role === 'doctor') {
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (blockedHospitals.includes(hospitalId)) {
          const hospitalName = getHospitalById(hospitalId)?.name || hospitalId;
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'view',
            actorId: currentUser.userId,
            actorType: currentUser.role,
            actorHospitalId: hospitalId,
            targetIcNumber: icNumber,
            targetHospitalId: hospitalId,
            details: `Access denied to local records: patient blocked ${hospitalName}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });
          res.status(403).json({
            success: false,
            accessDenied: true,
            error: 'Patient has blocked access from your hospital',
          });
          return;
        }
      }

      const hospitalDb = getHospitalDb(hospitalId);
      const [patient, records] = await Promise.all([
        hospitalDb.getPatient(icNumber),
        hospitalDb.getRecordsByPatient(icNumber),
      ]);

      const hospitalName = getHospitalById(hospitalId)?.name || hospitalId;
      const markedRecords = records.map(r => ({
        ...r,
        hospitalId,
        hospitalName,
        isReadOnly: !(currentUser.role === 'doctor' && currentUser.hospitalId === hospitalId),
        sourceHospital: hospitalName,
      }));

      res.json({
        success: true,
        data: {
          patient,
          records: markedRecords,
        },
      });
    } catch (error) {
      console.error('Get hospital patient records error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital patient records',
      });
    }
  }
);

interface CreateRecordPayload extends Partial<MedicalRecord> {
  icNumber?: string;
  doctorId?: string;
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
  prescriptions?: Prescription[];
  labReports?: LabReport[];
}

router.post(
  '/:hospitalId/records',
  authenticate,
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const { hospitalId } = req.params;
      const currentUser = req.user!;
      const body: CreateRecordPayload = req.body || {};
      const icNumber = normalizeIcNumber(body.icNumber || '');

      if (!icNumber) {
        res.status(400).json({
          success: false,
          error: 'Patient IC number is required',
        });
        return;
      }

      const diagnosisList = Array.isArray(body.diagnosis)
        ? body.diagnosis.map(d => String(d).trim()).filter(Boolean)
        : [];
      if (diagnosisList.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one diagnosis is required',
        });
        return;
      }

      const hospitalDb = getHospitalDb(hospitalId);
      const authenticatedDoctor = await hospitalDb.getDoctorByIc(currentUser.icNumber);
      const requestedDoctor = body.doctorId ? await hospitalDb.getDoctor(body.doctorId) : null;

      if (body.doctorId && !requestedDoctor) {
        res.status(400).json({
          success: false,
          error: 'Invalid doctor ID for this hospital',
        });
        return;
      }

      const doctor = authenticatedDoctor || requestedDoctor;
      if (!doctor || (requestedDoctor && authenticatedDoctor && requestedDoctor.id !== authenticatedDoctor.id)) {
        res.status(403).json({
          success: false,
          error: 'Doctor identity does not match authenticated clinician in this hospital',
        });
        return;
      }

      const existingPatient = await hospitalDb.getPatient(icNumber);
      const nowIso = new Date().toISOString();

      if (!existingPatient) {
        let federatedPatient = null;
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (!blockedHospitals.includes(hospitalId)) {
          const patientIndex = await getPatientIndex(icNumber);
          if (patientIndex && patientIndex.hospitals.length > 0) {
            federatedPatient = await findPatientInHospitals(icNumber, patientIndex.hospitals);
          }
        }

        const inferred = inferDemographicsFromMyKad(icNumber);
        await hospitalDb.createPatient({
          icNumber,
          fullName:
            body.patientName?.trim() ||
            federatedPatient?.fullName ||
            `Patient ${icNumber}`,
          dateOfBirth:
            body.dateOfBirth ||
            federatedPatient?.dateOfBirth ||
            inferred.dateOfBirth,
          gender:
            body.gender === 'male' || body.gender === 'female'
              ? body.gender
              : federatedPatient?.gender || inferred.gender,
          bloodType: body.bloodType ?? federatedPatient?.bloodType ?? '',
          phone: body.phone ?? federatedPatient?.phone ?? '',
          email: body.email ?? federatedPatient?.email ?? '',
          address: body.address ?? federatedPatient?.address ?? '',
          emergencyContact: body.emergencyContact ?? federatedPatient?.emergencyContact ?? '',
          emergencyPhone: body.emergencyPhone ?? federatedPatient?.emergencyPhone ?? '',
          allergies:
            Array.isArray(body.allergies) && body.allergies.length > 0
              ? body.allergies
              : federatedPatient?.allergies || [],
          chronicConditions:
            Array.isArray(body.chronicConditions) && body.chronicConditions.length > 0
              ? body.chronicConditions
              : federatedPatient?.chronicConditions || [],
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      const visitType =
        body.visitType === 'inpatient' || body.visitType === 'emergency'
          ? body.visitType
          : 'outpatient';

      const createdRecord = await hospitalDb.createRecord({
        id: crypto.randomUUID(),
        icNumber,
        hospitalId,
        doctorId: doctor.id,
        visitDate: body.visitDate || nowIso,
        visitType,
        chiefComplaint: body.chiefComplaint || '',
        diagnosis: diagnosisList,
        diagnosisCodes: Array.isArray(body.diagnosisCodes) ? body.diagnosisCodes : [],
        symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
        notes: body.notes || '',
        vitalSigns: body.vitalSigns,
        prescriptions: Array.isArray(body.prescriptions) ? body.prescriptions : [],
        labReports: Array.isArray(body.labReports) ? body.labReports : [],
        followUpDate: body.followUpDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await updatePatientIndex(icNumber, hospitalId);

      await createAuditLog({
        timestamp: nowIso,
        action: 'create',
        actorId: currentUser.userId,
        actorType: currentUser.role,
        actorHospitalId: hospitalId,
        targetIcNumber: icNumber,
        targetHospitalId: hospitalId,
        details: `Created medical record ${createdRecord.id} (${diagnosisList.join(', ')})`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.status(201).json({
        success: true,
        data: {
          recordId: createdRecord.id,
          record: {
            ...createdRecord,
            isReadOnly: false,
            sourceHospital: createdRecord.hospitalName,
          },
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
  authorize('doctor'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const { hospitalId, recordId } = req.params;
      const currentUser = req.user!;
      const body: Partial<MedicalRecord> = req.body || {};

      if (body.hospitalId && body.hospitalId !== hospitalId) {
        res.status(403).json({
          success: false,
          error: 'Cross-hospital medical records are strictly read-only',
        });
        return;
      }

      const hospitalDb = getHospitalDb(hospitalId);
      const existingRecord = await hospitalDb.getRecordById(recordId);

      if (!existingRecord) {
        res.status(404).json({
          success: false,
          error: 'Medical record not found in this hospital (cross-hospital records are read-only)',
        });
        return;
      }

      if (body.diagnosis !== undefined) {
        const cleanedDiagnosis = Array.isArray(body.diagnosis)
          ? body.diagnosis.map(d => String(d).trim()).filter(Boolean)
          : [];
        if (cleanedDiagnosis.length === 0) {
          res.status(400).json({
            success: false,
            error: 'At least one diagnosis is required',
          });
          return;
        }
        body.diagnosis = cleanedDiagnosis;
      }

      const updatedRecord = await hospitalDb.updateRecord(recordId, {
        visitDate: body.visitDate,
        visitType: body.visitType,
        chiefComplaint: body.chiefComplaint,
        diagnosis: body.diagnosis,
        diagnosisCodes: body.diagnosisCodes,
        symptoms: body.symptoms,
        notes: body.notes,
        vitalSigns: body.vitalSigns,
        followUpDate: body.followUpDate,
        prescriptions: body.prescriptions,
        labReports: body.labReports,
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
        actorId: currentUser.userId,
        actorType: currentUser.role,
        actorHospitalId: hospitalId,
        targetIcNumber: existingRecord.icNumber,
        targetHospitalId: hospitalId,
        details: `Updated medical record ${recordId}`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.json({
        success: true,
        data: {
          record: {
            ...updatedRecord,
            isReadOnly: false,
            sourceHospital: updatedRecord.hospitalName,
          },
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
