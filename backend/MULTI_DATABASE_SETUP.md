# 🏥 多数据库架构设置指南

本指南说明如何设置独立的 PostgreSQL 数据库，实现真正的联邦式医疗数据架构。

## 📊 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                        你的应用 (Backend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   用户登录 → JWT Token (包含 hospitalId) → 自动路由到对应数据库  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │   Central    │    │   KL 医院    │    │  Penang 医院  │
   │   Database   │    │   Database   │    │   Database   │
   ├──────────────┤    ├──────────────┤    ├──────────────┤
   │ PatientIndex │    │   Patient    │    │   Patient    │
   │ User         │    │ MedicalRecord│    │ MedicalRecord│
   │ Hospital     │    │ Prescription │    │ Prescription │
   │ AuditLog     │    │ LabReport    │    │ LabReport    │
   │ Privacy      │    │   Doctor     │    │   Doctor     │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
      PostgreSQL          PostgreSQL          PostgreSQL
      (独立实例)           (独立实例)           (独立实例)
```

---

## 🖥️ 本地开发设置

### 步骤 1: 安装 PostgreSQL

**Windows:**
```bash
# 使用 chocolatey
choco install postgresql

# 或下载安装包: https://www.postgresql.org/download/windows/
```

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 步骤 2: 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 运行创建脚本
\i scripts/setup-local-db.sql

# 或手动创建
CREATE DATABASE medlink_central;
CREATE DATABASE medlink_hospital_kl;
CREATE DATABASE medlink_hospital_penang;
CREATE DATABASE medlink_hospital_jb;
CREATE DATABASE medlink_hospital_kuching;
CREATE DATABASE medlink_hospital_kk;
```

### 步骤 3: 配置环境变量

```bash
# 复制示例文件
cp .env.local.example .env

# 编辑 .env 文件，确保密码正确
```

**.env 文件内容:**
```env
# 中心数据库
DATABASE_URL_CENTRAL=postgresql://postgres:your_password@localhost:5432/medlink_central

# 医院数据库
DATABASE_URL_HOSPITAL_KL=postgresql://postgres:your_password@localhost:5432/medlink_hospital_kl
DATABASE_URL_HOSPITAL_PENANG=postgresql://postgres:your_password@localhost:5432/medlink_hospital_penang
DATABASE_URL_HOSPITAL_JB=postgresql://postgres:your_password@localhost:5432/medlink_hospital_jb
DATABASE_URL_HOSPITAL_KUCHING=postgresql://postgres:your_password@localhost:5432/medlink_hospital_kuching
DATABASE_URL_HOSPITAL_KK=postgresql://postgres:your_password@localhost:5432/medlink_hospital_kk

JWT_SECRET=your-local-secret-key
PORT=3000
```

### 步骤 4: 初始化数据库

```bash
# 生成 Prisma 客户端
npm run multi:generate

# 推送 Schema 到所有数据库
npm run multi:push

# 填充演示数据
npm run multi:seed

# 或一键完成
npm run multi:setup
```

### 步骤 5: 启动服务

```bash
npm run dev
```

---

## ☁️ 云端部署设置 (Neon + Render)

### 步骤 1: 创建 Neon 数据库

