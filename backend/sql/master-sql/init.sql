-- ========================================
-- 知识库系统数据库初始化脚本
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `knowledge_base` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `knowledge_base`;

-- ========================================
-- 用户认证相关表
-- ========================================

-- 用户表
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
    `id` BIGINT NOT NULL COMMENT '用户ID（雪花算法）',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `gender` TINYINT DEFAULT 0 COMMENT '性别（0-未知，1-男，2-女）',
    `status` TINYINT DEFAULT 1 COMMENT '状态（0-禁用，1-启用）',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `dept_id` BIGINT DEFAULT NULL COMMENT '部门ID',
    `post_id` BIGINT DEFAULT NULL COMMENT '岗位ID',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除（0-未删除，1-已删除）',
    `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_email` (`email`),
    KEY `idx_phone` (`phone`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 角色表
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
    `id` BIGINT NOT NULL COMMENT '角色ID（雪花算法）',
    `role_name` VARCHAR(50) NOT NULL COMMENT '角色名称',
    `role_code` VARCHAR(50) NOT NULL COMMENT '角色编码',
    `description` VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `status` TINYINT DEFAULT 1 COMMENT '状态（0-禁用，1-启用）',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除（0-未删除，1-已删除）',
    `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表
DROP TABLE IF EXISTS `sys_permission`;
CREATE TABLE `sys_permission` (
    `id` BIGINT NOT NULL COMMENT '权限ID（雪花算法）',
    `parent_id` BIGINT DEFAULT 0 COMMENT '父权限ID',
    `permission_name` VARCHAR(50) NOT NULL COMMENT '权限名称',
    `permission_code` VARCHAR(100) NOT NULL COMMENT '权限编码',
    `permission_type` TINYINT DEFAULT 1 COMMENT '权限类型（1-菜单，2-按钮）',
    `path` VARCHAR(200) DEFAULT NULL COMMENT '权限路径',
    `component` VARCHAR(200) DEFAULT NULL COMMENT '组件路径',
    `icon` VARCHAR(100) DEFAULT NULL COMMENT '图标',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `status` TINYINT DEFAULT 1 COMMENT '状态（0-禁用，1-启用）',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除（0-未删除，1-已删除）',
    `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    PRIMARY KEY (`id`),
    KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户角色关联表
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色权限关联表
DROP TABLE IF EXISTS `sys_role_permission`;
CREATE TABLE `sys_role_permission` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `permission_id` BIGINT NOT NULL COMMENT '权限ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ========================================
-- 文档相关表
-- ========================================

-- 文档分类表
DROP TABLE IF EXISTS `kb_category`;
CREATE TABLE `kb_category` (
    `id` BIGINT NOT NULL COMMENT '分类ID（雪花算法）',
    `parent_id` BIGINT DEFAULT 0 COMMENT '父分类ID（0表示根分类）',
    `category_name` VARCHAR(50) NOT NULL COMMENT '分类名称',
    `category_code` VARCHAR(50) NOT NULL COMMENT '分类编码',
    `description` VARCHAR(200) DEFAULT NULL COMMENT '分类描述',
    `icon` VARCHAR(100) DEFAULT NULL COMMENT '图标',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `status` TINYINT DEFAULT 1 COMMENT '状态（0-禁用，1-启用）',
    `document_count` INT DEFAULT 0 COMMENT '文档数量',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除（0-未删除，1-已删除）',
    `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_category_code` (`category_code`),
    KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分类表';

-- 文档表
DROP TABLE IF EXISTS `kb_document`;
CREATE TABLE `kb_document` (
    `id` BIGINT NOT NULL COMMENT '文档ID（雪花算法）',
    `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
    `summary` VARCHAR(500) DEFAULT NULL COMMENT '文档摘要',
    `content` LONGTEXT COMMENT '文档内容',
    `document_type` TINYINT DEFAULT 1 COMMENT '文档类型（1-文章，2-文件）',
    `file_path` VARCHAR(500) DEFAULT NULL COMMENT '文件路径',
    `file_size` BIGINT DEFAULT NULL COMMENT '文件大小（字节）',
    `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名',
    `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
    `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
    `tags` VARCHAR(200) DEFAULT NULL COMMENT '标签（逗号分隔）',
    `status` TINYINT DEFAULT 0 COMMENT '状态（0-草稿，1-已发布，2-已归档）',
    `is_top` TINYINT DEFAULT 0 COMMENT '是否置顶（0-否，1-是）',
    `is_recommend` TINYINT DEFAULT 0 COMMENT '是否推荐（0-否，1-是）',
    `view_count` BIGINT DEFAULT 0 COMMENT '浏览次数',
    `like_count` BIGINT DEFAULT 0 COMMENT '点赞次数',
    `favorite_count` BIGINT DEFAULT 0 COMMENT '收藏次数',
    `comment_count` BIGINT DEFAULT 0 COMMENT '评论次数',
    `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
    `author_id` BIGINT DEFAULT NULL COMMENT '作者ID',
    `author_name` VARCHAR(50) DEFAULT NULL COMMENT '作者名称',
    `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图URL',
    `source` TINYINT DEFAULT 1 COMMENT '来源（1-原创，2-转载，3-翻译）',
    `source_url` VARCHAR(500) DEFAULT NULL COMMENT '来源URL',
    `allow_comment` TINYINT DEFAULT 1 COMMENT '允许评论（0-否，1-是）',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除（0-未删除，1-已删除）',
    `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    PRIMARY KEY (`id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_author_id` (`author_id`),
    KEY `idx_status` (`status`),
    KEY `idx_publish_time` (`publish_time`),
    FULLTEXT KEY `ft_title_content` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';

-- 文档标签表
DROP TABLE IF EXISTS `kb_tag`;
CREATE TABLE `kb_tag` (
    `id` BIGINT NOT NULL COMMENT '标签ID（雪花算法）',
    `tag_name` VARCHAR(50) NOT NULL COMMENT '标签名称',
    `tag_count` INT DEFAULT 0 COMMENT '文档数量',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tag_name` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签表';

-- ========================================
-- 初始化数据
-- ========================================

-- 插入默认管理员用户（密码：123456）
INSERT INTO `sys_user` (`id`, `username`, `password`, `nickname`, `email`, `status`)
VALUES (1234567890123456789, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', '系统管理员', 'admin@knowledge-base.com', 1);

-- 插入默认角色
INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `description`, `sort`)
VALUES
(1234567890123456790, '超级管理员', 'ROLE_ADMIN', '系统超级管理员，拥有所有权限', 1),
(1234567890123456791, '普通用户', 'ROLE_USER', '系统普通用户', 2);

-- 插入管理员角色关联
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`)
VALUES (1234567890123456792, 1234567890123456789, 1234567890123456790);

-- 插入默认文档分类
INSERT INTO `kb_category` (`id`, `parent_id`, `category_name`, `category_code`, `description`, `sort`)
VALUES
(1234567890123456793, 0, '技术文档', 'TECH', '技术相关文档', 1),
(1234567890123456794, 0, '产品文档', 'PRODUCT', '产品相关文档', 2),
(1234567890123456795, 0, '运营文档', 'OPERATION', '运营相关文档', 3);

-- ========================================
-- 创建视图
-- ========================================

-- 文档列表视图
CREATE OR REPLACE VIEW `v_document_list` AS
SELECT
    d.id,
    d.title,
    d.summary,
    d.document_type,
    d.status,
    d.view_count,
    d.like_count,
    d.comment_count,
    d.publish_time,
    d.author_id,
    d.author_name,
    d.cover_image,
    d.created_at,
    c.category_name,
    c.id as category_id
FROM kb_document d
LEFT JOIN kb_category c ON d.category_id = c.id
WHERE d.deleted = 0;

-- ========================================
-- 索引优化
-- ========================================

-- 文档表复合索引
CREATE INDEX idx_doc_status_top_sort ON kb_document(status, is_top, sort, publish_time);
CREATE INDEX idx_doc_category_status ON kb_document(category_id, status);

-- 用户表复合索引
CREATE INDEX idx_user_status_deleted ON sys_user(status, deleted);
