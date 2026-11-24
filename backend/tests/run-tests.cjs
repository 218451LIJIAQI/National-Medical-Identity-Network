'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

process.env.NODE_ENV = 'test';

const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

function createPortableTsCompiler() {
  const tsCandidates = [
    path.join(BACKEND_ROOT, 'node_modules', 'typescript'),
    path.join(REPO_ROOT, 'frontend', 'node_modules', 'typescript'),
    'typescript',
  ];
  for (const candidate of tsCandidates) {
    try {
      const ts = require(candidate);
      return (source, filename) => {
        const result = ts.transpileModule(source, {
          fileName: filename,
          reportDiagnostics: true,
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            resolveJsonModule: true,
          },
        });
        if (result.diagnostics && result.diagnostics.length > 0) {
          const formatted = result.diagnostics
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
            .join('; ');
          throw new Error(`TypeScript syntax error in ${filename}: ${formatted}`);
        }
        return result.outputText;
      };
    } catch {
      // Try next compiler candidate
    }
  }

  const babelRoots = [
    path.join(BACKEND_ROOT, 'node_modules'),
    path.join(REPO_ROOT, 'frontend', 'node_modules'),
    '/usr/share/nodejs',
  ];
  for (const base of babelRoots) {
    try {
      const babel = require(path.join(base, '@babel', 'core'));
      const presetTypescript = require(path.join(base, '@babel', 'preset-typescript'));
      const pluginCommonjs = require(path.join(base, '@babel', 'plugin-transform-modules-commonjs'));
      return (source, filename) => {
        const transformed = babel.transformSync(source, {
          filename,
          babelrc: false,
          configFile: false,
          presets: [presetTypescript],
          plugins: [pluginCommonjs],
          retainLines: true,
        });
        return transformed?.code ?? '';
      };
    } catch {
      // Try next root
    }
  }
  throw new Error('Unable to locate `typescript` or `@babel/core` to run backend tests.');
}

const transpileBackendTs = createPortableTsCompiler();

// ---------------------------------------------------------------------------
// 1. Minimal Spec-Accurate Offline Shims for Express, CORS, Dotenv, JWT
// ---------------------------------------------------------------------------
function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const pad = 4 - (str.length % 4 || 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function parseExpiryToSeconds(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  const match = /^(\d+)([smhd])$/.exec(String(expiresIn || '24h'));
  if (!match) return 86400;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return n;
  if (unit === 'm') return n * 60;
  if (unit === 'h') return n * 3600;
  return n * 86400;
}

const jwtShim = {
  sign(payload, secret, options = {}) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseExpiryToSeconds(options.expiresIn);
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp }));
    const sig = crypto
      .createHmac('sha256', String(secret))
      .update(`${header}.${body}`)
      .digest();
    return `${header}.${body}.${base64UrlEncode(sig)}`;
  },
  verify(token, secret) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');
    const [header, body, signature] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', String(secret)).update(`${header}.${body}`).digest()
    );
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid JWT signature');
    }
    const decoded = JSON.parse(base64UrlDecode(body));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp <= now) {
      throw new Error('JWT expired');
    }
    return decoded;
  },
};

function compilePathMatcher(pattern, isPrefix) {
  if (!pattern || pattern === '/') {
    return {
      match(pathname) {
        if (isPrefix) return { params: {}, rest: pathname || '/' };
        return pathname === '/' || pathname === '' ? { params: {}, rest: '/' } : null;
      },
    };
  }
  const keys = [];
  const clean = pattern.replace(/\/+$/, '');
  const regexBody = clean
    .split('/')
    .map((seg) => {
      if (!seg) return '';
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  const regex = isPrefix
    ? new RegExp(`^${regexBody}(?:/(.*))?$`)
    : new RegExp(`^${regexBody}/?$`);

  return {
    match(pathname) {
      const m = regex.exec(pathname);
      if (!m) return null;
      const params = {};
      keys.forEach((k, idx) => {
        params[k] = decodeURIComponent(m[idx + 1]);
      });
      const rest = isPrefix ? '/' + (m[keys.length + 1] || '') : '/';
      return { params, rest };
    },
  };
}

function createRouter() {
  const stack = [];

  function register(method, routePath, ...handlers) {
    const flatHandlers = handlers.flat();
    stack.push({
      type: 'route',
      method,
      matcher: compilePathMatcher(routePath, false),
      handlers: flatHandlers,
    });
  }

  const router = function handle(req, res, outNext) {
    let idx = 0;

    function next(err) {
      const layer = stack[idx++];
      if (!layer) {
        return outNext(err);
      }

      if (err) {
        if (layer.type === 'middleware' && layer.handler.length === 4) {
          try {
            const maybePromise = layer.handler(err, req, res, next);
            if (maybePromise && typeof maybePromise.catch === 'function') {
              maybePromise.catch(next);
            }
          } catch (e) {
            next(e);
          }
          return;
        }
        return next(err);
      }

      if (layer.type === 'middleware') {
        if (layer.handler.length === 4) return next();
        const matched = layer.matcher.match(req.path);
        if (!matched) return next();

        const prevPath = req.path;
        const prevParams = req.params;
        req.path = matched.rest;
        req.params = { ...prevParams, ...matched.params };

        const restoreAndNext = (subErr) => {
          req.path = prevPath;
          req.params = prevParams;
          next(subErr);
        };

        try {
          const maybePromise = layer.handler(req, res, restoreAndNext);
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(restoreAndNext);
          }
        } catch (e) {
          restoreAndNext(e);
        }
        return;
      }

      if (layer.type === 'route') {
        if (layer.method !== req.method) return next();
        const matched = layer.matcher.match(req.path);
        if (!matched) return next();

        const prevParams = req.params;
        req.params = { ...prevParams, ...matched.params };

        let hIdx = 0;
        function runRouteHandler(routeErr) {
          if (routeErr) {
            req.params = prevParams;
            return next(routeErr);
          }
          const h = layer.handlers[hIdx++];
          if (!h) {
            req.params = prevParams;
            return;
          }
          try {
            const p = h(req, res, runRouteHandler);
            if (p && typeof p.catch === 'function') {
              p.catch(runRouteHandler);
            }
          } catch (e) {
            runRouteHandler(e);
          }
        }
        runRouteHandler();
      }
    }

    next();
  };

  router.use = function use(first, ...rest) {
    if (typeof first === 'string') {
      for (const h of rest.flat()) {
        stack.push({
          type: 'middleware',
          matcher: compilePathMatcher(first, true),
          handler: h,
        });
      }
    } else {
      for (const h of [first, ...rest].flat()) {
        stack.push({
          type: 'middleware',
          matcher: compilePathMatcher('/', true),
          handler: h,
        });
      }
    }
    return router;
  };

  router.get = (p, ...h) => register('GET', p, ...h);
  router.post = (p, ...h) => register('POST', p, ...h);
  router.put = (p, ...h) => register('PUT', p, ...h);
  router.delete = (p, ...h) => register('DELETE', p, ...h);

  return router;
}

function createExpressApp() {
  const rootRouter = createRouter();

  const app = function appHandler(req, res) {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    req.params = {};
    const forwarded = req.headers['x-forwarded-for'];
    req.ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket?.remoteAddress || '127.0.0.1';

    res.statusCode = 200;
    res.status = function status(code) {
      res.statusCode = code;
      return res;
    };
    res.json = function json(payload) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
      return res;
    };

    rootRouter(req, res, (err) => {
      if (res.writableEnded) return;
      if (err) {
        res.status(500).json({ success: false, error: 'Internal server error' });
      } else {
        res.status(404).json({ success: false, error: 'Not found' });
      }
    });
  };

  app.use = (...args) => {
    rootRouter.use(...args);
    return app;
  };
  app.get = (...args) => {
    rootRouter.get(...args);
    return app;
  };
  app.post = (...args) => {
    rootRouter.post(...args);
    return app;
  };
  app.put = (...args) => {
    rootRouter.put(...args);
    return app;
  };
  app.delete = (...args) => {
    rootRouter.delete(...args);
    return app;
  };
  app.listen = (port, cb) => {
    const server = http.createServer(app);
    return server.listen(port, cb);
  };

  return app;
}

