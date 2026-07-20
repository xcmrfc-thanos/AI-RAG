-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_file
-- =====================================================

SET search_path TO kb_file;

-- =====================================================
-- kb_file 数据库 - 文件服务
-- =====================================================

-- 文件信息表（与 kb-file FileInfo 实体一致）
DROP TABLE IF EXISTS kb_file CASCADE;

CREATE TABLE kb_file (
  id BIGINT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  file_hash VARCHAR(128) DEFAULT NULL,
  storage_type VARCHAR(20) NOT NULL DEFAULT 'S3',
  bucket_name VARCHAR(100) DEFAULT NULL,
  uploader_id BIGINT NOT NULL,
  access_level SMALLINT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  deleted SMALLINT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 0,
  duration INT DEFAULT NULL,
  resolution VARCHAR(32) DEFAULT NULL,
  bitrate INT DEFAULT NULL,
  transcode_status VARCHAR(20) DEFAULT NULL,
  hls_path VARCHAR(500) DEFAULT NULL,
  thumbnail_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_uploader_id ON kb_file (uploader_id);
CREATE INDEX IF NOT EXISTS idx_file_hash ON kb_file (file_hash);
CREATE INDEX IF NOT EXISTS idx_file_type ON kb_file (file_type);
CREATE INDEX IF NOT EXISTS idx_access_level ON kb_file (access_level);
CREATE INDEX IF NOT EXISTS idx_created_at ON kb_file (created_at);

SELECT 'kb_file 数据库表创建完成！' AS message;
