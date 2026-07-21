-- =====================================================
-- 企业知识库系统 - 菜单权限补充数据
-- 添加缺失的一级菜单（AI写作、文件管理）及系统管理子菜单
-- 使用 NOT EXISTS 防重，可重复执行
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- =====================================================
-- 1. 调整现有顶层菜单排序，为新增菜单腾出位置
-- =====================================================

-- 知识图谱: 3 → 4
UPDATE `kb_permission` SET `sort` = 4 WHERE `permission_code` = 'graph' AND `deleted` = 0;

-- AI助手: 4 → 6
UPDATE `kb_permission` SET `sort` = 6 WHERE `permission_code` = 'ai' AND `deleted` = 0;

-- 通知中心: 6 → 8
UPDATE `kb_permission` SET `sort` = 8 WHERE `permission_code` = 'notification' AND `deleted` = 0;

-- 个人中心: 7 → 9
UPDATE `kb_permission` SET `sort` = 9 WHERE `permission_code` = 'profile' AND `deleted` = 0;

-- 系统管理: 8 → 10
UPDATE `kb_permission` SET `sort` = 10 WHERE `permission_code` = 'system' AND `deleted` = 0;

-- =====================================================
-- 2. 新增一级菜单
-- =====================================================

-- 文件管理（排在文档中心之后，知识图谱之前）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000046, 0, '文件管理', 'file', 1, '/files', 'FolderOpenOutlined', 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'file' AND `deleted` = 0
);

-- AI写作（排在AI助手之后）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000047, 0, 'AI写作', 'ai-writing', 1, '/ai-writing', 'EditOutlined', 7, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'ai-writing' AND `deleted` = 0
);

-- =====================================================
-- 3. 文件管理子菜单
-- =====================================================

INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000048, 3000000000000000046, '文件列表', 'file:list', 1, '/files', NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'file:list' AND `deleted` = 0
);

INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000049, 3000000000000000046, '上传文件', 'file:upload', 2, NULL, NULL, 2, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'file:upload' AND `deleted` = 0
);

INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000050, 3000000000000000046, '删除文件', 'file:delete', 2, NULL, NULL, 3, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'file:delete' AND `deleted` = 0
);

-- =====================================================
-- 4. 系统管理补充子菜单
-- =====================================================

-- 系统配置
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000051, 3000000000000000008, '系统配置', 'system:config', 1, '/admin/system-config', NULL, 8, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'system:config' AND `deleted` = 0
);

-- 字典管理
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000052, 3000000000000000008, '字典管理', 'system:dictionary', 1, '/admin/dictionary', NULL, 9, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'system:dictionary' AND `deleted` = 0
);

-- 操作日志
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000053, 3000000000000000008, '操作日志', 'system:operation-log', 1, '/admin/operation-logs', NULL, 10, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'system:operation-log' AND `deleted` = 0
);

-- 通知模板
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`)
SELECT 3000000000000000054, 3000000000000000008, '通知模板', 'system:notification-template', 1, '/admin/notification-templates', NULL, 11, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'system:notification-template' AND `deleted` = 0
);

-- =====================================================
-- 5. 将新增权限分配给超级管理员角色
-- =====================================================

INSERT IGNORE INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT 5000000000000000050 + (@row_num := @row_num + 1), 2000000000000000001, p.`id`
FROM `kb_permission` p, (SELECT @row_num := 0) r
WHERE p.`permission_code` IN (
  'file', 'file:list', 'file:upload', 'file:delete',
  'ai-writing',
  'system:config', 'system:dictionary', 'system:operation-log', 'system:notification-template'
)
AND NOT EXISTS (
  SELECT 1 FROM `kb_role_permission` rp
  WHERE rp.`role_id` = 2000000000000000001 AND rp.`permission_id` = p.`id`
);

SELECT '菜单权限补充数据初始化完成！' AS message;
