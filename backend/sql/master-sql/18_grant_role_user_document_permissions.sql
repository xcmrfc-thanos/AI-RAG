-- =====================================================
-- 授予 ROLE_USER (知识成员) 文档增删改查权限
--
-- ROLE_USER 作为知识库的普通成员，需要具备：
--   document:list   - 查看文档列表和详情
--   document:create - 创建新文档
--   document:edit   - 编辑和管理文档
--   document:delete - 删除文档
--
-- 保留的限制（不在本次授权范围）：
--   document:review       - 审核权限（仅 ROLE_REVIEWER）
--   document:category     - 分类管理（仅管理员）
--   document:tag          - 标签管理（仅管理员）
--   document:version      - 版本管理（仅管理员）
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- ROLE_USER 角色 ID
SET @role_user_id = 2000000000000000005;

-- 仅当权限尚未分配时才插入（幂等）
-- 从当前最大ID + 1 开始分配新ID，避免冲突
INSERT INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT COALESCE((SELECT MAX(`id`) FROM `kb_role_permission` rp2), 5000000000000000000)
       + (@row_num := @row_num + 1),
       @role_user_id,
       p.`id`
FROM `kb_permission` p, (SELECT @row_num := 0) r
WHERE p.`permission_code` IN (
    'document:list',
    'document:create',
    'document:edit',
    'document:delete'
)
AND NOT EXISTS (
    SELECT 1 FROM `kb_role_permission` rp
    WHERE rp.`role_id` = @role_user_id
      AND rp.`permission_id` = p.`id`
);

-- 输出结果
SELECT 'ROLE_USER 文档权限授予完成！' AS message;
SELECT p.`permission_code`, p.`permission_name`
FROM `kb_role_permission` rp
INNER JOIN `kb_permission` p ON rp.`permission_id` = p.`id`
WHERE rp.`role_id` = @role_user_id
  AND p.`permission_code` IN ('document:list', 'document:create', 'document:edit', 'document:delete')
ORDER BY p.`permission_code`;
