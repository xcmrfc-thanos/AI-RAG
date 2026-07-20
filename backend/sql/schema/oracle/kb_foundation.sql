-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_foundation
-- 以 SYSTEM 装载时使用限定名 kb_foundation.table
-- =====================================================

-- =====================================================
-- kb_foundation 数据库 - 基础服务（合并kb_common和kb_notification）
-- =====================================================

-- =====================================================
-- 1. 系统通知表
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_notification CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_notification (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  user_name VARCHAR2(50),
  notification_type VARCHAR2(20) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  content CLOB NOT NULL,
  link VARCHAR2(500),
  related_type VARCHAR2(50),
  related_id NUMBER(19),
  is_read NUMBER(3) DEFAULT 0 NOT NULL,
  read_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_notification_idx_user_id ON kb_foundation.kb_notification (user_id);
CREATE INDEX idx_kb_notification_idx_is_read ON kb_foundation.kb_notification (is_read);
CREATE INDEX idx_kb_notification_idx_notification_type ON kb_foundation.kb_notification (notification_type);
CREATE INDEX idx_kb_notification_idx_create_time ON kb_foundation.kb_notification (created_at);
CREATE INDEX idx_kb_notification_idx_user_read ON kb_foundation.kb_notification (user_id, is_read);

-- =====================================================
-- 2. 系统配置表
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_system_config CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_system_config (
  id NUMBER(19) NOT NULL,
  config_key VARCHAR2(100) NOT NULL,
  config_value CLOB NOT NULL,
  config_type VARCHAR2(20) DEFAULT 'string' NOT NULL,
  category VARCHAR2(50),
  description VARCHAR2(500),
  is_public NUMBER(3) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_config_key UNIQUE (config_key)
);
CREATE INDEX idx_kb_system_config_idx_category ON kb_foundation.kb_system_config (category);

-- =====================================================
-- 3. 操作日志表
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_operation_log CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_operation_log (
  id NUMBER(19) NOT NULL,
  module VARCHAR2(50) NOT NULL,
  operation_type VARCHAR2(50) NOT NULL,
  operation_desc VARCHAR2(500) NOT NULL,
  request_method VARCHAR2(10),
  request_url VARCHAR2(500),
  request_params CLOB,
  response_result CLOB,
  user_id NUMBER(19),
  username VARCHAR2(50),
  ip_address VARCHAR2(50),
  location VARCHAR2(200),
  user_agent VARCHAR2(500),
  execute_time NUMBER(10),
  status NUMBER(3) DEFAULT 1 NOT NULL,
  error_msg CLOB,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_operation_log_idx_module ON kb_foundation.kb_operation_log (module);
CREATE INDEX idx_kb_operation_log_idx_user_id ON kb_foundation.kb_operation_log (user_id);
CREATE INDEX idx_kb_operation_log_idx_create_time ON kb_foundation.kb_operation_log (created_at);
CREATE INDEX idx_kb_operation_log_idx_status ON kb_foundation.kb_operation_log (status);
CREATE INDEX idx_kb_operation_log_idx_operation_type ON kb_foundation.kb_operation_log (operation_type);

-- =====================================================
-- 4. 字典类型表
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_dict CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_dict (
  id NUMBER(19) NOT NULL,
  dict_code VARCHAR2(50) NOT NULL,
  dict_name VARCHAR2(100) NOT NULL,
  dict_type VARCHAR2(50) NOT NULL,
  description VARCHAR2(500),
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_dict_code UNIQUE (dict_code)
);
CREATE INDEX idx_kb_dict_idx_dict_type ON kb_foundation.kb_dict (dict_type);

-- =====================================================
-- 5. 字典数据表
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_dict_data CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_dict_data (
  id NUMBER(19) NOT NULL,
  dict_id NUMBER(19) NOT NULL,
  dict_code VARCHAR2(50) NOT NULL,
  dict_label VARCHAR2(100) NOT NULL,
  dict_value VARCHAR2(200) NOT NULL,
  dict_sort NUMBER(10) DEFAULT 0 NOT NULL,
  css_class VARCHAR2(100),
  list_class VARCHAR2(100),
  is_default NUMBER(3) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_dict_data_idx_dict_id ON kb_foundation.kb_dict_data (dict_id);
CREATE INDEX idx_kb_dict_data_idx_dict_code ON kb_foundation.kb_dict_data (dict_code);

-- =====================================================
-- 6. 通知模板表（吸收 master-sql/11_notification_template.sql）
-- =====================================================
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_foundation.kb_notification_template CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_foundation.kb_notification_template (
  id NUMBER(19) GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  template_code VARCHAR2(100) NOT NULL,
  template_name VARCHAR2(200) NOT NULL,
  notification_type VARCHAR2(50) NOT NULL,
  title VARCHAR2(500) NOT NULL,
  content CLOB NOT NULL,
  variables VARCHAR2(1000) DEFAULT '[]',
  description VARCHAR2(500),
  is_active NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_template_code UNIQUE (template_code)
);
CREATE INDEX idx_kb_notification_template_idx_notification_type ON kb_foundation.kb_notification_template (notification_type);
CREATE INDEX idx_kb_notification_template_idx_is_active ON kb_foundation.kb_notification_template (is_active);

SELECT 'kb_foundation 数据库表创建完成！' AS message FROM dual;