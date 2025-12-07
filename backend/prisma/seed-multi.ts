// ============================================================================
// Multi-Database Seed Script - 多数据库种子数据
// 为中心数据库和各医院独立数据库填充演示数据
// ============================================================================

import { PrismaClient as CentralPrismaClient } from '../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../node_modules/.prisma/client/hospital';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 数据库连接
// ============================================================================
function getCentralClient(): CentralPrismaClient {
  return new CentralPrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_CENTRAL } },
  });
}

function getHospitalClient(hospitalId: string): HospitalPrismaClient {
  const urlMap: Record<string, string | undefined> = {
    'hospital-kl': process.env.DATABASE_URL_HOSPITAL_KL,
    'hospital-penang': process.env.DATABASE_URL_HOSPITAL_PENANG,
    'hospital-jb': process.env.DATABASE_URL_HOSPITAL_JB,
    'hospital-kuching': process.env.DATABASE_URL_HOSPITAL_KUCHING,
    'hospital-kk': process.env.DATABASE_URL_HOSPITAL_KK,
  };
  
  const url = urlMap[hospitalId];
  if (!url) throw new Error(`No URL for hospital: ${hospitalId}`);
  
  return new HospitalPrismaClient({
    datasources: { db: { url } },
  });
}

// ============================================================================
// 密码哈希 - 使用与 auth.ts 相同的算法
// ============================================================================
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'medlink-multi-db-secret-key-2024';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// ============================================================================
// 医院数据
// ============================================================================
const HOSPITALS = [
  {
    id: 'hospital-kl',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KL General',
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    address: 'Jalan Pahang, 50586 Kuala Lumpur',
    phone: '+60 3-2615 5555',
    email: 'admin@klgeneral.gov.my',
    apiEndpoint: 'http://localhost:3001',
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
    apiEndpoint: 'http://localhost:3002',
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
    apiEndpoint: 'http://localhost:3003',
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
    apiEndpoint: 'http://localhost:3004',
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
    apiEndpoint: 'http://localhost:3005',
  },
];

// ============================================================================
// 医生数据 (每个医院)
// ============================================================================
const DOCTORS = {
  'hospital-kl': [
    { id: uuidv4(), icNumber: '750101-14-5001', fullName: 'Dr. Lim Wei Ming', specialization: 'Internal Medicine', department: 'General Medicine' },
    { id: uuidv4(), icNumber: '800515-14-5002', fullName: 'Dr. Sarah Tan', specialization: 'Cardiology', department: 'Cardiology' },
  ],
  'hospital-penang': [
    { id: uuidv4(), icNumber: '760612-07-5001', fullName: 'Dr. Tan Mei Ling', specialization: 'Neurology', department: 'Neurology' },
    { id: uuidv4(), icNumber: '820310-07-5002', fullName: 'Dr. Raj Kumar', specialization: 'Pediatrics', department: 'Pediatrics' },
  ],
  'hospital-jb': [
    { id: uuidv4(), icNumber: '770808-01-5001', fullName: 'Dr. Siti Aishah', specialization: 'Oncology', department: 'Oncology' },
    { id: uuidv4(), icNumber: '830920-01-5002', fullName: 'Dr. Ahmad Faiz', specialization: 'Surgery', department: 'Surgery' },
  ],
  'hospital-kuching': [
    { id: uuidv4(), icNumber: '790303-13-5001', fullName: 'Dr. James Wong', specialization: 'Nephrology', department: 'Nephrology' },
    { id: uuidv4(), icNumber: '850115-13-5002', fullName: 'Dr. Dayang Nur', specialization: 'Dermatology', department: 'Dermatology' },
  ],
  'hospital-kk': [
    { id: uuidv4(), icNumber: '810707-12-5001', fullName: 'Dr. Maria Gonzales', specialization: 'Pulmonology', department: 'Pulmonology' },
    { id: uuidv4(), icNumber: '860420-12-5002', fullName: 'Dr. Johnny Lai', specialization: 'Orthopedics', department: 'Orthopedics' },
  ],
};

