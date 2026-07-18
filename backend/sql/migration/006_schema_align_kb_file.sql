-- 对齐 kb-file 服务实体与 kb_file 表（代码原为 tb_file，schema 列也不一致）
SET NAMES utf8mb4;

USE `kb_file`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `kb_file`;

CREATE TABLE `kb_file` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `stored_name` VARCHAR(255) NOT NULL COMMENT '存储文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件相对路径',
  `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
  `file_type` VARCHAR(50) NOT NULL COMMENT '文件类型：DOCUMENT/IMAGE/VIDEO/AUDIO/OTHER',
  `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `file_hash` VARCHAR(128) DEFAULT NULL COMMENT '文件哈希（秒传）',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'S3' COMMENT '存储类型',
  `bucket_name` VARCHAR(100) DEFAULT NULL COMMENT '存储桶名称',
  `uploader_id` BIGINT NOT NULL COMMENT '上传者ID',
  `access_level` TINYINT NOT NULL DEFAULT 0 COMMENT '访问级别：0私有 1团队 2公开',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0删除 1正常',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  `version` INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  `duration` INT DEFAULT NULL COMMENT '时长（秒）',
  `resolution` VARCHAR(32) DEFAULT NULL COMMENT '分辨率',
  `bitrate` INT DEFAULT NULL COMMENT '码率（kbps）',
  `transcode_status` VARCHAR(20) DEFAULT NULL COMMENT '转码状态',
  `hls_path` VARCHAR(500) DEFAULT NULL COMMENT 'HLS路径',
  `thumbnail_path` VARCHAR(500) DEFAULT NULL COMMENT '缩略图路径',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_hash` (`file_hash`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_access_level` (`access_level`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT '006_schema_align_kb_file 完成' AS message;
