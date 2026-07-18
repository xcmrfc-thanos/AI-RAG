-- =====================================================
-- 【已废弃 DEPRECATED — 任务 33】kb_statistics 跨库视图
-- 4 BC 全新部署请勿执行本脚本；请改用 sql/schema/kb_statistics.sql（stat_* 投影表）
-- 保留仅供历史环境对照，运行时代码已不再依赖下列 VIEW
-- =====================================================

SET NAMES utf8mb4;
USE `kb_statistics`;

-- 删除已存在的视图（幂等重跑）
DROP VIEW IF EXISTS `kb_document`;
DROP VIEW IF EXISTS `kb_user`;
DROP VIEW IF EXISTS `kb_comment`;
DROP VIEW IF EXISTS `kb_operation_log`;

-- =====================================================
-- 视图: kb_document (来源: kb_document.kb_document)
-- =====================================================
CREATE VIEW `kb_document` AS
SELECT
    id, title, author_id, author_name, category_id, status,
    view_count, like_count, favorite_count, comment_count,
    is_public, is_top, is_recommend, document_type, source,
    cover_image, summary, sort, allow_comment, publish_time,
    created_at, updated_at, create_by, update_by, deleted
FROM kb_document.kb_document;

-- =====================================================
-- 视图: kb_user (来源: kb_user.kb_user)
-- =====================================================
CREATE VIEW `kb_user` AS
SELECT
    id, username, real_name, avatar, status,
    email, phone, department, position,
    last_login_time, created_at, updated_at, deleted
FROM kb_user.kb_user;

-- =====================================================
-- 视图: kb_comment (来源: kb_document.tb_comment)
-- =====================================================
CREATE VIEW `kb_comment` AS
SELECT
    id, document_id, content, user_id, user_name,
    user_avatar, parent_id, reply_to_id, reply_to_name,
    like_count, reply_count, status, created_at,
    updated_at, create_by, update_by, deleted
FROM kb_document.tb_comment;

-- =====================================================
-- 视图: kb_operation_log (来源: kb_foundation.kb_operation_log)
-- =====================================================
CREATE VIEW `kb_operation_log` AS
SELECT
    id, module, operation_type, operation_desc,
    request_method, request_url, request_params,
    response_result, user_id, username, ip_address,
    location, user_agent, execute_time, status,
    error_msg, created_at, updated_at, create_by,
    update_by, deleted
FROM kb_foundation.kb_operation_log;

-- =====================================================
-- 视图: kb_category (来源: kb_document.kb_category)
-- =====================================================
DROP VIEW IF EXISTS `kb_category`;
CREATE VIEW `kb_category` AS
SELECT
    id, category_name, category_code, parent_id, category_icon,
    description, sort, document_count, status,
    created_at, updated_at, create_by, update_by, deleted
FROM kb_document.kb_category;

SELECT 'kb_statistics 跨库视图创建完成！' AS message;
