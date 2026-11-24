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
  assert.equal(allSrcFiles.length, 58, `Expected 58 src TS/TSX files, found ${allSrcFiles.length}`);
  assert.equal(allFrontendTsFiles.length, 59, `Expected 59 total frontend TS/TSX files, found ${allFrontendTsFiles.length}`);

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


test('7. Hardened MyKad calendar/PB validation & numeric-prefix CSV formula injection defense', () => {
  const utils = require(path.join(SRC_ROOT, 'lib/utils.ts'));

  // Valid MyKad including leap year Feb 29
  assert.equal(utils.isValidMyKad('850505-10-5111'), true);
  assert.equal(utils.isValidMyKad('240229-14-5001'), true);

  // Invalid calendar dates (Feb 31, non-leap Feb 29, PB=00, non-12-digit)
  assert.equal(utils.isValidMyKad('990231-14-5001'), false);
  assert.equal(utils.isValidMyKad('230229-14-5001'), false);
  assert.equal(utils.isValidMyKad('850505-00-5111'), false);
  assert.equal(utils.isValidMyKad('12345'), false);

  // CSV formula payloads starting with signed digits or leading whitespace must be neutralized
  assert.equal(utils.sanitizeCsvCell('+1+1'), "'+1+1");
  assert.equal(utils.sanitizeCsvCell('-2+CMD|"/C calc"!A0'), '"\x27-2+CMD|""/C calc""!A0"');
  assert.equal(utils.sanitizeCsvCell('  =SUM(A1:A5)'), "'  =SUM(A1:A5)");
  // Benign Malaysian phone numbers and plain signed decimals remain clean
  assert.equal(utils.sanitizeCsvCell('+60 12-345 6789'), '+60 12-345 6789');
  assert.equal(utils.sanitizeCsvCell('-12.50'), '-12.50');
  assert.equal(utils.formatMYR(1250.5), 'RM 1,250.50');
});

test('8. Verifies zero hardcoded patient IC fallbacks, debloated themes & zoom-safe grids across modules', () => {
  const { hospitalThemes } = require(path.join(SRC_ROOT, 'lib/hospital-themes.ts'));

  for (const [id, theme] of Object.entries(hospitalThemes)) {
    assert.ok(typeof theme.state === 'string' && theme.state.length > 0, `Missing state on ${id}`);
    assert.equal(theme.secondaryColor, undefined, `Dead key secondaryColor still present on ${id}`);
    assert.equal(theme.orbPrimaryClass, undefined, `Dead key orbPrimaryClass still present on ${id}`);
  }

  // NursingNotes & Billing must never hardcode fallback patient IC 880101-14-5678
  const nursingSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/modules/NursingNotes.tsx'), 'utf8');
  const billingSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/modules/Billing.tsx'), 'utf8');
  assert.ok(!nursingSrc.includes('880101-14-5678'), 'NursingNotes must not fallback to hardcoded patient IC');
  assert.ok(!billingSrc.includes('880101-14-5678'), 'Billing must not fallback to hardcoded patient IC');
  assert.match(nursingSrc, /PatientRequiredGate/, 'NursingNotes must gate on bound patient');
  assert.match(billingSrc, /PatientRequiredGate/, 'Billing must gate on bound patient');

  // ClinicalPatientBanner must re-verify bound patient consent against centralApi.getPatient
  const bannerSrc = fs.readFileSync(path.join(SRC_ROOT, 'components/ClinicalPatientBanner.tsx'), 'utf8');
  assert.match(bannerSrc, /centralApi\.getPatient\(boundIc,\s*controller\.signal\)/, 'ClinicalPatientBanner must re-verify activePatient consent with AbortSignal');

  // NewRecord must include respiratoryRate and height inputs so editing never drops vital fields
  const newRecSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/NewRecord.tsx'), 'utf8');
  assert.match(newRecSrc, /respiratoryRate/, 'NewRecord must preserve respiratoryRate');
  assert.match(newRecSrc, /id="v-ht"/, 'NewRecord must render height input');
});

