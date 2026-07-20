-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_document
-- =====================================================

SET search_path TO kb_document;

-- =====================================================
-- kb_document 数据库 - 文档管理服务
-- =====================================================

-- 文档分类表
DROP TABLE IF EXISTS kb_category CASCADE;

CREATE TABLE kb_category (
  id BIGINT NOT NULL,
  category_name VARCHAR(50) NOT NULL,
  category_code VARCHAR(50) DEFAULT NULL,
  parent_id BIGINT NOT NULL DEFAULT 0,
  category_icon VARCHAR(50) DEFAULT 'tech',
  description VARCHAR(500) DEFAULT NULL,
  sort INT NOT NULL DEFAULT 0,
  document_count INT NOT NULL DEFAULT 0,
  remark VARCHAR(500) DEFAULT NULL,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_kb_category_idx_parent_id ON kb_category (parent_id);
CREATE INDEX IF NOT EXISTS idx_kb_category_idx_category_code ON kb_category (category_code);

-- 文档标签表（与 Tag 实体 / TagMapper 对齐）
DROP TABLE IF EXISTS kb_tag CASCADE;

CREATE TABLE kb_tag (
  id BIGINT NOT NULL,
  tag_name VARCHAR(50) NOT NULL,
  tag_code VARCHAR(50) DEFAULT NULL,
  category_id BIGINT DEFAULT NULL,
  tag_type SMALLINT NOT NULL DEFAULT 1,
  color VARCHAR(20) DEFAULT '#1890ff',
  icon VARCHAR(50) DEFAULT NULL,
  doc_count INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 0,
  tag_color VARCHAR(20) DEFAULT '#1890ff',
  description VARCHAR(200) DEFAULT NULL,
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_tag_name UNIQUE (tag_name, deleted)
);
CREATE INDEX IF NOT EXISTS idx_kb_tag_idx_tag_code ON kb_tag (tag_code);

-- 文档表（与 Document 实体对齐；正文存 MongoDB，content 列保留兼容旧数据）
DROP TABLE IF EXISTS kb_document CASCADE;

CREATE TABLE kb_document (
  id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT DEFAULT NULL,
  content_id VARCHAR(64) DEFAULT NULL,
  content_length INT DEFAULT NULL,
  document_type SMALLINT NOT NULL DEFAULT 1,
  file_path VARCHAR(500) DEFAULT NULL,
  file_size BIGINT DEFAULT NULL,
  file_extension VARCHAR(20) DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  content TEXT,
  category_id BIGINT DEFAULT NULL,
  team_id BIGINT DEFAULT NULL,
  tags VARCHAR(500) DEFAULT NULL,
  author_id BIGINT NOT NULL,
  author_name VARCHAR(50) DEFAULT NULL,
  cover_image VARCHAR(500) DEFAULT NULL,
  source SMALLINT DEFAULT 1,
  source_url VARCHAR(500) DEFAULT NULL,
  status SMALLINT NOT NULL DEFAULT 0,
  is_public SMALLINT NOT NULL DEFAULT 1,
  is_top SMALLINT NOT NULL DEFAULT 0,
  is_recommend SMALLINT NOT NULL DEFAULT 0,
  allow_comment SMALLINT NOT NULL DEFAULT 1,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  sort INT NOT NULL DEFAULT 0,
  auto_save_dismissed SMALLINT NOT NULL DEFAULT 0,
  remark VARCHAR(500) DEFAULT NULL,
  version INT NOT NULL DEFAULT 1,
  word_count INT DEFAULT NULL,
  publish_time TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_title ON kb_document (title);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_category_id ON kb_document (category_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_team_id ON kb_document (team_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_author_id ON kb_document (author_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_status ON kb_document (status);
CREATE INDEX IF NOT EXISTS idx_kb_document_idx_publish_time ON kb_document (publish_time);
-- SKIPPED FULLTEXT ft_content ON kb_document (title, content, summary); -- use tsvector/GIN in app if needed

-- 文档标签关联表
DROP TABLE IF EXISTS kb_document_tag CASCADE;

CREATE TABLE kb_document_tag (
  id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_document_tag UNIQUE (document_id, tag_id)
);

-- 文档版本表（与 DocumentVersion 实体对齐）
DROP TABLE IF EXISTS kb_document_version CASCADE;

CREATE TABLE kb_document_version (
  id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  version INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT DEFAULT NULL,
  change_description VARCHAR(500) DEFAULT NULL,
  change_size BIGINT DEFAULT NULL,
  operator_id BIGINT DEFAULT NULL,
  operator_name VARCHAR(50) DEFAULT NULL,
  change_log VARCHAR(500) DEFAULT NULL,
  author_id BIGINT DEFAULT NULL,
  author_name VARCHAR(50) DEFAULT NULL,
  is_current SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_doc_version UNIQUE (document_id, version)
);
CREATE INDEX IF NOT EXISTS idx_kb_document_version_idx_document_id ON kb_document_version (document_id);

-- 文档评论表（与 Comment 实体对齐）
DROP TABLE IF EXISTS kb_comment CASCADE;

CREATE TABLE kb_comment (
  id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(50) DEFAULT NULL,
  user_avatar VARCHAR(500) DEFAULT NULL,
  parent_id BIGINT NOT NULL DEFAULT 0,
  root_id BIGINT NOT NULL DEFAULT 0,
  reply_to_id BIGINT DEFAULT NULL,
  reply_to_name VARCHAR(50) DEFAULT NULL,
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_kb_comment_idx_document_id ON kb_comment (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_comment_idx_user_id ON kb_comment (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_comment_idx_parent_id ON kb_comment (parent_id);

-- 文档审核记录表（代码使用 tb_document_review）
DROP TABLE IF EXISTS tb_document_review CASCADE;

CREATE TABLE tb_document_review (
  id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  reviewer_id BIGINT DEFAULT NULL,
  reviewer_name VARCHAR(50) DEFAULT NULL,
  review_result SMALLINT DEFAULT NULL,
  review_comment TEXT DEFAULT NULL,
  before_status SMALLINT DEFAULT NULL,
  reviewed_at TIMESTAMP DEFAULT NULL,
  review_round INT NOT NULL DEFAULT 1,
  review_level SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_tb_document_review_idx_document_id ON tb_document_review (document_id);
CREATE INDEX IF NOT EXISTS idx_tb_document_review_idx_reviewer_id ON tb_document_review (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_tb_document_review_idx_review_result_created ON tb_document_review (review_result, created_at);

-- 点赞表
DROP TABLE IF EXISTS kb_like CASCADE;

CREATE TABLE kb_like (
  id BIGINT NOT NULL,
  target_id BIGINT NOT NULL,
  target_type SMALLINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_target_user_type UNIQUE (target_id, user_id, target_type)
);
CREATE INDEX IF NOT EXISTS idx_kb_like_idx_target_id ON kb_like (target_id);
CREATE INDEX IF NOT EXISTS idx_kb_like_idx_user_id ON kb_like (user_id);

-- 文档访问记录表
DROP TABLE IF EXISTS kb_document_access CASCADE;

CREATE TABLE kb_document_access (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  document_title VARCHAR(200) DEFAULT NULL,
  category_id BIGINT DEFAULT NULL,
  category_name VARCHAR(100) DEFAULT NULL,
  access_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT idx_user_document UNIQUE (user_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_document_access_idx_user_id ON kb_document_access (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_access_idx_document_id ON kb_document_access (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_access_idx_access_time ON kb_document_access (access_time);

-- 文档分享表
DROP TABLE IF EXISTS kb_document_share CASCADE;

CREATE TABLE kb_document_share (
  id BIGINT NOT NULL,
  share_id VARCHAR(64) NOT NULL,
  document_id BIGINT NOT NULL,
  title VARCHAR(200) DEFAULT NULL,
  share_type SMALLINT NOT NULL DEFAULT 1,
  share_code VARCHAR(32) DEFAULT NULL,
  expire_type SMALLINT NOT NULL DEFAULT 1,
  expire_time TIMESTAMP DEFAULT NULL,
  access_limit INT NOT NULL DEFAULT 0,
  access_count INT NOT NULL DEFAULT 0,
  require_password SMALLINT NOT NULL DEFAULT 0,
  password VARCHAR(128) DEFAULT NULL,
  sharer_id BIGINT NOT NULL,
  sharer_name VARCHAR(50) DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  status SMALLINT NOT NULL DEFAULT 0,
  share_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_share_id UNIQUE (share_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_document_share_idx_document_id ON kb_document_share (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_share_idx_sharer_id ON kb_document_share (sharer_id);

-- 文件元数据表
DROP TABLE IF EXISTS kb_file_metadata CASCADE;

CREATE TABLE kb_file_metadata (
  id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_extension VARCHAR(20) DEFAULT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_type VARCHAR(100) DEFAULT NULL,
  storage_path VARCHAR(500) NOT NULL,
  access_url VARCHAR(500) DEFAULT NULL,
  file_category VARCHAR(50) DEFAULT 'other',
  uploader_id BIGINT NOT NULL,
  uploader_name VARCHAR(50) DEFAULT NULL,
  file_md5 VARCHAR(64) DEFAULT NULL,
  file_sha256 VARCHAR(128) DEFAULT NULL,
  width INT DEFAULT NULL,
  height INT DEFAULT NULL,
  thumbnail_url VARCHAR(500) DEFAULT NULL,
  is_public SMALLINT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  last_access_time TIMESTAMP DEFAULT NULL,
  upload_status VARCHAR(20) DEFAULT 'completed',
  error_message VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_idx_uploader_id ON kb_file_metadata (uploader_id);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_idx_file_category ON kb_file_metadata (file_category);

SELECT 'kb_document 数据库表创建完成！' AS message;
