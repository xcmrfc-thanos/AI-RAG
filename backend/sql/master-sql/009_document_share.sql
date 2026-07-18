-- 文档分享表
-- 用于存储文档分享信息，包括分享链接、有效期、访问权限等

CREATE TABLE IF NOT EXISTS `kb_document_share` (
    `id` BIGINT NOT NULL COMMENT '主键ID（雪花算法）',
    `share_id` VARCHAR(32) NOT NULL COMMENT '分享ID（唯一标识，用于分享链接）',
    `document_id` BIGINT NOT NULL COMMENT '文档ID',
    `title` VARCHAR(255) DEFAULT NULL COMMENT '分享标题',
    `share_type` TINYINT DEFAULT 1 COMMENT '分享类型（1-公开链接，2-私信分享）',
    `share_code` VARCHAR(32) DEFAULT NULL COMMENT '分享码（可选，用于增加安全性）',
    `expire_type` TINYINT DEFAULT 1 COMMENT '有效期类型（1-永久，2-限时）',
    `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
    `access_limit` INT DEFAULT 0 COMMENT '访问次数限制（0-不限制）',
    `access_count` INT DEFAULT 0 COMMENT '已访问次数',
    `require_password` TINYINT DEFAULT 0 COMMENT '是否需要密码（0-否，1-是）',
    `password` VARCHAR(64) DEFAULT NULL COMMENT '访问密码（MD5加密）',
    `sharer_id` BIGINT DEFAULT NULL COMMENT '分享人ID',
    `sharer_name` VARCHAR(64) DEFAULT NULL COMMENT '分享人名称',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '分享描述',
    `status` TINYINT DEFAULT 0 COMMENT '状态（0-有效，1-已失效，2-已删除）',
    `share_time` DATETIME DEFAULT NULL COMMENT '分享时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除标记（0-未删除，1-已删除）',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_share_id` (`share_id`),
    KEY `idx_document_id` (`document_id`),
    KEY `idx_sharer_id` (`sharer_id`),
    KEY `idx_status` (`status`),
    KEY `idx_share_time` (`share_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分享表';
