// ============================================================================
// Multi-Database Manager - 多数据库连接管理器
// 核心功能：根据 hospitalId 自动路由到对应的独立 PostgreSQL 数据库
// ============================================================================

import { PrismaClient as CentralPrismaClient } from '../../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../../node_modules/.prisma/client/hospital';

// ============================================================================
// 数据库配置
// ============================================================================
interface DatabaseConfig {
  central: string;
  hospitals: Record<string, string>;
}

// 从环境变量加载数据库配置
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

// ============================================================================
// 中心数据库客户端 (单例)
// ============================================================================
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

// ============================================================================
// 医院数据库客户端池 (每个医院一个连接)
// ============================================================================
const hospitalClients: Map<string, HospitalPrismaClient> = new Map();

export function getHospitalDbClient(hospitalId: string): HospitalPrismaClient {
  // 检查缓存
  if (hospitalClients.has(hospitalId)) {
    return hospitalClients.get(hospitalId)!;
  }

  // 获取数据库URL
  const config = loadDatabaseConfig();
  const dbUrl = config.hospitals[hospitalId];

  if (!dbUrl) {
    throw new Error(`No database configured for hospital: ${hospitalId}`);
  }

  // 创建新的客户端连接
  const client = new HospitalPrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  // 缓存连接
  hospitalClients.set(hospitalId, client);
  
  console.log(`[MultiDB] Connected to hospital database: ${hospitalId}`);
  
  return client;
}

// ============================================================================
// 获取所有医院ID列表
// ============================================================================
export function getAllHospitalIds(): string[] {
  return [
    'hospital-kl',
    'hospital-penang',
    'hospital-jb',
    'hospital-kuching',
    'hospital-kk',
  ];
}

// ============================================================================
// 关闭所有数据库连接 (用于优雅关闭)
// ============================================================================
export async function closeAllConnections(): Promise<void> {
  if (centralClient) {
    await centralClient.$disconnect();
    centralClient = null;
  }

  for (const [hospitalId, client] of hospitalClients) {
    await client.$disconnect();
    console.log(`[MultiDB] Disconnected from hospital database: ${hospitalId}`);
  }
  hospitalClients.clear();
}

// ============================================================================
// 初始化所有数据库连接 (启动时调用)
// ============================================================================
export async function initializeAllDatabases(): Promise<void> {
  console.log('[MultiDB] Initializing database connections...');
  
  // 连接中心数据库
  const central = getCentralDb();
  await central.$connect();
  console.log('[MultiDB] ✓ Central database connected');

  // 连接所有医院数据库
  const hospitalIds = getAllHospitalIds();
  for (const hospitalId of hospitalIds) {
    try {
      const client = getHospitalDbClient(hospitalId);
      await client.$connect();
      console.log(`[MultiDB] ✓ Hospital database connected: ${hospitalId}`);
    } catch (error) {
      console.error(`[MultiDB] ✗ Failed to connect hospital database: ${hospitalId}`, error);
    }
  }

  console.log('[MultiDB] All database connections initialized');
}

// ============================================================================
// 数据库健康检查
// ============================================================================
export async function checkDatabaseHealth(): Promise<{
  central: boolean;
  hospitals: Record<string, boolean>;
}> {
  const result = {
    central: false,
    hospitals: {} as Record<string, boolean>,
  };

  // 检查中心数据库
  try {
    const central = getCentralDb();
    await central.$queryRaw`SELECT 1`;
    result.central = true;
  } catch {
    result.central = false;
  }

  // 检查各医院数据库
  const hospitalIds = getAllHospitalIds();
  for (const hospitalId of hospitalIds) {
    try {
      const client = getHospitalDbClient(hospitalId);
      await client.$queryRaw`SELECT 1`;
      result.hospitals[hospitalId] = true;
    } catch {
      result.hospitals[hospitalId] = false;
    }
  }

  return result;
}
