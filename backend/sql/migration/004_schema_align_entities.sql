-- 对齐实体/Mapper 与 kb_* 表结构：补列、建缺表、统一命名
SET NAMES utf8mb4;

USE `kb_document`;

-- =====================================================
-- 1. kb_tag：对齐 TagMapper / Tag 实体
-- =====================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='tag_code');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `tag_code` VARCHAR(50) DEFAULT NULL COMMENT ''标签编码'' AFTER `tag_name`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='category_id');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `category_id` BIGINT DEFAULT NULL COMMENT ''所属分类ID'' AFTER `tag_code`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='tag_type');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `tag_type` TINYINT NOT NULL DEFAULT 1 COMMENT ''标签类型'' AFTER `category_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='color');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `color` VARCHAR(20) DEFAULT ''#1890ff'' COMMENT ''颜色'' AFTER `tag_type`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='icon');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `icon` VARCHAR(50) DEFAULT NULL COMMENT ''图标'' AFTER `color`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='doc_count');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `doc_count` INT NOT NULL DEFAULT 0 COMMENT ''文档数量'' AFTER `icon`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='status');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `status` TINYINT NOT NULL DEFAULT 1 COMMENT ''状态'' AFTER `doc_count`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='version');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `version` INT NOT NULL DEFAULT 0 COMMENT ''版本号'' AFTER `status`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_tag' AND COLUMN_NAME='update_by');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_tag` ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人'' AFTER `create_by`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `kb_tag` SET `color` = `tag_color` WHERE (`color` IS NULL OR `color` = '#1890ff') AND `tag_color` IS NOT NULL;
UPDATE `kb_tag` SET `doc_count` = `use_count` WHERE `doc_count` = 0 AND `use_count` > 0;
UPDATE `kb_tag` SET `tag_code` = LOWER(REPLACE(REPLACE(`tag_name`, ' ', '_'), '.', '')) WHERE `tag_code` IS NULL OR `tag_code` = '';

-- =====================================================
-- 2. kb_comment：补 BaseEntity 字段
-- =====================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_comment' AND COLUMN_NAME='root_id');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_comment` ADD COLUMN `root_id` BIGINT NOT NULL DEFAULT 0 COMMENT ''根评论ID'' AFTER `parent_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_comment' AND COLUMN_NAME='create_by');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_comment` ADD COLUMN `create_by` BIGINT DEFAULT NULL COMMENT ''创建人'' AFTER `updated_at`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_comment' AND COLUMN_NAME='update_by');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_comment` ADD COLUMN `update_by` BIGINT DEFAULT NULL COMMENT ''更新人'' AFTER `create_by`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `kb_comment` SET `root_id` = `parent_id` WHERE `parent_id` > 0 AND `root_id` = 0;

