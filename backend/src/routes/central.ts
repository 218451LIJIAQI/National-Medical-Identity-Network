import { Router, Request, Response } from 'express';
import {
  createAuditLog,
  getAuditLogs,
  getAllPatientIndexes,
  getBlockedHospitals,
  getCentralStats,
  getHospitals,
  getPatientIndex,
  getPrivacySettings,
  getUsersByIds,
  setHospitalAccess,
  updatePatientIndex,
} from '../database/central-db';
import { findPatientAcrossHospitals, getHospitalDb } from '../database/hospital-db';
import { authenticate, authorize } from '../middleware/auth';
import { CONFIG, findHospitalConfig } from '../config';
import {
  AuditLog,
  CrossHospitalQueryResult,
  EnrichedAuditLog,
  HospitalQueryResult,
  JwtPayload,
  QueryFlowStep,
} from '../types';

const router = Router();

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const emergencyRateLimits = new Map<string, number>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamp] of emergencyRateLimits.entries()) {
    if (now - timestamp > CONFIG.emergencyRateLimitMs) {
      emergencyRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

export function resetEmergencyRateLimitsForTesting(): void {
  emergencyRateLimits.clear();
}

function parsePositiveInt(raw: unknown, fallback: number, max = 200): number {
  if (typeof raw !== 'string') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

/**
 * Collapses consecutive log entries sharing the same composite key within `windowMs`.
 * Assumes `logs` are ordered descending by timestamp.
 */
function deduplicateLogs<T extends { timestamp: string }>(
  logs: T[],
  keyFn: (log: T) => string,
  windowMs = DEDUP_WINDOW_MS
): T[] {
  const result: T[] = [];
  for (const log of logs) {
    const previous = result[result.length - 1];
    if (previous && keyFn(previous) === keyFn(log)) {
      const diff = Math.abs(
        new Date(previous.timestamp).getTime() - new Date(log.timestamp).getTime()
      );
      if (diff < windowMs) continue;
    }
    result.push(log);
  }
  return result;
}

/**
 * Resolves human-readable actor and hospital names for audit log lists using batch
 * user queries and per-request doctor caching to avoid N+1 database round-trips.
 */
async function enrichAuditLogs(
  logs: AuditLog[],
  options: { maskPatientIc: boolean; defaultHospitalLabel: string }
): Promise<EnrichedAuditLog[]> {
  if (logs.length === 0) return [];

  const usersById = await getUsersByIds(
    logs.map((log) => log.actorId).filter((id): id is string => Boolean(id))
  );
  const doctorNameCache = new Map<string, string>();

  async function resolveDoctorName(hospitalId: string, icNumber: string): Promise<string> {
    const cacheKey = `${hospitalId}:${icNumber}`;
    const cached = doctorNameCache.get(cacheKey);
    if (cached) return cached;

    try {
      const doctor = await getHospitalDb(hospitalId).getDoctorByIc(icNumber);
      const name = doctor?.fullName || `Dr. ${icNumber}`;
      doctorNameCache.set(cacheKey, name);
      return name;
    } catch {
      const fallback = `Dr. ${icNumber}`;
      doctorNameCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  return Promise.all(
    logs.map(async (log) => {
      const hospital = findHospitalConfig(log.actorHospitalId);
      const hospitalName = hospital?.name || log.actorHospitalId || options.defaultHospitalLabel;

      let actorName = log.actorType === 'emergency' ? 'Emergency Responder' : 'System';

      if (log.actorId) {
        const user = usersById.get(log.actorId);
        if (user?.icNumber) {
          if (log.actorType === 'doctor' && log.actorHospitalId) {
            actorName = await resolveDoctorName(log.actorHospitalId, user.icNumber);
          } else if (log.actorType === 'patient') {
            actorName = options.maskPatientIc
              ? `Patient ${user.icNumber.slice(0, 6)}****`
              : `Patient ${user.icNumber}`;
          } else if (log.actorType === 'hospital_admin') {
            actorName = hospital ? `Admin (${hospital.name})` : 'Hospital Administrator';
          } else if (log.actorType === 'central_admin') {
            actorName = 'Central Administrator';
          }
        } else if (log.actorType === 'doctor') {
          actorName = 'Healthcare Provider';
        } else if (log.actorType === 'hospital_admin') {
          actorName = 'Hospital Administrator';
        } else if (log.actorType === 'central_admin') {
          actorName = 'Central Administrator';
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

/**
 * Enforces patient-level access rules:
 * 1. Patients can only query their own IC number.
 * 2. Hospital-scoped staff cannot query patients who have blocked their hospital.
 */
async function evaluatePatientQueryAccess(
  user: JwtPayload,
  targetIcNumber: string,
  ipAddress: string
): Promise<{ status: 'allowed' } | { status: 'forbidden'; error: string } | { status: 'blocked' }> {
  if (user.role === 'patient' && user.icNumber !== targetIcNumber) {
    return {
      status: 'forbidden',
      error: 'Patients can only access their own medical records',
    };
  }

  if (user.hospitalId && user.role !== 'central_admin') {
    const blockedHospitals = await getBlockedHospitals(targetIcNumber);
    if (blockedHospitals.includes(user.hospitalId)) {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'query',
        actorId: user.userId,
        actorType: user.role,
        actorHospitalId: user.hospitalId,
        targetIcNumber,
        details: `Access blocked by patient privacy settings for ${user.hospitalId}`,
        ipAddress,
        success: false,
      });
      return { status: 'blocked' };
    }
  }

  return { status: 'allowed' };
}

router.get('/hospitals', async (_req: Request, res: Response) => {
  try {
    const hospitals = await getHospitals();
    res.json({ success: true, data: hospitals });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hospitals' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getCentralStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

router.get('/emergency/:icNumber', async (req: Request, res: Response) => {
  const icNumber = req.params.icNumber.trim();
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

  const lastAccess = emergencyRateLimits.get(clientIp);
  if (lastAccess && Date.now() - lastAccess < CONFIG.emergencyRateLimitMs) {
    const remainingSeconds = Math.ceil(
      (CONFIG.emergencyRateLimitMs - (Date.now() - lastAccess)) / 1000
    );
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

    const patient = await findPatientAcrossHospitals(icNumber, patientIndex.hospitals);
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

    // Aggregate active medications across indexed hospitals for emergency responders
    const activeMedications: Array<{ medicationName: string; dosage: string; frequency: string }> = [];
    const seenMeds = new Set<string>();
    await Promise.all(
      patientIndex.hospitals.map(async (hospitalId) => {
        try {
          const records = await getHospitalDb(hospitalId).getRecordsByPatient(icNumber);
          for (const record of records) {
            for (const rx of record.prescriptions || []) {
              const key = `${rx.medicationName}:${rx.dosage}`;
              if (rx.isActive && !seenMeds.has(key)) {
                seenMeds.add(key);
                activeMedications.push({
                  medicationName: rx.medicationName,
                  dosage: rx.dosage,
                  frequency: rx.frequency,
                });
              }
            }
          }
        } catch {
          // Non-fatal if an individual hospital node is unavailable during emergency lookup
        }
      })
    );

    try {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'emergency_access',
        actorType: 'emergency',
        targetIcNumber: icNumber,
        details: `Emergency access from IP: ${clientIp}`,
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
        currentMedications: activeMedications,
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
  const icNumber = req.params.icNumber.trim();
  const clientIp = req.ip || 'unknown';

  try {
    const access = await evaluatePatientQueryAccess(req.user!, icNumber, clientIp);
    if (access.status === 'forbidden') {
      res.status(403).json({ success: false, error: access.error });
      return;
    }

    const indexStep: QueryFlowStep = {
      step: 1,
      action: 'Looking up patient in central index',
      from: 'Central Hub',
      to: 'Patient Index',
      status: 'completed',
      timestamp: new Date().toISOString(),
    };

    if (access.status === 'blocked') {
      indexStep.data = { hospitalsFound: 0, accessDenied: true };
      const blockedResult: CrossHospitalQueryResult = {
        icNumber,
        querySteps: [indexStep],
        hospitals: [],
        totalRecords: 0,
        queryTime: Date.now() - startTime,
        accessDenied: true,
        message: 'Patient has blocked access from your hospital',
      };
      res.json({ success: true, data: blockedResult });
      return;
    }

    const patientIndex = await getPatientIndex(icNumber);
    indexStep.data = { hospitalsFound: patientIndex ? patientIndex.hospitals.length : 0 };

    if (!patientIndex || patientIndex.hospitals.length === 0) {
      const emptyResult: CrossHospitalQueryResult = {
        icNumber,
        querySteps: [indexStep],
        hospitals: [],
        totalRecords: 0,
        queryTime: Date.now() - startTime,
      };
      res.json({ success: true, data: emptyResult });
      return;
    }

    const nodeOutcomes = await Promise.all(
      patientIndex.hospitals.map(async (hospitalId, index) => {
        const hospitalName = findHospitalConfig(hospitalId)?.name || hospitalId;
        const stepTimestamp = new Date().toISOString();
        const hospitalStartTime = Date.now();

        try {
          const records = await getHospitalDb(hospitalId).getRecordsByPatient(icNumber);
          const isOwnHospital = req.user?.hospitalId === hospitalId;
          const markedRecords = records.map((record) => ({
            ...record,
            hospitalId,
            hospitalName,
            isReadOnly: !isOwnHospital,
            sourceHospital: hospitalName,
          }));

          const step: QueryFlowStep = {
            step: index + 2,
            action: `Querying ${hospitalName}`,
            from: 'Central Hub',
            to: hospitalName,
            status: 'completed',
            timestamp: stepTimestamp,
            data: { recordCount: records.length },
          };

          const result: HospitalQueryResult = {
            hospitalId,
            hospitalName,
            records: markedRecords,
            recordCount: records.length,
            status: 'success',
            responseTime: Date.now() - hospitalStartTime,
          };

          return { step, result };
        } catch {
          const step: QueryFlowStep = {
            step: index + 2,
            action: `Querying ${hospitalName}`,
            from: 'Central Hub',
            to: hospitalName,
            status: 'error',
            timestamp: stepTimestamp,
          };

          const result: HospitalQueryResult = {
            hospitalId,
            hospitalName,
            records: [],
            recordCount: 0,
            status: 'error',
            responseTime: Date.now() - hospitalStartTime,
            error: 'Failed to query hospital',
          };

          return { step, result };
        }
      })
    );

    const querySteps: QueryFlowStep[] = [indexStep, ...nodeOutcomes.map((item) => item.step)];
    const hospitals: HospitalQueryResult[] = nodeOutcomes.map((item) => item.result);
    const totalRecords = hospitals.reduce((sum, h) => sum + h.recordCount, 0);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'query',
      actorId: req.user!.userId,
      actorType: req.user!.role,
      actorHospitalId: req.user!.hospitalId,
      targetIcNumber: icNumber,
      details: `Cross-hospital query: ${patientIndex.hospitals.length} hospitals, ${totalRecords} records`,
      ipAddress: clientIp,
      success: true,
    });

    const result: CrossHospitalQueryResult = {
      icNumber,
      querySteps,
      hospitals,
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
    const icNumber = req.params.icNumber.trim();
    const access = await evaluatePatientQueryAccess(req.user!, icNumber, req.ip || 'unknown');

    if (access.status === 'forbidden') {
      res.status(403).json({ success: false, error: access.error });
      return;
    }

    if (access.status === 'blocked') {
      res.status(403).json({
        success: false,
        error: 'Patient has blocked access from your hospital',
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

    const patientInfo = await findPatientAcrossHospitals(icNumber, patientIndex.hospitals);

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
    res.json({ success: true, data: indexes });
  } catch (error) {
    console.error('Get indexes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient indexes' });
  }
});

router.get('/index/:icNumber', authenticate, authorize('central_admin'), async (req: Request, res: Response) => {
  try {
    const icNumber = req.params.icNumber.trim();
    const patientIndex = await getPatientIndex(icNumber);

    if (!patientIndex) {
      res.status(404).json({
        success: false,
        error: 'Patient not found in any hospital',
      });
      return;
    }

    const [hospitalDetails, fullPatient] = await Promise.all([
      Promise.all(
        patientIndex.hospitals.map(async (hospitalId) => {
          const hospital = findHospitalConfig(hospitalId);
          const recordCount = (await getHospitalDb(hospitalId).getRecordsByPatient(icNumber)).length;
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
      findPatientAcrossHospitals(icNumber, patientIndex.hospitals),
    ]);

    const patientSummary = fullPatient
      ? {
          fullName: fullPatient.fullName,
          icNumber: fullPatient.icNumber,
          dateOfBirth: fullPatient.dateOfBirth,
          gender: fullPatient.gender,
          bloodType: fullPatient.bloodType,
          allergies: fullPatient.allergies,
          chronicConditions: fullPatient.chronicConditions,
        }
      : null;

    res.json({
      success: true,
      data: {
        icNumber,
        patient: patientSummary,
        hospitals: hospitalDetails,
        totalHospitals: hospitalDetails.length,
        totalRecords: hospitalDetails.reduce((sum, h) => sum + h.recordCount, 0),
        lastUpdated: patientIndex.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Search patient index error:', error);
    res.status(500).json({ success: false, error: 'Failed to search patient index' });
  }
});

router.get(
  '/audit-logs',
  authenticate,
  authorize('central_admin', 'hospital_admin'),
  async (req: Request, res: Response) => {
    try {
      const { actorId, targetIcNumber, startDate, endDate, limit } = req.query;
      const scopedHospitalId =
        req.user!.role === 'hospital_admin' ? req.user!.hospitalId : undefined;

      const logs = await getAuditLogs({
        actorId: typeof actorId === 'string' && actorId ? actorId : undefined,
        targetIcNumber:
          typeof targetIcNumber === 'string' && targetIcNumber ? targetIcNumber : undefined,
        hospitalId: scopedHospitalId,
        startDate: typeof startDate === 'string' && startDate ? startDate : undefined,
        endDate: typeof endDate === 'string' && endDate ? endDate : undefined,
        limit: parsePositiveInt(limit, 100, 500),
      });

      const enriched = await enrichAuditLogs(logs, {
        maskPatientIc: true,
        defaultHospitalLabel: 'Central Hub',
      });

      res.json({ success: true, data: enriched });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
  }
);

router.get('/my-access-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    const userId = req.user?.userId;

    if (!userIcNumber) {
      res.status(400).json({ success: false, error: 'User IC number not found' });
      return;
    }

    const requestedLimit = parsePositiveInt(req.query.limit, 20, 100);
    const rawLogs = await getAuditLogs({
      targetIcNumber: userIcNumber,
      limit: requestedLimit * 2,
    });

    const externalLogs = rawLogs.filter((log) => log.actorId !== userId);
    const deduplicated = deduplicateLogs(
      externalLogs,
      (log) => `${log.actorId || ''}:${log.action}:${log.actorHospitalId || ''}`
    ).slice(0, requestedLimit);

    const enriched = await enrichAuditLogs(deduplicated, {
      maskPatientIc: false,
      defaultHospitalLabel: 'External / Emergency',
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get my access logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch access logs' });
  }
});

router.get('/my-activity-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID not found' });
      return;
    }

    const requestedLimit = parsePositiveInt(req.query.limit, 10, 100);
    const rawLogs = await getAuditLogs({
      actorId: userId,
      limit: requestedLimit * 5,
    });

    const clinicalLogs = rawLogs.filter(
      (log) => log.action !== 'login' && log.action !== 'logout' && Boolean(log.targetIcNumber)
    );
    const deduplicated = deduplicateLogs(
      clinicalLogs,
      (log) => `${log.targetIcNumber || ''}:${log.action}`
    ).slice(0, requestedLimit);

    const patientNameCache = new Map<string, string>();
    const enriched = await Promise.all(
      deduplicated.map(async (log) => {
        const ic = log.targetIcNumber!;
        let patientName = patientNameCache.get(ic);

        if (!patientName) {
          patientName = 'Unknown Patient';
          try {
            const index = await getPatientIndex(ic);
            if (index && index.hospitals.length > 0) {
              const patient = await findPatientAcrossHospitals(ic, index.hospitals);
              if (patient) patientName = patient.fullName;
            }
          } catch {
            // Keep default label if lookup fails
          }
          patientNameCache.set(ic, patientName);
        }

        return { ...log, patientName };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get my activity logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
  }
});

router.get('/privacy-settings', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    if (!userIcNumber) {
      res.status(400).json({ success: false, error: 'User IC number not found' });
      return;
    }

    const [settings, hospitals] = await Promise.all([
      getPrivacySettings(userIcNumber),
      getHospitals(),
    ]);
    const blockedByHospital = new Map(settings.map((s) => [s.hospitalId, s.isBlocked]));

    const result = hospitals.map((hospital) => ({
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      city: hospital.city,
      isBlocked: blockedByHospital.get(hospital.id) || false,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch privacy settings' });
  }
});

router.post('/privacy-settings/hospital-access', authenticate, async (req: Request, res: Response) => {
  try {
    const userIcNumber = req.user?.icNumber;
    const { hospitalId, isBlocked } = req.body ?? {};

    if (!userIcNumber) {
      res.status(400).json({ success: false, error: 'User IC number not found' });
      return;
    }

    if (typeof hospitalId !== 'string' || !findHospitalConfig(hospitalId) || typeof isBlocked !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Valid hospitalId and boolean isBlocked status are required',
      });
      return;
    }

    await setHospitalAccess(userIcNumber, hospitalId, isBlocked);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'update',
      actorId: req.user!.userId,
      actorType: req.user!.role,
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
    res.status(500).json({ success: false, error: 'Failed to update hospital access' });
  }
});

// Re-export updatePatientIndex for convenience if needed by federated modules
export { updatePatientIndex };
export default router;