createExpressApp.Router = createRouter;
createExpressApp.json = () => (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.body = {};
    return next();
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) {
      req.body = {};
      return next();
    }
    try {
      req.body = JSON.parse(raw);
      next();
    } catch {
      res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }
  });
};

const corsShim = () => (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
};

const dotenvShim = { config: () => ({ parsed: {} }) };

class DummyPrismaClient {}

const SHIM_MODULES = {
  express: createExpressApp,
  cors: corsShim,
  dotenv: dotenvShim,
  jsonwebtoken: jwtShim,
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request in SHIM_MODULES) {
    return `__shim__:${request}`;
  }
  if (request.includes('.prisma/client/')) {
    return '__shim__:prisma_client';
  }
  if (request.startsWith('.') && parent && parent.filename) {
    const base = path.resolve(path.dirname(parent.filename), request);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.js`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.js'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (resolved === '__shim__:prisma_client') {
    return { PrismaClient: DummyPrismaClient };
  }
  if (resolved.startsWith('__shim__:')) {
    const name = resolved.slice('__shim__:'.length);
    const mod = SHIM_MODULES[name];
    return Object.assign(mod, { default: mod, __esModule: true });
  }
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = transpileBackendTs(source, filename);
  module._compile(compiled, filename);
};

// ---------------------------------------------------------------------------
// 2. Load Real Backend Modules & Build Relational Mock Databases
// ---------------------------------------------------------------------------
const configMod = require('../src/config');
const multiDbManager = require('../src/database/multi-db-manager');
const hospitalMultiMod = require('../src/database/hospital-multi');
const authMiddleware = require('../src/middleware/auth');
const centralRouteMod = require('../src/routes/central');
const hospitalRouteMod = require('../src/routes/hospital');
const { createApp } = require('../src/index');

function createMockCentralPrisma(seed) {
  const state = {
    hospitals: [...seed.hospitals],
    users: seed.users.map((u) => ({ ...u })),
    patientIndexes: seed.patientIndexes.map((idx) => ({
      icNumber: idx.icNumber,
      lastUpdated: new Date(idx.lastUpdated),
      hospitals: [...idx.hospitals],
    })),
    privacySettings: seed.privacySettings.map((p) => ({ ...p })),
    auditLogs: seed.auditLogs.map((l) => ({ ...l })),
  };

  function matchesAuditWhere(row, where = {}) {
    if (where.actorId && row.actorId !== where.actorId) return false;
    if (where.targetIcNumber && row.targetIcNumber !== where.targetIcNumber) return false;
    if (where.action && row.action !== where.action) return false;
    if (Array.isArray(where.OR)) {
      const ok = where.OR.some((cond) => {
        if (cond.actorHospitalId && row.actorHospitalId === cond.actorHospitalId) return true;
        if (cond.targetHospitalId && row.targetHospitalId === cond.targetHospitalId) return true;
        return false;
      });
      if (!ok) return false;
    }
    if (where.timestamp) {
      const ts = row.timestamp.getTime();
      if (where.timestamp.gte && ts < where.timestamp.gte.getTime()) return false;
      if (where.timestamp.lte && ts > where.timestamp.lte.getTime()) return false;
      if (where.timestamp.lt && ts >= where.timestamp.lt.getTime()) return false;
    }
    return true;
  }

  return {
    _state: state,
    hospital: {
      async findMany({ where } = {}) {
        return state.hospitals.filter((h) => (where?.isActive !== undefined ? h.isActive === where.isActive : true));
      },
      async upsert({ where, update, create }) {
        const i = state.hospitals.findIndex((h) => h.id === where.id);
        if (i >= 0) {
          state.hospitals[i] = { ...state.hospitals[i], ...update };
          return state.hospitals[i];
        }
        state.hospitals.push(create);
        return create;
      },
      async count({ where } = {}) {
        return state.hospitals.filter((h) => (where?.isActive !== undefined ? h.isActive === where.isActive : true)).length;
      },
    },
    user: {
      async findMany({ where } = {}) {
        return state.users.filter((u) => {
          if (where?.icNumber && u.icNumber !== where.icNumber) return false;
          if (where?.isActive !== undefined && u.isActive !== where.isActive) return false;
          if (where?.role && u.role !== where.role) return false;
          return true;
        });
      },
      async findFirst({ where } = {}) {
        const list = await this.findMany({ where });
        return list[0] || null;
      },
      async findUnique({ where }) {
        return state.users.find((u) => u.id === where.id) || null;
      },
      async update({ where, data }) {
        const u = state.users.find((item) => item.id === where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, data);
        return u;
      },
    },
    patientIndex: {
      async findUnique({ where }) {
        const found = state.patientIndexes.find((p) => p.icNumber === where.icNumber);
        if (!found) return null;
        return {
          icNumber: found.icNumber,
          lastUpdated: found.lastUpdated,
          hospitals: found.hospitals.map((hospitalId) => ({ hospitalId })),
        };
      },
      async findMany() {
        return [...state.patientIndexes]
          .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
          .map((p) => ({
            icNumber: p.icNumber,
            lastUpdated: p.lastUpdated,
            hospitals: p.hospitals.map((hospitalId) => ({ hospitalId })),
          }));
      },
      async create({ data }) {
        const hospitalId = data.hospitals?.create?.hospitalId;
        const entry = {
          icNumber: data.icNumber,
          lastUpdated: data.lastUpdated || new Date(),
          hospitals: hospitalId ? [hospitalId] : [],
        };
        state.patientIndexes.push(entry);
        return entry;
      },
      async update({ where, data }) {
        const found = state.patientIndexes.find((p) => p.icNumber === where.icNumber);
        if (found && data.lastUpdated) found.lastUpdated = data.lastUpdated;
        return found;
      },
      async count() {
        return state.patientIndexes.length;
      },
    },
    patientIndexHospital: {
      async create({ data }) {
        const found = state.patientIndexes.find((p) => p.icNumber === data.icNumber);
        if (found && !found.hospitals.includes(data.hospitalId)) {
          found.hospitals.push(data.hospitalId);
        }
        return data;
      },
    },
    patientPrivacySetting: {
      async findMany({ where } = {}) {
        return state.privacySettings.filter((s) => {
          if (where?.icNumber && s.icNumber !== where.icNumber) return false;
          if (where?.hospitalId && s.hospitalId !== where.hospitalId) return false;
          if (where?.isBlocked !== undefined && s.isBlocked !== where.isBlocked) return false;
          return true;
        });
      },
      async upsert({ where, update, create }) {
        const { icNumber, hospitalId } = where.icNumber_hospitalId;
        const existing = state.privacySettings.find(
          (s) => s.icNumber === icNumber && s.hospitalId === hospitalId
        );
        if (existing) {
          existing.isBlocked = update.isBlocked;
          return existing;
        }
        const entry = { ...create };
        state.privacySettings.push(entry);
        return entry;
      },
    },
    auditLog: {
      async create({ data }) {
        const row = {
          id: crypto.randomUUID(),
          timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp),
          action: data.action,
          actorId: data.actorId || null,
          actorType: data.actorType,
          actorHospitalId: data.actorHospitalId || null,
          targetIcNumber: data.targetIcNumber || null,
          targetHospitalId: data.targetHospitalId || null,
          details: data.details || null,
          ipAddress: data.ipAddress || null,
          success: Boolean(data.success),
        };
        state.auditLogs.push(row);
        return row;
      },
      async findMany({ where, take } = {}) {
        const filtered = state.auditLogs
          .filter((r) => matchesAuditWhere(r, where))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return typeof take === 'number' ? filtered.slice(0, take) : filtered;
      },
      async count({ where } = {}) {
        return state.auditLogs.filter((r) => matchesAuditWhere(r, where)).length;
      },
    },
  };
}

function createMockHospitalPrisma(seed = {}) {
  const state = {
    offline: Boolean(seed.offline),
    patients: (seed.patients || []).map((p) => ({ ...p })),
    doctors: (seed.doctors || []).map((d) => ({ ...d })),
    records: (seed.records || []).map((r) => ({ ...r })),
    prescriptions: (seed.prescriptions || []).map((rx) => ({ ...rx })),
    labReports: (seed.labReports || []).map((l) => ({ ...l })),
  };

  function checkOnline() {
    if (state.offline) {
      throw new Error('ECONNREFUSED: Hospital database offline');
    }
  }

  function hydrateRecord(r) {
    const doctor = state.doctors.find((d) => d.id === r.doctorId) || { fullName: r.doctorId };
    const prescriptions = state.prescriptions.filter((p) => p.recordId === r.id);
    const labReports = state.labReports.filter((l) => l.recordId === r.id);
    return { ...r, doctor, prescriptions, labReports };
  }

  return {
    _state: state,
    patient: {
      async findUnique({ where }) {
        checkOnline();
        return state.patients.find((p) => p.icNumber === where.icNumber) || null;
      },
      async create({ data }) {
        checkOnline();
        const now = new Date();
        const row = { ...data, createdAt: now, updatedAt: now };
        state.patients.push(row);
        return row;
      },
      async update({ where, data }) {
        checkOnline();
        const existing = state.patients.find((p) => p.icNumber === where.icNumber);
        if (!existing) throw new Error('Patient not found');
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      },
      async count() {
        checkOnline();
        return state.patients.length;
      },
    },
    doctor: {
      async findUnique({ where }) {
        checkOnline();
        return state.doctors.find((d) => d.id === where.id) || null;
      },
      async findFirst({ where }) {
        checkOnline();
        return state.doctors.find((d) => d.icNumber === where.icNumber) || null;
      },
      async findMany() {
        checkOnline();
        return [...state.doctors].sort((a, b) => a.fullName.localeCompare(b.fullName));
      },
      async count({ where } = {}) {
        checkOnline();
        return state.doctors.filter((d) => (where?.isActive !== undefined ? d.isActive === where.isActive : true)).length;
      },
    },
    medicalRecord: {
      async count({ where } = {}) {
        checkOnline();
        return state.records.filter((r) => {
          if (where?.icNumber && r.icNumber !== where.icNumber) return false;
          if (where?.visitDate?.gte && r.visitDate.getTime() < where.visitDate.gte.getTime()) return false;
          return true;
        }).length;
      },
      async findMany({ where, take } = {}) {
        checkOnline();
        const list = state.records
          .filter((r) => (where?.icNumber ? r.icNumber === where.icNumber : true))
          .sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime())
          .map(hydrateRecord);
        return typeof take === 'number' ? list.slice(0, take) : list;
      },
      async findUnique({ where }) {
        checkOnline();
        const found = state.records.find((r) => r.id === where.id);
        return found ? hydrateRecord(found) : null;
      },
      async create({ data }) {
        checkOnline();
        const now = new Date();
        const recordId = data.id || crypto.randomUUID();
        const row = {
          id: recordId,
          icNumber: data.icNumber,
          doctorId: data.doctorId,
          visitDate: data.visitDate,
          visitType: data.visitType,
          chiefComplaint: data.chiefComplaint,
          diagnosis: data.diagnosis,
          diagnosisCodes: data.diagnosisCodes,
          symptoms: data.symptoms,
          notes: data.notes,
          vitalSigns: data.vitalSigns,
          followUpDate: data.followUpDate,
          createdAt: now,
          updatedAt: now,
        };
        state.records.push(row);

        if (data.prescriptions?.create) {
          for (const rx of data.prescriptions.create) {
            state.prescriptions.push({ id: crypto.randomUUID(), recordId, ...rx });
          }
        }
        if (data.labReports?.create) {
          for (const lab of data.labReports.create) {
            state.labReports.push({ id: crypto.randomUUID(), recordId, ...lab });
          }
        }
        return hydrateRecord(row);
      },
      async update({ where, data }) {
        checkOnline();
        const existing = state.records.find((r) => r.id === where.id);
        if (!existing) throw new Error('MedicalRecord not found');
        const { prescriptions, labReports, ...scalarUpdates } = data;
        Object.assign(existing, scalarUpdates, { updatedAt: new Date() });

        if (prescriptions?.create) {
          for (const rx of prescriptions.create) {
            state.prescriptions.push({ id: crypto.randomUUID(), recordId: existing.id, ...rx });
          }
        }
        if (labReports?.create) {
          for (const lab of labReports.create) {
            state.labReports.push({ id: crypto.randomUUID(), recordId: existing.id, ...lab });
          }
        }
        return hydrateRecord(existing);
      },
    },
    prescription: {
      async deleteMany({ where }) {
        checkOnline();
        state.prescriptions = state.prescriptions.filter((p) => p.recordId !== where.recordId);
      },
    },
    labReport: {
      async deleteMany({ where }) {
        checkOnline();
        state.labReports = state.labReports.filter((l) => l.recordId !== where.recordId);
      },
    },
  };
}

function buildSeededTestFixture() {
  const pwdHash = authMiddleware.hashPassword('demo123');
  const central = createMockCentralPrisma({
    hospitals: configMod.HOSPITALS.map((h) => ({
      ...h,
      apiEndpoint: `http://localhost:${h.port}`,
      isActive: true,
    })),
    users: [
      {
        id: 'user-doc-kl',
        icNumber: '800101-14-5001',
        role: 'doctor',
        hospitalId: 'hospital-kl',
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-pat-dual',
        icNumber: '800101-14-5001',
        role: 'patient',
        hospitalId: null,
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-doc-pg',
        icNumber: '790303-07-5002',
        role: 'doctor',
        hospitalId: 'hospital-penang',
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-pat-1',
        icNumber: '850505-10-5111',
        role: 'patient',
        hospitalId: null,
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-pat-2',
        icNumber: '900202-07-5222',
        role: 'patient',
        hospitalId: null,
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-admin-kl',
        icNumber: '750101-14-6001',
        role: 'hospital_admin',
        hospitalId: 'hospital-kl',
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
      {
        id: 'user-central-admin',
        icNumber: '700101-14-7001',
        role: 'central_admin',
        hospitalId: null,
        passwordHash: pwdHash,
        lastLogin: null,
        isActive: true,
      },
    ],
    patientIndexes: [
      {
        icNumber: '850505-10-5111',
        lastUpdated: '2026-05-10T10:00:00.000Z',
        hospitals: ['hospital-kl', 'hospital-penang'],
      },
      {
        icNumber: '900202-07-5222',
        lastUpdated: '2026-05-12T08:00:00.000Z',
        hospitals: ['hospital-penang'],
      },
      {
        icNumber: '800101-14-5001',
        lastUpdated: '2026-05-01T08:00:00.000Z',
        hospitals: ['hospital-kl'],
      },
    ],
    privacySettings: [],
    auditLogs: [
      {
        id: 'log-kl-1',
        timestamp: new Date('2026-05-15T18:45:00.000Z'),
        action: 'query',
        actorId: 'user-doc-kl',
        actorType: 'doctor',
        actorHospitalId: 'hospital-kl',
        targetIcNumber: '850505-10-5111',
        targetHospitalId: 'hospital-kl',
        details: 'Evening consultation query at KL General',
        ipAddress: '10.0.0.1',
        success: true,
      },
      {
        id: 'log-pg-only',
        timestamp: new Date('2026-05-15T19:15:00.000Z'),
        action: 'query',
        actorId: 'user-doc-pg',
        actorType: 'doctor',
        actorHospitalId: 'hospital-penang',
        targetIcNumber: '900202-07-5222',
        targetHospitalId: 'hospital-penang',
        details: 'Penang internal consultation query',
        ipAddress: '10.0.2.1',
        success: true,
      },
    ],
  });

  const klDb = createMockHospitalPrisma({
    doctors: [
      {
        id: 'doc-kl-1',
        icNumber: '800101-14-5001',
        fullName: 'Dr. Ahmad Razak',
        specialization: 'Internal Medicine',
        licenseNumber: 'MMC-40112',
        department: 'Internal Medicine',
        phone: '+60 3-2615 1001',
        email: 'ahmad@klgeneral.gov.my',
        isActive: true,
      },
      {
        id: 'doc-kl-2',
        icNumber: '810202-14-5099',
        fullName: 'Dr. Siti Aminah',
        specialization: 'Cardiology',
        licenseNumber: 'MMC-40199',
        department: 'Cardiology',
        phone: '+60 3-2615 1002',
        email: 'siti@klgeneral.gov.my',
        isActive: true,
      },
    ],
    patients: [
      {
        icNumber: '850505-10-5111',
        fullName: 'Tan Wei Ming',
        dateOfBirth: new Date('1985-05-05T00:00:00.000Z'),
        gender: 'male',
        bloodType: 'O+',
        phone: '+60 12-345 6789',
        email: 'tan@example.com',
        address: 'Kuala Lumpur',
        emergencyContact: 'Lim Mei Ling',
        emergencyPhone: '+60 12-999 8888',
        allergies: JSON.stringify(['Aspirin']),
        chronicConditions: JSON.stringify(['Type 2 Diabetes']),
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-05-10T00:00:00.000Z'),
      },
      {
        icNumber: '800101-14-5001',
        fullName: 'Dr. Ahmad Razak',
        dateOfBirth: new Date('1980-01-01T00:00:00.000Z'),
        gender: 'male',
        bloodType: 'A+',
        phone: '+60 3-2615 1001',
        email: 'ahmad@klgeneral.gov.my',
        address: 'Kuala Lumpur',
        emergencyContact: 'Nurul Huda',
        emergencyPhone: '+60 12-111 2222',
        allergies: JSON.stringify([]),
        chronicConditions: JSON.stringify([]),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    records: [
      {
        id: 'rec-kl-101',
        icNumber: '850505-10-5111',
        doctorId: 'doc-kl-1',
        visitDate: new Date('2026-05-10T09:30:00.000Z'),
        visitType: 'outpatient',
        chiefComplaint: 'Routine glycemic review',
        diagnosis: JSON.stringify(['Type 2 Diabetes Mellitus']),
        diagnosisCodes: JSON.stringify(['E11.9']),
        symptoms: JSON.stringify(['Polyuria']),
        notes: 'Continue oral hypoglycemic therapy',
        vitalSigns: JSON.stringify({ bloodPressureSystolic: 126, bloodPressureDiastolic: 80, heartRate: 74, temperature: 36.7 }),
        followUpDate: new Date('2026-08-10T00:00:00.000Z'),
        createdAt: new Date('2026-05-10T09:30:00.000Z'),
        updatedAt: new Date('2026-05-10T09:30:00.000Z'),
      },
    ],
    prescriptions: [
      {
        id: 'rx-kl-1',
        recordId: 'rec-kl-101',
        medicationName: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '90 days',
        quantity: 180,
        instructions: 'Take after meals',
        isActive: true,
      },
    ],
    labReports: [
      {
        id: 'lab-kl-1',
        recordId: 'rec-kl-101',
        testType: 'Biochemistry',
        testName: 'HbA1c',
        result: '7.2',
        unit: '%',
        referenceRange: '4.0 - 5.6',
        isAbnormal: true,
        reportDate: new Date('2026-05-10T09:00:00.000Z'),
        notes: 'Slightly above target',
      },
    ],
  });

  const penangDb = createMockHospitalPrisma({
    doctors: [
      {
        id: 'doc-pg-1',
        icNumber: '790303-07-5002',
        fullName: 'Dr. Lim Kah Wai',
        specialization: 'Emergency Medicine',
        licenseNumber: 'MMC-38900',
        department: 'Emergency',
        phone: '+60 4-222 5111',
        email: 'lim@penanggeneral.gov.my',
        isActive: true,
      },
    ],
    patients: [
      {
        icNumber: '850505-10-5111',
        fullName: 'Tan Wei Ming',
        dateOfBirth: new Date('1985-05-05T00:00:00.000Z'),
        gender: 'male',
        bloodType: 'O+',
        phone: '+60 12-345 6789',
        email: 'tan@example.com',
        address: 'Kuala Lumpur',
        emergencyContact: 'Lim Mei Ling',
        emergencyPhone: '+60 12-999 8888',
        allergies: JSON.stringify(['Aspirin']),
        chronicConditions: JSON.stringify(['Hypertension']),
        createdAt: new Date('2026-02-10T00:00:00.000Z'),
        updatedAt: new Date('2026-02-10T00:00:00.000Z'),
      },
      {
        icNumber: '900202-07-5222',
        fullName: 'Aisyah Binti Ismail',
        dateOfBirth: new Date('1990-02-02T00:00:00.000Z'),
        gender: 'female',
        bloodType: 'B+',
        phone: '+60 17-222 3333',
        email: 'aisyah@example.com',
        address: 'George Town, Penang',
        emergencyContact: 'Ismail Bin Hassan',
        emergencyPhone: '+60 17-444 5555',
        allergies: JSON.stringify(['Penicillin', 'Shellfish']),
        chronicConditions: JSON.stringify(['Bronchial Asthma']),
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-12T00:00:00.000Z'),
      },
    ],
    records: [
      {
        id: 'rec-pg-201',
        icNumber: '900202-07-5222',
        doctorId: 'doc-pg-1',
        visitDate: new Date('2026-05-12T08:00:00.000Z'),
        visitType: 'emergency',
        chiefComplaint: 'Acute wheezing episode',
        diagnosis: JSON.stringify(['Acute Asthma Exacerbation']),
        diagnosisCodes: JSON.stringify(['J45.901']),
        symptoms: JSON.stringify(['Wheezing', 'Shortness of breath']),
        notes: 'Nebulized bronchodilator administered',
        vitalSigns: JSON.stringify({ bloodPressureSystolic: 118, bloodPressureDiastolic: 76, heartRate: 96, oxygenSaturation: 95 }),
        followUpDate: null,
        createdAt: new Date('2026-05-12T08:00:00.000Z'),
        updatedAt: new Date('2026-05-12T08:00:00.000Z'),
      },
      {
        id: 'rec-pg-202',
        icNumber: '850505-10-5111',
        doctorId: 'doc-pg-1',
        visitDate: new Date('2026-02-10T14:00:00.000Z'),
        visitType: 'outpatient',
        chiefComplaint: 'Elevated BP during business trip',
        diagnosis: JSON.stringify(['Essential Hypertension']),
        diagnosisCodes: JSON.stringify(['I10']),
        symptoms: JSON.stringify(['Headache']),
        notes: 'Started Amlodipine',
        vitalSigns: JSON.stringify({ bloodPressureSystolic: 148, bloodPressureDiastolic: 92, heartRate: 80 }),
        followUpDate: null,
        createdAt: new Date('2026-02-10T14:00:00.000Z'),
        updatedAt: new Date('2026-02-10T14:00:00.000Z'),
      },
    ],
    prescriptions: [
      {
        id: 'rx-pg-1',
        recordId: 'rec-pg-201',
        medicationName: 'Salbutamol Inhaler',
        dosage: '100mcg',
        frequency: '2 puffs PRN',
        duration: '30 days',
        quantity: 1,
        instructions: 'Inhale during bronchospasm',
        isActive: true,
      },
      {
        id: 'rx-pg-2',
        recordId: 'rec-pg-202',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '60 days',
        quantity: 60,
        instructions: 'Morning',
        isActive: true,
      },
    ],
    labReports: [],
  });

  const hospitals = {
    'hospital-kl': klDb,
    'hospital-penang': penangDb,
    'hospital-jb': createMockHospitalPrisma(),
    'hospital-kuching': createMockHospitalPrisma(),
    'hospital-kk': createMockHospitalPrisma(),
  };

  authMiddleware.clearRevokedTokensForTesting();
  centralRouteMod.clearEmergencyRateLimitsForTesting();
  if (typeof hospitalRouteMod.clearRecordSubmissionGuardForTesting === 'function') {
    hospitalRouteMod.clearRecordSubmissionGuardForTesting();
  }
  multiDbManager.setDbClientsForTesting(central, hospitals);
  hospitalMultiMod.resetHospitalDbInstances();

  return { central, hospitals };
}

function requestJson(baseUrl, method, urlPath, { token, body, ip } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlPath, baseUrl);
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const headers = {
      Accept: 'application/json',
      ...(payload !== null
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
    };

    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { raw: text };
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

async function loginAndVerifyDoctor(baseUrl, icNumber, password = 'demo123') {
  const loginRes = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber, password, role: 'doctor' },
  });
  assert.equal(loginRes.status, 200);
  const preToken = loginRes.body.data.token;
  const verifyRes = await requestJson(baseUrl, 'POST', '/api/auth/verify-hospital', {
    token: preToken,
    body: { method: 'ic_chip', icNumber },
  });
  assert.equal(verifyRes.status, 200);
  return { preToken, verifiedToken: verifyRes.body.data.token, user: verifyRes.body.data.user };
}

