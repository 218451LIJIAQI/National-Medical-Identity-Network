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
import {
  getHospitalDb,
  findPatientInHospitals,
  getActiveMedicationsInHospitals,
} from '../database/hospital-multi';
import { authenticate, authorize } from '../middleware/auth';
import { getHospitalById, normalizeIcNumber } from '../config';
import {
  AuditLog,
  CrossHospitalQueryResult,
  QueryFlowStep,
  HospitalQueryResult,
  User,
} from '../types';

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
      const defaultHospital =
        log.actorType === 'emergency'
          ? 'Emergency Responder Portal'
          : mode === 'admin'
            ? 'Central Hub'
            : 'National Network';
      const hospitalName = hospital?.name || log.actorHospitalId || defaultHospital;
      let actorName =
        log.actorType === 'emergency'
          ? 'Emergency Responder'
          : mode === 'admin'
            ? 'System'
            : log.actorId || 'System';

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

router.get(
  '/stats',
  authenticate,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  async (_req: Request, res: Response) => {
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
  }
);

export const emergencyRateLimits = new Map<string, number>();
export const emergencyIpBurstCounts = new Map<string, { count: number; windowStart: number }>();
export const EMERGENCY_RATE_LIMIT_MS = 60000;
const EMERGENCY_MAX_IP_BURST_PER_MIN = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of emergencyRateLimits.entries()) {
    if (now - timestamp > EMERGENCY_RATE_LIMIT_MS) {
      emergencyRateLimits.delete(key);
    }
  }
  for (const [ip, bucket] of emergencyIpBurstCounts.entries()) {
    if (now - bucket.windowStart > EMERGENCY_RATE_LIMIT_MS) {
      emergencyIpBurstCounts.delete(ip);
    }
  }
}, 300000).unref();

