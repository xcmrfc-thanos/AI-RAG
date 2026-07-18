-- ========================================
-- 知识库系统补充表结构
-- 支持评论、审核、版本、团队、文件等新功能
-- ========================================

-- ========================================
-- 评论相关表
-- ========================================

-- 评论表
DROP TABLE IF EXISTS `tb_comment`;
CREATE TABLE `tb_comment` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '评论ID（雪花ID）',
    `document_id` BIGINT(20) NOT NULL COMMENT '文档ID',
    `parent_id` BIGINT(20) COMMENT '父评论ID',
    `root_id` BIGINT(20) COMMENT '根评论ID',

    `content` TEXT NOT NULL COMMENT '评论内容',

    `commenter_id` BIGINT(20) NOT NULL COMMENT '评论人ID',
    `commenter_name` VARCHAR(50) COMMENT '评论人姓名',
    `commenter_avatar` VARCHAR(500) COMMENT '评论人头像',

    `reply_to_user_id` BIGINT(20) COMMENT '回复给谁（用户ID）',
    `reply_to_user_name` VARCHAR(50) COMMENT '回复给谁（用户姓名）',

    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-隐藏，1-正常',

    `like_count` INT DEFAULT 0 COMMENT '点赞数',
    `reply_count` INT DEFAULT 0 COMMENT '回复数',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',

    KEY `idx_document_id` (`document_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_root_id` (`root_id`),
    KEY `idx_commenter_id` (`commenter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- 点赞表
DROP TABLE IF EXISTS `tb_like`;
CREATE TABLE `tb_like` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '点赞ID',
    `target_id` BIGINT(20) NOT NULL COMMENT '目标ID（文档或评论）',
    `target_type` TINYINT NOT NULL COMMENT '目标类型：1-文档，2-评论',
    `user_id` BIGINT(20) NOT NULL COMMENT '用户ID',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY `uk_target_user_type` (`target_id`, `user_id`, `target_type`),
    KEY `idx_target_id` (`target_id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞表';

-- 收藏表
DROP TABLE IF EXISTS `tb_favorite`;
CREATE TABLE `tb_favorite` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '收藏ID',
    `user_id` BIGINT(20) NOT NULL COMMENT '用户ID',
    `document_id` BIGINT(20) NOT NULL COMMENT '文档ID',

    `folder_name` VARCHAR(100) COMMENT '收藏夹名称',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',

    UNIQUE KEY `uk_user_doc` (`user_id`, `document_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- 浏览记录表
DROP TABLE IF EXISTS `tb_view_record`;
CREATE TABLE `tb_view_record` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '记录ID',
    `user_id` BIGINT(20) COMMENT '用户ID',
    `document_id` BIGINT(20) NOT NULL COMMENT '文档ID',

    `access_duration` INT DEFAULT 0 COMMENT '访问时长（秒）',
    `ip_address` VARCHAR(50) COMMENT 'IP地址',
    `user_agent` VARCHAR(500) COMMENT '用户代理',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',

    KEY `idx_user_id` (`user_id`),
    KEY `idx_document_id` (`document_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='浏览记录表';

-- ========================================
-- 文档审核相关表
-- ========================================

-- 文档审核记录表
DROP TABLE IF EXISTS `tb_document_review`;
CREATE TABLE `tb_document_review` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '审核记录ID（雪花ID）',
    `document_id` BIGINT(20) NOT NULL COMMENT '文档ID',

    `reviewer_id` BIGINT(20) NULL DEFAULT NULL COMMENT '审核人ID（提交审核时为NULL，审核时填入）',
    `reviewer_name` VARCHAR(50) COMMENT '审核人姓名',

    `review_result` TINYINT NULL COMMENT '审核结果：NULL-待审核，1-通过，2-驳回',
    `review_comment` TEXT COMMENT '审核意见',

    `before_status` TINYINT COMMENT '审核前状态',

    `reviewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '审核时间',

    `review_round` INT DEFAULT 1 COMMENT '审核轮次',
    `review_level` INT DEFAULT 1 COMMENT '审核级别（1=一级审核，预留多级扩展）',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    KEY `idx_document_id` (`document_id`),
    KEY `idx_reviewer_id` (`reviewer_id`),
    KEY `idx_reviewed_at` (`reviewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核记录表';

-- ========================================
-- 文档版本相关表
-- ========================================

-- 文档版本表
DROP TABLE IF EXISTS `tb_document_version`;
CREATE TABLE `tb_document_version` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '版本ID（雪花ID）',
    `document_id` BIGINT(20) NOT NULL COMMENT '文档ID',
    `version` INT NOT NULL COMMENT '版本号',

    `title` VARCHAR(200) COMMENT '文档标题',
    `content` LONGTEXT COMMENT '文档内容',
    `summary` VARCHAR(500) COMMENT '文档摘要',

    `change_description` VARCHAR(500) COMMENT '版本变更说明',
    `change_size` BIGINT COMMENT '变更大小（字节）',

    `operator_id` BIGINT(20) COMMENT '操作人ID',
    `operator_name` VARCHAR(50) COMMENT '操作人姓名',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY `uk_doc_version` (`document_id`, `version`),
    KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';

-- ========================================
-- 团队相关表
-- ========================================

-- 团队表
DROP TABLE IF EXISTS `tb_team`;
CREATE TABLE `tb_team` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '团队ID（雪花ID）',
    `team_name` VARCHAR(100) NOT NULL COMMENT '团队名称',
    `team_code` VARCHAR(50) NOT NULL COMMENT '团队编码',
    `description` VARCHAR(500) COMMENT '团队描述',

    `parent_id` BIGINT(20) COMMENT '父团队ID',
    `level` INT DEFAULT 1 COMMENT '团队层级',
    `path` VARCHAR(500) COMMENT '团队路径',

    `member_count` INT DEFAULT 0 COMMENT '成员数量',
    `doc_count` INT DEFAULT 0 COMMENT '文档数量',

    `leader_id` BIGINT(20) COMMENT '团队负责人ID',

    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',

    `created_by` BIGINT(20) COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_by` BIGINT(20) COMMENT '更新人ID',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',

    UNIQUE KEY `uk_team_code` (`team_code`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_leader_id` (`leader_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';

-- 团队成员表
DROP TABLE IF EXISTS `tb_team_member`;
CREATE TABLE `tb_team_member` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '成员ID',
    `team_id` BIGINT(20) NOT NULL COMMENT '团队ID',
    `user_id` BIGINT(20) NOT NULL COMMENT '用户ID',

    `member_role` TINYINT NOT NULL DEFAULT 2 COMMENT '成员角色：0-负责人，1-管理员，2-普通成员',

    `permissions` JSON COMMENT '团队内权限配置',

    `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',

    `created_by` BIGINT(20) COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_by` BIGINT(20) COMMENT '更新人ID',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',

    UNIQUE KEY `uk_team_user` (`team_id`, `user_id`),
    KEY `idx_team_id` (`team_id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';

-- ========================================
-- 文件相关表
-- ========================================

-- 文件表
DROP TABLE IF EXISTS `tb_file`;
CREATE TABLE `tb_file` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '文件ID（雪花ID）',

    `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
    `stored_name` VARCHAR(255) NOT NULL COMMENT '存储文件名',
    `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
    `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',

    `file_type` VARCHAR(20) NOT NULL COMMENT '文件类型：DOCUMENT, IMAGE, VIDEO, AUDIO, OTHER',
    `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME类型',

    `file_hash` VARCHAR(64) NOT NULL COMMENT '文件哈希（SHA-256）',

    `storage_type` VARCHAR(20) NOT NULL DEFAULT 'LOCAL' COMMENT '存储类型',
    `bucket_name` VARCHAR(100) COMMENT '存储桶名称',

    `uploader_id` BIGINT(20) COMMENT '上传者ID',

    `access_level` TINYINT DEFAULT 0 COMMENT '访问级别：0-私有，1-团队可见，2-公开',

    `download_count` INT DEFAULT 0 COMMENT '下载次数',

    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-删除，1-正常',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',

    UNIQUE KEY `uk_file_hash` (`file_hash`),
    KEY `idx_uploader_id` (`uploader_id`),
    KEY `idx_file_type` (`file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- ========================================
-- 系统配置表
-- ========================================

-- 系统配置表
DROP TABLE IF EXISTS `tb_system_config`;
CREATE TABLE `tb_system_config` (
    `id` BIGINT(20) PRIMARY KEY COMMENT '配置ID',
    `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
    `config_value` TEXT COMMENT '配置值',

    `config_group` VARCHAR(50) COMMENT '配置分组：AI、STORAGE、NOTIFICATION、SECURITY等',
    `config_type` VARCHAR(20) COMMENT '配置类型：STRING、NUMBER、BOOLEAN、JSON',

    `description` VARCHAR(500) COMMENT '配置描述',

    `created_by` BIGINT(20) COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_by` BIGINT(20) COMMENT '更新人ID',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY `uk_config_key` (`config_key`),
    KEY `idx_config_group` (`config_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ========================================
-- 初始化数据
-- ========================================

-- 初始化系统配置
INSERT INTO `tb_system_config` (`id`, `config_key`, `config_value`, `config_group`, `config_type`, `description`) VALUES
(9000000000000000001, 'qwen.api.key', '', 'AI', 'STRING', '千问API密钥'),
(9000000000000000002, 'qwen.model.name', 'qwen-max', 'AI', 'STRING', '千问模型名称'),
(9000000000000000003, 'qwen.embedding.model', 'text-embedding-v3', 'AI', 'STRING', '千问嵌入模型'),
(9000000000000000004, 'milvus.host', 'localhost', 'AI', 'STRING', 'Milvus主机地址'),
(9000000000000000005, 'milvus.port', '19530', 'AI', 'NUMBER', 'Milvus端口'),
(9000000000000000006, 'file.upload.max.size', '52428800', 'STORAGE', 'NUMBER', '文件上传最大大小（字节）'),
(9000000000000000007, 'file.upload.allowed.types', 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md', 'STORAGE', 'STRING', '允许上传的文件类型'),
(9000000000000000008, 'email.enabled', 'true', 'NOTIFICATION', 'BOOLEAN', '是否启用邮件通知'),
(9000000000000000009, 'email.host', 'smtp.example.com', 'NOTIFICATION', 'STRING', '邮件服务器地址'),
(9000000000000000010, 'email.port', '587', 'NOTIFICATION', 'NUMBER', '邮件服务器端口');
