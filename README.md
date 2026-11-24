# MedLink MY — National Medical Identity Network

**MedLink MY** is a federated healthcare identity and clinical record network prototype for Malaysia. Using a citizen's MyKad IC number as a universal pointer, a central hub indexes participating hospitals while each hospital maintains sovereign local storage of clinical encounters, prescriptions, and laboratory reports.

## Participating Hospital Nodes

| Hospital ID | Facility | City | Database Environment Variable |
| --- | --- | --- | --- |
| `hospital-kl` | Kuala Lumpur General Hospital (HKL) | Kuala Lumpur | `DATABASE_URL_HOSPITAL_KL` |
| `hospital-penang` | Penang General Hospital (HPP) | George Town | `DATABASE_URL_HOSPITAL_PENANG` |
| `hospital-jb` | Sultanah Aminah Hospital (HSA) | Johor Bahru | `DATABASE_URL_HOSPITAL_JB` |
| `hospital-kuching` | Sarawak General Hospital (SGH) | Kuching | `DATABASE_URL_HOSPITAL_KUCHING` |
| `hospital-kk` | Queen Elizabeth Hospital (QEH) | Kota Kinabalu | `DATABASE_URL_HOSPITAL_KK` |

All five hospitals use `backend/prisma/schema.hospital.prisma`, while the central directory, RBAC accounts, privacy blacklist policies, and audit trails reside in `backend/prisma/schema.central.prisma` (`DATABASE_URL_CENTRAL`).

## Security, Privacy & Clinical Architecture

1. **Multi-Role MyKad Authentication, Step-Up Verification & Clinical Context Isolation**:
   - Citizens holding multiple roles under the same MyKad IC (for example, an attending clinician who is also a patient) discover available roles only **after** password verification (`POST /api/auth/login`) and can switch roles mid-session (`POST /api/auth/switch-role`).
   - Hospital staff (`doctor` and `hospital_admin`) receive a pre-verification JWT upon initial sign-in and must complete hospital step-up verification (`POST /api/auth/verify-hospital` via staff credentials or MyKad staff chip) before accessing hospital or clinical endpoints.
   - Sign-out (`POST /api/auth/logout`), `401` session expiration, hospital affiliation changes, and role switches immediately revoke the prior JWT `jti` and purge any bound clinical workstation patient context (`sessionStorage` + memory).
2. **Zero-Trust RBAC, IDOR Prevention & Patient Privacy Blacklist**:
   - Patients can only query their own IC (`403` + denied audit log on cross-IC attempts).
   - Hospital privacy blocks configured by a patient are enforced uniformly across `/api/central/query/:icNumber`, `/api/central/patient/:icNumber`, and `/api/hospitals/:hospitalId/*` (including aggregate `/stats` metrics), returning HTTP `403` with `accessDenied: true` and recording a denied audit entry.
   - Non-doctor callers (`hospital_admin`, `central_admin`) receive clinical-detail-redacted hospital statistics, and `hospital_admin` accounts are strictly scoped to audit logs involving their own hospital (`actorHospitalId` or `targetHospitalId`) with strict calendar-validated inclusive date bounds (`YYYY-MM-DDT23:59:59.999Z`).
3. **Clinical Data Integrity, Payload Validation & Federated First-Visit Inheritance**:
   - Encounter creation (`POST /api/hospitals/:hospitalId/records`) and local record updates (`PUT /api/hospitals/:hospitalId/records/:recordId`) bind strictly to the authenticated active local doctor (`getDoctorByIc`), validate physiological vital bounds and nested `prescriptions`/`labReports` rows, and guard against concurrent duplicate submissions (`409` idempotency window). Cross-hospital encounters remain strictly read-only.
   - First-time visits at a new hospital node inherit verified demographics, blood type, allergies, and chronic conditions from existing federated nodes (falling back to MyKad birth date/gender derivation if unindexed).
4. **Emergency Break-Glass (`GET /api/central/emergency/:icNumber`)**:
   - Aggregates critical allergies, blood type, chronic conditions, and chronologically sorted (`visitDate DESC`) recent diagnoses and active medications across reachable hospital nodes while recording an immutable `emergency_access` audit trail.
   - Applies a 60-second cooldown per `IP + IC` **only after a successful break-glass lookup** (so mistyping an unindexed IC returns `404` without locking out the emergency room), alongside an IP-wide anti-enumeration cap.
5. **Desktop Web Clinical Design System & Accessibility**:
   - Optimized for desktop browsers (`1280×720` to `1920×1080` and `125%`–`200%` zoom) with offline system font stacks, `tabular-nums` alignment for vitals/MyKad IC/timestamps/MYR figures, WCAG AA contrast tokens, icon+color+label `StatusBadge` indicators, keyboard-accessible `ModalDialog` (`Escape` close, `aria-modal`), XSS-safe clinical printouts, CSV formula-injection neutralization, and trilingual (`en`/`ms`/`zh`) parity.

## Environment Configuration

- **Development / Demo**: `backend/src/config/index.ts` provides local PostgreSQL defaults (`localhost:5432`) when `NODE_ENV !== 'production'`.
- **Production (`NODE_ENV=production`)**: Fail-fast startup validation requires:
  - `JWT_SECRET` set to a strong non-default secret (`>= 32` characters)
  - `DATABASE_URL_CENTRAL` and all five `DATABASE_URL_HOSPITAL_*` connection strings explicitly configured

## Setup & Automated Verification

| Component | Directory | Commands |
| --- | --- | --- |
| Backend API | `backend/` | `npm ci && npm run multi:setup && npm run dev` |
| Frontend App | `frontend/` | `npm ci && npm run dev` |
| Automated Tests | `backend/` & `frontend/` | `npm test` |

Run `npm test` in `backend/` for HTTP route contract, RBAC/IDOR/privacy security, clinical validation/persistence, break-glass, and production config integration tests, and run `npm test` in `frontend/` for full TypeScript/JSX compilation, case-sensitive import verification, utility/session unit checks, Tailwind class safety checks, and trilingual (`en`/`ms`/`zh`) dictionary parity tests.
