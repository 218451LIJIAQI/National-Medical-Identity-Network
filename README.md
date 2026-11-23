# MedLink MY - National Medical Identity Network

A comprehensive healthcare information exchange platform designed for Malaysia. MedLink MY enables secure cross-hospital medical record sharing, allowing healthcare providers to access patient information from any participating hospital across the nation.

## 🎯 Project Overview

MedLink MY addresses a critical challenge in Malaysian healthcare: **fragmented medical records**. When patients visit multiple hospitals, their medical history remains siloed within each institution. This leads to:

- Repeated diagnostic tests
- Incomplete patient history for doctors
- Delayed treatment in emergencies
- Medication conflicts due to unknown prescriptions

**MedLink MY solves this** by creating a federated network where:
- Each hospital maintains its own database (data sovereignty)
- A central hub indexes which patients have records at which hospitals
- Authorized healthcare providers can query records across all participating hospitals
- Patients control who can access their data

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CENTRAL HUB                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Patient Index (IC → Hospital mappings)               │    │
│  │  • User Authentication                                  │    │
│  │  • Audit Logging                                        │    │
│  │  • Cross-hospital Query Routing                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Hospital A   │   │  Hospital B   │   │  Hospital C   │
│  Database     │   │  Database     │   │  Database     │
│  • Patients   │   │  • Patients   │   │  • Patients   │
│  • Records    │   │  • Records    │   │  • Records    │
│  • Doctors    │   │  • Doctors    │   │  • Doctors    │
└───────────────┘   └───────────────┘   └───────────────┘
```

### How It Works

1. **Patient visits Hospital A** → Hospital A stores records locally and registers the patient IC in the central index
2. **Patient visits Hospital B** → Doctor queries central hub using patient's IC number
3. **Central hub** → Identifies that patient has records at Hospital A
4. **Central hub** → Fetches records from Hospital A (with proper authorization)
5. **Doctor at Hospital B** → Views complete medical history from all hospitals

## 🏥 Participating Hospitals (Demo)

| Hospital | Location | State |
|----------|----------|-------|
| Kuala Lumpur General Hospital | Kuala Lumpur | Federal Territory |
| Penang General Hospital | George Town | Penang |
| Sultanah Aminah Hospital | Johor Bahru | Johor |
| Sarawak General Hospital | Kuching | Sarawak |
| Queen Elizabeth Hospital | Kota Kinabalu | Sabah |

## 👥 User Roles

### 1. Doctor
- Search patients across all hospitals
- View patient medical timeline
- Create new medical records
- Access prescriptions, lab reports, and vital signs
- Queue management and e-prescriptions

### 2. Patient
- View own medical records from all hospitals
- Control privacy settings (block specific hospitals)
- View who accessed their records (access logs)
- Emergency contact management

### 3. Hospital Administrator
- Manage hospital staff
- View hospital statistics
- Bed and inventory management
- Financial reports
- Department management

### 4. Central Administrator
- Monitor entire network
- View all participating hospitals
- Audit logs across the system
- Emergency access management
- Patient index management

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Different permissions per user type
- **Audit Logging** - Every data access is logged
- **Patient Privacy Controls** - Patients can block specific hospitals
- **Hospital Verification** - Two-step login (IC card + hospital verification)
- **Emergency Access** - Special access for emergency situations with full logging

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Zustand** for state management
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript**
- **Prisma ORM** with multi-schema support
- **PostgreSQL** databases (Central + Hospital databases)
- **JWT** for authentication

## 📁 Project Structure

```
National Medical Identity Network/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── layouts/             # Page & hospital portal layouts
│   │   ├── lib/                 # API client, themes, i18n, and utilities
│   │   ├── pages/               # Application pages
│   │   │   ├── admin/           # Admin dashboards & modules
│   │   │   ├── doctor/          # Doctor dashboards & clinical modules
│   │   │   └── patient/         # Patient pages
│   │   └── store/               # Zustand state stores
│   └── netlify.toml             # Netlify deployment config
│
└── backend/                     # Express backend API
    ├── scripts/                 # Hospital schema push script
    ├── src/
    │   ├── config/              # App & hospital configuration
    │   ├── database/            # Multi-database clients & repositories
    │   ├── middleware/          # Auth & authorization middleware
    │   ├── routes/              # API routes
    │   │   ├── auth.ts          # Authentication endpoints
    │   │   ├── central.ts       # Central hub endpoints
    │   │   └── hospital.ts      # Hospital endpoints
    │   └── types/               # TypeScript types
    └── prisma/
        ├── schema.central.prisma    # Central database schema
        ├── schema.hospital.prisma   # Hospital database schema
        └── seed-multi.ts            # Database seeding
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database(s)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Create .env file with:
# DATABASE_URL_CENTRAL=postgresql://...
# DATABASE_URL_KL=postgresql://...
# DATABASE_URL_PENANG=postgresql://...
# DATABASE_URL_JB=postgresql://...
# DATABASE_URL_KUCHING=postgresql://...
# DATABASE_URL_KK=postgresql://...
# JWT_SECRET=your-secret-key

