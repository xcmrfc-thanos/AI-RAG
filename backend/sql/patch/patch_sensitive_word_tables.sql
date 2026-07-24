-- =====================================================
-- 已有库幂等补丁：敏感词 L1 / L1.5 表
-- 说明：CREATE IF NOT EXISTS 仅建表；列对齐见文末 ALTER（幂等）
-- =====================================================
SET NAMES utf8mb4;
USE `kb_foundation`;

-- L1 词库（内存 AC / DFA 扫描）
CREATE TABLE IF NOT EXISTS `kb_sensitive_word` (
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

-- L1.5 正则规则（手机号/身份证等）
CREATE TABLE IF NOT EXISTS `kb_sensitive_regex` (
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

-- L1.5 谐音/形近映射（归一化阶段使用）
CREATE TABLE IF NOT EXISTS `kb_sensitive_homophone` (
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

-- 已有库：谐音表补齐 BaseEntity 审计列（幂等）
SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'kb_sensitive_homophone' AND COLUMN_NAME = 'create_by'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `kb_sensitive_homophone`
     ADD COLUMN `create_by` BIGINT DEFAULT NULL COMMENT ''创建人ID'' AFTER `updated_at`,
     ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人ID'' AFTER `create_by`',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
