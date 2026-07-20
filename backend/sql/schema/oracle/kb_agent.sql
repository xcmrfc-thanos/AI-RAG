-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_agent
-- 以 SYSTEM 装载时使用限定名 kb_agent.table
-- =====================================================

-- =====================================================
-- kb_agent 数据库 — Agent 工作流（任务 64/65）
-- 可重复执行；无历史数据迁移
-- =====================================================

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_agent.agent_run_step CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_agent.agent_run CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_agent.agent_session CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_agent.agent_workflow_version CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_agent.agent_workflow CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_agent.agent_workflow (
  id NUMBER(19) NOT NULL,
  name VARCHAR2(128) NOT NULL,
  owner_user_id NUMBER(19) NOT NULL,
  draft_json CLOB NULL,
  published_version_id NUMBER(19) NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_agent_workflow_idx_owner ON kb_agent.agent_workflow (owner_user_id);
CREATE INDEX idx_agent_workflow_idx_published_version ON kb_agent.agent_workflow (published_version_id);

CREATE TABLE kb_agent.agent_workflow_version (
  id NUMBER(19) NOT NULL,
  workflow_id NUMBER(19) NOT NULL,
  schema_version NUMBER(10) DEFAULT 1 NOT NULL,
  definition_json CLOB NOT NULL,
  published_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  published_by NUMBER(19) NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_agent_workflow_version_idx_workflow ON kb_agent.agent_workflow_version (workflow_id);

CREATE TABLE kb_agent.agent_session (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  title VARCHAR2(200) NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_agent_session_idx_user ON kb_agent.agent_session (user_id);

CREATE TABLE kb_agent.agent_run (
  id NUMBER(19) NOT NULL,
  workflow_version_id NUMBER(19) NULL,
  run_source VARCHAR2(16) DEFAULT 'PUBLISHED' NOT NULL,
  user_id NUMBER(19) NOT NULL,
  session_id NUMBER(19) NULL,
  input_json CLOB NULL,
  output_json CLOB NULL,
  status VARCHAR2(32) NOT NULL,
  error_code VARCHAR2(64) NULL,
  error_message VARCHAR2(1000) NULL,
  idempotency_key VARCHAR2(128) NULL,
  cancel_requested NUMBER(3) DEFAULT 0 NOT NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  duration_ms NUMBER(19) NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_idempotency UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_agent_run_idx_version ON kb_agent.agent_run (workflow_version_id);
CREATE INDEX idx_agent_run_idx_user_status ON kb_agent.agent_run (user_id, status);
CREATE INDEX idx_agent_run_idx_session ON kb_agent.agent_run (session_id);

CREATE TABLE kb_agent.agent_run_step (
  id NUMBER(19) NOT NULL,
  run_id NUMBER(19) NOT NULL,
  node_id VARCHAR2(64) NOT NULL,
  node_type VARCHAR2(16) NOT NULL,
  tool_name VARCHAR2(64) NULL,
  status VARCHAR2(32) NOT NULL,
  input_snapshot CLOB NULL,
  output_snapshot CLOB NULL,
  error_message VARCHAR2(1000) NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  duration_ms NUMBER(19) NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_agent_run_step_idx_run ON kb_agent.agent_run_step (run_id);
CREATE INDEX idx_agent_run_step_idx_run_node ON kb_agent.agent_run_step (run_id, node_id);

SELECT 'kb_agent 五表创建完成' AS message FROM dual;