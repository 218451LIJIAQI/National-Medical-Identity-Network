import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';
import { getHospitalById } from '../config';

let centralClient: CentralPrismaClient | null = null;
const hospitalClients = new Map<string, HospitalPrismaClient>();
let hospitalClientFactory: ((hospitalId: string) => HospitalPrismaClient) | null = null;

export function getCentralDb(): CentralPrismaClient {
  if (!centralClient) {
    const dbUrl = process.env.DATABASE_URL_CENTRAL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL_CENTRAL is not configured');
    }
    centralClient = new CentralPrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });
  }
  return centralClient;
}

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  const existing = hospitalClients.get(hospitalId);
  if (existing) return existing;

  if (hospitalClientFactory) {
    const injected = hospitalClientFactory(hospitalId);
    hospitalClients.set(hospitalId, injected);
    return injected;
  }

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

export function configureDbClients(
  central: CentralPrismaClient | null,
  hospitalFactory: ((hospitalId: string) => HospitalPrismaClient) | null
): void {
  centralClient = central;
  hospitalClients.clear();
  hospitalClientFactory = hospitalFactory;
}
