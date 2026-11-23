import crypto from 'crypto';
import { PrismaClient as CentralPrismaClient } from '../node_modules/.prisma/client/central';
import { PrismaClient as HospitalPrismaClient } from '../node_modules/.prisma/client/hospital';
import { HOSPITALS, hashPassword } from '../src/config';
import { HospitalId } from '../src/types';

function createCentralClient(): CentralPrismaClient {
  const url = process.env.DATABASE_URL_CENTRAL;
  if (!url) {
    throw new Error('DATABASE_URL_CENTRAL is required to seed the central database');
  }
  return new CentralPrismaClient({ datasources: { db: { url } } });
}

function createHospitalClient(envVar: string, hospitalId: string): HospitalPrismaClient {
  const url = process.env[envVar];
  if (!url) {
    throw new Error(`Missing ${envVar} for ${hospitalId}`);
  }
  return new HospitalPrismaClient({ datasources: { db: { url } } });
}

interface SeedPatient {
  icNumber: string;
  fullName: string;
  dob: string;
  gender: 'male' | 'female';
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string[];
  conditions: string[];
  hospitals: HospitalId[];
}

const ALL_PATIENTS: SeedPatient[] = [
  { icNumber: '880101-14-5678', fullName: 'Ahmad bin Abdullah', dob: '1988-01-01', gender: 'male', bloodType: 'O+', phone: '+60 12-345 6789', email: 'ahmad@email.com', address: '123 Jalan Bukit Bintang, KL', emergencyContact: 'Fatimah binti Hassan', emergencyPhone: '+60 12-111 2222', allergies: ['Penicillin', 'Shellfish'], conditions: ['Hypertension', 'Type 2 Diabetes'], hospitals: ['hospital-kl', 'hospital-penang', 'hospital-jb', 'hospital-kuching', 'hospital-kk'] },
  { icNumber: '950320-10-1234', fullName: 'Siti Nurhaliza binti Mohd', dob: '1995-03-20', gender: 'female', bloodType: 'A+', phone: '+60 17-987 6543', email: 'siti.n@email.com', address: '45 Lorong Masjid, George Town', emergencyContact: 'Mohd Yusof', emergencyPhone: '+60 17-333 4444', allergies: ['Aspirin'], conditions: ['Asthma'], hospitals: ['hospital-penang', 'hospital-kl', 'hospital-jb'] },
  { icNumber: '550715-07-9999', fullName: 'Tan Ah Kow', dob: '1955-07-15', gender: 'male', bloodType: 'B+', phone: '+60 16-555 6666', email: 'tan.ak@email.com', address: '88 Jalan Danga, JB', emergencyContact: 'Tan Mei Ling', emergencyPhone: '+60 16-777 8888', allergies: ['Sulfa drugs'], conditions: ['Coronary Heart Disease', 'CKD'], hospitals: ['hospital-jb', 'hospital-kl', 'hospital-kuching', 'hospital-kk'] },
  { icNumber: '900808-01-5555', fullName: 'Raj Kumar a/l Muthu', dob: '1990-08-08', gender: 'male', bloodType: 'AB+', phone: '+60 19-222 3333', email: 'raj.kumar@email.com', address: '25 Jalan Padungan, Kuching', emergencyContact: 'Priya Muthu', emergencyPhone: '+60 19-444 5555', allergies: [], conditions: ['Epilepsy'], hospitals: ['hospital-kuching', 'hospital-kk', 'hospital-kl'] },
  { icNumber: '820425-12-7777', fullName: 'Aishah binti Mohd Yusof', dob: '1982-04-25', gender: 'female', bloodType: 'O-', phone: '+60 13-888 9999', email: 'aishah.y@email.com', address: '10 Jalan Gaya, Kota Kinabalu', emergencyContact: 'Mohd Yusof', emergencyPhone: '+60 13-111 2222', allergies: ['Latex'], conditions: ['Asthma'], hospitals: ['hospital-kk', 'hospital-kuching', 'hospital-penang'] },
  { icNumber: '780312-14-2345', fullName: 'Lee Mei Fong', dob: '1978-03-12', gender: 'female', bloodType: 'AB+', phone: '+60 16-789 1234', email: 'leemf@email.com', address: '88 Jalan Petaling, KL', emergencyContact: 'Lee Ah Kow', emergencyPhone: '+60 16-222 3333', allergies: ['Aspirin'], conditions: ['Rheumatoid Arthritis'], hospitals: ['hospital-kl', 'hospital-penang', 'hospital-jb'] },
  { icNumber: '750101-14-5001', fullName: 'Dr. Lim Wei Ming', dob: '1975-01-01', gender: 'male', bloodType: 'A+', phone: '+60 12-100 1001', email: 'dr.lim@klgeneral.gov.my', address: '50 Jalan Ampang, KL', emergencyContact: 'Mrs. Lim', emergencyPhone: '+60 12-200 2002', allergies: [], conditions: ['Hyperlipidemia'], hospitals: ['hospital-penang', 'hospital-jb', 'hospital-kuching'] },
  { icNumber: '760612-07-5001', fullName: 'Dr. Tan Mei Ling', dob: '1976-06-12', gender: 'female', bloodType: 'B-', phone: '+60 17-300 3003', email: 'dr.tan@penangmc.gov.my', address: '20 Gurney Drive, Penang', emergencyContact: 'Mr. Tan', emergencyPhone: '+60 17-400 4004', allergies: [], conditions: ['Migraine'], hospitals: ['hospital-kl', 'hospital-jb', 'hospital-kk'] },
  { icNumber: '770808-01-5001', fullName: 'Dr. Siti Aishah', dob: '1977-08-08', gender: 'female', bloodType: 'O+', phone: '+60 7-111 2222', email: 'dr.siti@johorspecialist.gov.my', address: '15 Jalan Tebrau, JB', emergencyContact: 'Ahmad', emergencyPhone: '+60 7-333 4444', allergies: ['Codeine'], conditions: ['Mild Hypertension'], hospitals: ['hospital-kl', 'hospital-penang', 'hospital-kuching'] },
  { icNumber: '790303-13-5001', fullName: 'Dr. James Wong', dob: '1979-03-03', gender: 'male', bloodType: 'A-', phone: '+60 82-111 2222', email: 'dr.james@sarawakgeneral.gov.my', address: '30 Jalan Tunku Abdul Rahman, Kuching', emergencyContact: 'Mrs. Wong', emergencyPhone: '+60 82-333 4444', allergies: [], conditions: ['Gout'], hospitals: ['hospital-kl', 'hospital-penang', 'hospital-kk'] },
  { icNumber: '810707-12-5001', fullName: 'Dr. Maria Gonzales', dob: '1981-07-07', gender: 'female', bloodType: 'B+', phone: '+60 88-111 2222', email: 'dr.maria@qehkk.gov.my', address: '5 Jalan Gaya, KK', emergencyContact: 'Mr. Gonzales', emergencyPhone: '+60 88-333 4444', allergies: ['NSAIDs'], conditions: ['Allergic Rhinitis'], hospitals: ['hospital-kl', 'hospital-penang', 'hospital-jb'] },
  { icNumber: '800515-14-5002', fullName: 'Dr. Sarah Tan', dob: '1980-05-15', gender: 'female', bloodType: 'O+', phone: '+60 3-555 6666', email: 'dr.sarah@klgeneral.gov.my', address: '100 KLCC, KL', emergencyContact: 'Mr. Tan', emergencyPhone: '+60 3-777 8888', allergies: [], conditions: [], hospitals: ['hospital-penang', 'hospital-jb'] },
  { icNumber: '820310-07-5002', fullName: 'Dr. Raj Kumar', dob: '1982-03-10', gender: 'male', bloodType: 'AB-', phone: '+60 4-555 6666', email: 'dr.raj@penangmc.gov.my', address: '50 Jalan Burma, Penang', emergencyContact: 'Mrs. Kumar', emergencyPhone: '+60 4-777 8888', allergies: [], conditions: [], hospitals: ['hospital-kl', 'hospital-kuching'] },
  { icNumber: '830920-01-5002', fullName: 'Dr. Ahmad Faiz', dob: '1983-09-20', gender: 'male', bloodType: 'A+', phone: '+60 7-555 6666', email: 'dr.faiz@johorspecialist.gov.my', address: '25 Jalan Stulang, JB', emergencyContact: 'Mrs. Faiz', emergencyPhone: '+60 7-777 8888', allergies: [], conditions: [], hospitals: ['hospital-kl', 'hospital-kk'] },
  { icNumber: '850115-13-5002', fullName: 'Dr. Dayang Nur', dob: '1985-01-15', gender: 'female', bloodType: 'B+', phone: '+60 82-555 6666', email: 'dr.dayang@sarawakgeneral.gov.my', address: '10 Jalan Pending, Kuching', emergencyContact: 'Mr. Nur', emergencyPhone: '+60 82-777 8888', allergies: [], conditions: [], hospitals: ['hospital-penang', 'hospital-kk'] },
  { icNumber: '860420-12-5002', fullName: 'Dr. Johnny Lai', dob: '1986-04-20', gender: 'male', bloodType: 'O-', phone: '+60 88-555 6666', email: 'dr.johnny@qehkk.gov.my', address: '15 Jalan Lintas, KK', emergencyContact: 'Mrs. Lai', emergencyPhone: '+60 88-777 8888', allergies: [], conditions: [], hospitals: ['hospital-jb', 'hospital-kuching'] },
];

