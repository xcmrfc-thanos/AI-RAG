-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_intelligence
-- 以 SYSTEM 装载时使用限定名 kb_intelligence.table
-- =====================================================

-- =====================================================
-- kb_intelligence 数据库 — Intelligence BC
-- =====================================================

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_intelligence.kb_search_history CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_intelligence.kb_search_history (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  keyword VARCHAR2(200) NOT NULL,
  search_count NUMBER(10) DEFAULT 1 NOT NULL,
  search_type VARCHAR2(20) DEFAULT 'document' NOT NULL,
  result_count NUMBER(10) DEFAULT 0,
  search_params CLOB,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_keyword UNIQUE (user_id, keyword)
);
CREATE INDEX idx_kb_search_history_idx_user_id ON kb_intelligence.kb_search_history (user_id);
CREATE INDEX idx_kb_search_history_idx_keyword ON kb_intelligence.kb_search_history (keyword);
CREATE INDEX idx_kb_search_history_idx_created_at ON kb_intelligence.kb_search_history (created_at);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_intelligence.conversation CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_intelligence.conversation (
  id NUMBER(19) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  model VARCHAR2(50),
  system_prompt CLOB,
  tokens_used NUMBER(10) DEFAULT 0,
  message_count NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_conversation_idx_user_id ON kb_intelligence.conversation (user_id);
CREATE INDEX idx_conversation_idx_updated_at ON kb_intelligence.conversation (updated_at);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_intelligence.message CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_intelligence.message (
  id NUMBER(19) NOT NULL,
  conversation_id NUMBER(19) NOT NULL,
  role VARCHAR2(20) NOT NULL,
  content CLOB NOT NULL,
  tokens NUMBER(10),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_message_idx_conversation_id ON kb_intelligence.message (conversation_id);
CREATE INDEX idx_message_idx_created_at ON kb_intelligence.message (created_at);

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_intelligence.ai_feedback CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_intelligence.ai_feedback (
  id NUMBER(19) NOT NULL,
  conversation_id NUMBER(19) NOT NULL,
  message_id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  feedback_type VARCHAR2(20) NOT NULL,
  feedback_content CLOB,
  rating NUMBER(3),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX idx_ai_feedback_idx_conversation_id ON kb_intelligence.ai_feedback (conversation_id);
CREATE INDEX idx_ai_feedback_idx_message_id ON kb_intelligence.ai_feedback (message_id);
CREATE INDEX idx_ai_feedback_idx_user_id ON kb_intelligence.ai_feedback (user_id);

SELECT 'kb_intelligence 表结构创建完成！' AS message FROM dual;