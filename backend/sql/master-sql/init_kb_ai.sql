-- =====================================================
-- kb_ai 数据库 - 初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `kb_ai`;

-- 初始化AI对话数据
INSERT INTO `kb_ai_conversation` (`id`, `user_id`, `user_name`, `title`, `model_name`, `message_count`) VALUES
(1600000000000000001, 1000000000000000001, 'admin', '关于Spring Boot的讨论', 'qwen-turbo', 2),
(1600000000000000002, 1000000000000000002, 'editor', '前端开发问题咨询', 'qwen-turbo', 2),
(1600000000000000003, 1000000000000000004, 'developer', '数据库优化建议', 'qwen-turbo', 2);

-- 初始化AI消息数据
INSERT INTO `kb_ai_message` (`id`, `conversation_id`, `role`, `content`, `tokens`) VALUES
(1700000000000000001, 1600000000000000001, 'user', 'Spring Boot自动配置的原理是什么？', 20),
(1700000000000000002, 1600000000000000001, 'assistant', 'Spring Boot的自动配置是通过条件注解(@ConditionalOnClass、@ConditionalOnMissingBean等)实现的。它会根据类路径中的jar包和已定义的Bean来决定是否加载某个配置...', 150),
(1700000000000000003, 1600000000000000002, 'user', 'React 18的新特性有哪些？', 18),
(1700000000000000004, 1600000000000000002, 'assistant', 'React 18的主要新特性包括：1. 并发渲染 2. 自动批处理 3. Transitions 4. Suspense改进...', 120),
(1700000000000000005, 1600000000000000003, 'user', '如何优化MySQL查询性能？', 15),
(1700000000000000006, 1600000000000000003, 'assistant', 'MySQL查询优化可以从以下几个方面入手：1. 索引优化 2. 查询语句优化 3. 表结构优化 4. 参数调优...', 135);

-- 更新对话的消息数量
UPDATE `kb_ai_conversation` SET `message_count` = 2 WHERE `id` = 1600000000000000001;
UPDATE `kb_ai_conversation` SET `message_count` = 2 WHERE `id` = 1600000000000000002;
UPDATE `kb_ai_conversation` SET `message_count` = 2 WHERE `id` = 1600000000000000003;

SELECT 'kb_ai 数据初始化完成！' AS message;
SELECT CONCAT('对话数: ', COUNT(*)) AS info FROM `kb_ai_conversation`;
SELECT CONCAT('消息数: ', COUNT(*)) AS info FROM `kb_ai_message`;
