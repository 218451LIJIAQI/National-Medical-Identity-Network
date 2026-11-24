'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');
const SRC_ROOT = path.join(FRONTEND_ROOT, 'src');

function createPortableFrontendTranspiler() {
  const tsCandidates = [
    path.join(FRONTEND_ROOT, 'node_modules', 'typescript'),
    path.join(REPO_ROOT, 'backend', 'node_modules', 'typescript'),
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
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
            resolveJsonModule: true,
          },
        });
        if (result.diagnostics && result.diagnostics.length > 0) {
          const formatted = result.diagnostics
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
            .join('; ');
          throw new Error(`TypeScript/JSX syntax error in ${filename}: ${formatted}`);
        }
        return result.outputText;
      };
    } catch {
      // Try next compiler candidate
    }
  }

  const babelRoots = [
    path.join(FRONTEND_ROOT, 'node_modules'),
    path.join(REPO_ROOT, 'backend', 'node_modules'),
    '/usr/share/nodejs',
  ];
  for (const base of babelRoots) {
    try {
      const babel = require(path.join(base, '@babel', 'core'));
      const presetTypescript = require(path.join(base, '@babel', 'preset-typescript'));
      const presetReact = require(path.join(base, '@babel', 'preset-react'));
      const pluginCommonjs = require(path.join(base, '@babel', 'plugin-transform-modules-commonjs'));
      return (source, filename) => {
        const transformed = babel.transformSync(source, {
          filename,
          babelrc: false,
          configFile: false,
          presets: [
            [presetReact, { runtime: 'automatic' }],
            [presetTypescript, { isTSX: filename.endsWith('.tsx'), allExtensions: true }],
          ],
          plugins: [pluginCommonjs],
        });
        return transformed?.code ?? '';
      };
    } catch {
      // Try next root
    }
  }
  throw new Error('Unable to locate `typescript` or `@babel/core` to run frontend tests.');
}

const transpileFrontendTs = createPortableFrontendTranspiler();

function collectFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'tests') continue;
      collectFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function existsCaseSensitive(absPath) {
  const parsed = path.parse(absPath);
  const segments = absPath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const seg of segments) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return false;
    const entries = fs.readdirSync(current);
    if (!entries.includes(seg)) return false;
    current = path.join(current, seg);
  }
  return fs.existsSync(current) && fs.statSync(current).isFile();
}

