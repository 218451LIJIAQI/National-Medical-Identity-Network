import { PatientIndex, AuditLog, Hospital, User, UserRole } from '../types';
import { getCentralDb } from './multi-db-manager';
import { HOSPITALS } from '../config';

const ROLE_PRIORITY: Record<string, number> = {
  doctor: 1,
  hospital_admin: 2,
  central_admin: 3,
  patient: 4,
};

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
    role: user.role as UserRole,
    hospitalId: user.hospitalId || undefined,
    passwordHash: user.passwordHash,
    lastLogin: user.lastLogin?.toISOString(),
    isActive: user.isActive,
  };
}

function parseDateBoundary(dateStr: string, boundary: 'start' | 'end'): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(
      boundary === 'start' ? `${dateStr}T00:00:00.000Z` : `${dateStr}T23:59:59.999Z`
    );
  }
  return new Date(dateStr);
}

export async function getPatientIndex(icNumber: string): Promise<PatientIndex | null> {
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

export async function updatePatientIndex(icNumber: string, hospitalId: string): Promise<void> {
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

  return hospitals.map((h: {
    id: string;
    name: string;
    shortName: string;
    city: string;
    state: string;
    address: string;
    phone: string;
    email: string;
    apiEndpoint: string;
    isActive: boolean;
  }) => ({
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

export async function getUsersByIc(icNumber: string): Promise<User[]> {
  const users = await getCentralDb().user.findMany({
    where: {
      icNumber,
      isActive: true,
    },
  });

  return users
    .map(mapUser)
    .sort((a, b) => (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99));
}

export async function getUserByIc(icNumber: string, role?: string): Promise<User | null> {
  const users = await getUsersByIc(icNumber);
  if (role) {
    return users.find(u => u.role === role) || null;
  }
  return users[0] || null;
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

export async function getBlockedHospitals(icNumber: string): Promise<string[]> {
  const settings = await getCentralDb().patientPrivacySetting.findMany({
    where: { icNumber, isBlocked: true },
    select: { hospitalId: true },
  });
  return settings.map((s: { hospitalId: string }) => s.hospitalId);
}

export async function setHospitalAccess(icNumber: string, hospitalId: string, isBlocked: boolean): Promise<void> {
  await getCentralDb().patientPrivacySetting.upsert({
    where: {
      icNumber_hospitalId: { icNumber, hospitalId },
    },
    update: { isBlocked },
    create: { icNumber, hospitalId, isBlocked },
  });
}

export async function getPrivacySettings(icNumber: string): Promise<Array<{ hospitalId: string; isBlocked: boolean }>> {
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
      targetIcNumber: log.targetIcNumber,
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
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const where: {
    actorId?: string;
    targetIcNumber?: string;
    action?: string;
    timestamp?: { gte?: Date; lte?: Date };
    OR?: Array<{ actorHospitalId?: string; targetHospitalId?: string }>;
  } = {};

  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.targetIcNumber) where.targetIcNumber = filters.targetIcNumber;
  if (filters?.action) where.action = filters.action;
  if (filters?.hospitalScopeId) {
    where.OR = [
      { actorHospitalId: filters.hospitalScopeId },
      { targetHospitalId: filters.hospitalScopeId },
    ];
  }
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {
      ...(filters.startDate ? { gte: parseDateBoundary(filters.startDate, 'start') } : {}),
      ...(filters.endDate ? { lte: parseDateBoundary(filters.endDate, 'end') } : {}),
    };
  }

  const safeLimit = Math.min(Math.max(filters?.limit || 100, 1), 500);

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
    avgResponseTime: 0.24,
  };
}
