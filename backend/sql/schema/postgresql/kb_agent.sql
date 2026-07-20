-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_agent
-- =====================================================

SET search_path TO kb_agent;

-- =====================================================
-- kb_agent 数据库 — Agent 工作流（任务 64/65）
-- 可重复执行；无历史数据迁移
-- =====================================================

DROP TABLE IF EXISTS agent_run_step CASCADE;
DROP TABLE IF EXISTS agent_run CASCADE;
DROP TABLE IF EXISTS agent_session CASCADE;
DROP TABLE IF EXISTS agent_workflow_version CASCADE;
DROP TABLE IF EXISTS agent_workflow CASCADE;

CREATE TABLE agent_workflow (
  id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  owner_user_id BIGINT NOT NULL,
  draft_json TEXT NULL,
  published_version_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_owner ON agent_workflow (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_published_version ON agent_workflow (published_version_id);

CREATE TABLE agent_workflow_version (
  id BIGINT NOT NULL,
  workflow_id BIGINT NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  definition_json TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_workflow ON agent_workflow_version (workflow_id);

CREATE TABLE agent_session (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_user ON agent_session (user_id);

CREATE TABLE agent_run (
  id BIGINT NOT NULL,
  workflow_version_id BIGINT NULL,
  run_source VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED',
  user_id BIGINT NOT NULL,
  session_id BIGINT NULL,
  input_json TEXT NULL,
  output_json TEXT NULL,
  status VARCHAR(32) NOT NULL,
  error_code VARCHAR(64) NULL,
  error_message VARCHAR(1000) NULL,
  idempotency_key VARCHAR(128) NULL,
  cancel_requested SMALLINT NOT NULL DEFAULT 0,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  duration_ms BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_idempotency UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_version ON agent_run (workflow_version_id);
CREATE INDEX IF NOT EXISTS idx_user_status ON agent_run (user_id, status);
CREATE INDEX IF NOT EXISTS idx_session ON agent_run (session_id);

CREATE TABLE agent_run_step (
  id BIGINT NOT NULL,
  run_id BIGINT NOT NULL,
  node_id VARCHAR(64) NOT NULL,
  node_type VARCHAR(16) NOT NULL,
  tool_name VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL,
  input_snapshot TEXT NULL,
  output_snapshot TEXT NULL,
  error_message VARCHAR(1000) NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  duration_ms BIGINT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_run ON agent_run_step (run_id);
CREATE INDEX IF NOT EXISTS idx_run_node ON agent_run_step (run_id, node_id);

SELECT 'kb_agent 五表创建完成' AS message;
