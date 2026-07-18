-- 对齐代码与数据库表结构（kb_user.remark、kb_category.category_code、Token 黑名单）
SET NAMES utf8mb4;

USE `kb_user`;

-- kb_user 备注字段（UserMapper 查询需要）
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'kb_user' AND TABLE_NAME = 'kb_user' AND COLUMN_NAME = 'remark'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `kb_user` ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT ''备注'' AFTER `position`',
    'SELECT ''kb_user.remark 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Token 黑名单表（登出/刷新 Token 使用）
CREATE TABLE IF NOT EXISTS `tb_token_blacklist` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token哈希',
    `expire_time` DATETIME NOT NULL COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_token_hash` (`token_hash`),
    KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';

USE `kb_document`;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'kb_document' AND TABLE_NAME = 'kb_category' AND COLUMN_NAME = 'category_code'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `kb_category` ADD COLUMN `category_code` VARCHAR(50) DEFAULT NULL COMMENT ''分类编码'' AFTER `category_name`',
    'SELECT ''kb_category.category_code 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'kb_document' AND TABLE_NAME = 'kb_category' AND COLUMN_NAME = 'remark'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `kb_category` ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT ''备注'' AFTER `document_count`',
    'SELECT ''kb_category.remark 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为已有分类补默认编码
UPDATE `kb_category`
SET `category_code` = CONCAT('cat_', `id`)
WHERE (`category_code` IS NULL OR `category_code` = '') AND `deleted` = 0;

SELECT 'schema align 001 完成' AS message;
