-- =====================================================
-- kb_file 数据库 - 文件服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_file`;
SET FOREIGN_KEY_CHECKS = 0;

-- 文件信息表
DROP TABLE IF EXISTS `kb_file`;
CREATE TABLE `kb_file` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
  `file_type` VARCHAR(50) NOT NULL COMMENT '文件类型',
  `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'local' COMMENT '存储类型',
  `upload_user_id` BIGINT NOT NULL COMMENT '上传用户ID',
  `upload_user_name` VARCHAR(50) DEFAULT NULL COMMENT '上传用户姓名（冗余字段）',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
  `related_id` BIGINT DEFAULT NULL COMMENT '关联ID',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_upload_user_id` (`upload_user_id`),
  KEY `idx_related` (`related_type`, `related_id`),
  KEY `idx_file_type` (`file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_file 数据库表创建完成！' AS message;
