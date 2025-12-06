import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// JWT secret must match the one in src/config/index.ts
const JWT_SECRET = process.env.JWT_SECRET || 'medlink-secret-key-2024-hackathon';

function hashPassword(password: string): string {
  // Must match auth.ts hashPassword function (password + salt)
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

async function main() {
  console.log('🚀 Starting database initialization (rich version)...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.labReport.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patientIndexHospital.deleteMany();
  await prisma.patientIndex.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.hospital.deleteMany();

  // ============================================================================
  // Hospitals
  // ============================================================================
  console.log('🏥 Creating hospitals...');
  const hospitals = [
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

  for (const h of hospitals) {
    await prisma.hospital.create({ data: h });
  }
  console.log(`   ✅ Created ${hospitals.length} hospitals`);

  // ============================================================================
  // Doctors - Multiple doctors per hospital
  // ============================================================================
  console.log('👨‍⚕️ Creating doctors...');
  const doctors = [
    // KL General Hospital
    { id: 'doc-kl-001', icNumber: '750101-14-5001', fullName: 'Dr. Lim Wei Ming', specialization: 'Internal Medicine', department: 'General Medicine', hospitalId: 'hospital-kl', licenseNumber: 'MMC-12345' },
    { id: 'doc-kl-002', icNumber: '780515-14-5002', fullName: 'Dr. Nurul Huda binti Ismail', specialization: 'Cardiology', department: 'Cardiology', hospitalId: 'hospital-kl', licenseNumber: 'MMC-23456' },
    { id: 'doc-kl-003', icNumber: '800220-14-5003', fullName: 'Dr. Ravi a/l Krishnan', specialization: 'Endocrinology', department: 'Endocrinology', hospitalId: 'hospital-kl', licenseNumber: 'MMC-34567' },
    { id: 'doc-kl-004', icNumber: '830101-14-5004', fullName: 'Dr. Chen Xiao Mei', specialization: 'Pediatrics', department: 'Pediatrics', hospitalId: 'hospital-kl', licenseNumber: 'MMC-34568' },
    
    // Penang General Hospital
    { id: 'doc-penang-001', icNumber: '760612-07-5001', fullName: 'Dr. Tan Mei Ling', specialization: 'Neurology', department: 'Neurology', hospitalId: 'hospital-penang', licenseNumber: 'MMC-45678' },
    { id: 'doc-penang-002', icNumber: '820930-07-5002', fullName: 'Dr. Ahmad Faizal bin Osman', specialization: 'Orthopedics', department: 'Orthopedics', hospitalId: 'hospital-penang', licenseNumber: 'MMC-56789' },
    { id: 'doc-penang-003', icNumber: '790515-07-5003', fullName: 'Dr. Kavitha a/p Subramaniam', specialization: 'Dermatology', department: 'Dermatology', hospitalId: 'hospital-penang', licenseNumber: 'MMC-56790' },
    
    // JB Hospital
    { id: 'doc-jb-001', icNumber: '770808-01-5001', fullName: 'Dr. Siti Aishah binti Rahman', specialization: 'Oncology', department: 'Oncology', hospitalId: 'hospital-jb', licenseNumber: 'MMC-67890' },
    { id: 'doc-jb-002', icNumber: '850415-01-5002', fullName: 'Dr. Liew Cheng Hock', specialization: 'Gastroenterology', department: 'Gastroenterology', hospitalId: 'hospital-jb', licenseNumber: 'MMC-78901' },
    { id: 'doc-jb-003', icNumber: '880220-01-5003', fullName: 'Dr. Mohd Hafiz bin Yusof', specialization: 'Emergency Medicine', department: 'Emergency', hospitalId: 'hospital-jb', licenseNumber: 'MMC-78902' },
    
    // Kuching Hospital
    { id: 'doc-kuching-001', icNumber: '790303-13-5001', fullName: 'Dr. James Wong Kok Wai', specialization: 'Nephrology', department: 'Nephrology', hospitalId: 'hospital-kuching', licenseNumber: 'MMC-89012' },
    { id: 'doc-kuching-002', icNumber: '810505-13-5002', fullName: 'Dr. Dayang Nur Ain', specialization: 'Psychiatry', department: 'Psychiatry', hospitalId: 'hospital-kuching', licenseNumber: 'MMC-89013' },
    
    // KK Hospital
    { id: 'doc-kk-001', icNumber: '810707-12-5001', fullName: 'Dr. Maria Gonzales', specialization: 'Pulmonology', department: 'Pulmonology', hospitalId: 'hospital-kk', licenseNumber: 'MMC-90123' },
    { id: 'doc-kk-002', icNumber: '850909-12-5002', fullName: 'Dr. Abdul Rahman bin Ismail', specialization: 'General Surgery', department: 'Surgery', hospitalId: 'hospital-kk', licenseNumber: 'MMC-90124' },
  ];

  for (const d of doctors) {
    await prisma.doctor.create({ data: d });
  }
  console.log(`   ✅ Created ${doctors.length} doctors`);

  // ============================================================================
  // Patients - Diverse patient data
  // ============================================================================
  console.log('👤 Creating patients...');
  const patients = [
    {
      icNumber: '880101-14-5678',
      fullName: 'Ahmad bin Abdullah',
      dateOfBirth: new Date('1988-01-01'),
      gender: 'male',
      bloodType: 'O+',
      phone: '+60 12-345 6789',
      email: 'ahmad.abdullah@email.com',
      address: '123 Jalan Merdeka, 50000 Kuala Lumpur',
      emergencyContact: 'Fatimah binti Hassan',
      emergencyPhone: '+60 12-987 6543',
      allergies: JSON.stringify(['Penicillin', 'Shellfish']),
      chronicConditions: JSON.stringify(['Hypertension', 'Type 2 Diabetes']),
    },
    {
      icNumber: '950320-10-1234',
      fullName: 'Siti Nurhaliza binti Mohd',
      dateOfBirth: new Date('1995-03-20'),
      gender: 'female',
      bloodType: 'A+',
      phone: '+60 13-456 7890',
      email: 'siti.nurhaliza@email.com',
      address: '456 Jalan Penang, 10000 George Town',
      emergencyContact: 'Mohd Rizal bin Hassan',
      emergencyPhone: '+60 13-111 2222',
      allergies: JSON.stringify([]),
      chronicConditions: JSON.stringify(['Asthma']),
    },
    {
      icNumber: '550715-07-9999',
      fullName: 'Tan Ah Kow',
      dateOfBirth: new Date('1955-07-15'),
      gender: 'male',
      bloodType: 'B+',
      phone: '+60 14-567 8901',
      email: 'tan.ahkow@email.com',
      address: '789 Jalan Besar, 80000 Johor Bahru',
      emergencyContact: 'Tan Mei Ling',
      emergencyPhone: '+60 14-222 3333',
      allergies: JSON.stringify(['Aspirin', 'Sulfa drugs']),
      chronicConditions: JSON.stringify(['Coronary Artery Disease', 'Hypertension', 'Hyperlipidemia', 'CKD Stage 3']),
    },
    {
      icNumber: '900808-01-5555',
      fullName: 'Raj Kumar a/l Muthu',
      dateOfBirth: new Date('1990-08-08'),
      gender: 'male',
      bloodType: 'AB+',
      phone: '+60 15-678 9012',
      email: 'raj.kumar@email.com',
      address: '321 Jalan Sarawak, 93000 Kuching',
      emergencyContact: 'Priya a/p Samy',
      emergencyPhone: '+60 15-333 4444',
      allergies: JSON.stringify(['Iodine contrast']),
      chronicConditions: JSON.stringify(['Epilepsy']),
    },
    {
      icNumber: '820425-12-7777',
      fullName: 'Aishah binti Mohd Yusof',
      dateOfBirth: new Date('1982-04-25'),
      gender: 'female',
      bloodType: 'O-',
      phone: '+60 16-789 0123',
      email: 'aishah.yusof@email.com',
      address: '654 Jalan Kinabalu, 88000 Kota Kinabalu',
      emergencyContact: 'Mohd Yusof bin Ahmad',
      emergencyPhone: '+60 16-444 5555',
      allergies: JSON.stringify(['Latex']),
      chronicConditions: JSON.stringify(['Asthma']),
    },
    // Additional patients
    {
      icNumber: '780312-14-2345',
      fullName: 'Lee Mei Fong',
      dateOfBirth: new Date('1978-03-12'),
      gender: 'female',
      bloodType: 'B-',
      phone: '+60 17-111 2345',
      email: 'lee.meifong@email.com',
      address: '88 Jalan Ampang, 50450 Kuala Lumpur',
      emergencyContact: 'Lee Chong Wei',
      emergencyPhone: '+60 17-999 8888',
      allergies: JSON.stringify(['NSAIDs']),
      chronicConditions: JSON.stringify(['Rheumatoid Arthritis', 'Osteoporosis']),
    },
    {
      icNumber: '920615-07-8888',
      fullName: 'Muhammad Farhan bin Aziz',
      dateOfBirth: new Date('1992-06-15'),
      gender: 'male',
      bloodType: 'A-',
      phone: '+60 18-222 3456',
      email: 'farhan.aziz@email.com',
      address: '123 Lorong Selamat, 10400 George Town',
      emergencyContact: 'Azizah binti Hamid',
      emergencyPhone: '+60 18-777 6666',
      allergies: JSON.stringify([]),
      chronicConditions: JSON.stringify(['Depression', 'Anxiety Disorder']),
    },
    {
      icNumber: '850928-01-4567',
      fullName: 'Kavitha a/p Rajendran',
      dateOfBirth: new Date('1985-09-28'),
      gender: 'female',
      bloodType: 'O+',
      phone: '+60 19-333 4567',
      email: 'kavitha.r@email.com',
      address: '456 Taman Pelangi, 80400 Johor Bahru',
      emergencyContact: 'Rajendran a/l Krishnan',
      emergencyPhone: '+60 19-555 4444',
      allergies: JSON.stringify(['Codeine']),
      chronicConditions: JSON.stringify(['Migraine', 'GERD']),
    },
    {
      icNumber: '700505-13-1111',
      fullName: 'Wong Ah Chong',
      dateOfBirth: new Date('1970-05-05'),
      gender: 'male',
      bloodType: 'AB-',
      phone: '+60 82-123 4567',
      email: 'wong.achong@email.com',
      address: '789 Jalan Padungan, 93100 Kuching',
      emergencyContact: 'Wong Mei Mei',
      emergencyPhone: '+60 82-888 7777',
      allergies: JSON.stringify(['Morphine', 'Tramadol']),
      chronicConditions: JSON.stringify(['Chronic Lower Back Pain', 'Benign Prostatic Hyperplasia']),
    },
    {
      icNumber: '980101-12-9999',
      fullName: 'Nurul Izzah binti Kamal',
      dateOfBirth: new Date('1998-01-01'),
      gender: 'female',
      bloodType: 'A+',
      phone: '+60 88-456 7890',
      email: 'nurul.izzah@email.com',
      address: '321 Lorong Kinabalu, 88300 Kota Kinabalu',
      emergencyContact: 'Kamal bin Ismail',
      emergencyPhone: '+60 88-111 2222',
      allergies: JSON.stringify([]),
      chronicConditions: JSON.stringify(['Polycystic Ovary Syndrome']),
    },
    // ========== Doctors who are also patients ==========
    {
      icNumber: '750101-14-5001', // Dr. Lim Wei Ming
      fullName: 'Lim Wei Ming',
      dateOfBirth: new Date('1975-01-01'),
      gender: 'male',
      bloodType: 'A+',
      phone: '+60 12-888 9999',
      email: 'lim.weiming@personal.com',
      address: '88 Jalan Damansara, 50490 Kuala Lumpur',
      emergencyContact: 'Lim Siew Ling',
      emergencyPhone: '+60 12-777 8888',
      allergies: JSON.stringify([]),
      chronicConditions: JSON.stringify(['Mild Hyperlipidemia']),
    },
    {
      icNumber: '760612-07-5001', // Dr. Tan Mei Ling
      fullName: 'Tan Mei Ling',
      dateOfBirth: new Date('1976-06-12'),
      gender: 'female',
      bloodType: 'O+',
      phone: '+60 13-999 0000',
      email: 'tan.meiling@personal.com',
      address: '56 Lorong Gurney, 10250 George Town',
      emergencyContact: 'Tan Boon Hock',
      emergencyPhone: '+60 13-888 9999',
      allergies: JSON.stringify(['Sulfonamides']),
      chronicConditions: JSON.stringify(['Migraine']),
    },
  ];

  for (const p of patients) {
    await prisma.patient.create({ data: p });
  }
  console.log(`   ✅ Created ${patients.length} patients`);

  // ============================================================================
  // Patient Index
  // ============================================================================
  console.log('🔗 Creating patient index...');
  const patientHospitals = [
    { icNumber: '880101-14-5678', hospitals: ['hospital-kl', 'hospital-penang', 'hospital-jb'] },
    { icNumber: '950320-10-1234', hospitals: ['hospital-penang'] },
    { icNumber: '550715-07-9999', hospitals: ['hospital-jb', 'hospital-kl', 'hospital-penang', 'hospital-kuching', 'hospital-kk'] },
    { icNumber: '900808-01-5555', hospitals: ['hospital-kuching'] },
    { icNumber: '820425-12-7777', hospitals: ['hospital-kk', 'hospital-kl'] },
    { icNumber: '780312-14-2345', hospitals: ['hospital-kl', 'hospital-penang'] },
    { icNumber: '920615-07-8888', hospitals: ['hospital-penang', 'hospital-kuching'] },
    { icNumber: '850928-01-4567', hospitals: ['hospital-jb'] },
    { icNumber: '700505-13-1111', hospitals: ['hospital-kuching', 'hospital-kk'] },
    { icNumber: '980101-12-9999', hospitals: ['hospital-kk'] },
    // Doctors as patients
    { icNumber: '750101-14-5001', hospitals: ['hospital-penang', 'hospital-jb'] }, // Dr. Lim Wei Ming
    { icNumber: '760612-07-5001', hospitals: ['hospital-kl'] }, // Dr. Tan Mei Ling
  ];

  for (const pi of patientHospitals) {
    await prisma.patientIndex.create({
      data: {
        icNumber: pi.icNumber,
        hospitals: { create: pi.hospitals.map(h => ({ hospitalId: h })) },
      },
    });
  }
  console.log(`   ✅ Created ${patientHospitals.length} patient indexes`);

  // ============================================================================
  // Medical Records - Rich medical history
  // ============================================================================
  console.log('📋 Creating medical records...');
  
  interface RecordData {
    icNumber: string;
    hospitalId: string;
    doctorId: string;
    visitDate: Date;
    visitType: string;
    chiefComplaint: string;
    diagnosis: string;
    diagnosisCodes: string;
    symptoms: string;
    notes: string;
    vitalSigns: string;
    prescriptions?: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions: string;
    }>;
    labReports?: Array<{
      testType: string;
      testName: string;
      result: string;
      unit: string;
      referenceRange: string;
      isAbnormal: boolean;
      reportDate: Date;
      notes: string;
    }>;
  }

  const medicalRecords: RecordData[] = [
    // Ahmad - Multiple visit records
    {
      icNumber: '880101-14-5678',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-001',
      visitDate: new Date('2024-01-15'),
      visitType: 'outpatient',
      chiefComplaint: 'Routine follow-up for hypertension and diabetes',
      diagnosis: JSON.stringify(['Essential Hypertension', 'Type 2 Diabetes Mellitus']),
      diagnosisCodes: JSON.stringify(['I10', 'E11.9']),
      symptoms: JSON.stringify(['Headache', 'Fatigue']),
      notes: 'BP well controlled at 130/85. HbA1c slightly elevated at 7.2%. Dietary modifications advised.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 130, bloodPressureDiastolic: 85, heartRate: 78, temperature: 36.8, weight: 75, height: 170 }),
      prescriptions: [
        { medicationName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning' },
        { medicationName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months', quantity: 180, instructions: 'Take after meals' },
      ],
      labReports: [
        { testType: 'Blood Test', testName: 'HbA1c', result: '7.2', unit: '%', referenceRange: '4.0-5.6', isAbnormal: true, reportDate: new Date('2024-01-15'), notes: 'Elevated HbA1c' },
        { testType: 'Blood Test', testName: 'Fasting Blood Sugar', result: '8.5', unit: 'mmol/L', referenceRange: '3.9-5.6', isAbnormal: true, reportDate: new Date('2024-01-15'), notes: 'Elevated fasting glucose' },
      ],
    },
    {
      icNumber: '880101-14-5678',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-002',
      visitDate: new Date('2024-06-20'),
      visitType: 'outpatient',
      chiefComplaint: 'Cardiology consultation',
      diagnosis: JSON.stringify(['Hypertensive Heart Disease']),
      diagnosisCodes: JSON.stringify(['I11.9']),
      symptoms: JSON.stringify(['Palpitations', 'Mild exertional dyspnea']),
      notes: 'ECG shows LVH. Echocardiogram scheduled. Started on ACE inhibitor.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 142, bloodPressureDiastolic: 92, heartRate: 82, temperature: 36.6, weight: 76, height: 170 }),
      prescriptions: [
        { medicationName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning' },
      ],
    },
    {
      icNumber: '880101-14-5678',
      hospitalId: 'hospital-penang',
      doctorId: 'doc-penang-001',
      visitDate: new Date('2024-03-10'),
      visitType: 'outpatient',
      chiefComplaint: 'Recurrent headaches, referred for neurology evaluation',
      diagnosis: JSON.stringify(['Tension-type Headache', 'Cervical Spondylosis']),
      diagnosisCodes: JSON.stringify(['G44.2', 'M47.812']),
      symptoms: JSON.stringify(['Bilateral headache', 'Neck stiffness', 'Occasional dizziness']),
      notes: 'Brain MRI normal. Cervical X-ray shows mild degenerative changes. Physiotherapy recommended.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 135, bloodPressureDiastolic: 88, heartRate: 75, temperature: 36.7, weight: 75, height: 170 }),
      prescriptions: [
        { medicationName: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '2 weeks', quantity: 20, instructions: 'Maximum 4 tablets daily' },
      ],
    },
    {
      icNumber: '880101-14-5678',
      hospitalId: 'hospital-jb',
      doctorId: 'doc-jb-002',
      visitDate: new Date('2024-08-05'),
      visitType: 'outpatient',
      chiefComplaint: 'Abdominal discomfort, indigestion',
      diagnosis: JSON.stringify(['Gastroesophageal Reflux Disease', 'Functional Dyspepsia']),
      diagnosisCodes: JSON.stringify(['K21.0', 'K30']),
      symptoms: JSON.stringify(['Heartburn', 'Postprandial bloating', 'Acid reflux']),
      notes: 'Gastroscopy recommended to rule out organic pathology. Started on PPI therapy.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 128, bloodPressureDiastolic: 82, heartRate: 72, temperature: 36.5, weight: 74, height: 170 }),
      prescriptions: [
        { medicationName: 'Omeprazole', dosage: '20mg', frequency: 'Once daily', duration: '4 weeks', quantity: 28, instructions: 'Take 30 minutes before meals' },
        { medicationName: 'Domperidone', dosage: '10mg', frequency: 'Three times daily', duration: '2 weeks', quantity: 42, instructions: 'Take before meals' },
      ],
    },

    // Tan Ah Kow - Complex case, multiple hospital visits
    {
      icNumber: '550715-07-9999',
      hospitalId: 'hospital-jb',
      doctorId: 'doc-jb-001',
      visitDate: new Date('2024-04-15'),
      visitType: 'inpatient',
      chiefComplaint: 'Chest pain and difficulty breathing',
      diagnosis: JSON.stringify(['Acute Coronary Syndrome', 'NSTEMI']),
      diagnosisCodes: JSON.stringify(['I21.4']),
      symptoms: JSON.stringify(['Severe chest pain', 'Diaphoresis', 'Dyspnea', 'Nausea']),
      notes: 'Emergency PCI performed. DES implanted in LAD. Started on DAPT.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 160, bloodPressureDiastolic: 95, heartRate: 98, temperature: 37.0, oxygenSaturation: 94, weight: 68, height: 165 }),
      prescriptions: [
        { medicationName: 'Aspirin', dosage: '100mg', frequency: 'Once daily', duration: 'Long-term', quantity: 90, instructions: 'Take after meals' },
        { medicationName: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '12 months', quantity: 90, instructions: 'Do not stop without medical advice' },
        { medicationName: 'Atorvastatin', dosage: '40mg', frequency: 'Once nightly', duration: 'Long-term', quantity: 90, instructions: 'Take at bedtime' },
        { medicationName: 'Bisoprolol', dosage: '5mg', frequency: 'Once daily', duration: 'Long-term', quantity: 90, instructions: 'Take in the morning' },
      ],
      labReports: [
        { testType: 'Cardiac Markers', testName: 'Troponin I', result: '2.5', unit: 'ng/mL', referenceRange: '<0.04', isAbnormal: true, reportDate: new Date('2024-04-15'), notes: 'Significantly elevated cardiac injury markers' },
        { testType: 'Cardiac Markers', testName: 'CK-MB', result: '85', unit: 'U/L', referenceRange: '<25', isAbnormal: true, reportDate: new Date('2024-04-15'), notes: '' },
      ],
    },
    {
      icNumber: '550715-07-9999',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-002',
      visitDate: new Date('2024-10-10'),
      visitType: 'outpatient',
      chiefComplaint: 'Post-stent cardiology follow-up',
      diagnosis: JSON.stringify(['Status Post Coronary Stent Placement', 'Coronary Artery Disease']),
      diagnosisCodes: JSON.stringify(['Z95.5', 'I25.10']),
      symptoms: JSON.stringify(['No chest pain', 'No dyspnea at rest']),
      notes: '6 months post-PCI, recovering well. Continue DAPT. Echo shows EF 55%.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 138, bloodPressureDiastolic: 82, heartRate: 65, temperature: 36.5, oxygenSaturation: 96, weight: 67, height: 165 }),
      prescriptions: [],
    },
    {
      icNumber: '550715-07-9999',
      hospitalId: 'hospital-kuching',
      doctorId: 'doc-kuching-001',
      visitDate: new Date('2024-07-20'),
      visitType: 'outpatient',
      chiefComplaint: 'CKD follow-up',
      diagnosis: JSON.stringify(['Chronic Kidney Disease Stage 3', 'Hypertensive Nephropathy']),
      diagnosisCodes: JSON.stringify(['N18.3', 'I12.9']),
      symptoms: JSON.stringify(['Mild fatigue', 'Nocturia']),
      notes: 'eGFR 45. Renal function stable. Continue renoprotective therapy. Protein restriction advised.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 145, bloodPressureDiastolic: 88, heartRate: 70, temperature: 36.6, weight: 66, height: 165 }),
      labReports: [
        { testType: 'Renal Function', testName: 'Creatinine', result: '180', unit: 'µmol/L', referenceRange: '60-110', isAbnormal: true, reportDate: new Date('2024-07-20'), notes: '' },
        { testType: 'Renal Function', testName: 'eGFR', result: '45', unit: 'mL/min/1.73m²', referenceRange: '>90', isAbnormal: true, reportDate: new Date('2024-07-20'), notes: 'CKD Stage 3' },
        { testType: 'Urine Test', testName: 'Urine Protein', result: '1+', unit: '', referenceRange: 'Negative', isAbnormal: true, reportDate: new Date('2024-07-20'), notes: 'Mild proteinuria' },
      ],
    },

    // Siti Nurhaliza - Acute asthma exacerbation
    {
      icNumber: '950320-10-1234',
      hospitalId: 'hospital-penang',
      doctorId: 'doc-penang-002',
      visitDate: new Date('2024-02-28'),
      visitType: 'emergency',
      chiefComplaint: 'Severe asthma attack',
      diagnosis: JSON.stringify(['Acute Severe Asthma Exacerbation']),
      diagnosisCodes: JSON.stringify(['J45.901']),
      symptoms: JSON.stringify(['Severe wheezing', 'Chest tightness', 'Unable to speak in full sentences']),
      notes: 'Nebulized salbutamol and ipratropium. IV hydrocortisone. Improved after 2 hours. Discharged on oral steroids.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 125, bloodPressureDiastolic: 80, heartRate: 110, temperature: 36.9, respiratoryRate: 28, oxygenSaturation: 88, weight: 55, height: 158 }),
      prescriptions: [
        { medicationName: 'Prednisolone', dosage: '30mg', frequency: 'Once daily', duration: '5 days', quantity: 5, instructions: 'Take after breakfast' },
        { medicationName: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed', duration: '1 month', quantity: 1, instructions: 'Inhale 2 puffs when needed' },
      ],
    },

    // Raj Kumar - Epilepsy follow-up
    {
      icNumber: '900808-01-5555',
      hospitalId: 'hospital-kuching',
      doctorId: 'doc-kuching-002',
      visitDate: new Date('2024-05-10'),
      visitType: 'outpatient',
      chiefComplaint: 'Routine epilepsy follow-up',
      diagnosis: JSON.stringify(['Generalized Epilepsy - Well Controlled']),
      diagnosisCodes: JSON.stringify(['G40.309']),
      symptoms: JSON.stringify(['No recent seizures', 'Occasional drowsiness']),
      notes: '18 months seizure-free. EEG stable. Continue current medication. Consider driving after 6 more months of observation.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 120, bloodPressureDiastolic: 78, heartRate: 72, temperature: 36.5, weight: 70, height: 175 }),
      prescriptions: [
        { medicationName: 'Sodium Valproate', dosage: '500mg', frequency: 'Twice daily', duration: '6 months', quantity: 180, instructions: 'Take after meals' },
      ],
      labReports: [
        { testType: 'Drug Level', testName: 'Valproic Acid Level', result: '75', unit: 'µg/mL', referenceRange: '50-100', isAbnormal: false, reportDate: new Date('2024-05-10'), notes: 'Within therapeutic range' },
      ],
    },

    // Aishah - Asthma management
    {
      icNumber: '820425-12-7777',
      hospitalId: 'hospital-kk',
      doctorId: 'doc-kk-001',
      visitDate: new Date('2024-06-05'),
      visitType: 'outpatient',
      chiefComplaint: 'Asthma review and inhaler technique assessment',
      diagnosis: JSON.stringify(['Mild Persistent Asthma']),
      diagnosisCodes: JSON.stringify(['J45.30']),
      symptoms: JSON.stringify(['Occasional nocturnal cough', 'Exercise-induced symptoms']),
      notes: 'Inhaler technique corrected. Peak flow improved. Continue current regimen.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 115, bloodPressureDiastolic: 75, heartRate: 70, temperature: 36.6, respiratoryRate: 16, oxygenSaturation: 99, weight: 58, height: 162 }),
      prescriptions: [
        { medicationName: 'Fluticasone/Salmeterol', dosage: '250/50mcg', frequency: 'Twice daily', duration: '3 months', quantity: 1, instructions: 'Rinse mouth after use' },
      ],
    },
    {
      icNumber: '820425-12-7777',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-001',
      visitDate: new Date('2024-04-22'),
      visitType: 'emergency',
      chiefComplaint: 'Acute asthma exacerbation',
      diagnosis: JSON.stringify(['Acute Asthma Exacerbation']),
      diagnosisCodes: JSON.stringify(['J45.901']),
      symptoms: JSON.stringify(['Severe dyspnea', 'Wheezing', 'Chest tightness', 'Unable to speak in full sentences']),
      notes: 'Severe asthma attack. Nebulized bronchodilators and systemic steroids. Good response. Discharged after 4-hour observation.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 130, bloodPressureDiastolic: 85, heartRate: 110, temperature: 36.8, respiratoryRate: 28, oxygenSaturation: 91, weight: 58, height: 162 }),
      prescriptions: [
        { medicationName: 'Prednisolone', dosage: '40mg', frequency: 'Once daily', duration: '5 days', quantity: 5, instructions: 'Take after meals' },
      ],
    },

    // Lee Mei Fong - Rheumatoid arthritis
    {
      icNumber: '780312-14-2345',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-003',
      visitDate: new Date('2024-03-18'),
      visitType: 'outpatient',
      chiefComplaint: 'Rheumatoid arthritis follow-up',
      diagnosis: JSON.stringify(['Rheumatoid Arthritis', 'Osteoporosis']),
      diagnosisCodes: JSON.stringify(['M06.9', 'M81.0']),
      symptoms: JSON.stringify(['Morning stiffness', 'Multiple joint swelling and pain', 'Fatigue']),
      notes: 'Moderate disease activity. Adjusted DMARD dosage. DEXA shows osteopenia. Started calcium and vitamin D supplementation.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 118, bloodPressureDiastolic: 76, heartRate: 75, temperature: 36.7, weight: 52, height: 155 }),
      prescriptions: [
        { medicationName: 'Methotrexate', dosage: '15mg', frequency: 'Once weekly', duration: '3 months', quantity: 12, instructions: 'Avoid alcohol on dosing day' },
        { medicationName: 'Folic Acid', dosage: '5mg', frequency: 'Once weekly', duration: '3 months', quantity: 12, instructions: 'Take 24 hours after MTX' },
        { medicationName: 'Calcium + Vitamin D', dosage: '600mg/400IU', frequency: 'Once daily', duration: '6 months', quantity: 180, instructions: 'Take after meals' },
      ],
      labReports: [
        { testType: 'Inflammatory Markers', testName: 'ESR', result: '45', unit: 'mm/hr', referenceRange: '<20', isAbnormal: true, reportDate: new Date('2024-03-18'), notes: 'Elevated inflammatory markers' },
        { testType: 'Inflammatory Markers', testName: 'CRP', result: '18', unit: 'mg/L', referenceRange: '<5', isAbnormal: true, reportDate: new Date('2024-03-18'), notes: '' },
        { testType: 'Autoimmune', testName: 'RF', result: '85', unit: 'IU/mL', referenceRange: '<14', isAbnormal: true, reportDate: new Date('2024-03-18'), notes: 'Positive rheumatoid factor' },
      ],
    },
    {
      icNumber: '780312-14-2345',
      hospitalId: 'hospital-penang',
      doctorId: 'doc-penang-003',
      visitDate: new Date('2024-05-22'),
      visitType: 'outpatient',
      chiefComplaint: 'Skin rash evaluation',
      diagnosis: JSON.stringify(['Drug-induced Skin Reaction', 'Photosensitivity']),
      diagnosisCodes: JSON.stringify(['L27.0', 'L56.0']),
      symptoms: JSON.stringify(['Facial rash', 'Worsens with sun exposure', 'Mild pruritus']),
      notes: 'Possible MTX-related photosensitivity reaction. Sun protection advised. Topical steroid treatment.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 122, bloodPressureDiastolic: 78, heartRate: 72, temperature: 36.6, weight: 52, height: 155 }),
      prescriptions: [
        { medicationName: 'Hydrocortisone Cream 1%', dosage: '', frequency: 'Twice daily', duration: '2 weeks', quantity: 1, instructions: 'Apply thin layer to affected areas' },
      ],
    },

    // Muhammad Farhan - Psychiatry
    {
      icNumber: '920615-07-8888',
      hospitalId: 'hospital-penang',
      doctorId: 'doc-penang-001',
      visitDate: new Date('2024-04-05'),
      visitType: 'outpatient',
      chiefComplaint: 'Persistent low mood and anxiety',
      diagnosis: JSON.stringify(['Major Depressive Disorder', 'Generalized Anxiety Disorder']),
      diagnosisCodes: JSON.stringify(['F32.1', 'F41.1']),
      symptoms: JSON.stringify(['Low mood', 'Insomnia', 'Decreased appetite', 'Poor concentration', 'Excessive worry']),
      notes: 'Moderate depressive episode with anxiety. Started SSRI therapy. Counseling recommended. Follow-up in 2 weeks to assess response.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 115, bloodPressureDiastolic: 72, heartRate: 78, temperature: 36.5, weight: 65, height: 172 }),
      prescriptions: [
        { medicationName: 'Escitalopram', dosage: '10mg', frequency: 'Once daily', duration: '1 month', quantity: 30, instructions: 'Take in the morning. May cause initial nausea' },
      ],
    },
    {
      icNumber: '920615-07-8888',
      hospitalId: 'hospital-kuching',
      doctorId: 'doc-kuching-002',
      visitDate: new Date('2024-09-15'),
      visitType: 'outpatient',
      chiefComplaint: 'Depression follow-up',
      diagnosis: JSON.stringify(['Major Depressive Disorder - Improving']),
      diagnosisCodes: JSON.stringify(['F32.1']),
      symptoms: JSON.stringify(['Mood improved', 'Sleep improved', 'Mild residual anxiety']),
      notes: 'Good response to SSRI. PHQ-9 score reduced from 18 to 8. Continue current dose. Encourage ongoing psychotherapy.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 118, bloodPressureDiastolic: 74, heartRate: 72, temperature: 36.6, weight: 67, height: 172 }),
      prescriptions: [
        { medicationName: 'Escitalopram', dosage: '10mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning' },
      ],
    },

    // Kavitha - Migraine
    {
      icNumber: '850928-01-4567',
      hospitalId: 'hospital-jb',
      doctorId: 'doc-jb-003',
      visitDate: new Date('2024-05-30'),
      visitType: 'emergency',
      chiefComplaint: 'Severe migraine attack',
      diagnosis: JSON.stringify(['Migraine with Aura', 'Status Migrainosus']),
      diagnosisCodes: JSON.stringify(['G43.1', 'G43.2']),
      symptoms: JSON.stringify(['Severe unilateral headache', 'Nausea and vomiting', 'Photophobia', 'Visual aura']),
      notes: 'Migraine lasting >72 hours. IV fluids and antiemetics. IV steroid therapy. Discharged after symptom resolution.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 135, bloodPressureDiastolic: 85, heartRate: 88, temperature: 36.8, weight: 60, height: 160 }),
      prescriptions: [
        { medicationName: 'Sumatriptan', dosage: '50mg', frequency: 'As needed during attack', duration: 'As needed', quantity: 6, instructions: 'Take as early as possible when headache starts' },
        { medicationName: 'Propranolol', dosage: '40mg', frequency: 'Twice daily', duration: '3 months', quantity: 180, instructions: 'Prophylactic medication' },
      ],
    },

    // Wong Ah Chong - Chronic pain
    {
      icNumber: '700505-13-1111',
      hospitalId: 'hospital-kuching',
      doctorId: 'doc-kuching-001',
      visitDate: new Date('2024-06-20'),
      visitType: 'outpatient',
      chiefComplaint: 'Chronic lower back pain management',
      diagnosis: JSON.stringify(['Chronic Lower Back Pain', 'Lumbar Spondylosis', 'Benign Prostatic Hyperplasia']),
      diagnosisCodes: JSON.stringify(['M54.5', 'M47.816', 'N40.0']),
      symptoms: JSON.stringify(['Persistent low back pain', 'Radiating pain to lower limbs', 'Difficulty urinating', 'Increased nocturia']),
      notes: 'Moderate chronic pain control. Avoid opioids (allergy history). Focus on physiotherapy and non-pharmacological treatment. BPH stable.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 140, bloodPressureDiastolic: 85, heartRate: 75, temperature: 36.5, weight: 72, height: 168 }),
      prescriptions: [
        { medicationName: 'Gabapentin', dosage: '300mg', frequency: 'Three times daily', duration: '3 months', quantity: 270, instructions: 'May cause dizziness' },
        { medicationName: 'Tamsulosin', dosage: '0.4mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take at bedtime' },
      ],
    },
    {
      icNumber: '700505-13-1111',
      hospitalId: 'hospital-kk',
      doctorId: 'doc-kk-002',
      visitDate: new Date('2024-08-15'),
      visitType: 'outpatient',
      chiefComplaint: 'Surgical consultation - BPH',
      diagnosis: JSON.stringify(['Benign Prostatic Hyperplasia - Moderate']),
      diagnosisCodes: JSON.stringify(['N40.1']),
      symptoms: JSON.stringify(['Weak urine stream', 'Hesitancy', 'Nocturia 3-4 times']),
      notes: 'Suboptimal response to medical therapy. Surgical options discussed. Patient prefers continued conservative management. Reassess in 3 months.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 138, bloodPressureDiastolic: 82, heartRate: 72, temperature: 36.6, weight: 71, height: 168 }),
      prescriptions: [
        { medicationName: 'Finasteride', dosage: '5mg', frequency: 'Once daily', duration: '6 months', quantity: 180, instructions: 'Requires long-term use for effectiveness' },
      ],
      labReports: [
        { testType: 'Tumor Marker', testName: 'PSA', result: '3.8', unit: 'ng/mL', referenceRange: '<4.0', isAbnormal: false, reportDate: new Date('2024-08-15'), notes: 'Within normal range' },
      ],
    },

    // Nurul Izzah - PCOS
    {
      icNumber: '980101-12-9999',
      hospitalId: 'hospital-kk',
      doctorId: 'doc-kk-001',
      visitDate: new Date('2024-07-10'),
      visitType: 'outpatient',
      chiefComplaint: 'Irregular menstruation',
      diagnosis: JSON.stringify(['Polycystic Ovary Syndrome']),
      diagnosisCodes: JSON.stringify(['E28.2']),
      symptoms: JSON.stringify(['Irregular periods', 'Acne', 'Mild hirsutism', 'Weight gain']),
      notes: 'Ultrasound shows polycystic ovarian changes. Lifestyle modifications advised. Started metformin and OCP for cycle regulation.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 118, bloodPressureDiastolic: 75, heartRate: 78, temperature: 36.6, weight: 68, height: 160 }),
      prescriptions: [
        { medicationName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months', quantity: 180, instructions: 'Take after meals to reduce GI upset' },
        { medicationName: 'Diane-35', dosage: '', frequency: 'Once daily', duration: '3 months', quantity: 63, instructions: 'Take cyclically as prescribed' },
      ],
      labReports: [
        { testType: 'Hormone', testName: 'LH/FSH Ratio', result: '2.8', unit: '', referenceRange: '<2', isAbnormal: true, reportDate: new Date('2024-07-10'), notes: 'Elevated LH/FSH ratio' },
        { testType: 'Hormone', testName: 'Testosterone', result: '2.5', unit: 'nmol/L', referenceRange: '0.5-2.0', isAbnormal: true, reportDate: new Date('2024-07-10'), notes: 'Mildly elevated androgen' },
        { testType: 'Metabolic', testName: 'Fasting Insulin', result: '18', unit: 'µU/mL', referenceRange: '<12', isAbnormal: true, reportDate: new Date('2024-07-10'), notes: 'Insulin resistance' },
      ],
    },

    // ========== Doctors as Patients - Medical Records ==========
    // Dr. Lim Wei Ming (IC: 750101-14-5001) - seen at other hospitals
    {
      icNumber: '750101-14-5001',
      hospitalId: 'hospital-penang',
      doctorId: 'doc-penang-001',
      visitDate: new Date('2024-02-15'),
      visitType: 'outpatient',
      chiefComplaint: 'Annual health screening follow-up',
      diagnosis: JSON.stringify(['Hyperlipidemia', 'Borderline Hypertension']),
      diagnosisCodes: JSON.stringify(['E78.5', 'R03.0']),
      symptoms: JSON.stringify(['None - routine checkup']),
      notes: 'Elevated LDL cholesterol. Started on statin therapy. Lifestyle modifications advised including diet and exercise.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 138, bloodPressureDiastolic: 88, heartRate: 72, temperature: 36.5, weight: 78, height: 175 }),
      prescriptions: [
        { medicationName: 'Atorvastatin', dosage: '20mg', frequency: 'Once nightly', duration: '3 months', quantity: 90, instructions: 'Take at bedtime' },
      ],
      labReports: [
        { testType: 'Lipid Panel', testName: 'Total Cholesterol', result: '6.2', unit: 'mmol/L', referenceRange: '<5.2', isAbnormal: true, reportDate: new Date('2024-02-15'), notes: 'Elevated' },
        { testType: 'Lipid Panel', testName: 'LDL Cholesterol', result: '4.1', unit: 'mmol/L', referenceRange: '<2.6', isAbnormal: true, reportDate: new Date('2024-02-15'), notes: 'High LDL' },
        { testType: 'Lipid Panel', testName: 'HDL Cholesterol', result: '1.2', unit: 'mmol/L', referenceRange: '>1.0', isAbnormal: false, reportDate: new Date('2024-02-15'), notes: '' },
      ],
    },
    {
      icNumber: '750101-14-5001',
      hospitalId: 'hospital-jb',
      doctorId: 'doc-jb-002',
      visitDate: new Date('2024-08-20'),
      visitType: 'outpatient',
      chiefComplaint: 'Gastric discomfort',
      diagnosis: JSON.stringify(['Gastroesophageal Reflux Disease']),
      diagnosisCodes: JSON.stringify(['K21.0']),
      symptoms: JSON.stringify(['Heartburn', 'Acid reflux after meals', 'Occasional epigastric pain']),
      notes: 'Work-related stress contributing to symptoms. PPI therapy initiated. Stress management counseling recommended.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 132, bloodPressureDiastolic: 84, heartRate: 70, temperature: 36.6, weight: 77, height: 175 }),
      prescriptions: [
        { medicationName: 'Esomeprazole', dosage: '40mg', frequency: 'Once daily', duration: '4 weeks', quantity: 28, instructions: 'Take 30 minutes before breakfast' },
      ],
    },

    // Dr. Tan Mei Ling (IC: 760612-07-5001) - seen at KL hospital
    {
      icNumber: '760612-07-5001',
      hospitalId: 'hospital-kl',
      doctorId: 'doc-kl-001',
      visitDate: new Date('2024-05-10'),
      visitType: 'outpatient',
      chiefComplaint: 'Recurrent migraine headaches',
      diagnosis: JSON.stringify(['Migraine without Aura', 'Tension-type Headache']),
      diagnosisCodes: JSON.stringify(['G43.009', 'G44.209']),
      symptoms: JSON.stringify(['Throbbing unilateral headache', 'Photophobia', 'Nausea during episodes', 'Neck tension']),
      notes: 'Migraine frequency increased to 4-5 episodes per month. Started on prophylactic therapy. Maintain headache diary.',
      vitalSigns: JSON.stringify({ bloodPressureSystolic: 118, bloodPressureDiastolic: 76, heartRate: 68, temperature: 36.5, weight: 55, height: 162 }),
      prescriptions: [
        { medicationName: 'Propranolol', dosage: '40mg', frequency: 'Twice daily', duration: '3 months', quantity: 180, instructions: 'Prophylactic - do not stop abruptly' },
        { medicationName: 'Sumatriptan', dosage: '50mg', frequency: 'As needed', duration: '3 months', quantity: 12, instructions: 'Take at onset of migraine. Max 2 tablets per day' },
      ],
    },
  ];

  let recordCount = 0;
  let prescriptionCount = 0;
  let labReportCount = 0;

  for (const record of medicalRecords) {
    const { prescriptions, labReports, ...recordData } = record;
    const createdRecord = await prisma.medicalRecord.create({ data: recordData });
    recordCount++;

    if (prescriptions) {
      for (const rx of prescriptions) {
        await prisma.prescription.create({ data: { ...rx, recordId: createdRecord.id } });
        prescriptionCount++;
      }
    }

    if (labReports) {
      for (const lab of labReports) {
        await prisma.labReport.create({ data: { ...lab, recordId: createdRecord.id } });
        labReportCount++;
      }
    }
  }
  console.log(`   ✅ Created ${recordCount} medical records, ${prescriptionCount} prescriptions, ${labReportCount} lab reports`);

  // ============================================================================
  // User Accounts
  // ============================================================================
  console.log('👥 Creating user accounts...');
  const DOCTOR_PWD = hashPassword('doctor123');
  const PATIENT_PWD = hashPassword('patient123');
  const ADMIN_PWD = hashPassword('admin123');
  const CENTRAL_PWD = hashPassword('central123');

  // ICs of doctors who are also patients - they should use the same password (doctor123)
  const doctorPatientICs = ['750101-14-5001', '760612-07-5001'];
  
  const users = [
    // Doctors
    ...doctors.map(d => ({ icNumber: d.icNumber, role: 'doctor', hospitalId: d.hospitalId, passwordHash: DOCTOR_PWD })),
    // Patients - use DOCTOR_PWD for doctors who are also patients, PATIENT_PWD for others
    ...patients.map(p => ({ 
      icNumber: p.icNumber, 
      role: 'patient', 
      hospitalId: 'hospital-kl', 
      passwordHash: doctorPatientICs.includes(p.icNumber) ? DOCTOR_PWD : PATIENT_PWD 
    })),
    // Hospital admins
    { icNumber: 'admin-kl', role: 'hospital_admin', hospitalId: 'hospital-kl', passwordHash: ADMIN_PWD },
    { icNumber: 'admin-penang', role: 'hospital_admin', hospitalId: 'hospital-penang', passwordHash: ADMIN_PWD },
    { icNumber: 'admin-jb', role: 'hospital_admin', hospitalId: 'hospital-jb', passwordHash: ADMIN_PWD },
    { icNumber: 'admin-kuching', role: 'hospital_admin', hospitalId: 'hospital-kuching', passwordHash: ADMIN_PWD },
    { icNumber: 'admin-kk', role: 'hospital_admin', hospitalId: 'hospital-kk', passwordHash: ADMIN_PWD },
    // Central admin
    { icNumber: 'central-admin', role: 'central_admin', passwordHash: CENTRAL_PWD },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`   ✅ Created ${users.length} user accounts`);

  // ============================================================================
  // Complete
  // ============================================================================
  console.log('\n✨ Database initialization complete!\n');
  console.log('📊 Statistics:');
  console.log(`   • Hospitals: ${hospitals.length}`);
  console.log(`   • Doctors: ${doctors.length}`);
  console.log(`   • Patients: ${patients.length}`);
  console.log(`   • Medical Records: ${recordCount}`);
  console.log(`   • Prescriptions: ${prescriptionCount}`);
  console.log(`   • Lab Reports: ${labReportCount}`);
  console.log(`   • Users: ${users.length}`);
  console.log('\n🔐 Test Accounts:');
  console.log('   • Doctor:         IC 750101-14-5001, Password: doctor123');
  console.log('   • Patient:        IC 880101-14-5678, Password: patient123');
  console.log('   • Hospital Admin: IC admin-kl, Password: admin123');
  console.log('   • Central Admin:  IC central-admin, Password: central123');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
