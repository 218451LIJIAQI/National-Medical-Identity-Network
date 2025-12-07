-- ============================================================================
-- 本地 PostgreSQL 数据库初始化脚本
-- 在 psql 中运行此脚本来创建所有需要的数据库
-- 运行命令: psql -U postgres -f scripts/setup-local-db.sql
-- ============================================================================

-- 创建中心数据库
DROP DATABASE IF EXISTS medlink_central;
CREATE DATABASE medlink_central;

-- 创建医院数据库
DROP DATABASE IF EXISTS medlink_hospital_kl;
CREATE DATABASE medlink_hospital_kl;

DROP DATABASE IF EXISTS medlink_hospital_penang;
CREATE DATABASE medlink_hospital_penang;

DROP DATABASE IF EXISTS medlink_hospital_jb;
CREATE DATABASE medlink_hospital_jb;

DROP DATABASE IF EXISTS medlink_hospital_kuching;
CREATE DATABASE medlink_hospital_kuching;

DROP DATABASE IF EXISTS medlink_hospital_kk;
CREATE DATABASE medlink_hospital_kk;

-- 显示创建结果
\l medlink_*

\echo '============================================'
\echo '所有数据库创建完成！'
\echo '============================================'
\echo 'medlink_central       - 中心数据库'
\echo 'medlink_hospital_kl   - KL 医院'
\echo 'medlink_hospital_penang - Penang 医院'
\echo 'medlink_hospital_jb   - JB 医院'
\echo 'medlink_hospital_kuching - Kuching 医院'
\echo 'medlink_hospital_kk   - KK 医院'
\echo '============================================'
