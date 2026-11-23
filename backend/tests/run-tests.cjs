'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const Module = require('node:module');

const BACKEND_ROOT = path.resolve(__dirname, '..');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-medlink-hmac-secret-key-2026-secure';

function loadSystemOrLocal(pkgName) {
  try {
    return require(pkgName);
  } catch {
    return require(path.join('/usr/share/nodejs', pkgName));
  }
}

const babel = loadSystemOrLocal('@babel/core');
const babelParser = loadSystemOrLocal('@babel/parser');
const presetTypescript = loadSystemOrLocal('@babel/preset-typescript');
const pluginCommonjs = loadSystemOrLocal('@babel/plugin-transform-modules-commonjs');

// ============================================================================
// Lightweight Standards-Compliant Fallbacks (used ONLY if node_modules absent)
// ============================================================================

function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const pad = 4 - (str.length % 4 || 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad === 4 ? 0 : pad);
  return Buffer.from(b64, 'base64').toString('utf8');
}

function parseExpiresIn(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  const m = /^(\d+)([smhd])$/.exec(String(expiresIn || '24h'));
  if (!m) return 86400;
  const n = Number(m[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] || 3600;
  return n * mult;
}

const fallbackJwt = {
  sign(payload, secret, options = {}) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseExpiresIn(options.expiresIn);
    const header = { alg: 'HS256', typ: 'JWT' };
    const fullPayload = { ...payload, iat: now, exp };
    const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(fullPayload))}`;
    const sig = crypto.createHmac('sha256', secret).update(signingInput).digest();
    return `${signingInput}.${base64UrlEncode(sig)}`;
  },
  verify(token, secret) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('jwt malformed');
    const [h, p, s] = parts;
    const expected = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest()
    );
    if (s !== expected) throw new Error('invalid signature');
    const decoded = JSON.parse(base64UrlDecode(p));
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
      throw new Error('jwt expired');
    }
    return decoded;
  },
};

function compileRoutePattern(pattern) {
  const keys = [];
  const clean = pattern === '/' ? '' : pattern.replace(/\/+$/, '');
  const regexSrc = clean.replace(/\/:([^/]+)/g, (_, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  return {
    keys,
    regex: new RegExp(`^${regexSrc || '/'}/?$`),
  };
}

function createMiniRouter() {
  const stack = [];

  const router = function routerHandler(req, res, outNext) {
    let idx = 0;

    const next = (err) => {
      const layer = stack[idx++];
      if (!layer) return outNext(err);

      if (err) {
        if (layer.type === 'error') {
          try {
            return layer.fn(err, req, res, next);
          } catch (e) {
            return next(e);
          }
        }
        return next(err);
      }

      if (layer.type === 'middleware') {
        if (layer.mountPath) {
          const prefix = layer.mountPath.replace(/\/+$/, '');
          if (req.path === prefix || req.path.startsWith(`${prefix}/`)) {
            const origPath = req.path;
            req.path = origPath.slice(prefix.length) || '/';
            return layer.fn(req, res, (subErr) => {
              req.path = origPath;
              next(subErr);
            });
          }
          return next();
        }
        try {
          const maybePromise = layer.fn(req, res, next);
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(next);
          }
        } catch (e) {
          next(e);
        }
        return;
      }

      if (layer.type === 'route') {
        if (layer.method !== req.method.toLowerCase()) return next();
        const match = layer.compiled.regex.exec(req.path);
        if (!match) return next();
        const savedParams = { ...req.params };
        layer.compiled.keys.forEach((k, i) => {
          req.params[k] = decodeURIComponent(match[i + 1]);
        });

        let hIdx = 0;
        const runRouteHandler = (routeErr) => {
          if (routeErr) {
            req.params = savedParams;
            return next(routeErr);
          }
          const fn = layer.handlers[hIdx++];
          if (!fn) return;
          try {
            const ret = fn(req, res, runRouteHandler);
            if (ret && typeof ret.catch === 'function') {
              ret.catch(runRouteHandler);
            }
          } catch (e) {
            runRouteHandler(e);
          }
        };
        return runRouteHandler();
      }

      return next();
    };

    next();
  };

  router.use = (...args) => {
    if (typeof args[0] === 'string') {
      const mountPath = args[0];
      args.slice(1).forEach((fn) => {
        stack.push({ type: 'middleware', mountPath, fn });
      });
    } else {
      args.forEach((fn) => {
        if (fn.length === 4) {
          stack.push({ type: 'error', fn });
        } else {
          stack.push({ type: 'middleware', mountPath: null, fn });
        }
      });
    }
    return router;
  };

  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    router[method] = (routePath, ...handlers) => {
      stack.push({
        type: 'route',
        method,
        compiled: compileRoutePattern(routePath),
        handlers,
      });
      return router;
    };
  });

  return router;
}

function createFallbackExpress() {
  function expressApp() {
    const router = createMiniRouter();

    const handler = (nodeReq, nodeRes) => {
      const parsedUrl = new URL(nodeReq.url || '/', 'http://127.0.0.1');
      const query = {};
      for (const [k, v] of parsedUrl.searchParams.entries()) {
        query[k] = v;
      }

      const chunks = [];
      nodeReq.on('data', (c) => chunks.push(c));
      nodeReq.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedBody = {};
        if (rawBody && (nodeReq.headers['content-type'] || '').includes('application/json')) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            nodeRes.statusCode = 400;
            nodeRes.setHeader('Content-Type', 'application/json');
            nodeRes.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
            return;
          }
        }

        const req = Object.assign(nodeReq, {
          path: parsedUrl.pathname,
          query,
          params: {},
          body: parsedBody,
          ip: nodeReq.headers['x-test-client-ip'] || nodeReq.socket?.remoteAddress || '127.0.0.1',
        });

        const res = {
          statusCode: 200,
          status(code) {
            this.statusCode = code;
            nodeRes.statusCode = code;
            return this;
          },
          setHeader(k, v) {
            nodeRes.setHeader(k, v);
            return this;
          },
          json(obj) {
            if (!nodeRes.headersSent) {
              nodeRes.statusCode = this.statusCode;
              nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
            nodeRes.end(JSON.stringify(obj));
            return this;
          },
        };

        router(req, res, (err) => {
          if (err) {
            res.status(500).json({ success: false, error: 'Internal server error' });
          } else if (!nodeRes.writableEnded) {
            res.status(404).json({ success: false, error: 'Not Found' });
          }
        });
      });
    };

    Object.assign(handler, router);
    handler.listen = (port, cb) => {
      const srv = http.createServer(handler);
      srv.listen(port, cb);
      return srv;
    };
    return handler;
  }

  expressApp.Router = () => createMiniRouter();
  expressApp.json = () => (_req, _res, next) => next();
  return expressApp;
}

const fallbackExpress = createFallbackExpress();
const fallbackCors = () => (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
};
const fallbackDotenv = { config: () => ({ parsed: {} }) };

// Install TypeScript + Fallback Module Hook
const tsCache = new Map();
const origResolveFilename = Module._resolveFilename;
const origLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request.includes('.prisma/client/')) {
    return { PrismaClient: class StubPrismaClient {} };
  }
  try {
    return origLoad.call(this, request, parent, isMain);
  } catch (err) {
    if (request === 'express') return fallbackExpress;
    if (request === 'cors') return fallbackCors;
    if (request === 'dotenv') return fallbackDotenv;
    if (request === 'jsonwebtoken') return fallbackJwt;
    throw err;
  }
};

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith('.') && parent && parent.filename) {
    const baseDir = path.dirname(parent.filename);
    const candidateTs = path.resolve(baseDir, `${request}.ts`);
    const candidateIdx = path.resolve(baseDir, request, 'index.ts');
    if (fs.existsSync(candidateTs)) return candidateTs;
    if (fs.existsSync(candidateIdx)) return candidateIdx;
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTs(mod, filename) {
  let code = tsCache.get(filename);
  if (!code) {
    const raw = fs.readFileSync(filename, 'utf8');
    const out = babel.transformSync(raw, {
      filename,
      presets: [[presetTypescript, { allExtensions: true }]],
      plugins: [pluginCommonjs],
      sourceMaps: 'inline',
    });
    code = out.code;
    tsCache.set(filename, code);
  }
  mod._compile(code, filename);
};

// ============================================================================
// In-Memory Central & Hospital Prisma-Compatible Databases
// ============================================================================

function createInMemoryCentralDb() {
  const hospitals = new Map();
  const users = new Map();
  const patientIndexes = new Map();
  const privacySettings = new Map();
  const auditLogs = [];

  const matchAuditWhere = (log, where = {}) => {
    if (where.actorId && log.actorId !== where.actorId) return false;
    if (where.targetIcNumber && log.targetIcNumber !== where.targetIcNumber) return false;
    if (where.action && log.action !== where.action) return false;
    if (where.OR && Array.isArray(where.OR)) {
      const ok = where.OR.some((cond) => {
        if (cond.actorHospitalId && log.actorHospitalId === cond.actorHospitalId) return true;
        if (cond.targetHospitalId && log.targetHospitalId === cond.targetHospitalId) return true;
        return false;
      });
      if (!ok) return false;
    }
    if (where.timestamp) {
      const t = log.timestamp.getTime();
      if (where.timestamp.gte && t < where.timestamp.gte.getTime()) return false;
      if (where.timestamp.lte && t > where.timestamp.lte.getTime()) return false;
      if (where.timestamp.lt && t >= where.timestamp.lt.getTime()) return false;
    }
    return true;
  };

  return {
    _raw: { hospitals, users, patientIndexes, privacySettings, auditLogs },
    hospital: {
      async upsert({ where, update, create }) {
        const existing = hospitals.get(where.id);
        const merged = existing ? { ...existing, ...update } : { ...create };
        hospitals.set(where.id, merged);
        return merged;
      },
      async findMany({ where } = {}) {
        const all = Array.from(hospitals.values());
        return where?.isActive !== undefined ? all.filter((h) => h.isActive === where.isActive) : all;
      },
      async count({ where } = {}) {
        const all = Array.from(hospitals.values());
        return where?.isActive !== undefined ? all.filter((h) => h.isActive === where.isActive).length : all.length;
      },
    },
    user: {
      async findMany({ where } = {}) {
        return Array.from(users.values()).filter((u) => {
          if (where?.icNumber && u.icNumber !== where.icNumber) return false;
          if (where?.isActive !== undefined && u.isActive !== where.isActive) return false;
          return true;
        });
      },
      async findUnique({ where }) {
        return users.get(where.id) || null;
      },
      async update({ where, data }) {
        const u = users.get(where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, data);
        return u;
      },
    },
    patientIndex: {
      async findUnique({ where }) {
        const item = patientIndexes.get(where.icNumber);
        if (!item) return null;
        return {
          icNumber: item.icNumber,
          lastUpdated: item.lastUpdated,
          hospitals: Array.from(item.hospitals).map((hospitalId) => ({ hospitalId })),
        };
      },
      async findMany() {
        return Array.from(patientIndexes.values())
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
          .map((item) => ({
            icNumber: item.icNumber,
            lastUpdated: item.lastUpdated,
            hospitals: Array.from(item.hospitals).map((hospitalId) => ({ hospitalId })),
          }));
      },
      async create({ data }) {
        const set = new Set();
        if (data.hospitals?.create?.hospitalId) set.add(data.hospitals.create.hospitalId);
        const rec = { icNumber: data.icNumber, lastUpdated: new Date(), hospitals: set };
        patientIndexes.set(data.icNumber, rec);
        return rec;
      },
      async update({ where, data }) {
        const rec = patientIndexes.get(where.icNumber);
        if (rec && data.lastUpdated) rec.lastUpdated = data.lastUpdated;
        return rec;
      },
      async count() {
        return patientIndexes.size;
      },
    },
    patientIndexHospital: {
      async create({ data }) {
        const rec = patientIndexes.get(data.icNumber);
        if (rec) rec.hospitals.add(data.hospitalId);
        return data;
      },
    },
    patientPrivacySetting: {
      async findMany({ where } = {}) {
        return Array.from(privacySettings.values()).filter((s) => {
          if (where?.icNumber && s.icNumber !== where.icNumber) return false;
          if (where?.isBlocked !== undefined && s.isBlocked !== where.isBlocked) return false;
          return true;
        });
      },
      async upsert({ where, update, create }) {
        const key = `${where.icNumber_hospitalId.icNumber}|${where.icNumber_hospitalId.hospitalId}`;
        const existing = privacySettings.get(key);
        const next = existing ? { ...existing, ...update } : { ...create };
        privacySettings.set(key, next);
        return next;
      },
    },
    auditLog: {
      async create({ data }) {
        const entry = {
          id: crypto.randomUUID(),
          timestamp: data.timestamp || new Date(),
          action: data.action,
          actorId: data.actorId ?? null,
          actorType: data.actorType,
          actorHospitalId: data.actorHospitalId ?? null,
          targetIcNumber: data.targetIcNumber ?? null,
          targetHospitalId: data.targetHospitalId ?? null,
          details: data.details ?? null,
          ipAddress: data.ipAddress ?? null,
          success: Boolean(data.success),
        };
        auditLogs.push(entry);
        return entry;
      },
      async findMany({ where, take } = {}) {
        return auditLogs
          .filter((l) => matchAuditWhere(l, where))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, take || 100);
      },
      async count({ where } = {}) {
        return auditLogs.filter((l) => matchAuditWhere(l, where)).length;
      },
    },
  };
}

function createInMemoryHospitalDb() {
  const patients = new Map();
  const doctors = new Map();
  const records = new Map();
  const prescriptions = new Map();
  const labReports = new Map();

  const hydrateRecord = (rec) => {
    const doc = doctors.get(rec.doctorId) || { fullName: 'Attending Doctor' };
    const rxs = Array.from(prescriptions.values()).filter((p) => p.recordId === rec.id);
    const labs = Array.from(labReports.values()).filter((l) => l.recordId === rec.id);
    return {
      ...rec,
      doctor: doc,
      prescriptions: rxs,
      labReports: labs,
    };
  };

  return {
    _raw: { patients, doctors, records, prescriptions, labReports },
    patient: {
      async findUnique({ where }) {
        return patients.get(where.icNumber) || null;
      },
      async create({ data }) {
        const now = new Date();
        const row = { ...data, createdAt: now, updatedAt: now };
        patients.set(data.icNumber, row);
        return row;
      },
      async count() {
        return patients.size;
      },
    },
    doctor: {
      async findUnique({ where }) {
        return doctors.get(where.id) || null;
      },
      async findFirst({ where }) {
        return (
          Array.from(doctors.values()).find((d) => {
            if (where?.icNumber && d.icNumber !== where.icNumber) return false;
            if (where?.isActive !== undefined && d.isActive !== where.isActive) return false;
            return true;
          }) || null
        );
      },
      async findMany({ where } = {}) {
        return Array.from(doctors.values())
          .filter((d) => (where?.isActive !== undefined ? d.isActive === where.isActive : true))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
      },
      async count({ where } = {}) {
        return Array.from(doctors.values()).filter((d) =>
          where?.isActive !== undefined ? d.isActive === where.isActive : true
        ).length;
      },
    },
    medicalRecord: {
      async count({ where } = {}) {
        return Array.from(records.values()).filter((r) => {
          if (where?.icNumber && r.icNumber !== where.icNumber) return false;
          if (where?.visitDate?.gte && r.visitDate.getTime() < where.visitDate.gte.getTime()) return false;
          return true;
        }).length;
      },
      async findMany({ where } = {}) {
        return Array.from(records.values())
          .filter((r) => (where?.icNumber ? r.icNumber === where.icNumber : true))
          .sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime())
          .map(hydrateRecord);
      },
      async findUnique({ where }) {
        const rec = records.get(where.id);
        return rec ? hydrateRecord(rec) : null;
      },
      async create({ data }) {
        const now = new Date();
        const recId = data.id || crypto.randomUUID();
        const row = {
          id: recId,
          icNumber: data.icNumber,
          doctorId: data.doctorId,
          visitDate: data.visitDate,
          visitType: data.visitType,
          chiefComplaint: data.chiefComplaint ?? null,
          diagnosis: data.diagnosis ?? '[]',
          diagnosisCodes: data.diagnosisCodes ?? '[]',
          symptoms: data.symptoms ?? '[]',
          notes: data.notes ?? null,
          vitalSigns: data.vitalSigns ?? null,
          followUpDate: data.followUpDate ?? null,
          createdAt: now,
          updatedAt: now,
        };
        records.set(recId, row);

        if (data.prescriptions?.create) {
          for (const p of data.prescriptions.create) {
            const pid = crypto.randomUUID();
            prescriptions.set(pid, { id: pid, recordId: recId, ...p });
          }
        }
        if (data.labReports?.create) {
          for (const l of data.labReports.create) {
            const lid = crypto.randomUUID();
            labReports.set(lid, { id: lid, recordId: recId, ...l });
          }
        }
        return hydrateRecord(row);
      },
      async update({ where, data }) {
        const existing = records.get(where.id);
        if (!existing) throw new Error('Record not found');
        const { prescriptions: rxNested, labReports: labNested, ...scalarUpdates } = data;
        Object.assign(existing, scalarUpdates, { updatedAt: new Date() });

        if (rxNested?.create) {
          for (const p of rxNested.create) {
            const pid = crypto.randomUUID();
            prescriptions.set(pid, { id: pid, recordId: existing.id, ...p });
          }
        }
        if (labNested?.create) {
          for (const l of labNested.create) {
            const lid = crypto.randomUUID();
            labReports.set(lid, { id: lid, recordId: existing.id, ...l });
          }
        }
        return hydrateRecord(existing);
      },
    },
    prescription: {
      async deleteMany({ where }) {
        for (const [id, p] of prescriptions.entries()) {
          if (p.recordId === where.recordId) prescriptions.delete(id);
        }
      },
    },
    labReport: {
      async deleteMany({ where }) {
        for (const [id, l] of labReports.entries()) {
          if (l.recordId === where.recordId) labReports.delete(id);
        }
      },
    },
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Backend Static Compilation, Schema & Lockfile Integrity', () => {
  it('compiles all 12 backend TypeScript files cleanly via @babel/preset-typescript', () => {
    const tsFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) tsFiles.push(full);
      }
    };
    walk(BACKEND_ROOT);
    assert.equal(tsFiles.length, 12, `Expected 12 backend .ts files, found ${tsFiles.length}`);

    for (const file of tsFiles) {
      const src = fs.readFileSync(file, 'utf8');
      const ast = babelParser.parse(src, {
        sourceType: 'module',
        plugins: ['typescript'],
      });
      assert.ok(ast.program.body.length > 0, `AST empty for ${file}`);
      const transformed = babel.transformSync(src, {
        filename: file,
        presets: [[presetTypescript, { allExtensions: true }]],
        plugins: [pluginCommonjs],
      });
      assert.ok(transformed && transformed.code.length > 0, `Transform failed for ${file}`);
    }
  });

  it('keeps package.json and package-lock.json dependencies 100% synchronized', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, 'package-lock.json'), 'utf8'));
    const lockRoot = lock.packages && lock.packages[''];
    assert.ok(lockRoot, 'package-lock.json must have root packages[""] entry');
    assert.deepEqual(pkg.dependencies, lockRoot.dependencies);
    assert.deepEqual(pkg.devDependencies || undefined, lockRoot.devDependencies || undefined);
  });

  it('maintains strict central pointer vs clinical schema separation in Prisma schemas', () => {
    const centralSchema = fs.readFileSync(path.join(BACKEND_ROOT, 'prisma/schema.central.prisma'), 'utf8');
    const hospitalSchema = fs.readFileSync(path.join(BACKEND_ROOT, 'prisma/schema.hospital.prisma'), 'utf8');

    for (const modelName of ['Hospital', 'PatientIndex', 'PatientIndexHospital', 'User', 'PatientPrivacySetting', 'AuditLog']) {
      assert.match(centralSchema, new RegExp(`model\\s+${modelName}\\s+\\{`));
    }
    assert.doesNotMatch(centralSchema, /model\s+MedicalRecord\s+\{/);

    for (const modelName of ['Patient', 'Doctor', 'MedicalRecord', 'Prescription', 'LabReport']) {
      assert.match(hospitalSchema, new RegExp(`model\\s+${modelName}\\s+\\{`));
    }
  });
});

describe('Backend Federated API, RBAC, Privacy, Clinical & Emergency Contracts', () => {
  let server;
  let baseUrl;
  let centralMem;
  let hospitalMems;

  const requestJson = async (method, urlPath, { token, body, headers = {} } = {}) => {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, headers: res.headers, json };
  };

  before(async () => {
    const { configureDbClients } = require('../src/database/multi-db-manager');
    const { resetHospitalDbInstances } = require('../src/database/hospital-multi');
    const { initializeHospitals } = require('../src/database/central-multi');
    const { hashPassword } = require('../src/middleware/auth');
    const { createApp } = require('../src/index');

    centralMem = createInMemoryCentralDb();
    hospitalMems = new Map();
    for (const id of ['hospital-kl', 'hospital-penang', 'hospital-jb', 'hospital-kuching', 'hospital-kk']) {
      hospitalMems.set(id, createInMemoryHospitalDb());
    }

    configureDbClients(centralMem, (hospitalId) => {
      const db = hospitalMems.get(hospitalId);
      if (!db) throw new Error(`Unknown hospital ${hospitalId}`);
      return db;
    });
    resetHospitalDbInstances();
    await initializeHospitals();

    // Seed Central Users using backend's exact salted hashPassword()
    const seedUsers = [
      { id: 'u-doc-kl', icNumber: '750101-14-5001', role: 'doctor', hospitalId: 'hospital-kl', passwordHash: hashPassword('doctor123'), lastLogin: null, isActive: true },
      { id: 'u-pat-doc-kl', icNumber: '750101-14-5001', role: 'patient', hospitalId: null, passwordHash: hashPassword('doctor123'), lastLogin: null, isActive: true },
      { id: 'u-doc-pg', icNumber: '760612-07-5001', role: 'doctor', hospitalId: 'hospital-penang', passwordHash: hashPassword('doctor123'), lastLogin: null, isActive: true },
      { id: 'u-doc-jb', icNumber: '770808-01-5001', role: 'doctor', hospitalId: 'hospital-jb', passwordHash: hashPassword('doctor123'), lastLogin: null, isActive: true },
      { id: 'u-pat-a', icNumber: '880515-14-5678', role: 'patient', hospitalId: null, passwordHash: hashPassword('patient123'), lastLogin: null, isActive: true },
      { id: 'u-pat-b', icNumber: '920820-07-1234', role: 'patient', hospitalId: null, passwordHash: hashPassword('patient123'), lastLogin: null, isActive: true },
      { id: 'u-admin-kl', icNumber: '700101-14-0001', role: 'hospital_admin', hospitalId: 'hospital-kl', passwordHash: hashPassword('admin123'), lastLogin: null, isActive: true },
      { id: 'u-central', icNumber: '650101-14-0001', role: 'central_admin', hospitalId: null, passwordHash: hashPassword('central123'), lastLogin: null, isActive: true },
    ];
    for (const u of seedUsers) centralMem._raw.users.set(u.id, u);

    hospitalMems.get('hospital-kl')._raw.doctors.set('doc-kl-1', {
      id: 'doc-kl-1',
      icNumber: '750101-14-5001',
      fullName: 'Dr. Ahmad Razak',
      specialization: 'Cardiology',
      licenseNumber: 'MMC-10001',
      department: 'Cardiology',
      phone: '+60 12-111 2222',
      email: 'ahmad@klgh.gov.my',
      isActive: true,
    });
    hospitalMems.get('hospital-penang')._raw.doctors.set('doc-pg-1', {
      id: 'doc-pg-1',
      icNumber: '760612-07-5001',
      fullName: 'Dr. Lim Wei Ming',
      specialization: 'Endocrinology',
      licenseNumber: 'MMC-20001',
      department: 'Internal Medicine',
      phone: '+60 12-333 4444',
      email: 'lim@pggh.gov.my',
      isActive: true,
    });
    hospitalMems.get('hospital-jb')._raw.doctors.set('doc-jb-1', {
      id: 'doc-jb-1',
      icNumber: '770808-01-5001',
      fullName: 'Dr. Siti Nurhaliza',
      specialization: 'General Surgery',
      licenseNumber: 'MMC-30001',
      department: 'Surgery',
      phone: '+60 12-555 6666',
      email: 'siti@sahjb.gov.my',
      isActive: true,
    });

    const now = new Date();
    hospitalMems.get('hospital-kl')._raw.patients.set('880515-14-5678', {
      icNumber: '880515-14-5678',
      fullName: 'Muhammad Hafiz bin Ismail',
      dateOfBirth: new Date('1988-05-15'),
      gender: 'male',
      bloodType: 'O+',
      phone: '+60 12-888 9999',
      email: 'hafiz@mail.my',
      address: 'Jalan Ampang, KL',
      emergencyContact: 'Nurul Aina (Spouse)',
      emergencyPhone: '+60 12-777 6666',
      allergies: JSON.stringify(['Penicillin', 'Shellfish']),
      chronicConditions: JSON.stringify(['Hypertension', 'Type 2 Diabetes']),
      createdAt: now,
      updatedAt: now,
    });
    hospitalMems.get('hospital-penang')._raw.patients.set('880515-14-5678', {
      icNumber: '880515-14-5678',
      fullName: 'Muhammad Hafiz bin Ismail',
      dateOfBirth: new Date('1988-05-15'),
      gender: 'male',
      bloodType: 'O+',
      phone: '+60 12-888 9999',
      email: 'hafiz@mail.my',
      address: 'Jalan Ampang, KL',
      emergencyContact: 'Nurul Aina (Spouse)',
      emergencyPhone: '+60 12-777 6666',
      allergies: JSON.stringify(['Penicillin']),
      chronicConditions: JSON.stringify(['Hypertension']),
      createdAt: now,
      updatedAt: now,
    });
    hospitalMems.get('hospital-penang')._raw.patients.set('920820-07-1234', {
      icNumber: '920820-07-1234',
      fullName: 'Tan Mei Ling',
      dateOfBirth: new Date('1992-08-20'),
      gender: 'female',
      bloodType: 'A+',
      phone: '+60 16-222 3333',
      email: 'meiling@mail.my',
      address: 'George Town, Penang',
      emergencyContact: 'Tan Boon Huat',
      emergencyPhone: '+60 16-444 5555',
      allergies: JSON.stringify([]),
      chronicConditions: JSON.stringify(['Asthma']),
      createdAt: now,
      updatedAt: now,
    });

    await hospitalMems.get('hospital-kl').medicalRecord.create({
      data: {
        id: 'rec-kl-initial',
        icNumber: '880515-14-5678',
        doctorId: 'doc-kl-1',
        visitDate: new Date('2025-11-10T09:00:00Z'),
        visitType: 'outpatient',
        chiefComplaint: 'Routine hypertension follow-up',
        diagnosis: JSON.stringify(['Essential Hypertension']),
        diagnosisCodes: JSON.stringify(['I10']),
        symptoms: JSON.stringify(['Mild headache']),
        notes: 'BP controlled on Amlodipine',
        vitalSigns: JSON.stringify({ systolicBP: 132, diastolicBP: 84, heartRate: 74 }),
        prescriptions: {
          create: [
            {
              medicationName: 'Amlodipine',
              dosage: '5mg',
              frequency: 'Once daily',
              duration: '90 days',
              quantity: 90,
              instructions: 'Take every morning',
              isActive: true,
            },
          ],
        },
      },
    });
    await hospitalMems.get('hospital-penang').medicalRecord.create({
      data: {
        id: 'rec-pg-initial',
        icNumber: '880515-14-5678',
        doctorId: 'doc-pg-1',
        visitDate: new Date('2025-10-02T14:00:00Z'),
        visitType: 'outpatient',
        chiefComplaint: 'Glycemic checkup',
        diagnosis: JSON.stringify(['Type 2 Diabetes Mellitus']),
        diagnosisCodes: JSON.stringify(['E11']),
        symptoms: JSON.stringify([]),
        notes: 'Stable glycemic profile',
        prescriptions: {
          create: [
            {
              medicationName: 'Metformin',
              dosage: '500mg',
              frequency: 'Twice daily',
              duration: '60 days',
              quantity: 120,
              instructions: 'With meals',
              isActive: false,
            },
          ],
        },
      },
    });

    centralMem._raw.patientIndexes.set('880515-14-5678', {
      icNumber: '880515-14-5678',
      lastUpdated: now,
      hospitals: new Set(['hospital-kl', 'hospital-penang']),
    });
    centralMem._raw.patientIndexes.set('920820-07-1234', {
      icNumber: '920820-07-1234',
      lastUpdated: now,
      hospitals: new Set(['hospital-penang']),
    });

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('serves /health and rejects invalid login credentials', async () => {
    const health = await requestJson('GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.status, 'healthy');

    const badLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '880515-14-5678', password: 'wrong-password' },
    });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.json.success, false);
  });

  it('supports dual-role detection on login, hospital verification, /me, /switch-role, and /logout', async () => {
    const multiPrompt = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '750101-14-5001', password: 'doctor123' },
    });
    assert.equal(multiPrompt.status, 200);
    assert.equal(multiPrompt.json.data.requiresRoleSelection, true);
    assert.deepEqual(multiPrompt.json.data.availableRoles, ['doctor', 'patient']);

    // Login explicitly as doctor (also accepts unformatted 12-digit MyKad)
    const docLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '750101145001', password: 'doctor123', role: 'doctor' },
    });
    assert.equal(docLogin.status, 200);
    const docToken = docLogin.json.data.token;
    assert.ok(docToken);
    assert.equal(docLogin.json.data.user.role, 'doctor');
    assert.equal(docLogin.json.data.user.hospitalId, 'hospital-kl');
    assert.equal(docLogin.json.data.user.doctorId, 'doc-kl-1');
    assert.equal(docLogin.json.data.user.fullName, 'Dr. Ahmad Razak');

    // Verify hospital credentials (wrong password -> 401, correct IC + password -> 200)
    const verifyBad = await requestJson('POST', '/api/auth/verify-hospital', {
      token: docToken,
      body: { method: 'credentials', staffId: '750101-14-5001', password: 'wrong' },
    });
    assert.equal(verifyBad.status, 401);

    const verifyOk = await requestJson('POST', '/api/auth/verify-hospital', {
      token: docToken,
      body: { method: 'credentials', staffId: '750101-14-5001', password: 'doctor123' },
    });
    assert.equal(verifyOk.status, 200);
    assert.equal(verifyOk.json.data.verified, true);

    const meRes = await requestJson('GET', '/api/auth/me', { token: docToken });
    assert.equal(meRes.status, 200);
    assert.deepEqual(meRes.json.data.user.availableRoles, ['doctor', 'patient']);

    const switched = await requestJson('POST', '/api/auth/switch-role', {
      token: docToken,
      body: { role: 'patient' },
    });
    assert.equal(switched.status, 200);
    assert.equal(switched.json.data.user.role, 'patient');

    const forbiddenSwitch = await requestJson('POST', '/api/auth/switch-role', {
      token: docToken,
      body: { role: 'central_admin' },
    });
    assert.equal(forbiddenSwitch.status, 403);

    const logoutRes = await requestJson('POST', '/api/auth/logout', { token: docToken });
    assert.equal(logoutRes.status, 200);
  });

  it('prevents horizontal privilege escalation (IDOR) when a patient queries another patient IC', async () => {
    const loginPatA = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '880515-14-5678', password: 'patient123' },
    });
    const patAToken = loginPatA.json.data.token;

    const ownQuery = await requestJson('GET', '/api/central/query/880515-14-5678', { token: patAToken });
    assert.equal(ownQuery.status, 200);
    assert.equal(ownQuery.json.data.totalRecords, 2);

    const idorCentralQuery = await requestJson('GET', '/api/central/query/920820-07-1234', { token: patAToken });
    assert.equal(idorCentralQuery.status, 403);

    const idorCentralPatient = await requestJson('GET', '/api/central/patient/920820-07-1234', { token: patAToken });
    assert.equal(idorCentralPatient.status, 403);

    const idorHospitalRecords = await requestJson(
      'GET',
      '/api/hospitals/hospital-penang/patients/920820-07-1234/records',
      { token: patAToken }
    );
    assert.equal(idorHospitalRecords.status, 403);
  });

  it('enforces hospital-level patient privacy blacklist consistently across federated and hospital routes', async () => {
    const patLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '880515-14-5678', password: 'patient123' },
    });
    const patToken = patLogin.json.data.token;

    const pgDocLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '760612-07-5001', password: 'doctor123', role: 'doctor' },
    });
    const pgDocToken = pgDocLogin.json.data.token;

    const klDocLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '750101-14-5001', password: 'doctor123', role: 'doctor' },
    });
    const klDocToken = klDocLogin.json.data.token;

    const blockRes = await requestJson('POST', '/api/central/privacy-settings/hospital-access', {
      token: patToken,
      body: { hospitalId: 'hospital-penang', isBlocked: true },
    });
    assert.equal(blockRes.status, 200);

    const pgQuery = await requestJson('GET', '/api/central/query/880515-14-5678', { token: pgDocToken });
    assert.equal(pgQuery.status, 403);
    assert.equal(pgQuery.json.accessDenied, true);

    const pgSummary = await requestJson('GET', '/api/central/patient/880515-14-5678', { token: pgDocToken });
    assert.equal(pgSummary.status, 403);
    assert.equal(pgSummary.json.accessDenied, true);

    const pgLocalRecords = await requestJson(
      'GET',
      '/api/hospitals/hospital-penang/patients/880515-14-5678/records',
      { token: pgDocToken }
    );
    assert.equal(pgLocalRecords.status, 403);
    assert.equal(pgLocalRecords.json.accessDenied, true);

    // KL doctor and Patient A herself are unaffected
    const klQuery = await requestJson('GET', '/api/central/query/880515-14-5678', { token: klDocToken });
    assert.equal(klQuery.status, 200);
    assert.equal(klQuery.json.data.found, true);

    const selfQuery = await requestJson('GET', '/api/central/query/880515-14-5678', { token: patToken });
    assert.equal(selfQuery.status, 200);
    assert.equal(selfQuery.json.data.totalRecords, 2);

    const accessLogs = await requestJson('GET', '/api/central/my-access-logs', { token: patToken });
    assert.equal(accessLogs.status, 200);
    assert.ok(accessLogs.json.data.some((l) => l.actorHospitalId === 'hospital-penang' && l.success === false));

    const unblockRes = await requestJson('POST', '/api/central/privacy-settings/hospital-access', {
      token: patToken,
      body: { hospitalId: 'hospital-penang', isBlocked: false },
    });
    assert.equal(unblockRes.status, 200);

    const pgQueryAfter = await requestJson('GET', '/api/central/query/880515-14-5678', { token: pgDocToken });
    assert.equal(pgQueryAfter.status, 200);
    assert.equal(pgQueryAfter.json.data.totalRecords, 2);
  });

  it('persists prescriptions & labReports, syncs cross-hospital demographics on first visit, and enforces read-only foreign records', async () => {
    const jbDocLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '770808-01-5001', password: 'doctor123', role: 'doctor' },
    });
    const jbDocToken = jbDocLogin.json.data.token;

    const klDocLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '750101-14-5001', password: 'doctor123', role: 'doctor' },
    });
    const klDocToken = klDocLogin.json.data.token;

    const crossWrite = await requestJson('POST', '/api/hospitals/hospital-kl/records', {
      token: jbDocToken,
      body: {
        icNumber: '880515-14-5678',
        visitType: 'outpatient',
        diagnosis: ['Unauthorized write'],
      },
    });
    assert.equal(crossWrite.status, 403);

    const createRes = await requestJson('POST', '/api/hospitals/hospital-jb/records', {
      token: jbDocToken,
      body: {
        icNumber: '880515-14-5678',
        visitDate: '2026-01-15',
        visitType: 'outpatient',
        chiefComplaint: 'Elevated post-prandial glucose',
        diagnosis: ['Type 2 Diabetes Mellitus with Hyperglycemia'],
        diagnosisCodes: ['E11.65'],
        symptoms: ['Polydipsia', 'Fatigue'],
        notes: 'Initiated Empagliflozin and ordered HbA1c panel',
        vitalSigns: { systolicBP: 128, diastolicBP: 80, heartRate: 76, bloodGlucose: 10.4 },
        prescriptions: [
          {
            medicationName: 'Empagliflozin',
            dosage: '10mg',
            frequency: 'Once daily',
            duration: '90 days',
            quantity: 90,
            instructions: 'Take in the morning',
            isActive: true,
          },
        ],
        labReports: [
          {
            testType: 'Biochemistry',
            testName: 'HbA1c',
            result: '8.2',
            unit: '%',
            referenceRange: '4.0 - 5.6',
            isAbnormal: true,
            reportDate: '2026-01-15',
            notes: 'Above glycemic target',
          },
        ],
      },
    });
    assert.equal(createRes.status, 201);
    const createdRecordId = createRes.json.data.recordId;
    assert.equal(createRes.json.data.record.prescriptions.length, 1);
    assert.equal(createRes.json.data.record.prescriptions[0].medicationName, 'Empagliflozin');
    assert.equal(createRes.json.data.record.labReports.length, 1);
    assert.equal(createRes.json.data.record.labReports[0].testName, 'HbA1c');

    const jbPatient = hospitalMems.get('hospital-jb')._raw.patients.get('880515-14-5678');
    assert.ok(jbPatient);
    assert.equal(jbPatient.fullName, 'Muhammad Hafiz bin Ismail');
    assert.equal(jbPatient.bloodType, 'O+');
    assert.deepEqual(JSON.parse(jbPatient.allergies), ['Penicillin', 'Shellfish']);

    const crossUpdate = await requestJson('PUT', `/api/hospitals/hospital-jb/records/${createdRecordId}`, {
      token: klDocToken,
      body: { notes: 'Tampered from KL' },
    });
    assert.equal(crossUpdate.status, 403);

    const validUpdate = await requestJson('PUT', `/api/hospitals/hospital-jb/records/${createdRecordId}`, {
      token: jbDocToken,
      body: {
        notes: 'Titrated Empagliflozin to 25mg',
        prescriptions: [
          {
            medicationName: 'Empagliflozin',
            dosage: '25mg',
            frequency: 'Once daily',
            duration: '90 days',
            quantity: 90,
            instructions: 'Take every morning with water',
            isActive: true,
          },
        ],
      },
    });
    assert.equal(validUpdate.status, 200);
    assert.equal(validUpdate.json.data.record.prescriptions[0].dosage, '25mg');

    const fedQuery = await requestJson('GET', '/api/central/query/880515-14-5678', { token: klDocToken });
    assert.equal(fedQuery.status, 200);
    assert.equal(fedQuery.json.data.totalRecords, 3);
    const klNode = fedQuery.json.data.hospitals.find((h) => h.hospitalId === 'hospital-kl');
    const jbNode = fedQuery.json.data.hospitals.find((h) => h.hospitalId === 'hospital-jb');
    assert.equal(klNode.records[0].isReadOnly, false);
    assert.equal(jbNode.records[0].isReadOnly, true);
    assert.equal(jbNode.records[0].prescriptions[0].dosage, '25mg');
    assert.equal(jbNode.records[0].labReports[0].result, '8.2');
  });

  it('scopes /api/central/audit-logs to hospital_admin facility while giving central_admin nationwide visibility', async () => {
    const klAdminLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '700101-14-0001', password: 'admin123' },
    });
    const klAdminToken = klAdminLogin.json.data.token;

    const centralLogin = await requestJson('POST', '/api/auth/login', {
      body: { icNumber: '650101-14-0001', password: 'central123' },
    });
    const centralToken = centralLogin.json.data.token;

    const todayStr = new Date().toISOString().slice(0, 10);
    const klLogs = await requestJson(
      'GET',
      `/api/central/audit-logs?startDate=${todayStr}&endDate=${todayStr}`,
      { token: klAdminToken }
    );
    assert.equal(klLogs.status, 200);
    assert.ok(klLogs.json.data.length > 0);
    for (const log of klLogs.json.data) {
      const belongsToKl = log.actorHospitalId === 'hospital-kl' || log.targetHospitalId === 'hospital-kl';
      assert.equal(belongsToKl, true, `Leaked non-KL audit log to KL hospital_admin: ${JSON.stringify(log)}`);
    }

    const allLogs = await requestJson('GET', '/api/central/audit-logs', { token: centralToken });
    assert.equal(allLogs.status, 200);
    assert.ok(allLogs.json.data.length > klLogs.json.data.length);
  });

  it('aggregates active emergency medications, returns 404 for unknown IC, and enforces 429 cooldown per IP+IC', async () => {
    const notFound = await requestJson('GET', '/api/central/emergency/990101-14-9999', {
      headers: { 'x-test-client-ip': '10.10.0.1' },
    });
    assert.equal(notFound.status, 404);
    assert.equal(notFound.json.data.found, false);

    const emergencyOk = await requestJson('GET', '/api/central/emergency/880515-14-5678', {
      headers: { 'x-test-client-ip': '10.10.0.2' },
    });
    assert.equal(emergencyOk.status, 200);
    assert.equal(emergencyOk.json.data.found, true);
    assert.equal(emergencyOk.json.data.bloodType, 'O+');
    assert.deepEqual(emergencyOk.json.data.allergies, ['Penicillin', 'Shellfish']);

    const medNames = emergencyOk.json.data.activeMedications.map((m) => m.medicationName);
    assert.ok(medNames.includes('Amlodipine'));
    assert.ok(medNames.includes('Empagliflozin'));
    assert.ok(!medNames.includes('Metformin'));

    const rateLimited = await requestJson('GET', '/api/central/emergency/880515-14-5678', {
      headers: { 'x-test-client-ip': '10.10.0.2' },
    });
    assert.equal(rateLimited.status, 429);
    assert.equal(rateLimited.json.rateLimited, true);
    assert.ok(Number(rateLimited.headers.get('retry-after')) > 0);
  });
});
