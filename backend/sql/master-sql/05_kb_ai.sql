-- =====================================================
-- kb_ai 数据库 - AI服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_ai`;
SET FOREIGN_KEY_CHECKS = 0;

-- AI对话表
DROP TABLE IF EXISTS `kb_ai_conversation`;
CREATE TABLE `kb_ai_conversation` (
  `id` BIGINT NOT NULL COMMENT '对话ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `title` VARCHAR(200) NOT NULL COMMENT '对话标题',
  `model_name` VARCHAR(50) DEFAULT 'qwen-turbo' COMMENT 'AI模型名称',
  `message_count` INT NOT NULL DEFAULT 0 COMMENT '消息数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_update_time` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话表';

-- AI消息表
DROP TABLE IF EXISTS `kb_ai_message`;
CREATE TABLE `kb_ai_message` (
  `id` BIGINT NOT NULL COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色：user/assistant/system',
  `content` LONGTEXT NOT NULL COMMENT '消息内容',
  `tokens` INT DEFAULT NULL COMMENT 'Token数量',
  `model_name` VARCHAR(50) DEFAULT NULL COMMENT '使用的模型',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息表';

-- AI反馈表
DROP TABLE IF EXISTS `kb_ai_feedback`;
CREATE TABLE `kb_ai_feedback` (
  `id` BIGINT NOT NULL COMMENT '反馈ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `message_id` BIGINT NOT NULL COMMENT '消息ID',
  `feedback_type` VARCHAR(20) NOT NULL COMMENT '反馈类型：like/dislike',
  `comment` TEXT DEFAULT NULL COMMENT '反馈意见',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI反馈表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_ai 数据库表创建完成！' AS message;
