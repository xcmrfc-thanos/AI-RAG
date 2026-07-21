-- =====================================================
-- kb_intelligence 样例数据（可选）
-- =====================================================

SET NAMES utf8mb4;
USE `kb_intelligence`;

INSERT INTO `conversation` (`id`, `user_id`, `title`, `model`, `message_count`, `status`, `deleted`) VALUES
(1600000000000000001, 1000000000000000001, '关于 Spring Boot 的讨论', 'qwen-turbo', 2, 0, 0),
(1600000000000000002, 1000000000000000002, '前端开发问题咨询', 'qwen-turbo', 2, 0, 0);

INSERT INTO `message` (`id`, `conversation_id`, `role`, `content`, `tokens`, `deleted`) VALUES
(1700000000000000001, 1600000000000000001, 'user', 'Spring Boot 自动配置的原理是什么？', 20, 0),
(1700000000000000002, 1600000000000000001, 'assistant', 'Spring Boot 通过条件注解与自动配置类实现按需装配。', 150, 0);

INSERT INTO `kb_search_history` (`id`, `user_id`, `keyword`, `search_count`, `created_at`) VALUES
(327704815390035968, 1000000000000000001, 'Spring Boot 教程', 1, NOW());

SELECT 'kb_intelligence 样例数据写入完成！' AS message;
