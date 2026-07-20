-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_file
-- 以 SYSTEM 装载时使用限定名 kb_file.table
-- =====================================================

-- =====================================================
-- kb_file 数据库 - 文件服务
-- =====================================================

-- 文件信息表（与 kb-file FileInfo 实体一致）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_file.kb_file CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_file.kb_file (
  id NUMBER(19) NOT NULL,
  original_name VARCHAR2(255) NOT NULL,
  stored_name VARCHAR2(255) NOT NULL,
  file_path VARCHAR2(500) NOT NULL,
  file_size NUMBER(19) NOT NULL,
  file_type VARCHAR2(50) NOT NULL,
  mime_type VARCHAR2(100),
  file_hash VARCHAR2(128),
  storage_type VARCHAR2(20) DEFAULT 'S3' NOT NULL,
  bucket_name VARCHAR2(100),
  uploader_id NUMBER(19) NOT NULL,
  access_level NUMBER(3) DEFAULT 0 NOT NULL,
  download_count NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  version NUMBER(10) DEFAULT 0 NOT NULL,
  duration NUMBER(10),
  resolution VARCHAR2(32),
  bitrate NUMBER(10),
  transcode_status VARCHAR2(20),
  hls_path VARCHAR2(500),
  thumbnail_path VARCHAR2(500),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_file_idx_uploader_id ON kb_file.kb_file (uploader_id);
CREATE INDEX idx_kb_file_idx_file_hash ON kb_file.kb_file (file_hash);
CREATE INDEX idx_kb_file_idx_file_type ON kb_file.kb_file (file_type);
CREATE INDEX idx_kb_file_idx_access_level ON kb_file.kb_file (access_level);
CREATE INDEX idx_kb_file_idx_created_at ON kb_file.kb_file (created_at);

SELECT 'kb_file 数据库表创建完成！' AS message FROM dual;