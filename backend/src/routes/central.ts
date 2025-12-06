import { Router, Request, Response } from 'express';
import { 
  getPatientIndex, 
  getAllPatientIndexes, 
  getHospitals, 
  getCentralStats,
  getAuditLogs,
  createAuditLog,
  updatePatientIndex,
  getUserById,
  getBlockedHospitals,
  setHospitalAccess,
  getPrivacySettings
} from '../database/central';
import { getHospitalDb } from '../database/hospital';
import { authenticate, authorize } from '../middleware/auth';
import { HOSPITALS, DRUG_INTERACTIONS } from '../config';
import { CrossHospitalQueryResult, QueryFlowStep, HospitalQueryResult, DrugInteraction } from '../types';
import prisma from '../database/prisma';

const router = Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get list of all hospitals
router.get('/hospitals', async (req: Request, res: Response) => {
  try {
    const hospitals = await getHospitals();
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
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCentralStats();
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
// Emergency Access Route (No Authentication Required)
// ============================================================================

// Emergency query - provides critical patient information without login
// This is for emergency situations where healthcare providers need immediate access
router.get('/emergency/:icNumber', async (req: Request, res: Response) => {
  const { icNumber } = req.params;
  
  try {
    // Look up patient in central index
    const patientIndex = await getPatientIndex(icNumber);
    
    if (!patientIndex || patientIndex.hospitals.length === 0) {
      res.json({
        success: true,
        data: {
          found: false,
          icNumber,
          message: 'Patient not found in any hospital',
        },
      });
      return;
    }
    
    // Get patient info from the first hospital that has records
    let patientInfo: {
      fullName: string;
      bloodType: string;
      allergies: string[];
      chronicConditions: string[];
      emergencyContact: string;
      emergencyPhone: string;
    } | null = null;
    
    for (const hospitalId of patientIndex.hospitals) {
      const hospitalDb = getHospitalDb(hospitalId);
      const patient = await hospitalDb.getPatient(icNumber);
      if (patient) {
        patientInfo = {
          fullName: patient.fullName,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
          emergencyContact: patient.emergencyContact,
          emergencyPhone: patient.emergencyPhone,
        };
        break;
      }
    }
    
    if (!patientInfo) {
      res.json({
        success: true,
        data: {
          found: false,
          icNumber,
          message: 'Patient data not available',
        },
      });
      return;
    }
    
    // Log emergency access (non-blocking, don't fail if logging fails)
    try {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'emergency_access',
        actorId: 'system',  // Use system user for anonymous access
        actorType: 'system',
        targetIcNumber: icNumber,
        details: `Emergency access from IP: ${req.ip || 'unknown'}`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });
    } catch (logError) {
      console.warn('Failed to log emergency access:', logError);
      // Continue even if logging fails - emergency access should not be blocked
    }
    
    res.json({
      success: true,
      data: {
        found: true,
        icNumber,
        ...patientInfo,
        hospitalsWithRecords: patientIndex.hospitals.length,
        accessType: 'emergency',
        warning: 'This is emergency access. Full audit trail has been recorded.',
      },
    });
  } catch (error) {
    console.error('Emergency access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve emergency patient information',
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
    
    const patientIndex = await getPatientIndex(icNumber);
    
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
    
    // Check if the requesting hospital is blocked by the patient
    const requestingHospitalId = req.user?.hospitalId;
    if (requestingHospitalId) {
      const blockedHospitals = await getBlockedHospitals(icNumber);
      if (blockedHospitals.includes(requestingHospitalId)) {
        // Hospital is blocked - return empty result with access denied message
        querySteps[0].status = 'completed';
        querySteps[0].data = { hospitalsFound: 0, accessDenied: true };
        
        const result: CrossHospitalQueryResult = {
          icNumber,
          querySteps,
          hospitals: [],
          totalRecords: 0,
          queryTime: Date.now() - startTime,
          accessDenied: true,
          message: 'Patient has blocked access from your hospital',
        };
        
        res.json({
          success: true,
          data: result,
        });
        return;
      }
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
        const records = await hospitalDb.getRecordsByPatient(icNumber);
        
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
    await createAuditLog({
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
    const patientIndex = await getPatientIndex(icNumber);
    
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
      const patient = await hospitalDb.getPatient(icNumber);
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
    const patientIndex = await getPatientIndex(icNumber);
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
      const prescriptions = await hospitalDb.getActivePrescriptions(icNumber);
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
router.get('/indexes', authenticate, authorize('central_admin'), async (req: Request, res: Response) => {
  try {
    const indexes = await getAllPatientIndexes();
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

// Search patient index by IC number (central admin only) - shows which hospitals patient has visited
router.get('/index/:icNumber', authenticate, authorize('central_admin'), async (req: Request, res: Response) => {
  try {
    const { icNumber } = req.params;
    const patientIndex = await getPatientIndex(icNumber);
    
    if (!patientIndex) {
      res.status(404).json({
        success: false,
        error: 'Patient not found in any hospital',
      });
      return;
    }
    
    // Get detailed hospital info for each hospital the patient visited
    const hospitalDetails = await Promise.all(
      patientIndex.hospitals.map(async (hospitalId) => {
        const hospital = HOSPITALS.find(h => h.id === hospitalId);
        const hospitalDb = getHospitalDb(hospitalId);
        const recordCount = (await hospitalDb.getRecordsByPatient(icNumber)).length;
        
        return {
          hospitalId,
          hospitalName: hospital?.name || hospitalId,
          shortName: hospital?.shortName || hospitalId,
          city: hospital?.city || 'Unknown',
          recordCount,
          isActive: true, // All hospitals in the system are active
        };
      })
    );
    
    // Try to get patient info from first hospital
    let patientInfo = null;
    for (const hospitalId of patientIndex.hospitals) {
      const hospitalDb = getHospitalDb(hospitalId);
      const patient = await hospitalDb.getPatient(icNumber);
      if (patient) {
        patientInfo = {
          fullName: patient.fullName,
          icNumber: patient.icNumber,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
        };
        break;
      }
    }
    
    res.json({
      success: true,
      data: {
        icNumber,
        patient: patientInfo,
        hospitals: hospitalDetails,
        totalHospitals: hospitalDetails.length,
        totalRecords: hospitalDetails.reduce((sum, h) => sum + h.recordCount, 0),
        lastUpdated: patientIndex.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Search patient index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search patient index',
    });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', authenticate, authorize('central_admin', 'hospital_admin'), async (req: Request, res: Response) => {
  try {
    const { actorId, targetIcNumber, startDate, endDate, limit } = req.query;
    
    const logs = await getAuditLogs({
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

// Get my access logs (for patients to see who accessed their records)
router.get('/my-access-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    
    if (!userIcNumber) {
      res.status(400).json({
        success: false,
        error: 'User IC number not found',
      });
      return;
    }
    
    const { limit } = req.query;
    const userId = req.user?.userId;
    
    const allLogs = await getAuditLogs({
      targetIcNumber: userIcNumber,
      limit: limit ? parseInt(limit as string) * 2 : 40, // Fetch more to account for filtering
    });
    
    // Filter out logs where the patient accessed their own records
    const requestedLimit = limit ? parseInt(limit as string) : 20;
    const logs = allLogs.filter(log => log.actorId !== userId).slice(0, requestedLimit);
    
    // Enrich logs with doctor/hospital names
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let actorName = log.actorId;
      let hospitalName = log.actorHospitalId || 'Unknown Hospital';
      
      // Get hospital name
      const hospital = HOSPITALS.find(h => h.id === log.actorHospitalId);
      if (hospital) {
        hospitalName = hospital.name;
      }
      
      // Try to get actor's full name based on role
      try {
        const user = await getUserById(log.actorId);
        if (user && user.icNumber) {
          if (log.actorType === 'doctor') {
            // Look up doctor by IC number
            const doctor = await prisma.doctor.findFirst({
              where: { icNumber: user.icNumber }
            });
            if (doctor) {
              actorName = doctor.fullName;
            } else {
              // Fallback: show as "Dr. [IC Number]"
              actorName = `Dr. ${user.icNumber}`;
            }
          } else if (log.actorType === 'patient') {
            // Look up patient by IC number
            const patient = await prisma.patient.findFirst({
              where: { icNumber: user.icNumber }
            });
            if (patient) {
              actorName = patient.fullName;
            } else {
              actorName = `Patient ${user.icNumber}`;
            }
          } else if (log.actorType === 'hospital_admin') {
            actorName = `Hospital Admin`;
          } else if (log.actorType === 'central_admin') {
            actorName = `Central Admin`;
          }
        }
      } catch (err) {
        console.error('Error looking up actor name:', err);
        // If lookup fails, try to format nicely based on actorType
        if (log.actorType === 'doctor') {
          actorName = 'Unknown Doctor';
        } else if (log.actorType === 'patient') {
          actorName = 'Unknown Patient';
        } else {
          actorName = log.actorType || 'Unknown';
        }
      }
      
      return {
        ...log,
        actorName,
        hospitalName,
      };
    }));
    
    res.json({
      success: true,
      data: enrichedLogs,
    });
  } catch (error) {
    console.error('Get my access logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs',
    });
  }
});

// Get my activity logs (for doctors to see their own query history)
router.get('/my-activity-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found',
      });
      return;
    }
    
    const { limit } = req.query;
    const requestedLimit = limit ? parseInt(limit as string) : 10;
    
    // Fetch more logs to account for filtering
    const logs = await getAuditLogs({
      actorId: userId,
      limit: requestedLimit * 3,
    });
    
    // Filter to only show patient-related actions (query, view, create, update)
    // Exclude login/logout actions
    const patientLogs = logs
      .filter(log => log.action !== 'login' && log.action !== 'logout' && log.targetIcNumber)
      .slice(0, requestedLimit);
    
    // Enrich logs with patient names
    const enrichedLogs = await Promise.all(patientLogs.map(async (log) => {
      let patientName = 'Unknown Patient';
      
      if (log.targetIcNumber) {
        try {
          const patient = await prisma.patient.findFirst({
            where: { icNumber: log.targetIcNumber }
          });
          if (patient) {
            patientName = patient.fullName;
          }
        } catch (err) {
          // Ignore lookup errors
        }
      }
      
      return {
        ...log,
        patientName,
      };
    }));
    
    res.json({
      success: true,
      data: enrichedLogs,
    });
  } catch (error) {
    console.error('Get my activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
    });
  }
});

// Manually update patient index (for syncing)
router.post('/index/update', authenticate, authorize('hospital_admin', 'central_admin'), async (req: Request, res: Response) => {
  try {
    const { icNumber, hospitalId } = req.body;
    
    if (!icNumber || !hospitalId) {
      res.status(400).json({
        success: false,
        error: 'IC number and hospital ID are required',
      });
      return;
    }
    
    await updatePatientIndex(icNumber, hospitalId);
    
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

// ============================================================================
// Privacy Settings Routes
// ============================================================================

// Get my privacy settings (blocked hospitals)
router.get('/privacy-settings', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    
    if (!userIcNumber) {
      res.status(400).json({
        success: false,
        error: 'User IC number not found',
      });
      return;
    }
    
    const settings = await getPrivacySettings(userIcNumber);
    const hospitals = await getHospitals();
    
    // Merge with all hospitals
    const result = hospitals.map(h => {
      const setting = settings.find(s => s.hospitalId === h.id);
      return {
        hospitalId: h.id,
        hospitalName: h.name,
        city: h.city,
        isBlocked: setting?.isBlocked || false,
      };
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch privacy settings',
    });
  }
});

// Update hospital access (block/unblock)
router.post('/privacy-settings/hospital-access', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    const { hospitalId, isBlocked } = req.body;
    
    if (!userIcNumber) {
      res.status(400).json({
        success: false,
        error: 'User IC number not found',
      });
      return;
    }
    
    if (!hospitalId || typeof isBlocked !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Hospital ID and isBlocked status are required',
      });
      return;
    }
    
    await setHospitalAccess(userIcNumber, hospitalId, isBlocked);
    
    // Log the action
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user?.userId || '',
      actorType: 'patient',
      targetIcNumber: userIcNumber,
      targetHospitalId: hospitalId,
      details: `Patient ${isBlocked ? 'blocked' : 'unblocked'} access for hospital ${hospitalId}`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });
    
    res.json({
      success: true,
      message: `Hospital access ${isBlocked ? 'blocked' : 'granted'} successfully`,
    });
  } catch (error) {
    console.error('Update hospital access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hospital access',
    });
  }
});

export default router;
