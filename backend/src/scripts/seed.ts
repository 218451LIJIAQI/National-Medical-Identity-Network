import { v4 as uuidv4 } from 'uuid';
import { HOSPITALS } from '../config';
import { getHospitalDb } from '../database/hospital';
import { updatePatientIndex, createUser, initializeHospitals } from '../database/central';
import { hashPassword } from '../middleware/auth';
import { Patient, Doctor, MedicalRecord, Prescription, LabReport, VitalSigns } from '../types';

console.log('🌱 Seeding database with demo data...\n');

// Initialize hospitals in central registry
initializeHospitals();
console.log('✅ Hospitals registered in central hub\n');

// ============================================================================
// Demo Patients
// ============================================================================

const patients: Patient[] = [
  {
    icNumber: '880101-14-5678',
    fullName: 'Ahmad bin Abdullah',
    dateOfBirth: '1988-01-01',
    gender: 'male',
    bloodType: 'O+',
    phone: '+60 12-345 6789',
    email: 'ahmad.abdullah@email.com',
    address: '123 Jalan Merdeka, 50000 Kuala Lumpur',
    emergencyContact: 'Fatimah binti Hassan',
    emergencyPhone: '+60 12-987 6543',
    allergies: ['Penicillin', 'Shellfish'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    createdAt: '2020-01-15T08:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
  },
  {
    icNumber: '950320-10-1234',
    fullName: 'Siti Nurhaliza binti Tarudin',
    dateOfBirth: '1995-03-20',
    gender: 'female',
    bloodType: 'A+',
    phone: '+60 13-456 7890',
    email: 'siti.nurhaliza@email.com',
    address: '456 Jalan Putra, 10050 George Town, Penang',
    emergencyContact: 'Razak bin Tarudin',
    emergencyPhone: '+60 13-111 2222',
    allergies: [],
    chronicConditions: [],
    createdAt: '2022-06-10T09:00:00Z',
    updatedAt: '2024-11-15T14:00:00Z',
  },
  {
    icNumber: '550715-07-9999',
    fullName: 'Tan Ah Kow',
    dateOfBirth: '1955-07-15',
    gender: 'male',
    bloodType: 'B+',
    phone: '+60 14-567 8901',
    email: 'tan.ahkow@email.com',
    address: '789 Jalan Besar, 80000 Johor Bahru',
    emergencyContact: 'Tan Mei Ling',
    emergencyPhone: '+60 14-222 3333',
    allergies: ['Aspirin', 'Sulfa drugs'],
    chronicConditions: ['Coronary Artery Disease', 'Hypertension', 'Hyperlipidemia', 'Chronic Kidney Disease Stage 3'],
    createdAt: '2015-03-20T07:00:00Z',
    updatedAt: '2024-12-05T11:00:00Z',
  },
  {
    icNumber: '900808-01-5555',
    fullName: 'Raj Kumar a/l Subramaniam',
    dateOfBirth: '1990-08-08',
    gender: 'male',
    bloodType: 'AB+',
    phone: '+60 15-678 9012',
    email: 'raj.kumar@email.com',
    address: '321 Jalan India, 93000 Kuching, Sarawak',
    emergencyContact: 'Priya Subramaniam',
    emergencyPhone: '+60 15-333 4444',
    allergies: [],
    chronicConditions: ['Anxiety Disorder'],
    createdAt: '2021-09-05T10:00:00Z',
    updatedAt: '2024-10-20T16:00:00Z',
  },
  {
    icNumber: '820425-12-7777',
    fullName: 'Aishah binti Mohd Yusof',
    dateOfBirth: '1982-04-25',
    gender: 'female',
    bloodType: 'O-',
    phone: '+60 16-789 0123',
    email: 'aishah.yusof@email.com',
    address: '654 Jalan Kinabalu, 88000 Kota Kinabalu, Sabah',
    emergencyContact: 'Mohd Yusof bin Ahmad',
    emergencyPhone: '+60 16-444 5555',
    allergies: ['Latex'],
    chronicConditions: ['Asthma'],
    createdAt: '2019-11-11T08:00:00Z',
    updatedAt: '2024-11-30T09:00:00Z',
  },
];

// ============================================================================
// Demo Doctors (per hospital)
// ============================================================================

const doctorsPerHospital: Record<string, Doctor[]> = {
  'hospital-kl': [
    {
      id: 'doc-kl-001',
      icNumber: '750101-14-5001',
      fullName: 'Dr. Lim Wei Ming',
      specialization: 'Internal Medicine',
      licenseNumber: 'MMC-12345',
      hospitalId: 'hospital-kl',
      department: 'General Medicine',
      phone: '+60 3-2615 5001',
      email: 'dr.lim@klgeneral.gov.my',
      isActive: true,
    },
    {
      id: 'doc-kl-002',
      icNumber: '780515-14-5002',
      fullName: 'Dr. Nurul Huda binti Ismail',
      specialization: 'Cardiology',
      licenseNumber: 'MMC-23456',
      hospitalId: 'hospital-kl',
      department: 'Cardiology',
      phone: '+60 3-2615 5002',
      email: 'dr.nurul@klgeneral.gov.my',
      isActive: true,
    },
    {
      id: 'doc-kl-003',
      icNumber: '800220-14-5003',
      fullName: 'Dr. Ravi a/l Krishnan',
      specialization: 'Endocrinology',
      licenseNumber: 'MMC-34567',
      hospitalId: 'hospital-kl',
      department: 'Endocrinology',
      phone: '+60 3-2615 5003',
      email: 'dr.ravi@klgeneral.gov.my',
      isActive: true,
    },
  ],
  'hospital-penang': [
    {
      id: 'doc-pg-001',
      icNumber: '760612-07-5001',
      fullName: 'Dr. Ong Chee Keong',
      specialization: 'General Surgery',
      licenseNumber: 'MMC-45678',
      hospitalId: 'hospital-penang',
      department: 'Surgery',
      phone: '+60 4-222 5001',
      email: 'dr.ong@penanggeneral.gov.my',
      isActive: true,
    },
    {
      id: 'doc-pg-002',
      icNumber: '820930-07-5002',
      fullName: 'Dr. Fatimah binti Zainal',
      specialization: 'Obstetrics & Gynecology',
      licenseNumber: 'MMC-56789',
      hospitalId: 'hospital-penang',
      department: 'O&G',
      phone: '+60 4-222 5002',
      email: 'dr.fatimah@penanggeneral.gov.my',
      isActive: true,
    },
  ],
  'hospital-jb': [
    {
      id: 'doc-jb-001',
      icNumber: '770808-01-5001',
      fullName: 'Dr. Muhammad Hafiz bin Razak',
      specialization: 'Nephrology',
      licenseNumber: 'MMC-67890',
      hospitalId: 'hospital-jb',
      department: 'Nephrology',
      phone: '+60 7-223 5001',
      email: 'dr.hafiz@hsajb.gov.my',
      isActive: true,
    },
    {
      id: 'doc-jb-002',
      icNumber: '850415-01-5002',
      fullName: 'Dr. Lee Siew Mei',
      specialization: 'Neurology',
      licenseNumber: 'MMC-78901',
      hospitalId: 'hospital-jb',
      department: 'Neurology',
      phone: '+60 7-223 5002',
      email: 'dr.lee@hsajb.gov.my',
      isActive: true,
    },
  ],
  'hospital-kuching': [
    {
      id: 'doc-kch-001',
      icNumber: '790303-13-5001',
      fullName: 'Dr. Wong Siew Ling',
      specialization: 'Psychiatry',
      licenseNumber: 'MMC-89012',
      hospitalId: 'hospital-kuching',
      department: 'Psychiatry',
      phone: '+60 82-276 5001',
      email: 'dr.wong@sghkuching.gov.my',
      isActive: true,
    },
  ],
  'hospital-kk': [
    {
      id: 'doc-kk-001',
      icNumber: '810707-12-5001',
      fullName: 'Dr. Azizah binti Abdullah',
      specialization: 'Pulmonology',
      licenseNumber: 'MMC-90123',
      hospitalId: 'hospital-kk',
      department: 'Respiratory Medicine',
      phone: '+60 88-517 5001',
      email: 'dr.azizah@qehkk.gov.my',
      isActive: true,
    },
  ],
};

// ============================================================================
// Demo Medical Records
// ============================================================================

interface RecordData {
  patient: string;
  hospital: string;
  doctor: string;
  record: Partial<MedicalRecord>;
}

const medicalRecords: RecordData[] = [
  // Ahmad's records across multiple hospitals
  {
    patient: '880101-14-5678',
    hospital: 'hospital-kl',
    doctor: 'doc-kl-001',
    record: {
      visitDate: '2024-01-15T09:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Routine follow-up for hypertension and diabetes',
      diagnosis: ['Essential Hypertension', 'Type 2 Diabetes Mellitus'],
      diagnosisCodes: ['I10', 'E11.9'],
      symptoms: ['Occasional headaches', 'Fatigue'],
      notes: 'BP well controlled at 130/85. HbA1c slightly elevated at 7.2%. Advised dietary modifications.',
      vitalSigns: {
        bloodPressureSystolic: 130,
        bloodPressureDiastolic: 85,
        heartRate: 78,
        temperature: 36.8,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 75,
        height: 170,
      },
      prescriptions: [
        { medicationName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning', isActive: true },
        { medicationName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months', quantity: 180, instructions: 'Take with meals', isActive: true },
      ],
    },
  },
  {
    patient: '880101-14-5678',
    hospital: 'hospital-kl',
    doctor: 'doc-kl-002',
    record: {
      visitDate: '2024-06-20T10:30:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Referred for cardiac evaluation',
      diagnosis: ['Hypertensive Heart Disease'],
      diagnosisCodes: ['I11.9'],
      symptoms: ['Occasional palpitations', 'Mild shortness of breath on exertion'],
      notes: 'ECG shows left ventricular hypertrophy. Echo ordered. Started on ACE inhibitor.',
      vitalSigns: {
        bloodPressureSystolic: 142,
        bloodPressureDiastolic: 92,
        heartRate: 82,
        temperature: 36.6,
        respiratoryRate: 18,
        oxygenSaturation: 97,
        weight: 76,
        height: 170,
      },
      prescriptions: [
        { medicationName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning', isActive: true },
      ],
    },
  },
  {
    patient: '880101-14-5678',
    hospital: 'hospital-penang',
    doctor: 'doc-pg-001',
    record: {
      visitDate: '2024-03-10T14:00:00Z',
      visitType: 'emergency',
      chiefComplaint: 'Acute abdominal pain',
      diagnosis: ['Acute Appendicitis'],
      diagnosisCodes: ['K35.80'],
      symptoms: ['Severe right lower quadrant pain', 'Nausea', 'Loss of appetite', 'Low-grade fever'],
      notes: 'Patient presented with classic appendicitis symptoms. CT confirmed diagnosis. Emergency appendectomy performed successfully.',
      vitalSigns: {
        bloodPressureSystolic: 138,
        bloodPressureDiastolic: 88,
        heartRate: 98,
        temperature: 38.2,
        respiratoryRate: 20,
        oxygenSaturation: 96,
        weight: 75,
        height: 170,
      },
      prescriptions: [
        { medicationName: 'Cefuroxime', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', quantity: 14, instructions: 'Complete the course', isActive: false },
        { medicationName: 'Paracetamol', dosage: '1000mg', frequency: 'Every 6 hours as needed', duration: '5 days', quantity: 20, instructions: 'For pain relief', isActive: false },
      ],
    },
  },
  {
    patient: '880101-14-5678',
    hospital: 'hospital-jb',
    doctor: 'doc-jb-001',
    record: {
      visitDate: '2024-09-05T11:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Kidney function follow-up',
      diagnosis: ['Chronic Kidney Disease Stage 2', 'Diabetic Nephropathy'],
      diagnosisCodes: ['N18.2', 'E11.21'],
      symptoms: ['Mild fatigue', 'Occasional swelling in ankles'],
      notes: 'eGFR at 68. Proteinuria present. Emphasized strict BP and glucose control. Avoid NSAIDs.',
      vitalSigns: {
        bloodPressureSystolic: 135,
        bloodPressureDiastolic: 88,
        heartRate: 76,
        temperature: 36.7,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 77,
        height: 170,
      },
      labReports: [
        { testType: 'Renal Panel', testName: 'Serum Creatinine', result: '1.4', unit: 'mg/dL', referenceRange: '0.7-1.3', isAbnormal: true, reportDate: '2024-09-05', notes: 'Mildly elevated' },
        { testType: 'Renal Panel', testName: 'eGFR', result: '68', unit: 'mL/min/1.73m²', referenceRange: '>90', isAbnormal: true, reportDate: '2024-09-05', notes: 'CKD Stage 2' },
        { testType: 'Urinalysis', testName: 'Urine Protein', result: 'Positive', unit: '', referenceRange: 'Negative', isAbnormal: true, reportDate: '2024-09-05', notes: 'Indicates proteinuria' },
      ],
    },
  },
  
  // Siti's records
  {
    patient: '950320-10-1234',
    hospital: 'hospital-penang',
    doctor: 'doc-pg-002',
    record: {
      visitDate: '2024-08-15T09:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Annual health screening',
      diagnosis: ['General Medical Examination'],
      diagnosisCodes: ['Z00.00'],
      symptoms: [],
      notes: 'Healthy young adult. All screening results normal. Advised to maintain healthy lifestyle.',
      vitalSigns: {
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 75,
        heartRate: 72,
        temperature: 36.5,
        respiratoryRate: 14,
        oxygenSaturation: 99,
        weight: 55,
        height: 160,
      },
      labReports: [
        { testType: 'Complete Blood Count', testName: 'Hemoglobin', result: '13.2', unit: 'g/dL', referenceRange: '12.0-16.0', isAbnormal: false, reportDate: '2024-08-15', notes: 'Normal' },
        { testType: 'Lipid Panel', testName: 'Total Cholesterol', result: '180', unit: 'mg/dL', referenceRange: '<200', isAbnormal: false, reportDate: '2024-08-15', notes: 'Normal' },
      ],
    },
  },
  
  // Tan Ah Kow's extensive records (elderly with multiple conditions)
  {
    patient: '550715-07-9999',
    hospital: 'hospital-jb',
    doctor: 'doc-jb-001',
    record: {
      visitDate: '2024-11-20T10:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Routine nephrology follow-up',
      diagnosis: ['Chronic Kidney Disease Stage 3B', 'Hypertension', 'Coronary Artery Disease'],
      diagnosisCodes: ['N18.32', 'I10', 'I25.10'],
      symptoms: ['Mild fatigue', 'Occasional shortness of breath'],
      notes: 'eGFR stable at 38. Continue current medications. Avoid contrast agents. Follow up in 3 months.',
      vitalSigns: {
        bloodPressureSystolic: 145,
        bloodPressureDiastolic: 85,
        heartRate: 68,
        temperature: 36.6,
        respiratoryRate: 18,
        oxygenSaturation: 95,
        weight: 68,
        height: 165,
      },
      prescriptions: [
        { medicationName: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'For kidney protection', isActive: true },
        { medicationName: 'Furosemide', dosage: '40mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Take in the morning', isActive: true },
      ],
    },
  },
  {
    patient: '550715-07-9999',
    hospital: 'hospital-kl',
    doctor: 'doc-kl-002',
    record: {
      visitDate: '2024-10-10T09:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Cardiology follow-up post-stent placement',
      diagnosis: ['Status Post Coronary Stent Placement', 'Coronary Artery Disease'],
      diagnosisCodes: ['Z95.5', 'I25.10'],
      symptoms: ['No chest pain', 'No shortness of breath at rest'],
      notes: 'Patient doing well 6 months post-PCI. Dual antiplatelet therapy continued. Echo shows preserved EF at 55%.',
      vitalSigns: {
        bloodPressureSystolic: 138,
        bloodPressureDiastolic: 82,
        heartRate: 65,
        temperature: 36.5,
        respiratoryRate: 16,
        oxygenSaturation: 96,
        weight: 67,
        height: 165,
      },
      prescriptions: [
        { medicationName: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '12 months', quantity: 30, instructions: 'Do not stop without consulting doctor', isActive: true },
        { medicationName: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at night', duration: '3 months', quantity: 90, instructions: 'For cholesterol control', isActive: true },
      ],
    },
  },
  {
    patient: '550715-07-9999',
    hospital: 'hospital-penang',
    doctor: 'doc-pg-001',
    record: {
      visitDate: '2024-05-15T11:00:00Z',
      visitType: 'inpatient',
      chiefComplaint: 'Elective hernia repair',
      diagnosis: ['Inguinal Hernia'],
      diagnosisCodes: ['K40.90'],
      symptoms: ['Groin bulge', 'Mild discomfort'],
      notes: 'Laparoscopic inguinal hernia repair performed without complications. Discharged on day 2.',
      vitalSigns: {
        bloodPressureSystolic: 140,
        bloodPressureDiastolic: 85,
        heartRate: 72,
        temperature: 36.7,
        respiratoryRate: 16,
        oxygenSaturation: 97,
        weight: 69,
        height: 165,
      },
    },
  },
  {
    patient: '550715-07-9999',
    hospital: 'hospital-kuching',
    doctor: 'doc-kch-001',
    record: {
      visitDate: '2024-02-20T14:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Feeling low mood, difficulty sleeping',
      diagnosis: ['Adjustment Disorder with Depressed Mood'],
      diagnosisCodes: ['F43.21'],
      symptoms: ['Low mood', 'Insomnia', 'Loss of interest', 'Fatigue'],
      notes: 'Patient experiencing stress related to health issues. Started on low-dose antidepressant. Referred for counseling.',
      vitalSigns: {
        bloodPressureSystolic: 142,
        bloodPressureDiastolic: 88,
        heartRate: 78,
        temperature: 36.6,
        respiratoryRate: 16,
        oxygenSaturation: 97,
        weight: 68,
        height: 165,
      },
      prescriptions: [
        { medicationName: 'Sertraline', dosage: '25mg', frequency: 'Once daily', duration: '2 months', quantity: 60, instructions: 'May cause drowsiness initially', isActive: true },
      ],
    },
  },
  {
    patient: '550715-07-9999',
    hospital: 'hospital-kk',
    doctor: 'doc-kk-001',
    record: {
      visitDate: '2024-07-08T10:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Persistent cough for 2 weeks',
      diagnosis: ['Acute Bronchitis'],
      diagnosisCodes: ['J20.9'],
      symptoms: ['Productive cough', 'Mild wheezing', 'No fever'],
      notes: 'Chest X-ray clear. Likely viral bronchitis. Symptomatic treatment prescribed.',
      vitalSigns: {
        bloodPressureSystolic: 140,
        bloodPressureDiastolic: 84,
        heartRate: 80,
        temperature: 36.8,
        respiratoryRate: 20,
        oxygenSaturation: 96,
        weight: 68,
        height: 165,
      },
      prescriptions: [
        { medicationName: 'Bromhexine', dosage: '8mg', frequency: 'Three times daily', duration: '7 days', quantity: 21, instructions: 'To loosen phlegm', isActive: false },
      ],
    },
  },
  
  // Raj's records (including sensitive mental health)
  {
    patient: '900808-01-5555',
    hospital: 'hospital-kuching',
    doctor: 'doc-kch-001',
    record: {
      visitDate: '2024-10-15T15:00:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Anxiety follow-up',
      diagnosis: ['Generalized Anxiety Disorder'],
      diagnosisCodes: ['F41.1'],
      symptoms: ['Excessive worry', 'Difficulty concentrating', 'Sleep disturbance'],
      notes: 'Patient reports improvement with current medication and therapy. Continue current regimen.',
      vitalSigns: {
        bloodPressureSystolic: 122,
        bloodPressureDiastolic: 78,
        heartRate: 76,
        temperature: 36.6,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 72,
        height: 175,
      },
      prescriptions: [
        { medicationName: 'Escitalopram', dosage: '10mg', frequency: 'Once daily', duration: '3 months', quantity: 90, instructions: 'Continue as prescribed', isActive: true },
      ],
    },
  },
  
  // Aishah's records
  {
    patient: '820425-12-7777',
    hospital: 'hospital-kk',
    doctor: 'doc-kk-001',
    record: {
      visitDate: '2024-11-10T09:30:00Z',
      visitType: 'outpatient',
      chiefComplaint: 'Asthma review',
      diagnosis: ['Mild Persistent Asthma'],
      diagnosisCodes: ['J45.30'],
      symptoms: ['Occasional wheeze', 'Nocturnal cough 1-2x per week'],
      notes: 'Asthma partially controlled. Step up to combination inhaler. Review technique.',
      vitalSigns: {
        bloodPressureSystolic: 115,
        bloodPressureDiastolic: 72,
        heartRate: 74,
        temperature: 36.5,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 58,
        height: 162,
      },
      prescriptions: [
        { medicationName: 'Budesonide/Formoterol', dosage: '160/4.5mcg', frequency: 'Twice daily', duration: '3 months', quantity: 2, instructions: 'Rinse mouth after use', isActive: true },
        { medicationName: 'Salbutamol MDI', dosage: '100mcg', frequency: 'As needed', duration: '3 months', quantity: 1, instructions: 'For rescue use only', isActive: true },
      ],
    },
  },
  {
    patient: '820425-12-7777',
    hospital: 'hospital-kl',
    doctor: 'doc-kl-001',
    record: {
      visitDate: '2024-04-22T11:00:00Z',
      visitType: 'emergency',
      chiefComplaint: 'Acute asthma exacerbation',
      diagnosis: ['Acute Asthma Exacerbation'],
      diagnosisCodes: ['J45.901'],
      symptoms: ['Severe shortness of breath', 'Wheezing', 'Chest tightness', 'Unable to speak full sentences'],
      notes: 'Patient presented with severe asthma attack. Treated with nebulized bronchodilators and systemic steroids. Responded well. Discharged after 4 hours observation.',
      vitalSigns: {
        bloodPressureSystolic: 130,
        bloodPressureDiastolic: 85,
        heartRate: 110,
        temperature: 36.8,
        respiratoryRate: 28,
        oxygenSaturation: 91,
        weight: 58,
        height: 162,
      },
      prescriptions: [
        { medicationName: 'Prednisolone', dosage: '40mg', frequency: 'Once daily', duration: '5 days', quantity: 5, instructions: 'Take with food', isActive: false },
      ],
    },
  },
];

// ============================================================================
// Create Users for Authentication
// ============================================================================

const users = [
  // Doctors
  { icNumber: '750101-14-5001', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-kl' },
  { icNumber: '780515-14-5002', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-kl' },
  { icNumber: '800220-14-5003', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-kl' },
  { icNumber: '760612-07-5001', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-penang' },
  { icNumber: '820930-07-5002', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-penang' },
  { icNumber: '770808-01-5001', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-jb' },
  { icNumber: '850415-01-5002', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-jb' },
  { icNumber: '790303-13-5001', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-kuching' },
  { icNumber: '810707-12-5001', password: 'doctor123', role: 'doctor' as const, hospitalId: 'hospital-kk' },
  
  // Patients
  { icNumber: '880101-14-5678', password: 'patient123', role: 'patient' as const, hospitalId: 'hospital-kl' },
  { icNumber: '950320-10-1234', password: 'patient123', role: 'patient' as const, hospitalId: 'hospital-penang' },
  { icNumber: '550715-07-9999', password: 'patient123', role: 'patient' as const, hospitalId: 'hospital-jb' },
  { icNumber: '900808-01-5555', password: 'patient123', role: 'patient' as const, hospitalId: 'hospital-kuching' },
  { icNumber: '820425-12-7777', password: 'patient123', role: 'patient' as const, hospitalId: 'hospital-kk' },
  
  // Hospital Admins
  { icNumber: 'admin-kl', password: 'admin123', role: 'hospital_admin' as const, hospitalId: 'hospital-kl' },
  { icNumber: 'admin-penang', password: 'admin123', role: 'hospital_admin' as const, hospitalId: 'hospital-penang' },
  { icNumber: 'admin-jb', password: 'admin123', role: 'hospital_admin' as const, hospitalId: 'hospital-jb' },
  { icNumber: 'admin-kuching', password: 'admin123', role: 'hospital_admin' as const, hospitalId: 'hospital-kuching' },
  { icNumber: 'admin-kk', password: 'admin123', role: 'hospital_admin' as const, hospitalId: 'hospital-kk' },
  
  // Central Admin
  { icNumber: 'central-admin', password: 'central123', role: 'central_admin' as const, hospitalId: undefined },
];

// ============================================================================
// Seed the Database
// ============================================================================

// 1. Create users
console.log('Creating users...');
users.forEach(user => {
  try {
    createUser({
      id: uuidv4(),
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
      passwordHash: hashPassword(user.password),
      isActive: true,
    });
    console.log(`  ✓ Created user: ${user.icNumber} (${user.role})`);
  } catch (error) {
    console.log(`  ⚠ User ${user.icNumber} may already exist`);
  }
});
console.log('');

// 2. Create doctors in each hospital
console.log('Creating doctors...');
Object.entries(doctorsPerHospital).forEach(([hospitalId, doctors]) => {
  const hospitalDb = getHospitalDb(hospitalId);
  const hospital = HOSPITALS.find(h => h.id === hospitalId);
  console.log(`  ${hospital?.name || hospitalId}:`);
  
  doctors.forEach(doctor => {
    hospitalDb.createDoctor(doctor);
    console.log(`    ✓ ${doctor.fullName} - ${doctor.specialization}`);
  });
});
console.log('');

// 3. Create patients and their records
console.log('Creating patients and medical records...');
patients.forEach(patient => {
  console.log(`  Patient: ${patient.fullName} (${patient.icNumber})`);
  
  // Find which hospitals this patient has records in
  const patientRecords = medicalRecords.filter(r => r.patient === patient.icNumber);
  const hospitals = [...new Set(patientRecords.map(r => r.hospital))];
  
  // Create patient in each hospital they have records
  hospitals.forEach(hospitalId => {
    const hospitalDb = getHospitalDb(hospitalId);
    hospitalDb.createPatient(patient);
    updatePatientIndex(patient.icNumber, hospitalId);
    
    const hospitalName = HOSPITALS.find(h => h.id === hospitalId)?.shortName || hospitalId;
    console.log(`    ✓ Registered at ${hospitalName}`);
  });
  
  // Create medical records
  patientRecords.forEach(recordData => {
    const hospitalDb = getHospitalDb(recordData.hospital);
    const recordId = uuidv4();
    
    const prescriptions = recordData.record.prescriptions?.map(p => ({
      ...p,
      id: uuidv4(),
      recordId,
    })) as Prescription[] | undefined;
    
    const labReports = recordData.record.labReports?.map(l => ({
      ...l,
      id: uuidv4(),
      recordId,
    })) as LabReport[] | undefined;
    
    hospitalDb.createMedicalRecord({
      id: recordId,
      icNumber: patient.icNumber,
      hospitalId: recordData.hospital,
      doctorId: recordData.doctor,
      visitDate: recordData.record.visitDate || new Date().toISOString(),
      visitType: recordData.record.visitType || 'outpatient',
      chiefComplaint: recordData.record.chiefComplaint || '',
      diagnosis: recordData.record.diagnosis || [],
      diagnosisCodes: recordData.record.diagnosisCodes || [],
      symptoms: recordData.record.symptoms || [],
      notes: recordData.record.notes || '',
      vitalSigns: recordData.record.vitalSigns,
      prescriptions,
      labReports,
      followUpDate: recordData.record.followUpDate,
      createdAt: recordData.record.visitDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    const hospitalName = HOSPITALS.find(h => h.id === recordData.hospital)?.shortName || recordData.hospital;
    console.log(`      📋 ${recordData.record.visitDate?.split('T')[0]} - ${hospitalName}: ${recordData.record.diagnosis?.[0] || 'Visit'}`);
  });
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ Database seeding completed!');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Demo Accounts:');
console.log('─────────────────────────────────────────────────────────────────');
console.log('Doctor (KL):      IC: 750101-14-5001    Password: doctor123');
console.log('Patient (Ahmad):  IC: 880101-14-5678    Password: patient123');
console.log('Hospital Admin:   IC: admin-kl          Password: admin123');
console.log('Central Admin:    IC: central-admin     Password: central123');
console.log('─────────────────────────────────────────────────────────────────');
console.log('');
