-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_statistics
-- 以 SYSTEM 装载时使用限定名 kb_statistics.table
-- =====================================================

-- =====================================================
-- kb_statistics 数据库 — 统计服务（4 BC 全新部署）
-- 含：聚合统计表、浏览历史、MQ 投影宽表 stat_*
-- 审计报告：statistics-sql-audit.md（任务 32）
-- 注意：本 schema 不含跨库 VIEW，勿执行 master-sql/12、14 视图脚本
-- =====================================================

-- ---------- 日聚合统计表 ----------

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.kb_document_statistics CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.kb_document_statistics (
  id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  document_title VARCHAR2(200),
  view_count NUMBER(10) DEFAULT 0 NOT NULL,
  like_count NUMBER(10) DEFAULT 0 NOT NULL,
  comment_count NUMBER(10) DEFAULT 0 NOT NULL,
  collect_count NUMBER(10) DEFAULT 0 NOT NULL,
  share_count NUMBER(10) DEFAULT 0 NOT NULL,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_doc_date UNIQUE (document_id, stat_date)
);
CREATE INDEX idx_kb_document_statistics_idx_stat_date ON kb_statistics.kb_document_statistics (stat_date);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.kb_user_statistics CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.kb_user_statistics (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  user_name VARCHAR2(50),
  document_count NUMBER(10) DEFAULT 0 NOT NULL,
  comment_count NUMBER(10) DEFAULT 0 NOT NULL,
  like_count NUMBER(10) DEFAULT 0 NOT NULL,
  view_count NUMBER(10) DEFAULT 0 NOT NULL,
  login_count NUMBER(10) DEFAULT 0 NOT NULL,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_date UNIQUE (user_id, stat_date)
);
CREATE INDEX idx_kb_user_statistics_idx_stat_date ON kb_statistics.kb_user_statistics (stat_date);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.kb_comment_statistics CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.kb_comment_statistics (
  id NUMBER(19) NOT NULL,
  comment_id NUMBER(19) NOT NULL,
  like_count NUMBER(10) DEFAULT 0 NOT NULL,
  reply_count NUMBER(10) DEFAULT 0 NOT NULL,
  stat_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_comment_date UNIQUE (comment_id, stat_date)
);
CREATE INDEX idx_kb_comment_statistics_idx_stat_date ON kb_statistics.kb_comment_statistics (stat_date);

-- ---------- 浏览历史 ----------

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.kb_view_history CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.kb_view_history (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19),
  user_name VARCHAR2(50),
  document_id NUMBER(19) NOT NULL,
  document_title VARCHAR2(200),
  view_duration NUMBER(10),
  ip_address VARCHAR2(50),
  user_agent VARCHAR2(500),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_view_history_idx_user_id ON kb_statistics.kb_view_history (user_id);
CREATE INDEX idx_kb_view_history_idx_document_id ON kb_statistics.kb_view_history (document_id);
CREATE INDEX idx_kb_view_history_idx_create_time ON kb_statistics.kb_view_history (created_at);
CREATE INDEX idx_kb_view_history_idx_user_document ON kb_statistics.kb_view_history (user_id, document_id);
CREATE INDEX idx_kb_view_history_idx_doc_date ON kb_statistics.kb_view_history (document_id, created_at);

-- ---------- MQ 投影宽表（Intelligence / Core → statistics）----------

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_ai_message CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_ai_conversation CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.stat_ai_conversation (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19),
  created_at TIMESTAMP,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_ai_conversation_idx_deleted ON kb_statistics.stat_ai_conversation (deleted);

CREATE TABLE kb_statistics.stat_ai_message (
  id NUMBER(19) NOT NULL,
  conversation_id NUMBER(19) NOT NULL,
  role VARCHAR2(20) NOT NULL,
  created_at TIMESTAMP,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_ai_message_idx_role_deleted ON kb_statistics.stat_ai_message (role, deleted);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_operation_log CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_team CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_role CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_comment CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_category CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_user CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_statistics.stat_document CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_statistics.stat_document (
  id NUMBER(19) NOT NULL,
  title VARCHAR2(200),
  author_id NUMBER(19),
  category_id NUMBER(19),
  status NUMBER(10),
  view_count NUMBER(19) DEFAULT 0 NOT NULL,
  like_count NUMBER(19) DEFAULT 0 NOT NULL,
  favorite_count NUMBER(19) DEFAULT 0 NOT NULL,
  summary VARCHAR2(500),
  is_public NUMBER(3) DEFAULT 1 NOT NULL,
  team_id NUMBER(19),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_document_idx_author_deleted ON kb_statistics.stat_document (author_id, deleted);
CREATE INDEX idx_stat_document_idx_category_deleted ON kb_statistics.stat_document (category_id, deleted);
CREATE INDEX idx_stat_document_idx_status_deleted ON kb_statistics.stat_document (status, deleted);

CREATE TABLE kb_statistics.stat_user (
  id NUMBER(19) NOT NULL,
  username VARCHAR2(50),
  real_name VARCHAR2(50),
  avatar VARCHAR2(255),
  status NUMBER(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_user_idx_status_deleted ON kb_statistics.stat_user (status, deleted);

CREATE TABLE kb_statistics.stat_comment (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_comment_idx_user_deleted ON kb_statistics.stat_comment (user_id, deleted);
CREATE INDEX idx_stat_comment_idx_doc_deleted ON kb_statistics.stat_comment (document_id, deleted);

CREATE TABLE kb_statistics.stat_category (
  id NUMBER(19) NOT NULL,
  category_name VARCHAR2(100),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE kb_statistics.stat_role (
  id NUMBER(19) NOT NULL,
  role_name VARCHAR2(100),
  role_code VARCHAR2(50),
  status NUMBER(10),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_role_idx_deleted ON kb_statistics.stat_role (deleted);

CREATE TABLE kb_statistics.stat_team (
  id NUMBER(19) NOT NULL,
  team_name VARCHAR2(100),
  team_code VARCHAR2(50),
  status NUMBER(10),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_team_idx_deleted ON kb_statistics.stat_team (deleted);

CREATE TABLE kb_statistics.stat_operation_log (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19),
  username VARCHAR2(50),
  status NUMBER(10),
  created_at TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX idx_stat_operation_log_idx_user_created ON kb_statistics.stat_operation_log (user_id, created_at);
CREATE INDEX idx_stat_operation_log_idx_created_status ON kb_statistics.stat_operation_log (created_at, status);

SELECT 'kb_statistics 表结构创建完成！' AS message FROM dual;