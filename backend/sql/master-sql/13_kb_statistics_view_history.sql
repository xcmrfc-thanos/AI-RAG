-- =====================================================
-- kb_statistics 数据库 - 浏览历史记录表
-- 替代原有的 kb_view_record，增加索引优化
-- =====================================================

SET NAMES utf8mb4;
USE `kb_statistics`;
SET FOREIGN_KEY_CHECKS = 0;

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS `kb_view_record`;

-- 创建浏览历史记录表
CREATE TABLE `kb_view_history` (
    `id` BIGINT NOT NULL COMMENT '记录ID（雪花算法生成）',
    `user_id` BIGINT DEFAULT NULL COMMENT '用户ID（未登录为NULL）',
    `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段，加速查询）',
    `document_id` BIGINT NOT NULL COMMENT '文档ID',
    `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题（冗余字段，加速查询）',
    `view_duration` INT DEFAULT NULL COMMENT '浏览时长（秒）',
    `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_document_id` (`document_id`),
    KEY `idx_create_time` (`created_at`),
    KEY `idx_user_document` (`user_id`, `document_id`),
    KEY `idx_doc_date` (`document_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户浏览历史记录表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_view_history 表创建完成！' AS message;
