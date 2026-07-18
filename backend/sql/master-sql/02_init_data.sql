-- =====================================================
-- 企业知识库系统 - 初始化数据脚本
-- 此脚本包含企业级的初始化数据
-- =====================================================

SET NAMES utf8mb4;
USE `knowledge_base`;

-- =====================================================
-- 1. 初始化用户数据
-- =====================================================

-- 默认管理员账户（密码：admin123，BCrypt加密后的值）
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

-- =====================================================
-- 2. 初始化角色和权限数据
-- =====================================================

-- 角色数据
INSERT INTO `kb_role` (`id`, `role_name`, `role_code`, `description`, `sort`, `status`) VALUES
(2000000000000000001, '超级管理员', 'ROLE_SUPER_ADMIN', '拥有系统所有权限', 1, 1),
(2000000000000000002, '管理员', 'ROLE_ADMIN', '拥有系统管理权限', 2, 1),
(2000000000000000003, '编辑', 'ROLE_EDITOR', '可编辑和管理文档', 3, 1),
(2000000000000000004, '审核员', 'ROLE_REVIEWER', '可审核文档', 4, 1),
(2000000000000000005, '普通用户', 'ROLE_USER', '普通用户权限', 5, 1),
(2000000000000000006, '访客', 'ROLE_GUEST', '只读访客权限', 6, 1);

-- 权限数据（菜单权限）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
-- 一级菜单
(3000000000000000001, 0, '首页', 'dashboard', 1, '/', 'DashboardOutlined', 1, 1),
(3000000000000000002, 0, '文档中心', 'document', 1, '/documents', 'FileTextOutlined', 2, 1),
(3000000000000000046, 0, '文件管理', 'file', 1, '/files', 'FolderOpenOutlined', 3, 1),
(3000000000000000003, 0, '知识图谱', 'graph', 1, '/knowledge-graph', 'NodeIndexOutlined', 4, 1),
(3000000000000000005, 0, '搜索', 'search', 1, '/search', 'SearchOutlined', 5, 1),
(3000000000000000004, 0, 'AI助手', 'ai', 1, '/ai', 'RobotOutlined', 6, 1),
(3000000000000000047, 0, 'AI写作', 'ai-writing', 1, '/ai-writing', 'EditOutlined', 7, 1),
(3000000000000000006, 0, '通知中心', 'notification', 1, '/notifications', 'BellOutlined', 8, 1),
(3000000000000000007, 0, '个人中心', 'profile', 1, '/profile', 'UserOutlined', 9, 1),
(3000000000000000008, 0, '系统管理', 'system', 1, '/admin', 'SettingOutlined', 10, 1);

-- 二级菜单（文档管理）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000011, 3000000000000000002, '文档列表', 'document:list', 1, '/documents', NULL, 1, 1),
(3000000000000000012, 3000000000000000002, '创建文档', 'document:create', 2, NULL, NULL, 2, 1),
(3000000000000000013, 3000000000000000002, '编辑文档', 'document:edit', 2, NULL, NULL, 3, 1),
(3000000000000000014, 3000000000000000002, '删除文档', 'document:delete', 2, NULL, NULL, 4, 1),
(3000000000000000015, 3000000000000000002, '文档审核', 'document:review', 2, NULL, NULL, 5, 1),
(3000000000000000016, 3000000000000000002, '文档分类', 'document:category', 1, '/admin/categories', NULL, 6, 1),
(3000000000000000017, 3000000000000000002, '文档标签', 'document:tag', 2, NULL, NULL, 7, 1),
(3000000000000000018, 3000000000000000002, '版本管理', 'document:version', 2, NULL, NULL, 8, 1);

-- 二级菜单（文件管理）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000048, 3000000000000000046, '文件列表', 'file:list', 1, '/files', NULL, 1, 1),
(3000000000000000049, 3000000000000000046, '上传文件', 'file:upload', 2, NULL, NULL, 2, 1),
(3000000000000000050, 3000000000000000046, '删除文件', 'file:delete', 2, NULL, NULL, 3, 1);