// ---------------------------------------------------------------------------
// 3. Automated Test Cases
// ---------------------------------------------------------------------------
let server;
let baseUrl;

test.before(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Backend TypeScript compilation & Prisma schema integrity', () => {
  const tsFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        tsFiles.push(full);
      }
    }
  }
  walk(BACKEND_ROOT);
  assert.ok(tsFiles.length >= 11, `Expected >= 11 backend TS files, found ${tsFiles.length}`);

  for (const file of tsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const compiled = transpileBackendTs(code, file);
    assert.ok(typeof compiled === 'string' && compiled.length > 0, `Failed to transpile ${file}`);
  }

  const centralSchema = fs.readFileSync(path.join(BACKEND_ROOT, 'prisma/schema.central.prisma'), 'utf8');
  const hospitalSchema = fs.readFileSync(path.join(BACKEND_ROOT, 'prisma/schema.hospital.prisma'), 'utf8');

  assert.match(centralSchema, /@@unique\(\[icNumber,\s*role\]\)/);
  assert.match(centralSchema, /onDelete:\s*Cascade/);
  assert.match(hospitalSchema, /@@unique\(\[icNumber\]\)/);
  assert.match(hospitalSchema, /onDelete:\s*Cascade/);
});

test('2. Production environment configuration fail-fast validation', () => {
  assert.doesNotThrow(() => configMod.createConfig({ NODE_ENV: 'development' }));

  assert.throws(
    () => configMod.createConfig({ NODE_ENV: 'production' }),
    /Production configuration validation failed/
  );

  assert.throws(
    () =>
      configMod.createConfig({
        NODE_ENV: 'production',
        JWT_SECRET: configMod.DEV_DEFAULT_JWT_SECRET,
        DATABASE_URL_CENTRAL: 'postgresql://prod/central',
        DATABASE_URL_HOSPITAL_KL: 'postgresql://prod/kl',
        DATABASE_URL_HOSPITAL_PENANG: 'postgresql://prod/pg',
        DATABASE_URL_HOSPITAL_JB: 'postgresql://prod/jb',
        DATABASE_URL_HOSPITAL_KUCHING: 'postgresql://prod/kch',
        DATABASE_URL_HOSPITAL_KK: 'postgresql://prod/kk',
      }),
    /JWT_SECRET/
  );

  const validProd = configMod.createConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'prod-ultra-strong-jwt-secret-key-at-least-32-bytes!',
    DATABASE_URL_CENTRAL: 'postgresql://prod/central',
    DATABASE_URL_HOSPITAL_KL: 'postgresql://prod/kl',
    DATABASE_URL_HOSPITAL_PENANG: 'postgresql://prod/pg',
    DATABASE_URL_HOSPITAL_JB: 'postgresql://prod/jb',
    DATABASE_URL_HOSPITAL_KUCHING: 'postgresql://prod/kch',
    DATABASE_URL_HOSPITAL_KK: 'postgresql://prod/kk',
  });
  assert.equal(validProd.isProduction, true);
  assert.equal(validProd.jwt.secret, 'prod-ultra-strong-jwt-secret-key-at-least-32-bytes!');
});

