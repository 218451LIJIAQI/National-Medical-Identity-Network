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
import { authenticate, authorize, requireHospitalVerification } from '../middleware/auth';
import { getHospitalById } from '../config';
import {
  AuditLog,
  CrossHospitalQueryResult,
  QueryFlowStep,
  HospitalQueryResult,
  MedicalRecord,
  User,
  normalizeIcNumber,
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
      const hospitalRefId = log.actorHospitalId || log.targetHospitalId;
      const hospital = getHospitalById(hospitalRefId);
      const defaultHospital =
        log.actorType === 'emergency'
          ? 'Emergency Terminal'
          : mode === 'admin'
            ? 'Central Hub'
            : 'External Network';
      const hospitalName = hospital?.name || hospitalRefId || defaultHospital;
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
  requireHospitalVerification,
  authorize('central_admin', 'hospital_admin', 'doctor'),
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

const emergencySuccessCooldowns = new Map<string, number>();
const emergencyIpAttempts = new Map<string, number[]>();
const EMERGENCY_COOLDOWN_MS = 60_000;
const EMERGENCY_ENUM_WINDOW_MS = 60_000;
const EMERGENCY_MAX_IP_ATTEMPTS_PER_WINDOW = 15;

export function clearEmergencyRateLimitsForTesting(): void {
  emergencySuccessCooldowns.clear();
  emergencyIpAttempts.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of emergencySuccessCooldowns.entries()) {
    if (now - timestamp > EMERGENCY_COOLDOWN_MS) {
      emergencySuccessCooldowns.delete(key);
    }
  }
  for (const [ip, timestamps] of emergencyIpAttempts.entries()) {
    const recent = timestamps.filter(ts => now - ts < EMERGENCY_ENUM_WINDOW_MS);
    if (recent.length === 0) {
      emergencyIpAttempts.delete(ip);
    } else {
      emergencyIpAttempts.set(ip, recent);
    }
  }
}, 300_000).unref();