const DOCTORS_BY_HOSPITAL: Record<
  HospitalId,
  Array<{ id: string; icNumber: string; fullName: string; specialization: string; department: string }>
> = {
  'hospital-kl': [
    { id: crypto.randomUUID(), icNumber: '750101-14-5001', fullName: 'Dr. Lim Wei Ming', specialization: 'Internal Medicine', department: 'General Medicine' },
    { id: crypto.randomUUID(), icNumber: '800515-14-5002', fullName: 'Dr. Sarah Tan', specialization: 'Cardiology', department: 'Cardiology' },
  ],
  'hospital-penang': [
    { id: crypto.randomUUID(), icNumber: '760612-07-5001', fullName: 'Dr. Tan Mei Ling', specialization: 'Neurology', department: 'Neurology' },
    { id: crypto.randomUUID(), icNumber: '820310-07-5002', fullName: 'Dr. Raj Kumar', specialization: 'Pediatrics', department: 'Pediatrics' },
  ],
  'hospital-jb': [
    { id: crypto.randomUUID(), icNumber: '770808-01-5001', fullName: 'Dr. Siti Aishah', specialization: 'Oncology', department: 'Oncology' },
    { id: crypto.randomUUID(), icNumber: '830920-01-5002', fullName: 'Dr. Ahmad Faiz', specialization: 'Surgery', department: 'Surgery' },
  ],
  'hospital-kuching': [
    { id: crypto.randomUUID(), icNumber: '790303-13-5001', fullName: 'Dr. James Wong', specialization: 'Nephrology', department: 'Nephrology' },
    { id: crypto.randomUUID(), icNumber: '850115-13-5002', fullName: 'Dr. Dayang Nur', specialization: 'Dermatology', department: 'Dermatology' },
  ],
  'hospital-kk': [
    { id: crypto.randomUUID(), icNumber: '810707-12-5001', fullName: 'Dr. Maria Gonzales', specialization: 'Pulmonology', department: 'Pulmonology' },
    { id: crypto.randomUUID(), icNumber: '860420-12-5002', fullName: 'Dr. Johnny Lai', specialization: 'Orthopedics', department: 'Orthopedics' },
  ],
};

