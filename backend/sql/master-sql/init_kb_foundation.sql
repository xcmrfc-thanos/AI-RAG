-- =====================================================
-- kb_foundation 数据库 - 初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `kb_foundation`;

-- =====================================================
-- 1. 初始化系统配置数据
-- =====================================================
INSERT INTO `kb_system_config` (`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`) VALUES
-- AI配置
(2000000000000000001, 'qwen.api.key', '', 'string', 'AI', '千问API密钥', 0),
(2000000000000000002, 'qwen.model.name', 'qwen-max', 'string', 'AI', '千问模型名称', 1),
(2000000000000000003, 'qwen.embedding.model', 'text-embedding-v3', 'string', 'AI', '千问嵌入模型', 1),
(2000000000000000004, 'milvus.host', 'localhost', 'string', 'AI', 'Milvus主机地址', 1),
(2000000000000000005, 'milvus.port', '19530', 'number', 'AI', 'Milvus端口', 1),

-- 存储配置
(2000000000000000006, 'rustfs.endpoints', 'http://localhost:8200', 'json', 'STORAGE', 'RustFS端点列表', 1),
(2000000000000000007, 'rustfs.bucket', 'knowledge-docs', 'string', 'STORAGE', 'RustFS存储桶', 1),
(2000000000000000008, 'file.upload.max.size', '52428800', 'number', 'STORAGE', '文件上传最大大小（字节）', 1),
(2000000000000000009, 'file.upload.allowed.types', 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md', 'string', 'STORAGE', '允许上传的文件类型', 1),

-- 通知配置
(2000000000000000010, 'email.enabled', 'true', 'boolean', 'NOTIFICATION', '是否启用邮件通知', 1),
(2000000000000000011, 'email.host', 'smtp.example.com', 'string', 'NOTIFICATION', '邮件服务器地址', 0),
(2000000000000000012, 'email.port', '587', 'number', 'NOTIFICATION', '邮件服务器端口', 0),
(2000000000000000013, 'notification.retention.days', '90', 'number', 'NOTIFICATION', '通知保留天数', 1),
(2000000000000000014, 'websocket.enabled', 'true', 'boolean', 'NOTIFICATION', '是否启用WebSocket推送', 1),

-- 安全配置
(2000000000000000015, 'auth.session.timeout', '7200', 'number', 'SECURITY', '会话超时时间（秒）', 1),
(2000000000000000016, 'auth.password.min.length', '8', 'number', 'SECURITY', '密码最小长度', 1),
(2000000000000000017, 'auth.password.require.special', 'true', 'boolean', 'SECURITY', '密码是否要求特殊字符', 1),
(2000000000000000018, 'auth.login.max.retry', '5', 'number', 'SECURITY', '登录最大重试次数', 1),

-- 系统配置
(2000000000000000019, 'system.name', '企业知识库', 'string', 'SYSTEM', '系统名称', 1),
(2000000000000000020, 'system.version', '1.0.0', 'string', 'SYSTEM', '系统版本', 1),
(2000000000000000021, 'system.logo', '/logo.png', 'string', 'SYSTEM', '系统Logo路径', 1),
(2000000000000000022, 'user.registration.enabled', 'true', 'boolean', 'SYSTEM', '是否允许用户注册', 1),
(2000000000000000023, 'user.default.role', 'VIEWER', 'string', 'SYSTEM', '新用户默认角色', 1);

-- =====================================================
-- 2. 初始化字典类型数据
-- =====================================================
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`, `status`) VALUES
(3000000000000000001, 'document_status', '文档状态', 'DOCUMENT', '文档状态：草稿/已发布/已归档/待审核', 1, 1),
(3000000000000000002, 'notification_type', '通知类型', 'SYSTEM', '系统通知类型', 2, 1),
(3000000000000000003, 'operation_type', '操作类型', 'SYSTEM', '系统操作类型', 3, 1),
(3000000000000000004, 'file_type', '文件类型', 'FILE', '支持的文件类型', 4, 1),
(3000000000000000005, 'user_type', '用户类型', 'USER', '用户类型分类', 5, 1);

-- =====================================================
-- 3. 初始化字典数据
-- =====================================================

-- 文档状态字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3100000000000000001, 3000000000000000001, 'document_status', '草稿', '0', 1, 'badge-gray', 1, 1),
(3100000000000000002, 3000000000000000001, 'document_status', '已发布', '1', 2, 'badge-green', 0, 1),
(3100000000000000003, 3000000000000000001, 'document_status', '已归档', '2', 3, 'badge-blue', 0, 1),
(3100000000000000004, 3000000000000000001, 'document_status', '待审核', '3', 4, 'badge-yellow', 0, 1);

-- 通知类型字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3200000000000000001, 3000000000000000002, 'notification_type', '系统通知', 'system', 1, 'badge-blue', 1, 1),
(3200000000000000002, 3000000000000000002, 'notification_type', '评论通知', 'comment', 2, 'badge-green', 0, 1),
(3200000000000000003, 3000000000000000002, 'notification_type', '@提醒', 'mention', 3, 'badge-orange', 0, 1),
(3200000000000000004, 3000000000000000002, 'notification_type', '审核通知', 'review', 4, 'badge-purple', 0, 1),
(3200000000000000005, 3000000000000000002, 'notification_type', '点赞通知', 'like', 5, 'badge-pink', 0, 1);

-- 操作类型字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3300000000000000001, 3000000000000000003, 'operation_type', '登录', 'LOGIN', 1, NULL, 0, 1),
(3300000000000000002, 3000000000000000003, 'operation_type', '登出', 'LOGOUT', 2, NULL, 0, 1),
(3300000000000000003, 3000000000000000003, '操作类型', '创建', 'CREATE', 3, NULL, 0, 1),
(3300000000000000004, 3000000000000000003, '操作类型', '更新', 'UPDATE', 4, NULL, 0, 1),
(3300000000000000005, 3000000000000000003, '操作类型', '删除', 'DELETE', 5, NULL, 0, 1),
(3300000000000000006, 3000000000000000003, '操作类型', '查询', 'QUERY', 6, NULL, 0, 1),
(3300000000000000007, 3000000000000000003, '操作类型', '导出', 'EXPORT', 7, NULL, 0, 1),
(3300000000000000008, 3000000000000000003, '操作类型', '导入', 'IMPORT', 8, NULL, 0, 1);

-- 文件类型字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3400000000000000001, 3000000000000000004, 'file_type', 'PDF文档', 'pdf', 1, 'file-pdf', 1, 1),
(3400000000000000002, 3000000000000000004, 'file_type', 'Word文档', 'doc', 2, 'file-word', 0, 1),
(3400000000000000003, 3000000000000000004, 'file_type', 'Excel表格', 'xls', 3, 'file-excel', 0, 1),
(3400000000000000004, 3000000000000000004, 'file_type', 'PPT演示', 'ppt', 4, 'file-ppt', 0, 1),
(3400000000000000005, 3000000000000000004, 'file_type', '图片', 'image', 5, 'file-image', 0, 1),
(3400000000000000006, 3000000000000000004, 'file_type', '视频', 'video', 6, 'file-video', 0, 1),
(3400000000000000007, 3000000000000000004, 'file_type', '文本', 'txt', 7, 'file-text', 0, 1),
(3400000000000000008, 3000000000000000004, 'file_type', 'Markdown', 'md', 8, 'file-markdown', 0, 1);

-- 用户类型字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3500000000000000001, 3000000000000000005, 'user_type', '超级管理员', 'SUPER_ADMIN', 1, 'user-admin', 0, 1),
(3500000000000000002, 3000000000000000005, 'user_type', '知识管理员', 'KNOWLEDGE_ADMIN', 2, 'user-manager', 0, 1),
(3500000000000000003, 3000000000000000005, 'user_type', '内容管理员', 'CONTENT_ADMIN', 3, 'user-editor', 0, 1),
(3500000000000000004, 3000000000000000005, 'user_type', '团队负责人', 'TEAM_LEADER', 4, 'user-leader', 0, 1),
(3500000000000000005, 3000000000000000005, 'user_type', '贡献者', 'CONTRIBUTOR', 5, 'user-contributor', 0, 1),
(3500000000000000006, 3000000000000000005, 'user_type', '普通用户', 'VIEWER', 6, 'user-viewer', 1, 1);

-- =====================================================
-- 4. 初始化通知数据
-- =====================================================
INSERT INTO `kb_notification` (`id`, `user_id`, `user_name`, `notification_type`, `title`, `content`, `link`, `is_read`) VALUES
(1500000000000000001, 1000000000000000002, 'editor', 'system', '欢迎加入企业知识库', '欢迎加入企业知识库系统，开始您的知识管理之旅！', '/documents', 0),
(1500000000000000002, 1000000000000000004, 'developer', 'comment', '您的文档收到新评论', '《Spring Boot 3.x 快速入门指南》收到新评论', '/documents/1000000000000000001', 0),
(1500000000000000003, 1000000000000000005, 'product', 'review', '文档审核通过', '您的《企业知识库产品需求文档PRD》已通过审核', '/documents/1000000000000000005', 1),
(1500000000000000004, 1000000000000000001, 'admin', 'mention', '有人@了您', 'developer在《Docker + Kubernetes 容器化部署》中提到了您', '/documents/1000000000000000004', 0);

-- =====================================================
-- 5. 初始化操作日志数据
-- =====================================================
INSERT INTO `kb_operation_log` (`id`, `module`, `operation_type`, `operation_desc`, `request_method`, `request_url`, `user_id`, `username`, `ip_address`, `execute_time`, `status`) VALUES
(4000000000000000001, '用户管理', 'LOGIN', '用户登录', 'POST', '/api/auth/login', 1000000000000000001, 'admin', '127.0.0.1', 125, 1),
(4000000000000000002, '文档管理', 'CREATE', '创建文档', 'POST', '/api/document', 1000000000000000002, 'editor', '127.0.0.1', 342, 1),
(4000000000000000003, '文档管理', 'UPDATE', '更新文档', 'PUT', '/api/document/1000000000000000001', 1000000000000000002, 'editor', '127.0.0.1', 215, 1),
(4000000000000000004, '系统配置', 'UPDATE', '更新系统配置', 'PUT', '/api/foundation/config', 1000000000000000001, 'admin', '127.0.0.1', 89, 1),
(4000000000000000005, '用户管理', 'CREATE', '创建用户', 'POST', '/api/auth/user', 1000000000000000001, 'admin', '127.0.0.1', 156, 1);

SELECT 'kb_foundation 数据初始化完成！' AS message;
SELECT CONCAT('系统配置数: ', COUNT(*)) AS info FROM `kb_system_config`;
SELECT CONCAT('字典类型数: ', COUNT(*)) AS info FROM `kb_dict`;
SELECT CONCAT('字典数据数: ', COUNT(*)) AS info FROM `kb_dict_data`;
SELECT CONCAT('通知数: ', COUNT(*)) AS info FROM `kb_notification`;
SELECT CONCAT('操作日志数: ', COUNT(*)) AS info FROM `kb_operation_log`;
