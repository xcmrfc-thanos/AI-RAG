-- 对齐文档域表结构（kb_document 字段、tb_document_review 审核表）
SET NAMES utf8mb4;

USE `kb_document`;

-- =====================================================
-- 1. kb_document：补全实体字段
-- =====================================================

-- content_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='content_id');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `content_id` VARCHAR(64) DEFAULT NULL COMMENT ''MongoDB内容ID'' AFTER `summary`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- content_length
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='content_length');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `content_length` INT DEFAULT NULL COMMENT ''内容长度'' AFTER `content_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- document_type
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='document_type');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `document_type` TINYINT NOT NULL DEFAULT 1 COMMENT ''文档类型（1文章2文件）'' AFTER `content_length`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- file_path
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='file_path');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `file_path` VARCHAR(500) DEFAULT NULL COMMENT ''文件路径'' AFTER `document_type`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- file_size
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='file_size');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `file_size` BIGINT DEFAULT NULL COMMENT ''文件大小'' AFTER `file_path`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- file_extension
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='file_extension');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `file_extension` VARCHAR(20) DEFAULT NULL COMMENT ''文件扩展名'' AFTER `file_size`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mime_type
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='mime_type');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `mime_type` VARCHAR(100) DEFAULT NULL COMMENT ''MIME类型'' AFTER `file_extension`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- tags
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='tags');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `tags` VARCHAR(500) DEFAULT NULL COMMENT ''标签（逗号分隔）'' AFTER `team_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- is_recommend
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='is_recommend');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `is_recommend` TINYINT NOT NULL DEFAULT 0 COMMENT ''是否推荐'' AFTER `is_top`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- favorite_count（从 collect_count 迁移）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='favorite_count');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `favorite_count` INT NOT NULL DEFAULT 0 COMMENT ''收藏次数'' AFTER `like_count`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='collect_count');
SET @sql = IF(@col_exists>0,
    'UPDATE `kb_document` SET `favorite_count` = `collect_count` WHERE `favorite_count` = 0 AND `collect_count` > 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- source
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='source');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `source` TINYINT DEFAULT 1 COMMENT ''来源（1原创2转载3翻译）'' AFTER `cover_image`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- source_url
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='source_url');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `source_url` VARCHAR(500) DEFAULT NULL COMMENT ''来源URL'' AFTER `source`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sort
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='sort');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `sort` INT NOT NULL DEFAULT 0 COMMENT ''排序'' AFTER `allow_comment`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- auto_save_dismissed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='auto_save_dismissed');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `auto_save_dismissed` TINYINT NOT NULL DEFAULT 0 COMMENT ''自动保存草稿已确认'' AFTER `sort`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- remark
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='remark');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT ''备注'' AFTER `auto_save_dismissed`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- create_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='create_by');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `create_by` BIGINT DEFAULT NULL COMMENT ''创建人'' AFTER `updated_at`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- update_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='update_by');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document` ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人'' AFTER `create_by`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- content_length 从 word_count 回填
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='word_count');
SET @sql = IF(@col_exists>0,
    'UPDATE `kb_document` SET `content_length` = `word_count` WHERE `content_length` IS NULL AND `word_count` IS NOT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status：VARCHAR -> TINYINT
SET @col_type = (
    SELECT DATA_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND COLUMN_NAME='status'
);
SET @sql = IF(@col_type='varchar',
    'ALTER TABLE `kb_document` ADD COLUMN `status_int` TINYINT NOT NULL DEFAULT 0 COMMENT ''状态临时列''',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_type='varchar',
    'UPDATE `kb_document` SET `status_int` = CASE
        WHEN `status` = ''draft'' THEN 0
        WHEN `status` = ''published'' THEN 1
        WHEN `status` = ''archived'' THEN 2
        WHEN `status` IN (''pending'', ''pending_review'') THEN 3
        ELSE 0
    END',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND INDEX_NAME='idx_status');
SET @sql = IF(@col_type='varchar' AND @idx_exists>0, 'ALTER TABLE `kb_document` DROP INDEX `idx_status`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_type='varchar', 'ALTER TABLE `kb_document` DROP COLUMN `status`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_type='varchar',
    'ALTER TABLE `kb_document` CHANGE COLUMN `status_int` `status` TINYINT NOT NULL DEFAULT 0 COMMENT ''状态（0草稿1已发布2已归档3待审核）''',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx_exists=0, 'ALTER TABLE `kb_document` ADD KEY `idx_status` (`status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. tb_document_review：代码使用的审核表
-- =====================================================
CREATE TABLE IF NOT EXISTS `tb_document_review` (
  `id` BIGINT NOT NULL COMMENT '审核记录ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `reviewer_id` BIGINT DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  `review_result` TINYINT DEFAULT NULL COMMENT '审核结果：1通过2驳回，NULL待审核',
  `review_comment` TEXT DEFAULT NULL COMMENT '审核意见',
  `before_status` TINYINT DEFAULT NULL COMMENT '审核前状态',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间',
  `review_round` INT NOT NULL DEFAULT 1 COMMENT '审核轮次',
  `review_level` TINYINT NOT NULL DEFAULT 1 COMMENT '审核级别',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_reviewer_id` (`reviewer_id`),
  KEY `idx_review_result_created` (`review_result`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核记录表';

-- =====================================================
-- 3. 演示数据：文档 1000000000000000004 待审核任务
-- =====================================================
INSERT INTO `tb_document_review` (
  `id`, `document_id`, `reviewer_id`, `reviewer_name`, `review_result`,
  `review_comment`, `before_status`, `reviewed_at`, `review_round`, `review_level`, `created_at`
)
SELECT
  1300000000000000001, 1000000000000000004, NULL, NULL, NULL,
  NULL, 1, NULL, 1, 1, '2024-03-05 16:25:00'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `tb_document_review` WHERE `id` = 1300000000000000001);

UPDATE `kb_document`
SET `status` = 3
WHERE `id` = 1000000000000000004
  AND EXISTS (SELECT 1 FROM `tb_document_review` WHERE `document_id` = 1000000000000000004 AND `review_result` IS NULL);

SELECT '003_schema_align_document 执行完成' AS message;