const VISIT_TYPES = ['outpatient', 'inpatient', 'emergency'] as const;
const COMPLAINTS = [
  'Routine checkup',
  'Follow-up visit',
  'Chronic condition management',
  'Annual physical',
  'Specialist consultation',
];

async function seedCentral(): Promise<void> {
  const centralDb = createCentralClient();
  try {
    await centralDb.auditLog.deleteMany();
    await centralDb.patientPrivacySetting.deleteMany();
    await centralDb.patientIndexHospital.deleteMany();
    await centralDb.patientIndex.deleteMany();
    await centralDb.user.deleteMany();
    await centralDb.hospital.deleteMany();

    for (const hospital of HOSPITALS) {
      await centralDb.hospital.create({
        data: {
          id: hospital.id,
          name: hospital.name,
          shortName: hospital.shortName,
          city: hospital.city,
          state: hospital.state,
          address: hospital.address,
          phone: hospital.phone,
          email: hospital.email,
          apiEndpoint: hospital.apiEndpoint,
          isActive: true,
        },
      });
    }

    const doctorAccounts = Object.entries(DOCTORS_BY_HOSPITAL).flatMap(([hospitalId, doctors]) =>
      doctors.map((doc) => ({
        icNumber: doc.icNumber,
        role: 'doctor',
        hospitalId,
        password: 'doctor123',
      }))
    );

    const doctorIcSet = new Set(doctorAccounts.map((doc) => doc.icNumber));

    const allUsers = [
      { icNumber: 'central-admin', role: 'central_admin', hospitalId: null, password: 'central123' },
      ...HOSPITALS.map((h) => ({
        icNumber: `admin-${h.id.replace('hospital-', '')}`,
        role: 'hospital_admin',
        hospitalId: h.id,
        password: 'admin123',
      })),
      ...doctorAccounts,
      ...ALL_PATIENTS.map((p) => ({
        icNumber: p.icNumber,
        role: 'patient',
        hospitalId: null,
        password: doctorIcSet.has(p.icNumber) ? 'doctor123' : 'patient123',
      })),
    ];

    for (const user of allUsers) {
      await centralDb.user.create({
        data: {
          id: crypto.randomUUID(),
          icNumber: user.icNumber,
          role: user.role,
          hospitalId: user.hospitalId,
          passwordHash: hashPassword(user.password),
          isActive: true,
        },
      });
    }

    for (const patient of ALL_PATIENTS) {
      await centralDb.patientIndex.create({
        data: {
          icNumber: patient.icNumber,
          hospitals: {
            create: patient.hospitals.map((hospitalId) => ({ hospitalId })),
          },
        },
      });
    }
  } finally {
    await centralDb.$disconnect();
  }
}

