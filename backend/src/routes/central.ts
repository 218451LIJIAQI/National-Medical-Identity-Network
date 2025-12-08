import { Router, Request, Response } from 'express';
import {
  getPatientIndex,
  getAllPatientIndexes,
  getHospitals,
  getCentralStats,
  getAuditLogs,
  createAuditLog,
  getUserById,
  getBlockedHospitals,
  setHospitalAccess,
  getPrivacySettings
} from '../database/central-multi';
import { getHospitalDb } from '../database/hospital-multi';
import { authenticate, authorize } from '../middleware/auth';
import { HOSPITALS } from '../config';
import { CrossHospitalQueryResult, QueryFlowStep, HospitalQueryResult } from '../types';
const router = Router();

router.get('/hospitals', async (_req: Request, res: Response) => {
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

router.get('/stats', async (_req: Request, res: Response) => {
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

const emergencyRateLimits: Map<string, number> = new Map();
const EMERGENCY_RATE_LIMIT_MS = 60000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamp] of emergencyRateLimits.entries()) {
    if (now - timestamp > EMERGENCY_RATE_LIMIT_MS) {
      emergencyRateLimits.delete(ip);
    }
  }
}, 300000);

router.get('/emergency/:icNumber', async (req: Request, res: Response) => {
  const { icNumber } = req.params;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  const lastAccess = emergencyRateLimits.get(clientIp);
  if (lastAccess && Date.now() - lastAccess < EMERGENCY_RATE_LIMIT_MS) {
    const remainingSeconds = Math.ceil((EMERGENCY_RATE_LIMIT_MS - (Date.now() - lastAccess)) / 1000);
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Please wait ${remainingSeconds} seconds before next query.`,
      rateLimited: true,
      retryAfter: remainingSeconds,
    });
    return;
  }

  emergencyRateLimits.set(clientIp, Date.now());

  try {
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

    try {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'emergency_access',
        actorId: undefined,
        actorType: 'system',
        targetIcNumber: icNumber,
        details: `Emergency access from IP: ${req.ip || 'unknown'}`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });
    } catch (logError) {
      console.warn('Failed to log emergency access:', logError);
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

router.get('/query/:icNumber', authenticate, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { icNumber } = req.params;
  const querySteps: QueryFlowStep[] = [];

  try {
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

    const requestingHospitalId = req.user?.hospitalId;
    if (requestingHospitalId) {
      const blockedHospitals = await getBlockedHospitals(icNumber);
      if (blockedHospitals.includes(requestingHospitalId)) {
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

    const totalRecords = hospitalResults.reduce((sum, h) => sum + h.recordCount, 0);

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

router.get('/indexes', authenticate, authorize('central_admin'), async (_req: Request, res: Response) => {
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
          isActive: true,
        };
      })
    );

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

    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let actorName = 'System';
      let hospitalName = log.actorHospitalId || 'Central Hub';

      const hospital = HOSPITALS.find(h => h.id === log.actorHospitalId);
      if (hospital) {
        hospitalName = hospital.name;
      }

      if (log.actorId) {
        try {
          const user = await getUserById(log.actorId);
          if (user && user.icNumber) {
            if (log.actorType === 'doctor' && log.actorHospitalId) {
              try {
                const hospitalDb = getHospitalDb(log.actorHospitalId);
                const doctor = await hospitalDb.getDoctorByIc(user.icNumber);
                actorName = doctor?.fullName || `Dr. ${user.icNumber}`;
              } catch {
                actorName = `Dr. ${user.icNumber}`;
              }
            } else if (log.actorType === 'patient') {
              actorName = `Patient ${user.icNumber.slice(0, 6)}****`;
            } else if (log.actorType === 'hospital_admin') {
              actorName = hospitalName ? `Admin (${hospitalName})` : 'Hospital Admin';
            } else if (log.actorType === 'central_admin') {
              actorName = 'Central Administrator';
            }
          }
        } catch {
          actorName = log.actorType === 'system' ? 'System' : 'Unknown';
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
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
});

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
      limit: limit ? parseInt(limit as string) * 2 : 40,
    });

    const requestedLimit = limit ? parseInt(limit as string) : 20;
    const filteredLogs = allLogs.filter(log => log.actorId !== userId);

    const deduplicatedLogs: typeof filteredLogs = [];
    for (const log of filteredLogs) {
      const lastLog = deduplicatedLogs[deduplicatedLogs.length - 1];
      if (lastLog &&
          lastLog.actorId === log.actorId &&
          lastLog.action === log.action &&
          lastLog.actorHospitalId === log.actorHospitalId) {
        const timeDiff = Math.abs(new Date(lastLog.timestamp).getTime() - new Date(log.timestamp).getTime());
        if (timeDiff < 5 * 60 * 1000) {
          continue;
        }
      }
      deduplicatedLogs.push(log);
    }

    const logs = deduplicatedLogs.slice(0, requestedLimit);

    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let actorName = log.actorId;
      let hospitalName = log.actorHospitalId || 'Unknown Hospital';

      const hospital = HOSPITALS.find(h => h.id === log.actorHospitalId);
      if (hospital) {
        hospitalName = hospital.name;
      }

      try {
        const user = log.actorId ? await getUserById(log.actorId) : null;
        if (user && user.icNumber) {
          if (log.actorType === 'doctor' && log.actorHospitalId) {
            try {
              const hospitalDb = getHospitalDb(log.actorHospitalId);
              const doctor = await hospitalDb.getDoctorByIc(user.icNumber);
              if (doctor) {
                actorName = doctor.fullName;
              } else {
                actorName = `Dr. ${user.icNumber}`;
              }
            } catch {
              actorName = `Dr. ${user.icNumber}`;
            }
          } else if (log.actorType === 'patient') {
            actorName = `Patient ${user.icNumber}`;
          } else if (log.actorType === 'hospital_admin') {
            actorName = `Hospital Admin`;
          } else if (log.actorType === 'central_admin') {
            actorName = `Central Admin`;
          }
        }
      } catch (err) {
        console.error('Error looking up actor name:', err);
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

    const logs = await getAuditLogs({
      actorId: userId,
      limit: requestedLimit * 5,
    });

    const filteredLogs = logs.filter(log =>
      log.action !== 'login' && log.action !== 'logout' && log.targetIcNumber
    );

    const deduplicatedLogs: typeof filteredLogs = [];
    for (const log of filteredLogs) {
      const lastLog = deduplicatedLogs[deduplicatedLogs.length - 1];
      if (lastLog &&
          lastLog.targetIcNumber === log.targetIcNumber &&
          lastLog.action === log.action) {
        const timeDiff = Math.abs(new Date(lastLog.timestamp).getTime() - new Date(log.timestamp).getTime());
        if (timeDiff < 5 * 60 * 1000) {
          continue;
        }
      }
      deduplicatedLogs.push(log);
    }

    const patientLogs = deduplicatedLogs.slice(0, requestedLimit);

    const enrichedLogs = await Promise.all(patientLogs.map(async (log) => {
      let patientName = 'Unknown Patient';

      if (log.targetIcNumber) {
        try {
          const patientIndex = await getPatientIndex(log.targetIcNumber);
          if (patientIndex && patientIndex.hospitals.length > 0) {
            const hospitalDb = getHospitalDb(patientIndex.hospitals[0]);
            const patient = await hospitalDb.getPatient(log.targetIcNumber);
            if (patient) {
              patientName = patient.fullName;
            }
          }
        } catch {}
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