-- 二级菜单（系统管理）
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`) VALUES
(3000000000000000021, 3000000000000000008, '用户管理', 'system:user', 1, '/admin/users', NULL, 1, 1),
(3000000000000000022, 3000000000000000008, '角色管理', 'system:role', 1, '/admin/roles', NULL, 2, 1),
(3000000000000000023, 3000000000000000008, '权限管理', 'system:permission', 1, '/admin/permissions', NULL, 3, 1),
(3000000000000000024, 3000000000000000008, '团队管理', 'system:team', 1, '/admin/teams', NULL, 4, 1),
(3000000000000000025, 3000000000000000008, '数据统计', 'system:statistics', 1, '/admin/statistics', NULL, 5, 1),
(3000000000000000026, 3000000000000000008, '审核管理', 'system:review', 1, '/admin/review', NULL, 6, 1),
(3000000000000000027, 3000000000000000008, '系统设置', 'system:settings', 1, '/admin/settings', NULL, 7, 1),
(3000000000000000051, 3000000000000000008, '系统配置', 'system:config', 1, '/admin/system-config', NULL, 8, 1),
(3000000000000000052, 3000000000000000008, '字典管理', 'system:dictionary', 1, '/admin/dictionary', NULL, 9, 1),
(3000000000000000053, 3000000000000000008, '操作日志', 'system:operation-log', 1, '/admin/operation-logs', NULL, 10, 1),
(3000000000000000054, 3000000000000000008, '通知模板', 'system:notification-template', 1, '/admin/notification-templates', NULL, 11, 1);

-- 接口权限
INSERT INTO `kb_permission` (`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `api_url`, `method`, `sort`, `status`) VALUES
(3000000000000000031, 0, '文档查询接口', 'api:document:query', 3, '/api/document/**', 'GET', 1, 1),
(3000000000000000032, 0, '文档创建接口', 'api:document:create', 3, '/api/document', 'POST', 2, 1),
(3000000000000000033, 0, '文档更新接口', 'api:document:update', 3, '/api/document/**', 'PUT', 3, 1),
(3000000000000000034, 0, '文档删除接口', 'api:document:delete', 3, '/api/document/**', 'DELETE', 4, 1),
(3000000000000000035, 0, '用户管理接口', 'api:user:manage', 3, '/api/user/**', '*', 5, 1),
(3000000000000000036, 0, '角色管理接口', 'api:role:manage', 3, '/api/role/**', '*', 6, 1);

-- 用户角色关联
INSERT INTO `kb_user_role` (`id`, `user_id`, `role_id`, `create_by`) VALUES
(4000000000000000001, 1000000000000000001, 2000000000000000001, 1000000000000000001),
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

-- =====================================================
-- 3. 初始化文档分类数据
-- =====================================================

INSERT INTO `kb_category` (`id`, `category_name`, `parent_id`, `category_icon`, `description`, `sort`, `document_count`) VALUES
-- 一级分类
(6000000000000000001, '技术文档', 0, 'tech', '技术开发相关的文档资料', 1, 0),
(6000000000000000002, '产品文档', 0, 'product', '产品设计、需求文档', 2, 0),
(6000000000000000003, '业务流程', 0, 'business', '公司业务流程规范', 3, 0),
(6000000000000000004, '人力资源', 0, 'hr', '人事制度和管理规范', 4, 0),
(6000000000000000005, '财务制度', 0, 'finance', '财务管理制度和流程', 5, 0),
(6000000000000000006, '市场营销', 0, 'marketing', '市场营销策略和方案', 6, 0),
(6000000000000000007, '合规法务', 0, 'legal', '法律法规和合规要求', 7, 0),
(6000000000000000008, '培训资料', 0, 'training', '员工培训和学习资料', 8, 0);

-- 技术文档子分类
INSERT INTO `kb_category` (`id`, `category_name`, `parent_id`, `category_icon`, `description`, `sort`, `document_count`) VALUES
(6000000000000000011, '后端开发', 6000000000000000001, 'backend', '后端技术栈开发文档', 1, 0),
(6000000000000000012, '前端开发', 6000000000000000001, 'frontend', '前端技术栈开发文档', 2, 0),
(6000000000000000013, '数据库', 6000000000000000001, 'database', '数据库设计和优化', 3, 0),
(6000000000000000014, 'DevOps', 6000000000000000001, 'devops', '运维部署和CI/CD', 4, 0),
(6000000000000000015, '架构设计', 6000000000000000001, 'architecture', '系统架构设计文档', 5, 0);