test('3. Multi-role MyKad login discovery, hospital secondary verification, switch-role & token revocation', async () => {
  buildSeededTestFixture();

  const badLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '800101145001', password: 'wrong-password' },
  });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.body.data, undefined);

  const rolePrompt = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '800101145001', password: 'demo123' },
  });
  assert.equal(rolePrompt.status, 200);
  assert.equal(rolePrompt.body.data.requiresRoleSelection, true);
  assert.deepEqual(rolePrompt.body.data.availableRoles.sort(), ['doctor', 'patient']);

  const docLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '800101-14-5001', password: 'demo123', role: 'doctor' },
  });
  assert.equal(docLogin.status, 200);
  assert.equal(docLogin.body.data.user.hospitalVerified, false);
  const preToken = docLogin.body.data.token;

  const blockedQuery = await requestJson(baseUrl, 'GET', '/api/central/query/850505-10-5111', {
    token: preToken,
  });
  assert.equal(blockedQuery.status, 403);
  assert.equal(blockedQuery.body.verificationRequired, true);

  const blockedHosp = await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl', {
    token: preToken,
  });
  assert.equal(blockedHosp.status, 403);
  assert.equal(blockedHosp.body.verificationRequired, true);

  const wrongChip = await requestJson(baseUrl, 'POST', '/api/auth/verify-hospital', {
    token: preToken,
    body: { method: 'ic_chip', icNumber: '999999-14-9999' },
  });
  assert.equal(wrongChip.status, 401);

  const wrongCreds = await requestJson(baseUrl, 'POST', '/api/auth/verify-hospital', {
    token: preToken,
    body: { method: 'credentials', username: 'MMC-40112', password: 'bad' },
  });
  assert.equal(wrongCreds.status, 401);

  const verifiedRes = await requestJson(baseUrl, 'POST', '/api/auth/verify-hospital', {
    token: preToken,
    body: { method: 'credentials', username: 'MMC-40112', password: 'demo123' },
  });
  assert.equal(verifiedRes.status, 200);
  assert.equal(verifiedRes.body.data.user.hospitalVerified, true);
  const verifiedToken = verifiedRes.body.data.token;

  const oldPreTokenCheck = await requestJson(baseUrl, 'GET', '/api/auth/me', { token: preToken });
  assert.equal(oldPreTokenCheck.status, 401);

  const switchToPatient = await requestJson(baseUrl, 'POST', '/api/auth/switch-role', {
    token: verifiedToken,
    body: { role: 'patient' },
  });
  assert.equal(switchToPatient.status, 200);
  assert.equal(switchToPatient.body.data.user.role, 'patient');
  assert.equal(switchToPatient.body.data.user.hospitalVerified, true);
  const patientToken = switchToPatient.body.data.token;

  // Previous verified doctor token must be revoked upon switch-role
  const staleDocTokenCheck = await requestJson(baseUrl, 'GET', '/api/auth/me', {
    token: verifiedToken,
  });
  assert.equal(staleDocTokenCheck.status, 401);

  const illegalSwitch = await requestJson(baseUrl, 'POST', '/api/auth/switch-role', {
    token: patientToken,
    body: { role: 'central_admin' },
  });
  assert.equal(illegalSwitch.status, 403);

  const switchToDoctor = await requestJson(baseUrl, 'POST', '/api/auth/switch-role', {
    token: patientToken,
    body: { role: 'doctor' },
  });
  assert.equal(switchToDoctor.status, 200);
  assert.equal(switchToDoctor.body.data.user.hospitalVerified, false);

  const logoutRes = await requestJson(baseUrl, 'POST', '/api/auth/logout', {
    token: switchToDoctor.body.data.token,
  });
  assert.equal(logoutRes.status, 200);

  const afterLogoutMe = await requestJson(baseUrl, 'GET', '/api/auth/me', {
    token: switchToDoctor.body.data.token,
  });
  assert.equal(afterLogoutMe.status, 401);
});

