-- =====================================================
-- kb_intelligence（PostgreSQL 试点 DDL）
-- 自 ../mysql/kb_intelligence.sql 手工翻译；权威仍以 MySQL 为准。
-- 用法：先执行 00_create_schemas.sql，再：
--   SET search_path TO kb_intelligence;
--   \i kb_intelligence.sql
-- =====================================================

SET search_path TO kb_intelligence;

DROP TABLE IF EXISTS ai_feedback;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS conversation;
DROP TABLE IF EXISTS kb_search_history;

CREATE TABLE kb_search_history (
  id            BIGINT       NOT NULL,
  user_id       BIGINT       NOT NULL,
  keyword       VARCHAR(200) NOT NULL,
  search_count  INT          NOT NULL DEFAULT 1,
  search_type   VARCHAR(20)  NOT NULL DEFAULT 'document',
  result_count  INT          DEFAULT 0,
  search_params JSONB,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_keyword UNIQUE (user_id, keyword)
);

CREATE INDEX idx_kb_search_history_user_id ON kb_search_history (user_id);
CREATE INDEX idx_kb_search_history_keyword ON kb_search_history (keyword);
CREATE INDEX idx_kb_search_history_created_at ON kb_search_history (created_at);

CREATE TABLE conversation (
  id             BIGINT       NOT NULL,
  title          VARCHAR(200) NOT NULL,
  user_id        BIGINT       NOT NULL,
  model          VARCHAR(50),
  system_prompt  TEXT,
  tokens_used    INT          DEFAULT 0,
  message_count  INT          NOT NULL DEFAULT 0,
  status         SMALLINT     NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted        SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE INDEX idx_conversation_user_id ON conversation (user_id);
CREATE INDEX idx_conversation_updated_at ON conversation (updated_at);

CREATE TABLE message (
  id               BIGINT    NOT NULL,
  conversation_id  BIGINT    NOT NULL,
  role             VARCHAR(20) NOT NULL,
  content          TEXT      NOT NULL,
  tokens           INT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted          SMALLINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE INDEX idx_message_conversation_id ON message (conversation_id);
CREATE INDEX idx_message_created_at ON message (created_at);

CREATE TABLE ai_feedback (
  id                BIGINT       NOT NULL,
  conversation_id   BIGINT       NOT NULL,
  message_id        BIGINT       NOT NULL,
  user_id           BIGINT       NOT NULL,
  feedback_type     VARCHAR(20)  NOT NULL,
  feedback_content  TEXT,
  rating            SMALLINT,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted           SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE INDEX idx_ai_feedback_conversation_id ON ai_feedback (conversation_id);
CREATE INDEX idx_ai_feedback_message_id ON ai_feedback (message_id);
CREATE INDEX idx_ai_feedback_user_id ON ai_feedback (user_id);

SELECT 'kb_intelligence PostgreSQL pilot DDL done' AS message;
