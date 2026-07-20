-- =====================================================
-- kb_intelligence 数据库 — Intelligence BC
-- =====================================================

SET NAMES utf8mb4;
USE `kb_intelligence`;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `kb_search_history`;
CREATE TABLE `kb_search_history` (
  `id` BIGINT NOT NULL COMMENT '搜索历史ID（雪花）',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `keyword` VARCHAR(200) NOT NULL COMMENT '搜索关键词',
  `search_count` INT NOT NULL DEFAULT 1 COMMENT '搜索次数',
  `search_type` VARCHAR(20) NOT NULL DEFAULT 'document' COMMENT '搜索类型',
  `result_count` INT DEFAULT 0 COMMENT '结果数量',
  `search_params` JSON DEFAULT NULL COMMENT '搜索参数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近搜索时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_keyword` (`user_id`, `keyword`(191)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_keyword` (`keyword`(100)),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';

DROP TABLE IF EXISTS `conversation`;
CREATE TABLE `conversation` (
  `id` BIGINT NOT NULL COMMENT '对话ID',
  `title` VARCHAR(200) NOT NULL COMMENT '对话标题',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `model` VARCHAR(50) DEFAULT NULL COMMENT '模型名称',
  `system_prompt` TEXT DEFAULT NULL COMMENT '系统提示词',
  `tokens_used` INT DEFAULT 0 COMMENT 'Token 使用量',
  `message_count` INT NOT NULL DEFAULT 0 COMMENT '消息数量',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态（0-进行中，1-已结束）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除（0-未删，1-已删）',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 对话表';

DROP TABLE IF EXISTS `message`;
CREATE TABLE `message` (
  `id` BIGINT NOT NULL COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色：system/user/assistant',
  `content` LONGTEXT NOT NULL COMMENT '消息内容',
  `tokens` INT DEFAULT NULL COMMENT 'Token 数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 消息表';

DROP TABLE IF EXISTS `ai_feedback`;
CREATE TABLE `ai_feedback` (
  `id` BIGINT NOT NULL COMMENT '反馈ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `message_id` BIGINT NOT NULL COMMENT '消息ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `feedback_type` VARCHAR(20) NOT NULL COMMENT '反馈类型：positive/negative',
  `feedback_content` TEXT DEFAULT NULL COMMENT '反馈内容',
  `rating` TINYINT DEFAULT NULL COMMENT '评分 1-5',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 反馈表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_intelligence 表结构创建完成！' AS message;
