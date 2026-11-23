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
  getPrivacySettings,
} from '../database/central-multi';
import { getHospitalDb, findPatientInHospitals } from '../database/hospital-multi';
import { authenticate, authorize } from '../middleware/auth';
import { getHospitalById } from '../config';
import { AuditLog, CrossHospitalQueryResult, QueryFlowStep, HospitalQueryResult, User } from '../types';

const router = Router();
const LOG_DEDUP_WINDOW_MS = 5 * 60 * 1000;

function deduplicateLogs<T extends { timestamp: string }>(
  logs: T[],
  isSameGroup: (prev: T, curr: T) => boolean,
  windowMs = LOG_DEDUP_WINDOW_MS
): T[] {
  const result: T[] = [];
  for (const log of logs) {
    const prev = result[result.length - 1];
    if (prev && isSameGroup(prev, log)) {
      const timeDiff = Math.abs(new Date(prev.timestamp).getTime() - new Date(log.timestamp).getTime());
      if (timeDiff < windowMs) continue;
    }
    result.push(log);
  }
  return result;
}

async function enrichAuditLogsWithActors(logs: AuditLog[], mode: 'admin' | 'patient') {
  const userCache = new Map<string, Promise<User | null>>();
  const doctorNameCache = new Map<string, Promise<string | null>>();

  const fetchUser = (actorId: string) => {
    let pending = userCache.get(actorId);
    if (!pending) {
      pending = getUserById(actorId);
      userCache.set(actorId, pending);
    }
    return pending;
  };

  const fetchDoctorName = (hospitalId: string, icNumber: string) => {
    const key = `${hospitalId}:${icNumber}`;
    let pending = doctorNameCache.get(key);
    if (!pending) {
      pending = getHospitalDb(hospitalId)
        .getDoctorByIc(icNumber)
        .then(doc => doc?.fullName || null)
        .catch(() => null);
      doctorNameCache.set(key, pending);
    }
    return pending;
  };

  return Promise.all(
    logs.map(async log => {
      const hospital = getHospitalById(log.actorHospitalId);
      const defaultHospital = mode === 'admin' ? 'Central Hub' : 'Unknown Hospital';
      const hospitalName = hospital?.name || log.actorHospitalId || defaultHospital;
      let actorName = mode === 'admin' ? 'System' : log.actorId || 'System';

      if (log.actorId) {
        try {
          const user = await fetchUser(log.actorId);
          if (user?.icNumber) {
            if (log.actorType === 'doctor' && log.actorHospitalId) {
              const docName = await fetchDoctorName(log.actorHospitalId, user.icNumber);
              actorName = docName || `Dr. ${user.icNumber}`;
            } else if (log.actorType === 'patient') {
              actorName =
                mode === 'admin'
                  ? `Patient ${user.icNumber.slice(0, 6)}****`
                  : `Patient ${user.icNumber}`;
            } else if (log.actorType === 'hospital_admin') {
              actorName = mode === 'admin' ? `Admin (${hospitalName})` : 'Hospital Admin';
            } else if (log.actorType === 'central_admin') {
              actorName = mode === 'admin' ? 'Central Administrator' : 'Central Admin';
            }
          }
        } catch {
          if (mode === 'admin') {
            actorName = log.actorType === 'system' ? 'System' : 'Unknown';
          } else if (log.actorType === 'doctor') {
            actorName = 'Unknown Doctor';
          } else if (log.actorType === 'patient') {
            actorName = 'Unknown Patient';
          } else {
            actorName = log.actorType || 'Unknown';
          }
        }
      }

      return {
        ...log,
        actorName,
        hospitalName,
      };
    })
  );
}

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

