'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(FRONTEND_ROOT, 'src');

function loadSystemOrLocal(pkgName) {
  try {
    return require(pkgName);
  } catch {
    return require(path.join('/usr/share/nodejs', pkgName));
  }
}

const babel = loadSystemOrLocal('@babel/core');
const babelParser = loadSystemOrLocal('@babel/parser');
const traverseModule = loadSystemOrLocal('@babel/traverse');
const traverse = traverseModule.default || traverseModule;
const presetTypescript = loadSystemOrLocal('@babel/preset-typescript');
const presetReact = loadSystemOrLocal('@babel/preset-react');
const pluginCommonjs = loadSystemOrLocal('@babel/plugin-transform-modules-commonjs');

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

function listDirCaseSensitive(dirPath) {
  if (!fs.existsSync(dirPath)) return new Set();
  return new Set(fs.readdirSync(dirPath));
}

function existsExactCase(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return false;
  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  return listDirCaseSensitive(dir).has(base);
}

function resolveFrontendImport(specifier, fromFile) {
  let baseTarget = null;
  if (specifier.startsWith('@/')) {
    baseTarget = path.join(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    baseTarget = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return 'external';
  }

  const candidates = [
    baseTarget,
    `${baseTarget}.ts`,
    `${baseTarget}.tsx`,
    `${baseTarget}.css`,
    path.join(baseTarget, 'index.ts'),
    path.join(baseTarget, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (existsExactCase(c)) return c;
  }
  return null;
}

// ============================================================================
// Runtime Loader for Pure Frontend Modules (i18n, utils, auth, api, storage)
// ============================================================================

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  };
}

global.localStorage = createMemoryStorage();
global.sessionStorage = createMemoryStorage();

function buildZustandStore(initializer) {
  let state;
  const listeners = new Set();
  const setState = (partial, replace) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(next, state)) {
      state = replace ? next : { ...state, ...next };
      listeners.forEach((l) => l(state));
    }
  };
  const getState = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, subscribe };
  state = initializer(setState, getState, api);
  const useStore = (selector) => (selector ? selector(state) : state);
  Object.assign(useStore, api);
  return useStore;
}

// Supports both `create(fn)` and TypeScript curried `create<T>()(fn)`
const zustandCreate = (initializer) =>
  initializer ? buildZustandStore(initializer) : (curriedInitializer) => buildZustandStore(curriedInitializer);

const zustandPersist = (config, options) => (set, get, api) => {
  const storageKey = options?.name || 'zustand-store';
  const persistSet = (partial, replace) => {
    set(partial, replace);
    const full = get();
    global.localStorage.setItem(storageKey, JSON.stringify({ state: full, version: 0 }));
  };
  return config(persistSet, get, api);
};

const origResolveFilename = Module._resolveFilename;
const origLoad = Module._load;

