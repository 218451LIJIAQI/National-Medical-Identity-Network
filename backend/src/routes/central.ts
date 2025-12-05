import { Router, Request, Response } from 'express';
import { 
  getPatientIndex, 
  getAllPatientIndexes, 
  getHospitals, 
  getCentralStats,
  getAuditLogs,
  createAuditLog,
  updatePatientIndex
} from '../database/central';
import { getHospitalDb } from '../database/hospital';
import { authenticate, authorize } from '../middleware/auth';
import { HOSPITALS, DRUG_INTERACTIONS } from '../config';
import { CrossHospitalQueryResult, QueryFlowStep, HospitalQueryResult, DrugInteraction } from '../types';

const router = Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get list of all hospitals
router.get('/hospitals', (req: Request, res: Response) => {
  try {
    const hospitals = getHospitals();
    res.json({
      success: true,
      data: hospitals,
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospitals',
    });
  }
});

// Get central platform statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = getCentralStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

// ============================================================================
// Cross-Hospital Query Routes (Main Feature)
// ============================================================================

// Query patient records across all hospitals
router.get('/query/:icNumber', authenticate, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { icNumber } = req.params;
  const querySteps: QueryFlowStep[] = [];
  
  try {
    // Step 1: Look up patient in central index
    querySteps.push({
      step: 1,
      action: 'Looking up patient in central index',
      from: 'Central Hub',
      to: 'Patient Index',
      status: 'in_progress',
      timestamp: new Date().toISOString(),
    });
    
    const patientIndex = getPatientIndex(icNumber);
    
    querySteps[0].status = 'completed';
    querySteps[0].data = patientIndex ? { hospitalsFound: patientIndex.hospitals.length } : { hospitalsFound: 0 };
    
    if (!patientIndex) {
      // Patient not in any hospital
      const result: CrossHospitalQueryResult = {
        icNumber,
        querySteps,
        hospitals: [],
        totalRecords: 0,
        queryTime: Date.now() - startTime,
      };
      
      res.json({
        success: true,
        data: result,
      });
      return;
    }
    
    // Step 2: Query each hospital in parallel
    const hospitalResults: HospitalQueryResult[] = [];
    const hospitalPromises = patientIndex.hospitals.map(async (hospitalId, index) => {
      const hospital = HOSPITALS.find(h => h.id === hospitalId);
      const hospitalName = hospital?.name || hospitalId;
      
      querySteps.push({
        step: index + 2,
        action: `Querying ${hospitalName}`,
        from: 'Central Hub',
        to: hospitalName,
        status: 'in_progress',
        timestamp: new Date().toISOString(),
      });
      
      const hospitalStartTime = Date.now();
      
      try {
        const hospitalDb = getHospitalDb(hospitalId);
        const records = hospitalDb.getRecordsByPatient(icNumber);
        
        // Mark records as read-only if not from the requesting hospital
        const isOwnHospital = req.user?.hospitalId === hospitalId;
        const markedRecords = records.map(r => ({
          ...r,
          hospitalId,
          hospitalName,
          isReadOnly: !isOwnHospital,
          sourceHospital: hospitalName,
        }));
        
        const stepIndex = querySteps.findIndex(s => s.to === hospitalName);
        if (stepIndex !== -1) {
          querySteps[stepIndex].status = 'completed';
          querySteps[stepIndex].data = { recordCount: records.length };
        }
        
        hospitalResults.push({
          hospitalId,
          hospitalName,
          records: markedRecords,
          recordCount: records.length,
          status: 'success',
          responseTime: Date.now() - hospitalStartTime,
        });
      } catch (error) {
        const stepIndex = querySteps.findIndex(s => s.to === hospitalName);
        if (stepIndex !== -1) {
          querySteps[stepIndex].status = 'error';
        }
        
        hospitalResults.push({
          hospitalId,
          hospitalName,
          records: [],
          recordCount: 0,
          status: 'error',
          responseTime: Date.now() - hospitalStartTime,
          error: 'Failed to query hospital',
        });
      }
    });
    
    await Promise.all(hospitalPromises);
    
    // Calculate total records
    const totalRecords = hospitalResults.reduce((sum, h) => sum + h.recordCount, 0);
    
    // Log the query
    createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'query',
      actorId: req.user!.userId,
      actorType: req.user!.role as 'doctor' | 'patient' | 'hospital_admin' | 'central_admin',
      actorHospitalId: req.user!.hospitalId,
      targetIcNumber: icNumber,
      details: `Cross-hospital query: ${patientIndex.hospitals.length} hospitals, ${totalRecords} records`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });
    
    const result: CrossHospitalQueryResult = {
      icNumber,
      querySteps,
      hospitals: hospitalResults,
      totalRecords,
      queryTime: Date.now() - startTime,
    };
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Cross-hospital query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query patient records',
    });
  }
});

