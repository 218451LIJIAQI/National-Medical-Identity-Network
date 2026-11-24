# MedLink MY — National Medical Identity Network

**MedLink MY** is a federated healthcare identity and clinical record network for Malaysia. Using a citizen's 12-digit MyKad IC (`YYMMDD-PB-XXXX`) as a universal pointer, the Central Hub indexes participating hospital nodes while each hospital retains sovereign storage of clinical encounters, prescriptions, diagnostic reports, nursing flowsheets, and operational state.

## Participating Hospital Nodes & Desktop Shell Variants

| Hospital ID | Facility | Location | Desktop Shell Variant | Database Variable |
| --- | --- | --- | --- | --- |
| `hospital-kl` | Kuala Lumpur General Hospital (HKL) | Kuala Lumpur, WP Kuala Lumpur | `sidebar` | `DATABASE_URL_HOSPITAL_KL` |
| `hospital-penang` | Penang General Hospital (HPP) | George Town, Penang | `hover-rail` | `DATABASE_URL_HOSPITAL_PENANG` |
| `hospital-jb` | Sultanah Aminah Hospital (HSA) | Johor Bahru, Johor | `bottom-dock` | `DATABASE_URL_HOSPITAL_JB` |
| `hospital-kuching` | Sarawak General Hospital (SGH) | Kuching, Sarawak | `glass-sidebar` | `DATABASE_URL_HOSPITAL_KUCHING` |
| `hospital-kk` | Queen Elizabeth Hospital (QEH) | Kota Kinabalu, Sabah | `royal-top` | `DATABASE_URL_HOSPITAL_KK` |

All five hospitals share `backend/prisma/schema.hospital.prisma`, while the federated pointer directory, RBAC accounts, privacy blacklist policies, and immutable audit trails reside in `backend/prisma/schema.central.prisma` (`DATABASE_URL_CENTRAL`).

## Security, Privacy & Clinical Closed-Loop Architecture

1. **Multi-Role MyKad Authentication, Step-Up Verification & Real-Time License Revocation**:
   - Citizens holding multiple roles under the same MyKad IC discover available roles only **after** password verification (`POST /api/auth/login`) and can switch roles mid-session (`POST /api/auth/switch-role`).
   - Hospital staff (`doctor` and `hospital_admin`) receive a pre-verification JWT upon initial sign-in and must complete hospital step-up verification (`POST /api/auth/verify-hospital`) before accessing hospital or clinical endpoints.
   - Sign-out (`POST /api/auth/logout`), role switches, hospital affiliation changes, and hospital-admin clinician suspension (`isActive: false`) immediately revoke active access and purge any bound clinical workstation patient context.
2. **Zero-Trust RBAC, PHI Redaction & End-to-End Patient Privacy Blacklist**:
   - Patients can only query their own IC (`403` + denied audit log on cross-IC attempts). Central administrators (`GET /api/central/index/:icNumber`) inspect pointer routing metadata only, with clinical PHI (`allergies`, `chronicConditions`, `bloodType`) strictly redacted and every lookup audited.
   - Hospital privacy blocks configured by a patient are enforced uniformly across `/api/central/query/:icNumber`, `/api/central/patient/:icNumber`, `/api/central/my-activity-logs`, and `/api/hospitals/:hospitalId/*` (including aggregate `/stats`, outpatient queue, appointments, patient-scoped nursing charts, and subsidised billing), while `ClinicalPatientBanner` re-verifies consent live against the backend to purge stale `sessionStorage` bindings.
3. **Clinical Data Integrity, Hospital-Scoped Persistence & Zero Cross-Patient Contamination**:
   - Strict calendar/leap-year and state-code (`01–99`) MyKad validation guards all clinical and break-glass lookups (`400` on malformed ICs).
   - Encounter creation and local record updates validate all 8 physiological vital signs (including `respiratoryRate` and `diastolic < systolic`), support explicit allergy/chronic-condition list revision, persist structured prescriptions/pathology/radiology entries, and enforce read-only cross-hospital sovereignty.
   - All 9 clinician workstation modules and 5 hospital administration modules (`wards`, `departments`, `staff`, `inventory`, `finance`) persist state per hospital/patient without cross-patient or cross-hospital leakage.
4. **Desktop Web Clinical Design System & Accessibility**:
   - Engineered for desktop viewports (`1280×720` to `1920×1080` across `100%`–`200%` zoom) with offline system font stacks, `tabular-nums` alignment, WCAG AA contrast tokens, distinct empty/no-match/`403`/`404`/offline/load-error states, keyboard-accessible dialogs and audit rows (`Tab`, `:focus-visible`, `Escape`), 3 font scales, high-contrast mode, `prefers-reduced-motion: reduce`, XSS-safe clinical printouts, hardened CSV formula-injection neutralization, and trilingual (`en`/`ms`/`zh`) parity.

## Setup & Automated Verification

| Component | Directory | Commands |
| --- | --- | --- |
| Backend API | `backend/` | `npm ci && npm run multi:setup && npm run dev` |
| Frontend App | `frontend/` | `npm ci && npm run dev` |
| Automated Tests | `backend/` & `frontend/` | `npm test` (or `node backend/tests/run-tests.cjs` & `node frontend/tests/run-tests.cjs`) |
