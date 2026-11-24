import {
  PatientIndex,
  AuditLog,
  Hospital,
  User,
  SensitiveCategorySettings,
  normalizeIcNumber,
} from '../types';
import { getCentralDb } from './multi-db-manager';
import { HOSPITALS } from '../config';

const sensitiveConsentByPatient = new Map<string, SensitiveCategorySettings>();

const DEFAULT_SENSITIVE_SETTINGS: Omit<SensitiveCategorySettings, 'updatedAt'> = {
  mentalHealth: true,
  reproductiveHealth: true,
  substanceAbuse: true,
  hivStatus: true,
};

export function resetCentralTransientStateForTesting(): void {
  sensitiveConsentByPatient.clear();
}

export async function getSensitiveCategorySettings(
  rawIcNumber: string
): Promise<SensitiveCategorySettings> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const existing = sensitiveConsentByPatient.get(icNumber);
  if (existing) return { ...existing };
  return {
    ...DEFAULT_SENSITIVE_SETTINGS,
    updatedAt: new Date(0).toISOString(),
  };
}

export async function updateSensitiveCategorySettings(
  rawIcNumber: string,
  patch: Partial<Omit<SensitiveCategorySettings, 'updatedAt'>>
): Promise<SensitiveCategorySettings> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const current = await getSensitiveCategorySettings(icNumber);
  const next: SensitiveCategorySettings = {
    mentalHealth:
      typeof patch.mentalHealth === 'boolean' ? patch.mentalHealth : current.mentalHealth,
    reproductiveHealth:
      typeof patch.reproductiveHealth === 'boolean'
        ? patch.reproductiveHealth
        : current.reproductiveHealth,
    substanceAbuse:
      typeof patch.substanceAbuse === 'boolean' ? patch.substanceAbuse : current.substanceAbuse,
    hivStatus: typeof patch.hivStatus === 'boolean' ? patch.hivStatus : current.hivStatus,
    updatedAt: new Date().toISOString(),
  };
  sensitiveConsentByPatient.set(icNumber, next);
  return { ...next };
}

function mapUser(user: {
  id: string;
  icNumber: string;
  role: string;
  hospitalId: string | null;
  passwordHash: string;
  lastLogin: Date | null;
  isActive: boolean;
}): User {
  return {
    id: user.id,
    icNumber: user.icNumber,
    role: user.role as User['role'],
    hospitalId: user.hospitalId || undefined,
    passwordHash: user.passwordHash,
    lastLogin: user.lastLogin?.toISOString(),
    isActive: user.isActive,
  };
}

export function parseSafeLimit(raw: unknown, fallback = 100, max = 500): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

function parseAuditDateBound(raw: string, bound: 'start' | 'end'): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = bound === 'start' ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
      return null;
    }
    return parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getPatientIndex(rawIcNumber: string): Promise<PatientIndex | null> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const index = await getCentralDb().patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: { select: { hospitalId: true } } },
  });

  if (!index) return null;

  return {
    icNumber: index.icNumber,
    hospitals: index.hospitals.map((h: { hospitalId: string }) => h.hospitalId),
    lastUpdated: index.lastUpdated.toISOString(),
  };
}

export async function updatePatientIndex(rawIcNumber: string, hospitalId: string): Promise<void> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const prisma = getCentralDb();
  const existing = await prisma.patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: { select: { hospitalId: true } } },
  });

  if (existing) {
    const hasHospital = existing.hospitals.some((h: { hospitalId: string }) => h.hospitalId === hospitalId);
    if (!hasHospital) {
      await prisma.patientIndexHospital.create({
        data: { icNumber, hospitalId },
      });
    }
    await prisma.patientIndex.update({
      where: { icNumber },
      data: { lastUpdated: new Date() },
    });
  } else {
    await prisma.patientIndex.create({
      data: {
        icNumber,
        lastUpdated: new Date(),
        hospitals: { create: { hospitalId } },
      },
    });
  }
}

export async function getAllPatientIndexes(): Promise<PatientIndex[]> {
  const indexes = await getCentralDb().patientIndex.findMany({
    include: { hospitals: { select: { hospitalId: true } } },
    orderBy: { lastUpdated: 'desc' },
  });

  return indexes.map((idx: { icNumber: string; hospitals: { hospitalId: string }[]; lastUpdated: Date }) => ({
    icNumber: idx.icNumber,
    hospitals: idx.hospitals.map((h: { hospitalId: string }) => h.hospitalId),
    lastUpdated: idx.lastUpdated.toISOString(),
  }));
}

export async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await getCentralDb().hospital.findMany({
    where: { isActive: true },
  });

  return hospitals.map((h: Hospital) => ({
    id: h.id,
    name: h.name,
    shortName: h.shortName,
    city: h.city,
    state: h.state,
    address: h.address,
    phone: h.phone,
    email: h.email,
    apiEndpoint: h.apiEndpoint,
    isActive: h.isActive,
  }));
}

export async function initializeHospitals(): Promise<void> {
  const prisma = getCentralDb();
  for (const hospital of HOSPITALS) {
    const data = {
      name: hospital.name,
      shortName: hospital.shortName,
      city: hospital.city,
      state: hospital.state,
      address: hospital.address,
      phone: hospital.phone,
      email: hospital.email,
      apiEndpoint: `http://localhost:${hospital.port}`,
      isActive: true,
    };

    await prisma.hospital.upsert({
      where: { id: hospital.id },
      update: data,
      create: { id: hospital.id, ...data },
    });
  }
}

export async function getUsersByIc(rawIcNumber: string): Promise<User[]> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const users = await getCentralDb().user.findMany({
    where: {
      icNumber,
      isActive: true,
    },
  });
  return users.map(mapUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await getCentralDb().user.findUnique({
    where: { id },
  });

  return user && user.isActive ? mapUser(user) : null;
}

