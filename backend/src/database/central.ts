// ============================================================================
// Central Database - Multi-Database Version
// 使用独立的中心 PostgreSQL 数据库
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
} from './central-multi';

// 导出中心数据库客户端
import { getCentralDb } from './multi-db-manager';
export default getCentralDb();