test('4. Zero-trust RBAC, IDOR prevention & unified patient hospital privacy blacklist (403 + audit log)', async () => {
  buildSeededTestFixture();

  assert.equal((await requestJson(baseUrl, 'GET', '/api/central/stats')).status, 401);
  assert.equal((await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl')).status, 401);
  assert.equal((await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl/stats')).status, 401);

  const patLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '850505-10-5111', password: 'demo123' },
  });
  const patToken = patLogin.body.data.token;

  const selfQuery = await requestJson(baseUrl, 'GET', '/api/central/query/850505105111', {
    token: patToken,
  });
  assert.equal(selfQuery.status, 200);
  assert.equal(selfQuery.body.data.totalRecords, 2);

  const idorQuery = await requestJson(baseUrl, 'GET', '/api/central/query/900202-07-5222', {
    token: patToken,
  });
  assert.equal(idorQuery.status, 403);

  const idorProfile = await requestJson(baseUrl, 'GET', '/api/central/patient/900202-07-5222', {
    token: patToken,
  });
  assert.equal(idorProfile.status, 403);

  const blockRes = await requestJson(baseUrl, 'POST', '/api/central/privacy-settings/hospital-access', {
    token: patToken,
    body: { hospitalId: 'hospital-kl', isBlocked: true },
  });
  assert.equal(blockRes.status, 200);

  const { verifiedToken: klDocToken } = await loginAndVerifyDoctor(baseUrl, '800101-14-5001');

  const deniedCentralQuery = await requestJson(baseUrl, 'GET', '/api/central/query/850505-10-5111', {
    token: klDocToken,
  });
  assert.equal(deniedCentralQuery.status, 403);
  assert.equal(deniedCentralQuery.body.accessDenied, true);

  const deniedCentralPatient = await requestJson(baseUrl, 'GET', '/api/central/patient/850505-10-5111', {
    token: klDocToken,
  });
  assert.equal(deniedCentralPatient.status, 403);
  assert.equal(deniedCentralPatient.body.accessDenied, true);

  const deniedHospPatient = await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl/patients/850505-10-5111', {
    token: klDocToken,
  });
  assert.equal(deniedHospPatient.status, 403);
  assert.equal(deniedHospPatient.body.accessDenied, true);

  const deniedCreateRecord = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: {
      icNumber: '850505-10-5111',
      visitDate: '2026-05-20',
      visitType: 'outpatient',
      diagnosis: ['Follow-up'],
    },
  });
  assert.equal(deniedCreateRecord.status, 403);
  assert.equal(deniedCreateRecord.body.accessDenied, true);

  // Blocked patient's records must also be excluded from hospital /stats recentRecords
  const klStatsAfterBlock = await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl/stats', {
    token: klDocToken,
  });
  assert.equal(klStatsAfterBlock.status, 200);
  assert.ok(
    klStatsAfterBlock.body.data.recentRecords.every((r) => r.icNumber !== '850505-10-5111'),
    'Blocked patient must not appear in hospital /stats recentRecords'
  );

  const myAccessLogs = await requestJson(baseUrl, 'GET', '/api/central/my-access-logs', {
    token: patToken,
  });
  assert.equal(myAccessLogs.status, 200);
  assert.ok(
    myAccessLogs.body.data.some((l) => l.actorHospitalId === 'hospital-kl' && l.success === false),
    'Expected denied KL doctor access attempt in patient access logs'
  );

  const { verifiedToken: pgDocToken } = await loginAndVerifyDoctor(baseUrl, '790303-07-5002');
  const pgQuery = await requestJson(baseUrl, 'GET', '/api/central/query/850505-10-5111', {
    token: pgDocToken,
  });
  assert.equal(pgQuery.status, 200);
  const klNode = pgQuery.body.data.hospitals.find((h) => h.hospitalId === 'hospital-kl');
  const pgNode = pgQuery.body.data.hospitals.find((h) => h.hospitalId === 'hospital-penang');
  assert.equal(klNode.records[0].isReadOnly, true);
  assert.equal(pgNode.records[0].isReadOnly, false);

  const unknownIcRes = await requestJson(baseUrl, 'GET', '/api/central/query/991231-14-9999', {
    token: pgDocToken,
  });
  assert.equal(unknownIcRes.status, 404);
  assert.equal(unknownIcRes.body.notFound, true);
});

