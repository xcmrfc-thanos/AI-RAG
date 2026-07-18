-- =====================================================
-- 企业知识库系统 - 完整数据库导出脚本
-- Generated: 2026-06-16
-- 包含: 建库、建表、初始化数据、权限清理
--
-- 使用方法:
--   mysql -u root -p < knowledge_base_export_2026-06-16.sql
--
-- 重要说明:
--   1. 本脚本会删除并重建所有表（使用 DROP TABLE IF EXISTS）
--   2. 数据库使用 CREATE DATABASE IF NOT EXISTS（不会删除已有数据库）
--   3. 默认管理员密码: admin123 (BCrypt加密)
--   4. 所有表结构和初始化数据均已整合到本脚本中
--   5. 执行顺序已按依赖关系排列，可直接全量执行
--   6. 可重复执行（所有 INSERT 均使用固定 ID）
-- =====================================================

-- =====================================================
-- 企业知识库系统 - 完整建表脚本 (DDL)
-- =====================================================
-- 版本: 1.0
-- 数据库: MySQL 8.0+
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- =====================================================
-- 执行说明:
--   1. 使用 MySQL root 或有 CREATE DATABASE 权限的账户执行
--   2. 本脚本会创建 10 个微服务数据库并在各库中建表
--   3. 执行顺序已按依赖关系排列,可直接全量执行
--   4. 所有 CREATE TABLE 均使用 DROP TABLE IF EXISTS,可重复执行
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 第一部分: 创建数据库
-- =====================================================

CREATE DATABASE IF NOT EXISTS `kb_user`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_document`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_search`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_file`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_ai`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_statistics`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_notification`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_graph`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_common`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;

CREATE DATABASE IF NOT EXISTS `kb_foundation`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
;


-- =====================================================
-- 第二部分: kb_user 数据库 - 用户认证模块
-- =====================================================

USE `kb_user`;

