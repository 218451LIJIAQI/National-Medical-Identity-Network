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

1. **Multi-Role MyKad Authentication & Step-Up Hospital Verification**:
   - Citizens holding multiple roles under the same MyKad IC (for example, an attending clinician who is also a patient) discover available roles only **after** password verification (`POST /api/auth/login`) and can switch roles mid-session (`POST /api/auth/switch-role`).
   - Hospital staff (`doctor` and `hospital_admin`) receive a pre-verification JWT upon initial sign-in and must complete hospital step-up verification (`POST /api/auth/verify-hospital` via staff credentials or MyKad staff chip) before accessing hospital or clinical endpoints.
   - Sign-out (`POST /api/auth/logout`) revokes the active JWT `jti` immediately.
2. **Zero-Trust RBAC, IDOR Prevention & Patient Privacy Blacklist**:
   - Patients can only query their own IC (`403` + denied audit log on cross-IC attempts).
   - Hospital privacy blocks configured by a patient are enforced uniformly across `/api/central/query/:icNumber`, `/api/central/patient/:icNumber`, and `/api/hospitals/:hospitalId/*`, returning HTTP `403` with `accessDenied: true` and recording a denied audit entry.
   - Hospital administrators (`hospital_admin`) are strictly scoped to audit logs involving their own hospital (`actorHospitalId` or `targetHospitalId`), with inclusive end-of-day date filtering (`YYYY-MM-DDT23:59:59.999Z`).
3. **Clinical Data Integrity & Federated First-Visit Inheritance**:
   - Encounter creation (`POST /api/hospitals/:hospitalId/records`) and local record updates (`PUT /api/hospitals/:hospitalId/records/:recordId`) bind strictly to the authenticated active local doctor (`getDoctorByIc`) and persist nested `prescriptions` and `labReports`. Cross-hospital encounters remain strictly read-only.
   - When a patient visits a new hospital for the first time, the local patient profile inherits verified demographics, blood type, allergies, and chronic conditions from existing federated hospital nodes (falling back to MyKad birth date/gender derivation if completely new).
4. **Emergency Break-Glass (`GET /api/central/emergency/:icNumber`)**:
   - Aggregates critical allergies, blood type, chronic conditions, recent diagnoses, and active medications across reachable hospital nodes.
   - Applies a 60-second cooldown per `IP + IC` **only after a successful break-glass lookup** (so mistyping an unindexed IC returns `404` without locking out the emergency room), alongside an IP-wide anti-enumeration cap.

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

Run `npm test` in `backend/` for HTTP route contract, RBAC/IDOR/privacy security, clinical persistence, break-glass, and production config integration tests, and run `npm test` in `frontend/` for full TypeScript/JSX compilation, case-sensitive import verification, Tailwind class safety checks, and trilingual (`en`/`ms`/`zh`) dictionary parity tests.