export async function updateUserLastLogin(id: string): Promise<void> {
  await getCentralDb().user.update({
    where: { id },
    data: { lastLogin: new Date() },
  });
}

export async function getBlockedHospitals(rawIcNumber: string): Promise<string[]> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const settings = await getCentralDb().patientPrivacySetting.findMany({
    where: { icNumber, isBlocked: true },
    select: { hospitalId: true },
  });
  return settings.map((s: { hospitalId: string }) => s.hospitalId);
}

export async function getBlockedPatientIcsForHospital(hospitalId: string): Promise<Set<string>> {
  const settings = await getCentralDb().patientPrivacySetting.findMany({
    where: { hospitalId, isBlocked: true },
    select: { icNumber: true, hospitalId: true },
  });
  const blocked = new Set<string>();
  for (const s of settings as Array<{ icNumber: string; hospitalId?: string }>) {
    if ((!s.hospitalId || s.hospitalId === hospitalId) && s.icNumber) {
      blocked.add(normalizeIcNumber(s.icNumber));
    }
  }
  return blocked;
}

export async function setHospitalAccess(rawIcNumber: string, hospitalId: string, isBlocked: boolean): Promise<void> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  await getCentralDb().patientPrivacySetting.upsert({
    where: {
      icNumber_hospitalId: { icNumber, hospitalId },
    },
    update: { isBlocked },
    create: { icNumber, hospitalId, isBlocked },
  });
}

export async function getPrivacySettings(rawIcNumber: string): Promise<Array<{ hospitalId: string; isBlocked: boolean }>> {
  const icNumber = normalizeIcNumber(rawIcNumber);
  const settings = await getCentralDb().patientPrivacySetting.findMany({
    where: { icNumber },
    select: { hospitalId: true, isBlocked: true },
  });
  return settings.map((s: { hospitalId: string; isBlocked: boolean }) => ({
    hospitalId: s.hospitalId,
    isBlocked: s.isBlocked,
  }));
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  await getCentralDb().auditLog.create({
    data: {
      timestamp: new Date(log.timestamp),
      action: log.action,
      actorId: log.actorId,
      actorType: log.actorType,
      actorHospitalId: log.actorHospitalId,
      targetIcNumber: log.targetIcNumber ? normalizeIcNumber(log.targetIcNumber) : undefined,
      targetHospitalId: log.targetHospitalId,
      details: log.details,
      ipAddress: log.ipAddress,
      success: log.success,
    },
  });
}

export async function getAuditLogs(filters?: {
  actorId?: string;
  targetIcNumber?: string;
  hospitalScopeId?: string;
  action?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};

  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.targetIcNumber) where.targetIcNumber = normalizeIcNumber(filters.targetIcNumber);
  if (filters?.action) where.action = filters.action;
  if (filters?.success !== undefined) where.success = filters.success;

  if (filters?.hospitalScopeId) {
    where.OR = [
      { actorHospitalId: filters.hospitalScopeId },
      { targetHospitalId: filters.hospitalScopeId },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    const timestampFilter: Record<string, Date> = {};
    if (filters.startDate) {
      const start = parseAuditDateBound(filters.startDate, 'start');
      if (!start) throw new Error('Invalid startDate format');
      timestampFilter.gte = start;
    }
    if (filters.endDate) {
      const end = parseAuditDateBound(filters.endDate, 'end');
      if (!end) throw new Error('Invalid endDate format');
      timestampFilter.lte = end;
    }
    if (timestampFilter.gte && timestampFilter.lte && timestampFilter.gte > timestampFilter.lte) {
      throw new Error('Invalid date range: startDate cannot be after endDate');
    }
    where.timestamp = timestampFilter;
  }

  const safeLimit = parseSafeLimit(filters?.limit, 100, 500);

  const logs = await getCentralDb().auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: safeLimit,
  });

  return logs.map((log: {
    id: string;
    timestamp: Date;
    action: string;
    actorId: string | null;
    actorType: string;
    actorHospitalId: string | null;
    targetIcNumber: string | null;
    targetHospitalId: string | null;
    details: string | null;
    ipAddress: string | null;
    success: boolean;
  }) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action as AuditLog['action'],
    actorId: log.actorId || undefined,
    actorType: log.actorType as AuditLog['actorType'],
    actorHospitalId: log.actorHospitalId || undefined,
    targetIcNumber: log.targetIcNumber || undefined,
    targetHospitalId: log.targetHospitalId || undefined,
    details: log.details || '',
    ipAddress: log.ipAddress || '',
    success: log.success,
  }));
}

export async function getCentralStats() {
  const prisma = getCentralDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [totalPatients, activeHospitals, todayQueries, yesterdayQueries] = await Promise.all([
    prisma.patientIndex.count(),
    prisma.hospital.count({ where: { isActive: true } }),
    prisma.auditLog.count({
      where: { timestamp: { gte: today }, action: 'query' },
    }),
    prisma.auditLog.count({
      where: { timestamp: { gte: yesterday, lt: today }, action: 'query' },
    }),
  ]);

  let queryChangePercent = 0;
  if (yesterdayQueries > 0) {
    queryChangePercent = Math.round(((todayQueries - yesterdayQueries) / yesterdayQueries) * 100);
  } else if (todayQueries > 0) {
    queryChangePercent = 100;
  }

  return {
    totalPatients,
    activeHospitals,
    todayQueries,
    yesterdayQueries,
    queryChangePercent,
    newHospitalsThisMonth: 0,
    avgResponseTime: 0.4,
  };
}
