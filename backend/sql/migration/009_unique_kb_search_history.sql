-- 搜索历史：同一用户同一关键词唯一（防止并发重复插入）
SET NAMES utf8mb4;
USE `kb_intelligence`;

-- 合并已有重复数据：保留最新一条，累加 search_count
DELETE h1 FROM `kb_search_history` h1
INNER JOIN `kb_search_history` h2
  ON h1.user_id = h2.user_id
 AND h1.keyword = h2.keyword
 AND h1.id < h2.id;

SET @uk_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'kb_search_history'
    AND index_name = 'uk_user_keyword'
);

SET @ddl := IF(
  @uk_exists = 0,
  'ALTER TABLE `kb_search_history` ADD UNIQUE KEY `uk_user_keyword` (`user_id`, `keyword`(191))',
  'SELECT ''uk_user_keyword already exists'' AS msg'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'kb_search_history unique index migration done' AS message;
