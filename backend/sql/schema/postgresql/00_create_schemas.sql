-- =====================================================
-- PostgreSQL：创建业务 schema（对应 MySQL 多库）
-- 用法：psql -U postgres -f 00_create_schemas.sql
-- =====================================================

CREATE SCHEMA IF NOT EXISTS kb_user;
CREATE SCHEMA IF NOT EXISTS kb_document;
CREATE SCHEMA IF NOT EXISTS kb_file;
CREATE SCHEMA IF NOT EXISTS kb_statistics;
CREATE SCHEMA IF NOT EXISTS kb_foundation;
CREATE SCHEMA IF NOT EXISTS kb_intelligence;
CREATE SCHEMA IF NOT EXISTS kb_agent;

-- 可选：应用角色（生产请改密码）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kb_app') THEN
    CREATE ROLE kb_app LOGIN PASSWORD 'kb_app_change_me';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA kb_user, kb_document, kb_file, kb_statistics,
    kb_foundation, kb_intelligence, kb_agent TO kb_app;
GRANT ALL ON SCHEMA kb_user, kb_document, kb_file, kb_statistics,
    kb_foundation, kb_intelligence, kb_agent TO kb_app;

SELECT 'PostgreSQL schemas created' AS message;