// Get patient info aggregated from all hospitals
router.get('/patient/:icNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { icNumber } = req.params;
    const patientIndex = getPatientIndex(icNumber);
    
    if (!patientIndex) {
      res.status(404).json({
        success: false,
        error: 'Patient not found in any hospital',
      });
      return;
    }
    
    // Get patient info from the first hospital that has it
    let patientInfo = null;
    for (const hospitalId of patientIndex.hospitals) {
      const hospitalDb = getHospitalDb(hospitalId);
      const patient = hospitalDb.getPatient(icNumber);
      if (patient) {
        patientInfo = patient;
        break;
      }
    }
    
    res.json({
      success: true,
      data: {
        patient: patientInfo,
        hospitals: patientIndex.hospitals,
        lastUpdated: patientIndex.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient information',
    });
  }
});

// Check for drug interactions
router.post('/drug-interactions', authenticate, async (req: Request, res: Response) => {
  try {
    const { icNumber, newMedication } = req.body;
    
    if (!icNumber || !newMedication) {
      res.status(400).json({
        success: false,
        error: 'IC number and new medication are required',
      });
      return;
    }
    
    // Get patient's current medications from all hospitals
    const patientIndex = getPatientIndex(icNumber);
    if (!patientIndex) {
      res.json({
        success: true,
        data: {
          interactions: [],
          currentMedications: [],
        },
      });
      return;
    }
    
    // Collect all active prescriptions
    const currentMedications: Array<{ medication: string; hospital: string; date: string }> = [];
    
    for (const hospitalId of patientIndex.hospitals) {
      const hospitalDb = getHospitalDb(hospitalId);
      const prescriptions = hospitalDb.getActivePrescriptions(icNumber);
      const hospital = HOSPITALS.find(h => h.id === hospitalId);
      
      prescriptions.forEach(p => {
        currentMedications.push({
          medication: p.medicationName,
          hospital: hospital?.name || hospitalId,
          date: new Date().toISOString(), // Would get actual date from record
        });
      });
    }
    
    // Check for interactions
    const interactions: DrugInteraction[] = [];
    const newMedLower = newMedication.toLowerCase();
    
    for (const current of currentMedications) {
      const currentLower = current.medication.toLowerCase();
      
      for (const interaction of DRUG_INTERACTIONS) {
        const drug1Lower = interaction.drug1.toLowerCase();
        const drug2Lower = interaction.drug2.toLowerCase();
        
        if (
          (newMedLower.includes(drug1Lower) && currentLower.includes(drug2Lower)) ||
          (newMedLower.includes(drug2Lower) && currentLower.includes(drug1Lower))
        ) {
          interactions.push({
            ...interaction,
            sourceHospital: current.hospital,
            sourceDate: current.date,
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        interactions,
        currentMedications,
      },
    });
  } catch (error) {
    console.error('Drug interaction check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check drug interactions',
    });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

// Get all patient indexes (central admin only)
router.get('/indexes', authenticate, authorize('central_admin'), (req: Request, res: Response) => {
  try {
    const indexes = getAllPatientIndexes();
    res.json({
      success: true,
      data: indexes,
    });
  } catch (error) {
    console.error('Get indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient indexes',
    });
  }
});

// Get audit logs
router.get('/audit-logs', authenticate, authorize('central_admin', 'hospital_admin'), (req: Request, res: Response) => {
  try {
    const { actorId, targetIcNumber, startDate, endDate, limit } = req.query;
    
    const logs = getAuditLogs({
      actorId: actorId as string,
      targetIcNumber: targetIcNumber as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : 100,
    });
    
    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
});

// Manually update patient index (for syncing)
router.post('/index/update', authenticate, authorize('hospital_admin', 'central_admin'), (req: Request, res: Response) => {
  try {
    const { icNumber, hospitalId } = req.body;
    
    if (!icNumber || !hospitalId) {
      res.status(400).json({
        success: false,
        error: 'IC number and hospital ID are required',
      });
      return;
    }
    
    updatePatientIndex(icNumber, hospitalId);
    
    res.json({
      success: true,
      message: 'Patient index updated successfully',
    });
  } catch (error) {
    console.error('Update index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update patient index',
    });
  }
});

export default router;
