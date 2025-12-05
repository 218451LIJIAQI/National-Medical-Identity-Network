import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PatientIndex, AuditLog, Hospital, User } from '../types';
import { HOSPITALS, CONFIG } from '../config';

// In-memory database with JSON persistence
interface CentralDB {
  patientIndex: Map<string, PatientIndex>;
  hospitals: Map<string, Hospital>;
  users: Map<string, User>;
  auditLogs: AuditLog[];
}

const db: CentralDB = {
  patientIndex: new Map(),
  hospitals: new Map(),
  users: new Map(),
  auditLogs: [],
};

// Persistence file path
const dataDir = path.dirname(CONFIG.database.centralDb);
const dbFile = path.join(dataDir, 'central-db.json');

// Load data from file if exists
function loadData(): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(dbFile)) {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      db.patientIndex = new Map(data.patientIndex || []);
      db.hospitals = new Map(data.hospitals || []);
      db.users = new Map(data.users || []);
      db.auditLogs = data.auditLogs || [];
    }
  } catch (e) {
    console.log('Starting with fresh database');
  }
}

// Save data to file
function saveData(): void {
  try {
    const data = {
      patientIndex: Array.from(db.patientIndex.entries()),
      hospitals: Array.from(db.hospitals.entries()),
      users: Array.from(db.users.entries()),
      auditLogs: db.auditLogs,
    };
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

// Initialize on load
loadData();

// ============================================================================
// Patient Index Operations
// ============================================================================

export function getPatientIndex(icNumber: string): PatientIndex | null {
  return db.patientIndex.get(icNumber) || null;
}

export function updatePatientIndex(icNumber: string, hospitalId: string): void {
  const existing = db.patientIndex.get(icNumber);
  const now = new Date().toISOString();
  
  if (existing) {
    const hospitals = existing.hospitals.includes(hospitalId)
      ? existing.hospitals
      : [...existing.hospitals, hospitalId];
    db.patientIndex.set(icNumber, { ...existing, hospitals, lastUpdated: now });
  } else {
    db.patientIndex.set(icNumber, { icNumber, hospitals: [hospitalId], lastUpdated: now });
  }
  saveData();
}

export function getAllPatientIndexes(): PatientIndex[] {
  return Array.from(db.patientIndex.values());
}

// ============================================================================
// Hospital Operations
// ============================================================================

export function getHospitals(): Hospital[] {
  return Array.from(db.hospitals.values()).filter(h => h.isActive);
}

export function registerHospital(hospital: Hospital): void {
  db.hospitals.set(hospital.id, hospital);
  saveData();
}

// ============================================================================
// User Operations
// ============================================================================

export function getUserByIc(icNumber: string): User | null {
  for (const user of db.users.values()) {
    if (user.icNumber === icNumber && user.isActive) {
      return user;
    }
  }
  return null;
}

export function getUserById(id: string): User | null {
  const user = db.users.get(id);
  if (user && user.isActive) return user;
  return null;
}

export function createUser(user: User): void {
  db.users.set(user.id, { ...user, isActive: true });
  saveData();
}

export function updateUserLastLogin(id: string): void {
  const user = db.users.get(id);
  if (user) {
    db.users.set(id, { ...user, lastLogin: new Date().toISOString() });
    saveData();
  }
}

// ============================================================================
// Audit Log Operations
// ============================================================================

export function createAuditLog(log: Omit<AuditLog, 'id'>): void {
  const auditLog: AuditLog = {
    id: uuidv4(),
    ...log,
  };
  db.auditLogs.push(auditLog);
  saveData();
}

export function getAuditLogs(filters?: {
  actorId?: string;
  targetIcNumber?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditLog[] {
  let results = [...db.auditLogs];
  
  if (filters?.actorId) {
    results = results.filter(log => log.actorId === filters.actorId);
  }
  if (filters?.targetIcNumber) {
    results = results.filter(log => log.targetIcNumber === filters.targetIcNumber);
  }
  if (filters?.startDate) {
    results = results.filter(log => log.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    results = results.filter(log => log.timestamp <= filters.endDate!);
  }
  
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results;
}

// ============================================================================
// Statistics
// ============================================================================

export function getCentralStats() {
  const todayStart = new Date().toISOString().split('T')[0];
  const queryCount = db.auditLogs.filter(
    log => log.timestamp >= todayStart && log.action === 'query'
  ).length;
  
  return {
    totalPatients: db.patientIndex.size,
    activeHospitals: Array.from(db.hospitals.values()).filter(h => h.isActive).length,
    todayQueries: queryCount,
  };
}

// Initialize hospitals from config
export function initializeHospitals(): void {
  const baseUrl = CONFIG.isProduction 
    ? process.env.BACKEND_URL || 'https://medlink-api.onrender.com'
    : 'http://localhost';
    
  HOSPITALS.forEach(h => {
    registerHospital({
      id: h.id,
      name: h.name,
      shortName: h.shortName,
      city: h.city,
      state: h.state,
      address: h.address,
      phone: h.phone,
      email: h.email,
      apiEndpoint: CONFIG.isProduction 
        ? `${baseUrl}/api/hospitals/${h.id}`
        : `${baseUrl}:${h.port}`,
      isActive: true,
    });
  });
}

export default db;
