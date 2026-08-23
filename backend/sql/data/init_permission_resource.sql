-- 用途：
-- 为权限管理页面补充“菜单下级资源”初始化数据。
-- 该脚本使用 NOT EXISTS 防重，重复执行不会重复插入相同 permission_code。

SET NAMES utf8mb4;
USE `kb_user`;

-- 已存在库纠偏：首页路径与前端路由一致
UPDATE kb_permission
SET menu_url = '/'
WHERE permission_code = 'dashboard' AND deleted = 0 AND IFNULL(menu_url, '') <> '/';

-- 文档中心下级资源
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000011, 3000000000000000002, '文档列表', 'document:list', 1, '/documents', NULL, NULL, NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:list' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000012, 3000000000000000002, '创建文档', 'document:create', 2, NULL, NULL, NULL, NULL, 2, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:create' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000013, 3000000000000000002, '编辑文档', 'document:edit', 2, NULL, NULL, NULL, NULL, 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:edit' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000014, 3000000000000000002, '删除文档', 'document:delete', 2, NULL, NULL, NULL, NULL, 4, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:delete' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000015, 3000000000000000002, '文档审核', 'document:review', 2, NULL, NULL, NULL, NULL, 5, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:review' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000016, 3000000000000000002, '文档分类', 'document:category', 1, '/admin/categories', NULL, NULL, NULL, 6, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:category' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000018, 3000000000000000016, '分类查询', 'document:category:query', 3, NULL, '/api/document/categories/**', 'GET', NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:category:query' AND deleted = 0
);

-- 文档标签：无独立页面，降为按钮权限（勿挂 /admin/tags）
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000017, 3000000000000000002, '文档标签', 'document:tag', 2, NULL, NULL, NULL, NULL, 7, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:tag' AND deleted = 0
);

-- 已存在库纠偏：死路径 /admin/tags → 按钮权限
UPDATE kb_permission
SET permission_type = 2, menu_url = NULL
WHERE permission_code = 'document:tag' AND deleted = 0
  AND (permission_type <> 2 OR menu_url IS NOT NULL);

-- 版本管理（独立 ID，避免与 document:category:query 的 0018 冲突）
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000019, 3000000000000000002, '版本管理', 'document:version', 2, NULL, NULL, NULL, NULL, 8, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'document:version' AND deleted = 0
);

-- 系统管理下级菜单
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000021, 3000000000000000008, '用户管理', 'system:user', 1, '/admin/users', NULL, NULL, NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:user' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000022, 3000000000000000008, '角色管理', 'system:role', 1, '/admin/roles', NULL, NULL, NULL, 2, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:role' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000023, 3000000000000000008, '权限管理', 'system:permission', 1, '/admin/permissions', NULL, NULL, NULL, 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:permission' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000024, 3000000000000000008, '团队管理', 'system:team', 1, '/admin/teams', NULL, NULL, NULL, 4, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:team' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000025, 3000000000000000008, '数据统计', 'system:statistics', 1, '/admin/statistics', NULL, NULL, NULL, 5, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:statistics' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000026, 3000000000000000008, '审核管理', 'system:review', 1, '/admin/review', NULL, NULL, NULL, 6, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:review' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000027, 3000000000000000008, '系统设置', 'system:settings', 1, '/admin/settings', NULL, NULL, NULL, 7, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:settings' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000055, 3000000000000000008, 'Agent 编排', 'system:agents', 1, '/admin/agents', NULL, NULL, NULL, 12, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:agents' AND deleted = 0
);

-- 第8阶段：模型管理（挂系统设置菜单下）
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000060, 3000000000000000027, '模型管理', 'config:models', 2, '/admin/models', '/api/config/models/**', NULL, NULL, 8, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'config:models' AND deleted = 0
);

-- 权限管理菜单下的真实权限点
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000041, 3000000000000000023, '新增权限', 'system:permission:create', 2, NULL, NULL, NULL, NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:permission:create' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000042, 3000000000000000023, '编辑权限', 'system:permission:edit', 2, NULL, NULL, NULL, NULL, 2, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:permission:edit' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000043, 3000000000000000023, '删除权限', 'system:permission:delete', 2, NULL, NULL, NULL, NULL, 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'system:permission:delete' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000044, 3000000000000000023, '查询权限列表接口', 'api:permission:list', 3, NULL, '/api/auth/permissions/**', 'GET', NULL, 4, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'api:permission:list' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000045, 3000000000000000023, '维护权限接口', 'api:permission:maintain', 3, NULL, '/api/auth/permissions/**', 'POST', NULL, 5, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'api:permission:maintain' AND deleted = 0
);

-- 将本脚本新增权限授予超级管理员
INSERT IGNORE INTO kb_role_permission (id, role_id, permission_id)
SELECT 5000000000000000100 + (@rn := @rn + 1), 2000000000000000001, p.id
FROM kb_permission p, (SELECT @rn := 0) r
WHERE p.deleted = 0
  AND p.permission_code IN (
    'document:version',
    'system:team', 'system:statistics', 'system:review', 'system:settings', 'system:agents',
    'config:models'
  )
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id
  );

SELECT 'permission resource 初始化/纠偏完成' AS message;
