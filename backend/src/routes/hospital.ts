import { Router, Request, Response } from 'express';
import { createAuditLog, getPatientIndex, updatePatientIndex } from '../database/central-db';
import { findPatientAcrossHospitals, getHospitalDb } from '../database/hospital-db';
import { authenticate, authorize, authorizeHospital } from '../middleware/auth';
import { findHospitalConfig } from '../config';
import { CreateMedicalRecordInput } from '../types';

const router = Router();

router.get('/:hospitalId', async (req: Request, res: Response) => {
  try {
    const hospital = findHospitalConfig(req.params.hospitalId);
    if (!hospital) {
      res.status(404).json({ success: false, error: 'Hospital not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: hospital.id,
        name: hospital.name,
        shortName: hospital.shortName,
        city: hospital.city,
        state: hospital.state,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
        isActive: true,
      },
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hospital information' });
  }
});

router.get(
  '/:hospitalId/stats',
  authenticate,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const hospital = findHospitalConfig(req.params.hospitalId);
      if (!hospital) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }

      const stats = await getHospitalDb(hospital.id).getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get hospital stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch hospital statistics' });
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
      const hospital = findHospitalConfig(req.params.hospitalId);
      if (!hospital) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }

      const doctors = await getHospitalDb(hospital.id).getDoctors();
      res.json({ success: true, data: doctors });
    } catch (error) {
      console.error('Get hospital doctors error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch hospital doctors' });
    }
  }
);

router.post(
  '/:hospitalId/records',
  authenticate,
  authorize('doctor', 'hospital_admin'),
  authorizeHospital,
  async (req: Request, res: Response) => {
    try {
      const { hospitalId } = req.params;
      if (!findHospitalConfig(hospitalId)) {
        res.status(404).json({ success: false, error: 'Hospital not found' });
        return;
      }

      const recordData: CreateMedicalRecordInput = req.body ?? {};
      const icNumber = typeof recordData.icNumber === 'string' ? recordData.icNumber.trim() : '';

      if (!icNumber) {
        res.status(400).json({
          success: false,
          error: 'Patient IC number is required',
        });
        return;
      }

      const hospitalDb = getHospitalDb(hospitalId);
      let resolvedDoctorId = recordData.doctorId;

      if (!resolvedDoctorId && req.user?.icNumber) {
        const byIc = await hospitalDb.getDoctorByIc(req.user.icNumber);
        resolvedDoctorId = byIc?.id;
      }

      if (!resolvedDoctorId) {
        res.status(400).json({
          success: false,
          error: 'Valid doctor ID is required',
        });
        return;
      }

      const doctor = await hospitalDb.getDoctor(resolvedDoctorId);
      if (!doctor) {
        res.status(400).json({
          success: false,
          error: 'Invalid doctor ID for this hospital',
        });
        return;
      }

      // Ensure patient record exists locally; reuse existing network demographics if indexed elsewhere
      const localPatient = await hospitalDb.getPatient(icNumber);
      if (!localPatient) {
        const existingIndex = await getPatientIndex(icNumber);
        const networkPatient = existingIndex
          ? await findPatientAcrossHospitals(icNumber, existingIndex.hospitals)
          : null;

        if (networkPatient) {
          await hospitalDb.createPatient({
            icNumber,
            fullName: recordData.patientName?.trim() || networkPatient.fullName,
            dateOfBirth: networkPatient.dateOfBirth,
            gender: networkPatient.gender,
            bloodType: networkPatient.bloodType,
            phone: networkPatient.phone,
            email: networkPatient.email,
            address: networkPatient.address,
            emergencyContact: networkPatient.emergencyContact,
            emergencyPhone: networkPatient.emergencyPhone,
            allergies: networkPatient.allergies,
            chronicConditions: networkPatient.chronicConditions,
          });
        } else {
          await hospitalDb.createPatient({
            icNumber,
            fullName: recordData.patientName?.trim() || `Patient ${icNumber}`,
            dateOfBirth: '1990-01-01',
            gender: 'male',
            bloodType: '',
            phone: '',
            email: '',
            address: '',
            emergencyContact: '',
            emergencyPhone: '',
            allergies: [],
            chronicConditions: [],
          });
        }
      }

      const recordId = await hospitalDb.createRecord({
        ...recordData,
        icNumber,
        doctorId: resolvedDoctorId,
      });

      await updatePatientIndex(icNumber, hospitalId);

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'create',
        actorId: req.user!.userId,
        actorType: req.user!.role,
        actorHospitalId: hospitalId,
        targetIcNumber: icNumber,
        targetHospitalId: hospitalId,
        details: `Created medical record ${recordId}`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.status(201).json({
        success: true,
        data: { recordId },
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

export default router;
