import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { HOSPITALS, hashPassword, verifyPassword } from '../src/config';
import { setDbClientsForTesting } from '../src/database/db-manager';
import { resetHospitalDbCache } from '../src/database/hospital-db';
import { resetEmergencyRateLimitsForTesting } from '../src/routes/central';
import { createApp } from '../src/app';

function createInMemoryFederationFixture() {
  const hospitals = HOSPITALS.map((h) => ({
    id: h.id,
    name: h.name,
    shortName: h.shortName,
    city: h.city,
    state: h.state,
    address: h.address,
    phone: h.phone,
    email: h.email,
    apiEndpoint: h.apiEndpoint,
    isActive: true,
  }));

  const users = [
    {
      id: 'user-patient-ahmad',
      icNumber: '880101-14-5678',
      role: 'patient',
      hospitalId: null as string | null,
      passwordHash: hashPassword('patient123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-patient-siti',
      icNumber: '950320-10-1234',
      role: 'patient',
      hospitalId: null as string | null,
      passwordHash: hashPassword('patient123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-doc-lim-doctor',
      icNumber: '750101-14-5001',
      role: 'doctor',
      hospitalId: 'hospital-kl',
      passwordHash: hashPassword('doctor123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-doc-lim-patient',
      icNumber: '750101-14-5001',
      role: 'patient',
      hospitalId: null as string | null,
      passwordHash: hashPassword('doctor123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-doc-penang',
      icNumber: '760612-07-5001',
      role: 'doctor',
      hospitalId: 'hospital-penang',
      passwordHash: hashPassword('doctor123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-admin-kl',
      icNumber: 'admin-kl',
      role: 'hospital_admin',
      hospitalId: 'hospital-kl',
      passwordHash: hashPassword('admin123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
    {
      id: 'user-central-admin',
      icNumber: 'central-admin',
      role: 'central_admin',
      hospitalId: null as string | null,
      passwordHash: hashPassword('central123'),
      lastLogin: null as Date | null,
      isActive: true,
    },
  ];

  const patientIndexes = new Map<string, { icNumber: string; lastUpdated: Date; hospitals: Set<string> }>([
    [
      '880101-14-5678',
      {
        icNumber: '880101-14-5678',
        lastUpdated: new Date('2026-01-10T08:00:00Z'),
        hospitals: new Set(['hospital-kl', 'hospital-penang']),
      },
    ],
    [
      '950320-10-1234',
      {
        icNumber: '950320-10-1234',
        lastUpdated: new Date('2026-01-11T08:00:00Z'),
        hospitals: new Set(['hospital-penang']),
      },
    ],
  ]);

  const privacySettings = new Map<string, { icNumber: string; hospitalId: string; isBlocked: boolean }>();
  const auditLogs: Array<{
    id: string;
    timestamp: Date;
    action: string;
    actorId: string | null;
    actorType: string;
    actorHospitalId: string | null;
    targetIcNumber: string | null;
    targetHospitalId: string | null;
    details: string | null;
    ipAddress: string | null;
    success: boolean;
  }> = [];

  const centralMock = {
    hospital: {
      findMany: async () => hospitals,
      count: async () => hospitals.length,
      upsert: async () => ({}),
    },
    user: {
      findFirst: async ({ where }: any) =>
        users.find(
          (u) =>
            u.icNumber === where.icNumber &&
            (where.isActive === undefined || u.isActive === where.isActive) &&
            (!where.role || u.role === where.role)
        ) || null,
      findMany: async ({ where }: any) => {
        if (where?.id?.in) {
          return users.filter((u) => where.id.in.includes(u.id));
        }
        return users.filter(
          (u) =>
            u.icNumber === where.icNumber &&
            (where.isActive === undefined || u.isActive === where.isActive)
        );
      },
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) || null,
      update: async ({ where, data }: any) => {
        const u = users.find((item) => item.id === where.id);
        if (u && data.lastLogin) u.lastLogin = data.lastLogin;
        return u;
      },
    },
    patientIndex: {
      findUnique: async ({ where }: any) => {
        const entry = patientIndexes.get(where.icNumber);
        if (!entry) return null;
        return {
          icNumber: entry.icNumber,
          lastUpdated: entry.lastUpdated,
          hospitals: Array.from(entry.hospitals).map((hospitalId) => ({ hospitalId })),
        };
      },
      findMany: async () =>
        Array.from(patientIndexes.values()).map((entry) => ({
          icNumber: entry.icNumber,
          lastUpdated: entry.lastUpdated,
          hospitals: Array.from(entry.hospitals).map((hospitalId) => ({ hospitalId })),
        })),
      create: async ({ data }: any) => {
        const set = new Set<string>();
        if (data.hospitals?.create?.hospitalId) {
          set.add(data.hospitals.create.hospitalId);
        }
        patientIndexes.set(data.icNumber, {
          icNumber: data.icNumber,
          lastUpdated: new Date(),
          hospitals: set,
        });
      },
      update: async ({ where, data }: any) => {
        const entry = patientIndexes.get(where.icNumber);
        if (entry && data.lastUpdated) entry.lastUpdated = data.lastUpdated;
      },
      count: async () => patientIndexes.size,
    },
    patientIndexHospital: {
      create: async ({ data }: any) => {
        const entry = patientIndexes.get(data.icNumber);
        if (entry) entry.hospitals.add(data.hospitalId);
      },
    },
    patientPrivacySetting: {
      findMany: async ({ where }: any) =>
        Array.from(privacySettings.values()).filter(
          (s) =>
            s.icNumber === where.icNumber &&
            (where.isBlocked === undefined || s.isBlocked === where.isBlocked)
        ),
      upsert: async ({ where, update, create }: any) => {
        const key = `${where.icNumber_hospitalId.icNumber}:${where.icNumber_hospitalId.hospitalId}`;
        const existing = privacySettings.get(key);
        if (existing) {
          existing.isBlocked = update.isBlocked;
        } else {
          privacySettings.set(key, { ...create });
        }
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.unshift({
          id: crypto.randomUUID(),
          ...data,
        });
      },
      findMany: async ({ where, take }: any) => {
        return auditLogs
          .filter((log) => {
            if (where?.actorId && log.actorId !== where.actorId) return false;
            if (where?.targetIcNumber && log.targetIcNumber !== where.targetIcNumber) return false;
            if (where?.OR) {
              const matchesOr = where.OR.some(
                (cond: any) =>
                  (cond.actorHospitalId && log.actorHospitalId === cond.actorHospitalId) ||
                  (cond.targetHospitalId && log.targetHospitalId === cond.targetHospitalId)
              );
              if (!matchesOr) return false;
            }
            return true;
          })
          .slice(0, take || 100);
      },
      count: async ({ where }: any) =>
        auditLogs.filter((log) => {
          if (where?.action && log.action !== where.action) return false;
          if (where?.timestamp?.gte && log.timestamp < where.timestamp.gte) return false;
          if (where?.timestamp?.lt && log.timestamp >= where.timestamp.lt) return false;
          return true;
        }).length,
    },
    $disconnect: async () => {},
  };

  function makeHospitalNode(hospitalId: string) {
    const doctors = [
      hospitalId === 'hospital-kl'
        ? {
            id: 'doc-kl-1',
            icNumber: '750101-14-5001',
            fullName: 'Dr. Lim Wei Ming',
            specialization: 'Internal Medicine',
            licenseNumber: 'MMC-1001',
            department: 'General Medicine',
            phone: '+60 3-2615 5555',
            email: 'lim@klgh.gov.my',
            isActive: true,
          }
        : {
            id: `doc-${hospitalId}-1`,
            icNumber: hospitalId === 'hospital-penang' ? '760612-07-5001' : `770000-00-${hospitalId.length}`,
            fullName: hospitalId === 'hospital-penang' ? 'Dr. Tan Mei Ling' : `Dr. ${hospitalId}`,
            specialization: 'Neurology',
            licenseNumber: 'MMC-2002',
            department: 'Neurology',
            phone: '+60 4-222 5333',
            email: `doc@${hospitalId}.gov.my`,
            isActive: true,
          },
    ];

    const patients = new Map<string, any>();
    if (hospitalId === 'hospital-kl' || hospitalId === 'hospital-penang') {
      patients.set('880101-14-5678', {
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
        chronicConditions: JSON.stringify(['Hypertension']),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
    }
    if (hospitalId === 'hospital-penang') {
      patients.set('950320-10-1234', {
        icNumber: '950320-10-1234',
        fullName: 'Siti Nurhaliza binti Mohd',
        dateOfBirth: new Date('1995-03-20'),
        gender: 'female',
        bloodType: 'A+',
        phone: '+60 17-987 6543',
        email: 'siti@email.com',
        address: '45 Lorong Masjid, Penang',
        emergencyContact: 'Mohd Yusof',
        emergencyPhone: '+60 17-333 4444',
        allergies: JSON.stringify(['Aspirin']),
        chronicConditions: JSON.stringify(['Asthma']),
        createdAt: new Date('2025-02-01T00:00:00Z'),
        updatedAt: new Date('2025-02-01T00:00:00Z'),
      });
    }

    const records: any[] =
      hospitalId === 'hospital-kl' || hospitalId === 'hospital-penang'
        ? [
            {
              id: `rec-${hospitalId}-1`,
              icNumber: '880101-14-5678',
              doctorId: doctors[0].id,
              visitDate: new Date(),
              visitType: 'outpatient',
              chiefComplaint: 'Blood pressure follow-up',
              diagnosis: JSON.stringify(['Hypertension']),
              diagnosisCodes: JSON.stringify(['I10']),
              symptoms: JSON.stringify(['Mild headache']),
              notes: 'Stable on Amlodipine',
              vitalSigns: JSON.stringify({ bloodPressureSystolic: 128, bloodPressureDiastolic: 82 }),
              followUpDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              doctor: { fullName: doctors[0].fullName },
              prescriptions: [
                {
                  id: `rx-${hospitalId}-1`,
                  recordId: `rec-${hospitalId}-1`,
                  medicationName: 'Amlodipine',
                  dosage: '5mg',
                  frequency: 'Once daily',
                  duration: '30 days',
                  quantity: 30,
                  instructions: 'After breakfast',
                  isActive: true,
                },
              ],
              labReports: [],
            },
          ]
        : [];

    return {
      patient: {
        findUnique: async ({ where }: any) => patients.get(where.icNumber) || null,
        create: async ({ data }: any) => {
          const row = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          patients.set(data.icNumber, row);
          return row;
        },
        count: async () => patients.size,
      },
      doctor: {
        findUnique: async ({ where }: any) => doctors.find((d) => d.id === where.id) || null,
        findFirst: async ({ where }: any) => doctors.find((d) => d.icNumber === where.icNumber) || null,
        findMany: async () => doctors,
        count: async () => doctors.filter((d) => d.isActive).length,
      },
      medicalRecord: {
        findMany: async ({ where, take }: any) => {
          const list = where?.icNumber
            ? records.filter((r) => r.icNumber === where.icNumber)
            : records;
          return list.slice(0, take || 100);
        },
        create: async ({ data }: any) => {
          const doc = doctors.find((d) => d.id === data.doctorId) || doctors[0];
          const createdRx = (data.prescriptions?.create || []).map((rx: any, idx: number) => ({
            id: `rx-new-${idx}`,
            recordId: data.id,
            ...rx,
          }));
          const createdLabs = (data.labReports?.create || []).map((lab: any, idx: number) => ({
            id: `lab-new-${idx}`,
            recordId: data.id,
            ...lab,
          }));
          const row = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            doctor: { fullName: doc.fullName },
            prescriptions: createdRx,
            labReports: createdLabs,
          };
          records.unshift(row);
          return row;
        },
        count: async (args: any = {}) => {
          const { where } = args;
          if (where?.visitDate?.gte) {
            return records.filter((r) => r.visitDate >= where.visitDate.gte).length;
          }
          return records.length;
        },
      },
      $disconnect: async () => {},
    };
  }

  const hospitalNodes: Record<string, any> = {};
  for (const h of HOSPITALS) {
    hospitalNodes[h.id] = makeHospitalNode(h.id);
  }

  return { centralMock, hospitalNodes, auditLogs };
}

async function apiRequest(
  baseUrl: string,
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = options.body !== undefined ? JSON.stringify(options.body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            json: raw ? JSON.parse(raw) : {},
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('MedLink MY Backend Federation, Auth, RBAC, Consent & Clinical Sub-Record Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const fixture = createInMemoryFederationFixture();
  resetHospitalDbCache();
  resetEmergencyRateLimitsForTesting();
  setDbClientsForTesting({
    central: fixture.centralMock as any,
    hospitals: fixture.hospitalNodes as any,
  });

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    setDbClientsForTesting({ central: null });
    resetHospitalDbCache();
  });

  await t.test('1. Password hashing and canonical 5-hospital registry invariants', () => {
    const digest = hashPassword('doctor123');
    assert.equal(verifyPassword('doctor123', digest), true);
    assert.equal(verifyPassword('wrong-password', digest), false);
    assert.deepEqual(
      HOSPITALS.map((h) => h.id),
      ['hospital-kl', 'hospital-penang', 'hospital-jb', 'hospital-kuching', 'hospital-kk']
    );
  });

  let patientToken = '';
  let klDoctorToken = '';
  let penangDoctorToken = '';
  let klAdminToken = '';
  let centralAdminToken = '';

  await t.test('2. Multi-role detection, role-specific login, GET /auth/me, and POST /auth/logout', async () => {
    const multiRoleRes = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: '750101-14-5001', password: 'doctor123' },
    });
    assert.equal(multiRoleRes.status, 200);
    assert.equal(multiRoleRes.json.data.requiresRoleSelection, true);
    assert.equal(multiRoleRes.json.data.roles.length, 2);

    const docLogin = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: '750101-14-5001', password: 'doctor123', role: 'doctor' },
    });
    assert.equal(docLogin.status, 200);
    klDoctorToken = docLogin.json.data.token;
    assert.equal(docLogin.json.data.user.doctorId, 'doc-kl-1');
    assert.equal(docLogin.json.data.user.hospitalId, 'hospital-kl');

    const meRes = await apiRequest(baseUrl, 'GET', '/api/auth/me', { token: klDoctorToken });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.json.data.fullName, 'Dr. Lim Wei Ming');

    const penangLogin = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: '760612-07-5001', password: 'doctor123', role: 'doctor' },
    });
    penangDoctorToken = penangLogin.json.data.token;

    const patientLogin = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: '880101-14-5678', password: 'patient123' },
    });
    patientToken = patientLogin.json.data.token;

    const klAdminLogin = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: 'admin-kl', password: 'admin123' },
    });
    klAdminToken = klAdminLogin.json.data.token;

    const centralLogin = await apiRequest(baseUrl, 'POST', '/api/auth/login', {
      body: { icNumber: 'central-admin', password: 'central123' },
    });
    centralAdminToken = centralLogin.json.data.token;

    const logoutRes = await apiRequest(baseUrl, 'POST', '/api/auth/logout', { token: klDoctorToken });
    assert.equal(logoutRes.status, 200);
  });

  await t.test('3. Patient horizontal privilege escalation is blocked (HTTP 403)', async () => {
    const ownRes = await apiRequest(baseUrl, 'GET', '/api/central/query/880101-14-5678', {
      token: patientToken,
    });
    assert.equal(ownRes.status, 200);
    assert.equal(ownRes.json.data.totalRecords, 2);

    const otherQueryRes = await apiRequest(baseUrl, 'GET', '/api/central/query/950320-10-1234', {
      token: patientToken,
    });
    assert.equal(otherQueryRes.status, 403);

    const otherProfileRes = await apiRequest(baseUrl, 'GET', '/api/central/patient/950320-10-1234', {
      token: patientToken,
    });
    assert.equal(otherProfileRes.status, 403);
  });

  await t.test('4. Patient hospital-level privacy block is enforced on both /query and /patient and audited', async () => {
    const blockRes = await apiRequest(baseUrl, 'POST', '/api/central/privacy-settings/hospital-access', {
      token: patientToken,
      body: { hospitalId: 'hospital-penang', isBlocked: true },
    });
    assert.equal(blockRes.status, 200);

    const blockedQuery = await apiRequest(baseUrl, 'GET', '/api/central/query/880101-14-5678', {
      token: penangDoctorToken,
    });
    assert.equal(blockedQuery.status, 200);
    assert.equal(blockedQuery.json.data.accessDenied, true);
    assert.equal(blockedQuery.json.data.totalRecords, 0);

    const blockedDemographics = await apiRequest(baseUrl, 'GET', '/api/central/patient/880101-14-5678', {
      token: penangDoctorToken,
    });
    assert.equal(blockedDemographics.status, 403);

    // Allowed hospital (KL) still retrieves records with accurate read-only flags
    const allowedQuery = await apiRequest(baseUrl, 'GET', '/api/central/query/880101-14-5678', {
      token: klDoctorToken,
    });
    assert.equal(allowedQuery.status, 200);
    assert.equal(allowedQuery.json.data.accessDenied, undefined);
    const klNode = allowedQuery.json.data.hospitals.find((h: any) => h.hospitalId === 'hospital-kl');
    const penangNode = allowedQuery.json.data.hospitals.find((h: any) => h.hospitalId === 'hospital-penang');
    assert.equal(klNode.records[0].isReadOnly, false);
    assert.equal(penangNode.records[0].isReadOnly, true);

    // Patient access logs include the blocked attempt
    const myAccessLogs = await apiRequest(baseUrl, 'GET', '/api/central/my-access-logs', {
      token: patientToken,
    });
    assert.equal(myAccessLogs.status, 200);
    assert.equal(myAccessLogs.json.data.some((l: any) => l.success === false && l.actorHospitalId === 'hospital-penang'), true);
  });

  await t.test('5. Clinical record creation persists prescriptions/labs, copies network demographics, and blocks cross-hospital writes', async () => {
    // KL doctor cannot write to Penang hospital
    const crossWrite = await apiRequest(baseUrl, 'POST', '/api/hospitals/hospital-penang/records', {
      token: klDoctorToken,
      body: {
        icNumber: '950320-10-1234',
        visitType: 'outpatient',
        diagnosis: ['Migraine'],
      },
    });
    assert.equal(crossWrite.status, 403);

    // KL doctor writes a record for Siti (currently indexed only at Penang) -> copies Siti's real demographics to KL!
    const createRes = await apiRequest(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
      token: klDoctorToken,
      body: {
        icNumber: '950320-10-1234',
        visitType: 'outpatient',
        chiefComplaint: 'Acute wheezing',
        diagnosis: ['Bronchial Asthma'],
        prescriptions: [
          {
            medicationName: 'Salbutamol Inhaler',
            dosage: '100mcg',
            frequency: 'PRN',
            duration: '30 days',
            quantity: 1,
            instructions: '2 puffs when needed',
            isActive: true,
          },
        ],
        labReports: [
          {
            testType: 'Pulmonary',
            testName: 'Peak Expiratory Flow',
            result: '380',
            unit: 'L/min',
            referenceRange: '400 - 500',
            isAbnormal: true,
            reportDate: '2026-02-01',
            notes: 'Mild obstruction',
          },
        ],
      },
    });
    assert.equal(createRes.status, 201);

    const sitiQuery = await apiRequest(baseUrl, 'GET', '/api/central/query/950320-10-1234', {
      token: klDoctorToken,
    });
    const klSiti = sitiQuery.json.data.hospitals.find((h: any) => h.hospitalId === 'hospital-kl');
    assert.equal(klSiti.recordCount, 1);
    assert.equal(klSiti.records[0].prescriptions.length, 1);
    assert.equal(klSiti.records[0].prescriptions[0].medicationName, 'Salbutamol Inhaler');
    assert.equal(klSiti.records[0].labReports.length, 1);
    assert.equal(klSiti.records[0].labReports[0].isAbnormal, true);

    // Verify Siti's copied demographics at KL preserved bloodType 'A+' and gender 'female' instead of fake 'male'
    const klCopiedPatient = await fixture.hospitalNodes['hospital-kl'].patient.findUnique({
      where: { icNumber: '950320-10-1234' },
    });
    assert.equal(klCopiedPatient.gender, 'female');
    assert.equal(klCopiedPatient.bloodType, 'A+');
  });

  await t.test('6. Hospital stats & hospital-scoped audit log isolation', async () => {
    const klStats = await apiRequest(baseUrl, 'GET', '/api/hospitals/hospital-kl/stats', {
      token: klAdminToken,
    });
    assert.equal(klStats.status, 200);
    assert.equal(typeof klStats.json.data.activeDoctors, 'number');
    assert.equal(typeof klStats.json.data.todayVisits, 'number');

    // KL admin cannot read Penang stats
    const penangStatsForbidden = await apiRequest(baseUrl, 'GET', '/api/hospitals/hospital-penang/stats', {
      token: klAdminToken,
    });
    assert.equal(penangStatsForbidden.status, 403);

    // KL admin only receives audit logs involving hospital-kl
    const klAudit = await apiRequest(baseUrl, 'GET', '/api/central/audit-logs', {
      token: klAdminToken,
    });
    assert.equal(klAudit.status, 200);
    for (const log of klAudit.json.data) {
      assert.equal(
        log.actorHospitalId === 'hospital-kl' || log.targetHospitalId === 'hospital-kl',
        true
      );
    }

    // Central admin sees logs across all hospitals
    const centralAudit = await apiRequest(baseUrl, 'GET', '/api/central/audit-logs', {
      token: centralAdminToken,
    });
    assert.equal(centralAudit.status, 200);
    assert.equal(centralAudit.json.data.length > klAudit.json.data.length, true);
  });

  await t.test('7. Emergency break-glass lookup returns active medications and enforces HTTP 429 cooldown', async () => {
    resetEmergencyRateLimitsForTesting();
    const emgRes = await apiRequest(baseUrl, 'GET', '/api/central/emergency/880101-14-5678');
    assert.equal(emgRes.status, 200);
    assert.equal(emgRes.json.data.found, true);
    assert.deepEqual(emgRes.json.data.allergies, ['Penicillin', 'Shellfish']);
    assert.equal(emgRes.json.data.currentMedications.length, 1);
    assert.equal(emgRes.json.data.currentMedications[0].medicationName, 'Amlodipine');

    // Immediate second call from same IP triggers HTTP 429 rate limit
    const rateLimitedRes = await apiRequest(baseUrl, 'GET', '/api/central/emergency/880101-14-5678');
    assert.equal(rateLimitedRes.status, 429);
    assert.equal(rateLimitedRes.json.rateLimited, true);

    // Unknown patient returns found: false after resetting cooldown
    resetEmergencyRateLimitsForTesting();
    const notFoundRes = await apiRequest(baseUrl, 'GET', '/api/central/emergency/000101-14-0000');
    assert.equal(notFoundRes.status, 200);
    assert.equal(notFoundRes.json.data.found, false);
  });
});
