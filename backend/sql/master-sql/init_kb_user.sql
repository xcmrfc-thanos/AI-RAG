-- =====================================================
-- kb_user 数据库 - 初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- 初始化用户数据
INSERT INTO `kb_user` (`id`, `username`, `password`, `email`, `real_name`, `department`, `position`, `status`, `avatar`) VALUES
(1000000000000000001, 'admin', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'admin@company.com', '系统管理员', '技术部', '系统架构师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'),
(1000000000000000002, 'editor', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'editor@company.com', '内容编辑', '内容部', '高级编辑', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor'),
(1000000000000000003, 'tester', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'tester@company.com', '测试人员', '测试部', '测试工程师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=tester'),
(1000000000000000004, 'developer', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'dev@company.com', '开发工程师', '研发部', '高级工程师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer'),
(1000000000000000005, 'product', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'product@company.com', '产品经理', '产品部', '高级产品经理', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=product'),
(1000000000000000006, 'designer', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'designer@company.com', 'UI设计师', '设计部', '高级设计师', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer'),
(1000000000000000007, 'sales', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'sales@company.com', '销售经理', '销售部', '销售经理', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=sales'),
(1000000000000000008, 'hr', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'hr@company.com', '人事专员', '人力资源部', '人事专员', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=hr'),
(1000000000000000009, 'finance', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'finance@company.com', '财务主管', '财务部', '财务主管', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=finance'),
(1000000000000000010, 'guest', '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.', 'guest@company.com', '访客用户', '外部', '访客', 1, 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest');

-- 初始化角色数据
INSERT INTO `kb_role` (`id`, `role_name`, `role_code`, `description`, `sort`, `status`) VALUES
(2000000000000000001, '超级管理员', 'ROLE_SUPER_ADMIN', '拥有系统所有权限', 1, 1),
(2000000000000000002, '管理员', 'ROLE_ADMIN', '拥有系统管理权限', 2, 1),
(2000000000000000003, '编辑', 'ROLE_EDITOR', '可编辑和管理文档', 3, 1),
(2000000000000000004, '审核员', 'ROLE_REVIEWER', '可审核文档', 4, 1),
(2000000000000000005, '普通用户', 'ROLE_USER', '普通用户权限', 5, 1),
(2000000000000000006, '访客', 'ROLE_GUEST', '只读访客权限', 6, 1);

-- 初始化权限数据
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000001, 0, '首页', 'dashboard', 1, '/dashboard', 'DashboardOutlined', 1, 1),
(3000000000000000002, 0, '文档中心', 'document', 1, '/documents', 'FileTextOutlined', 2, 1),
(3000000000000000003, 0, '知识图谱', 'graph', 1, '/knowledge-graph', 'NodeIndexOutlined', 3, 1),
(3000000000000000004, 0, 'AI助手', 'ai', 1, '/ai', 'RobotOutlined', 4, 1),
(3000000000000000005, 0, '搜索', 'search', 1, '/search', 'SearchOutlined', 5, 1),
(3000000000000000006, 0, '通知中心', 'notification', 1, '/notifications', 'BellOutlined', 6, 1),
(3000000000000000007, 0, '个人中心', 'profile', 1, '/profile', 'UserOutlined', 7, 1),
(3000000000000000008, 0, '系统管理', 'system', 1, '/admin', 'SettingOutlined', 8, 1);

-- 用户角色关联
INSERT INTO `kb_user_role` (`id`, `user_id`, `role_id`, `create_by`) VALUES
(4000000000000000001, 1000000000000000001, 2000000000000000001, 1000000000000000001),
(4000000000000000011, 1000000000000000001, 2000000000000000002, 1000000000000000001),
(4000000000000000002, 1000000000000000002, 2000000000000000003, 1000000000000000001),
(4000000000000000003, 1000000000000000003, 2000000000000000005, 1000000000000000001),
(4000000000000000004, 1000000000000000004, 2000000000000000005, 1000000000000000001),
(4000000000000000005, 1000000000000000005, 2000000000000000005, 1000000000000000001),
(4000000000000000006, 1000000000000000006, 2000000000000000005, 1000000000000000001),
(4000000000000000007, 1000000000000000007, 2000000000000000005, 1000000000000000001),
(4000000000000000008, 1000000000000000008, 2000000000000000005, 1000000000000000001),
(4000000000000000009, 1000000000000000009, 2000000000000000005, 1000000000000000001),
(4000000000000000010, 1000000000000000010, 2000000000000000006, 1000000000000000001);

-- 超级管理员拥有所有权限
INSERT INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT 5000000000000000000 + (@row:=@row+1), 2000000000000000001, `id`
FROM `kb_permission`, (SELECT @row:=0) r;

-- 初始化团队数据
INSERT INTO `kb_team` (`id`, `team_name`, `team_code`, `description`, `leader_id`, `parent_id`, `sort`) VALUES
(8000000000000000001, '技术中心', 'TECH_CENTER', '负责公司所有技术研发工作', 1000000000000000004, 0, 1),
(8000000000000000002, '产品中心', 'PRODUCT_CENTER', '负责产品规划和设计', 1000000000000000005, 0, 2),
(8000000000000000003, '运营中心', 'OPS_CENTER', '负责业务运营和市场推广', 1000000000000000007, 0, 3),
(8000000000000000004, '职能中心', 'ADMIN_CENTER', '负责公司行政人事财务工作', 1000000000000000008, 0, 4),
(8000000000000000005, '后端开发组', 'BACKEND_TEAM', '后端系统开发', 1000000000000000004, 8000000000000000001, 1),
(8000000000000000006, '前端开发组', 'FRONTEND_TEAM', '前端系统开发', 1000000000000000004, 8000000000000000001, 2),
(8000000000000000007, '测试组', 'QA_TEAM', '质量保证和测试', 1000000000000000003, 8000000000000000001, 3);

-- 团队成员
INSERT INTO `kb_team_member` (`id`, `team_id`, `user_id`, `member_role`) VALUES
(9000000000000000001, 8000000000000000005, 1000000000000000004, 'leader'),
(9000000000000000002, 8000000000000000005, 1000000000000000001, 'member'),
(9000000000000000003, 8000000000000000006, 1000000000000000006, 'member'),
(9000000000000000004, 8000000000000000007, 1000000000000000003, 'leader');

SELECT 'kb_user 数据初始化完成！' AS message;
SELECT CONCAT('用户数: ', COUNT(*)) AS info FROM `kb_user`;
SELECT CONCAT('角色数: ', COUNT(*)) AS info FROM `kb_role`;
SELECT CONCAT('权限数: ', COUNT(*)) AS info FROM `kb_permission`;
