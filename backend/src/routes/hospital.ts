import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getHospitalDb } from '../database/hospital-multi';
import { updatePatientIndex, createAuditLog } from '../database/central-multi';
import { authenticate, authorizeHospital } from '../middleware/auth';
import { HOSPITALS } from '../config';
import { MedicalRecord } from '../types';

const router = Router();

router.get('/:hospitalId', async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const hospital = HOSPITALS.find(h => h.id === hospitalId);

    if (!hospital) {
      res.status(404).json({
        success: false,
        error: 'Hospital not found',
      });
      return;
    }

    const hospitalDb = getHospitalDb(hospitalId);
    const stats = await hospitalDb.getStats();

    res.json({
      success: true,
      data: {
        ...hospital,
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
});

router.get('/:hospitalId/stats', async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const stats = await hospitalDb.getStats();

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
});

router.post('/:hospitalId/records', authenticate, authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const recordData: MedicalRecord & { patientName?: string } = req.body;

    if (!recordData.icNumber || !recordData.doctorId) {
      res.status(400).json({
        success: false,
        error: 'IC number and doctor ID are required',
      });
      return;
    }

    const hospitalDb = getHospitalDb(hospitalId);

    const doctor = await hospitalDb.getDoctor(recordData.doctorId);

    if (!doctor) {
      res.status(400).json({
        success: false,
        error: 'Invalid doctor ID for this hospital',
      });
      return;
    }

    const existingPatient = await hospitalDb.getPatient(recordData.icNumber);
    if (!existingPatient) {
      const patientName = recordData.patientName || `Patient ${recordData.icNumber}`;
      await hospitalDb.createPatient({
        icNumber: recordData.icNumber,
        fullName: patientName,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const recordId = await hospitalDb.createRecord({
      ...recordData,
      id: uuidv4(),
      hospitalId,
      visitDate: recordData.visitDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await updatePatientIndex(recordData.icNumber, hospitalId);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'create',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'doctor' | 'patient' | 'hospital_admin' | 'central_admin',
      actorHospitalId: hospitalId,
      targetIcNumber: recordData.icNumber,
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
});

export default router;
