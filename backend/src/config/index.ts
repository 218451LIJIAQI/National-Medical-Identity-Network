import dotenv from 'dotenv';

dotenv.config();

export interface HospitalConfig {
  id: string;
  name: string;
  shortName: string;
  adminName: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  port: number;
  envVar: string;
}

export const DEV_DEFAULT_JWT_SECRET = 'medlink-secret-key-2024-hackathon';

export const HOSPITALS: HospitalConfig[] = [
  {
    id: 'hospital-kl',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KL General',
    adminName: 'Admin KL General',
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    address: 'Jalan Pahang, 50586 Kuala Lumpur',
    phone: '+60 3-2615 5555',
    email: 'admin@klgeneral.gov.my',
    port: 3001,
    envVar: 'DATABASE_URL_HOSPITAL_KL',
  },
  {
    id: 'hospital-penang',
    name: 'Penang General Hospital',
    shortName: 'Penang General',
    adminName: 'Admin Penang MC',
    city: 'George Town',
    state: 'Penang',
    address: 'Jalan Residensi, 10990 George Town',
    phone: '+60 4-222 5333',
    email: 'admin@penanggeneral.gov.my',
    port: 3002,
    envVar: 'DATABASE_URL_HOSPITAL_PENANG',
  },
  {
    id: 'hospital-jb',
    name: 'Sultanah Aminah Hospital',
    shortName: 'JB Sultanah Aminah',
    adminName: 'Admin Johor Specialist',
    city: 'Johor Bahru',
    state: 'Johor',
    address: 'Jalan Abu Bakar, 80100 Johor Bahru',
    phone: '+60 7-223 1666',
    email: 'admin@hsajb.gov.my',
    port: 3003,
    envVar: 'DATABASE_URL_HOSPITAL_JB',
  },
  {
    id: 'hospital-kuching',
    name: 'Sarawak General Hospital',
    shortName: 'Kuching General',
    adminName: 'Admin Sarawak General',
    city: 'Kuching',
    state: 'Sarawak',
    address: 'Jalan Hospital, 93586 Kuching',
    phone: '+60 82-276 666',
    email: 'admin@sghkuching.gov.my',
    port: 3004,
    envVar: 'DATABASE_URL_HOSPITAL_KUCHING',
  },
  {
    id: 'hospital-kk',
    name: 'Queen Elizabeth Hospital',
    shortName: 'KK Queen Elizabeth',
    adminName: 'Admin Queen Elizabeth',
    city: 'Kota Kinabalu',
    state: 'Sabah',
    address: 'Jalan Penampang, 88200 Kota Kinabalu',
    phone: '+60 88-517 555',
    email: 'admin@qehkk.gov.my',
    port: 3005,
    envVar: 'DATABASE_URL_HOSPITAL_KK',
  },
];

export function getHospitalById(hospitalId?: string): HospitalConfig | undefined {
  if (!hospitalId) return undefined;
  return HOSPITALS.find(h => h.id === hospitalId);
}

export function validateEnvironmentConfig(env: NodeJS.ProcessEnv = process.env): void {
  const isProd = env.NODE_ENV === 'production';
  if (!isProd) return;

  const missingOrInvalid: string[] = [];

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret === DEV_DEFAULT_JWT_SECRET || jwtSecret.length < 32) {
    missingOrInvalid.push(
      'JWT_SECRET (must be explicitly set in production, non-default, and at least 32 characters)'
    );
  }

  if (!env.DATABASE_URL_CENTRAL?.trim()) {
    missingOrInvalid.push('DATABASE_URL_CENTRAL');
  }

  for (const hospital of HOSPITALS) {
    if (!env[hospital.envVar]?.trim()) {
      missingOrInvalid.push(hospital.envVar);
    }
  }

  if (missingOrInvalid.length > 0) {
    throw new Error(
      `Production configuration validation failed. Missing or insecure environment variables: ${missingOrInvalid.join(', ')}`
    );
  }
}

export function createConfig(env: NodeJS.ProcessEnv = process.env) {
  validateEnvironmentConfig(env);
  const isProduction = env.NODE_ENV === 'production';

  const parsedOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://medlink-my.netlify.app',
      ];

  return {
    centralHub: {
      port: parseInt(env.CENTRAL_PORT || '3000', 10) || 3000,
    },
    jwt: {
      secret: isProduction ? env.JWT_SECRET!.trim() : env.JWT_SECRET?.trim() || DEV_DEFAULT_JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN || '24h',
    },
    cors: {
      origins: parsedOrigins,
    },
    isProduction,
  };
}

export const CONFIG = createConfig(process.env);
