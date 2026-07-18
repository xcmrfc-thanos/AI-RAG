-- =====================================================
-- 清理 ROLE_USER 角色的越权权限
-- 新注册用户应仅被分配 ROLE_USER 角色，
-- ROLE_USER 不应拥有文件管理和系统管理的菜单权限。
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

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

-- 文档管理权限码
-- 保留 ROLE_USER 的核心文档操作权限：document:list, document:create, document:edit, document:delete
-- （知识成员需要能够查看、创建、编辑、删除文档）
-- 移除以下管理类权限（仅限管理员/审核员）：
-- 'document:review', 'document:category', 'document:category:query', 'document:tag', 'document:version'
DELETE rp FROM `kb_role_permission` rp
INNER JOIN `kb_permission` p ON rp.`permission_id` = p.`id`
WHERE rp.`role_id` = @role_user_id
  AND p.`permission_code` IN (
    'document:review',
    'document:category', 'document:category:query', 'document:tag', 'document:version'
  );

-- 输出结果
SELECT CONCAT('ROLE_USER 权限清理完成！') AS message;
SELECT CONCAT('ROLE_USER 当前角色权限数: ', COUNT(*)) AS info
FROM `kb_role_permission`
WHERE `role_id` = @role_user_id;