-- 产品文档子分类
INSERT INTO `kb_category` (`id`, `category_name`, `parent_id`, `category_icon`, `description`, `sort`, `document_count`) VALUES
(6000000000000000021, '产品需求', 6000000000000000002, 'requirement', '产品需求文档PRD', 1, 0),
(6000000000000000022, 'UI设计', 6000000000000000002, 'design', 'UI/UX设计规范', 2, 0),
(6000000000000000023, '产品规划', 6000000000000000002, 'planning', '产品规划和路线图', 3, 0),
(6000000000000000024, '竞品分析', 6000000000000000002, 'competitive', '竞品分析报告', 4, 0);

-- =====================================================
-- 4. 初始化标签数据
-- =====================================================

INSERT INTO `kb_tag` (`id`, `tag_name`, `tag_color`, `description`, `use_count`) VALUES
(7000000000000000001, '重要', '#ff4d4f', '重要文档标签', 0),
(7000000000000000002, '置顶', '#1890ff', '置顶文档标签', 0),
(7000000000000000003, '推荐', '#52c41a', '推荐文档标签', 0),
(7000000000000000004, '草稿', '#d9d9d9', '草稿文档标签', 0),
(7000000000000000005, 'Java', '#b07219', 'Java技术标签', 0),
(7000000000000000006, 'Spring Boot', '#6db33f', 'Spring Boot标签', 0),
(7000000000000000007, 'React', '#61dafb', 'React前端标签', 0),
(7000000000000000008, 'MySQL', '#4479a1', 'MySQL数据库标签', 0),
(7000000000000000009, 'Redis', '#dc382d', 'Redis缓存标签', 0),
(7000000000000000010, 'Docker', '#2496ed', 'Docker容器标签', 0),
(7000000000000000011, '架构', '#722ed1', '系统架构标签', 0),
(7000000000000000012, '规范', '#fa8c16', '开发规范标签', 0);

-- =====================================================
-- 5. 初始化团队数据
-- =====================================================

INSERT INTO `kb_team` (`id`, `team_name`, `team_code`, `description`, `icon`, `leader_id`, `parent_id`, `sort`, `status`) VALUES
(8000000000000000001, '技术中心', 'TECH_CENTER', '负责公司所有技术研发工作', 'tech', 1000000000000000004, 0, 1, 1),
(8000000000000000002, '产品中心', 'PRODUCT_CENTER', '负责产品规划和设计', 'product', 1000000000000000005, 0, 2, 1),
(8000000000000000003, '运营中心', 'OPS_CENTER', '负责业务运营和市场推广', 'ops', 1000000000000000007, 0, 3, 1),
(8000000000000000004, '职能中心', 'ADMIN_CENTER', '负责公司行政人事财务工作', 'admin', 1000000000000000008, 0, 4, 1),
(8000000000000000005, '后端开发组', 'BACKEND_TEAM', '后端系统开发', 'backend', 1000000000000000004, 8000000000000000001, 1, 1),
(8000000000000000006, '前端开发组', 'FRONTEND_TEAM', '前端系统开发', 'frontend', 1000000000000000004, 8000000000000000001, 2, 1),
(8000000000000000007, '测试组', 'QA_TEAM', '质量保证和测试', 'qa', 1000000000000000003, 8000000000000000001, 3, 1);

-- 团队成员
INSERT INTO `kb_team_member` (`id`, `team_id`, `user_id`, `member_role`, `join_time`) VALUES
(9000000000000000001, 8000000000000000005, 1000000000000000004, 'leader', NOW()),
(9000000000000000002, 8000000000000000005, 1000000000000000001, 'member', NOW()),
(9000000000000000003, 8000000000000000006, 1000000000000000004, 'member', NOW()),
(9000000000000000004, 8000000000000000006, 1000000000000000006, 'member', NOW()),
(9000000000000000005, 8000000000000000007, 1000000000000000003, 'leader', NOW());

-- =====================================================
-- 6. 初始化文档数据
-- =====================================================

INSERT INTO `kb_document` (`id`, `title`, `content`, `summary`, `category_id`, `author_id`, `status`, `is_public`, `view_count`, `like_count`, `comment_count`, `version`, `publish_time`) VALUES
-- 技术文档
(1000000000000000001,
'Spring Boot 3.x 快速入门指南',
'# Spring Boot 3.x 快速入门指南\n\n## 项目初始化\n\n使用Spring Initializr创建项目：\n\n```xml\n<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-web</artifactId>\n</dependency>\n```\n\n## 核心特性\n\n### 1. 自动配置\nSpring Boot的自动配置大大简化了开发工作...\n\n### 2. 起步依赖\n提供了一系列starter依赖...\n\n### 3. 命令行界面\n内置了spring命令行工具...\n\n## 最佳实践\n\n- 遵循约定优于配置\n- 合理分层架构\n- 使用配置中心',
'Spring Boot 3.x完整入门教程，包含项目初始化、核心特性介绍和最佳实践。',
6000000000000000011, 1000000000000000004, 'published', 1, 1523, 89, 23, 1, '2024-01-15 10:00:00'),

