-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_document
-- =====================================================

SET search_path TO kb_document;

-- =====================================================
-- kb_favorite 数据库 - 收藏功能
-- =====================================================

-- 用户收藏表
DROP TABLE IF EXISTS kb_user_favorite CASCADE;

CREATE TABLE kb_user_favorite (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  document_title VARCHAR(200) DEFAULT NULL,
  document_category_id BIGINT DEFAULT NULL,
  favorite_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_document UNIQUE (user_id, document_id, deleted)
);
CREATE INDEX IF NOT EXISTS idx_kb_user_favorite_idx_user_id ON kb_user_favorite (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_user_favorite_idx_document_id ON kb_user_favorite (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_user_favorite_idx_favorite_time ON kb_user_favorite (favorite_time);

SELECT 'kb_favorite 表创建完成！' AS message;