1. 访问 [Neon Console](https://console.neon.tech/)
2. 创建新项目
3. 创建 6 个数据库:
   - `medlink_central`
   - `medlink_hospital_kl`
   - `medlink_hospital_penang`
   - `medlink_hospital_jb`
   - `medlink_hospital_kuching`
   - `medlink_hospital_kk`

**在 Neon SQL Editor 中运行:**
```sql
CREATE DATABASE medlink_hospital_kl;
CREATE DATABASE medlink_hospital_penang;
CREATE DATABASE medlink_hospital_jb;
CREATE DATABASE medlink_hospital_kuching;
CREATE DATABASE medlink_hospital_kk;
```

4. 复制每个数据库的连接字符串

### 步骤 2: 配置 Render 环境变量

在 Render Dashboard 中设置以下环境变量:

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL_CENTRAL` | `postgresql://...@neon.tech/medlink_central?sslmode=require` |
| `DATABASE_URL_HOSPITAL_KL` | `postgresql://...@neon.tech/medlink_hospital_kl?sslmode=require` |
| `DATABASE_URL_HOSPITAL_PENANG` | `postgresql://...@neon.tech/medlink_hospital_penang?sslmode=require` |
| `DATABASE_URL_HOSPITAL_JB` | `postgresql://...@neon.tech/medlink_hospital_jb?sslmode=require` |
| `DATABASE_URL_HOSPITAL_KUCHING` | `postgresql://...@neon.tech/medlink_hospital_kuching?sslmode=require` |
| `DATABASE_URL_HOSPITAL_KK` | `postgresql://...@neon.tech/medlink_hospital_kk?sslmode=require` |
| `JWT_SECRET` | `your-production-secret` |
| `NODE_ENV` | `production` |

### 步骤 3: 部署

Render Build Command:
```bash
npm run multi:generate && npm run multi:push && tsc
```

Start Command:
```bash
npm run multi:seed && node dist/index.js
```

---

## 🔑 测试账户

| 角色 | IC/用户名 | 密码 | 说明 |
|------|----------|------|------|
| 中央管理员 | `central-admin` | `central123` | 查看全局数据 |
| 医院管理员 | `admin-kl` | `admin123` | KL医院管理 |
| 医生 | `750101-14-5001` | `doctor123` | KL医院医生 |
| 患者 | `880101-14-5678` | `patient123` | 跨院病历 |

---

## 🔄 数据流示例

### 医生登录并查询患者

```
1. 医生输入 IC: 750101-14-5001
                    ↓
2. 中心数据库查询用户表
   → 返回: role=doctor, hospitalId=hospital-kl
                    ↓
3. 生成 JWT Token: { hospitalId: 'hospital-kl', ... }
                    ↓
4. 医生查询患者 880101-14-5678
                    ↓
5. 中心数据库查询 PatientIndex
   → 返回: hospitals=['hospital-kl', 'hospital-penang', 'hospital-jb']
                    ↓
6. 并行查询各医院数据库
   → hospital-kl DB: 返回 2 条记录
   → hospital-penang DB: 返回 1 条记录  
   → hospital-jb DB: 返回 3 条记录
                    ↓
7. 整合并返回完整时间线 (6 条记录)
```

### 医生创建新病历

```
1. 医生在 KL 医院为患者创建病历
                    ↓
2. 系统检查 JWT: hospitalId = 'hospital-kl'
                    ↓
3. 自动写入 KL 医院数据库 (medlink_hospital_kl)
                    ↓
4. 更新中心数据库 PatientIndex
   → 确保 'hospital-kl' 在该患者的医院列表中
                    ↓
5. 记录审计日志到中心数据库
```

---

## 📁 文件结构

```
backend/
├── prisma/
│   ├── schema.central.prisma    # 中心数据库 Schema
│   ├── schema.hospital.prisma   # 医院数据库 Schema (通用)
│   ├── seed-multi.ts            # 多数据库种子数据
│   └── schema.prisma            # 原单数据库 Schema (保留)
├── scripts/
│   ├── setup-local-db.sql       # 本地数据库创建脚本
│   └── push-hospital-schemas.ts # 推送医院 Schema 脚本
├── src/
│   └── database/
│       ├── multi-db-manager.ts  # 多数据库连接管理
│       └── hospital-multi.ts    # 医院数据库操作 (多DB版)
├── .env.local.example           # 本地环境变量示例
├── .env.neon.example            # Neon 环境变量示例
└── MULTI_DATABASE_SETUP.md      # 本文档
```

---

## ⚙️ NPM 脚本

| 脚本 | 说明 |
|------|------|
| `npm run multi:generate` | 生成所有 Prisma 客户端 |
| `npm run multi:push` | 推送 Schema 到所有数据库 |
| `npm run multi:seed` | 填充演示数据 |
| `npm run multi:setup` | 一键完成上述所有步骤 |
| `npm run multi:reset` | 重置并重新填充数据 |

---

## 🔒 安全特性

1. **数据隔离**: 每家医院数据物理隔离在独立数据库
2. **只读访问**: 跨院查询只能读取，不能修改其他医院数据
3. **审计日志**: 所有访问记录到中心数据库
4. **患者控制**: 患者可以阻止特定医院访问自己的数据

---

## ❓ 常见问题

### Q: 为什么用多个数据库而不是一个？

**A**: 这模拟了真实世界的联邦式架构：
- 每家医院保留自己数据的主权
- 符合医疗数据合规要求
- 更好的演示效果

### Q: 本地开发可以只用一个 PostgreSQL 实例吗？

**A**: 可以！一个 PostgreSQL 服务器可以有多个数据库。这正是本指南的做法。

### Q: Neon 免费版够用吗？

**A**: Neon 免费版支持：
- 1 个项目
- 多个数据库 (在同一项目内)
- 0.5 GB 存储
- 对于演示完全够用！