(1000000000000000002,
'React 18 + TypeScript 最佳实践',
'# React 18 + TypeScript 最佳实践\n\n## 项目结构\n\n```\nsrc/\n├── components/     # 公共组件\n├── pages/          # 页面组件\n├── hooks/          # 自定义Hooks\n├── services/       # API服务\n├── stores/         # 状态管理\n├── types/          # 类型定义\n└── utils/          # 工具函数\n```\n\n## 核心概念\n\n### 函数组件\n```typescript\ninterface Props {\n  title: string;\n  count: number;\n}\n\nexport const MyComponent: React.FC<Props> = ({ title, count }) => {\n  return <div>{title}: {count}</div>;\n};\n```\n\n## 状态管理\n使用Zustand进行状态管理...',
'基于React 18和TypeScript的前端开发最佳实践，包含项目结构、核心概念和状态管理。',
6000000000000000012, 1000000000000000006, 'published', 1, 2187, 156, 45, 1, '2024-02-10 14:30:00'),

(1000000000000000003,
'MySQL 8.0 性能优化指南',
'# MySQL 8.0 性能优化指南\n\n## 索引优化\n\n### 索引设计原则\n1. 选择性高的列优先创建索引\n2. 联合索引注意最左前缀原则\n3. 避免冗余索引\n\n### 索引创建示例\n```sql\n-- 创建联合索引\nCREATE INDEX idx_user_email ON user(username, email);\n\n-- 创建全文索引\nCREATE FULLTEXT INDEX idx_content ON article(content);\n```\n\n## 查询优化\n\n### EXPLAIN分析\n使用EXPLAIN分析查询执行计划...\n\n### 慢查询日志\n配置慢查询日志定位性能瓶颈...',
'MySQL 8.0数据库性能优化完整指南，涵盖索引优化、查询优化和慢查询分析。',
6000000000000000013, 1000000000000000001, 'published', 1, 3421, 234, 67, 1, '2024-01-28 09:15:00'),

(1000000000000000004,
'Docker + Kubernetes 容器化部署',
'# Docker + Kubernetes 容器化部署\n\n## Docker基础\n\n### Dockerfile编写\n```dockerfile\nFROM openjdk:21-jdk-slim\nWORKDIR /app\nCOPY target/*.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "app.jar"]\n```\n\n## Kubernetes部署\n\n### Deployment配置\n```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: knowledge-base\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: knowledge-base\n  template:\n    metadata:\n      labels:\n        app: knowledge-base\n    spec:\n      containers:\n      - name: app\n        image: kb-app:latest\n        ports:\n        - containerPort: 8080\n```',
'基于Docker和Kubernetes的微服务容器化部署实践。',
6000000000000000014, 1000000000000000004, 'published', 1, 1876, 98, 19, 1, '2024-03-05 16:20:00'),

-- 产品文档
(1000000000000000005,
'企业知识库产品需求文档PRD',
'# 企业知识库产品需求文档\n\n## 1. 产品概述\n\n### 1.1 产品定位\n企业级知识管理平台，帮助企业沉淀知识资产，提升协作效率。\n\n### 1.2 目标用户\n- 企业员工：需要快速查找和获取知识\n- 管理员：需要管理和维护知识库\n- 决策者：需要知识数据分析\n\n## 2. 功能需求\n\n### 2.1 核心功能\n1. 文档管理\n2. 知识搜索\n3. 协作编辑\n4. 权限控制\n5. 数据统计\n\n### 2.2 用户体验\n- 简洁直观的界面\n- 快速响应的搜索\n- 便捷的编辑体验',
'完整的企业知识库产品需求文档，包含产品定位、目标用户和功能需求。',
6000000000000000021, 1000000000000000005, 'published', 1, 987, 45, 12, 1, '2024-02-01 10:00:00'),

