-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_document
-- 以 SYSTEM 装载时使用限定名 kb_document.table
-- =====================================================

-- =====================================================
-- kb_favorite 数据库 - 收藏功能
-- =====================================================

-- 用户收藏表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_document.kb_user_favorite CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_document.kb_user_favorite (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  document_id NUMBER(19) NOT NULL,
  document_title VARCHAR2(200),
  document_category_id NUMBER(19),
  favorite_time TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  PRIMARY KEY (id),
  CONSTRAINT uk_user_document UNIQUE (user_id, document_id, deleted)
);
CREATE INDEX idx_kb_user_favorite_idx_user_id ON kb_document.kb_user_favorite (user_id);
CREATE INDEX idx_kb_user_favorite_idx_document_id ON kb_document.kb_user_favorite (document_id);
CREATE INDEX idx_kb_user_favorite_idx_favorite_time ON kb_document.kb_user_favorite (favorite_time);

SELECT 'kb_favorite 表创建完成！' AS message FROM dual;