-- 用户表
DROP TABLE IF EXISTS `kb_user`;
CREATE TABLE `kb_user` (
  `id` BIGINT NOT NULL COMMENT '用户ID（雪花算法）',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（BCrypt加密）',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `email_verified` TINYINT NOT NULL DEFAULT 0 COMMENT '邮箱是否已验证：0-未验证，1-已验证',
  `activation_token` VARCHAR(255) DEFAULT NULL COMMENT '账户激活令牌',
  `activation_token_expiry` DATETIME DEFAULT NULL COMMENT '激活令牌过期时间',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '部门',
  `position` VARCHAR(100) DEFAULT NULL COMMENT '职位',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '个人简介/备注',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识：0-未删除，1-已删除',
  `tenant_id` BIGINT DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`, `deleted`, `tenant_id`),
  UNIQUE KEY `uk_email` (`email`, `deleted`, `tenant_id`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 角色表
DROP TABLE IF EXISTS `kb_role`;
CREATE TABLE `kb_role` (
  `id` BIGINT NOT NULL COMMENT '角色ID（雪花算法）',
  `role_name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`, `deleted`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表
DROP TABLE IF EXISTS `kb_permission`;
CREATE TABLE `kb_permission` (
  `id` BIGINT NOT NULL COMMENT '权限ID（雪花算法）',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父权限ID',
  `permission_name` VARCHAR(50) NOT NULL COMMENT '权限名称',
  `permission_code` VARCHAR(100) NOT NULL COMMENT '权限编码',
  `permission_type` TINYINT NOT NULL COMMENT '权限类型：1-菜单，2-按钮，3-接口',
  `menu_url` VARCHAR(200) DEFAULT NULL COMMENT '菜单URL',
  `api_url` VARCHAR(500) DEFAULT NULL COMMENT '接口URL',
  `method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法：GET,POST,PUT,DELETE',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识：0-未删除，1-已删除',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_permission_type` (`permission_type`),
  KEY `idx_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户角色关联表
DROP TABLE IF EXISTS `kb_user_role`;
CREATE TABLE `kb_user_role` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色权限关联表
DROP TABLE IF EXISTS `kb_role_permission`;
CREATE TABLE `kb_role_permission` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户权限关联表（直接分配给用户的权限）
DROP TABLE IF EXISTS `kb_user_permission`;
CREATE TABLE `kb_user_permission` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';

-- 团队表
DROP TABLE IF EXISTS `kb_team`;
CREATE TABLE `kb_team` (
  `id` BIGINT NOT NULL COMMENT '团队ID',
  `team_name` VARCHAR(100) NOT NULL COMMENT '团队名称',
  `team_code` VARCHAR(50) DEFAULT NULL COMMENT '团队编码',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '团队描述',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '团队图标标识',
  `leader_id` BIGINT DEFAULT NULL COMMENT '团队负责人ID',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父团队ID',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `level` INT NOT NULL DEFAULT 0 COMMENT '层级',
  `path` VARCHAR(500) NULL COMMENT '团队路径',
  `member_count` INT NOT NULL DEFAULT 0 COMMENT '成员数量',
  `doc_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_code` (`team_code`, `deleted`),
  KEY `idx_leader_id` (`leader_id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';

-- 团队成员表
DROP TABLE IF EXISTS `kb_team_member`;
CREATE TABLE `kb_team_member` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `team_id` BIGINT NOT NULL COMMENT '团队ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `member_role` VARCHAR(20) NOT NULL DEFAULT 'member' COMMENT '成员角色：leader-负责人，member-成员',
  `join_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '添加人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_user` (`team_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';

-- Token黑名单表
DROP TABLE IF EXISTS `tb_token_blacklist`;
CREATE TABLE `tb_token_blacklist` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token哈希值',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';


-- =====================================================
-- 第三部分: kb_document 数据库 - 文档管理模块
-- =====================================================

USE `kb_document`;

-- 文档分类表
DROP TABLE IF EXISTS `kb_category`;
CREATE TABLE `kb_category` (
  `id` BIGINT NOT NULL COMMENT '分类ID',
  `category_name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `category_code` VARCHAR(50) NULL COMMENT '分类编码',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父分类ID',
  `category_icon` VARCHAR(50) DEFAULT 'tech' COMMENT '分类图标标识',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分类描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `document_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分类表';

-- 文档标签表
DROP TABLE IF EXISTS `tb_tag`;
CREATE TABLE `tb_tag` (
  `id` BIGINT NOT NULL COMMENT '标签ID',
  `tag_name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `tag_color` VARCHAR(20) DEFAULT '#1890ff' COMMENT '标签颜色',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '标签描述',
  `use_count` INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_name` (`tag_name`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签表';

-- 文档表
DROP TABLE IF EXISTS `kb_document`;
CREATE TABLE `kb_document` (
  `id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
  `content` LONGTEXT NULL COMMENT '文档内容',
  `content_id` VARCHAR(64) NULL COMMENT '内容ID（文件内容关联）',
  `content_length` INT NULL COMMENT '内容长度',
  `summary` TEXT DEFAULT NULL COMMENT '文档摘要',
  `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
  `team_id` BIGINT DEFAULT NULL COMMENT '团队空间ID',
  `author_id` BIGINT NOT NULL COMMENT '作者ID',
  `author_name` VARCHAR(50) DEFAULT NULL COMMENT '作者名称',
  `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
  `tags` VARCHAR(500) NULL COMMENT '文档标签（逗号分隔）',
  `remark` VARCHAR(500) NULL COMMENT '文档备注',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-草稿，1-已发布，2-已归档',
  `is_public` TINYINT NOT NULL DEFAULT 1 COMMENT '是否公开：0-私有，1-公开',
  `is_top` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶：0-否，1-是',
  `is_recommend` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐：0-否，1-是',
  `allow_comment` TINYINT NOT NULL DEFAULT 1 COMMENT '允许评论：0-否，1-是',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论次数',
  `favorite_count` INT NOT NULL DEFAULT 0 COMMENT '收藏次数',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `word_count` INT DEFAULT NULL COMMENT '字数统计',
  `document_type` TINYINT DEFAULT 1 COMMENT '文档类型：1-文章，2-文件',
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT '文件路径',
  `file_size` BIGINT DEFAULT NULL COMMENT '文件大小（字节）',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名',
  `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `source` TINYINT DEFAULT 1 COMMENT '来源：1-原创，2-转载，3-翻译',
  `source_url` VARCHAR(500) DEFAULT NULL COMMENT '来源URL',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_title` (`title`(100)),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_publish_time` (`publish_time`),
  KEY `idx_create_time` (`created_at`),
  FULLTEXT KEY `ft_content` (`title`, `summary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';

-- 文档标签关联表
DROP TABLE IF EXISTS `kb_document_tag`;
CREATE TABLE `kb_document_tag` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `tag_id` BIGINT NOT NULL COMMENT '标签ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_tag` (`document_id`, `tag_id`),
  KEY `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签关联表';

-- 文档版本表
DROP TABLE IF EXISTS `tb_document_version`;
CREATE TABLE `tb_document_version` (
  `id` BIGINT NOT NULL COMMENT '版本ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `version` INT NOT NULL COMMENT '版本号',
  `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
  `content` LONGTEXT NOT NULL COMMENT '文档内容',
  `summary` VARCHAR(500) DEFAULT NULL COMMENT '文档摘要',
  `change_description` VARCHAR(500) DEFAULT NULL COMMENT '版本变更说明',
  `change_size` BIGINT DEFAULT NULL COMMENT '变更大小(字节)',
  `operator_id` BIGINT DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';

-- 文档评论表
DROP TABLE IF EXISTS `tb_comment`;
CREATE TABLE `tb_comment` (
  `id` BIGINT NOT NULL COMMENT '评论ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `content` TEXT NOT NULL COMMENT '评论内容',
  `user_id` BIGINT NOT NULL COMMENT '评论用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '评论用户姓名',
  `user_avatar` VARCHAR(500) DEFAULT NULL COMMENT '评论用户头像',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父评论ID',
  `reply_to_id` BIGINT DEFAULT NULL COMMENT '回复的评论ID',
  `reply_to_name` VARCHAR(50) DEFAULT NULL COMMENT '回复的用户名',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞数',
  `reply_count` INT NOT NULL DEFAULT 0 COMMENT '回复数',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-隐藏，1-显示',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档评论表';

-- 文档审核表
DROP TABLE IF EXISTS `tb_document_review`;
CREATE TABLE `tb_document_review` (
  `id` BIGINT NOT NULL COMMENT '审核ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `reviewer_id` BIGINT DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  `review_result` INT DEFAULT NULL COMMENT '审核结果：1-通过，2-驳回',
  `review_round` INT DEFAULT 1 COMMENT '审核轮次',
  `review_comment` TEXT DEFAULT NULL COMMENT '审核意见',
  `before_status` INT DEFAULT NULL COMMENT '审核前状态',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间',
  `review_level` INT DEFAULT 1 COMMENT '审核级别',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_reviewer_id` (`reviewer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核表';

-- 文档访问记录表
DROP TABLE IF EXISTS `kb_document_access`;
CREATE TABLE `kb_document_access` (
  `id` BIGINT NOT NULL COMMENT '访问记录ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
  `category_name` VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
  `access_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT '访问IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_document` (`user_id`, `document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_access_time` (`access_time`),
  KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档访问记录表';

-- 文档分享表
DROP TABLE IF EXISTS `kb_document_share`;
CREATE TABLE `kb_document_share` (
  `id` BIGINT NOT NULL COMMENT '主键ID（雪花算法）',
  `share_id` VARCHAR(32) NOT NULL COMMENT '分享ID（唯一标识）',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(255) DEFAULT NULL COMMENT '分享标题',
  `share_type` TINYINT DEFAULT 1 COMMENT '分享类型：1-公开链接，2-私信分享',
  `share_code` VARCHAR(32) DEFAULT NULL COMMENT '分享码',
  `expire_type` TINYINT DEFAULT 1 COMMENT '有效期类型：1-永久，2-限时',
  `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
  `access_limit` INT DEFAULT 0 COMMENT '访问次数限制（0-不限制）',
  `access_count` INT DEFAULT 0 COMMENT '已访问次数',
  `require_password` TINYINT DEFAULT 0 COMMENT '是否需要密码：0-否，1-是',
  `password` VARCHAR(64) DEFAULT NULL COMMENT '访问密码（MD5加密）',
  `sharer_id` BIGINT DEFAULT NULL COMMENT '分享人ID',
  `sharer_name` VARCHAR(64) DEFAULT NULL COMMENT '分享人名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分享描述',
  `status` TINYINT DEFAULT 0 COMMENT '状态：0-有效，1-已失效，2-已删除',
  `share_time` DATETIME DEFAULT NULL COMMENT '分享时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_id` (`share_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_sharer_id` (`sharer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_share_time` (`share_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分享表';

-- 用户收藏表
DROP TABLE IF EXISTS `kb_user_favorite`;
CREATE TABLE `kb_user_favorite` (
  `id` BIGINT NOT NULL COMMENT '收藏ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `document_category_id` BIGINT DEFAULT NULL COMMENT '文档分类ID',
  `favorite_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_document` (`user_id`, `document_id`, `deleted`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_favorite_time` (`favorite_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

-- 文件元数据表
DROP TABLE IF EXISTS `kb_file_metadata`;
CREATE TABLE `kb_file_metadata` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名称',
  `original_file_name` VARCHAR(255) NOT NULL COMMENT '文件原始名称',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名',
  `file_size` BIGINT DEFAULT NULL COMMENT '文件大小（字节）',
  `content_type` VARCHAR(100) DEFAULT NULL COMMENT '文件类型（MIME类型）',
  `storage_path` VARCHAR(500) DEFAULT NULL COMMENT '文件存储路径',
  `access_url` VARCHAR(500) DEFAULT NULL COMMENT '文件访问URL',
  `file_category` VARCHAR(50) DEFAULT NULL COMMENT '文件分类（image, document, video, audio, other）',
  `uploader_id` BIGINT DEFAULT NULL COMMENT '上传用户ID',
  `uploader_name` VARCHAR(50) DEFAULT NULL COMMENT '上传用户名称',
  `file_md5` VARCHAR(64) DEFAULT NULL COMMENT '文件MD5',
  `file_sha256` VARCHAR(128) DEFAULT NULL COMMENT '文件SHA256',
  `width` INT DEFAULT NULL COMMENT '文件宽度（图片）',
  `height` INT DEFAULT NULL COMMENT '文件高度（图片）',
  `thumbnail_url` VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL',
  `is_public` TINYINT DEFAULT 1 COMMENT '是否公开',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `last_access_time` DATETIME DEFAULT NULL COMMENT '最后访问时间',
  `upload_status` VARCHAR(50) DEFAULT 'completed' COMMENT '文件状态（uploading, completed, failed）',
  `error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_category` (`file_category`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件元数据表';


-- =====================================================
-- 第四部分: kb_search 数据库 - 搜索模块
-- =====================================================

USE `kb_search`;

-- 搜索历史表
DROP TABLE IF EXISTS `kb_search_history`;
CREATE TABLE `kb_search_history` (
  `id` BIGINT NOT NULL COMMENT '搜索历史ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `keyword` VARCHAR(200) NOT NULL COMMENT '搜索关键词',
  `search_count` INT DEFAULT 0 COMMENT '搜索次数',
  `search_type` VARCHAR(20) NOT NULL DEFAULT 'document' COMMENT '搜索类型：document-文档，user-用户',
  `result_count` INT DEFAULT 0 COMMENT '结果数量',
  `search_params` JSON DEFAULT NULL COMMENT '搜索参数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_keyword` (`keyword`(100)),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';


-- =====================================================
-- 第五部分: kb_file 数据库 - 文件管理模块
-- =====================================================

USE `kb_file`;

-- 文件信息表
DROP TABLE IF EXISTS `tb_file`;
CREATE TABLE `tb_file` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `stored_name` VARCHAR(255) NOT NULL COMMENT '存储文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_size` BIGINT NOT NULL COMMENT '文件大小（字节）',
  `file_type` VARCHAR(50) NOT NULL COMMENT '文件类型',
  `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `file_hash` VARCHAR(128) DEFAULT NULL COMMENT '文件哈希',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'local' COMMENT '存储类型：local-本地，oss-对象存储',
  `bucket_name` VARCHAR(100) DEFAULT NULL COMMENT '存储桶名称',
  `uploader_id` BIGINT NOT NULL COMMENT '上传者ID',
  `access_level` INT NOT NULL DEFAULT 0 COMMENT '访问级别：0-私有，1-团队可见，2-公开',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `status` INT NOT NULL DEFAULT 1 COMMENT '状态：0-删除，1-正常',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `duration` INT DEFAULT NULL COMMENT '时长（秒），音视频文件专用',
  `resolution` VARCHAR(50) DEFAULT NULL COMMENT '分辨率',
  `bitrate` INT DEFAULT NULL COMMENT '码率（kbps）',
  `transcode_status` VARCHAR(20) DEFAULT NULL COMMENT '转码状态：PENDING/PROCESSING/DONE/FAILED',
  `hls_path` VARCHAR(500) DEFAULT NULL COMMENT 'HLS播放列表路径',
  `thumbnail_path` VARCHAR(500) DEFAULT NULL COMMENT '缩略图路径',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_file_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';


-- =====================================================
-- 第六部分: kb_notification 数据库 - 通知模块
-- =====================================================

USE `kb_notification`;

-- 系统通知表
DROP TABLE IF EXISTS `kb_notification`;
CREATE TABLE `kb_notification` (
  `id` BIGINT NOT NULL COMMENT '通知ID',
  `user_id` BIGINT NOT NULL COMMENT '接收用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '接收用户姓名',
  `notification_type` VARCHAR(20) NOT NULL COMMENT '通知类型：system-系统，comment-评论，mention-提及，review-审核，like-点赞',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `link` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';


-- =====================================================
-- 第七部分: kb_ai 数据库 - AI模块
-- =====================================================

USE `kb_ai`;

-- AI对话表
DROP TABLE IF EXISTS `conversation`;
CREATE TABLE `conversation` (
  `id` BIGINT NOT NULL COMMENT '对话ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户名称',
  `title` VARCHAR(200) NOT NULL COMMENT '对话标题',
  `model_name` VARCHAR(50) DEFAULT 'qwen' COMMENT 'AI模型名称',
  `message_count` INT DEFAULT 0 COMMENT '消息数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_update_time` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话表';

-- AI消息表
DROP TABLE IF EXISTS `message`;
CREATE TABLE `message` (
  `id` BIGINT NOT NULL COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色：user-用户，assistant-助手，system-系统',
  `content` LONGTEXT NOT NULL COMMENT '消息内容',
  `tokens` INT DEFAULT NULL COMMENT 'Token数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息表';

-- AI反馈表
DROP TABLE IF EXISTS `ai_feedback`;
CREATE TABLE `ai_feedback` (
  `id` BIGINT NOT NULL COMMENT '反馈ID',
  `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
  `message_id` BIGINT NOT NULL COMMENT '消息ID',
  `feedback_type` VARCHAR(20) NOT NULL COMMENT '反馈类型：like-点赞，dislike-点踩',
  `comment` TEXT DEFAULT NULL COMMENT '反馈意见',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI反馈表';


-- =====================================================
-- 第八部分: kb_statistics 数据库 - 统计模块
-- =====================================================

USE `kb_statistics`;

-- 文档统计表
DROP TABLE IF EXISTS `kb_document_statistics`;
CREATE TABLE `kb_document_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论次数',
  `favorite_count` INT NOT NULL DEFAULT 0 COMMENT '收藏次数',
  `share_count` INT NOT NULL DEFAULT 0 COMMENT '分享次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_date` (`document_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档统计表';

-- 用户统计表
DROP TABLE IF EXISTS `kb_user_statistics`;
CREATE TABLE `kb_user_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名',
  `document_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论数量',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `login_count` INT NOT NULL DEFAULT 0 COMMENT '登录次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计表';

-- 浏览记录表（旧）
DROP TABLE IF EXISTS `kb_view_record`;
CREATE TABLE `kb_view_record` (
  `id` BIGINT NOT NULL COMMENT '记录ID',
  `user_id` BIGINT DEFAULT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `view_duration` INT DEFAULT NULL COMMENT '浏览时长（秒）',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='浏览记录表';

-- 浏览历史记录表（新）
DROP TABLE IF EXISTS `kb_view_history`;
CREATE TABLE `kb_view_history` (
  `id` BIGINT NOT NULL COMMENT '记录ID（雪花算法生成）',
  `user_id` BIGINT DEFAULT NULL COMMENT '用户ID（未登录为NULL）',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `view_duration` INT DEFAULT NULL COMMENT '浏览时长（秒）',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_user_document` (`user_id`, `document_id`),
  KEY `idx_doc_date` (`document_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户浏览历史记录表';

-- 评论统计表
DROP TABLE IF EXISTS `kb_comment_statistics`;
CREATE TABLE `kb_comment_statistics` (
  `id` BIGINT NOT NULL COMMENT '统计ID',
  `comment_id` BIGINT NOT NULL COMMENT '评论ID',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `reply_count` INT NOT NULL DEFAULT 0 COMMENT '回复次数',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comment_date` (`comment_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论统计表';


-- =====================================================
-- 第九部分: kb_common 数据库 - 公共模块
-- =====================================================

USE `kb_common`;

-- 操作日志表
DROP TABLE IF EXISTS `kb_operation_log`;
CREATE TABLE `kb_operation_log` (
  `id` BIGINT NOT NULL COMMENT '日志ID',
  `module` VARCHAR(50) NOT NULL COMMENT '模块名称',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `operation_desc` VARCHAR(500) NOT NULL COMMENT '操作描述',
  `request_method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
  `request_url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` TEXT DEFAULT NULL COMMENT '请求参数',
  `response_result` TEXT DEFAULT NULL COMMENT '响应结果',
  `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '操作用户名',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `location` VARCHAR(200) DEFAULT NULL COMMENT '地理位置',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `execute_time` INT DEFAULT NULL COMMENT '执行时长（毫秒）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-失败，1-成功',
  `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 系统配置表
DROP TABLE IF EXISTS `kb_system_config`;
CREATE TABLE `kb_system_config` (
  `id` BIGINT NOT NULL COMMENT '配置ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT NOT NULL COMMENT '配置值',
  `config_type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '配置类型：string-字符串，number-数字，boolean-布尔，json-JSON',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '配置分类',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '配置描述',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开：0-否，1-是',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 字典表
DROP TABLE IF EXISTS `kb_dict`;
CREATE TABLE `kb_dict` (
  `id` BIGINT NOT NULL COMMENT '字典ID',
  `dict_code` VARCHAR(50) NOT NULL COMMENT '字典编码',
  `dict_name` VARCHAR(100) NOT NULL COMMENT '字典名称',
  `dict_type` VARCHAR(50) NOT NULL COMMENT '字典类型',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`),
  KEY `idx_dict_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';

-- 字典数据表
DROP TABLE IF EXISTS `kb_dict_data`;
CREATE TABLE `kb_dict_data` (
  `id` BIGINT NOT NULL COMMENT '字典数据ID',
  `dict_id` BIGINT NOT NULL COMMENT '字典ID',
  `dict_label` VARCHAR(100) NOT NULL COMMENT '字典标签',
  `dict_value` VARCHAR(200) NOT NULL COMMENT '字典值',
  `dict_sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `css_class` VARCHAR(100) DEFAULT NULL COMMENT '样式类名',
  `list_class` VARCHAR(100) DEFAULT NULL COMMENT '列表样式',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认：0-否，1-是',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';


-- =====================================================
-- 第十部分: kb_foundation 数据库 - 基础服务
-- =====================================================

USE `kb_foundation`;

-- 系统配置表（基础服务）
DROP TABLE IF EXISTS `kb_system_config`;
CREATE TABLE `kb_system_config` (
  `id` BIGINT NOT NULL COMMENT '配置ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT NOT NULL COMMENT '配置值',
  `config_type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '配置类型',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '配置分类',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '配置描述',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 字典表
DROP TABLE IF EXISTS `kb_dict`;
CREATE TABLE `kb_dict` (
  `id` BIGINT NOT NULL COMMENT '字典ID',
  `dict_code` VARCHAR(50) NOT NULL COMMENT '字典编码',
  `dict_name` VARCHAR(100) NOT NULL COMMENT '字典名称',
  `dict_type` VARCHAR(50) NOT NULL COMMENT '字典类型',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`),
  KEY `idx_dict_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';

-- 字典数据表
DROP TABLE IF EXISTS `kb_dict_data`;
CREATE TABLE `kb_dict_data` (
  `id` BIGINT NOT NULL COMMENT '字典数据ID',
  `dict_id` BIGINT NOT NULL COMMENT '字典ID',
  `dict_code` VARCHAR(50) DEFAULT NULL COMMENT '字典编码（冗余）',
  `dict_label` VARCHAR(100) NOT NULL COMMENT '字典标签',
  `dict_value` VARCHAR(200) NOT NULL COMMENT '字典值',
  `dict_sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `css_class` VARCHAR(100) DEFAULT NULL COMMENT '样式类名',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';

-- 系统通知表
DROP TABLE IF EXISTS `kb_notification`;
CREATE TABLE `kb_notification` (
  `id` BIGINT NOT NULL COMMENT '通知ID',
  `user_id` BIGINT NOT NULL COMMENT '接收用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '接收用户姓名',
  `notification_type` VARCHAR(20) NOT NULL COMMENT '通知类型',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `link` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';

-- 操作日志表
DROP TABLE IF EXISTS `kb_operation_log`;
CREATE TABLE `kb_operation_log` (
  `id` BIGINT NOT NULL COMMENT '日志ID',
  `module` VARCHAR(100) DEFAULT NULL COMMENT '操作模块',
  `operation_type` VARCHAR(50) DEFAULT NULL COMMENT '操作类型',
  `operation_desc` VARCHAR(500) DEFAULT NULL COMMENT '操作描述',
  `request_method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
  `request_url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` TEXT DEFAULT NULL COMMENT '请求参数',
  `response_result` TEXT DEFAULT NULL COMMENT '响应结果',
  `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '操作用户名',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `location` VARCHAR(200) DEFAULT NULL COMMENT '地理位置',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `execute_time` INT DEFAULT NULL COMMENT '执行时长（毫秒）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 通知模板表
DROP TABLE IF EXISTS `kb_notification_template`;
CREATE TABLE `kb_notification_template` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `template_code` VARCHAR(100) NOT NULL COMMENT '模板编码',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称',
  `notification_type` VARCHAR(50) NOT NULL COMMENT '通知类型：EMAIL/SMS/WECHAT/SYSTEM/BROWSER',
  `title` VARCHAR(500) NOT NULL COMMENT '模板标题',
  `content` TEXT NOT NULL COMMENT '模板内容',
  `variables` VARCHAR(1000) DEFAULT '[]' COMMENT '模板变量（JSON数组格式）',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '模板描述',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用：0-停用，1-启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT NULL COMMENT '创建人',
  `update_by` BIGINT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';


-- =====================================================
-- 第十一部分: kb_graph 数据库 - 知识图谱模块
-- =====================================================

USE `kb_graph`;

-- 图谱节点表
DROP TABLE IF EXISTS `kb_graph_node`;
CREATE TABLE `kb_graph_node` (
  `id` BIGINT NOT NULL COMMENT '节点ID',
  `node_name` VARCHAR(200) NOT NULL COMMENT '节点名称',
  `node_type` VARCHAR(50) NOT NULL COMMENT '节点类型：document-文档，tag-标签，user-用户',
  `source_id` BIGINT DEFAULT NULL COMMENT '源数据ID',
  `properties` JSON DEFAULT NULL COMMENT '节点属性',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_node` (`node_type`, `source_id`),
  KEY `idx_node_type` (`node_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱节点表';

-- 图谱关系表
DROP TABLE IF EXISTS `kb_graph_edge`;
CREATE TABLE `kb_graph_edge` (
  `id` BIGINT NOT NULL COMMENT '关系ID',
  `source_node_id` BIGINT NOT NULL COMMENT '源节点ID',
  `target_node_id` BIGINT NOT NULL COMMENT '目标节点ID',
  `relation_type` VARCHAR(50) NOT NULL COMMENT '关系类型：similar-相似，related-相关，reference-引用',
  `weight` FLOAT DEFAULT 1.0 COMMENT '关系权重',
  `properties` JSON DEFAULT NULL COMMENT '关系属性',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_source_node` (`source_node_id`),
  KEY `idx_target_node` (`target_node_id`),
  KEY `idx_relation_type` (`relation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱关系表';


-- =====================================================
-- 第十二部分: 跨数据库视图
-- =====================================================

-- kb_user 库的跨库视图
USE `kb_user`;
DROP VIEW IF EXISTS `kb_document`;
CREATE VIEW `kb_document` AS
SELECT
    id, title, author_id, author_name, category_id, status,
    view_count, like_count, favorite_count, comment_count,
    is_public, is_top, is_recommend, document_type, source,
    cover_image, summary,
    sort, allow_comment, publish_time, created_at, updated_at,
    create_by, update_by, deleted
FROM kb_document.kb_document;

-- 【已废弃 DEPRECATED — 任务 33】以下 kb_statistics 跨库 VIEW 段勿用于新部署
-- 请使用 sql/schema/kb_statistics.sql（stat_* 投影宽表，无 CREATE VIEW）
-- kb_statistics 库的跨库视图
USE `kb_statistics`;

DROP VIEW IF EXISTS `kb_document`;
CREATE VIEW `kb_document` AS
SELECT
    id, title, author_id, author_name, category_id, status,
    view_count, like_count, favorite_count, comment_count,
    is_public, is_top, is_recommend, document_type, source,
    cover_image, summary,
    sort, allow_comment, publish_time, created_at, updated_at,
    create_by, update_by, deleted
FROM kb_document.kb_document;

DROP VIEW IF EXISTS `kb_user`;
CREATE VIEW `kb_user` AS
SELECT
    id, username, real_name, avatar, status,
    email, phone, department, position,
    last_login_time, created_at, updated_at, deleted
FROM kb_user.kb_user;

DROP VIEW IF EXISTS `kb_comment`;
CREATE VIEW `kb_comment` AS
SELECT
    id, document_id, content, user_id, user_name,
    user_avatar, parent_id, reply_to_id, reply_to_name,
    like_count, reply_count, status, created_at,
    updated_at, deleted
FROM kb_document.tb_comment;

DROP VIEW IF EXISTS `kb_operation_log`;
CREATE VIEW `kb_operation_log` AS
SELECT
    id, module, operation_type, operation_desc,
    request_method, request_url, request_params,
    response_result, user_id, username, ip_address,
    location, user_agent, execute_time, status,
    error_msg, created_at, updated_at, create_by, update_by, deleted
FROM kb_foundation.kb_operation_log;

DROP VIEW IF EXISTS `kb_category`;
CREATE VIEW `kb_category` AS
SELECT
    id, category_name, parent_id, category_icon,
    description, sort, document_count, status,
    created_at, updated_at, create_by, update_by, deleted
FROM kb_document.kb_category;

DROP VIEW IF EXISTS `kb_ai_conversation`;
CREATE VIEW `kb_ai_conversation` AS
SELECT
    id, user_id, user_name, title, model_name,
    message_count, created_at, updated_at, deleted
FROM kb_ai.conversation;

DROP VIEW IF EXISTS `kb_ai_message`;
CREATE VIEW `kb_ai_message` AS
SELECT
    id, conversation_id, role, content, tokens,
    created_at, deleted
FROM kb_ai.message;


-- =====================================================
-- 完成
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

SELECT '========================================' AS '';
SELECT '  数据库表结构创建完成!' AS message;
SELECT '========================================' AS '';
SELECT CONCAT('数据库总数: ', 10) AS summary;
SELECT CONCAT('表总数:     ', 30) AS summary;

-- =====================================================
-- 初始化数据部分 (DML)
-- =====================================================

-- =====================================================
-- 企业知识库系统 - 完整初始化数据脚本 (DML)
-- =====================================================
-- 版本: 1.0
-- 数据库: MySQL 8.0+
-- 字符集: utf8mb4
-- =====================================================
-- 执行说明:
--   1. 必须在 create_tables.sql 之后执行
--   2. 使用 MySQL 任何已有权限的用户均可执行
--   3. INSERT 语句按数据依赖关系排序
--   4. 所有数据使用雪花算法ID,具有唯一性
--   5. 默认管理员密码: admin123 (BCrypt加密)
-- =====================================================

SET NAMES utf8mb4;


-- =====================================================
-- 第一部分: kb_user 数据库 - 用户认证模块
-- =====================================================

USE `kb_user`;

-- 1.1 初始化用户数据
-- 密码统一为 admin123 (BCrypt: $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi)
INSERT INTO `kb_user` (`id`, `username`, `password`, `email`, `real_name`, `department`, `position`, `status`, `avatar`) VALUES
(1000000000000000001, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'admin@company.com', '系统管理员', '技术部', '系统架构师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'),
(1000000000000000002, 'editor', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'editor@company.com', '内容编辑', '内容部', '高级编辑', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor'),
(1000000000000000003, 'tester', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'tester@company.com', '测试人员', '测试部', '测试工程师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=tester'),
(1000000000000000004, 'developer', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'dev@company.com', '开发工程师', '研发部', '高级工程师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer'),
(1000000000000000005, 'product', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'product@company.com', '产品经理', '产品部', '高级产品经理', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=product'),
(1000000000000000006, 'designer', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'designer@company.com', 'UI设计师', '设计部', '高级设计师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer'),
(1000000000000000007, 'sales', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'sales@company.com', '销售经理', '销售部', '销售经理', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=sales'),
(1000000000000000008, 'hr', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'hr@company.com', '人事专员', '人力资源部', '人事专员', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=hr'),
(1000000000000000009, 'finance', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'finance@company.com', '财务主管', '财务部', '财务主管', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=finance'),
(1000000000000000010, 'guest', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'guest@company.com', '访客用户', '外部', '访客', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest');

-- 1.2 初始化角色数据
INSERT INTO `kb_role` (`id`, `role_name`, `role_code`, `description`, `sort`, `status`) VALUES
(2000000000000000001, '超级管理员', 'ROLE_SUPER_ADMIN', '拥有系统所有权限', 1, 1),
(2000000000000000002, '管理员', 'ROLE_ADMIN', '拥有系统管理权限', 2, 1),
(2000000000000000003, '编辑', 'ROLE_EDITOR', '可编辑和管理文档', 3, 1),
(2000000000000000004, '审核员', 'ROLE_REVIEWER', '可审核文档', 4, 1),
(2000000000000000005, '普通用户', 'ROLE_USER', '普通用户权限', 5, 1),
(2000000000000000006, '访客', 'ROLE_GUEST', '只读访客权限', 6, 1);

-- 1.3 初始化权限数据（一级菜单）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000001, 0, '首页', 'dashboard', 1, '/dashboard', 'DashboardOutlined', 1, 1),
(3000000000000000002, 0, '文档中心', 'document', 1, '/documents', 'FileTextOutlined', 2, 1),
(3000000000000000046, 0, '文件管理', 'file', 1, '/files', 'FolderOpenOutlined', 3, 1),
(3000000000000000003, 0, '知识图谱', 'graph', 1, '/knowledge-graph', 'NodeIndexOutlined', 4, 1),
(3000000000000000005, 0, '搜索', 'search', 1, '/search', 'SearchOutlined', 5, 1),
(3000000000000000004, 0, 'AI助手', 'ai', 1, '/ai', 'RobotOutlined', 6, 1),
(3000000000000000047, 0, 'AI写作', 'ai-writing', 1, '/ai-writing', 'EditOutlined', 7, 1),
(3000000000000000006, 0, '通知中心', 'notification', 1, '/notifications', 'BellOutlined', 8, 1),
(3000000000000000007, 0, '个人中心', 'profile', 1, '/profile', 'UserOutlined', 9, 1),
(3000000000000000008, 0, '系统管理', 'system', 1, '/admin', 'SettingOutlined', 10, 1);

-- 1.4 初始化权限数据（文档管理二级菜单）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000011, 3000000000000000002, '文档列表', 'document:list', 1, '/documents', NULL, 1, 1),
(3000000000000000012, 3000000000000000002, '创建文档', 'document:create', 2, NULL, NULL, 2, 1),
(3000000000000000013, 3000000000000000002, '编辑文档', 'document:edit', 2, NULL, NULL, 3, 1),
(3000000000000000014, 3000000000000000002, '删除文档', 'document:delete', 2, NULL, NULL, 4, 1),
(3000000000000000015, 3000000000000000002, '文档审核', 'document:review', 2, NULL, NULL, 5, 1),
(3000000000000000016, 3000000000000000002, '文档分类', 'document:category', 1, '/admin/categories', NULL, 6, 1),
(3000000000000000017, 3000000000000000002, '文档标签', 'document:tag', 1, '/admin/tags', NULL, 7, 1),
(3000000000000000018, 3000000000000000016, '分类查询', 'document:category:query', 3, NULL, NULL, 1, 1);

-- 1.5 初始化权限数据（文件管理二级菜单）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000048, 3000000000000000046, '文件列表', 'file:list', 1, '/files', NULL, 1, 1),
(3000000000000000049, 3000000000000000046, '上传文件', 'file:upload', 2, NULL, NULL, 2, 1),
(3000000000000000050, 3000000000000000046, '删除文件', 'file:delete', 2, NULL, NULL, 3, 1);

-- 1.6 初始化权限数据（系统管理二级菜单）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000021, 3000000000000000008, '用户管理', 'system:user', 1, '/admin/users', NULL, 1, 1),
(3000000000000000022, 3000000000000000008, '角色管理', 'system:role', 1, '/admin/roles', NULL, 2, 1),
(3000000000000000023, 3000000000000000008, '权限管理', 'system:permission', 1, '/admin/permissions', NULL, 3, 1),
(3000000000000000024, 3000000000000000008, '团队管理', 'system:team', 1, '/admin/teams', NULL, 4, 1),
(3000000000000000025, 3000000000000000008, '数据统计', 'system:statistics', 1, '/admin/statistics', NULL, 5, 1),
(3000000000000000026, 3000000000000000008, '审核管理', 'system:review', 1, '/admin/review', NULL, 6, 1),
(3000000000000000027, 3000000000000000008, '系统设置', 'system:settings', 1, '/admin/settings', NULL, 7, 1),
(3000000000000000051, 3000000000000000008, '系统配置', 'system:config', 1, '/admin/system-config', NULL, 8, 1),
(3000000000000000052, 3000000000000000008, '字典管理', 'system:dictionary', 1, '/admin/dictionary', NULL, 9, 1),
(3000000000000000053, 3000000000000000008, '操作日志', 'system:operation-log', 1, '/admin/operation-logs', NULL, 10, 1),
(3000000000000000054, 3000000000000000008, '通知模板', 'system:notification-template', 1, '/admin/notification-templates', NULL, 11, 1);

-- 1.7 初始化权限数据（接口权限）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `api_url`, `method`, `sort`, `status`) VALUES
(3000000000000000031, 0, '文档查询接口', 'api:document:query', 3, '/api/document/**', 'GET', 1, 1),
(3000000000000000032, 0, '文档创建接口', 'api:document:create', 3, '/api/document', 'POST', 2, 1),
(3000000000000000033, 0, '文档更新接口', 'api:document:update', 3, '/api/document/**', 'PUT', 3, 1),
(3000000000000000034, 0, '文档删除接口', 'api:document:delete', 3, '/api/document/**', 'DELETE', 4, 1),
(3000000000000000035, 0, '用户管理接口', 'api:user:manage', 3, '/api/user/**', '*', 5, 1),
(3000000000000000036, 0, '角色管理接口', 'api:role:manage', 3, '/api/role/**', '*', 6, 1);

-- 1.8 初始化用户角色关联
INSERT INTO `kb_user_role` (`id`, `user_id`, `role_id`, `create_by`) VALUES
(4000000000000000001, 1000000000000000001, 2000000000000000001, 1000000000000000001),
(4000000000000000002, 1000000000000000002, 2000000000000000003, 1000000000000000001),
(4000000000000000003, 1000000000000000003, 2000000000000000005, 1000000000000000001),
(4000000000000000004, 1000000000000000004, 2000000000000000005, 1000000000000000001),
(4000000000000000005, 1000000000000000005, 2000000000000000005, 1000000000000000001),
(4000000000000000006, 1000000000000000006, 2000000000000000005, 1000000000000000001),
(4000000000000000007, 1000000000000000007, 2000000000000000005, 1000000000000000001),
(4000000000000000008, 1000000000000000008, 2000000000000000005, 1000000000000000001),
(4000000000000000009, 1000000000000000009, 2000000000000000005, 1000000000000000001),
(4000000000000000010, 1000000000000000010, 2000000000000000006, 1000000000000000001);

-- 1.9 初始化角色权限关联（超级管理员拥有所有权限）
INSERT INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT
    5000000000000000000 + ROW_NUMBER() OVER (ORDER BY `id`),
    2000000000000000001,
    `id`
FROM `kb_permission`;

-- 1.10 初始化团队数据
INSERT INTO `kb_team` (`id`, `team_name`, `team_code`, `description`, `icon`, `leader_id`, `parent_id`, `sort`) VALUES
(8000000000000000001, '技术中心', 'TECH_CENTER', '负责公司所有技术研发工作', 'tech', 1000000000000000004, 0, 1),
(8000000000000000002, '产品中心', 'PRODUCT_CENTER', '负责产品规划和设计', 'product', 1000000000000000005, 0, 2),
(8000000000000000003, '运营中心', 'OPS_CENTER', '负责业务运营和市场推广', 'ops', 1000000000000000007, 0, 3),
(8000000000000000004, '职能中心', 'ADMIN_CENTER', '负责公司行政人事财务工作', 'admin', 1000000000000000008, 0, 4),
(8000000000000000005, '后端开发组', 'BACKEND_TEAM', '后端系统开发', 'backend', 1000000000000000004, 8000000000000000001, 1),
(8000000000000000006, '前端开发组', 'FRONTEND_TEAM', '前端系统开发', 'frontend', 1000000000000000004, 8000000000000000001, 2),
(8000000000000000007, '测试组', 'QA_TEAM', '质量保证和测试', 'qa', 1000000000000000003, 8000000000000000001, 3);

-- 1.11 初始化团队成员
INSERT INTO `kb_team_member` (`id`, `team_id`, `user_id`, `member_role`) VALUES
(9000000000000000001, 8000000000000000005, 1000000000000000004, 'leader'),
(9000000000000000002, 8000000000000000005, 1000000000000000001, 'member'),
(9000000000000000003, 8000000000000000006, 1000000000000000006, 'member'),
(9000000000000000004, 8000000000000000007, 1000000000000000003, 'leader');


-- =====================================================
-- 第二部分: kb_document 数据库 - 文档管理模块
-- =====================================================

USE `kb_document`;

-- 2.1 初始化文档分类数据
INSERT INTO `kb_category` (`id`, `category_name`, `parent_id`, `category_icon`, `description`, `sort`, `document_count`) VALUES
-- 一级分类
(6000000000000000001, '技术文档', 0, 'tech', '技术开发相关的文档资料', 1, 0),
(6000000000000000002, '产品文档', 0, 'product', '产品设计、需求文档', 2, 0),
(6000000000000000003, '业务流程', 0, 'business', '公司业务流程规范', 3, 0),
(6000000000000000004, '人力资源', 0, 'hr', '人事制度和管理规范', 4, 0),
(6000000000000000005, '财务制度', 0, 'finance', '财务管理制度和流程', 5, 0),
(6000000000000000006, '市场营销', 0, 'marketing', '市场营销策略和方案', 6, 0),
(6000000000000000007, '合规法务', 0, 'legal', '法律法规和合规要求', 7, 0),
(6000000000000000008, '培训资料', 0, 'training', '员工培训和学习资料', 8, 0),
-- 技术文档子分类
(6000000000000000011, '后端开发', 6000000000000000001, 'backend', '后端技术栈开发文档', 1, 0),
(6000000000000000012, '前端开发', 6000000000000000001, 'frontend', '前端技术栈开发文档', 2, 0),
(6000000000000000013, '数据库', 6000000000000000001, 'database', '数据库设计和优化', 3, 0),
(6000000000000000014, 'DevOps', 6000000000000000001, 'devops', '运维部署和CI/CD', 4, 0),
(6000000000000000015, '架构设计', 6000000000000000001, 'architecture', '系统架构设计文档', 5, 0),
-- 产品文档子分类
(6000000000000000021, '产品需求', 6000000000000000002, 'requirement', '产品需求文档PRD', 1, 0),
(6000000000000000022, 'UI设计', 6000000000000000002, 'design', 'UI/UX设计规范', 2, 0),
(6000000000000000023, '产品规划', 6000000000000000002, 'planning', '产品规划和路线图', 3, 0),
(6000000000000000024, '竞品分析', 6000000000000000002, 'competitive', '竞品分析报告', 4, 0);

-- 2.2 初始化标签数据
INSERT INTO `tb_tag` (`id`, `tag_name`, `tag_color`, `description`, `use_count`) VALUES
(7000000000000000001, '重要', '#ff4d4f', '重要文档标签', 0),
(7000000000000000002, '置顶', '#1890ff', '置顶文档标签', 0),
(7000000000000000003, '推荐', '#52c41a', '推荐文档标签', 0),
(7000000000000000004, '草稿', '#d9d9d9', '草稿文档标签', 0),
(7000000000000000005, 'Java', '#b07219', 'Java技术标签', 0),
(7000000000000000006, 'Spring Boot', '#6db33f', 'Spring Boot标签', 0),
(7000000000000000007, 'React', '#61dafb', 'React前端标签', 0),
(7000000000000000008, 'MySQL', '#4479a1', 'MySQL数据库标签', 0),
(7000000000000000009, 'Redis', '#dc382d', 'Redis缓存标签', 0),
(7000000000000000010, 'Docker', '#2496ed', 'Docker容器标签', 0),
(7000000000000000011, '架构', '#722ed1', '系统架构标签', 0),
(7000000000000000012, '规范', '#fa8c16', '开发规范标签', 0);

-- 2.3 初始化文档数据
INSERT INTO `kb_document` (`id`, `title`, `summary`, `category_id`, `author_id`, `author_name`, `status`, `is_public`, `view_count`, `like_count`, `comment_count`, `version`, `publish_time`) VALUES
(1000000000000000001,
'Spring Boot 3.x 快速入门指南',
'Spring Boot 3.x完整入门教程，包含项目初始化、核心特性介绍和最佳实践。',
6000000000000000011, 1000000000000000004, 'developer', 1, 1, 1523, 89, 23, 1, '2024-01-15 10:00:00'),

(1000000000000000002,
'React 18 + TypeScript 最佳实践',
'基于React 18和TypeScript的前端开发最佳实践，包含项目结构、核心概念和状态管理。',
6000000000000000012, 1000000000000000006, 'designer', 1, 1, 2187, 156, 45, 1, '2024-02-10 14:30:00'),

(1000000000000000003,
'MySQL 8.0 性能优化指南',
'MySQL 8.0数据库性能优化完整指南，涵盖索引优化、查询优化和慢查询分析。',
6000000000000000013, 1000000000000000001, 'admin', 1, 1, 3421, 234, 67, 1, '2024-01-28 09:15:00'),

(1000000000000000004,
'Docker + Kubernetes 容器化部署',
'基于Docker和Kubernetes的微服务容器化部署实践。',
6000000000000000014, 1000000000000000004, 'developer', 1, 1, 1876, 98, 19, 1, '2024-03-05 16:20:00'),

(1000000000000000005,
'企业知识库产品需求文档PRD',
'完整的企业知识库产品需求文档，包含产品定位、目标用户和功能需求。',
6000000000000000021, 1000000000000000005, 'product', 1, 1, 987, 45, 12, 1, '2024-02-01 10:00:00'),

(1000000000000000006,
'UI设计规范 V2.0',
'企业知识库UI设计规范，包含色彩系统、字体规范和组件规范。',
6000000000000000022, 1000000000000000006, 'designer', 1, 1, 654, 34, 8, 1, '2024-02-15 14:00:00'),

(1000000000000000007,
'文档审核流程规范',
'文档审核流程的详细规范，包括流程步骤和审核标准。',
6000000000000000003, 1000000000000000002, 'editor', 1, 1, 1234, 67, 15, 1, '2024-01-20 11:00:00'),

(1000000000000000008,
'员工入职指南',
'新员工入职指南，包含入职流程、常用系统和福利制度说明。',
6000000000000000004, 1000000000000000008, 'hr', 1, 1, 5678, 234, 56, 1, '2024-01-01 09:00:00'),

(1000000000000000009,
'报销流程说明',
'公司费用报销流程的详细说明，包含报销原则、流程步骤和注意事项。',
6000000000000000005, 1000000000000000009, 'finance', 1, 1, 3456, 123, 34, 1, '2024-01-10 14:00:00');

-- 2.4 初始化文档标签关联
INSERT INTO `kb_document_tag` (`id`, `document_id`, `tag_id`) VALUES
(1100000000000000001, 1000000000000000001, 7000000000000000006),
(1100000000000000002, 1000000000000000001, 7000000000000000005),
(1100000000000000003, 1000000000000000001, 7000000000000000011),
(1100000000000000004, 1000000000000000002, 7000000000000000007),
(1100000000000000005, 1000000000000000002, 7000000000000000012),
(1100000000000000006, 1000000000000000003, 7000000000000000008),
(1100000000000000007, 1000000000000000003, 7000000000000000009),
(1100000000000000008, 1000000000000000004, 7000000000000000010),
(1100000000000000009, 1000000000000000004, 7000000000000000005);

-- 2.5 初始化评论数据
INSERT INTO `tb_comment` (`id`, `document_id`, `content`, `user_id`, `user_name`, `parent_id`, `like_count`, `status`) VALUES
(1200000000000000001, 1000000000000000001, '这篇文章写得很详细，对我帮助很大！', 1000000000000000002, 'editor', 0, 12, 1),
(1200000000000000002, 1000000000000000001, '补充一点：自动配置的原理可以再详细讲讲', 1000000000000000004, 'developer', 0, 5, 1),
(1200000000000000003, 1000000000000000002, 'TypeScript的类型定义很规范，学习了！', 1000000000000000003, 'tester', 0, 8, 1),
(1200000000000000004, 1000000000000000002, '期待出下一期关于Hooks的文章', 1000000000000000002, 'editor', 0, 3, 1),
(1200000000000000005, 1000000000000000003, '索引优化的技巧很实用，已经在项目中应用了', 1000000000000000005, 'product', 0, 15, 1),
(1200000000000000006, 1000000000000000005, 'PRD写得很清楚，产品逻辑很完整', 1000000000000000001, 'admin', 0, 6, 1),
(1200000000000000007, 1000000000000000008, '入职指南很详细，帮助我快速熟悉了公司', 1000000000000000003, 'tester', 0, 23, 1),
(1200000000000000008, 1000000000000000008, '建议补充一下远程办公的注意事项', 1000000000000000007, 'sales', 0, 2, 1);


-- =====================================================
-- 第三部分: kb_ai 数据库 - AI模块
-- =====================================================

USE `kb_ai`;

-- 3.1 初始化AI对话数据
INSERT INTO `conversation` (`id`, `user_id`, `user_name`, `title`, `model_name`, `message_count`) VALUES
(1600000000000000001, 1000000000000000001, 'admin', '关于Spring Boot的讨论', 'qwen-turbo', 2),
(1600000000000000002, 1000000000000000002, 'editor', '前端开发问题咨询', 'qwen-turbo', 2),
(1600000000000000003, 1000000000000000004, 'developer', '数据库优化建议', 'qwen-turbo', 2);

-- 3.2 初始化AI消息数据
INSERT INTO `message` (`id`, `conversation_id`, `role`, `content`, `tokens`) VALUES
(1700000000000000001, 1600000000000000001, 'user', 'Spring Boot自动配置的原理是什么？', 20),
(1700000000000000002, 1600000000000000001, 'assistant', 'Spring Boot的自动配置是通过条件注解(@ConditionalOnClass、@ConditionalOnMissingBean等)实现的。它会根据类路径中的jar包和已定义的Bean来决定是否加载某个配置...', 150),
(1700000000000000003, 1600000000000000002, 'user', 'React 18的新特性有哪些？', 18),
(1700000000000000004, 1600000000000000002, 'assistant', 'React 18的主要新特性包括：1. 并发渲染 2. 自动批处理 3. Transitions 4. Suspense改进...', 120),
(1700000000000000005, 1600000000000000003, 'user', '如何优化MySQL查询性能？', 15),
(1700000000000000006, 1600000000000000003, 'assistant', 'MySQL查询优化可以从以下几个方面入手：1. 索引优化 2. 查询语句优化 3. 表结构优化 4. 参数调优...', 135);


-- =====================================================
-- 第四部分: kb_statistics 数据库 - 统计模块
-- =====================================================

USE `kb_statistics`;

-- 4.1 初始化文档统计数据
INSERT INTO `kb_document_statistics` (`id`, `document_id`, `document_title`, `view_count`, `like_count`, `comment_count`, `favorite_count`, `share_count`, `stat_date`) VALUES
(1800000000000000001, 1000000000000000001, 'Spring Boot 3.x 快速入门指南', 1523, 89, 23, 45, 12, CURDATE()),
(1800000000000000002, 1000000000000000002, 'React 18 + TypeScript 最佳实践', 2187, 156, 45, 67, 23, CURDATE()),
(1800000000000000003, 1000000000000000003, 'MySQL 8.0 性能优化指南', 3421, 234, 67, 89, 34, CURDATE()),
(1800000000000000004, 1000000000000000004, 'Docker + Kubernetes 容器化部署', 1876, 98, 19, 34, 8, CURDATE()),
(1800000000000000005, 1000000000000000005, '企业知识库产品需求文档PRD', 987, 45, 12, 23, 5, CURDATE()),
(1800000000000000006, 1000000000000000006, 'UI设计规范 V2.0', 654, 34, 8, 12, 3, CURDATE()),
(1800000000000000007, 1000000000000000007, '文档审核流程规范', 1234, 67, 15, 34, 7, CURDATE()),
(1800000000000000008, 1000000000000000008, '员工入职指南', 5678, 234, 56, 89, 45, CURDATE()),
(1800000000000000009, 1000000000000000009, '报销流程说明', 3456, 123, 34, 56, 21, CURDATE());

-- 4.2 初始化用户统计数据
INSERT INTO `kb_user_statistics` (`id`, `user_id`, `user_name`, `document_count`, `comment_count`, `like_count`, `view_count`, `login_count`, `stat_date`) VALUES
(1900000000000000001, 1000000000000000001, 'admin', 3, 15, 45, 2345, 67, CURDATE()),
(1900000000000000002, 1000000000000000004, 'developer', 2, 23, 89, 4523, 89, CURDATE()),
(1900000000000000003, 1000000000000000002, 'editor', 1, 12, 34, 1234, 45, CURDATE()),
(1900000000000000004, 1000000000000000006, 'designer', 1, 8, 34, 876, 23, CURDATE()),
(1900000000000000005, 1000000000000000005, 'product', 1, 6, 23, 1567, 34, CURDATE()),
(1900000000000000006, 1000000000000000003, 'tester', 0, 8, 15, 987, 12, CURDATE());


-- =====================================================
-- 第五部分: kb_notification 数据库 - 通知模块
-- =====================================================

USE `kb_notification`;

-- 5.1 初始化通知数据
INSERT INTO `kb_notification` (`id`, `user_id`, `user_name`, `notification_type`, `title`, `content`, `link`, `is_read`) VALUES
(1500000000000000001, 1000000000000000002, 'editor', 'system', '欢迎加入企业知识库', '欢迎加入企业知识库系统，开始您的知识管理之旅！', '/documents', 0),
(1500000000000000002, 1000000000000000004, 'developer', 'comment', '您的文档收到新评论', '《Spring Boot 3.x 快速入门指南》收到新评论', '/documents/1000000000000000001', 0),
(1500000000000000003, 1000000000000000005, 'product', 'review', '文档审核通过', '您的《企业知识库产品需求文档PRD》已通过审核', '/documents/1000000000000000005', 1),
(1500000000000000004, 1000000000000000001, 'admin', 'mention', '有人@了您', 'developer在《Docker + Kubernetes 容器化部署》中提到了您', '/documents/1000000000000000004', 0);


-- =====================================================
-- 第六部分: kb_common 数据库 - 公共模块
-- =====================================================

USE `kb_common`;

-- 6.1 初始化系统配置数据
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

-- 6.2 初始化字典数据
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`) VALUES
(1400000000000000001, 'document_status', '文档状态', 'document', '文档状态枚举', 1),
(1400000000000000002, 'review_status', '审核状态', 'review', '审核状态枚举', 2),
(1400000000000000003, 'notification_type', '通知类型', 'notification', '通知类型枚举', 3);

-- 6.3 初始化字典数据值
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


-- =====================================================
-- 第七部分: kb_foundation 数据库 - 基础服务
-- =====================================================

USE `kb_foundation`;

-- 7.1 初始化系统配置数据
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
(2000000000000000009, 'file.upload.allowed.types', 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,jpg,jpeg,png,gif,bmp,webp,svg,ico,mp4,avi,mov,wmv,flv,mkv,webm,mp3,wav,flac,aac,ogg,m4a,wma', 'string', 'STORAGE', '允许上传的文件类型', 1),
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

-- 7.2 初始化字典类型数据
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`, `status`) VALUES
(3000000000000000001, 'document_status', '文档状态', 'DOCUMENT', '文档状态：草稿/待审核/已发布/已驳回', 1, 1),
(3000000000000000002, 'notification_type', '通知类型', 'SYSTEM', '系统通知类型', 2, 1),
(3000000000000000003, 'operation_type', '操作类型', 'SYSTEM', '系统操作类型', 3, 1),
(3000000000000000004, 'file_type', '文件类型', 'FILE', '支持的文件类型', 4, 1),
(3000000000000000005, 'user_type', '用户类型', 'USER', '用户类型分类', 5, 1);

-- 7.3 初始化字典数据值
-- 文档状态字典数据
INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_code`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `is_default`, `status`) VALUES
(3100000000000000001, 3000000000000000001, 'document_status', '草稿', '0', 1, 'badge-gray', 1, 1),
(3100000000000000002, 3000000000000000001, 'document_status', '待审核', '1', 2, 'badge-yellow', 0, 1),
(3100000000000000003, 3000000000000000001, 'document_status', '已发布', '2', 3, 'badge-green', 0, 1),
(3100000000000000004, 3000000000000000001, 'document_status', '已驳回', '3', 4, 'badge-red', 0, 1);

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
(3300000000000000003, 3000000000000000003, 'operation_type', '创建', 'CREATE', 3, NULL, 0, 1),
(3300000000000000004, 3000000000000000003, 'operation_type', '更新', 'UPDATE', 4, NULL, 0, 1),
(3300000000000000005, 3000000000000000003, 'operation_type', '删除', 'DELETE', 5, NULL, 0, 1),
(3300000000000000006, 3000000000000000003, 'operation_type', '查询', 'QUERY', 6, NULL, 0, 1),
(3300000000000000007, 3000000000000000003, 'operation_type', '导出', 'EXPORT', 7, NULL, 0, 1),
(3300000000000000008, 3000000000000000003, 'operation_type', '导入', 'IMPORT', 8, NULL, 0, 1);

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

-- 7.4 初始化通知数据
INSERT INTO `kb_notification` (`id`, `user_id`, `user_name`, `notification_type`, `title`, `content`, `link`, `is_read`) VALUES
(1500000000000000001, 1000000000000000002, 'editor', 'system', '欢迎加入企业知识库', '欢迎加入企业知识库系统，开始您的知识管理之旅！', '/documents', 0),
(1500000000000000002, 1000000000000000004, 'developer', 'comment', '您的文档收到新评论', '《Spring Boot 3.x 快速入门指南》收到新评论', '/documents/1000000000000000001', 0),
(1500000000000000003, 1000000000000000005, 'product', 'review', '文档审核通过', '您的《企业知识库产品需求文档PRD》已通过审核', '/documents/1000000000000000005', 1),
(1500000000000000004, 1000000000000000001, 'admin', 'mention', '有人@了您', 'developer在《Docker + Kubernetes 容器化部署》中提到了您', '/documents/1000000000000000004', 0);

-- 7.5 初始化操作日志数据
INSERT INTO `kb_operation_log` (`id`, `module`, `operation_type`, `operation_desc`, `request_method`, `request_url`, `user_id`, `username`, `ip_address`, `execute_time`, `status`) VALUES
(4000000000000000001, '用户管理', 'LOGIN', '用户登录', 'POST', '/api/auth/login', 1000000000000000001, 'admin', '127.0.0.1', 125, 1),
(4000000000000000002, '文档管理', 'CREATE', '创建文档', 'POST', '/api/document', 1000000000000000002, 'editor', '127.0.0.1', 342, 1),
(4000000000000000003, '文档管理', 'UPDATE', '更新文档', 'PUT', '/api/document/1000000000000000001', 1000000000000000002, 'editor', '127.0.0.1', 215, 1),
(4000000000000000004, '系统配置', 'UPDATE', '更新系统配置', 'PUT', '/api/foundation/config', 1000000000000000001, 'admin', '127.0.0.1', 89, 1),
(4000000000000000005, '用户管理', 'CREATE', '创建用户', 'POST', '/api/auth/user', 1000000000000000001, 'admin', '127.0.0.1', 156, 1);

-- 7.6 初始化通知模板数据
INSERT INTO `kb_notification_template` (`id`, `template_code`, `template_name`, `notification_type`, `title`, `content`, `variables`, `description`, `is_active`) VALUES
(1, 'EMAIL_VERIFY_CODE', '邮箱验证码', 'EMAIL', '验证码 - {{systemName}}', '尊敬的{{userName}}，您的验证码是：{{verifyCode}}，5分钟内有效。', '["userName","verifyCode","systemName"]', '用于邮箱验证和找回密码场景', 1),
(2, 'DOCUMENT_APPROVED', '文档审核通过', 'SYSTEM', '您的文档《{{documentTitle}}》已通过审核', '您提交的文档《{{documentTitle}}》已通过审核，感谢您的贡献！', '["documentTitle"]', '文档审核通过时发送的通知', 1),
(3, 'DOCUMENT_REJECTED', '文档审核驳回', 'SYSTEM', '您的文档《{{documentTitle}}》需要修改', '您提交的文档《{{documentTitle}}》未通过审核，原因：{{rejectReason}}。请修改后重新提交。', '["documentTitle","rejectReason"]', '文档审核驳回时发送的通知', 1),
(4, 'NEW_COMMENT', '新评论通知', 'SYSTEM', '您的文档收到新评论', '{{commentUsername}} 评论了您的文档《{{documentTitle}}》：{{commentContent}}', '["commentUsername","documentTitle","commentContent"]', '文档收到新评论时的通知', 1),
(5, 'DOCUMENT_LIKED', '文档被点赞', 'SYSTEM', '您的文档收到新的点赞', '{{likeUsername}} 点赞了您的文档《{{documentTitle}}》', '["likeUsername","documentTitle"]', '文档被点赞时的通知', 1),
(6, 'WELCOME_MESSAGE', '欢迎消息', 'SYSTEM', '欢迎加入{{systemName}}', '尊敬的{{userName}}，欢迎加入{{systemName}}！我们期待您的贡献。', '["userName","systemName"]', '用户注册后的欢迎消息', 1);


-- =====================================================
-- 完成提示
-- =====================================================

SELECT '========================================' AS '';
SELECT '  数据初始化完成!' AS message;
SELECT '========================================' AS '';

-- 统计各库数据量
USE `kb_user`;
SELECT CONCAT('kb_user: 用户数=', COUNT(*)) AS info FROM `kb_user` UNION ALL
SELECT CONCAT('        角色数=', COUNT(*)) FROM `kb_role` UNION ALL
SELECT CONCAT('        权限数=', COUNT(*)) FROM `kb_permission`;

USE `kb_document`;
SELECT CONCAT('kb_document: 分类数=', COUNT(*)) AS info FROM `kb_category` UNION ALL
SELECT CONCAT('           标签数=', COUNT(*)) FROM `tb_tag` UNION ALL
SELECT CONCAT('           文档数=', COUNT(*)) FROM `kb_document` UNION ALL
SELECT CONCAT('           评论数=', COUNT(*)) FROM `tb_comment`;

USE `kb_ai`;
SELECT CONCAT('kb_ai: 对话数=', COUNT(*)) AS info FROM `conversation` UNION ALL
SELECT CONCAT('       消息数=', COUNT(*)) FROM `message`;

USE `kb_foundation`;
SELECT CONCAT('kb_foundation: 配置项数=', COUNT(*)) AS info FROM `kb_system_config` UNION ALL
SELECT CONCAT('              字典类型数=', COUNT(*)) FROM `kb_dict` UNION ALL
SELECT CONCAT('              字典数据数=', COUNT(*)) FROM `kb_dict_data` UNION ALL
SELECT CONCAT('              通知模板数=', COUNT(*)) FROM `kb_notification_template`;

-- =====================================================
-- ROLE_USER 权限清理
-- =====================================================

USE `kb_user`;

-- =====================================================
-- 清理 ROLE_USER 角色的越权权限
-- 新注册用户应仅被分配 ROLE_USER 角色，
-- ROLE_USER 不应拥有文件管理和系统管理的菜单权限。
-- =====================================================


-- 查询 ROLE_USER 的角色 ID
SET @role_user_id = 2000000000000000005;

-- 文件管理权限码（含子权限）
-- 'file', 'file:list', 'file:upload', 'file:delete'
DELETE rp FROM `kb_role_permission` rp
INNER JOIN `kb_permission` p ON rp.`permission_id` = p.`id`
WHERE rp.`role_id` = @role_user_id
  AND p.`permission_code` IN ('file', 'file:list', 'file:upload', 'file:delete');

-- 系统管理权限码（含子权限）
-- 'system', 'system:user', 'system:role', 'system:permission',
-- 'system:permission:create', 'system:permission:edit', 'system:permission:delete',
-- 'system:team', 'system:statistics', 'system:settings',
-- 'system:config', 'system:dictionary', 'system:operation-log', 'system:notification-template',
-- 'api:permission:list', 'api:permission:maintain'
DELETE rp FROM `kb_role_permission` rp
INNER JOIN `kb_permission` p ON rp.`permission_id` = p.`id`
WHERE rp.`role_id` = @role_user_id
  AND p.`permission_code` IN (
    'system', 'system:user', 'system:role', 'system:permission',
    'system:permission:create', 'system:permission:edit', 'system:permission:delete',
    'system:team', 'system:statistics', 'system:settings',
    'system:config', 'system:dictionary', 'system:operation-log', 'system:notification-template',
    'api:permission:list', 'api:permission:maintain'
  );

-- 文档管理权限码（ROLE_USER 仅保留 document 一级菜单入口，移除所有管理类权限）
-- 移除 'document:list'：前端误用此权限控制"文件管理"菜单显示
-- 移除以下管理权限：
-- 'document:list', 'document:create', 'document:edit', 'document:delete', 'document:review',
-- 'document:category', 'document:category:query', 'document:tag', 'document:version'
DELETE rp FROM `kb_role_permission` rp
INNER JOIN `kb_permission` p ON rp.`permission_id` = p.`id`
WHERE rp.`role_id` = @role_user_id
  AND p.`permission_code` IN (
    'document:list', 'document:create', 'document:edit', 'document:delete', 'document:review',
    'document:category', 'document:category:query', 'document:tag', 'document:version'
  );

-- 输出结果
SELECT CONCAT('ROLE_USER 权限清理完成！') AS message;
SELECT CONCAT('ROLE_USER 当前角色权限数: ', COUNT(*)) AS info
FROM `kb_role_permission`
WHERE `role_id` = @role_user_id;


-- =====================================================
-- 脚本执行完成 - 2026-06-16
-- =====================================================

SELECT '========================================' AS '';
SELECT '  企业知识库数据库初始化完成!' AS message;
SELECT '========================================' AS '';
SELECT CONCAT('导出日期: ', '2026-06-16') AS info;

-- 统计各数据库表数量
SELECT CONCAT('数据库总数: 10') AS info;
SELECT TABLE_SCHEMA AS '数据库', COUNT(*) AS '表数量'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA LIKE 'kb_%'
GROUP BY TABLE_SCHEMA
ORDER BY TABLE_SCHEMA;

SELECT CONCAT('所有初始化数据已导入完成!') AS message;
