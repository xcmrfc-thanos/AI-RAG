-- =====================================================
-- kb_foundation 数据库 - 基础服务（合并kb_common和kb_notification）
-- =====================================================

SET NAMES utf8mb4;
USE `kb_foundation`;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 系统通知表
-- =====================================================
DROP TABLE IF EXISTS `kb_notification`;
CREATE TABLE `kb_notification` (
  `id` BIGINT NOT NULL COMMENT '通知ID（雪花ID）',
  `user_id` BIGINT NOT NULL COMMENT '接收用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `notification_type` VARCHAR(20) NOT NULL COMMENT '通知类型：system/comment/mention/review/like',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `link` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
  `related_id` BIGINT DEFAULT NULL COMMENT '关联ID',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';

-- =====================================================
-- 2. 系统配置表
-- =====================================================
DROP TABLE IF EXISTS `kb_system_config`;
CREATE TABLE `kb_system_config` (
  `id` BIGINT NOT NULL COMMENT '配置ID（雪花ID）',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT NOT NULL COMMENT '配置值',
  `config_type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '配置类型：string/number/boolean/json',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '配置分类：AI/STORAGE/NOTIFICATION/SECURITY等',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '配置描述',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开：0-私有，1-公开',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =====================================================
-- 3. 操作日志表
-- =====================================================
DROP TABLE IF EXISTS `kb_operation_log`;
CREATE TABLE `kb_operation_log` (
  `id` BIGINT NOT NULL COMMENT '日志ID（雪花ID）',
  `module` VARCHAR(50) NOT NULL COMMENT '模块名称',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型：LOGIN/CREATE/UPDATE/DELETE等',
  `operation_desc` VARCHAR(500) NOT NULL COMMENT '操作描述',
  `request_method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法：GET/POST/PUT/DELETE',
  `request_url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` TEXT DEFAULT NULL COMMENT '请求参数（JSON）',
  `response_result` TEXT DEFAULT NULL COMMENT '响应结果（JSON）',
  `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '操作用户名',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `location` VARCHAR(200) DEFAULT NULL COMMENT '地理位置',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `execute_time` INT DEFAULT NULL COMMENT '执行时长（毫秒）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-失败，1-成功',
  `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_operation_type` (`operation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- =====================================================
-- 4. 字典类型表
-- =====================================================
DROP TABLE IF EXISTS `kb_dict`;
CREATE TABLE `kb_dict` (
  `id` BIGINT NOT NULL COMMENT '字典ID（雪花ID）',
  `dict_code` VARCHAR(50) NOT NULL COMMENT '字典编码',
  `dict_name` VARCHAR(100) NOT NULL COMMENT '字典名称',
  `dict_type` VARCHAR(50) NOT NULL COMMENT '字典类型',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`),
  KEY `idx_dict_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

-- =====================================================
-- 5. 字典数据表
-- =====================================================
DROP TABLE IF EXISTS `kb_dict_data`;
CREATE TABLE `kb_dict_data` (
  `id` BIGINT NOT NULL COMMENT '字典数据ID（雪花ID）',
  `dict_id` BIGINT NOT NULL COMMENT '字典ID',
  `dict_code` VARCHAR(50) NOT NULL COMMENT '字典编码（冗余）',
  `dict_label` VARCHAR(100) NOT NULL COMMENT '字典标签',
  `dict_value` VARCHAR(200) NOT NULL COMMENT '字典值',
  `dict_sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `css_class` VARCHAR(100) DEFAULT NULL COMMENT '样式类名',
  `list_class` VARCHAR(100) DEFAULT NULL COMMENT '列表样式',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认：0-否，1-是',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`),
  KEY `idx_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';

-- =====================================================
-- 6. 通知模板表（吸收 master-sql/11_notification_template.sql）
-- =====================================================
DROP TABLE IF EXISTS `kb_notification_template`;
CREATE TABLE `kb_notification_template` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `template_code` VARCHAR(100) NOT NULL COMMENT '模板编码',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称',
  `notification_type` VARCHAR(50) NOT NULL COMMENT '通知类型',
  `title` VARCHAR(500) NOT NULL COMMENT '模板标题',
  `content` TEXT NOT NULL COMMENT '模板内容',
  `variables` VARCHAR(1000) DEFAULT '[]' COMMENT '模板变量（JSON）',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '模板描述',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- =====================================================
-- 6. 敏感词词库（L1）
-- =====================================================
DROP TABLE IF EXISTS `kb_sensitive_word`;
CREATE TABLE `kb_sensitive_word` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `word` VARCHAR(128) NOT NULL COMMENT '词条原文',
  `category` VARCHAR(32) NOT NULL DEFAULT 'custom' COMMENT '分类：spam/abuse/porn/gambling/ad/privacy/custom',
  `action` VARCHAR(16) NOT NULL DEFAULT 'block' COMMENT '策略：block拦截/replace替换/audit仅审计',
  `replace_to` VARCHAR(128) DEFAULT NULL COMMENT '替换文本（action=replace 时生效）',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0否1是',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sensitive_word` (`word`, `deleted`),
  KEY `idx_category` (`category`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词词库（L1 AC匹配）';

-- =====================================================
-- 7. 敏感词正则规则（L1.5）
-- =====================================================
DROP TABLE IF EXISTS `kb_sensitive_regex`;
CREATE TABLE `kb_sensitive_regex` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `name` VARCHAR(64) NOT NULL COMMENT '规则名称',
  `pattern` VARCHAR(512) NOT NULL COMMENT 'Java 正则表达式',
  `category` VARCHAR(32) NOT NULL DEFAULT 'privacy' COMMENT '分类',
  `action` VARCHAR(16) NOT NULL DEFAULT 'block' COMMENT '策略：block/replace/audit',
  `replace_to` VARCHAR(128) DEFAULT NULL COMMENT '替换文本',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0否1是',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_regex_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词正则规则（L1.5）';

-- =====================================================
-- 8. 谐音/形近映射（L1.5 归一化）
-- =====================================================
DROP TABLE IF EXISTS `kb_sensitive_homophone`;
CREATE TABLE `kb_sensitive_homophone` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `src` VARCHAR(16) NOT NULL COMMENT '源字符或短串',
  `dst` VARCHAR(16) NOT NULL COMMENT '归一目标',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0否1是',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_homophone_src` (`src`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词谐音映射（L1.5）';

-- =====================================================
-- 9. 模型提供方表（第8阶段模型库）
-- =====================================================
DROP TABLE IF EXISTS `kb_model_provider`;
CREATE TABLE `kb_model_provider` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `provider_key` VARCHAR(50) NOT NULL COMMENT '提供方标识：qwen/siliconflow/deepseek/custom/openai/ollama',
  `provider_name` VARCHAR(100) NOT NULL COMMENT '显示名（通义千问/硅基流动…）',
  `base_url` VARCHAR(500) DEFAULT NULL COMMENT 'OpenAI 兼容基址（custom 必填）',
  `api_key` TEXT DEFAULT NULL COMMENT 'API Key 密文（enc:v1:...，AES-GCM）',
  `api_key_hint` VARCHAR(20) DEFAULT NULL COMMENT '掩码提示（sk-****abcd）',
  `extra_params` JSON DEFAULT NULL COMMENT '预留参数（超时/代理等）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provider_key` (`provider_key`, `deleted`),
  KEY `idx_provider_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型提供方（第8阶段模型库）';

-- =====================================================
-- 10. 模型条目表（第8阶段模型库）
-- =====================================================
DROP TABLE IF EXISTS `kb_model`;
CREATE TABLE `kb_model` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `provider_id` BIGINT NOT NULL COMMENT '提供方ID（关联 kb_model_provider.id）',
  `model_key` VARCHAR(100) NOT NULL COMMENT '物理模型名（qwen3-max/BAAI-bge-m3/qwen3-rerank）',
  `model_type` VARCHAR(20) NOT NULL COMMENT '类型：chat/embedding/rerank/tts/stt/image/other',
  `display_name` VARCHAR(100) DEFAULT NULL COMMENT '下拉显示名',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否该类型默认：0-否，1-是（每类型至多一个）',
  `dimension` INT DEFAULT NULL COMMENT 'embedding 维度（供检索对齐）',
  `model_config` JSON DEFAULT NULL COMMENT '预留参数（max_tokens/temperature/top_p 等）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_key_type` (`model_key`, `model_type`, `deleted`),
  KEY `idx_model_provider` (`provider_id`),
  KEY `idx_model_type` (`model_type`),
  KEY `idx_model_default` (`model_type`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型条目（第8阶段模型库）';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_foundation 数据库表创建完成！' AS message;
SHOW TABLES;
