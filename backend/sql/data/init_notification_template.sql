-- 通知模板种子数据（来自 master-sql/11_notification_template.sql）
SET NAMES utf8mb4;
USE `kb_foundation`;

REPLACE INTO `kb_notification_template` (`template_code`, `template_name`, `notification_type`, `title`, `content`, `variables`, `description`, `is_active`) VALUES
('EMAIL_VERIFY_CODE', '邮箱验证码', 'EMAIL', '验证码 - {{systemName}}', '尊敬的{{userName}}，您的验证码是：{{verifyCode}}，5分钟内有效。', '["userName","verifyCode","systemName"]', '用于邮箱验证和找回密码场景', 1),
('DOCUMENT_APPROVED', '文档审核通过', 'SYSTEM', '您的文档《{{documentTitle}}》已通过审核', '您提交的文档《{{documentTitle}}》已通过审核，感谢您的贡献！', '["documentTitle"]', '文档审核通过时发送的通知', 1),
('DOCUMENT_REJECTED', '文档审核驳回', 'SYSTEM', '您的文档《{{documentTitle}}》需要修改', '您提交的文档《{{documentTitle}}》未通过审核，原因：{{rejectReason}}。请修改后重新提交。', '["documentTitle","rejectReason"]', '文档审核驳回时发送的通知', 1),
('NEW_COMMENT', '新评论通知', 'SYSTEM', '您的文档收到新评论', '{{commentUsername}} 评论了您的文档《{{documentTitle}}》：{{commentContent}}', '["commentUsername","documentTitle","commentContent"]', '文档收到新评论时的通知', 1),
('DOCUMENT_LIKED', '文档被点赞', 'SYSTEM', '您的文档收到新的点赞', '{{likeUsername}} 点赞了您的文档《{{documentTitle}}》', '["likeUsername","documentTitle"]', '文档被点赞时的通知', 1),
('WELCOME_MESSAGE', '欢迎消息', 'SYSTEM', '欢迎加入{{systemName}}', '尊敬的{{userName}}，欢迎加入{{systemName}}！我们期待您的贡献。', '["userName","systemName"]', '用户注册后的欢迎消息', 1);
