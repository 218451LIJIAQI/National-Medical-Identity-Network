import crypto from 'crypto';
import dotenv from 'dotenv';
import { HospitalConfig } from '../types';

dotenv.config();

/**
 * Single authoritative registry of participating hospitals in the federated network.
 * Shared across runtime services, database seeding, and schema push scripts.
 */
export const HOSPITALS: readonly HospitalConfig[] = [
  {
    id: 'hospital-kl',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KL General',
    adminDisplayName: 'Admin KL General',
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    address: 'Jalan Pahang, 50586 Kuala Lumpur',
    phone: '+60 3-2615 5555',
    email: 'admin@klgeneral.gov.my',
    port: 3001,
    envVar: 'DATABASE_URL_HOSPITAL_KL',
    apiEndpoint: 'http://localhost:3001',
  },
  {
    id: 'hospital-penang',
    name: 'Penang Medical Centre',
    shortName: 'Penang MC',
    adminDisplayName: 'Admin Penang MC',
    city: 'George Town',
    state: 'Penang',
    address: 'Jalan Residensi, 10990 George Town',
    phone: '+60 4-222 5333',
    email: 'admin@penangmc.gov.my',
    port: 3002,
    envVar: 'DATABASE_URL_HOSPITAL_PENANG',
    apiEndpoint: 'http://localhost:3002',
  },
  {
    id: 'hospital-jb',
    name: 'Johor Specialist Hospital',
    shortName: 'Johor Specialist',
    adminDisplayName: 'Admin Johor Specialist',
    city: 'Johor Bahru',
    state: 'Johor',
    address: 'Jalan Abu Bakar, 80100 Johor Bahru',
    phone: '+60 7-223 1666',
    email: 'admin@johorspecialist.gov.my',
    port: 3003,
    envVar: 'DATABASE_URL_HOSPITAL_JB',
    apiEndpoint: 'http://localhost:3003',
  },
  {
    id: 'hospital-kuching',
    name: 'Sarawak General Hospital',
    shortName: 'Sarawak General',
    adminDisplayName: 'Admin Sarawak General',
    city: 'Kuching',
    state: 'Sarawak',
    address: 'Jalan Hospital, 93586 Kuching',
    phone: '+60 82-276 666',
    email: 'admin@sarawakgeneral.gov.my',
    port: 3004,
    envVar: 'DATABASE_URL_HOSPITAL_KUCHING',
    apiEndpoint: 'http://localhost:3004',
  },
  {
    id: 'hospital-kk',
    name: 'Queen Elizabeth Hospital',
    shortName: 'Queen Elizabeth',
    adminDisplayName: 'Admin Queen Elizabeth',
    city: 'Kota Kinabalu',
    state: 'Sabah',
    address: 'Jalan Penampang, 88200 Kota Kinabalu',
    phone: '+60 88-517 555',
    email: 'admin@qehkk.gov.my',
    port: 3005,
    envVar: 'DATABASE_URL_HOSPITAL_KK',
    apiEndpoint: 'http://localhost:3005',
  },
];

const hospitalById = new Map<string, HospitalConfig>(
  HOSPITALS.map((hospital) => [hospital.id, hospital])
);

export function findHospitalConfig(hospitalId?: string | null): HospitalConfig | undefined {
  if (!hospitalId) return undefined;
  return hospitalById.get(hospitalId);
}

export const CONFIG = {
  centralHub: {
    port: Number.parseInt(process.env.PORT || process.env.CENTRAL_PORT || '3000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'medlink-secret-key-2024-hackathon',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://medlink-my.netlify.app',
        ],
  },
  emergencyRateLimitMs: Number.parseInt(process.env.EMERGENCY_RATE_LIMIT_MS || '60000', 10),
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * Derives a deterministic SHA-256 password digest keyed with the configured JWT secret.
 * Shared between seed scripts and runtime authentication so credentials never drift.
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + CONFIG.jwt.secret).digest('hex');
}

export function verifyPassword(password: string, expectedHash: string): boolean {
  const actualBuffer = Buffer.from(hashPassword(password), 'utf8');
  const expectedBuffer = Buffer.from(expectedHash, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
