-- ================================================
-- 新服务数据库表创建脚本
-- ================================================

-- 1. AI服务相关表
USE knowledge_base_ai;

-- 对话表
CREATE TABLE IF NOT EXISTS conversation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    title VARCHAR(200) NOT NULL COMMENT '对话标题',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    model VARCHAR(50) NOT NULL COMMENT '模型名称',
    system_prompt TEXT COMMENT '系统提示词',
    tokens_used INT DEFAULT 0 COMMENT 'Token使用量',
    message_count INT DEFAULT 0 COMMENT '消息数量',
    status TINYINT DEFAULT 0 COMMENT '状态（0-进行中，1-已结束）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_user_id (user_id),
    INDEX idx_create_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话表';

-- 消息表
CREATE TABLE IF NOT EXISTS message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    conversation_id BIGINT NOT NULL COMMENT '对话ID',
    role VARCHAR(20) NOT NULL COMMENT '角色类型（system/user/assistant）',
    content TEXT NOT NULL COMMENT '消息内容',
    tokens INT DEFAULT 0 COMMENT 'Token数量',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_create_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI消息表';

-- AI反馈表
CREATE TABLE IF NOT EXISTS ai_feedback (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    conversation_id BIGINT NOT NULL COMMENT '对话ID',
    message_id BIGINT NOT NULL COMMENT '消息ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    feedback_type VARCHAR(20) NOT NULL COMMENT '反馈类型（positive/negative）',
    feedback_content TEXT COMMENT '反馈内容',
    rating INT COMMENT '评分（1-5分）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI反馈表';

-- 2. 统计服务相关表
USE knowledge_base_statistics;

-- 系统统计表
CREATE TABLE IF NOT EXISTS system_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    document_count INT DEFAULT 0 COMMENT '文档总数',
    user_count INT DEFAULT 0 COMMENT '用户总数',
    visit_count INT DEFAULT 0 COMMENT '访问总数',
    active_user_count INT DEFAULT 0 COMMENT '活跃用户数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统统计表';

-- 文档统计表
CREATE TABLE IF NOT EXISTS document_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    category_id BIGINT COMMENT '分类ID',
    create_count INT DEFAULT 0 COMMENT '创建数量',
    update_count INT DEFAULT 0 COMMENT '更新数量',
    delete_count INT DEFAULT 0 COMMENT '删除数量',
    view_count INT DEFAULT 0 COMMENT '浏览数量',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_stat_date (stat_date),
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档统计表';

-- 用户统计表
CREATE TABLE IF NOT EXISTS user_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    login_count INT DEFAULT 0 COMMENT '登录次数',
    document_create_count INT DEFAULT 0 COMMENT '文档创建数量',
    document_view_count INT DEFAULT 0 COMMENT '文档浏览数量',
    online_duration INT DEFAULT 0 COMMENT '在线时长（秒）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_stat_date (stat_date),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户统计表';

-- 3. 通知服务相关表
USE knowledge_base_notification;

-- 通知表
CREATE TABLE IF NOT EXISTS notification (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    title VARCHAR(200) NOT NULL COMMENT '通知标题',
    content TEXT NOT NULL COMMENT '通知内容',
    type VARCHAR(50) NOT NULL COMMENT '通知类型（system/user/document/review）',
    receiver_id BIGINT NOT NULL COMMENT '接收者ID',
    sender_id BIGINT COMMENT '发送者ID',
    is_read TINYINT DEFAULT 0 COMMENT '是否已读（0-未读，1-已读）',
    read_time DATETIME COMMENT '阅读时间',
    related_id BIGINT COMMENT '关联ID',
    related_type VARCHAR(50) COMMENT '关联类型',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_is_read (is_read),
    INDEX idx_create_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_template (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    code VARCHAR(50) NOT NULL COMMENT '模板代码',
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    title VARCHAR(200) NOT NULL COMMENT '通知标题模板',
    content TEXT NOT NULL COMMENT '通知内容模板',
    type VARCHAR(50) NOT NULL COMMENT '通知类型',
    status TINYINT DEFAULT 1 COMMENT '状态（0-禁用，1-启用）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知模板表';

-- 4. 公共模块相关表
USE knowledge_base_common;

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    module VARCHAR(100) COMMENT '操作模块',
    operation_type VARCHAR(50) COMMENT '操作类型',
    description VARCHAR(500) COMMENT '操作描述',
    method VARCHAR(200) COMMENT '请求方法',
    url VARCHAR(500) COMMENT '请求URL',
    params TEXT COMMENT '请求参数',
    result TEXT COMMENT '响应结果',
    user_id BIGINT COMMENT '操作用户ID',
    username VARCHAR(100) COMMENT '操作用户名',
    ip VARCHAR(50) COMMENT '操作用户IP',
    location VARCHAR(200) COMMENT '操作地点',
    browser VARCHAR(50) COMMENT '浏览器类型',
    os VARCHAR(50) COMMENT '操作系统',
    duration BIGINT COMMENT '执行时长（毫秒）',
    status TINYINT COMMENT '操作状态（0-失败，1-成功）',
    error_msg TEXT COMMENT '错误信息',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    tenant_id BIGINT COMMENT '租户ID',
    INDEX idx_user_id (user_id),
    INDEX idx_create_time (created_at),
    INDEX idx_module (module),
    INDEX idx_operation_type (operation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- 插入默认通知模板
INSERT INTO notification_template (code, name, title, content, type) VALUES
('DOCUMENT_REVIEW', '文档审核通知', '文档审核提醒', '您的文档《{documentTitle}》已提交审核，请耐心等待审核结果。', 'document'),
('DOCUMENT_APPROVED', '文档审核通过', '文档审核通过', '您的文档《{documentTitle}》已通过审核。', 'document'),
('DOCUMENT_REJECTED', '文档审核驳回', '文档审核驳回', '您的文档《{documentTitle}》未通过审核，原因：{reviewComment}', 'document'),
('SYSTEM_NOTICE', '系统通知', '{title}', '{content}', 'system');
