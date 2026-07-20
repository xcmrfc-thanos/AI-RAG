-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_foundation
-- =====================================================

SET search_path TO kb_foundation;

-- =====================================================
-- kb_foundation 数据库 - 基础服务（合并kb_common和kb_notification）
-- =====================================================

-- =====================================================
-- 1. 系统通知表
-- =====================================================
DROP TABLE IF EXISTS kb_notification CASCADE;

CREATE TABLE kb_notification (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(50) DEFAULT NULL,
  notification_type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  link VARCHAR(500) DEFAULT NULL,
  related_type VARCHAR(50) DEFAULT NULL,
  related_id BIGINT DEFAULT NULL,
  is_read SMALLINT NOT NULL DEFAULT 0,
  read_time TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_user_id ON kb_notification (user_id);
CREATE INDEX IF NOT EXISTS idx_is_read ON kb_notification (is_read);
CREATE INDEX IF NOT EXISTS idx_notification_type ON kb_notification (notification_type);
CREATE INDEX IF NOT EXISTS idx_create_time ON kb_notification (created_at);
CREATE INDEX IF NOT EXISTS idx_user_read ON kb_notification (user_id, is_read);

-- =====================================================
-- 2. 系统配置表
-- =====================================================
DROP TABLE IF EXISTS kb_system_config CASCADE;

CREATE TABLE kb_system_config (
  id BIGINT NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) NOT NULL DEFAULT 'string',
  category VARCHAR(50) DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  is_public SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_config_key UNIQUE (config_key)
);
CREATE INDEX IF NOT EXISTS idx_category ON kb_system_config (category);

-- =====================================================
-- 3. 操作日志表
-- =====================================================
DROP TABLE IF EXISTS kb_operation_log CASCADE;

CREATE TABLE kb_operation_log (
  id BIGINT NOT NULL,
  module VARCHAR(50) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  operation_desc VARCHAR(500) NOT NULL,
  request_method VARCHAR(10) DEFAULT NULL,
  request_url VARCHAR(500) DEFAULT NULL,
  request_params TEXT DEFAULT NULL,
  response_result TEXT DEFAULT NULL,
  user_id BIGINT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL,
  ip_address VARCHAR(50) DEFAULT NULL,
  location VARCHAR(200) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  execute_time INT DEFAULT NULL,
  status SMALLINT NOT NULL DEFAULT 1,
  error_msg TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_module ON kb_operation_log (module);
CREATE INDEX IF NOT EXISTS idx_user_id ON kb_operation_log (user_id);
CREATE INDEX IF NOT EXISTS idx_create_time ON kb_operation_log (created_at);
CREATE INDEX IF NOT EXISTS idx_status ON kb_operation_log (status);
CREATE INDEX IF NOT EXISTS idx_operation_type ON kb_operation_log (operation_type);

-- =====================================================
-- 4. 字典类型表
-- =====================================================
DROP TABLE IF EXISTS kb_dict CASCADE;

CREATE TABLE kb_dict (
  id BIGINT NOT NULL,
  dict_code VARCHAR(50) NOT NULL,
  dict_name VARCHAR(100) NOT NULL,
  dict_type VARCHAR(50) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  sort INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_dict_code UNIQUE (dict_code)
);
CREATE INDEX IF NOT EXISTS idx_dict_type ON kb_dict (dict_type);

-- =====================================================
-- 5. 字典数据表
-- =====================================================
DROP TABLE IF EXISTS kb_dict_data CASCADE;

CREATE TABLE kb_dict_data (
  id BIGINT NOT NULL,
  dict_id BIGINT NOT NULL,
  dict_code VARCHAR(50) NOT NULL,
  dict_label VARCHAR(100) NOT NULL,
  dict_value VARCHAR(200) NOT NULL,
  dict_sort INT NOT NULL DEFAULT 0,
  css_class VARCHAR(100) DEFAULT NULL,
  list_class VARCHAR(100) DEFAULT NULL,
  is_default SMALLINT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_dict_id ON kb_dict_data (dict_id);
CREATE INDEX IF NOT EXISTS idx_dict_code ON kb_dict_data (dict_code);

-- =====================================================
-- 6. 通知模板表（吸收 master-sql/11_notification_template.sql）
-- =====================================================
DROP TABLE IF EXISTS kb_notification_template CASCADE;

CREATE TABLE kb_notification_template (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  template_code VARCHAR(100) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  variables VARCHAR(1000) DEFAULT '[]',
  description VARCHAR(500) DEFAULT NULL,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_template_code UNIQUE (template_code)
);
CREATE INDEX IF NOT EXISTS idx_notification_type ON kb_notification_template (notification_type);
CREATE INDEX IF NOT EXISTS idx_is_active ON kb_notification_template (is_active);

SELECT 'kb_foundation 数据库表创建完成！' AS message;