-- =====================================================
-- 3. kb_document_version：对齐 DocumentVersionMapper
-- =====================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_version' AND COLUMN_NAME='summary');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document_version` ADD COLUMN `summary` TEXT DEFAULT NULL COMMENT ''文档摘要'' AFTER `content`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_version' AND COLUMN_NAME='change_description');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document_version` ADD COLUMN `change_description` VARCHAR(500) DEFAULT NULL COMMENT ''变更说明'' AFTER `summary`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_version' AND COLUMN_NAME='change_size');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document_version` ADD COLUMN `change_size` BIGINT DEFAULT NULL COMMENT ''变更大小'' AFTER `change_description`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_version' AND COLUMN_NAME='operator_id');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document_version` ADD COLUMN `operator_id` BIGINT DEFAULT NULL COMMENT ''操作人ID'' AFTER `change_size`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='kb_document' AND TABLE_NAME='kb_document_version' AND COLUMN_NAME='operator_name');
SET @sql = IF(@col_exists=0, 'ALTER TABLE `kb_document_version` ADD COLUMN `operator_name` VARCHAR(50) DEFAULT NULL COMMENT ''操作人姓名'' AFTER `operator_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `kb_document_version` SET `change_description` = `change_log` WHERE `change_description` IS NULL AND `change_log` IS NOT NULL;
UPDATE `kb_document_version` SET `operator_id` = `author_id` WHERE `operator_id` IS NULL AND `author_id` IS NOT NULL;
UPDATE `kb_document_version` SET `operator_name` = `author_name` WHERE `operator_name` IS NULL AND `author_name` IS NOT NULL;

-- =====================================================
-- 4. 缺表：点赞 / 访问 / 分享 / 文件元数据
-- =====================================================
CREATE TABLE IF NOT EXISTS `kb_like` (
  `id` BIGINT NOT NULL COMMENT '点赞ID',
  `target_id` BIGINT NOT NULL COMMENT '目标ID',
  `target_type` TINYINT NOT NULL COMMENT '目标类型：1文档2评论',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_user_type` (`target_id`, `user_id`, `target_type`),
  KEY `idx_target_id` (`target_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞表';

CREATE TABLE IF NOT EXISTS `kb_document_access` (
  `id` BIGINT NOT NULL COMMENT '访问记录ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `access_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `updated_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_access_time` (`access_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档访问记录表';

CREATE TABLE IF NOT EXISTS `kb_document_share` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `share_id` VARCHAR(64) NOT NULL COMMENT '分享标识',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '分享标题',
  `share_type` TINYINT NOT NULL DEFAULT 1 COMMENT '分享类型',
  `share_code` VARCHAR(32) DEFAULT NULL COMMENT '分享码',
  `expire_type` TINYINT NOT NULL DEFAULT 1 COMMENT '有效期类型',
  `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
  `access_limit` INT NOT NULL DEFAULT 0 COMMENT '访问次数限制',
  `access_count` INT NOT NULL DEFAULT 0 COMMENT '已访问次数',
  `require_password` TINYINT NOT NULL DEFAULT 0 COMMENT '是否需要密码',
  `password` VARCHAR(128) DEFAULT NULL COMMENT '访问密码',
  `sharer_id` BIGINT NOT NULL COMMENT '分享人ID',
  `sharer_name` VARCHAR(50) DEFAULT NULL COMMENT '分享人名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分享描述',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态',
  `share_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分享时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_id` (`share_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_sharer_id` (`sharer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分享表';

CREATE TABLE IF NOT EXISTS `kb_file_metadata` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '存储文件名',
  `original_file_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '扩展名',
  `file_size` BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小',
  `content_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `storage_path` VARCHAR(500) NOT NULL COMMENT '存储路径',
  `access_url` VARCHAR(500) DEFAULT NULL COMMENT '访问URL',
  `file_category` VARCHAR(50) DEFAULT 'other' COMMENT '文件分类',
  `uploader_id` BIGINT NOT NULL COMMENT '上传用户ID',
  `uploader_name` VARCHAR(50) DEFAULT NULL COMMENT '上传用户名称',
  `file_md5` VARCHAR(64) DEFAULT NULL COMMENT 'MD5',
  `file_sha256` VARCHAR(128) DEFAULT NULL COMMENT 'SHA256',
  `width` INT DEFAULT NULL COMMENT '图片宽度',
  `height` INT DEFAULT NULL COMMENT '图片高度',
  `thumbnail_url` VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `last_access_time` DATETIME DEFAULT NULL COMMENT '最后访问时间',
  `upload_status` VARCHAR(20) DEFAULT 'completed' COMMENT '上传状态',
  `error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_category` (`file_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件元数据表';

USE `kb_foundation`;

-- =====================================================
-- 5. document_status 字典与 DocumentStatus 枚举对齐
-- =====================================================
UPDATE `kb_dict`
SET `description` = '文档状态：草稿/已发布/已归档/待审核'
WHERE `dict_code` = 'document_status';

UPDATE `kb_dict_data` SET `dict_label` = '已发布', `dict_value` = '1', `dict_sort` = 2, `css_class` = 'badge-green'
WHERE `id` = 3100000000000000002;

UPDATE `kb_dict_data` SET `dict_label` = '已归档', `dict_value` = '2', `dict_sort` = 3, `css_class` = 'badge-blue'
WHERE `id` = 3100000000000000003;

UPDATE `kb_dict_data` SET `dict_label` = '待审核', `dict_value` = '3', `dict_sort` = 4, `css_class` = 'badge-yellow'
WHERE `id` = 3100000000000000004;

SELECT '004_schema_align_entities 执行完成' AS message;