// ============================================================================
// 患者数据
// ============================================================================
const PATIENTS = [
  {
    icNumber: '880101-14-5678',
    fullName: 'Ahmad bin Abdullah',
    dateOfBirth: new Date('1988-01-01'),
    gender: 'male',
    bloodType: 'O+',
    phone: '+60 12-345 6789',
    email: 'ahmad@email.com',
    address: '123 Jalan Bukit Bintang, KL',
    emergencyContact: 'Fatimah binti Hassan',
    emergencyPhone: '+60 12-111 2222',
    allergies: JSON.stringify(['Penicillin', 'Shellfish']),
    chronicConditions: JSON.stringify(['Hypertension', 'Type 2 Diabetes']),
    hospitalHistory: ['hospital-kl', 'hospital-penang', 'hospital-jb'],
  },
  {
    icNumber: '950320-10-1234',
    fullName: 'Siti Nurhaliza binti Mohd',
    dateOfBirth: new Date('1995-03-20'),
    gender: 'female',
    bloodType: 'A+',
    phone: '+60 17-987 6543',
    email: 'siti.n@email.com',
    address: '45 Lorong Masjid, George Town',
    emergencyContact: 'Mohd Yusof bin Hassan',
    emergencyPhone: '+60 17-333 4444',
    allergies: JSON.stringify(['Aspirin']),
    chronicConditions: JSON.stringify(['Asthma']),
    hospitalHistory: ['hospital-penang', 'hospital-kl'],
  },
  {
    icNumber: '550715-07-9999',
    fullName: 'Tan Ah Kow',
    dateOfBirth: new Date('1955-07-15'),
    gender: 'male',
    bloodType: 'B+',
    phone: '+60 16-555 6666',
    email: 'tan.ak@email.com',
    address: '88 Jalan Danga, JB',
    emergencyContact: 'Tan Mei Ling',
    emergencyPhone: '+60 16-777 8888',
    allergies: JSON.stringify(['Sulfa drugs', 'Iodine']),
    chronicConditions: JSON.stringify(['Coronary Heart Disease', 'Chronic Kidney Disease']),
    hospitalHistory: ['hospital-jb', 'hospital-kl', 'hospital-kuching'],
  },
  {
    icNumber: '900808-01-5555',
    fullName: 'Raj Kumar a/l Muthu',
    dateOfBirth: new Date('1990-08-08'),
    gender: 'male',
    bloodType: 'AB+',
    phone: '+60 19-222 3333',
    email: 'raj.kumar@email.com',
    address: '25 Jalan Padungan, Kuching',
    emergencyContact: 'Priya Muthu',
    emergencyPhone: '+60 19-444 5555',
    allergies: JSON.stringify([]),
    chronicConditions: JSON.stringify(['Epilepsy']),
    hospitalHistory: ['hospital-kuching', 'hospital-kk'],
  },
  {
    icNumber: '820425-12-7777',
    fullName: 'Aishah binti Mohd Yusof',
    dateOfBirth: new Date('1982-04-25'),
    gender: 'female',
    bloodType: 'O-',
    phone: '+60 13-888 9999',
    email: 'aishah.y@email.com',
    address: '10 Jalan Gaya, Kota Kinabalu',
    emergencyContact: 'Mohd Yusof bin Ahmad',
    emergencyPhone: '+60 13-111 2222',
    allergies: JSON.stringify(['Latex']),
    chronicConditions: JSON.stringify(['Asthma']),
    hospitalHistory: ['hospital-kk', 'hospital-kuching'],
  },
  // 医生自己也是患者
  {
    icNumber: '750101-14-5001',
    fullName: 'Dr. Lim Wei Ming',
    dateOfBirth: new Date('1975-01-01'),
    gender: 'male',
    bloodType: 'A+',
    phone: '+60 12-100 1001',
    email: 'dr.lim@klgeneral.gov.my',
    address: '50 Jalan Ampang, KL',
    emergencyContact: 'Mrs. Lim',
    emergencyPhone: '+60 12-200 2002',
    allergies: JSON.stringify([]),
    chronicConditions: JSON.stringify(['Hyperlipidemia']),
    hospitalHistory: ['hospital-penang'],
  },
  {
    icNumber: '760612-07-5001',
    fullName: 'Dr. Tan Mei Ling',
    dateOfBirth: new Date('1976-06-12'),
    gender: 'female',
    bloodType: 'B-',
    phone: '+60 17-300 3003',
    email: 'dr.tan@penanggeneral.gov.my',
    address: '20 Gurney Drive, Penang',
    emergencyContact: 'Mr. Tan',
    emergencyPhone: '+60 17-400 4004',
    allergies: JSON.stringify([]),
    chronicConditions: JSON.stringify(['Migraine']),
    hospitalHistory: ['hospital-kl'],
  },
];

