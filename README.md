# 🏥 MedLink MY - National Medical Identity Network

> **GoDamLah 2.0 Identity Hackathon Project**

A federated healthcare platform that uses Malaysian IC numbers as universal patient identifiers for seamless cross-hospital medical record access.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)

---

## 🎯 Problem Statement

Malaysian citizens often receive treatment at multiple hospitals throughout their lives. Currently, each hospital maintains isolated medical records, leading to:

- ❌ Incomplete patient history during consultations
- ❌ Repeated medical tests and procedures
- ❌ Risk of dangerous drug interactions
- ❌ Emergency delays when records aren't available
- ❌ Inefficient healthcare resource utilization

## ✨ Our Solution

MedLink MY creates a **federated network** that connects hospital databases while maintaining **data sovereignty**. Using the patient's IC number as a universal key:

| Feature | Description |
|---------|-------------|
| 🔐 **Data Sovereignty** | Each hospital maintains full control over their data |
| ⚡ **Instant Access** | Retrieve records from all hospitals in seconds |
| 🌏 **Nationwide Coverage** | Connected hospitals across Malaysia |
| 👤 **Patient-Centric** | Patients control access to their records |
| 🔒 **Read-Only Access** | Cross-hospital access is strictly read-only |
| 📋 **Audit Trail** | Every access is logged with timestamps |

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CENTRAL DATABASE                           │
│  (Patient Index, Users, Hospitals Registry, Audit Logs)        │
│                     Neon PostgreSQL                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Hospital   │   │  Hospital   │   │  Hospital   │
│  KL (Blue)  │   │ Penang(Grn) │   │  JB (Amber) │
│  Database   │   │  Database   │   │  Database   │
└─────────────┘   └─────────────┘   └─────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────────────┐         ┌──────────────┐
       │   Hospital   │         │   Hospital   │
       │ Kuching(Vlt) │         │  KK (Red)    │
       │   Database   │         │   Database   │
       └──────────────┘         └──────────────┘
```

### Key Principles

1. **Central Hub** - Maintains patient index mapping IC numbers to hospital IDs. Does NOT store medical data.
2. **Hospital Nodes** - Each hospital runs their own database. They respond to queries with patient consent.
3. **Read-Only Access** - Cross-hospital access is strictly read-only. Only the originating hospital can modify records.
4. **Audit Trail** - Every access is logged with timestamps, accessor identity, and purpose.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL databases (we use Neon)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/national-medical-identity-network.git
cd national-medical-identity-network

# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Setup

Create `.env` file in `/backend`:

```env
# Central Database
DATABASE_URL_CENTRAL=postgresql://...

# Hospital Databases
DATABASE_URL_HOSPITAL_KL=postgresql://...
DATABASE_URL_HOSPITAL_PENANG=postgresql://...
DATABASE_URL_HOSPITAL_JB=postgresql://...
DATABASE_URL_HOSPITAL_KUCHING=postgresql://...
DATABASE_URL_HOSPITAL_KK=postgresql://...

# JWT Secret
JWT_SECRET=your-secret-key
```

Create `.env.local` file in `/frontend`:

```env
VITE_API_URL=http://localhost:3000/api
```

### Database Setup

```bash
cd backend

# Generate Prisma clients
npm run multi:generate

# Push schemas to databases
npm run multi:push

# Seed demo data
npm run multi:seed
```

### Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

---

## 🔑 Demo Credentials

| Role | IC/Username | Password |
|------|-------------|----------|
| **Central Admin** | `central-admin` | `central123` |
| **Hospital Admin (KL)** | `admin-kl` | `admin123` |
| **Doctor (KL)** | `750101-14-5001` | `doctor123` |
| **Patient** | `880101-14-5678` | `patient123` |

---

## 📁 Project Structure

```text
national-medical-identity-network/
├── backend/
│   ├── prisma/
│   │   ├── schema.central.prisma    # Central DB schema
│   │   ├── schema.hospital.prisma   # Hospital DB schema
│   │   └── seed-multi.ts            # Demo data seeder
│   ├── src/
│   │   ├── config/                  # Configuration
│   │   ├── database/                # Multi-DB managers
│   │   ├── middleware/              # Auth middleware
│   │   ├── routes/                  # API routes
│   │   ├── types/                   # TypeScript types
│   │   └── index.ts                 # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/ui/           # Shadcn/ui components
│   │   ├── layouts/                 # Page layouts
│   │   ├── lib/                     # Utilities & API client
│   │   ├── pages/                   # All pages
│   │   ├── store/                   # Zustand stores
│   │   └── App.tsx                  # Main app & routing
│   └── package.json
└── README.md
```

---

## 🎨 Features by User Role

### 👨‍⚕️ Doctor Portal
- Cross-hospital patient search via IC number
- View complete medical timeline from all hospitals
- Create new medical records (own hospital only)
- View read-only records from other hospitals

### 👤 Patient Portal
- View all personal medical records
- Privacy settings - block/unblock hospital access
- View access logs (who viewed your records)

### 🏥 Hospital Admin
- Hospital statistics dashboard
- Staff management
- Audit log access

### 🌐 Central Admin
- Network-wide statistics
- All hospital management
- Complete audit logs
- Patient index lookup

---

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Secure token-based auth |
| **Role-Based Access** | 4 distinct user roles |
| **Read-Only Cross-Access** | Other hospitals cannot modify data |
| **Complete Audit Trail** | All actions logged |
| **Patient Consent** | Patients control access |
| **Password Hashing** | SHA-256 + salt |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (Multi-database)
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Components**: Shadcn/ui
- **State**: Zustand
- **Animation**: Framer Motion
- **Icons**: Lucide React

---

## 🏆 Hackathon Tracks Addressed

### 1️⃣ Inclusivity Track
- ✅ Multi-language support (EN, MS, ZH)
- ✅ Accessibility features (font size, high contrast)
- ✅ Emergency access mode (offline-capable)

### 2️⃣ Innovation Track
- ✅ IC as universal medical identity
- ✅ Federated database architecture
- ✅ Real-time cross-hospital query

### 3️⃣ Security Track
- ✅ Read-only cross-access
- ✅ Complete audit trail
- ✅ Patient consent management
- ✅ Data encryption

---

## 📄 License

This project was built for **GoDamLah 2.0: Identity Hackathon**.

---

## 👥 Team

Built with ❤️ for Malaysian Healthcare

---

**🏥 MedLink MY - Your IC is Your Universal Medical Key**
