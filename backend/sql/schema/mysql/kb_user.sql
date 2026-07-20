-- =====================================================
-- kb_user 数据库 - 用户认证服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户表
DROP TABLE IF EXISTS `kb_user`;
CREATE TABLE `kb_user` (
  `id` BIGINT NOT NULL COMMENT '用户ID（雪花算法）',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（BCrypt加密）',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `email_verified` TINYINT NOT NULL DEFAULT 1 COMMENT '邮箱是否已验证：0-未验证，1-已验证',
  `activation_token` VARCHAR(128) DEFAULT NULL COMMENT '账户激活令牌',
  `activation_token_expiry` DATETIME DEFAULT NULL COMMENT '激活令牌过期时间',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '部门',
  `position` VARCHAR(100) DEFAULT NULL COMMENT '职位',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`, `deleted`),
  UNIQUE KEY `uk_email` (`email`, `deleted`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`)
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
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表
DROP TABLE IF EXISTS `kb_permission`;
CREATE TABLE `kb_permission` (
  `id` BIGINT NOT NULL COMMENT '权限ID',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父权限ID',
  `permission_name` VARCHAR(50) NOT NULL COMMENT '权限名称',
  `permission_code` VARCHAR(100) NOT NULL COMMENT '权限编码',
  `permission_type` TINYINT NOT NULL COMMENT '权限类型：1-菜单，2-按钮，3-接口',
  `menu_url` VARCHAR(200) DEFAULT NULL COMMENT '菜单URL',
  `api_url` VARCHAR(500) DEFAULT NULL COMMENT '接口URL',
  `method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_permission_type` (`permission_type`)
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
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色权限关联表
DROP TABLE IF EXISTS `kb_role_permission`;
CREATE TABLE `kb_role_permission` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户权限关联表（直接分配给用户的权限）
DROP TABLE IF EXISTS `kb_user_permission`;
CREATE TABLE `kb_user_permission` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';

-- 团队表
DROP TABLE IF EXISTS `kb_team`;
CREATE TABLE `kb_team` (
  `id` BIGINT NOT NULL COMMENT '团队ID',
  `team_name` VARCHAR(100) NOT NULL COMMENT '团队名称',
  `team_code` VARCHAR(50) DEFAULT NULL COMMENT '团队编码',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '团队描述',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '团队图标（emoji）',
  `leader_id` BIGINT DEFAULT NULL COMMENT '团队负责人ID',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父团队ID',
  `level` INT NOT NULL DEFAULT 1 COMMENT '团队层级',
  `path` VARCHAR(500) DEFAULT NULL COMMENT '团队路径',
  `member_count` INT NOT NULL DEFAULT 0 COMMENT '成员数量',
  `doc_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_code` (`team_code`, `deleted`),
  KEY `idx_leader_id` (`leader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';

-- 团队成员表
DROP TABLE IF EXISTS `kb_team_member`;
CREATE TABLE `kb_team_member` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `team_id` BIGINT NOT NULL COMMENT '团队ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `member_role` VARCHAR(20) NOT NULL DEFAULT 'member' COMMENT '成员角色',
  `join_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '添加人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_user` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';

-- Token 黑名单表（登出后 JWT 失效）
DROP TABLE IF EXISTS `tb_token_blacklist`;
CREATE TABLE `tb_token_blacklist` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token哈希',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_user 数据库表创建完成！' AS message;