router.get('/emergency/:icNumber', async (req: Request, res: Response) => {
  const icNumber = normalizeIcNumber(req.params.icNumber);
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!icNumber) {
    res.status(400).json({
      success: false,
      error: 'Patient IC number is required',
    });
    return;
  }

  const recentAttempts = (emergencyIpAttempts.get(clientIp) || []).filter(
    ts => now - ts < EMERGENCY_ENUM_WINDOW_MS
  );
  if (recentAttempts.length >= EMERGENCY_MAX_IP_ATTEMPTS_PER_WINDOW) {
    const oldest = recentAttempts[0];
    const retryAfter = Math.max(1, Math.ceil((EMERGENCY_ENUM_WINDOW_MS - (now - oldest)) / 1000));
    res.status(429).json({
      success: false,
      error: `Too many emergency lookup attempts from this terminal. Please wait ${retryAfter} seconds.`,
      rateLimited: true,
      retryAfter,
    });
    return;
  }

  const pairKey = `${clientIp}:${icNumber}`;
  const lastSuccessForPatient = emergencySuccessCooldowns.get(pairKey);
  if (lastSuccessForPatient && now - lastSuccessForPatient < EMERGENCY_COOLDOWN_MS) {
    const remainingSeconds = Math.max(
      1,
      Math.ceil((EMERGENCY_COOLDOWN_MS - (now - lastSuccessForPatient)) / 1000)
    );
    res.status(429).json({
      success: false,
      error: `Emergency summary for ${icNumber} was just retrieved. Please wait ${remainingSeconds} seconds before repeating the same IC query.`,
      rateLimited: true,
      retryAfter: remainingSeconds,
    });
    return;
  }

  recentAttempts.push(now);
  emergencyIpAttempts.set(clientIp, recentAttempts);

  try {
    const patientIndex = await getPatientIndex(icNumber);

    if (!patientIndex || patientIndex.hospitals.length === 0) {
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

    const [patient, recordsPerHospital] = await Promise.all([
      findPatientInHospitals(icNumber, patientIndex.hospitals),
      Promise.allSettled(
        patientIndex.hospitals.map(async hospitalId => ({
          hospitalId,
          hospitalName: getHospitalById(hospitalId)?.name || hospitalId,
          records: await getHospitalDb(hospitalId).getRecordsByPatient(icNumber),
        }))
      ),
    ]);

    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'Patient data not available',
        data: {
          found: false,
          icNumber,
          message: 'Patient data not available',
        },
      });
      return;
    }

    const allHospitalRecords: Array<{ hospitalName: string; rec: MedicalRecord }> = [];
    let respondingHospitals = 0;
    let failedHospitals = 0;

    for (const outcome of recordsPerHospital) {
      if (outcome.status !== 'fulfilled') {
        failedHospitals++;
        continue;
      }
      respondingHospitals++;
      const { hospitalName, records } = outcome.value;
      for (const rec of records) {
        allHospitalRecords.push({ hospitalName, rec });
      }
    }

    allHospitalRecords.sort(
      (a, b) => new Date(b.rec.visitDate).getTime() - new Date(a.rec.visitDate).getTime()
    );

    const activeMedicationMap = new Map<
      string,
      {
        name: string;
        dosage: string;
        frequency: string;
        instructions: string;
        hospitalName: string;
        visitDate: string;
      }
    >();
    const diagnosisSet = new Set<string>();
    const recentDiagnoses: Array<{ diagnosis: string; hospitalName: string; visitDate: string }> = [];

    for (const { hospitalName, rec } of allHospitalRecords) {
      for (const diag of rec.diagnosis || []) {
        const cleanDiag = diag.trim();
        if (cleanDiag && !diagnosisSet.has(cleanDiag.toLowerCase())) {
          diagnosisSet.add(cleanDiag.toLowerCase());
          recentDiagnoses.push({
            diagnosis: cleanDiag,
            hospitalName,
            visitDate: rec.visitDate,
          });
        }
      }
      for (const rx of rec.prescriptions || []) {
        if (!rx.isActive || !rx.medicationName) continue;
        const dedupKey = `${rx.medicationName.toLowerCase()}|${rx.dosage.toLowerCase()}`;
        if (!activeMedicationMap.has(dedupKey)) {
          activeMedicationMap.set(dedupKey, {
            name: rx.medicationName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            instructions: rx.instructions || '',
            hospitalName,
            visitDate: rec.visitDate,
          });
        }
      }
    }

    const mergedConditions = Array.from(
      new Set([
        ...(patient.chronicConditions || []),
        ...recentDiagnoses.map(d => d.diagnosis),
      ])
    );

    emergencySuccessCooldowns.set(pairKey, Date.now());

    try {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'emergency_access',
        actorId: undefined,
        actorType: 'emergency',
        targetIcNumber: icNumber,
        details: `Emergency break-glass access from IP: ${clientIp} (${respondingHospitals}/${patientIndex.hospitals.length} hospitals responded)`,
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
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        chronicConditions: mergedConditions,
        recentDiagnoses: recentDiagnoses.slice(0, 10),
        currentMedications: Array.from(activeMedicationMap.values()),
        emergencyContact: patient.emergencyContact,
        emergencyPhone: patient.emergencyPhone,
        hospitalsWithRecords: patientIndex.hospitals.length,
        respondingHospitals,
        partialFailure: failedHospitals > 0,
        accessType: 'emergency',
        warning: 'This is emergency break-glass access. Full audit trail has been recorded.',
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
  requireHospitalVerification,
  authorize('doctor', 'patient'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    const icNumber = normalizeIcNumber(req.params.icNumber);
    const querySteps: QueryFlowStep[] = [];
    const user = req.user!;

    try {
      if (user.role === 'patient' && normalizeIcNumber(user.icNumber) !== icNumber) {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'query',
          actorId: user.userId,
          actorType: 'patient',
          targetIcNumber: icNumber,
          details: `Blocked IDOR attempt: patient ${user.icNumber} attempted to query ${icNumber}`,
          ipAddress: req.ip || 'unknown',
          success: false,
        });
        res.status(403).json({
          success: false,
          error: 'Forbidden: Patients may only query their own medical records',
        });
        return;
      }

      if (user.role === 'doctor' && user.hospitalId) {
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (blockedHospitals.includes(user.hospitalId)) {
          querySteps.push({
            step: 1,
            action: 'Checking patient hospital consent policy',
            from: 'Central Hub',
            to: 'Privacy Guard',
            status: 'error',
            timestamp: new Date().toISOString(),
            data: { hospitalsFound: 0, accessDenied: true },
          });

          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'query',
            actorId: user.userId,
            actorType: 'doctor',
            actorHospitalId: user.hospitalId,
            targetIcNumber: icNumber,
            targetHospitalId: user.hospitalId,
            details: `Access denied: patient ${icNumber} blocked ${user.hospitalId}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });

          const deniedResult: CrossHospitalQueryResult = {
            icNumber,
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
            data: deniedResult,
          });
          return;
        }
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

      if (!patientIndex || patientIndex.hospitals.length === 0) {
        const emptyResult: CrossHospitalQueryResult = {
          icNumber,
          querySteps,
          hospitals: [],
          totalRecords: 0,
          queryTime: Date.now() - startTime,
          notFound: true,
          message: 'Patient not found in any hospital',
        };
        res.status(404).json({
          success: false,
          notFound: true,
          error: 'Patient not found in any hospital',
          data: emptyResult,
        });
        return;
      }

      const hospitalResults: HospitalQueryResult[] = await Promise.all(
        patientIndex.hospitals.map(async (hospitalId, index): Promise<HospitalQueryResult> => {
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
            const isOwnHospital = user.role === 'doctor' && user.hospitalId === hospitalId;
            const markedRecords = records.map(r => ({
              ...r,
              hospitalId,
              hospitalName,
              isReadOnly: !isOwnHospital,
              sourceHospital: hospitalName,
            }));

            step.status = 'completed';
            step.data = { recordCount: records.length };

            return {
              hospitalId,
              hospitalName,
              records: markedRecords,
              recordCount: records.length,
              status: 'success',
              responseTime: Date.now() - hospitalStartTime,
            };
          } catch {
            step.status = 'error';
            return {
              hospitalId,
              hospitalName,
              records: [],
              recordCount: 0,
              status: 'error',
              responseTime: Date.now() - hospitalStartTime,
              error: `Hospital node ${hospitalName} is currently unreachable`,
            };
          }
        })
      );

      const totalRecords = hospitalResults.reduce((sum, h) => sum + h.recordCount, 0);
      const failedHospitals = hospitalResults
        .filter(h => h.status !== 'success')
        .map(h => h.hospitalName);

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'query',
        actorId: user.userId,
        actorType: user.role,
        actorHospitalId: user.hospitalId,
        targetIcNumber: icNumber,
        details:
          failedHospitals.length > 0
            ? `Cross-hospital query: ${patientIndex.hospitals.length} hospitals (${failedHospitals.length} offline), ${totalRecords} records`
            : `Cross-hospital query: ${patientIndex.hospitals.length} hospitals, ${totalRecords} records`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      const result: CrossHospitalQueryResult = {
        icNumber,
        querySteps,
        hospitals: hospitalResults,
        totalRecords,
        queryTime: Date.now() - startTime,
        partialFailure: failedHospitals.length > 0,
        failedHospitals: failedHospitals.length > 0 ? failedHospitals : undefined,
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
  requireHospitalVerification,
  authorize('doctor', 'patient'),
  async (req: Request, res: Response) => {
    try {
      const icNumber = normalizeIcNumber(req.params.icNumber);
      const user = req.user!;

      if (user.role === 'patient' && normalizeIcNumber(user.icNumber) !== icNumber) {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'view',
          actorId: user.userId,
          actorType: 'patient',
          targetIcNumber: icNumber,
          details: `Blocked IDOR attempt: patient ${user.icNumber} attempted to view profile ${icNumber}`,
          ipAddress: req.ip || 'unknown',
          success: false,
        });
        res.status(403).json({
          success: false,
          error: 'Forbidden: Patients may only view their own profile',
        });
        return;
      }

      if (user.role === 'doctor' && user.hospitalId) {
        const blockedHospitals = await getBlockedHospitals(icNumber);
        if (blockedHospitals.includes(user.hospitalId)) {
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'view',
            actorId: user.userId,
            actorType: 'doctor',
            actorHospitalId: user.hospitalId,
            targetIcNumber: icNumber,
            targetHospitalId: user.hospitalId,
            details: `Access denied: patient ${icNumber} blocked profile access from ${user.hospitalId}`,
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

      const patientIndex = await getPatientIndex(icNumber);

      if (!patientIndex || patientIndex.hospitals.length === 0) {
        res.status(404).json({
          success: false,
          notFound: true,
          error: 'Patient not found in any hospital',
        });
        return;
      }

      const patientInfo = await findPatientInHospitals(icNumber, patientIndex.hospitals);
      if (!patientInfo) {
        res.status(503).json({
          success: false,
          error: 'Indexed hospital nodes are currently unreachable',
        });
        return;
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
    const icNumber = normalizeIcNumber(req.params.icNumber);
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
          try {
            const recordCount = await getHospitalDb(hospitalId).countRecordsByPatient(icNumber);
            return {
              hospitalId,
              hospitalName: hospital?.name || hospitalId,
              shortName: hospital?.shortName || hospitalId,
              city: hospital?.city || 'Unknown',
              recordCount,
              isActive: true,
            };
          } catch {
            return {
              hospitalId,
              hospitalName: hospital?.name || hospitalId,
              shortName: hospital?.shortName || hospitalId,
              city: hospital?.city || 'Unknown',
              recordCount: 0,
              isActive: false,
            };
          }
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
  requireHospitalVerification,
  authorize('central_admin', 'hospital_admin'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      if (user.role === 'hospital_admin' && !user.hospitalId) {
        res.status(403).json({
          success: false,
          error: 'Hospital administrator account is missing hospital assignment',
        });
        return;
      }

      const { actorId, targetIcNumber, startDate, endDate, limit, hospitalId } = req.query;
      const hospitalScopeId =
        user.role === 'hospital_admin'
          ? user.hospitalId
          : (hospitalId as string | undefined) || undefined;

      let logs: AuditLog[];
      try {
        logs = await getAuditLogs({
          actorId: actorId as string | undefined,
          targetIcNumber: targetIcNumber as string | undefined,
          hospitalScopeId,
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : 100,
        });
      } catch (filterError) {
        if (filterError instanceof Error && filterError.message.includes('Invalid')) {
          res.status(400).json({
            success: false,
            error: filterError.message,
          });
          return;
        }
        throw filterError;
      }

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
      limit: requestedLimit * 3,
    });

    const filteredLogs = allLogs.filter(
      log => log.actorId !== userId && !(log.actorType === 'patient' && log.targetIcNumber === userIcNumber)
    );
    const deduplicated = deduplicateLogs(
      filteredLogs,
      (prev, curr) =>
        prev.actorId === curr.actorId &&
        prev.action === curr.action &&
        prev.actorHospitalId === curr.actorHospitalId &&
        prev.success === curr.success
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

router.get(
  '/my-activity-logs',
  authenticate,
  requireHospitalVerification,
  authorize('doctor', 'hospital_admin', 'central_admin'),
  async (req: Request, res: Response) => {
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
        log =>
          log.action !== 'login' &&
          log.action !== 'logout' &&
          log.action !== 'verify' &&
          log.targetIcNumber
      );

      const patientLogs = deduplicateLogs(
        filteredLogs,
        (prev, curr) =>
          prev.targetIcNumber === curr.targetIcNumber &&
          prev.action === curr.action &&
          prev.success === curr.success
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
            } catch {
              // Ignore offline hospital lookup failure
            }
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

router.post(
  '/privacy-settings/hospital-access',
  authenticate,
  authorize('patient'),
  async (req: Request, res: Response) => {
    try {
      const userIcNumber = req.user?.icNumber;
      const { hospitalId, isBlocked } = req.body || {};

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

      if (!getHospitalById(String(hospitalId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid hospital ID',
        });
        return;
      }

      await setHospitalAccess(userIcNumber, String(hospitalId), isBlocked);

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'update',
        actorId: req.user?.userId || '',
        actorType: 'patient',
        targetIcNumber: userIcNumber,
        targetHospitalId: String(hospitalId),
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
  }
);

export default router;
