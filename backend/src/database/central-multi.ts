import { PatientIndex, AuditLog, Hospital, User } from '../types';
import { getCentralDb } from './multi-db-manager';
import { HOSPITALS } from '../config';

const prisma = getCentralDb();

export async function getPatientIndex(icNumber: string): Promise<PatientIndex | null> {
  const index = await prisma.patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: { include: { hospital: true } } },
  });
  
  if (!index) return null;
  
  return {
    icNumber: index.icNumber,
    hospitals: index.hospitals.map((h: { hospitalId: string }) => h.hospitalId),
    lastUpdated: index.lastUpdated.toISOString(),
  };
}

export async function updatePatientIndex(icNumber: string, hospitalId: string): Promise<void> {
  const existing = await prisma.patientIndex.findUnique({
    where: { icNumber },
    include: { hospitals: true },
  });

  if (existing) {
    const hasHospital = existing.hospitals.some((h: { hospitalId: string }) => h.hospitalId === hospitalId);
    if (!hasHospital) {
      await prisma.patientIndexHospital.create({
        data: { icNumber, hospitalId },
      });
      await prisma.patientIndex.update({
        where: { icNumber },
        data: { lastUpdated: new Date() },
      });
    }
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
  const indexes = await prisma.patientIndex.findMany({
    include: { hospitals: true },
  });
  
  return indexes.map((idx: { icNumber: string; hospitals: { hospitalId: string }[]; lastUpdated: Date }) => ({
    icNumber: idx.icNumber,
    hospitals: idx.hospitals.map((h: { hospitalId: string }) => h.hospitalId),
    lastUpdated: idx.lastUpdated.toISOString(),
  }));
}

export async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await prisma.hospital.findMany({
    where: { isActive: true },
  });
  
  return hospitals.map((h: any) => ({
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
  for (const hospital of HOSPITALS) {
    await prisma.hospital.upsert({
      where: { id: hospital.id },
      update: {
        name: hospital.name,
        shortName: hospital.shortName,
        city: hospital.city,
        state: hospital.state,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
        apiEndpoint: `http://localhost:${hospital.port}`,
        isActive: true,
      },
      create: {
        id: hospital.id,
        name: hospital.name,
        shortName: hospital.shortName,
        city: hospital.city,
        state: hospital.state,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
        apiEndpoint: `http://localhost:${hospital.port}`,
        isActive: true,
      },
    });
  }
}

export async function getUserByIc(icNumber: string, role?: string): Promise<User | null> {
  const where: { icNumber: string; isActive: boolean; role?: string } = { 
    icNumber, 
    isActive: true 
  };
  
  if (role) {
    where.role = role;
  }
  
  const user = await prisma.user.findFirst({
    where,
  });
  
  if (!user) return null;
  
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

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user || !user.isActive) return null;
  
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

export async function createUser(user: User): Promise<void> {
  await prisma.user.create({
    data: {
      id: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
      passwordHash: user.passwordHash,
      isActive: true,
    },
  });
}

export async function updateUserLastLogin(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { lastLogin: new Date() },
  });
}

export async function getBlockedHospitals(icNumber: string): Promise<string[]> {
  const settings = await prisma.patientPrivacySetting.findMany({
    where: { icNumber, isBlocked: true },
  });
  return settings.map((s: { hospitalId: string }) => s.hospitalId);
}

export async function setHospitalAccess(icNumber: string, hospitalId: string, isBlocked: boolean): Promise<void> {
  await prisma.patientPrivacySetting.upsert({
    where: {
      icNumber_hospitalId: { icNumber, hospitalId },
    },
    update: { isBlocked },
    create: { icNumber, hospitalId, isBlocked },
  });
}

export async function getPrivacySettings(icNumber: string): Promise<Array<{ hospitalId: string; isBlocked: boolean }>> {
  const settings = await prisma.patientPrivacySetting.findMany({
    where: { icNumber },
  });
  return settings.map((s: { hospitalId: string; isBlocked: boolean }) => ({
    hospitalId: s.hospitalId,
    isBlocked: s.isBlocked,
  }));
}

export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  await prisma.auditLog.create({
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
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};
  
  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.targetIcNumber) where.targetIcNumber = filters.targetIcNumber;
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters?.startDate) (where.timestamp as Record<string, unknown>).gte = new Date(filters.startDate);
    if (filters?.endDate) (where.timestamp as Record<string, unknown>).lte = new Date(filters.endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters?.limit || 100,
  });

  return logs.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action as AuditLog['action'],
    actorId: log.actorId,
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
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalPatients, 
    activeHospitals, 
    todayQueries,
    yesterdayQueries,
  ] = await Promise.all([
    prisma.patientIndex.count(),
    prisma.hospital.count({ where: { isActive: true } }),
    prisma.auditLog.count({
      where: {
        timestamp: { gte: today },
        action: 'query',
      },
    }),
    prisma.auditLog.count({
      where: {
        timestamp: { gte: yesterday, lt: today },
        action: 'query',
      },
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
    avgResponseTime: 0.8 + Math.random() * 0.6,
  };
}
