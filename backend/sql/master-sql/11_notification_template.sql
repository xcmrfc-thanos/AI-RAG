-- 通知模板表
-- 用于管理系统通知消息的模板配置

CREATE TABLE IF NOT EXISTS kb_notification_template (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    template_code VARCHAR(100) NOT NULL COMMENT '模板编码',
    template_name VARCHAR(200) NOT NULL COMMENT '模板名称',
    notification_type VARCHAR(50) NOT NULL COMMENT '通知类型：EMAIL/SMS/WECHAT/SYSTEM/BROWSER',
    title VARCHAR(500) NOT NULL COMMENT '模板标题',
    content TEXT NOT NULL COMMENT '模板内容',
    variables VARCHAR(1000) DEFAULT '[]' COMMENT '模板变量（JSON数组格式）',
    description VARCHAR(500) DEFAULT NULL COMMENT '模板描述',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用：0-停用，1-启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_template_code (template_code),
    INDEX idx_notification_type (notification_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知模板表';

-- 初始化默认模板数据
INSERT INTO kb_notification_template (template_code, template_name, notification_type, title, content, variables, description, is_active) VALUES
('EMAIL_VERIFY_CODE', '邮箱验证码', 'EMAIL', '验证码 - {{systemName}}', '尊敬的{{userName}}，您的验证码是：{{verifyCode}}，5分钟内有效。', '["userName","verifyCode","systemName"]', '用于邮箱验证和找回密码场景', 1),
('DOCUMENT_APPROVED', '文档审核通过', 'SYSTEM', '您的文档《{{documentTitle}}》已通过审核', '您提交的文档《{{documentTitle}}》已通过审核，感谢您的贡献！', '["documentTitle"]', '文档审核通过时发送的通知', 1),
('DOCUMENT_REJECTED', '文档审核驳回', 'SYSTEM', '您的文档《{{documentTitle}}》需要修改', '您提交的文档《{{documentTitle}}》未通过审核，原因：{{rejectReason}}。请修改后重新提交。', '["documentTitle","rejectReason"]', '文档审核驳回时发送的通知', 1),
('NEW_COMMENT', '新评论通知', 'SYSTEM', '您的文档收到新评论', '{{commentUsername}} 评论了您的文档《{{documentTitle}}》：{{commentContent}}', '["commentUsername","documentTitle","commentContent"]', '文档收到新评论时的通知', 1),
('DOCUMENT_LIKED', '文档被点赞', 'SYSTEM', '您的文档收到新的点赞', '{{likeUsername}} 点赞了您的文档《{{documentTitle}}》', '["likeUsername","documentTitle"]', '文档被点赞时的通知', 1),
('WELCOME_MESSAGE', '欢迎消息', 'SYSTEM', '欢迎加入{{systemName}}', '尊敬的{{userName}}，欢迎加入{{systemName}}！我们期待您的贡献。', '["userName","systemName"]', '用户注册后的欢迎消息', 1);