function resolveImportCaseSensitive(fromFile, specifier) {
  let baseTarget;
  if (specifier.startsWith('@/')) {
    baseTarget = path.join(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    baseTarget = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return { external: true, resolved: specifier };
  }

  const candidates = [
    baseTarget,
    `${baseTarget}.ts`,
    `${baseTarget}.tsx`,
    `${baseTarget}.js`,
    `${baseTarget}.jsx`,
    `${baseTarget}.css`,
    path.join(baseTarget, 'index.ts'),
    path.join(baseTarget, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (existsCaseSensitive(candidate)) {
      return { external: false, resolved: candidate };
    }
  }
  return { external: false, resolved: null, attempted: baseTarget };
}

function createZustandShim() {
  function createImpl(initializer) {
    let state;
    const setState = (partial) => {
      const next = typeof partial === 'function' ? partial(state) : partial;
      state = Object.assign({}, state, next);
    };
    const getState = () => state;
    const api = { setState, getState, subscribe: () => () => {} };
    state = initializer(setState, getState, api);
    const useStore = (selector) => (typeof selector === 'function' ? selector(state) : state);
    Object.assign(useStore, api);
    return useStore;
  }
  const create = (arg) => (typeof arg === 'function' ? createImpl(arg) : createImpl);
  return { create, default: create };
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedFrontendResolve(request, parent, isMain, options) {
  if (request === 'clsx') return '__fe_shim__:clsx';
  if (request === 'tailwind-merge') return '__fe_shim__:tailwind-merge';
  if (request === 'zustand') return '__fe_shim__:zustand';
  if (request === 'zustand/middleware') return '__fe_shim__:zustand_mw';
  if (request === '@/store/settings') return '__fe_shim__:settings';
  if (request.startsWith('@/') || (request.startsWith('.') && parent?.filename?.startsWith(SRC_ROOT))) {
    const res = resolveImportCaseSensitive(parent.filename, request);
    if (!res.external && res.resolved) return res.resolved;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const originalLoad = Module._load;
Module._load = function patchedFrontendLoad(request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (resolved === '__fe_shim__:clsx') {
    const clsx = (...args) => args.flat(Infinity).filter(Boolean).join(' ');
    return { clsx, default: clsx };
  }
  if (resolved === '__fe_shim__:tailwind-merge') {
    return { twMerge: (s) => s };
  }
  if (resolved === '__fe_shim__:zustand') {
    return createZustandShim();
  }
  if (resolved === '__fe_shim__:zustand_mw') {
    return {
      persist: (config) => config,
      createJSONStorage: () => ({}),
    };
  }
  if (resolved === '__fe_shim__:settings') {
    return {
      useSettingsStore: (selector) => selector({ language: 'en', setLanguage: () => {} }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = function compileFrontendTs(module, filename) {
    const raw = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env/g, '({})');
    const code = transpileFrontendTs(raw, filename);
    module._compile(code, filename);
  };
}

const allSrcFiles = collectFiles(
  SRC_ROOT,
  (f) => f.endsWith('.ts') || f.endsWith('.tsx')
);
const allFrontendTsFiles = collectFiles(
  FRONTEND_ROOT,
  (f) => f.endsWith('.ts') || f.endsWith('.tsx')
);

test('1. Transpiles 100% of frontend TypeScript & TSX files cleanly (debloated architecture)', () => {
  assert.equal(allSrcFiles.length, 62, `Expected 62 src TS/TSX files, found ${allSrcFiles.length}`);
  assert.equal(allFrontendTsFiles.length, 63, `Expected 63 total frontend TS/TSX files, found ${allFrontendTsFiles.length}`);

  for (const file of allFrontendTsFiles) {
    const raw = fs.readFileSync(file, 'utf8').replace(/import\.meta\.env/g, '({})');
    const code = transpileFrontendTs(raw, file);
    assert.ok(typeof code === 'string' && code.length > 0, `Empty output for ${file}`);
  }
});

test('2. Verifies case-sensitive Linux import resolution across all @/ and relative imports', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8'));
  const allowedExternals = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    'react/jsx-runtime',
    'path',
    'node:path',
  ]);

  const importRegex = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const unresolved = [];

  for (const file of allSrcFiles) {
    if (file.endsWith('.d.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const spec = match[1];
      const check = resolveImportCaseSensitive(file, spec);
      if (check.external) {
        const pkgName = spec.startsWith('@')
          ? spec.split('/').slice(0, 2).join('/')
          : spec.split('/')[0];
        if (!allowedExternals.has(pkgName)) {
          unresolved.push(`${path.relative(FRONTEND_ROOT, file)} -> undeclared package "${spec}"`);
        }
      } else if (!check.resolved) {
        unresolved.push(`${path.relative(FRONTEND_ROOT, file)} -> missing/case-mismatched "${spec}"`);
      }
    }
  }

  assert.deepEqual(unresolved, [], `Unresolved imports:\n${unresolved.join('\n')}`);
  assert.ok(
    existsCaseSensitive(path.join(SRC_ROOT, 'components/ui/skeleton.tsx')),
    'components/ui/skeleton.tsx must exist on case-sensitive filesystems'
  );
  assert.ok(
    existsCaseSensitive(path.join(SRC_ROOT, 'components/ui/modal-dialog.tsx')),
    'components/ui/modal-dialog.tsx must exist'
  );
});

test('3. Prevents broken dynamic Tailwind class interpolation, external font links & invalid utilities', () => {
  const forbiddenPatterns = [
    { name: 'dynamic Tailwind color interpolation', regex: /\b(?:bg|text|border|ring|from|to|via)-\$\{/ },
    { name: 'opacity modifier appended to full class token', regex: /\$\{theme\.(?:shadowColor|bgLight|borderColor|textColor)\}\/\d+/ },
    { name: 'invalid border-l-3 utility', regex: /\bborder-l-3\b/ },
    { name: 'invalid h-13/w-13 utility', regex: /\b[hw]-13\b/ },
  ];

  const violations = [];
  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const rule of forbiddenPatterns) {
      if (rule.regex.test(content)) {
        violations.push(`${path.relative(FRONTEND_ROOT, file)}: ${rule.name}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Tailwind class violations:\n${violations.join('\n')}`);

  const indexHtml = fs.readFileSync(path.join(FRONTEND_ROOT, 'index.html'), 'utf8');
  const indexCss = fs.readFileSync(path.join(SRC_ROOT, 'index.css'), 'utf8');
  assert.ok(!indexHtml.includes('fonts.googleapis.com'), 'index.html must not depend on external Google Fonts');
  assert.ok(!indexCss.includes('fonts.googleapis.com'), 'index.css must not depend on external Google Fonts');
});

test('4. Validates trilingual (en / ms / zh) dictionary key parity & template t.<key> references', () => {
  const { translations } = require(path.join(SRC_ROOT, 'lib/i18n.ts'));
  const enKeys = Object.keys(translations.en).sort();
  const msKeys = Object.keys(translations.ms).sort();
  const zhKeys = Object.keys(translations.zh).sort();

  assert.deepEqual(msKeys, enKeys, 'Bahasa Melayu (ms) keys must match English (en) keys');
  assert.deepEqual(zhKeys, enKeys, 'Chinese (zh) keys must match English (en) keys');

  for (const lang of ['en', 'ms', 'zh']) {
    for (const key of enKeys) {
      const val = translations[lang][key];
      assert.equal(typeof val, 'string', `Missing string for ${lang}.${key}`);
      assert.ok(val.trim().length > 0, `Empty translation for ${lang}.${key}`);
    }
  }

  const keySet = new Set(enKeys);
  const missingRefs = [];
  const tRefRegex = /\bt\.([A-Za-z0-9_]+)\b/g;

  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('useTranslation')) continue;
    let m;
    while ((m = tRefRegex.exec(content)) !== null) {
      if (!keySet.has(m[1])) {
        missingRefs.push(`${path.relative(FRONTEND_ROOT, file)} -> t.${m[1]}`);
      }
    }
  }

  assert.deepEqual(missingRefs, [], `Missing translation keys referenced in TSX:\n${missingRefs.join('\n')}`);
});

test('5. Verifies shared hospital themes, XSS/CSV/date utilities & App route guards', () => {
  const { hospitalThemes, getHospitalTheme } = require(path.join(SRC_ROOT, 'lib/hospital-themes.ts'));
  const utils = require(path.join(SRC_ROOT, 'lib/utils.ts'));

  const expectedHospitals = [
    'hospital-kl',
    'hospital-penang',
    'hospital-jb',
    'hospital-kuching',
    'hospital-kk',
  ];
  for (const id of expectedHospitals) {
    const theme = getHospitalTheme(id);
    assert.ok(hospitalThemes[id], `Missing theme for ${id}`);
    assert.ok(theme.bgLight.startsWith('bg-'));
    assert.ok(theme.buttonGradient.includes('from-'));
    assert.ok(theme.activeNavClass.length > 0);
    assert.ok(theme.shellVariant && theme.code && theme.badgeLabel, `Missing shell config on ${id}`);
  }

  assert.equal(utils.formatIC('850505105111'), '850505-10-5111');
  assert.equal(utils.maskIC('850505-10-5111'), '850505-10-****');
  assert.equal(utils.toDateInputValue('2026-05-18T10:30:00.000Z'), '2026-05-18');
  assert.equal(utils.toDateInputValue('2026-05-18'), '2026-05-18');
  assert.equal(utils.toDateInputValue('invalid-date'), '');

  // XSS escaping & CSV formula neutralization
  assert.equal(
    utils.escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
  assert.equal(utils.sanitizeCsvCell('=CMD|"/C calc"!A0'), '\'=CMD|""/C calc""!A0"'.startsWith("'") ? '"\'=CMD|""/C calc""!A0"' : '');
  assert.equal(utils.sanitizeCsvCell('+6012-3456789'), '+6012-3456789');
  assert.equal(utils.sanitizeCsvCell('@malicious'), "'@malicious");

  const maleParsed = utils.parseMyKadDemographics('850505-10-5111');
  assert.deepEqual(maleParsed, { dateOfBirth: '1985-05-05', gender: 'male' });

  const femaleParsed = utils.parseMyKadDemographics('900202-07-5222');
  assert.deepEqual(femaleParsed, { dateOfBirth: '1990-02-02', gender: 'female' });

  assert.equal(utils.getRoleHomePath('doctor', false), '/verify');
  assert.equal(utils.getRoleHomePath('hospital_admin', false), '/verify');
  assert.equal(utils.getRoleHomePath('doctor', true), '/doctor');
  assert.equal(utils.getRoleHomePath('hospital_admin', true), '/admin/hospital');
  assert.equal(utils.getRoleHomePath('patient', false), '/patient');
  assert.equal(utils.getRoleHomePath('central_admin', false), '/admin/central');

  const appContent = fs.readFileSync(path.join(SRC_ROOT, 'App.tsx'), 'utf8');
  assert.match(appContent, /isHospitalVerified/, 'App.tsx must enforce isHospitalVerified guard');
  assert.match(
    appContent,
    /\/doctor\/patient\/:icNumber\/records\/:recordId\/edit/,
    'App.tsx must register local medical record edit route'
  );
});

test('6. Enforces clinical workstation context purge upon role switch, unverification & logout', () => {
  const { useClinicalStore } = require(path.join(SRC_ROOT, 'store/clinical.ts'));
  const { useAuthStore } = require(path.join(SRC_ROOT, 'store/auth.ts'));

  useClinicalStore.getState().setActivePatient({
    icNumber: '850505-10-5111',
    fullName: 'Tan Wei Ming',
    allergies: ['Aspirin'],
    chronicConditions: ['Type 2 Diabetes'],
    scopedHospitalId: 'hospital-kl',
    scopedDoctorId: 'doc-kl-1',
  });
  assert.equal(useClinicalStore.getState().activePatient?.icNumber, '850505-10-5111');

  // Switching role to patient must immediately purge clinical patient context
  useAuthStore.getState().setSession('tok-pat', {
    id: 'user-pat-dual',
    icNumber: '800101-14-5001',
    role: 'patient',
    hospitalVerified: true,
  });
  assert.equal(useClinicalStore.getState().activePatient, null);

  // Re-bind as doctor, then verify logout also purges clinical patient context
  useClinicalStore.getState().setActivePatient({
    icNumber: '900202-07-5222',
    fullName: 'Aisyah Binti Ismail',
    allergies: ['Penicillin'],
    chronicConditions: [],
    scopedHospitalId: 'hospital-kl',
  });
  useAuthStore.getState().logout();
  assert.equal(useClinicalStore.getState().activePatient, null);
});
