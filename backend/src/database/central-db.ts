import { AuditLog, CentralStats, Hospital, PatientIndex, User } from '../types';
import { HOSPITALS } from '../config';
import { getCentralDb } from './db-manager';

function mapUser(row: {
  id: string;
  icNumber: string;
  role: string;
  hospitalId: string | null;
  passwordHash: string;
  lastLogin: Date | null;
  isActive: boolean;
}): User {
  return {
    id: row.id,
    icNumber: row.icNumber,
    role: row.role as User['role'],
    hospitalId: row.hospitalId || undefined,
    passwordHash: row.passwordHash,
    lastLogin: row.lastLogin?.toISOString(),
    isActive: row.isActive,
  };
}

export async function getPatientIndex(icNumber: string): Promise<PatientIndex | null> {
  const index = await getCentralDb().patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: true },
  });

  if (!index) return null;

  return {
    icNumber: index.icNumber,
    hospitals: index.hospitals.map((entry: { hospitalId: string }) => entry.hospitalId),
    lastUpdated: index.lastUpdated.toISOString(),
  };
}

export async function updatePatientIndex(icNumber: string, hospitalId: string): Promise<void> {
  const prisma = getCentralDb();
  const existing = await prisma.patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: true },
  });

  if (!existing) {
    await prisma.patientIndex.create({
      data: {
        icNumber,
        hospitals: { create: { hospitalId } },
      },
    });
    return;
  }

  const alreadyIndexed = existing.hospitals.some(
    (entry: { hospitalId: string }) => entry.hospitalId === hospitalId
  );
  if (!alreadyIndexed) {
    await prisma.patientIndexHospital.create({
      data: { icNumber, hospitalId },
    });
  }

  await prisma.patientIndex.update({
    where: { icNumber },
    data: { lastUpdated: new Date() },
  });
}

export async function getAllPatientIndexes(): Promise<PatientIndex[]> {
  const indexes = await getCentralDb().patientIndex.findMany({
    include: { hospitals: true },
    orderBy: { lastUpdated: 'desc' },
  });

  return indexes.map((idx: { icNumber: string; hospitals: { hospitalId: string }[]; lastUpdated: Date }) => ({
    icNumber: idx.icNumber,
    hospitals: idx.hospitals.map((entry) => entry.hospitalId),
    lastUpdated: idx.lastUpdated.toISOString(),
  }));
}

export async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await getCentralDb().hospital.findMany({
    where: { isActive: true },
  });

  return hospitals.map((hospital: Hospital) => ({
    id: hospital.id,
    name: hospital.name,
    shortName: hospital.shortName,
    city: hospital.city,
    state: hospital.state,
    address: hospital.address,
    phone: hospital.phone,
    email: hospital.email,
    apiEndpoint: hospital.apiEndpoint,
    isActive: hospital.isActive,
  }));
}

export async function initializeHospitals(): Promise<void> {
  const prisma = getCentralDb();
  for (const hospital of HOSPITALS) {
    const payload = {
      name: hospital.name,
      shortName: hospital.shortName,
      city: hospital.city,
      state: hospital.state,
      address: hospital.address,
      phone: hospital.phone,
      email: hospital.email,
      apiEndpoint: hospital.apiEndpoint,
      isActive: true,
    };

    await prisma.hospital.upsert({
      where: { id: hospital.id },
      update: payload,
      create: { id: hospital.id, ...payload },
    });
  }
}

export async function getUserByIc(icNumber: string, role?: string): Promise<User | null> {
  const where: { icNumber: string; isActive: boolean; role?: string } = {
    icNumber,
    isActive: true,
  };
  if (role) {
    where.role = role;
  }

  const user = await getCentralDb().user.findFirst({ where });
  return user ? mapUser(user) : null;
}

export async function getUsersByIc(icNumber: string): Promise<User[]> {
  const users = await getCentralDb().user.findMany({
    where: { icNumber, isActive: true },
  });
  return users.map(mapUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await getCentralDb().user.findUnique({ where: { id } });
  if (!user || !user.isActive) return null;
  return mapUser(user);
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const users = await getCentralDb().user.findMany({
    where: { id: { in: uniqueIds } },
  });

  return new Map(users.map((row: Parameters<typeof mapUser>[0]) => [row.id, mapUser(row)]));
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
  });
  return settings.map((setting: { hospitalId: string }) => setting.hospitalId);
}

export async function setHospitalAccess(
  icNumber: string,
  hospitalId: string,
  isBlocked: boolean
): Promise<void> {
  await getCentralDb().patientPrivacySetting.upsert({
    where: { icNumber_hospitalId: { icNumber, hospitalId } },
    update: { isBlocked },
    create: { icNumber, hospitalId, isBlocked },
  });
}

export async function getPrivacySettings(
  icNumber: string
): Promise<Array<{ hospitalId: string; isBlocked: boolean }>> {
  const settings = await getCentralDb().patientPrivacySetting.findMany({
    where: { icNumber },
  });
  return settings.map((setting: { hospitalId: string; isBlocked: boolean }) => ({
    hospitalId: setting.hospitalId,
    isBlocked: setting.isBlocked,
  }));
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  await getCentralDb().auditLog.create({
    data: {
      timestamp: new Date(log.timestamp),
      action: log.action,
      actorId: log.actorId || null,
      actorType: log.actorType,
      actorHospitalId: log.actorHospitalId || null,
      targetIcNumber: log.targetIcNumber || null,
      targetHospitalId: log.targetHospitalId || null,
      details: log.details,
      ipAddress: log.ipAddress,
      success: log.success,
    },
  });
}

export interface AuditLogFilters {
  actorId?: string;
  targetIcNumber?: string;
  hospitalId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};

  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.targetIcNumber) where.targetIcNumber = filters.targetIcNumber;

  if (filters?.hospitalId) {
    where.OR = [
      { actorHospitalId: filters.hospitalId },
      { targetHospitalId: filters.hospitalId },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    const timestampFilter: { gte?: Date; lte?: Date } = {};
    if (filters.startDate) timestampFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!filters.endDate.includes('T')) {
        end.setHours(23, 59, 59, 999);
      }
      timestampFilter.lte = end;
    }
    where.timestamp = timestampFilter;
  }

  const logs = await getCentralDb().auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: Math.min(Math.max(filters?.limit || 100, 1), 500),
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

export async function getCentralStats(): Promise<CentralStats> {
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