test('5. Partial hospital offline resilience, hospital_admin audit isolation & inclusive endDate filter', async () => {
  const { hospitals } = buildSeededTestFixture();
  const { verifiedToken: pgDocToken } = await loginAndVerifyDoctor(baseUrl, '790303-07-5002');

  hospitals['hospital-kl']._state.offline = true;
  const partialRes = await requestJson(baseUrl, 'GET', '/api/central/query/850505-10-5111', {
    token: pgDocToken,
  });
  assert.equal(partialRes.status, 200);
  assert.equal(partialRes.body.data.partialFailure, true);
  assert.deepEqual(partialRes.body.data.failedHospitals, ['Kuala Lumpur General Hospital']);
  assert.equal(partialRes.body.data.totalRecords, 1);
  hospitals['hospital-kl']._state.offline = false;

  const adminLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '750101-14-6001', password: 'demo123' },
  });
  const adminVerify = await requestJson(baseUrl, 'POST', '/api/auth/verify-hospital', {
    token: adminLogin.body.data.token,
    body: { method: 'ic_chip', icNumber: '750101-14-6001' },
  });
  const klAdminToken = adminVerify.body.data.token;

  const klAuditRes = await requestJson(
    baseUrl,
    'GET',
    '/api/central/audit-logs?hospitalId=hospital-penang&startDate=2026-05-15&endDate=2026-05-15',
    { token: klAdminToken }
  );
  assert.equal(klAuditRes.status, 200);
  assert.ok(klAuditRes.body.data.some((l) => l.id === 'log-kl-1'), 'Expected evening log on endDate 2026-05-15');
  assert.ok(
    klAuditRes.body.data.every(
      (l) => l.actorHospitalId === 'hospital-kl' || l.targetHospitalId === 'hospital-kl'
    ),
    'Hospital admin must never see unrelated hospital audit logs'
  );

  // Calendar rollover dates (e.g. 2026-02-31) and inverted date ranges (startDate > endDate) must return 400
  const rolloverDateRes = await requestJson(
    baseUrl,
    'GET',
    '/api/central/audit-logs?startDate=2026-02-31',
    { token: klAdminToken }
  );
  assert.equal(rolloverDateRes.status, 400);

  const invertedRangeRes = await requestJson(
    baseUrl,
    'GET',
    '/api/central/audit-logs?startDate=2026-06-10&endDate=2026-05-01',
    { token: klAdminToken }
  );
  assert.equal(invertedRangeRes.status, 400);

  // Hospital admin calling /stats receives redacted clinical details (no notes, prescriptions, labReports)
  const adminStatsRes = await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl/stats', {
    token: klAdminToken,
  });
  assert.equal(adminStatsRes.status, 200);
  assert.equal(adminStatsRes.body.data.recentRecords.length, 1);
  assert.equal(adminStatsRes.body.data.recentRecords[0].notes, '');
  assert.deepEqual(adminStatsRes.body.data.recentRecords[0].prescriptions, []);
  assert.deepEqual(adminStatsRes.body.data.recentRecords[0].labReports, []);

  const centralLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', {
    body: { icNumber: '700101-14-7001', password: 'demo123' },
  });
  const centralAuditRes = await requestJson(
    baseUrl,
    'GET',
    '/api/central/audit-logs?startDate=2026-05-15&endDate=2026-05-15',
    { token: centralLogin.body.data.token }
  );
  assert.equal(centralAuditRes.status, 200);
  assert.ok(centralAuditRes.body.data.some((l) => l.id === 'log-pg-only'));
});

