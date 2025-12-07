// ============================================================================
// Hospital Database - Multi-Database Version
// 每个医院使用独立的 PostgreSQL 数据库
// ============================================================================

// 使用多数据库版本
export { HospitalDatabaseMulti as HospitalDatabase, getHospitalDb } from './hospital-multi';
