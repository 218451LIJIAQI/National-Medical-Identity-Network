import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';
import { getHospitalById } from '../config';

let centralClient: CentralPrismaClient | null = null;
const hospitalClients = new Map<string, HospitalPrismaClient>();

export function getCentralDb(): CentralPrismaClient {
  if (!centralClient) {
    const url = process.env.DATABASE_URL_CENTRAL?.trim();
    if (!url) {
      throw new Error('DATABASE_URL_CENTRAL is not configured');
    }
    centralClient = new CentralPrismaClient({
      datasources: {
        db: { url },
      },
    });
  }
  return centralClient;
}

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  const existing = hospitalClients.get(hospitalId);
  if (existing) return existing;

  const hospital = getHospitalById(hospitalId);
  const dbUrl = hospital ? process.env[hospital.envVar]?.trim() : '';

  if (!dbUrl) {
    throw new Error(`No database configured for hospital: ${hospitalId}`);
  }

  const client = new HospitalPrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  hospitalClients.set(hospitalId, client);
  return client;
}

export function setDbClientsForTesting(
  central: CentralPrismaClient | null,
  hospitals?: Record<string, HospitalPrismaClient>
): void {
  centralClient = central;
  hospitalClients.clear();
  if (hospitals) {
    for (const [id, client] of Object.entries(hospitals)) {
      hospitalClients.set(id, client);
    }
  }
}
