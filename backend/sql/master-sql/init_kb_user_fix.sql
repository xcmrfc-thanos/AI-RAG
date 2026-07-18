-- =====================================================
-- kb_user 数据库 - 修复角色权限关联
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- 清空并重新创建角色权限关联
DELETE FROM `kb_role_permission` WHERE role_id = 2000000000000000001;

-- 超级管理员拥有所有权限
INSERT INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT
    5000000000000000000 + ROW_NUMBER() OVER (ORDER BY `id`),
    2000000000000000001,
    `id`
FROM `kb_permission`;

SELECT '角色权限关联修复完成！' AS message;
SELECT CONCAT('角色权限关联数: ', COUNT(*)) AS info FROM `kb_role_permission`;