(1000000000000000006,
'UI设计规范 V2.0',
'# UI设计规范 V2.0\n\n## 色彩系统\n\n### 主色调\n- 主色：#1890ff（蓝色）\n- 成功：#52c41a（绿色）\n- 警告：#faad14（橙色）\n- 错误：#ff4d4f（红色）\n\n### 中性色\n- 标题：#262626\n- 正文：#595959\n- 辅助：#8c8c8c\n- 禁用：#bfbfbf\n\n## 字体规范\n\n### 字号\n- 大标题：24px\n- 中标题：18px\n- 正文：14px\n- 辅助：12px\n\n## 组件规范\n\n### 按钮\n- 主按钮：蓝色背景\n- 次按钮：白色背景\n- 文字按钮：无边框',
'企业知识库UI设计规范，包含色彩系统、字体规范和组件规范。',
6000000000000000022, 1000000000000000006, 'published', 1, 654, 34, 8, 1, '2024-02-15 14:00:00'),

-- 业务流程
(1000000000000000007,
'文档审核流程规范',
'# 文档审核流程规范\n\n## 1. 流程概述\n\n文档发布前需要经过审核流程，确保内容质量。\n\n## 2. 审核流程\n\n### 2.1 提交审核\n作者完成文档后，点击"提交审核"按钮。\n\n### 2.2 审核人处理\n- 检查内容准确性\n- 检查格式规范性\n- 给出审核意见\n\n### 2.3 审核结果\n- **通过**：文档自动发布\n- **拒绝**：作者根据意见修改后重新提交\n\n## 3. 审核标准\n\n### 内容质量\n- 信息准确完整\n- 逻辑清晰条理\n- 格式规范统一\n\n### 技术文档\n- 代码可运行\n- 配置说明完整\n- 注意事项清楚',
'文档审核流程的详细规范，包括流程步骤和审核标准。',
6000000000000000003, 1000000000000000002, 'published', 1, 1234, 67, 15, 1, '2024-01-20 11:00:00'),

-- 人力资源
(1000000000000000008,
'员工入职指南',
'# 员工入职指南\n\n## 欢迎加入！\n\n首先欢迎你加入我们的团队！以下是入职注意事项。\n\n## 入职流程\n\n### 第一天\n1. 人事手续办理\n2. 办公环境介绍\n3. 账号权限开通\n4. 团队成员认识\n\n### 第一周\n1. 熟悉业务流程\n2. 参加新人培训\n3. 完成基础任务\n4. 导师一对一带教\n\n## 常用系统\n\n- 知识库系统：https://kb.company.com\n- OA办公系统：https://oa.company.com\n- 邮件系统：mail.company.com\n\n## 福利制度\n\n### 五险一金\n按国家规定缴纳。\n\n### 带薪年假\n- 工作满1年：5天\n- 工作满3年：10天\n- 工作满5年：15天',
'新员工入职指南，包含入职流程、常用系统和福利制度说明。',
6000000000000000004, 1000000000000000008, 'published', 1, 5678, 234, 56, 1, '2024-01-01 09:00:00'),

-- 财务制度
(1000000000000000009,
'报销流程说明',
'# 报销流程说明\n\n## 报销原则\n\n1. **真实合法**：票据必须真实有效\n2. **事前申请**：大额费用需提前申请\n3. **及时报销**：费用发生后1月内报销\n\n## 报销流程\n\n### 第一步：整理票据\n- 发票需为公司抬头的增值税发票\n- 票据日期、金额、项目清晰\n\n### 第二步：填写报销单\n在OA系统填写报销单，上传票据照片。\n\n### 第三步：审批流程\n- 部门经理审批\n- 财务审核\n- 总经理审批（金额>5000元）\n\n### 第四步：打款\n审批通过后3-5个工作日打款至工资卡。\n\n## 注意事项\n\n- 所有票据需按时间顺序整理\n- 交通费需注明往返地点\n- 招待费需注明事由和参与人员',
'公司费用报销流程的详细说明，包含报销原则、流程步骤和注意事项。',
6000000000000000005, 1000000000000000009, 'published', 1, 3456, 123, 34, 1, '2024-01-10 14:00:00');

-- 文档标签关联
INSERT INTO `kb_document_tag` (`id`, `document_id`, `tag_id`) VALUES
(1100000000000000001, 1000000000000000001, 7000000000000000006),
(1100000000000000002, 1000000000000000001, 7000000000000000005),
(1100000000000000003, 1000000000000000001, 7000000000000000011),
(1100000000000000004, 1000000000000000002, 7000000000000000007),
(1100000000000000005, 1000000000000000002, 7000000000000000012),
(1100000000000000006, 1000000000000000003, 7000000000000000008),
(1100000000000000007, 1000000000000000003, 7000000000000000009),
(1100000000000000008, 1000000000000000004, 7000000000000000010),
(1100000000000000009, 1000000000000000004, 7000000000000000014),
(1100000000000000010, 1000000000000000005, 7000000000000000002);

