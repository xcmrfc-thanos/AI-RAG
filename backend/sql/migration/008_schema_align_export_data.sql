-- 008: 对齐 master export 数据结构，便于真实数据导入
SET NAMES utf8mb4;

-- kb_permission 补充 create_by/update_by（export 含这两列）
USE `kb_user`;
SET @db = DATABASE();
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'kb_permission' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@exists = 0,
  'ALTER TABLE `kb_permission` ADD COLUMN `create_by` BIGINT DEFAULT NULL COMMENT ''创建人'' AFTER `deleted`, ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人'' AFTER `create_by`',
  'SELECT ''kb_permission.create_by exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- kb_search_history 补充 export 字段
USE `kb_intelligence`;
SET @db = DATABASE();
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'kb_search_history' AND COLUMN_NAME = 'search_type');
SET @sql = IF(@exists = 0,
  'ALTER TABLE `kb_search_history` ADD COLUMN `search_type` VARCHAR(20) NOT NULL DEFAULT ''document'' COMMENT ''搜索类型'' AFTER `search_count`, ADD COLUMN `result_count` INT DEFAULT 0 COMMENT ''结果数量'' AFTER `search_type`, ADD COLUMN `search_params` JSON DEFAULT NULL COMMENT ''搜索参数'' AFTER `result_count`',
  'SELECT ''kb_search_history.search_type exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- kb_user_favorite 补充 create_by/update_by
USE `kb_document`;
SET @db = DATABASE();
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'kb_user_favorite' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@exists = 0,
  'ALTER TABLE `kb_user_favorite` ADD COLUMN `create_by` BIGINT DEFAULT NULL COMMENT ''创建人'' AFTER `deleted`, ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人'' AFTER `create_by`',
  'SELECT ''kb_user_favorite.create_by exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '008_schema_align_export_data applied' AS message;
