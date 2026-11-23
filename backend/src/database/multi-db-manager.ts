import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';
import { getHospitalById } from '../config';

let centralClient: CentralPrismaClient | null = null;

export function getCentralDb(): CentralPrismaClient {
  if (!centralClient) {
    centralClient = new CentralPrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL_CENTRAL || '' },
      },
    });
  }
  return centralClient;
}

const hospitalClients = new Map<string, HospitalPrismaClient>();

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  const existing = hospitalClients.get(hospitalId);
  if (existing) return existing;

  const hospital = getHospitalById(hospitalId);
  const dbUrl = hospital ? process.env[hospital.envVar] : '';

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
