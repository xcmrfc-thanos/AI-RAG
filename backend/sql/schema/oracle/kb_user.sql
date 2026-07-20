-- =====================================================
-- Oracle 翻译稿（自 mysql/ 机械转换，需人工验证）
-- schema/user: kb_user
-- 以 SYSTEM 装载时使用限定名 kb_user.table
-- =====================================================

-- =====================================================
-- kb_user 数据库 - 用户认证服务
-- =====================================================

-- 用户表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_user CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_user (
  id NUMBER(19) NOT NULL,
  username VARCHAR2(50) NOT NULL,
  password VARCHAR2(255) NOT NULL,
  email VARCHAR2(100) NOT NULL,
  email_verified NUMBER(3) DEFAULT 1 NOT NULL,
  activation_token VARCHAR2(128),
  activation_token_expiry TIMESTAMP,
  phone VARCHAR2(20),
  avatar VARCHAR2(500),
  real_name VARCHAR2(50),
  department VARCHAR2(100),
  position VARCHAR2(100),
  remark VARCHAR2(500),
  status NUMBER(3) DEFAULT 1 NOT NULL,
  last_login_time TIMESTAMP,
  last_login_ip VARCHAR2(50),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_username UNIQUE (username, deleted),
  CONSTRAINT uk_email UNIQUE (email, deleted)
);
CREATE INDEX idx_kb_user_idx_department ON kb_user.kb_user (department);
CREATE INDEX idx_kb_user_idx_status ON kb_user.kb_user (status);

-- 角色表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_role CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_role (
  id NUMBER(19) NOT NULL,
  role_name VARCHAR2(50) NOT NULL,
  role_code VARCHAR2(50) NOT NULL,
  description VARCHAR2(200),
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  remark VARCHAR2(500),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_role_code UNIQUE (role_code, deleted)
);

-- 权限表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_permission CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_permission (
  id NUMBER(19) NOT NULL,
  parent_id NUMBER(19) DEFAULT 0 NOT NULL,
  permission_name VARCHAR2(50) NOT NULL,
  permission_code VARCHAR2(100) NOT NULL,
  permission_type NUMBER(3) NOT NULL,
  menu_url VARCHAR2(200),
  api_url VARCHAR2(500),
  method VARCHAR2(10),
  icon VARCHAR2(50),
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  PRIMARY KEY (id)
);
CREATE INDEX idx_kb_permission_idx_parent_id ON kb_user.kb_permission (parent_id);
CREATE INDEX idx_kb_permission_idx_permission_type ON kb_user.kb_permission (permission_type);

-- 用户角色关联表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_user_role CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_user_role (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  role_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  PRIMARY KEY (id),
  CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

-- 角色权限关联表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_role_permission CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_role_permission (
  id NUMBER(19) NOT NULL,
  role_id NUMBER(19) NOT NULL,
  permission_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
);

-- 用户权限关联表（直接分配给用户的权限）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_user_permission CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_user_permission (
  id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  permission_id NUMBER(19) NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_user_permission UNIQUE (user_id, permission_id)
);

-- 团队表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_team CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_team (
  id NUMBER(19) NOT NULL,
  team_name VARCHAR2(100) NOT NULL,
  team_code VARCHAR2(50),
  description VARCHAR2(500),
  icon VARCHAR2(50),
  leader_id NUMBER(19),
  parent_id NUMBER(19) DEFAULT 0 NOT NULL,
  "level" NUMBER(10) DEFAULT 1 NOT NULL,
  path VARCHAR2(500),
  member_count NUMBER(10) DEFAULT 0 NOT NULL,
  doc_count NUMBER(10) DEFAULT 0 NOT NULL,
  sort NUMBER(10) DEFAULT 0 NOT NULL,
  status NUMBER(3) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  update_by NUMBER(19),
  deleted NUMBER(3) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_team_code UNIQUE (team_code, deleted)
);
CREATE INDEX idx_kb_team_idx_leader_id ON kb_user.kb_team (leader_id);

-- 团队成员表
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.kb_team_member CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.kb_team_member (
  id NUMBER(19) NOT NULL,
  team_id NUMBER(19) NOT NULL,
  user_id NUMBER(19) NOT NULL,
  member_role VARCHAR2(20) DEFAULT 'member' NOT NULL,
  join_time TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  create_by NUMBER(19),
  PRIMARY KEY (id),
  CONSTRAINT uk_team_user UNIQUE (team_id, user_id)
);

-- Token 黑名单表（登出后 JWT 失效）
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE kb_user.tb_token_blacklist CASCADE CONSTRAINTS';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

CREATE TABLE kb_user.tb_token_blacklist (
  id NUMBER(19) NOT NULL,
  token_hash VARCHAR2(64) NOT NULL,
  expire_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_token_hash UNIQUE (token_hash)
);
CREATE INDEX idx_tb_token_blacklist_idx_expire_time ON kb_user.tb_token_blacklist (expire_time);

SELECT 'kb_user 数据库表创建完成！' AS message FROM dual;