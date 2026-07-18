-- =====================================================
-- Phase 7 权限闭环：ROLE_EDITOR 文档权限 + ROLE_USER Agent 运行权限
-- 可重复执行；不向 ROLE_USER 发放 Agent 编辑/发布权限
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000301, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'document:list' AND p.deleted = 0
WHERE r.role_code = 'ROLE_EDITOR' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000302, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'document:create' AND p.deleted = 0
WHERE r.role_code = 'ROLE_EDITOR' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000303, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'document:edit' AND p.deleted = 0
WHERE r.role_code = 'ROLE_EDITOR' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000304, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'document:delete' AND p.deleted = 0
WHERE r.role_code = 'ROLE_EDITOR' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000311, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'agent:workflow:view' AND p.deleted = 0
WHERE r.role_code = 'ROLE_USER' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO kb_role_permission (id, role_id, permission_id)
SELECT 4000000000000000312, r.id, p.id
FROM kb_role r
JOIN kb_permission p ON p.permission_code = 'agent:run' AND p.deleted = 0
WHERE r.role_code = 'ROLE_USER' AND r.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM kb_role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

SELECT r.role_code, p.permission_code
FROM kb_role_permission rp
JOIN kb_role r ON r.id = rp.role_id
JOIN kb_permission p ON p.id = rp.permission_id
WHERE r.role_code IN ('ROLE_EDITOR', 'ROLE_USER')
  AND (p.permission_code LIKE 'document:%' OR p.permission_code LIKE 'agent:%')
ORDER BY r.role_code, p.permission_code;
