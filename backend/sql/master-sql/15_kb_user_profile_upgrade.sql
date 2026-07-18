-- =====================================================
-- kb_user 数据库 - 个人中心功能升级
-- 1. 添加 remark 字段（个人简介）
-- 2. 创建 kb_document 跨库视图（用于用户统计查询）
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- =====================================================
-- 1. 添加 remark 字段
-- =====================================================
-- MySQL 8.0 可用 IF NOT EXISTS，低版本请手动判断
ALTER TABLE `kb_user`
    ADD COLUMN IF NOT EXISTS `remark` VARCHAR(500) DEFAULT NULL COMMENT '个人简介/备注'
    AFTER `position`;

-- =====================================================
-- 2. 创建 kb_document 跨库视图（只读）
--    用于查询用户发布的文档数、获赞数
-- =====================================================
DROP VIEW IF EXISTS `kb_document`;
CREATE VIEW `kb_document` AS
SELECT
    id, title, author_id, author_name, category_id, status,
    view_count, like_count, favorite_count, comment_count,
    is_public, is_top, is_recommend, document_type, source,
    cover_image, tags, summary, content_id, content_length,
    sort, allow_comment, publish_time, created_at, updated_at,
    create_by, update_by, deleted
FROM kb_document.kb_document;

SELECT 'kb_user 个人中心功能升级SQL执行完成！' AS message;