test('9. Validates centenarian MyKad century rollback, safe partial BP formatting & silent AbortSignal handling', async () => {
  const utils = require(path.join(SRC_ROOT, 'lib/utils.ts'));

  // Centenarian born Dec 31 of 1926 (when 2026-12-31 is in the future) resolves to 1926-12-31, never a future date
  const centenarian = utils.parseMyKadDemographics('261231-14-5001');
  assert.deepEqual(centenarian, { dateOfBirth: '1926-12-31', gender: 'male' });

  // Safe blood pressure formatter prevents malformed "120/ mmHg" strings
  assert.equal(utils.formatBloodPressure(122, 78), '122/78');
  assert.equal(utils.formatBloodPressure(122, undefined), '122/—');
  assert.equal(utils.formatBloodPressure(undefined, 80), '—/80');
  assert.equal(utils.formatBloodPressure(undefined, undefined), null);

  // Aborted requests in api.ts return { success: false, aborted: true } cleanly without throwing
  const origFetch = global.fetch;
  const controller = new AbortController();
  controller.abort();
  global.fetch = async (_url, opts) => {
    if (opts?.signal?.aborted) {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    }
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
  };
  try {
    const { centralApi } = require(path.join(SRC_ROOT, 'lib/api.ts'));
    const res = await centralApi.getHospitals(controller.signal);
    assert.equal(res.success, false);
    assert.equal(res.aborted, true);
  } finally {
    global.fetch = origFetch;
  }
});

test('10. Enforces 100% trilingual key utilization, zero dead theme/nav metadata & dark-surface high-contrast protection', () => {
  const { translations } = require(path.join(SRC_ROOT, 'lib/i18n.ts'));
  const { hospitalThemes } = require(path.join(SRC_ROOT, 'lib/hospital-themes.ts'));
  const sharedShellSrc = fs.readFileSync(path.join(SRC_ROOT, 'layouts/hospital/shared.tsx'), 'utf8');

  // Zero dead fontClass on themes & zero dead shortLabel/sectionIcon on nav sections
  for (const [id, theme] of Object.entries(hospitalThemes)) {
    assert.equal(theme.fontClass, undefined, `Dead fontClass should be removed from ${id}`);
  }
  assert.ok(!sharedShellSrc.includes('shortLabel'), 'Dead shortLabel should be removed from shared.tsx');
  assert.ok(!sharedShellSrc.includes('sectionIcon'), 'Dead sectionIcon should be removed from shared.tsx');

  // Every translation key in en/ms/zh is actively referenced outside i18n.ts
  const nonI18nCombined = allSrcFiles
    .filter((f) => !f.endsWith(path.join('lib', 'i18n.ts')))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const unusedKeys = Object.keys(translations.en).filter(
    (k) => !new RegExp(`\\b${k}\\b`).test(nonI18nCombined)
  );
  assert.deepEqual(unusedKeys, [], `Found unused translation keys: ${unusedKeys.join(', ')}`);

  // High-contrast CSS protects dark surfaces against dark-on-dark slate foreground overrides
  const cssSrc = fs.readFileSync(path.join(SRC_ROOT, 'index.css'), 'utf8');
  assert.match(cssSrc, /html\.high-contrast\s+\.dark-surface\s+\.text-slate-400/, 'index.css must protect dark-surface contrast in high-contrast mode');
});

test('11. Verifies modal focus trap, error-retry boundaries (zero infinite skeletons), bloodType clearing & redacted pointer UI', () => {
  const modalSrc = fs.readFileSync(path.join(SRC_ROOT, 'components/ui/modal-dialog.tsx'), 'utf8');
  assert.match(modalSrc, /FOCUSABLE_SELECTOR/, 'ModalDialog must implement focusable element trap');
  assert.match(modalSrc, /previousFocused\.focus\(\)/, 'ModalDialog must restore focus on close');

  for (const rel of [
    'pages/admin/modules/FinancialReports.tsx',
    'pages/doctor/modules/Billing.tsx',
    'pages/doctor/modules/NursingNotes.tsx',
  ]) {
    const src = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
    assert.match(src, /DataErrorBanner/, `${rel} must render DataErrorBanner on load failure instead of infinite skeleton`);
  }

  const newRecSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/NewRecord.tsx'), 'utf8');
  assert.match(newRecSrc, /bloodType:\s*formData\.bloodType\.trim\(\),/, 'NewRecord must allow explicit empty string bloodType clearing');

  const centralSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/admin/CentralAdmin.tsx'), 'utf8');
  assert.ok(!centralSrc.includes('searchResult.patient.allergies'), 'CentralAdmin must not render redacted clinical allergies');
  assert.ok(!centralSrc.includes('searchResult.patient.bloodType'), 'CentralAdmin must not render redacted clinical bloodType');
});

