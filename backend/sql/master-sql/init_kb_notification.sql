-- =====================================================
-- kb_notification 数据库 - 初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `kb_notification`;

-- 初始化通知数据
INSERT INTO `kb_notification` (`id`, `user_id`, `user_name`, `notification_type`, `title`, `content`, `link`, `is_read`) VALUES
(1500000000000000001, 1000000000000000002, 'editor', 'system', '欢迎加入企业知识库', '欢迎加入企业知识库系统，开始您的知识管理之旅！', '/documents', 0),
(1500000000000000002, 1000000000000000004, 'developer', 'comment', '您的文档收到新评论', '《Spring Boot 3.x 快速入门指南》收到新评论', '/documents/1000000000000000001', 0),
(1500000000000000003, 1000000000000000005, 'product', 'review', '文档审核通过', '您的《企业知识库产品需求文档PRD》已通过审核', '/documents/1000000000000000005', 1),
(1500000000000000004, 1000000000000000001, 'admin', 'mention', '有人@了您', 'developer在《Docker + Kubernetes 容器化部署》中提到了您', '/documents/1000000000000000004', 0);

SELECT 'kb_notification 数据初始化完成！' AS message;
SELECT CONCAT('通知数: ', COUNT(*)) AS info FROM `kb_notification`;
