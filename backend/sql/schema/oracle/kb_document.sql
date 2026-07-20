-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_document
-- 以 SYSTEM 装载时使用限定名 kb_document.table
-- =====================================================

-- =====================================================
-- kb_document 数据库 - 文档管理服务
-- =====================================================

-- 文档分类表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_category CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_category (
  id NUMBER(19) NOT NULL,
  category_name VARCHAR2(50) NOT NULL,
  category_code VARCHAR2(50),
  parent_id NUMBER(19) DEFAULT 0 NOT NULL,
  category_icon VARCHAR2(50) DEFAULT 'tech',
  description VARCHAR2(500),
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  document_count NUMBER(10) DEFAULT 0 NOT NULL,
  remark VARCHAR2(500),
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_category_idx_parent_id ON kb_document.kb_category (parent_id);
CREATE INDEX idx_kb_category_idx_category_code ON kb_document.kb_category (category_code);

-- 文档标签表（与 Tag 实体 / TagMapper 对齐）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_tag CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_tag (
  id NUMBER(19) NOT NULL,
  tag_name VARCHAR2(50) NOT NULL,
  tag_code VARCHAR2(50),
  category_id NUMBER(19),
  tag_type NUMBER(3) DEFAULT 1 NOT NULL,
  color VARCHAR2(20) DEFAULT '#1890ff',
  icon VARCHAR2(50),
  doc_count NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  version NUMBER(10) DEFAULT 0 NOT NULL,
  tag_color VARCHAR2(20) DEFAULT '#1890ff',
  description VARCHAR2(200),
  use_count NUMBER(10) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_tag_name UNIQUE (tag_name, deleted)
);
CREATE INDEX idx_kb_tag_idx_tag_code ON kb_document.kb_tag (tag_code);

-- 文档表（与 Document 实体对齐；正文存 MongoDB，content 列保留兼容旧数据）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_document CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_document (
  id NUMBER(19) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  summary CLOB,
  content_id VARCHAR2(64),
  content_length NUMBER(10),
  document_type NUMBER(3) DEFAULT 1 NOT NULL,
  file_path VARCHAR2(500),
  file_size NUMBER(19),
  file_extension VARCHAR2(20),
  mime_type VARCHAR2(100),
  content CLOB,
  category_id NUMBER(19),
  team_id NUMBER(19),
  tags VARCHAR2(500),
  author_id NUMBER(19) NOT NULL,
  author_name VARCHAR2(50),
  cover_image VARCHAR2(500),
  source NUMBER(3) DEFAULT 1,
  source_url VARCHAR2(500),
  status NUMBER(3) DEFAULT 0 NOT NULL,
  is_public NUMBER(3) DEFAULT 1 NOT NULL,
  is_top NUMBER(3) DEFAULT 0 NOT NULL,
  is_recommend NUMBER(3) DEFAULT 0 NOT NULL,
  allow_comment NUMBER(3) DEFAULT 1 NOT NULL,
  view_count NUMBER(10) DEFAULT 0 NOT NULL,
  like_count NUMBER(10) DEFAULT 0 NOT NULL,
  favorite_count NUMBER(10) DEFAULT 0 NOT NULL,
  comment_count NUMBER(10) DEFAULT 0 NOT NULL,
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  auto_save_dismissed NUMBER(3) DEFAULT 0 NOT NULL,
  remark VARCHAR2(500),
  version NUMBER(10) DEFAULT 1 NOT NULL,
  word_count NUMBER(10),
  publish_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_document_idx_title ON kb_document.kb_document (title);
CREATE INDEX idx_kb_document_idx_category_id ON kb_document.kb_document (category_id);
CREATE INDEX idx_kb_document_idx_team_id ON kb_document.kb_document (team_id);
CREATE INDEX idx_kb_document_idx_author_id ON kb_document.kb_document (author_id);
CREATE INDEX idx_kb_document_idx_status ON kb_document.kb_document (status);
CREATE INDEX idx_kb_document_idx_publish_time ON kb_document.kb_document (publish_time);
-- SKIPPED FULLTEXT ft_content ON kb_document.kb_document (title, content, summary); -- use Oracle Text if needed

-- 文档标签关联表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_document_tag CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_document_tag (
  id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  tag_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_document_tag UNIQUE (document_id, tag_id)
);

-- 文档版本表（与 DocumentVersion 实体对齐）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_document_version CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_document_version (
  id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  version NUMBER(10) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  content CLOB NOT NULL,
  summary CLOB,
  change_description VARCHAR2(500),
  change_size NUMBER(19),
  operator_id NUMBER(19),
  operator_name VARCHAR2(50),
  change_log VARCHAR2(500),
  author_id NUMBER(19),
  author_name VARCHAR2(50),
  is_current NUMBER(3) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_doc_version UNIQUE (document_id, version)
);
CREATE INDEX idx_kb_document_version_idx_document_id ON kb_document.kb_document_version (document_id);

-- 文档评论表（与 Comment 实体对齐）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_comment CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_comment (
  id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  content CLOB NOT NULL,
  user_id NUMBER(19) NOT NULL,
  user_name VARCHAR2(50),
  user_avatar VARCHAR2(500),
  parent_id NUMBER(19) DEFAULT 0 NOT NULL,
  root_id NUMBER(19) DEFAULT 0 NOT NULL,
  reply_to_id NUMBER(19),
  reply_to_name VARCHAR2(50),
  like_count NUMBER(10) DEFAULT 0 NOT NULL,
  reply_count NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_comment_idx_document_id ON kb_document.kb_comment (document_id);
CREATE INDEX idx_kb_comment_idx_user_id ON kb_document.kb_comment (user_id);
CREATE INDEX idx_kb_comment_idx_parent_id ON kb_document.kb_comment (parent_id);

-- 文档审核记录表（代码使用 tb_document_review）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.tb_document_review CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.tb_document_review (
  id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  reviewer_id NUMBER(19),
  reviewer_name VARCHAR2(50),
  review_result NUMBER(3),
  review_comment CLOB,
  before_status NUMBER(3),
  reviewed_at TIMESTAMP,
  review_round NUMBER(10) DEFAULT 1 NOT NULL,
  review_level NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_tb_document_review_idx_document_id ON kb_document.tb_document_review (document_id);
CREATE INDEX idx_tb_document_review_idx_reviewer_id ON kb_document.tb_document_review (reviewer_id);
CREATE INDEX idx_tb_document_review_idx_review_result_created ON kb_document.tb_document_review (review_result, created_at);

-- 点赞表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_like CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_like (
  id NUMBER(19) NOT NULL,
  target_id NUMBER(19) NOT NULL,
  target_type NUMBER(3) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_target_user_type UNIQUE (target_id, user_id, target_type)
);
CREATE INDEX idx_kb_like_idx_target_id ON kb_document.kb_like (target_id);
CREATE INDEX idx_kb_like_idx_user_id ON kb_document.kb_like (user_id);

-- 文档访问记录表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_document_access CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_document_access (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  document_title VARCHAR2(200),
  category_id NUMBER(19),
  category_name VARCHAR2(100),
  access_time TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  ip_address VARCHAR2(50),
  user_agent VARCHAR2(500),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  created_by NUMBER(19),
  updated_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT idx_user_document UNIQUE (user_id, document_id)
);
CREATE INDEX idx_kb_document_access_idx_user_id ON kb_document.kb_document_access (user_id);
CREATE INDEX idx_kb_document_access_idx_document_id ON kb_document.kb_document_access (document_id);
CREATE INDEX idx_kb_document_access_idx_access_time ON kb_document.kb_document_access (access_time);

-- 文档分享表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_document_share CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_document_share (
  id NUMBER(19) NOT NULL,
  share_id VARCHAR2(64) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  title VARCHAR2(200),
  share_type NUMBER(3) DEFAULT 1 NOT NULL,
  share_code VARCHAR2(32),
  expire_type NUMBER(3) DEFAULT 1 NOT NULL,
  expire_time TIMESTAMP,
  access_limit NUMBER(10) DEFAULT 0 NOT NULL,
  access_count NUMBER(10) DEFAULT 0 NOT NULL,
  require_password NUMBER(3) DEFAULT 0 NOT NULL,
  password VARCHAR2(128),
  sharer_id NUMBER(19) NOT NULL,
  sharer_name VARCHAR2(50),
  description VARCHAR2(500),
  status NUMBER(3) DEFAULT 0 NOT NULL,
  share_time TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_share_id UNIQUE (share_id)
);
CREATE INDEX idx_kb_document_share_idx_document_id ON kb_document.kb_document_share (document_id);
CREATE INDEX idx_kb_document_share_idx_sharer_id ON kb_document.kb_document_share (sharer_id);

-- 文件元数据表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_file_metadata CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_file_metadata (
  id NUMBER(19) NOT NULL,
  file_name VARCHAR2(255) NOT NULL,
  original_file_name VARCHAR2(255) NOT NULL,
  file_extension VARCHAR2(20),
  file_size NUMBER(19) DEFAULT 0 NOT NULL,
  content_type VARCHAR2(100),
  storage_path VARCHAR2(500) NOT NULL,
  access_url VARCHAR2(500),
  file_category VARCHAR2(50) DEFAULT 'other',
  uploader_id NUMBER(19) NOT NULL,
  uploader_name VARCHAR2(50),
  file_md5 VARCHAR2(64),
  file_sha256 VARCHAR2(128),
  width NUMBER(10),
  height NUMBER(10),
  thumbnail_url VARCHAR2(500),
  is_public NUMBER(3) DEFAULT 0 NOT NULL,
  download_count NUMBER(10) DEFAULT 0 NOT NULL,
  last_access_time TIMESTAMP,
  upload_status VARCHAR2(20) DEFAULT 'completed',
  error_message VARCHAR2(500),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_file_metadata_idx_uploader_id ON kb_document.kb_file_metadata (uploader_id);
CREATE INDEX idx_kb_file_metadata_idx_file_category ON kb_document.kb_file_metadata (file_category);

SELECT 'kb_document 数据库表创建完成！' AS message FROM dual;