-- =====================================================
-- kb_favorite 数据库 - 收藏功能
-- =====================================================

SET NAMES utf8mb4;
USE `kb_document`;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户收藏表
DROP TABLE IF EXISTS `kb_user_favorite`;
CREATE TABLE `kb_user_favorite` (
  `id` BIGINT NOT NULL COMMENT '收藏ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题（冗余字段）',
  `document_category_id` BIGINT DEFAULT NULL COMMENT '文档分类ID（冗余字段）',
  `favorite_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_document` (`user_id`, `document_id`, `deleted`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_favorite_time` (`favorite_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

SELECT 'kb_favorite 表创建完成！' AS message;