test('6. Prescriptions & labReports persistence, record update, anti-spoofing & cross-hospital first-visit inheritance', async () => {
  buildSeededTestFixture();
  const { verifiedToken: klDocToken } = await loginAndVerifyDoctor(baseUrl, '800101-14-5001');

  const crossHospPost = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-penang/records', {
    token: klDocToken,
    body: { icNumber: '900202-07-5222', diagnosis: ['Test'] },
  });
  assert.equal(crossHospPost.status, 403);

  const spoofedDocPost = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: {
      icNumber: '900202-07-5222',
      doctorId: 'doc-kl-2',
      diagnosis: ['Allergic Rhinitis'],
    },
  });
  assert.equal(spoofedDocPost.status, 403);

  const createRes = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: {
      icNumber: '900202075222',
      visitDate: '2026-05-18T10:00:00.000Z',
      visitType: 'outpatient',
      chiefComplaint: 'Persistent cough after travel',
      diagnosis: ['Mild Bronchospasm'],
      diagnosisCodes: ['J45.20'],
      symptoms: ['Cough'],
      notes: 'Avoid beta-lactam antibiotics due to Penicillin allergy',
      vitalSigns: { bloodPressureSystolic: 116, bloodPressureDiastolic: 74, heartRate: 78, temperature: 36.8 },
      prescriptions: [
        {
          medicationName: 'Montelukast',
          dosage: '10mg',
          frequency: 'Once nightly',
          duration: '30 days',
          quantity: 30,
          instructions: 'Take in the evening',
          isActive: true,
        },
      ],
      labReports: [
        {
          testType: 'Hematology',
          testName: 'Eosinophil Count',
          result: '0.62',
          unit: '10^9/L',
          referenceRange: '0.02 - 0.50',
          isAbnormal: true,
          reportDate: '2026-05-18T10:00:00.000Z',
          notes: 'Mild eosinophilia',
        },
      ],
    },
  });
  assert.equal(createRes.status, 201);
  const createdRecord = createRes.body.data.record;
  assert.equal(createdRecord.doctorId, 'doc-kl-1');
  assert.equal(createdRecord.prescriptions.length, 1);
  assert.equal(createdRecord.prescriptions[0].medicationName, 'Montelukast');
  assert.equal(createdRecord.labReports.length, 1);
  assert.equal(createdRecord.labReports[0].testName, 'Eosinophil Count');

  const localPatRes = await requestJson(
    baseUrl,
    'GET',
    '/api/hospitals/hospital-kl/patients/900202-07-5222',
    { token: klDocToken }
  );
  assert.equal(localPatRes.status, 200);
  assert.equal(localPatRes.body.data.isLocal, true);
  assert.equal(localPatRes.body.data.patient.fullName, 'Aisyah Binti Ismail');
  assert.equal(localPatRes.body.data.patient.dateOfBirth, '1990-02-02');
  assert.equal(localPatRes.body.data.patient.gender, 'female');
  assert.equal(localPatRes.body.data.patient.bloodType, 'B+');
  assert.deepEqual(localPatRes.body.data.patient.allergies.sort(), ['Penicillin', 'Shellfish']);

  const updateRes = await requestJson(
    baseUrl,
    'PUT',
    `/api/hospitals/hospital-kl/records/${createdRecord.id}`,
    {
      token: klDocToken,
      body: {
        diagnosis: ['Mild Bronchospasm', 'Allergic Rhinitis'],
        notes: 'Added nasal corticosteroid spray',
        prescriptions: [
          {
            medicationName: 'Montelukast',
            dosage: '10mg',
            frequency: 'Once nightly',
            duration: '30 days',
            quantity: 30,
            instructions: 'Evening',
            isActive: true,
          },
          {
            medicationName: 'Fluticasone Nasal Spray',
            dosage: '50mcg',
            frequency: 'Once daily',
            duration: '30 days',
            quantity: 1,
            instructions: '2 sprays each nostril',
            isActive: true,
          },
        ],
      },
    }
  );
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.data.record.diagnosis.length, 2);
  assert.equal(updateRes.body.data.record.prescriptions.length, 2);
  assert.equal(updateRes.body.data.record.labReports.length, 1);

  const editForeignRecord = await requestJson(
    baseUrl,
    'PUT',
    '/api/hospitals/hospital-kl/records/rec-pg-201',
    {
      token: klDocToken,
      body: { notes: 'Illegal cross-hospital edit' },
    }
  );
  assert.equal(editForeignRecord.status, 404);
});

