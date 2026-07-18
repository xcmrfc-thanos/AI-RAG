-- =====================================================
-- kb_common 数据库 - 初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `kb_common`;

-- 初始化系统配置数据
INSERT INTO `kb_system_config` (`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`) VALUES
(1300000000000000001, 'site.name', '企业知识库', 'string', 'basic', '站点名称', 1),
(1300000000000000002, 'site.logo', '/logo.png', 'string', 'basic', '站点Logo', 1),
(1300000000000000003, 'site.allowRegister', 'true', 'boolean', 'basic', '允许用户注册', 1),
(1300000000000000004, 'upload.maxSize', '104857600', 'number', 'upload', '最大上传文件大小（字节）', 0),
(1300000000000000005, 'upload.allowTypes', '.doc,.docx,.pdf,.txt,.md,.png,.jpg,.jpeg', 'string', 'upload', '允许的文件类型', 0),
(1300000000000000006, 'security.sessionTimeout', '7200', 'number', 'security', '会话超时时间（秒）', 0),
(1300000000000000007, 'security.passwordMinLength', '8', 'number', 'security', '密码最小长度', 0),
(1300000000000000008, 'email.enabled', 'false', 'boolean', 'email', '启用邮件通知', 0),
(1300000000000000009, 'email.host', 'smtp.example.com', 'string', 'email', 'SMTP服务器', 0),
(1300000000000000010, 'email.port', '587', 'number', 'email', 'SMTP端口', 0),
(1300000000000000011, 'ai.model', 'qwen-turbo', 'string', 'ai', 'AI模型名称', 0),
(1300000000000000012, 'ai.maxTokens', '2000', 'number', 'ai', 'AI最大Token数', 0);

-- 初始化字典数据
-- 文档状态字典
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`) VALUES
(1400000000000000001, 'document_status', '文档状态', 'document', '文档状态枚举', 1),
(1400000000000000002, 'review_status', '审核状态', 'review', '审核状态枚举', 2),
(1400000000000000003, 'notification_type', '通知类型', 'notification', '通知类型枚举', 3);

INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `status`) VALUES
-- 文档状态
(1400000000000000001, 1400000000000000001, '草稿', 'draft', 1, 'default', 1),
(1400000000000000002, 1400000000000000001, '已发布', 'published', 2, 'success', 1),
(1400000000000000003, 1400000000000000001, '已归档', 'archived', 3, 'info', 1),
-- 审核状态
(1400000000000000004, 1400000000000000002, '待审核', 'pending', 1, 'warning', 1),
(1400000000000000005, 1400000000000000002, '已通过', 'approved', 2, 'success', 1),
(1400000000000000006, 1400000000000000002, '已拒绝', 'rejected', 3, 'error', 1),
-- 通知类型
(1400000000000000007, 1400000000000000003, '系统通知', 'system', 1, 'blue', 1),
(1400000000000000008, 1400000000000000003, '评论通知', 'comment', 2, 'green', 1),
(1400000000000000009, 1400000000000000003, '提及通知', 'mention', 3, 'orange', 1),
(1400000000000000010, 1400000000000000003, '审核通知', 'review', 4, 'purple', 1),
(1400000000000000011, 1400000000000000003, '点赞通知', 'like', 5, 'red', 1);

SELECT 'kb_common 数据初始化完成！' AS message;
SELECT CONCAT('配置项数: ', COUNT(*)) AS info FROM `kb_system_config`;
SELECT CONCAT('字典类型数: ', COUNT(*)) AS info FROM `kb_dict`;
