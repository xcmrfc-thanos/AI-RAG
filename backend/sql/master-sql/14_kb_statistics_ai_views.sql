-- =====================================================
-- 【已废弃 DEPRECATED — 任务 33】kb_statistics AI 跨库视图
-- 4 BC 全新部署请勿执行；AI 统计改由 stat_ai_conversation / stat_ai_message 投影表
-- 权威 schema：sql/schema/kb_statistics.sql
-- =====================================================

SET NAMES utf8mb4;
USE `kb_statistics`;

-- 删除已存在的视图（幂等重跑）
DROP VIEW IF EXISTS `kb_ai_conversation`;
DROP VIEW IF EXISTS `kb_ai_message`;

-- =====================================================
-- 视图: kb_ai_conversation (来源: kb_ai.conversation)
-- =====================================================
CREATE VIEW `kb_ai_conversation` AS
SELECT
    id, title, user_id, model, system_prompt,
    tokens_used, message_count, status,
    created_at, updated_at, deleted
FROM kb_ai.conversation;

-- =====================================================
-- 视图: kb_ai_message (来源: kb_ai.message)
-- =====================================================
CREATE VIEW `kb_ai_message` AS
SELECT
    id, conversation_id, role, content, tokens,
    created_at, deleted
FROM kb_ai.message;

SELECT 'kb_statistics AI视图创建完成！' AS message;
