import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getHospitalDb } from '../database/hospital';
import { updatePatientIndex, createAuditLog } from '../database/central';
import { authenticate, authorize, authorizeHospital } from '../middleware/auth';
import { HOSPITALS } from '../config';
import { MedicalRecord, Patient } from '../types';

const router = Router();

// ============================================================================
// Hospital Info Routes
// ============================================================================

// Get hospital info
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

// Get hospital statistics
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

// ============================================================================
// Patient Routes
// ============================================================================

// Get patient by IC (for cross-hospital queries - read only)
router.get('/:hospitalId/patients/:icNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { hospitalId, icNumber } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const patient = await hospitalDb.getPatient(icNumber);
    
    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
      return;
    }
    
    // Log the access
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'view',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'doctor' | 'patient' | 'hospital_admin' | 'central_admin',
      actorHospitalId: req.user!.hospitalId,
      targetIcNumber: icNumber,
      targetHospitalId: hospitalId,
      details: 'Viewed patient information',
      ipAddress: req.ip || 'unknown',
      success: true,
    });
    
    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient',
    });
  }
});

// Get all patients in hospital (hospital staff only)
router.get('/:hospitalId/patients', authenticate, authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const patients = await hospitalDb.getAllPatients();
    
    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients',
    });
  }
});

// Create or update patient (hospital staff only)
router.post('/:hospitalId/patients', authenticate, authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const patientData: Patient = req.body;
    
    if (!patientData.icNumber || !patientData.fullName) {
      res.status(400).json({
        success: false,
        error: 'IC number and full name are required',
      });
      return;
    }
    
    const hospitalDb = getHospitalDb(hospitalId);
    await hospitalDb.createPatient({
      ...patientData,
      createdAt: patientData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Update central index
    await updatePatientIndex(patientData.icNumber, hospitalId);
    
    res.status(201).json({
      success: true,
      message: 'Patient created/updated successfully',
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create patient',
    });
  }
});

// ============================================================================
// Medical Record Routes
// ============================================================================

// Get patient records (for cross-hospital queries)
router.get('/:hospitalId/records/:icNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { hospitalId, icNumber } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const records = await hospitalDb.getRecordsByPatient(icNumber);
    
    const hospital = HOSPITALS.find(h => h.id === hospitalId);
    const isOwnHospital = req.user?.hospitalId === hospitalId;
    
    // Mark as read-only if from different hospital
    const markedRecords = records.map(r => ({
      ...r,
      hospitalId,
      hospitalName: hospital?.name || hospitalId,
      isReadOnly: !isOwnHospital,
      sourceHospital: hospital?.name || hospitalId,
    }));
    
    // Log the access
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'view',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'doctor' | 'patient' | 'hospital_admin' | 'central_admin',
      actorHospitalId: req.user!.hospitalId,
      targetIcNumber: icNumber,
      targetHospitalId: hospitalId,
      details: `Viewed ${records.length} medical records`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });
    
    res.json({
      success: true,
      data: markedRecords,
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical records',
    });
  }
});

// Get single record by ID
router.get('/:hospitalId/record/:recordId', authenticate, async (req: Request, res: Response) => {
  try {
    const { hospitalId, recordId } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const record = await hospitalDb.getRecordById(recordId);
    
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }
    
    const hospital = HOSPITALS.find(h => h.id === hospitalId);
    const isOwnHospital = req.user?.hospitalId === hospitalId;
    
    res.json({
      success: true,
      data: {
        ...record,
        hospitalId,
        hospitalName: hospital?.name || hospitalId,
        isReadOnly: !isOwnHospital,
        sourceHospital: hospital?.name || hospitalId,
      },
    });
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical record',
    });
  }
});

// Create new medical record (hospital staff only - own hospital)
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
    
    // Verify doctor belongs to this hospital
    const doctor = await hospitalDb.getDoctor(recordData.doctorId);
    
    if (!doctor) {
      res.status(400).json({
        success: false,
        error: 'Invalid doctor ID for this hospital',
      });
      return;
    }
    
    // Check if patient exists, if not create a basic patient record
    let patient = await hospitalDb.getPatient(recordData.icNumber);
    if (!patient) {
      // Auto-create patient with minimal info
      const patientName = recordData.patientName || `Patient ${recordData.icNumber}`;
      await hospitalDb.createPatient({
        icNumber: recordData.icNumber,
        fullName: patientName,
        dateOfBirth: '1990-01-01', // Default date
        gender: 'male', // Default, can be updated later
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
    
    // Create the record
    const recordId = await hospitalDb.createRecord({
      ...recordData,
      id: uuidv4(),
      hospitalId,
      visitDate: recordData.visitDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Update central index
    await updatePatientIndex(recordData.icNumber, hospitalId);
    
    // Log the creation
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

// ============================================================================
// Doctor Routes
// ============================================================================

// Get all doctors in hospital
router.get('/:hospitalId/doctors', async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const doctors = await hospitalDb.getAllDoctors();
    
    res.json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors',
    });
  }
});

// Get doctor by ID
router.get('/:hospitalId/doctors/:doctorId', async (req: Request, res: Response) => {
  try {
    const { hospitalId, doctorId } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const doctor = await hospitalDb.getDoctor(doctorId);
    
    if (!doctor) {
      res.status(404).json({
        success: false,
        error: 'Doctor not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor',
    });
  }
});

// ============================================================================
// Prescription Routes
// ============================================================================

// Get active prescriptions for patient
router.get('/:hospitalId/prescriptions/:icNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { hospitalId, icNumber } = req.params;
    const hospitalDb = getHospitalDb(hospitalId);
    const prescriptions = await hospitalDb.getActivePrescriptions(icNumber);
    
    res.json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescriptions',
    });
  }
});

export default router;
