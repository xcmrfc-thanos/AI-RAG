-- =====================================================
-- kb_search 数据库 - 搜索服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_search`;
SET FOREIGN_KEY_CHECKS = 0;

-- 搜索历史表
DROP TABLE IF EXISTS `kb_search_history`;
CREATE TABLE `kb_search_history` (
  `id` BIGINT NOT NULL COMMENT '搜索历史ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `keyword` VARCHAR(200) NOT NULL COMMENT '搜索关键词',
  `search_count` INT DEFAULT 0 COMMENT '搜索次数',
  `search_type` VARCHAR(20) NOT NULL DEFAULT 'document' COMMENT '搜索类型',
  `result_count` INT DEFAULT 0 COMMENT '结果数量',
  `search_params` JSON DEFAULT NULL COMMENT '搜索参数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_keyword` (`keyword`(100)),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_search 数据库表创建完成！' AS message;