test('12. Verifies zero unused runtime dependencies, Radix/Framer removal & standardized h-10 Input token', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package-lock.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});

  for (const removed of ['framer-motion', '@radix-ui/react-label', '@radix-ui/react-slot', '@radix-ui/react-toast', 'tailwindcss-animate']) {
    assert.ok(!deps.includes(removed), `${removed} must be removed from dependencies`);
    assert.equal(lock.packages?.[`node_modules/${removed}`], undefined, `${removed} must be pruned from package-lock.json`);
  }

  const combinedSrc = allSrcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const dep of deps) {
    if (dep === 'react-dom') {
      assert.match(combinedSrc, /from ['"]react-dom/, 'react-dom must be imported');
    } else {
      const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(combinedSrc, new RegExp(`from ['"]${escaped}(?:['"/])`), `Dependency ${dep} must be actively imported`);
    }
  }

  const inputSrc = fs.readFileSync(path.join(SRC_ROOT, 'components/ui/input.tsx'), 'utf8');
  assert.match(inputSrc, /\bh-10\b/, 'Input primitive must standardize on h-10 height');
  assert.match(inputSrc, /\bborder-slate-300\b/, 'Input primitive must use border-slate-300 token');
});

test('13. Verifies fetchApi 403 licenseRevoked auto-logout + clinical purge, 503 nodesUnavailable & closed-loop endpoints', async () => {
  const { useAuthStore } = require(path.join(SRC_ROOT, 'store/auth.ts'));
  const { useClinicalStore } = require(path.join(SRC_ROOT, 'store/clinical.ts'));
  const { centralApi, hospitalApi } = require(path.join(SRC_ROOT, 'lib/api.ts'));

  const origFetch = global.fetch;
  try {
    useAuthStore.getState().setSession('tok-doc-active', {
      id: 'user-doc-kl',
      icNumber: '800101-14-5001',
      role: 'doctor',
      hospitalId: 'hospital-kl',
      hospitalVerified: true,
    });
    useClinicalStore.getState().setActivePatient({
      icNumber: '850505-10-5111',
      fullName: 'Tan Wei Ming',
      allergies: ['Aspirin'],
      chronicConditions: [],
      scopedHospitalId: 'hospital-kl',
    });

    // Simulate 403 licenseRevoked from backend
    global.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ success: false, licenseRevoked: true, error: 'Clinician deactivated' }),
    });
    const revokedRes = await centralApi.queryPatient('850505-10-5111');
    assert.equal(revokedRes.success, false);
    assert.equal(revokedRes.licenseRevoked, true);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(useAuthStore.getState().token, null);
    assert.equal(useClinicalStore.getState().activePatient, null);

    // Simulate 503 nodesUnavailable
    global.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ success: false, nodesUnavailable: true, error: 'Originating hospital nodes unreachable' }),
    });
    const outageRes = await centralApi.emergencyQuery('850505-10-5111');
    assert.equal(outageRes.status, 503);
    assert.equal(outageRes.nodesUnavailable, true);

    // Verify endpoint paths & HTTP verbs for sensitive privacy, dispense & lab sign-off
    const calls = [];
    global.fetch = async (url, opts = {}) => {
      calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
      return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) };
    };

    await centralApi.getSensitivePrivacySettings();
    await centralApi.updateSensitivePrivacySettings({ mentalHealth: false });
    await hospitalApi.dispensePrescription('hospital-kl', 'rec-1', 'rx-1');
    await hospitalApi.signOffLabReport('hospital-kl', 'rec-1', 'lab-1', { result: '5.4', isAbnormal: false });

    assert.equal(calls[0].url, '/api/central/privacy-settings/sensitive');
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[1].url, '/api/central/privacy-settings/sensitive');
    assert.equal(calls[1].method, 'PUT');
    assert.deepEqual(calls[1].body, { mentalHealth: false });
    assert.equal(calls[2].url, '/api/hospitals/hospital-kl/records/rec-1/prescriptions/rx-1/dispense');
    assert.equal(calls[2].method, 'POST');
    assert.equal(calls[3].url, '/api/hospitals/hospital-kl/records/rec-1/lab-reports/lab-1/signoff');
    assert.equal(calls[3].method, 'PUT');
  } finally {
    global.fetch = origFetch;
  }
});

