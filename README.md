# MedLink MY — National Medical Identity Network

**MedLink MY** is a desktop-first federated healthcare identity and clinical record network for Malaysia (`Desktop Web Application Only`). Using a citizen's 12-digit MyKad IC (`YYMMDD-PB-XXXX`) as a universal pointer, the Central Hub indexes participating hospital nodes while each hospital retains sovereign storage of clinical encounters, prescriptions, diagnostic reports, nursing flowsheets, and operational state.

## Participating Hospital Nodes & Desktop Shell Variants

| Hospital ID | Facility | Location | Desktop Shell Variant | Database Variable |
| --- | --- | --- | --- | --- |
| `hospital-kl` | Kuala Lumpur General Hospital (HKL) | Kuala Lumpur, WP Kuala Lumpur | `sidebar` | `DATABASE_URL_HOSPITAL_KL` |
| `hospital-penang` | Penang General Hospital (HPP) | George Town, Penang | `hover-rail` | `DATABASE_URL_HOSPITAL_PENANG` |
| `hospital-jb` | Sultanah Aminah Hospital (HSA) | Johor Bahru, Johor | `bottom-dock` | `DATABASE_URL_HOSPITAL_JB` |
| `hospital-kuching` | Sarawak General Hospital (SGH) | Kuching, Sarawak | `glass-sidebar` | `DATABASE_URL_HOSPITAL_KUCHING` |
| `hospital-kk` | Queen Elizabeth Hospital (QEH) | Kota Kinabalu, Sabah | `royal-top` | `DATABASE_URL_HOSPITAL_KK` |

All five hospitals share `backend/prisma/schema.hospital.prisma`, while the federated pointer directory, RBAC accounts, privacy blacklist & sensitive specialty consent policies, and immutable audit trails reside in `backend/prisma/schema.central.prisma` (`DATABASE_URL_CENTRAL`).

## Security, Privacy & Clinical Closed-Loop Architecture

1. **Multi-Role MyKad Authentication, Step-Up Verification & Real-Time License Revocation**:
   - Citizens holding multiple roles under the same MyKad IC discover available roles only **after** password verification (`POST /api/auth/login`) and can switch roles mid-session (`POST /api/auth/switch-role`, idempotent on active role), while startup session synchronization (`GET /api/auth/me`) reconciles cached browser sessions with server identity state.
   - Hospital staff (`doctor` and `hospital_admin`) receive a pre-verification JWT upon initial sign-in and must complete hospital step-up verification (`POST /api/auth/verify-hospital`, enforcing non-empty staff credentials or matching MyKad chip) before accessing hospital or clinical endpoints.
   - Sign-out (`POST /api/auth/logout`), role switches, hospital affiliation changes, and hospital-admin clinician suspension (`isActive: false` → `403 licenseRevoked: true`) immediately revoke active access and purge any bound clinical workstation patient context.
2. **Zero-Trust RBAC, Federated Failure Semantics & End-to-End Patient Privacy Governance**:
   - Patients can only query their own IC (`403` + denied audit log on cross-IC attempts). Central administrators (`GET /api/central/index/:icNumber`) inspect pointer routing metadata only, with clinical PHI (`allergies`, `chronicConditions`, `bloodType`) strictly redacted and every lookup audited.
   - Federated lookups (`/api/central/query/:icNumber`, `/api/central/emergency/:icNumber`, `/api/hospitals/:hospitalId/patients/:icNumber`) distinguish node timeouts, offline nodes, privacy blocks (`403`), unindexed patients (`404`), and total node outages (`503 nodesUnavailable` / `allNodesFailed`), never misreporting unreachable hospital nodes as empty medical history or unindexed walk-ins.
   - Hospital privacy blocks configured by a patient are enforced uniformly across `/api/central/query/:icNumber`, `/api/central/patient/:icNumber`, `/api/central/my-activity-logs`, `hospital_admin` `/api/central/audit-logs`, and `/api/hospitals/:hospitalId/*` (including `/stats`, `/finance`, outpatient queue, appointments, prescriptions, lab sign-offs, nursing charts, and subsidised billing). Sensitive specialty consent switches (`GET/PUT /api/central/privacy-settings/sensitive`) persist in the Central DB (`PatientPrivacySetting`) and redact protected categories across cross-hospital encounter queries, federated patient profile lookups, and first-visit walk-in chronic condition inheritance while preserving authoring-hospital and patient-self visibility.
3. **Clinical Data Integrity, Atomic State Transitions & Zero Cross-Patient Contamination**:
   - Strict calendar/leap-year and state-code (`01–99`) MyKad validation guards all clinical and break-glass lookups (`400` on malformed ICs), alongside explicit `400` malformed-JSON and `413` payload-limit boundary handling.
   - Encounter creation and local record updates validate `visitType` and all 8 physiological vital signs (`diastolic < systolic`), replace child `prescriptions` and `labReports` atomically within a single nested Prisma update, preserve explicit patient demographic/allergy revisions, enforce read-only cross-hospital sovereignty, and serialize concurrent pharmacy dispensing (`POST .../prescriptions/:prescriptionId/dispense`), laboratory report sign-off (`PUT .../lab-reports/:labReportId/signoff`), and subsidised billing settlement (`POST .../billing/settle`) with deterministic `409 Conflict` race protection.
4. **Desktop Web Clinical Design System & Accessibility**:
   - Engineered for desktop viewports (`1280×720` to `1920×1080` across `100%`–`200%` zoom) with offline system font stacks, unified `slate-*` design tokens, `tabular-nums` alignment, WCAG AA contrast, programmatic `<label htmlFor>` + `aria-invalid`/`aria-describedby` error associations, portal-mounted keyboard focus-trapped modals (`Tab`, `:focus-visible`, `Escape`), URL-synced workstation modules (`?module=`), `AbortController` search race protection, post-submit printable requisition snapshots, 3 font scales, high-contrast mode, `prefers-reduced-motion: reduce`, XSS-safe clinical printouts, hardened CSV formula-injection neutralization, and 100% trilingual (`en`/`ms`/`zh`) parity.

## Setup & Automated Verification

| Component | Directory | Commands |
| --- | --- | --- |
| Backend API | `backend/` | `npm ci && npm run multi:setup && npm run dev` (default port `3000`) |
| Frontend App | `frontend/` | `npm ci && npm run dev` (default port `5173`) |
| Automated Tests | `backend/` & `frontend/` | `npm test` (or `node backend/tests/run-tests.cjs` & `node frontend/tests/run-tests.cjs`) |