# Generate Prisma clients
npm run multi:generate

# Push database schemas
npm run multi:push

# Seed demo data
npm run multi:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL (optional)
# Create .env file with:
# VITE_API_URL=http://localhost:3000/api

# Start development server
npm run dev
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |

### Central Hub
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/central/hospitals` | List all hospitals |
| GET | `/api/central/stats` | Network statistics |
| GET | `/api/central/query/:ic` | Query patient across hospitals |
| GET | `/api/central/emergency/:ic` | Emergency access query |
| GET | `/api/central/patient/:ic` | Get patient demographics and hospital index |
| GET | `/api/central/indexes` | All patient indexes |
| GET | `/api/central/index/:ic` | Search patient index with hospital record counts |
| GET | `/api/central/audit-logs` | System audit logs |
| GET | `/api/central/my-access-logs` | Patient's own record access logs |
| GET | `/api/central/my-activity-logs` | Doctor's own clinical activity logs |
| GET | `/api/central/privacy-settings` | Patient privacy settings |
| POST | `/api/central/privacy-settings/hospital-access` | Set hospital access |

### Hospital
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hospitals/:id` | Hospital information & stats |
| GET | `/api/hospitals/:id/stats` | Hospital statistics |
| POST | `/api/hospitals/:id/records` | Create medical record |

## 🎮 Demo Accounts

### Doctors
| Name | IC Number | Password |
|------|-----------|----------|
| Dr. Lim Wei Ming | 750101-14-5001 | doctor123 |
| Dr. Tan Mei Ling | 760612-07-5001 | doctor123 |
| Dr. Siti Aishah | 770808-01-5001 | doctor123 |

### Patients
| Name | IC Number | Password |
|------|-----------|----------|
| Ahmad bin Abdullah | 880101-14-5678 | patient123 |
| Siti Nurhaliza | 950320-10-1234 | patient123 |
| Tan Ah Kow | 550715-07-9999 | patient123 |

### Administrators
| Role | Username | Password |
|------|----------|----------|
| Hospital Admin (KL) | admin-kl | admin123 |
| Hospital Admin (Penang) | admin-penang | admin123 |
| Central Admin | central-admin | central123 |

## 🌐 Deployment

### Frontend (Netlify)
The frontend is configured for Netlify deployment with SPA routing support.

### Backend (Render)
The backend includes Render-specific build scripts:
```bash
npm run render:build  # Build for production
npm run render:start  # Start production server
```

## 📊 Database Schema

### Central Database
- **Hospital** - Registered hospitals in the network
- **PatientIndex** - Maps patient IC numbers to hospitals
- **User** - System users (doctors, admins, patients)
- **AuditLog** - Access and action logging
- **PatientPrivacySetting** - Patient privacy preferences

### Hospital Database
- **Patient** - Patient demographics and contact info
- **Doctor** - Hospital doctors
- **MedicalRecord** - Visit records with diagnosis
- **Prescription** - Medications prescribed
- **LabReport** - Laboratory test results

## 🔑 Key Features Explained

### Cross-Hospital Query
When a doctor queries a patient's IC number:
1. Central hub checks the patient index
2. Identifies all hospitals where patient has records
3. Fetches records from each hospital in parallel
4. Aggregates and returns a unified timeline

### Emergency Access
For emergency situations:
- No login required
- Returns critical info: blood type, allergies, emergency contacts
- All access is logged for accountability

### Privacy Controls
Patients can:
- View which hospitals have their records
- Block specific hospitals from accessing their data
- See a log of who accessed their records and when

## 📝 License

This project was created for the Malaysia Healthcare Hackathon.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**MedLink MY** - Connecting Healthcare, Saving Lives 🇲🇾
