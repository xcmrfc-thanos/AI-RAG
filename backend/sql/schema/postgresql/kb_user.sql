-- =====================================================
-- PostgreSQL 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema: kb_user
-- =====================================================

SET search_path TO kb_user;

-- =====================================================
-- kb_user 数据库 - 用户认证服务
-- =====================================================

-- 用户表
DROP TABLE IF EXISTS kb_user CASCADE;

CREATE TABLE kb_user (
  id BIGINT NOT NULL,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  email_verified SMALLINT NOT NULL DEFAULT 1,
  activation_token VARCHAR(128) DEFAULT NULL,
  activation_token_expiry TIMESTAMP DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  real_name VARCHAR(50) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  position VARCHAR(100) DEFAULT NULL,
  remark VARCHAR(500) DEFAULT NULL,
  status SMALLINT NOT NULL DEFAULT 1,
  last_login_time TIMESTAMP DEFAULT NULL,
  last_login_ip VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_username UNIQUE (username, deleted),
  CONSTRAINT uk_email UNIQUE (email, deleted)
);
CREATE INDEX IF NOT EXISTS idx_department ON kb_user (department);
CREATE INDEX IF NOT EXISTS idx_status ON kb_user (status);

-- 角色表
DROP TABLE IF EXISTS kb_role CASCADE;

CREATE TABLE kb_role (
  id BIGINT NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  description VARCHAR(200) DEFAULT NULL,
  sort INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  remark VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_role_code UNIQUE (role_code, deleted)
);

-- 权限表
DROP TABLE IF EXISTS kb_permission CASCADE;

CREATE TABLE kb_permission (
  id BIGINT NOT NULL,
  parent_id BIGINT NOT NULL DEFAULT 0,
  permission_name VARCHAR(50) NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  permission_type SMALLINT NOT NULL,
  menu_url VARCHAR(200) DEFAULT NULL,
  api_url VARCHAR(500) DEFAULT NULL,
  method VARCHAR(10) DEFAULT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  sort INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_parent_id ON kb_permission (parent_id);
CREATE INDEX IF NOT EXISTS idx_permission_type ON kb_permission (permission_type);

-- 用户角色关联表
DROP TABLE IF EXISTS kb_user_role CASCADE;

CREATE TABLE kb_user_role (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

-- 角色权限关联表
DROP TABLE IF EXISTS kb_role_permission CASCADE;

CREATE TABLE kb_role_permission (
  id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
);

-- 用户权限关联表（直接分配给用户的权限）
DROP TABLE IF EXISTS kb_user_permission CASCADE;

CREATE TABLE kb_user_permission (
  id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_permission UNIQUE (user_id, permission_id)
);

-- 团队表
DROP TABLE IF EXISTS kb_team CASCADE;

CREATE TABLE kb_team (
  id BIGINT NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  team_code VARCHAR(50) DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  leader_id BIGINT DEFAULT NULL,
  parent_id BIGINT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  path VARCHAR(500) DEFAULT NULL,
  member_count INT NOT NULL DEFAULT 0,
  doc_count INT NOT NULL DEFAULT 0,
  sort INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  update_by BIGINT DEFAULT NULL,
  deleted SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uk_team_code UNIQUE (team_code, deleted)
);
CREATE INDEX IF NOT EXISTS idx_leader_id ON kb_team (leader_id);

-- 团队成员表
DROP TABLE IF EXISTS kb_team_member CASCADE;

CREATE TABLE kb_team_member (
  id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  member_role VARCHAR(20) NOT NULL DEFAULT 'member',
  join_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_team_user UNIQUE (team_id, user_id)
);

-- Token 黑名单表（登出后 JWT 失效）
DROP TABLE IF EXISTS tb_token_blacklist CASCADE;

CREATE TABLE tb_token_blacklist (
  id BIGINT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expire_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_token_hash UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_expire_time ON tb_token_blacklist (expire_time);

SELECT 'kb_user 数据库表创建完成！' AS message;
