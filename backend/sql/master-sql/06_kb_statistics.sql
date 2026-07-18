-- =====================================================
-- kb_statistics 数据库 - 统计服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_statistics`;
SET FOREIGN_KEY_CHECKS = 0;

-- 文档统计表
DROP TABLE IF EXISTS `kb_document_statistics`;
CREATE TABLE `kb_document_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题（冗余字段）',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论次数',
  `collect_count` INT NOT NULL DEFAULT 0 COMMENT '收藏次数',
  `share_count` INT NOT NULL DEFAULT 0 COMMENT '分享次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_date` (`document_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档统计表';

-- 用户统计表
DROP TABLE IF EXISTS `kb_user_statistics`;
CREATE TABLE `kb_user_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `document_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论数量',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `login_count` INT NOT NULL DEFAULT 0 COMMENT '登录次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计表';

-- 浏览记录表（已废弃，请使用 kb_view_history）
-- 参见: sql/13_kb_statistics_view_history.sql
-- DROP TABLE IF EXISTS `kb_view_record`;

-- 评论统计表
DROP TABLE IF EXISTS `kb_comment_statistics`;
CREATE TABLE `kb_comment_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `comment_id` BIGINT NOT NULL COMMENT '评论ID',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `reply_count` INT NOT NULL DEFAULT 0 COMMENT '回复次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comment_date` (`comment_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论统计表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_statistics 数据库表创建完成！' AS message;