router.get('/emergency/:icNumber', async (req: Request, res: Response) => {
  const icNumber = normalizeIcNumber(req.params.icNumber || '');
  if (!icNumber) {
    res.status(400).json({
      success: false,
      error: 'Patient IC number is required',
    });
    return;
  }

  const now = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const pairKey = `${clientIp}:${icNumber}`;
  const lastPairAccess = emergencyRateLimits.get(pairKey);

  if (lastPairAccess && now - lastPairAccess < EMERGENCY_RATE_LIMIT_MS) {
    const remainingSeconds = Math.ceil((EMERGENCY_RATE_LIMIT_MS - (now - lastPairAccess)) / 1000);
    res.setHeader('Retry-After', String(remainingSeconds));
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Please wait ${remainingSeconds} seconds before next query.`,
      rateLimited: true,
      retryAfter: remainingSeconds,
    });
    return;
  }

  const ipBucket = emergencyIpBurstCounts.get(clientIp);
  if (ipBucket && now - ipBucket.windowStart < EMERGENCY_RATE_LIMIT_MS) {
    if (ipBucket.count >= EMERGENCY_MAX_IP_BURST_PER_MIN) {
      const remainingSeconds = Math.ceil((EMERGENCY_RATE_LIMIT_MS - (now - ipBucket.windowStart)) / 1000);
      res.setHeader('Retry-After', String(remainingSeconds));
      res.status(429).json({
        success: false,
        error: `Too many emergency queries from this terminal. Retry in ${remainingSeconds}s.`,
        rateLimited: true,
        retryAfter: remainingSeconds,
      });
      return;
    }
    ipBucket.count += 1;
  } else {
    emergencyIpBurstCounts.set(clientIp, { count: 1, windowStart: now });
  }

  try {
    const patientIndex = await getPatientIndex(icNumber);

    if (!patientIndex || patientIndex.hospitals.length === 0) {
      try {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'emergency_access',
          actorType: 'emergency',
          targetIcNumber: icNumber,
          details: `Emergency access lookup failed (patient not indexed) from IP: ${clientIp}`,
          ipAddress: clientIp,
          success: false,
        });
      } catch (logError) {
        console.warn('Failed to log unsuccessful emergency lookup:', logError);
      }

      res.status(404).json({
        success: false,
        error: 'Patient not found in any hospital',
        data: {
          found: false,
          icNumber,
          message: 'Patient not found in any hospital',
        },
      });
      return;
    }

    const [patient, activeMedications] = await Promise.all([
      findPatientInHospitals(icNumber, patientIndex.hospitals),
      getActiveMedicationsInHospitals(icNumber, patientIndex.hospitals),
    ]);

    if (!patient) {
      try {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'emergency_access',
          actorType: 'emergency',
          targetIcNumber: icNumber,
          details: `Emergency access lookup unavailable (hospital nodes unreachable) from IP: ${clientIp}`,
          ipAddress: clientIp,
          success: false,
        });
      } catch (logError) {
        console.warn('Failed to log unavailable emergency lookup:', logError);
      }

      res.status(404).json({
        success: false,
        error: 'Patient data not available from hospital nodes',
        data: {
          found: false,
          icNumber,
          message: 'Patient data not available',
        },
      });
      return;
    }

    emergencyRateLimits.set(pairKey, Date.now());

    const accessedAt = new Date().toISOString();
    try {
      await createAuditLog({
        timestamp: accessedAt,
        action: 'emergency_access',
        actorType: 'emergency',
        targetIcNumber: icNumber,
        details: `Emergency break-glass access from IP: ${clientIp} (${patientIndex.hospitals.length} indexed hospitals)`,
        ipAddress: clientIp,
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
        activeMedications,
        hospitalsWithRecords: patientIndex.hospitals.length,
        lastUpdated: patient.updatedAt || patientIndex.lastUpdated || accessedAt,
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

router.get(
  '/query/:icNumber',
  authenticate,
  authorize('doctor', 'patient', 'central_admin'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const icNumber = normalizeIcNumber(req.params.icNumber || '');
    const currentUser = req.user!;
    const querySteps: QueryFlowStep[] = [];

    try {
      if (currentUser.role === 'patient' && normalizeIcNumber(currentUser.icNumber) !== icNumber) {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'query',
          actorId: currentUser.userId,
          actorType: currentUser.role,
          targetIcNumber: icNumber,
          details: `Blocked unauthorized cross-patient query attempt by ${currentUser.icNumber}`,
          ipAddress: req.ip || 'unknown',
          success: false,
        });
        res.status(403).json({
          success: false,
          accessDenied: true,
          error: 'Patients can only access their own medical records',
        });
        return;
      }

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
          found: false,
          querySteps,
          hospitals: [],
          totalRecords: 0,
          queryTime: Date.now() - startTime,
          message: 'Patient is not registered in the National Medical Identity Index',
        };
        res.json({ success: true, data: result });
        return;
      }

      if (currentUser.role === 'doctor' && currentUser.hospitalId) {
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (blockedHospitals.includes(currentUser.hospitalId)) {
          const hospitalName = getHospitalById(currentUser.hospitalId)?.name || currentUser.hospitalId;
          querySteps[0].data = { hospitalsFound: 0, accessDenied: true };

          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'query',
            actorId: currentUser.userId,
            actorType: currentUser.role,
            actorHospitalId: currentUser.hospitalId,
            targetIcNumber: icNumber,
            targetHospitalId: currentUser.hospitalId,
            details: `Access denied: patient blocked ${hospitalName}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });

          const result: CrossHospitalQueryResult = {
            icNumber,
            found: true,
            querySteps,
            hospitals: [],
            totalRecords: 0,
            queryTime: Date.now() - startTime,
            accessDenied: true,
            message: 'Patient has blocked access from your hospital',
          };
          res.status(403).json({
            success: false,
            accessDenied: true,
            error: 'Patient has blocked access from your hospital',
            data: result,
          });
          return;
        }
      }

      const stepEntries = patientIndex.hospitals.map((hospitalId, index) => {
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
        return { hospitalId, hospitalName, step };
      });

      const hospitalResults: HospitalQueryResult[] = await Promise.all(
        stepEntries.map(async ({ hospitalId, hospitalName, step }) => {
          const hospitalStartTime = Date.now();
          try {
            const records = await getHospitalDb(hospitalId).getRecordsByPatient(icNumber);
            const isEditableOwnHospital =
              currentUser.role === 'doctor' && currentUser.hospitalId === hospitalId;
            const markedRecords = records.map(r => ({
              ...r,
              hospitalId,
              hospitalName,
              isReadOnly: !isEditableOwnHospital,
              sourceHospital: hospitalName,
            }));

            step.status = 'completed';
            step.data = { recordCount: records.length };

            return {
              hospitalId,
              hospitalName,
              records: markedRecords,
              recordCount: records.length,
              status: 'success' as const,
              responseTime: Date.now() - hospitalStartTime,
            };
          } catch {
            step.status = 'error';
            return {
              hospitalId,
              hospitalName,
              records: [],
              recordCount: 0,
              status: 'error' as const,
              responseTime: Date.now() - hospitalStartTime,
              error: 'Failed to query hospital node',
            };
          }
        })
      );

      const totalRecords = hospitalResults.reduce((sum, h) => sum + h.recordCount, 0);
      const failedCount = hospitalResults.filter(h => h.status === 'error').length;

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'query',
        actorId: currentUser.userId,
        actorType: currentUser.role,
        actorHospitalId: currentUser.hospitalId,
        targetIcNumber: icNumber,
        details:
          failedCount > 0
            ? `Cross-hospital query: ${patientIndex.hospitals.length} hospitals (${failedCount} node error), ${totalRecords} records`
            : `Cross-hospital query: ${patientIndex.hospitals.length} hospitals, ${totalRecords} records`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      const result: CrossHospitalQueryResult = {
        icNumber,
        found: true,
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
  }
);

