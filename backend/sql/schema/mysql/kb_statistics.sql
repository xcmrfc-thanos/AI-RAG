-- =====================================================
-- kb_statistics 数据库 — 统计服务（4 BC 全新部署）
-- 含：聚合统计表、浏览历史、MQ 投影宽表 stat_*
-- 审计报告：statistics-sql-audit.md（任务 32）
-- 注意：本 schema 不含跨库 VIEW，勿执行 master-sql/12、14 视图脚本
-- =====================================================

SET NAMES utf8mb4;
USE `kb_statistics`;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- 日聚合统计表 ----------

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档日统计表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户日统计表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论日统计表';

-- ---------- 浏览历史 ----------

DROP TABLE IF EXISTS `kb_view_history`;
CREATE TABLE `kb_view_history` (
  `id` BIGINT NOT NULL COMMENT '记录ID（雪花算法生成）',
  `user_id` BIGINT DEFAULT NULL COMMENT '用户ID（未登录为NULL）',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题（冗余字段）',
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

-- ---------- MQ 投影宽表（Intelligence / Core → statistics）----------

DROP TABLE IF EXISTS `stat_ai_message`;
DROP TABLE IF EXISTS `stat_ai_conversation`;
CREATE TABLE `stat_ai_conversation` (
  `id` BIGINT NOT NULL COMMENT '对话ID',
  `user_id` BIGINT DEFAULT NULL COMMENT '用户ID',
  `created_at` DATETIME DEFAULT NULL COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除 0-否 1-是',
  PRIMARY KEY (`id`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话统计投影';

CREATE TABLE `stat_ai_message` (
  `id` BIGINT NOT NULL COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色 user/assistant/system',
  `created_at` DATETIME DEFAULT NULL COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除 0-否 1-是',
  PRIMARY KEY (`id`),
  KEY `idx_role_deleted` (`role`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息统计投影';

DROP TABLE IF EXISTS `stat_operation_log`;
DROP TABLE IF EXISTS `stat_team`;
DROP TABLE IF EXISTS `stat_role`;
DROP TABLE IF EXISTS `stat_comment`;
DROP TABLE IF EXISTS `stat_category`;
DROP TABLE IF EXISTS `stat_user`;
DROP TABLE IF EXISTS `stat_document`;
CREATE TABLE `stat_document` (
  `id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `author_id` BIGINT DEFAULT NULL COMMENT '作者用户ID',
  `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
  `status` INT DEFAULT NULL COMMENT '文档状态',
  `view_count` BIGINT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` BIGINT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `favorite_count` BIGINT NOT NULL DEFAULT 0 COMMENT '收藏次数',
  `summary` VARCHAR(500) DEFAULT NULL COMMENT '摘要',
  `is_public` TINYINT NOT NULL DEFAULT 1 COMMENT '是否公开：0否1是',
  `team_id` BIGINT DEFAULT NULL COMMENT '所属团队ID',
  `created_at` DATETIME DEFAULT NULL COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT NULL COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_author_deleted` (`author_id`, `deleted`),
  KEY `idx_category_deleted` (`category_id`, `deleted`),
  KEY `idx_status_deleted` (`status`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档统计投影';

CREATE TABLE `stat_user` (
  `id` BIGINT NOT NULL COMMENT '用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '用户名',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `status` INT DEFAULT NULL COMMENT '用户状态',
  `created_at` DATETIME DEFAULT NULL COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT NULL COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_status_deleted` (`status`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计投影';

CREATE TABLE `stat_comment` (
  `id` BIGINT NOT NULL COMMENT '评论ID',
  `user_id` BIGINT NOT NULL COMMENT '评论用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `created_at` DATETIME DEFAULT NULL COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_user_deleted` (`user_id`, `deleted`),
  KEY `idx_doc_deleted` (`document_id`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论统计投影';

CREATE TABLE `stat_category` (
  `id` BIGINT NOT NULL COMMENT '分类ID',
  `category_name` VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类统计投影';

CREATE TABLE `stat_role` (
  `id` BIGINT NOT NULL COMMENT '角色ID',
  `role_name` VARCHAR(100) DEFAULT NULL COMMENT '角色名称',
  `role_code` VARCHAR(50) DEFAULT NULL COMMENT '角色编码',
  `status` INT DEFAULT NULL COMMENT '角色状态',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色统计投影';

CREATE TABLE `stat_team` (
  `id` BIGINT NOT NULL COMMENT '团队ID',
  `team_name` VARCHAR(100) DEFAULT NULL COMMENT '团队名称',
  `team_code` VARCHAR(50) DEFAULT NULL COMMENT '团队编码',
  `status` INT DEFAULT NULL COMMENT '团队状态',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队统计投影';

CREATE TABLE `stat_operation_log` (
  `id` BIGINT NOT NULL COMMENT '日志ID',
  `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '操作用户名',
  `status` INT DEFAULT NULL COMMENT '操作结果状态',
  `created_at` DATETIME DEFAULT NULL COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  KEY `idx_created_status` (`created_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志统计投影';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_statistics 表结构创建完成！' AS message;
