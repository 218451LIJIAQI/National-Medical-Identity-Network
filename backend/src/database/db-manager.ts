import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';
import { findHospitalConfig } from '../config';

let centralClient: CentralPrismaClient | null = null;
const hospitalClients = new Map<string, HospitalPrismaClient>();

export function getCentralDb(): CentralPrismaClient {
  if (!centralClient) {
    const url = process.env.DATABASE_URL_CENTRAL;
    if (!url) {
      throw new Error('DATABASE_URL_CENTRAL environment variable is not configured');
    }
    centralClient = new CentralPrismaClient({
      datasources: { db: { url } },
    });
  }
  return centralClient;
}

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  const existing = hospitalClients.get(hospitalId);
  if (existing) {
    return existing;
  }

  const hospital = findHospitalConfig(hospitalId);
  if (!hospital) {
    throw new Error(`Unknown hospital ID: ${hospitalId}`);
  }

  const dbUrl = process.env[hospital.envVar];
  if (!dbUrl) {
    throw new Error(`Database URL (${hospital.envVar}) is not configured for ${hospital.id}`);
  }

  const client = new HospitalPrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  hospitalClients.set(hospitalId, client);
  return client;
}

export async function disconnectAllDbs(): Promise<void> {
  const disconnects: Promise<unknown>[] = [];
  if (centralClient) {
    disconnects.push(centralClient.$disconnect());
    centralClient = null;
  }
  for (const client of hospitalClients.values()) {
    disconnects.push(client.$disconnect());
  }
  hospitalClients.clear();
  await Promise.allSettled(disconnects);
}

/**
 * Injects in-memory or mock Prisma clients for deterministic automated testing.
 */
export function setDbClientsForTesting(clients: {
  central: CentralPrismaClient | null;
  hospitals?: Record<string, HospitalPrismaClient>;
}): void {
  centralClient = clients.central;
  hospitalClients.clear();
  if (clients.hospitals) {
    for (const [id, client] of Object.entries(clients.hospitals)) {
      hospitalClients.set(id, client);
    }
  }
}