// ============================================================================
// 主种子函数
// ============================================================================
async function main() {
  console.log('🌱 Starting multi-database seeding...\n');

  // 1. 种子中心数据库
  console.log('📦 Seeding Central Database...');
  const centralDb = getCentralClient();
  
  // 清理现有数据
  await centralDb.auditLog.deleteMany();
  await centralDb.patientPrivacySetting.deleteMany();
  await centralDb.patientIndexHospital.deleteMany();
  await centralDb.patientIndex.deleteMany();
  await centralDb.user.deleteMany();
  await centralDb.hospital.deleteMany();

  // 创建医院
  for (const hospital of HOSPITALS) {
    await centralDb.hospital.create({
      data: { ...hospital, isActive: true },
    });
    console.log(`  ✓ Hospital: ${hospital.shortName}`);
  }

  // 创建用户账户
  const users = [
    // 中央管理员
    { icNumber: 'central-admin', role: 'central_admin', hospitalId: null },
    // 医院管理员
    { icNumber: 'admin-kl', role: 'hospital_admin', hospitalId: 'hospital-kl' },
    { icNumber: 'admin-penang', role: 'hospital_admin', hospitalId: 'hospital-penang' },
    { icNumber: 'admin-jb', role: 'hospital_admin', hospitalId: 'hospital-jb' },
    { icNumber: 'admin-kuching', role: 'hospital_admin', hospitalId: 'hospital-kuching' },
    { icNumber: 'admin-kk', role: 'hospital_admin', hospitalId: 'hospital-kk' },
    // 医生 (同时也是患者)
    { icNumber: '750101-14-5001', role: 'doctor', hospitalId: 'hospital-kl' },
    { icNumber: '750101-14-5001', role: 'patient', hospitalId: null },
    { icNumber: '760612-07-5001', role: 'doctor', hospitalId: 'hospital-penang' },
    { icNumber: '760612-07-5001', role: 'patient', hospitalId: null },
    { icNumber: '770808-01-5001', role: 'doctor', hospitalId: 'hospital-jb' },
    { icNumber: '790303-13-5001', role: 'doctor', hospitalId: 'hospital-kuching' },
    { icNumber: '810707-12-5001', role: 'doctor', hospitalId: 'hospital-kk' },
    // 普通患者
    { icNumber: '880101-14-5678', role: 'patient', hospitalId: null },
    { icNumber: '950320-10-1234', role: 'patient', hospitalId: null },
    { icNumber: '550715-07-9999', role: 'patient', hospitalId: null },
    { icNumber: '900808-01-5555', role: 'patient', hospitalId: null },
    { icNumber: '820425-12-7777', role: 'patient', hospitalId: null },
  ];

  // 双身份医生的IC列表 - 这些IC无论是doctor还是patient角色都用同一密码
  const dualIdentityDoctorIcs = ['750101-14-5001', '760612-07-5001'];
  
  for (const user of users) {
    // 双身份用户（医生同时是患者）使用 doctor123 密码
    const isDualIdentityDoctor = dualIdentityDoctorIcs.includes(user.icNumber);
    
    const password = user.role === 'central_admin' ? 'central123' 
      : user.role === 'hospital_admin' ? 'admin123'
      : isDualIdentityDoctor ? 'doctor123'  // 双身份用户统一用 doctor123
      : user.role === 'doctor' ? 'doctor123' 
      : 'patient123';
    
    await centralDb.user.create({
      data: {
        id: uuidv4(),
        icNumber: user.icNumber,
        role: user.role,
        hospitalId: user.hospitalId,
        passwordHash: hashPassword(password),
        isActive: true,
      },
    });
  }
  console.log(`  ✓ Created ${users.length} user accounts`);

  // 创建患者索引
  for (const patient of PATIENTS) {
    await centralDb.patientIndex.create({
      data: {
        icNumber: patient.icNumber,
        hospitals: {
          create: patient.hospitalHistory.map(hId => ({ hospitalId: hId })),
        },
      },
    });
  }
  console.log(`  ✓ Created patient indexes for ${PATIENTS.length} patients`);

  await centralDb.$disconnect();
  console.log('✅ Central Database seeded!\n');

  // 2. 种子各医院数据库
  for (const hospital of HOSPITALS) {
    console.log(`📦 Seeding ${hospital.shortName} Database...`);
    const hospitalDb = getHospitalClient(hospital.id);

    // 清理现有数据
    await hospitalDb.labReport.deleteMany();
    await hospitalDb.prescription.deleteMany();
    await hospitalDb.medicalRecord.deleteMany();
    await hospitalDb.patient.deleteMany();
    await hospitalDb.doctor.deleteMany();

    // 创建医生
    const doctors = DOCTORS[hospital.id as keyof typeof DOCTORS] || [];
    for (const doctor of doctors) {
      await hospitalDb.doctor.create({
        data: {
          ...doctor,
          licenseNumber: `LIC-${doctor.icNumber.slice(0, 6)}`,
          phone: '+60 3-1234 5678',
          email: `${doctor.fullName.toLowerCase().replace(/[^a-z]/g, '.')}@${hospital.id}.gov.my`,
          isActive: true,
        },
      });
    }
    console.log(`  ✓ Created ${doctors.length} doctors`);

    // 创建在该医院有记录的患者
    const hospitalPatients = PATIENTS.filter(p => p.hospitalHistory.includes(hospital.id));
    for (const patient of hospitalPatients) {
      // 检查患者是否已存在
      const existing = await hospitalDb.patient.findUnique({
        where: { icNumber: patient.icNumber },
      });
      
      if (!existing) {
        await hospitalDb.patient.create({
          data: {
            icNumber: patient.icNumber,
            fullName: patient.fullName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodType: patient.bloodType,
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            emergencyContact: patient.emergencyContact,
            emergencyPhone: patient.emergencyPhone,
            allergies: patient.allergies,
            chronicConditions: patient.chronicConditions,
          },
        });
      }
    }
    console.log(`  ✓ Created ${hospitalPatients.length} patients`);

    // 为每个患者创建病历记录
    for (const patient of hospitalPatients) {
      const doctor = doctors[0];
      if (!doctor) continue;

      const recordId = uuidv4();
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 365));

      await hospitalDb.medicalRecord.create({
        data: {
          id: recordId,
          icNumber: patient.icNumber,
          doctorId: doctor.id,
          visitDate,
          visitType: ['outpatient', 'inpatient', 'emergency'][Math.floor(Math.random() * 3)],
          chiefComplaint: 'Routine checkup and follow-up',
          diagnosis: JSON.stringify(['General examination', 'Condition monitoring']),
          diagnosisCodes: JSON.stringify(['Z00.0', 'Z09']),
          symptoms: JSON.stringify(['None reported']),
          notes: `Patient visited ${hospital.shortName} for routine checkup.`,
          vitalSigns: JSON.stringify({
            bloodPressureSystolic: 120 + Math.floor(Math.random() * 20),
            bloodPressureDiastolic: 70 + Math.floor(Math.random() * 15),
            heartRate: 70 + Math.floor(Math.random() * 20),
            temperature: 36.5 + Math.random() * 0.8,
            weight: 60 + Math.floor(Math.random() * 30),
            height: 160 + Math.floor(Math.random() * 25),
            oxygenSaturation: 96 + Math.floor(Math.random() * 4),
          }),
          prescriptions: {
            create: [
              {
                medicationName: 'Metformin',
                dosage: '500mg',
                frequency: 'Twice daily',
                duration: '30 days',
                quantity: 60,
                instructions: 'Take with meals',
                isActive: true,
              },
            ],
          },
          labReports: {
            create: [
              {
                testType: 'Blood Test',
                testName: 'Complete Blood Count',
                result: 'Normal',
                unit: '',
                referenceRange: 'Within normal limits',
                isAbnormal: false,
                reportDate: visitDate,
                notes: 'All values within normal range',
              },
            ],
          },
        },
      });
    }
    console.log(`  ✓ Created medical records with prescriptions and lab reports`);

    await hospitalDb.$disconnect();
    console.log(`✅ ${hospital.shortName} Database seeded!\n`);
  }

  console.log('🎉 All databases seeded successfully!');
  console.log('\n📊 Database Summary:');
  console.log('   - 1 Central Database (indexes, users, audit logs)');
  console.log('   - 5 Hospital Databases (patients, records, doctors)');
  console.log('\n🔑 Login Credentials:');
  console.log('   - Central Admin: central-admin / central123');
  console.log('   - Hospital Admin: admin-kl / admin123');
  console.log('   - Doctor: 750101-14-5001 / doctor123');
  console.log('   - Patient: 880101-14-5678 / patient123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