router.get(
  '/patient/:icNumber',
  authenticate,
  authorize('doctor', 'patient', 'central_admin'),
  async (req: Request, res: Response) => {
    try {
      const icNumber = normalizeIcNumber(req.params.icNumber || '');
      const currentUser = req.user!;

      if (currentUser.role === 'patient' && normalizeIcNumber(currentUser.icNumber) !== icNumber) {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'view',
          actorId: currentUser.userId,
          actorType: currentUser.role,
          targetIcNumber: icNumber,
          details: `Blocked unauthorized cross-patient profile lookup by ${currentUser.icNumber}`,
          ipAddress: req.ip || 'unknown',
          success: false,
        });
        res.status(403).json({
          success: false,
          accessDenied: true,
          error: 'Patients can only access their own profile',
        });
        return;
      }

      const patientIndex = await getPatientIndex(icNumber);

      if (!patientIndex) {
        res.status(404).json({
          success: false,
          error: 'Patient not found in any hospital',
        });
        return;
      }

      if (currentUser.role === 'doctor' && currentUser.hospitalId) {
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (blockedHospitals.includes(currentUser.hospitalId)) {
          const hospitalName = getHospitalById(currentUser.hospitalId)?.name || currentUser.hospitalId;
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'view',
            actorId: currentUser.userId,
            actorType: currentUser.role,
            actorHospitalId: currentUser.hospitalId,
            targetIcNumber: icNumber,
            targetHospitalId: currentUser.hospitalId,
            details: `Access denied to patient profile: patient blocked ${hospitalName}`,
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
  }
);

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
    const icNumber = normalizeIcNumber(req.params.icNumber || '');
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
          let recordCount = 0;
          let isActive = true;
          try {
            recordCount = await getHospitalDb(hospitalId).countRecordsByPatient(icNumber);
          } catch {
            isActive = false;
          }

          return {
            hospitalId,
            hospitalName: hospital?.name || hospitalId,
            shortName: hospital?.shortName || hospitalId,
            city: hospital?.city || 'Unknown',
            recordCount,
            isActive,
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

router.get(
  '/audit-logs',
  authenticate,
  authorize('central_admin', 'hospital_admin'),
  async (req: Request, res: Response) => {
    try {
      const { actorId, targetIcNumber, action, startDate, endDate, limit } = req.query;
      const currentUser = req.user!;

      const hospitalScopeId =
        currentUser.role === 'hospital_admin' ? currentUser.hospitalId : undefined;

      if (currentUser.role === 'hospital_admin' && !hospitalScopeId) {
        res.status(403).json({
          success: false,
          error: 'Hospital administrator has no assigned hospital',
        });
        return;
      }

      const logs = await getAuditLogs({
        actorId: actorId as string | undefined,
        targetIcNumber: targetIcNumber ? normalizeIcNumber(String(targetIcNumber)) : undefined,
        hospitalScopeId,
        action: action as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
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
  }
);

router.get('/my-access-logs', authenticate, authorize('patient'), async (req: Request, res: Response) => {
  try {
    const userIcNumber = normalizeIcNumber(req.user!.icNumber);
    const requestedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const safeLimit = Math.min(Math.max(requestedLimit || 20, 1), 100);
    const userId = req.user!.userId;

    const allLogs = await getAuditLogs({
      targetIcNumber: userIcNumber,
      limit: safeLimit * 3,
    });

    const filteredLogs = allLogs.filter(log => log.actorId !== userId && log.actorType !== 'patient');
    const deduplicated = deduplicateLogs(
      filteredLogs,
      (prev, curr) =>
        prev.actorId === curr.actorId &&
        prev.action === curr.action &&
        prev.actorHospitalId === curr.actorHospitalId &&
        prev.success === curr.success
    ).slice(0, safeLimit);

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

router.get(
  '/my-activity-logs',
  authenticate,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const requestedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const safeLimit = Math.min(Math.max(requestedLimit || 10, 1), 50);

      const logs = await getAuditLogs({
        actorId: userId,
        limit: safeLimit * 5,
      });

      const filteredLogs = logs.filter(
        log => log.action !== 'login' && log.action !== 'logout' && log.targetIcNumber
      );

      const patientLogs = deduplicateLogs(
        filteredLogs,
        (prev, curr) =>
          prev.targetIcNumber === curr.targetIcNumber &&
          prev.action === curr.action &&
          prev.success === curr.success
      ).slice(0, safeLimit);

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
  }
);

router.get('/privacy-settings', authenticate, authorize('patient'), async (req: Request, res: Response) => {
  try {
    const userIcNumber = normalizeIcNumber(req.user!.icNumber);

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

router.post(
  '/privacy-settings/hospital-access',
  authenticate,
  authorize('patient'),
  async (req: Request, res: Response) => {
    try {
      const userIcNumber = normalizeIcNumber(req.user!.icNumber);
      const { hospitalId, isBlocked } = req.body;

      if (!hospitalId || typeof isBlocked !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Hospital ID and isBlocked status are required',
        });
        return;
      }

      const hospital = getHospitalById(hospitalId);
      if (!hospital) {
        res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
        return;
      }

      await setHospitalAccess(userIcNumber, hospitalId, isBlocked);

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'update',
        actorId: req.user!.userId,
        actorType: 'patient',
        targetIcNumber: userIcNumber,
        targetHospitalId: hospitalId,
        details: `Patient ${isBlocked ? 'blocked' : 'granted'} access for ${hospital.name}`,
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
  }
);

export default router;
