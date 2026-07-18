-- 吸收 master-sql 中 canonical 缺失的结构（document_access 扩展列、通知模板表）
SET NAMES utf8mb4;

-- =====================================================
-- 1. kb_document.kb_document_access 扩展列 + 唯一约束
-- =====================================================
USE `kb_document`;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_access' AND COLUMN_NAME='category_id');
SET @sql = IF(@col_exists=0,
    'ALTER TABLE `kb_document_access` ADD COLUMN `category_id` BIGINT DEFAULT NULL COMMENT ''分类ID'' AFTER `document_title`',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_access' AND COLUMN_NAME='category_name');
SET @sql = IF(@col_exists=0,
    'ALTER TABLE `kb_document_access` ADD COLUMN `category_name` VARCHAR(100) DEFAULT NULL COMMENT ''分类名称'' AFTER `category_id`',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_access' AND COLUMN_NAME='ip_address');
SET @sql = IF(@col_exists=0,
    'ALTER TABLE `kb_document_access` ADD COLUMN `ip_address` VARCHAR(50) DEFAULT NULL COMMENT ''访问IP'' AFTER `access_time`',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_access' AND COLUMN_NAME='user_agent');
SET @sql = IF(@col_exists=0,
    'ALTER TABLE `kb_document_access` ADD COLUMN `user_agent` VARCHAR(500) DEFAULT NULL COMMENT ''用户代理'' AFTER `ip_address`',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_access' AND INDEX_NAME='idx_user_document');
SET @sql = IF(@idx_exists=0,
    'ALTER TABLE `kb_document_access` ADD UNIQUE KEY `idx_user_document` (`user_id`, `document_id`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. kb_foundation.kb_notification_template
-- =====================================================
USE `kb_foundation`;

CREATE TABLE IF NOT EXISTS `kb_notification_template` (
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

SELECT '007_schema_absorb_master 完成' AS message;