Module._resolveFilename = function patchedFrontendResolve(request, parent, isMain, options) {
  if ((request.startsWith('@/') || request.startsWith('.')) && parent && parent.filename) {
    const resolved = resolveFrontendImport(request, parent.filename);
    if (resolved && resolved !== 'external') return resolved;
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function patchedFrontendLoad(request, parent, isMain) {
  try {
    return origLoad.call(this, request, parent, isMain);
  } catch (err) {
    if (request === 'clsx') {
      const clsx = (...args) => args.flat(Infinity).filter(Boolean).join(' ');
      return { clsx, default: clsx };
    }
    if (request === 'tailwind-merge') {
      return { twMerge: (s) => s };
    }
    if (request === 'zustand') {
      return { create: zustandCreate };
    }
    if (request === 'zustand/middleware') {
      return {
        persist: zustandPersist,
        createJSONStorage: (fn) => fn(),
      };
    }
    if (request === 'react') {
      return {
        useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
        useEffect: () => {},
        useCallback: (fn) => fn,
      };
    }
    throw err;
  }
};

function compileFrontendTs(mod, filename) {
  let raw = fs.readFileSync(filename, 'utf8');
  raw = raw.replace(/import\.meta\.env\.VITE_API_URL/g, 'process.env.VITE_API_URL');
  const out = babel.transformSync(raw, {
    filename,
    presets: [
      [presetReact, { runtime: 'automatic' }],
      [presetTypescript, { isTSX: filename.endsWith('.tsx'), allExtensions: true }],
    ],
    plugins: [pluginCommonjs],
  });
  mod._compile(out.code, filename);
}

require.extensions['.ts'] = compileFrontendTs;
require.extensions['.tsx'] = compileFrontendTs;

// ============================================================================
// Test Suites
// ============================================================================

describe('Frontend Full-Repo TypeScript/TSX Compilation, Import Graph & Strict Cleanliness', () => {
  const sourceFiles = collectSourceFiles(SRC_ROOT);

  it('compiles all TS/TSX files cleanly and resolves every internal import with exact Linux casing', () => {
    assert.ok(sourceFiles.length >= 68, `Expected >= 68 frontend source files, found ${sourceFiles.length}`);
    const unresolved = [];

    for (const file of sourceFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        ImportDeclaration(p) {
          const spec = p.node.source.value;
          const resolved = resolveFrontendImport(spec, file);
          if (!resolved) {
            unresolved.push(`${path.relative(FRONTEND_ROOT, file)} -> ${spec}`);
          }
        },
        ExportNamedDeclaration(p) {
          if (p.node.source) {
            const spec = p.node.source.value;
            const resolved = resolveFrontendImport(spec, file);
            if (!resolved) {
              unresolved.push(`${path.relative(FRONTEND_ROOT, file)} -> ${spec}`);
            }
          }
        },
      });

      const transformed = babel.transformSync(code.replace(/import\.meta\.env/g, '({})'), {
        filename: file,
        presets: [
          [presetReact, { runtime: 'automatic' }],
          [presetTypescript, { isTSX: file.endsWith('.tsx'), allExtensions: true }],
        ],
        plugins: [pluginCommonjs],
      });
      assert.ok(transformed && transformed.code.length > 0, `Failed to transpile ${file}`);
    }

    assert.deepEqual(unresolved, [], `Broken frontend imports detected:\n${unresolved.join('\n')}`);
  });

  it('enforces zero unused value imports across all TS/TSX files (tsc noUnusedLocals guard)', () => {
    const unusedValueImports = [];

    for (const file of sourceFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        Program(programPath) {
          programPath.scope.crawl();
          for (const stmt of programPath.get('body')) {
            if (!stmt.isImportDeclaration()) continue;
            if (stmt.node.importKind === 'type') continue;
            for (const spec of stmt.get('specifiers')) {
              if (spec.node.importKind === 'type') continue;
              const localName = spec.node.local.name;
              if (localName === 'React') continue;
              const binding = programPath.scope.getBinding(localName);
              let usedInType = false;
              programPath.traverse({
                Identifier(idPath) {
                  if (idPath.node.name === localName && idPath.node !== spec.node.local) {
                    usedInType = true;
                  }
                },
                JSXIdentifier(jsxPath) {
                  if (jsxPath.node.name === localName) {
                    usedInType = true;
                  }
                },
              });
              if ((!binding || !binding.referenced) && !usedInType) {
                unusedValueImports.push(`${path.relative(FRONTEND_ROOT, file)}: unused import '${localName}'`);
              }
            }
          }
        },
      });
    }

    assert.deepEqual(
      unusedValueImports,
      [],
      `Unused imports would break 'tsc -b' build:\n${unusedValueImports.join('\n')}`
    );
  });

  it('keeps frontend package.json and package-lock.json 100% synchronized and preserves accessibility CSS rules', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package-lock.json'), 'utf8'));
    const lockRoot = lock.packages && lock.packages[''];
    assert.ok(lockRoot, 'frontend/package-lock.json must contain packages[""]');
    assert.deepEqual(pkg.dependencies, lockRoot.dependencies);
    assert.deepEqual(pkg.devDependencies, lockRoot.devDependencies);

    const indexCss = fs.readFileSync(path.join(SRC_ROOT, 'index.css'), 'utf8');
    assert.match(indexCss, /data-font-size='large'/);
    assert.match(indexCss, /high-contrast/);
  });
});

describe('Frontend i18n Trilingual Parity (en / ms / zh)', () => {
  const { translations } = require(path.join(SRC_ROOT, 'lib/i18n.ts'));

  function flattenKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...flattenKeys(v, next));
      } else {
        assert.equal(typeof v, 'string', `Translation ${next} must be string`);
        assert.ok(v.trim().length > 0, `Translation ${next} must not be empty`);
        keys.push(next);
      }
    }
    return keys.sort();
  }

  it('maintains 100% identical key hierarchy across English, Bahasa Melayu, and Chinese', () => {
    const enKeys = flattenKeys(translations.en);
    const msKeys = flattenKeys(translations.ms);
    const zhKeys = flattenKeys(translations.zh);

    assert.ok(enKeys.length >= 50, `Expected >= 50 translation keys, found ${enKeys.length}`);
    assert.deepEqual(msKeys, enKeys, 'Bahasa Melayu keys must match English keys');
    assert.deepEqual(zhKeys, enKeys, 'Chinese keys must match English keys');
  });
});