async function seedHospitals(): Promise<void> {
  for (const hospital of HOSPITALS) {
    const hospitalDb = createHospitalClient(hospital.envVar, hospital.id);
    try {
      await hospitalDb.labReport.deleteMany();
      await hospitalDb.prescription.deleteMany();
      await hospitalDb.medicalRecord.deleteMany();
      await hospitalDb.patient.deleteMany();
      await hospitalDb.doctor.deleteMany();

      const doctors = DOCTORS_BY_HOSPITAL[hospital.id];
      for (const doctor of doctors) {
        await hospitalDb.doctor.create({
          data: {
            ...doctor,
            licenseNumber: `LIC-${doctor.icNumber.slice(0, 6)}`,
            phone: hospital.phone,
            email: `${doctor.fullName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@${hospital.id}.gov.my`,
            isActive: true,
          },
        });
      }

      const hospitalPatients = ALL_PATIENTS.filter((p) => p.hospitals.includes(hospital.id));
      for (let idx = 0; idx < hospitalPatients.length; idx++) {
        const patient = hospitalPatients[idx];
        await hospitalDb.patient.create({
          data: {
            icNumber: patient.icNumber,
            fullName: patient.fullName,
            dateOfBirth: new Date(patient.dob),
            gender: patient.gender,
            bloodType: patient.bloodType,
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            emergencyContact: patient.emergencyContact,
            emergencyPhone: patient.emergencyPhone,
            allergies: JSON.stringify(patient.allergies),
            chronicConditions: JSON.stringify(patient.conditions),
          },
        });

        const doctor = doctors[idx % doctors.length];
        if (!doctor) continue;

        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() - ((idx * 17 + hospital.port) % 120));

        await hospitalDb.medicalRecord.create({
          data: {
            id: crypto.randomUUID(),
            icNumber: patient.icNumber,
            doctorId: doctor.id,
            visitDate,
            visitType: VISIT_TYPES[idx % VISIT_TYPES.length],
            chiefComplaint: COMPLAINTS[idx % COMPLAINTS.length],
            diagnosis: JSON.stringify(
              patient.conditions.length > 0 ? patient.conditions : ['General examination']
            ),
            diagnosisCodes: JSON.stringify(['Z00.0', 'Z09']),
            symptoms: JSON.stringify(['Noted in examination']),
            notes: `Patient visited ${hospital.shortName} for medical care. Condition stable.`,
            vitalSigns: JSON.stringify({
              bloodPressureSystolic: 118 + (idx % 16),
              bloodPressureDiastolic: 74 + (idx % 12),
              heartRate: 68 + (idx % 18),
              temperature: Number((36.6 + (idx % 5) * 0.1).toFixed(1)),
              weight: 58 + (idx % 25),
              height: 160 + (idx % 20),
              oxygenSaturation: 97 + (idx % 3),
            }),
            prescriptions: {
              create: [
                {
                  medicationName: patient.conditions.includes('Hypertension')
                    ? 'Amlodipine'
                    : 'Paracetamol',
                  dosage: patient.conditions.includes('Hypertension') ? '5mg' : '500mg',
                  frequency: patient.conditions.includes('Hypertension')
                    ? 'Once daily'
                    : 'Three times daily',
                  duration: '7 days',
                  quantity: 21,
                  instructions: 'Take after meals',
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
    } finally {
      await hospitalDb.$disconnect();
    }
  }
}

async function main(): Promise<void> {
  console.log('Seeding MedLink MY databases...');
  await seedCentral();
  await seedHospitals();
  console.log(
    `Seeded ${HOSPITALS.length} hospitals, ${ALL_PATIENTS.length} patients, and ${
      Object.values(DOCTORS_BY_HOSPITAL).flat().length
    } doctors.`
  );
}

main().catch((error) => {
  console.error('Database seeding failed:', error);
  process.exit(1);
});