test('7. Emergency break-glass clinical aggregation & non-blocking typo rate-limit behavior', async () => {
  buildSeededTestFixture();
  const erIp = '203.0.113.55';

  const typoRes = await requestJson(baseUrl, 'GET', '/api/central/emergency/000101-14-0000', {
    ip: erIp,
  });
  assert.equal(typoRes.status, 404);

  const validErRes = await requestJson(baseUrl, 'GET', '/api/central/emergency/900202-07-5222', {
    ip: erIp,
  });
  assert.equal(validErRes.status, 200);
  assert.equal(validErRes.body.data.bloodType, 'B+');
  assert.deepEqual(validErRes.body.data.allergies.sort(), ['Penicillin', 'Shellfish']);
  assert.ok(
    validErRes.body.data.currentMedications.some((m) => m.name === 'Salbutamol Inhaler'),
    'Expected active Salbutamol Inhaler in emergency summary'
  );
  assert.ok(
    validErRes.body.data.recentDiagnoses.some((d) => d.diagnosis === 'Acute Asthma Exacerbation'),
    'Expected recent diagnosis in emergency summary'
  );

  const repeatSamePatient = await requestJson(baseUrl, 'GET', '/api/central/emergency/900202-07-5222', {
    ip: erIp,
  });
  assert.equal(repeatSamePatient.status, 429);
  assert.equal(repeatSamePatient.body.rateLimited, true);
  assert.ok(repeatSamePatient.body.retryAfter > 0);

  // Verify chronological sorting across multiple hospital nodes (2026-05-10 KL must precede 2026-02-10 Penang)
  const secondErPatient = await requestJson(baseUrl, 'GET', '/api/central/emergency/850505-10-5111', {
    ip: erIp,
  });
  assert.equal(secondErPatient.status, 200);
  assert.equal(secondErPatient.body.data.fullName, 'Tan Wei Ming');
  assert.equal(secondErPatient.body.data.currentMedications.length, 2);
  assert.equal(
    secondErPatient.body.data.recentDiagnoses[0].diagnosis,
    'Type 2 Diabetes Mellitus',
    'Most recent cross-hospital diagnosis must be sorted first'
  );

  // Verify immutable emergency_access audit entry was recorded in central audit logs
  const centralLogin = await requestJson(baseUrl, 'POST', '/api/auth/login', { body: { icNumber: '700101-14-7001', password: 'demo123' } });
  const auditRes = await requestJson(baseUrl, 'GET', '/api/central/audit-logs?targetIcNumber=850505-10-5111', { token: centralLogin.body.data.token });
  assert.equal(auditRes.status, 200);
  assert.ok(auditRes.body.data.some((l) => l.action === 'emergency_access' && l.ipAddress === erIp));

  const scannerIp = '198.51.100.99';
  for (let i = 0; i < 15; i++) {
    const r = await requestJson(baseUrl, 'GET', `/api/central/emergency/990101-14-${String(1000 + i)}`, {
      ip: scannerIp,
    });
    assert.equal(r.status, 404);
  }
  const cappedRes = await requestJson(baseUrl, 'GET', '/api/central/emergency/850505-10-5111', {
    ip: scannerIp,
  });
  assert.equal(cappedRes.status, 429);
  assert.equal(cappedRes.body.rateLimited, true);
});

test('8. Clinical payload validation, duplicate-submission 409 guard & affiliation mismatch revocation', async () => {
  const { central } = buildSeededTestFixture();
  const { verifiedToken: klDocToken } = await loginAndVerifyDoctor(baseUrl, '800101-14-5001');

  // Out-of-bounds physiological vitalSigns rejected with 400
  const invalidVitalsRes = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: {
      icNumber: '850505-10-5111',
      visitDate: '2026-05-22',
      visitType: 'outpatient',
      diagnosis: ['Hypertension Check'],
      vitalSigns: { oxygenSaturation: 145 },
    },
  });
  assert.equal(invalidVitalsRes.status, 400);

  // Incomplete prescription sub-table row rejected with 400
  const invalidRxRes = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: {
      icNumber: '850505-10-5111',
      visitDate: '2026-05-22',
      visitType: 'outpatient',
      diagnosis: ['URI'],
      prescriptions: [{ medicationName: 'Paracetamol', dosage: '', frequency: 'TDS' }],
    },
  });
  assert.equal(invalidRxRes.status, 400);

  // Duplicate identical POST within 2s window rejected with 409 Conflict
  const validPayload = {
    icNumber: '850505-10-5111',
    visitDate: '2026-05-22',
    visitType: 'outpatient',
    chiefComplaint: 'Annual diabetic foot screening',
    diagnosis: ['Type 2 Diabetes Mellitus'],
  };
  const firstPost = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: validPayload,
  });
  assert.equal(firstPost.status, 201);

  const duplicatePost = await requestJson(baseUrl, 'POST', '/api/hospitals/hospital-kl/records', {
    token: klDocToken,
    body: validPayload,
  });
  assert.equal(duplicatePost.status, 409);

  // If central admin reassigns the doctor's hospitalId mid-session, old JWT is rejected with 401
  const docUser = central._state.users.find((u) => u.id === 'user-doc-kl');
  docUser.hospitalId = 'hospital-penang';
  const staleAffiliationRes = await requestJson(baseUrl, 'GET', '/api/hospitals/hospital-kl/stats', {
    token: klDocToken,
  });
  assert.equal(staleAffiliationRes.status, 401);
});