describe('Frontend Core Utilities, Auth Store & API Contract Behavior', () => {
  const utils = require(path.join(SRC_ROOT, 'lib/utils.ts'));
  const { useAuthStore } = require(path.join(SRC_ROOT, 'store/auth.ts'));
  const { authApi, centralApi } = require(path.join(SRC_ROOT, 'lib/api.ts'));

  it('formats MyKad numbers, masks ICs, parses MyKad demographics, and routes roles accurately', () => {
    assert.equal(utils.formatIC('880515145678'), '880515-14-5678');
    assert.equal(utils.maskIC('880515-14-5678'), '880515-14-****');

    const demoMale = utils.parseMyKadDemographics('880515-14-5677');
    assert.equal(demoMale.dateOfBirth, '1988-05-15');
    assert.equal(demoMale.gender, 'male');

    const demoFemale = utils.parseMyKadDemographics('040220-10-1234');
    assert.equal(demoFemale.dateOfBirth, '2004-02-20');
    assert.equal(demoFemale.gender, 'female');

    assert.equal(
      utils.formatActorDisplayName('550e8400-e29b-41d4-a716-446655440000', undefined, 'doctor'),
      'Healthcare Provider'
    );
    assert.equal(utils.formatActorDisplayName('Dr. Ahmad Razak', 'u1', 'doctor'), 'Dr. Ahmad Razak');

    assert.equal(utils.getRoleHomePath('doctor', false), '/verify');
    assert.equal(utils.getRoleHomePath('doctor', true), '/doctor');
    assert.equal(utils.getRoleHomePath('hospital_admin', false), '/verify');
    assert.equal(utils.getRoleHomePath('hospital_admin', true), '/admin/hospital');
    assert.equal(utils.getRoleHomePath('patient', false), '/patient');
    assert.equal(utils.getRoleHomePath('central_admin', false), '/admin/central');
  });

  it('manages auth hospital verification state and clears workstation sessionStorage keys on logout', () => {
    global.sessionStorage.setItem('medlink:queue:hospital-kl', '[{"id":"1"}]');
    global.localStorage.setItem('medlink-lang', 'ms');

    useAuthStore.getState().login('tok-doc', {
      id: 'u-1',
      icNumber: '750101-14-5001',
      role: 'doctor',
      hospitalId: 'hospital-kl',
      availableRoles: ['doctor', 'patient'],
    });
    // Hospital staff starts unverified until second-step verification succeeds
    assert.equal(useAuthStore.getState().isHospitalVerified, false);

    useAuthStore.getState().completeHospitalVerification();
    assert.equal(useAuthStore.getState().isHospitalVerified, true);

    // Re-logging in as patient sets isHospitalVerified = true (no hospital verification step required)
    useAuthStore.getState().login('tok-pat', {
      id: 'u-2',
      icNumber: '750101-14-5001',
      role: 'patient',
      availableRoles: ['doctor', 'patient'],
    });
    assert.equal(useAuthStore.getState().user.role, 'patient');
    assert.equal(useAuthStore.getState().isHospitalVerified, true);

    // Logout clears medlink:* sessionStorage items while preserving language preference
    useAuthStore.getState().logout();
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(global.sessionStorage.getItem('medlink:queue:hospital-kl'), null);
    assert.equal(global.localStorage.getItem('medlink-lang'), 'ms');
  });

  it('propagates 403 accessDenied, 429 rateLimited/retryAfter, and auto-logs out on expired 401 token (except /auth/verify-hospital)', async () => {
    const origFetch = global.fetch;
    try {
      useAuthStore.getState().login('tok-valid', {
        id: 'u-doc',
        icNumber: '750101-14-5001',
        role: 'doctor',
        hospitalId: 'hospital-kl',
      });

      // 1) Wrong password on /auth/verify-hospital (401) MUST NOT wipe logged-in token!
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Invalid hospital password' }),
      });
      const verifyFail = await authApi.verifyHospital({ method: 'credentials', password: 'bad' });
      assert.equal(verifyFail.success, false);
      assert.equal(useAuthStore.getState().isAuthenticated, true);

      // 2) 403 privacy block preserves accessDenied=true
      global.fetch = async () => ({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Patient blocked hospital', accessDenied: true }),
      });
      const blocked = await centralApi.queryPatient('880515-14-5678');
      assert.equal(blocked.accessDenied, true);
      assert.equal(blocked.status, 403);

      // 3) 429 emergency cooldown preserves rateLimited & retryAfter
      global.fetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({ success: false, error: 'Cooldown', rateLimited: true, retryAfter: 42 }),
      });
      const limited = await centralApi.emergencyQuery('880515-14-5678');
      assert.equal(limited.rateLimited, true);
      assert.equal(limited.retryAfter, 42);

      // 4) Expired JWT (401) on protected route automatically clears auth store
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Token expired' }),
      });
      await centralApi.getStats();
      assert.equal(useAuthStore.getState().isAuthenticated, false);
      assert.equal(useAuthStore.getState().token, null);
    } finally {
      global.fetch = origFetch;
    }
  });
});