const emergencyRateLimits = new Map<string, number>();
const EMERGENCY_RATE_LIMIT_MS = 60000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamp] of emergencyRateLimits.entries()) {
    if (now - timestamp > EMERGENCY_RATE_LIMIT_MS) {
      emergencyRateLimits.delete(ip);
    }
  }
}, 300000).unref();

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

    const patient = await findPatientInHospitals(icNumber, patientIndex.hospitals);
    if (!patient) {
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
        fullName: patient.fullName,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        emergencyContact: patient.emergencyContact,
        emergencyPhone: patient.emergencyPhone,
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
    querySteps[0].data = { hospitalsFound: patientIndex ? patientIndex.hospitals.length : 0 };

    if (!patientIndex) {
      const result: CrossHospitalQueryResult = {
        icNumber,
        querySteps,
        hospitals: [],
        totalRecords: 0,
        queryTime: Date.now() - startTime,
      };
      res.json({ success: true, data: result });
      return;
    }

    const requestingHospitalId = req.user?.hospitalId;
    if (requestingHospitalId) {
      const blockedHospitals = await getBlockedHospitals(icNumber);
      if (blockedHospitals.includes(requestingHospitalId)) {
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
        res.json({ success: true, data: result });
        return;
      }
    }

    const hospitalResults: HospitalQueryResult[] = [];
    await Promise.all(
      patientIndex.hospitals.map(async (hospitalId, index) => {
        const hospitalName = getHospitalById(hospitalId)?.name || hospitalId;
        const step: QueryFlowStep = {
          step: index + 2,
          action: `Querying ${hospitalName}`,
          from: 'Central Hub',
          to: hospitalName,
          status: 'in_progress',
          timestamp: new Date().toISOString(),
        };
        querySteps.push(step);

        const hospitalStartTime = Date.now();

        try {
          const records = await getHospitalDb(hospitalId).getRecordsByPatient(icNumber);
          const isOwnHospital = req.user?.hospitalId === hospitalId;
          const markedRecords = records.map(r => ({
            ...r,
            hospitalId,
            hospitalName,
            isReadOnly: !isOwnHospital,
            sourceHospital: hospitalName,
          }));

          step.status = 'completed';
          step.data = { recordCount: records.length };

          hospitalResults.push({
            hospitalId,
            hospitalName,
            records: markedRecords,
            recordCount: records.length,
            status: 'success',
            responseTime: Date.now() - hospitalStartTime,
          });
        } catch {
          step.status = 'error';
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
      })
    );

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

    res.json({ success: true, data: result });
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

    const patientInfo = await findPatientInHospitals(icNumber, patientIndex.hospitals);

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

    const [hospitalDetails, patient] = await Promise.all([
      Promise.all(
        patientIndex.hospitals.map(async hospitalId => {
          const hospital = getHospitalById(hospitalId);
          const recordCount = await getHospitalDb(hospitalId).countRecordsByPatient(icNumber);

          return {
            hospitalId,
            hospitalName: hospital?.name || hospitalId,
            shortName: hospital?.shortName || hospitalId,
            city: hospital?.city || 'Unknown',
            recordCount,
            isActive: true,
          };
        })
      ),
      findPatientInHospitals(icNumber, patientIndex.hospitals),
    ]);

    const patientInfo = patient
      ? {
          fullName: patient.fullName,
          icNumber: patient.icNumber,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
        }
      : null;

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
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    const enrichedLogs = await enrichAuditLogsWithActors(logs, 'admin');

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

    const requestedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const userId = req.user?.userId;

    const allLogs = await getAuditLogs({
      targetIcNumber: userIcNumber,
      limit: requestedLimit * 2,
    });

    const filteredLogs = allLogs.filter(log => log.actorId !== userId);
    const deduplicated = deduplicateLogs(
      filteredLogs,
      (prev, curr) =>
        prev.actorId === curr.actorId &&
        prev.action === curr.action &&
        prev.actorHospitalId === curr.actorHospitalId
    ).slice(0, requestedLimit);

    const enrichedLogs = await enrichAuditLogsWithActors(deduplicated, 'patient');

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

    const requestedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const logs = await getAuditLogs({
      actorId: userId,
      limit: requestedLimit * 5,
    });

    const filteredLogs = logs.filter(
      log => log.action !== 'login' && log.action !== 'logout' && log.targetIcNumber
    );

    const patientLogs = deduplicateLogs(
      filteredLogs,
      (prev, curr) => prev.targetIcNumber === curr.targetIcNumber && prev.action === curr.action
    ).slice(0, requestedLimit);

    const patientNameCache = new Map<string, Promise<string>>();
    const resolvePatientName = (icNumber: string) => {
      let pending = patientNameCache.get(icNumber);
      if (!pending) {
        pending = (async () => {
          try {
            const patientIndex = await getPatientIndex(icNumber);
            if (patientIndex && patientIndex.hospitals.length > 0) {
              const patient = await findPatientInHospitals(icNumber, patientIndex.hospitals);
              if (patient) return patient.fullName;
            }
          } catch {}
          return 'Unknown Patient';
        })();
        patientNameCache.set(icNumber, pending);
      }
      return pending;
    };

    const enrichedLogs = await Promise.all(
      patientLogs.map(async log => ({
        ...log,
        patientName: log.targetIcNumber ? await resolvePatientName(log.targetIcNumber) : 'Unknown Patient',
      }))
    );

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

    const [settings, hospitals] = await Promise.all([
      getPrivacySettings(userIcNumber),
      getHospitals(),
    ]);

    const blockedMap = new Map(settings.map(s => [s.hospitalId, s.isBlocked]));
    const result = hospitals.map(h => ({
      hospitalId: h.id,
      hospitalName: h.name,
      city: h.city,
      isBlocked: blockedMap.get(h.id) || false,
    }));

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
