# MedLink MY — National Medical Identity Network

MedLink MY is a federated healthcare identity and longitudinal medical record platform built around Malaysia's MyKad IC number. Each participating hospital retains sovereign ownership of its local clinical database, while the Ministry of Health (MOH) Central Hub maintains only a lightweight pointer index, patient consent matrix, and immutable audit trail.

## Architecture Overview

- **MOH Central Hub (`backend/prisma/schema.central.prisma`)**:
  - Stores participating `Hospital` nodes, authenticated `User` accounts (`@@unique([icNumber, role])`), `PatientIndex` -> `PatientIndexHospital` mappings, `PatientPrivacySetting` consent rules, and `AuditLog` entries.
  - Stores **zero** clinical diagnoses, prescriptions, or laboratory results.
- **5 Autonomous Hospital Databases (`backend/prisma/schema.hospital.prisma`)**:
  - `hospital-kl`: Kuala Lumpur General Hospital (`KLGH`) — Kuala Lumpur
  - `hospital-penang`: Penang Medical Centre (`PMC`) — George Town, Penang
  - `hospital-jb`: Johor Specialist Hospital (`JSH`) — Johor Bahru, Johor
  - `hospital-kuching`: Sarawak General Hospital (`SGH`) — Kuching, Sarawak
  - `hospital-kk`: Queen Elizabeth Hospital (`QEH`) — Kota Kinabalu, Sabah
- **Security, Consent & Break-Glass Governance**:
  - Patients can grant or block cross-hospital read access per hospital in real time.
  - Cross-hospital queries are strictly read-only; only a clinician's own hospital node accepts new encounter writes (`POST /api/hospitals/:hospitalId/records`).
  - Public emergency break-glass lookup (`GET /api/central/emergency/:icNumber`) is rate-limited (60-second cooldown per IP), audited, and discloses only life-critical triage fields (blood group, allergies, chronic conditions, active medications, and next-of-kin contact).

## Repository Structure

```text
national-medical-identity-network/
├── backend/
│   ├── prisma/
│   │   ├── schema.central.prisma      # MOH Central Hub Prisma schema
│   │   ├── schema.hospital.prisma     # Per-hospital clinical Prisma schema
│   │   └── seed.ts                    # Deterministic multi-database seed script
│   ├── scripts/
│   │   └── push-hospital-schemas.ts   # Pushes hospital schema to all 5 hospital DBs
│   ├── src/
│   │   ├── config/index.ts            # Unified environment, PBKDF2 auth & 5-hospital registry
│   │   ├── database/
│   │   │   ├── db-manager.ts          # Connection lifecycle manager (1 central + 5 hospitals)
│   │   │   ├── central-db.ts          # Central index, consent & audit repository
│   │   │   └── hospital-db.ts         # Clinical records, prescriptions & lab repository
│   │   ├── middleware/auth.ts         # JWT verification & role/hospital guards
│   │   ├── routes/
│   │   │   ├── auth.ts                # POST /login (multi-role aware), GET /me, POST /logout
│   │   │   ├── central.ts             # Federated query, consent, index, audit & break-glass APIs
│   │   │   └── hospital.ts            # Scoped hospital stats, doctors & encounter creation APIs
│   │   ├── types/index.ts             # Canonical domain & DTO contracts
│   │   ├── app.ts                     # Express app factory (testable without port binding)
│   │   └── index.ts                   # HTTP server entrypoint & graceful shutdown
│   └── tests/
│       └── backend.test.ts            # Auth, RBAC, consent, federated query & break-glass tests
└── frontend/
    ├── src/
    │   ├── components/                # Reusable UI primitives, LiveClock & ChipScanOverlay
    │   ├── layouts/                   # MainLayout, AuthLayout & 5 distinct hospital shells
    │   ├── lib/                       # Typed API client, 5-hospital theme registry, i18n & utils
    │   ├── pages/                     # Public, Patient, Doctor & Hospital/Central Admin portals
    │   └── store/                     # Persisted Zustand auth & accessibility settings stores
    └── tests/
        └── frontend.test.mjs          # Store, utility, theme & API contract verification tests
```

## Quick Start

### 1. Environment Variables (`backend/.env`)

Provide PostgreSQL connection URLs for the central hub and each hospital database:

```env
PORT=3000
JWT_SECRET=replace-with-strong-production-secret
CORS_ORIGIN=http://localhost:5173

DATABASE_URL_CENTRAL=postgresql://user:pass@localhost:5432/medlink_central
DATABASE_URL_HOSPITAL_KL=postgresql://user:pass@localhost:5432/medlink_kl
DATABASE_URL_HOSPITAL_PENANG=postgresql://user:pass@localhost:5432/medlink_penang
DATABASE_URL_HOSPITAL_JB=postgresql://user:pass@localhost:5432/medlink_jb
DATABASE_URL_HOSPITAL_KUCHING=postgresql://user:pass@localhost:5432/medlink_kuching
DATABASE_URL_HOSPITAL_KK=postgresql://user:pass@localhost:5432/medlink_kk
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run db:setup   # Generates Prisma clients, pushes central + 5 hospital schemas, and seeds data
npm run dev        # Starts Express API server on http://localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
```

## Demo Accounts (Seeded by `npm run db:seed`)

| Role | Identifier (`icNumber`) | Password | Hospital / Scope |
| :--- | :--- | :--- | :--- |
| Patient | `880101-14-5678` | `patient123` | Ahmad bin Abdullah (5 hospitals) |
| Doctor (Dual Role) | `750101-14-5001` | `doctor123` | Kuala Lumpur General Hospital (`hospital-kl`) |
| Doctor | `760612-07-5001` | `doctor123` | Penang Medical Centre (`hospital-penang`) |
| Doctor | `770808-01-5001` | `doctor123` | Johor Specialist Hospital (`hospital-jb`) |
| Doctor | `790303-13-5001` | `doctor123` | Sarawak General Hospital (`hospital-kuching`) |
| Doctor | `810707-12-5001` | `doctor123` | Queen Elizabeth Hospital (`hospital-kk`) |
| Hospital Admin | `admin-kl` (`penang`/`jb`/`kuching`/`kk`) | `admin123` | Respective Hospital Node |
| MOH Central Admin | `central-admin` | `central123` | National Hub |

## Key API Endpoints

- `POST /api/auth/login` — Authenticates by IC/Staff ID + password (returns `requiresRoleSelection` when multiple roles exist and `role` is omitted)
- `GET /api/auth/me` — Returns current authenticated user profile
- `POST /api/auth/logout` — Logs audit sign-out event
- `GET /api/central/query/:icNumber` — Executes consent-filtered parallel federated record retrieval
- `GET /api/central/patient/:icNumber` — Returns patient demographics and indexed hospital list (enforces patient self-access and hospital block rules)
- `GET /api/central/privacy-settings` & `POST /api/central/privacy-settings/hospital-access` — Reads and updates per-hospital patient consent
- `GET /api/central/emergency/:icNumber` — Rate-limited, audited emergency break-glass summary
- `GET /api/central/audit-logs` — National or hospital-scoped audit log query
- `GET /api/hospitals/:hospitalId/stats` — Hospital patient, record, active doctor, and today's visit metrics
- `POST /api/hospitals/:hospitalId/records` — Creates a local encounter with vital signs, prescriptions, and lab reports
