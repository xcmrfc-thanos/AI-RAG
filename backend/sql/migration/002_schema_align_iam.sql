-- 对齐 IAM 域表结构（kb_user 邮箱验证、kb_team 树形字段）
SET NAMES utf8mb4;

USE `kb_user`;

-- kb_user：MyBatis-Plus 自动查询字段
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_user' AND COLUMN_NAME='email_verified');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_user` ADD COLUMN `email_verified` TINYINT NOT NULL DEFAULT 1 COMMENT ''邮箱是否已验证'' AFTER `email`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_user' AND COLUMN_NAME='activation_token');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_user` ADD COLUMN `activation_token` VARCHAR(128) DEFAULT NULL COMMENT ''账户激活令牌'' AFTER `email_verified`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_user' AND COLUMN_NAME='activation_token_expiry');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_user` ADD COLUMN `activation_token_expiry` DATETIME DEFAULT NULL COMMENT ''激活令牌过期时间'' AFTER `activation_token`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- kb_team：团队树查询字段
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_team' AND COLUMN_NAME='level');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_team` ADD COLUMN `level` INT NOT NULL DEFAULT 1 COMMENT ''团队层级'' AFTER `parent_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_team' AND COLUMN_NAME='path');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_team` ADD COLUMN `path` VARCHAR(500) DEFAULT NULL COMMENT ''团队路径'' AFTER `level`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_team' AND COLUMN_NAME='member_count');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_team` ADD COLUMN `member_count` INT NOT NULL DEFAULT 0 COMMENT ''成员数量'' AFTER `path`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_user' AND TABLE_NAME='kb_team' AND COLUMN_NAME='doc_count');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_team` ADD COLUMN `doc_count` INT NOT NULL DEFAULT 0 COMMENT ''文档数量'' AFTER `member_count`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `kb_user` SET `email_verified` = 1 WHERE `email_verified` IS NULL;

SELECT 'schema align 002 完成' AS message;