-- =====================================================
-- 7. 初始化评论数据
-- =====================================================

INSERT INTO `kb_comment` (`id`, `document_id`, `content`, `user_id`, `parent_id`, `like_count`, `status`) VALUES
(1200000000000000001, 1000000000000000001, '这篇文章写得很详细，对我帮助很大！', 1000000000000000002, 0, 12, 1),
(1200000000000000002, 1000000000000000001, '补充一点：自动配置的原理可以再详细讲讲', 1000000000000000004, 0, 5, 1),
(1200000000000000003, 1000000000000000002, 'TypeScript的类型定义很规范，学习了！', 1000000000000000003, 0, 8, 1),
(1200000000000000004, 1000000000000000002, '期待出下一期关于Hooks的文章', 1000000000000000002, 0, 3, 1),
(1200000000000000005, 1000000000000000003, '索引优化的技巧很实用，已经在项目中应用了', 1000000000000000005, 0, 15, 1),
(1200000000000000006, 1000000000000000005, 'PRD写得很清楚，产品逻辑很完整', 1000000000000000001, 0, 6, 1),
(1200000000000000007, 1000000000000000008, '入职指南很详细，帮助我快速熟悉了公司', 1000000000000000003, 0, 23, 1),
(1200000000000000008, 1000000000000000008, '建议补充一下远程办公的注意事项', 1000000000000000007, 0, 2, 1);

-- =====================================================
-- 8. 初始化系统配置数据
-- =====================================================

INSERT INTO `kb_system_config` (`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`) VALUES
(1300000000000000001, 'site.name', '企业知识库', 'string', 'basic', '站点名称', 1),
(1300000000000000002, 'site.logo', '/logo.png', 'string', 'basic', '站点Logo', 1),
(1300000000000000003, 'site.allowRegister', 'true', 'boolean', 'basic', '允许用户注册', 1),
(1300000000000000004, 'upload.maxSize', '104857600', 'number', 'upload', '最大上传文件大小（字节）', 0),
(1300000000000000005, 'upload.allowTypes', '.doc,.docx,.pdf,.txt,.md,.png,.jpg,.jpeg', 'string', 'upload', '允许的文件类型', 0),
(1300000000000000006, 'security.sessionTimeout', '7200', 'number', 'security', '会话超时时间（秒）', 0),
(1300000000000000007, 'security.passwordMinLength', '8', 'number', 'security', '密码最小长度', 0),
(1300000000000000008, 'email.enabled', 'false', 'boolean', 'email', '启用邮件通知', 0),
(1300000000000000009, 'email.host', 'smtp.example.com', 'string', 'email', 'SMTP服务器', 0),
(1300000000000000010, 'email.port', '587', 'number', 'email', 'SMTP端口', 0),
(1300000000000000011, 'ai.model', 'qwen-turbo', 'string', 'ai', 'AI模型名称', 0),
(1300000000000000012, 'ai.maxTokens', '2000', 'number', 'ai', 'AI最大Token数', 0);

-- =====================================================
-- 9. 初始化字典数据
-- =====================================================

