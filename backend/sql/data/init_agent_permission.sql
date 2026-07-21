-- =====================================================
-- Agent 权限初始化（任务 70）
-- 可重复执行；Search ACL 未通过前不向 ROLE_USER 发放 view/run
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- Agent 菜单父节点
INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000200, 0, 'Agent 工作流', 'agent', 1, '/agent', NULL, NULL, NULL, 11, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'agent' AND deleted = 0
);

-- 已存在库纠偏：Agent 一级菜单排序
UPDATE kb_permission SET sort = 11
WHERE permission_code = 'agent' AND deleted = 0 AND IFNULL(sort, 0) <> 11;

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000201, 3000000000000000200, '查看工作流', 'agent:workflow:view', 2, '/agent', NULL, NULL, NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'agent:workflow:view' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000202, 3000000000000000200, '运行工作流', 'agent:run', 2, '/agent', NULL, NULL, NULL, 2, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'agent:run' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000203, 3000000000000000200, '编辑工作流', 'agent:workflow:edit', 2, '/admin/agents', NULL, NULL, NULL, 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'agent:workflow:edit' AND deleted = 0
);

INSERT INTO kb_permission (
  id, parent_id, permission_name, permission_code, permission_type, menu_url, api_url, method, icon, sort, status
)
SELECT 3000000000000000204, 3000000000000000200, '发布工作流', 'agent:workflow:publish', 2, '/admin/agents', NULL, NULL, NULL, 4, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kb_permission WHERE permission_code = 'agent:workflow:publish' AND deleted = 0
);

-- ROLE_SUPER_ADMIN
INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000200, 2000000000000000001, p.id FROM kb_permission p
WHERE p.permission_code = 'agent' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000201, 2000000000000000001, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:view' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000202, 2000000000000000001, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:run' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000203, 2000000000000000001, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:edit' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000204, 2000000000000000001, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:publish' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000001 AND rp.permission_id = p.id);

-- ROLE_ADMIN
INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000210, 2000000000000000002, p.id FROM kb_permission p
WHERE p.permission_code = 'agent' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000002 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000211, 2000000000000000002, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:view' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000002 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000212, 2000000000000000002, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:run' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000002 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000213, 2000000000000000002, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:edit' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000002 AND rp.permission_id = p.id);

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000214, 2000000000000000002, p.id FROM kb_permission p
WHERE p.permission_code = 'agent:workflow:publish' AND p.deleted = 0
AND NOT EXISTS (SELECT 1 FROM kb_role_permission rp WHERE rp.role_id = 2000000000000000002 AND rp.permission_id = p.id);

-- 注意：不向 ROLE_USER(2000000000000000005) 发放 view/run，待 Search ACL PASS 后再补脚本

SELECT 'Agent 权限初始化完成（仅管理员角色）' AS message;
