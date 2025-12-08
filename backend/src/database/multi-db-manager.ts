import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';

interface DatabaseConfig {
  central: string;
  hospitals: Record<string, string>;
}

function loadDatabaseConfig(): DatabaseConfig {
  return {
    central: process.env.DATABASE_URL_CENTRAL || '',
    hospitals: {
      'hospital-kl': process.env.DATABASE_URL_HOSPITAL_KL || '',
      'hospital-penang': process.env.DATABASE_URL_HOSPITAL_PENANG || '',
      'hospital-jb': process.env.DATABASE_URL_HOSPITAL_JB || '',
      'hospital-kuching': process.env.DATABASE_URL_HOSPITAL_KUCHING || '',
      'hospital-kk': process.env.DATABASE_URL_HOSPITAL_KK || '',
    },
  };
}

let centralClient: CentralPrismaClient | null = null;

export function getCentralDb(): CentralPrismaClient {
  if (!centralClient) {
    const config = loadDatabaseConfig();
    centralClient = new CentralPrismaClient({
      datasources: {
        db: { url: config.central },
      },
    });
  }
  return centralClient;
}

const hospitalClients: Map<string, HospitalPrismaClient> = new Map();

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  if (hospitalClients.has(hospitalId)) {
    return hospitalClients.get(hospitalId)!;
  }

  const config = loadDatabaseConfig();
  const dbUrl = config.hospitals[hospitalId];

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
