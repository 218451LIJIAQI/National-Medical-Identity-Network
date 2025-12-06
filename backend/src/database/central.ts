// ============================================================================
// Central Database - Now using Prisma
// Re-exports from central-prisma.ts for backward compatibility
// ============================================================================

export {
  getPatientIndex,
  updatePatientIndex,
  getAllPatientIndexes,
  getHospitals,
  registerHospital,
  getUserByIc,
  getUserById,
  createUser,
  updateUserLastLogin,
  createAuditLog,
  getAuditLogs,
  getCentralStats,
  initializeHospitals,
  getBlockedHospitals,
  setHospitalAccess,
  getPrivacySettings,
} from './central-prisma';

import prisma from './prisma';
export default prisma;