-- 文档状态字典
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`) VALUES
(1400000000000000001, 'document_status', '文档状态', 'document', '文档状态枚举', 1);

INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `status`) VALUES
(1400000000000000001, 1400000000000000001, '草稿', 'draft', 1, 'default', 1),
(1400000000000000002, 1400000000000000001, '已发布', 'published', 2, 'success', 1),
(1400000000000000003, 1400000000000000001, '已归档', 'archived', 3, 'info', 1);

-- 审核状态字典
INSERT INTO `kb_dict` (`id`, `dict_code`, `dict_name`, `dict_type`, `description`, `sort`) VALUES
(1400000000000000002, 'review_status', '审核状态', 'review', '审核状态枚举', 2);

INSERT INTO `kb_dict_data` (`id`, `dict_id`, `dict_label`, `dict_value`, `dict_sort`, `css_class`, `status`) VALUES
(1400000000000000004, 1400000000000000002, '待审核', 'pending', 1, 'warning', 1),
(1400000000000000005, 1400000000000000002, '已通过', 'approved', 2, 'success', 1),
(1400000000000000006, 1400000000000000002, '已拒绝', 'rejected', 3, 'error', 1);

-- =====================================================
-- 10. 初始化通知数据
-- =====================================================

INSERT INTO `kb_notification` (`id`, `user_id`, `notification_type`, `title`, `content`, `link`, `is_read`) VALUES
(1500000000000000001, 1000000000000000002, 'system', '欢迎加入企业知识库', '欢迎加入企业知识库系统，开始您的知识管理之旅！', '/documents', 0),
(1500000000000000002, 1000000000000000004, 'comment', '您的文档收到新评论', '《Spring Boot 3.x 快速入门指南》收到新评论', '/documents/1000000000000000001', 0),
(1500000000000000003, 1000000000000000005, 'review', '文档审核通过', '您的《企业知识库产品需求文档PRD》已通过审核', '/documents/1000000000000000005', 1),
(1500000000000000004, 1000000000000000001, 'mention', '有人@了您', 'developer在《Docker + Kubernetes 容器化部署》中提到了您', '/documents/1000000000000000004', 0);

-- =====================================================
-- 11. 初始化AI对话数据
-- =====================================================

INSERT INTO `kb_ai_conversation` (`id`, `user_id`, `title`, `model_name`) VALUES
(1600000000000000001, 1000000000000000001, '关于Spring Boot的讨论', 'qwen-turbo'),
(1600000000000000002, 1000000000000000002, '前端开发问题咨询', 'qwen-turbo'),
(1600000000000000003, 1000000000000000004, '数据库优化建议', 'qwen-turbo');

INSERT INTO `kb_ai_message` (`id`, `conversation_id`, `role`, `content`, `tokens`, `created_at`) VALUES
(1700000000000000001, 1600000000000000001, 'user', 'Spring Boot自动配置的原理是什么？', 20, NOW()),
(1700000000000000002, 1600000000000000001, 'assistant', 'Spring Boot的自动配置是通过条件注解(@ConditionalOnClass、@ConditionalOnMissingBean等)实现的。它会根据类路径中的jar包和已定义的Bean来决定是否加载某个配置...', 150, NOW()),
(1700000000000000003, 1600000000000000001, 'user', '能详细解释一下吗？', 10, NOW()),
(1700000000000000004, 1600000000000000002, 'user', 'React 18的新特性有哪些？', 18, NOW()),
(1700000000000000005, 1600000000000000002, 'assistant', 'React 18的主要新特性包括：1. 并发渲染 2. 自动批处理 3. Transitions 4. Suspense改进...', 120, NOW());

-- =====================================================
-- 12. 初始化统计数据
-- =====================================================

-- 文档统计
INSERT INTO `kb_document_statistics` (`id`, `document_id`, `view_count`, `like_count`, `comment_count`, `collect_count`, `share_count`, `stat_date`) VALUES
(1800000000000000001, 1000000000000000001, 1523, 89, 23, 45, 12, CURDATE()),
(1800000000000000002, 1000000000000000002, 2187, 156, 45, 67, 23, CURDATE()),
(1800000000000000003, 1000000000000000003, 3421, 234, 67, 89, 34, CURDATE());

-- 用户统计
INSERT INTO `kb_user_statistics` (`id`, `user_id`, `document_count`, `comment_count`, `like_count`, `view_count`, `login_count`, `stat_date`) VALUES
(1900000000000000001, 1000000000000000001, 3, 15, 45, 2345, 67, CURDATE()),
(1900000000000000002, 1000000000000000004, 2, 23, 89, 4523, 89, CURDATE()),
(1900000000000000003, 1000000000000000002, 1, 12, 34, 1234, 45, CURDATE());

-- =====================================================
-- 完成提示
-- =====================================================

SELECT '数据初始化完成！' AS message;
SELECT CONCAT('已初始化用户数: ', COUNT(*)) AS info FROM `kb_user`;
SELECT CONCAT('已初始化角色数: ', COUNT(*)) AS info FROM `kb_role`;
SELECT CONCAT('已初始化权限数: ', COUNT(*)) AS info FROM `kb_permission`;
SELECT CONCAT('已初始化分类数: ', COUNT(*)) AS info FROM `kb_category`;
SELECT CONCAT('已初始化文档数: ', COUNT(*)) AS info FROM `kb_document`;
