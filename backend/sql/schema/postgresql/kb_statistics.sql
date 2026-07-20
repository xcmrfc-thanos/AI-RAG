-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_statistics
-- =====================================================

SET search_path TO kb_statistics;

-- =====================================================
-- kb_statistics 数据库 — 统计服务（4 BC 全新部署）
-- 含：聚合统计表、浏览历史、MQ 投影宽表 stat_*
-- 审计报告：statistics-sql-audit.md（任务 32）
-- 注意：本 schema 不含跨库 VIEW，勿执行 master-sql/12、14 视图脚本
-- =====================================================

-- ---------- 日聚合统计表 ----------

DROP TABLE IF EXISTS kb_document_statistics CASCADE;

CREATE TABLE kb_document_statistics (
  id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  document_title VARCHAR(200) DEFAULT NULL,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  collect_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_doc_date UNIQUE (document_id, stat_date)
);
CREATE INDEX IF NOT EXISTS idx_kb_document_statistics_idx_stat_date ON kb_document_statistics (stat_date);

DROP TABLE IF EXISTS kb_user_statistics CASCADE;

CREATE TABLE kb_user_statistics (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(50) DEFAULT NULL,
  document_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  login_count INT NOT NULL DEFAULT 0,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_date UNIQUE (user_id, stat_date)
);
CREATE INDEX IF NOT EXISTS idx_kb_user_statistics_idx_stat_date ON kb_user_statistics (stat_date);

DROP TABLE IF EXISTS kb_comment_statistics CASCADE;

CREATE TABLE kb_comment_statistics (
  id BIGINT NOT NULL,
  comment_id BIGINT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_comment_date UNIQUE (comment_id, stat_date)
);
CREATE INDEX IF NOT EXISTS idx_kb_comment_statistics_idx_stat_date ON kb_comment_statistics (stat_date);

-- ---------- 浏览历史 ----------

DROP TABLE IF EXISTS kb_view_history CASCADE;

CREATE TABLE kb_view_history (
  id BIGINT NOT NULL,
  user_id BIGINT DEFAULT NULL,
  user_name VARCHAR(50) DEFAULT NULL,
  document_id BIGINT NOT NULL,
  document_title VARCHAR(200) DEFAULT NULL,
  view_duration INT DEFAULT NULL,
  ip_address VARCHAR(50) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_kb_view_history_idx_user_id ON kb_view_history (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_view_history_idx_document_id ON kb_view_history (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_view_history_idx_create_time ON kb_view_history (created_at);
CREATE INDEX IF NOT EXISTS idx_kb_view_history_idx_user_document ON kb_view_history (user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_kb_view_history_idx_doc_date ON kb_view_history (document_id, created_at);

-- ---------- MQ 投影宽表（Intelligence / Core → statistics）----------

DROP TABLE IF EXISTS stat_ai_message CASCADE;
DROP TABLE IF EXISTS stat_ai_conversation CASCADE;

CREATE TABLE stat_ai_conversation (
  id BIGINT NOT NULL,
  user_id BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_ai_conversation_idx_deleted ON stat_ai_conversation (deleted);

CREATE TABLE stat_ai_message (
  id BIGINT NOT NULL,
  conversation_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_ai_message_idx_role_deleted ON stat_ai_message (role, deleted);

DROP TABLE IF EXISTS stat_operation_log CASCADE;
DROP TABLE IF EXISTS stat_team CASCADE;
DROP TABLE IF EXISTS stat_role CASCADE;
DROP TABLE IF EXISTS stat_comment CASCADE;
DROP TABLE IF EXISTS stat_category CASCADE;
DROP TABLE IF EXISTS stat_user CASCADE;
DROP TABLE IF EXISTS stat_document CASCADE;

CREATE TABLE stat_document (
  id BIGINT NOT NULL,
  title VARCHAR(200) DEFAULT NULL,
  author_id BIGINT DEFAULT NULL,
  category_id BIGINT DEFAULT NULL,
  status INT DEFAULT NULL,
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT NOT NULL DEFAULT 0,
  favorite_count BIGINT NOT NULL DEFAULT 0,
  summary VARCHAR(500) DEFAULT NULL,
  is_public SMALLINT NOT NULL DEFAULT 1,
  team_id BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_document_idx_author_deleted ON stat_document (author_id, deleted);
CREATE INDEX IF NOT EXISTS idx_stat_document_idx_category_deleted ON stat_document (category_id, deleted);
CREATE INDEX IF NOT EXISTS idx_stat_document_idx_status_deleted ON stat_document (status, deleted);

CREATE TABLE stat_user (
  id BIGINT NOT NULL,
  username VARCHAR(50) DEFAULT NULL,
  real_name VARCHAR(50) DEFAULT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  status INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_user_idx_status_deleted ON stat_user (status, deleted);

CREATE TABLE stat_comment (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_comment_idx_user_deleted ON stat_comment (user_id, deleted);
CREATE INDEX IF NOT EXISTS idx_stat_comment_idx_doc_deleted ON stat_comment (document_id, deleted);

CREATE TABLE stat_category (
  id BIGINT NOT NULL,
  category_name VARCHAR(100) DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE stat_role (
  id BIGINT NOT NULL,
  role_name VARCHAR(100) DEFAULT NULL,
  role_code VARCHAR(50) DEFAULT NULL,
  status INT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_role_idx_deleted ON stat_role (deleted);

CREATE TABLE stat_team (
  id BIGINT NOT NULL,
  team_name VARCHAR(100) DEFAULT NULL,
  team_code VARCHAR(50) DEFAULT NULL,
  status INT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_team_idx_deleted ON stat_team (deleted);

CREATE TABLE stat_operation_log (
  id BIGINT NOT NULL,
  user_id BIGINT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL,
  status INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_stat_operation_log_idx_user_created ON stat_operation_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stat_operation_log_idx_created_status ON stat_operation_log (created_at, status);

SELECT 'kb_statistics 表结构创建完成！' AS message;