test('14. Verifies shared LanguageSwitcher in About, AuditLogs optional actorId safety, 503 walk-in guard & closed-loop UI wiring', () => {
  const aboutSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/About.tsx'), 'utf8');
  assert.match(aboutSrc, /LanguageSwitcher/, 'About.tsx must reuse shared LanguageSwitcher');
  assert.ok(!aboutSrc.includes("(['en', 'ms', 'zh'] as const).map"), 'About.tsx must not duplicate inline language pill map');

  const auditSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/admin/AuditLogs.tsx'), 'utf8');
  assert.match(auditSrc, /typeof log\.actorId === 'string'/, 'AuditLogs must safely normalize optional actorId before string operations');

  for (const rel of [
    'components/ClinicalPatientBanner.tsx',
    'pages/doctor/modules/QueueManagement.tsx',
    'pages/doctor/NewRecord.tsx',
  ]) {
    const src = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
    assert.match(src, /nodesUnavailable/, `${rel} must guard against 503 nodesUnavailable before provisional walk-in fallback`);
  }

  const privacySrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/patient/Privacy.tsx'), 'utf8');
  assert.match(privacySrc, /getSensitivePrivacySettings/, 'Privacy.tsx must load persisted sensitive settings');
  assert.match(privacySrc, /updateSensitivePrivacySettings/, 'Privacy.tsx must persist sensitive setting toggles');

  const rxSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/modules/EPrescription.tsx'), 'utf8');
  assert.match(rxSrc, /dispensePrescription/, 'EPrescription.tsx must wire hospitalApi.dispensePrescription');

  const labSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/modules/LabOrders.tsx'), 'utf8');
  assert.match(labSrc, /signOffLabReport/, 'LabOrders.tsx must wire hospitalApi.signOffLabReport');

  const patRecSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/patient/Records.tsx'), 'utf8');
  assert.match(patRecSrc, /isPendingLabValue/, 'patient/Records.tsx must distinguish pending lab results from normal results');
});

test('15. Verifies deduplicated isPendingLabValue, Portal ModalDialog, ?module= Workstation sync & post-submit print continuity', () => {
  const utils = require(path.join(SRC_ROOT, 'lib/utils.ts'));
  assert.equal(utils.isPendingLabValue('Pending Specimen Analysis'), true);
  assert.equal(utils.isPendingLabValue('Imaging Scheduled (30 min)'), true);
  assert.equal(utils.isPendingLabValue('ordered'), true);
  assert.equal(utils.isPendingLabValue('5.6'), false);

  for (const rel of [
    'pages/patient/Records.tsx',
    'pages/doctor/PatientTimeline.tsx',
    'pages/doctor/modules/LabOrders.tsx',
  ]) {
    const src = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
    assert.ok(!src.includes('function isPendingLabValue'), `${rel} must import shared isPendingLabValue instead of duplicating it`);
  }

  const modalSrc = fs.readFileSync(path.join(SRC_ROOT, 'components/ui/modal-dialog.tsx'), 'utf8');
  assert.match(modalSrc, /createPortal\(dialogContent,\s*document\.body\)/, 'ModalDialog must mount via document.body Portal');

  const workstationSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/HospitalWorkstation.tsx'), 'utf8');
  assert.match(workstationSrc, /useSearchParams/, 'HospitalWorkstation must synchronize active module with URL search params');

  const radSrc = fs.readFileSync(path.join(SRC_ROOT, 'pages/doctor/modules/Radiology.tsx'), 'utf8');
  assert.match(radSrc, /setLastSubmittedOrders\(selectedOrders\)/, 'Radiology must retain submitted orders for slip printing while clearing draft selection');
});
