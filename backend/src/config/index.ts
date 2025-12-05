import dotenv from 'dotenv';

dotenv.config();

// Hospital configurations
export const HOSPITALS = [
  {
    id: 'hospital-kl',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KL General',
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    address: 'Jalan Pahang, 50586 Kuala Lumpur',
    phone: '+60 3-2615 5555',
    email: 'admin@klgeneral.gov.my',
    port: 3001,
  },
  {
    id: 'hospital-penang',
    name: 'Penang General Hospital',
    shortName: 'Penang General',
    city: 'George Town',
    state: 'Penang',
    address: 'Jalan Residensi, 10990 George Town',
    phone: '+60 4-222 5333',
    email: 'admin@penanggeneral.gov.my',
    port: 3002,
  },
  {
    id: 'hospital-jb',
    name: 'Sultanah Aminah Hospital',
    shortName: 'JB Sultanah Aminah',
    city: 'Johor Bahru',
    state: 'Johor',
    address: 'Jalan Abu Bakar, 80100 Johor Bahru',
    phone: '+60 7-223 1666',
    email: 'admin@hsajb.gov.my',
    port: 3003,
  },
  {
    id: 'hospital-kuching',
    name: 'Sarawak General Hospital',
    shortName: 'Kuching General',
    city: 'Kuching',
    state: 'Sarawak',
    address: 'Jalan Hospital, 93586 Kuching',
    phone: '+60 82-276 666',
    email: 'admin@sghkuching.gov.my',
    port: 3004,
  },
  {
    id: 'hospital-kk',
    name: 'Queen Elizabeth Hospital',
    shortName: 'KK Queen Elizabeth',
    city: 'Kota Kinabalu',
    state: 'Sabah',
    address: 'Jalan Penampang, 88200 Kota Kinabalu',
    phone: '+60 88-517 555',
    email: 'admin@qehkk.gov.my',
    port: 3005,
  },
];

// Server configuration
export const CONFIG = {
  // Central Hub
  centralHub: {
    port: parseInt(process.env.CENTRAL_PORT || '3000'),
    host: process.env.CENTRAL_HOST || 'localhost',
  },
  
  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET || 'medlink-secret-key-2024-hackathon',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // Database paths
  database: {
    centralDb: process.env.CENTRAL_DB_PATH || './data/central.db',
    hospitalDbPrefix: process.env.HOSPITAL_DB_PREFIX || './data/',
  },
  
  // CORS settings
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://medlink-my.netlify.app',
    ],
  },
  
  // Query settings
  query: {
    timeout: parseInt(process.env.QUERY_TIMEOUT || '5000'),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_QUERIES || '10'),
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Get hospital by ID
export function getHospitalById(id: string) {
  return HOSPITALS.find(h => h.id === id);
}

// Get hospital port
export function getHospitalPort(id: string): number {
  const hospital = HOSPITALS.find(h => h.id === id);
  return hospital?.port || 3001;
}

// Get all hospital endpoints
export function getHospitalEndpoints(baseUrl?: string) {
  const base = baseUrl || (CONFIG.isProduction 
    ? process.env.BACKEND_URL || 'https://medlink-api.onrender.com'
    : 'http://localhost');
    
  return HOSPITALS.map(h => ({
    ...h,
    apiEndpoint: CONFIG.isProduction 
      ? `${base}/api/hospitals/${h.id}`
      : `${base}:${h.port}`,
  }));
}

// Drug interaction database (simplified for demo)
export const DRUG_INTERACTIONS = [
  {
    drug1: 'Warfarin',
    drug2: 'Aspirin',
    severity: 'high' as const,
    description: 'Increased risk of bleeding when used together',
    recommendation: 'Avoid combination or monitor closely for signs of bleeding',
  },
  {
    drug1: 'Metformin',
    drug2: 'Alcohol',
    severity: 'moderate' as const,
    description: 'Increased risk of lactic acidosis',
    recommendation: 'Limit alcohol consumption while on Metformin',
  },
  {
    drug1: 'Lisinopril',
    drug2: 'Potassium supplements',
    severity: 'moderate' as const,
    description: 'Risk of hyperkalemia (high potassium levels)',
    recommendation: 'Monitor potassium levels regularly',
  },
  {
    drug1: 'Simvastatin',
    drug2: 'Grapefruit juice',
    severity: 'moderate' as const,
    description: 'Grapefruit can increase statin levels in blood',
    recommendation: 'Avoid grapefruit while taking this medication',
  },
  {
    drug1: 'Ciprofloxacin',
    drug2: 'Antacids',
    severity: 'low' as const,
    description: 'Antacids reduce absorption of ciprofloxacin',
    recommendation: 'Take ciprofloxacin 2 hours before or 6 hours after antacids',
  },
  {
    drug1: 'Amlodipine',
    drug2: 'Simvastatin',
    severity: 'moderate' as const,
    description: 'Amlodipine can increase simvastatin levels',
    recommendation: 'Limit simvastatin dose to 20mg when combined with amlodipine',
  },
];

export default CONFIG;
