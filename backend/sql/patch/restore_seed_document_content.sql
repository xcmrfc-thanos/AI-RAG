-- 回填 seed 文档 MySQL content（content_id 为空时 KAG/详情依赖此列）
-- 来源：master-sql/02_init_data.sql 正文；幂等 UPDATE

UPDATE `kb_document` SET `content` = '# Spring Boot 3.x 快速入门指南\n\n## 项目初始化\n\n使用Spring Initializr创建项目：\n\n```xml\n<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-web</artifactId>\n</dependency>\n```\n\n## 核心特性\n\n### 1. 自动配置\nSpring Boot的自动配置大大简化了开发工作...\n\n### 2. 起步依赖\n提供了一系列starter依赖...\n\n### 3. 命令行界面\n内置了spring命令行工具...\n\n## 最佳实践\n\n- 遵循约定优于配置\n- 合理分层架构\n- 使用配置中心',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000001 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# React 18 + TypeScript 最佳实践\n\n## 项目结构\n\n```\nsrc/\n├── components/     # 公共组件\n├── pages/          # 页面组件\n├── hooks/          # 自定义Hooks\n├── services/       # API服务\n├── stores/         # 状态管理\n├── types/          # 类型定义\n└── utils/          # 工具函数\n```\n\n## 核心概念\n\n### 函数组件\n```typescript\ninterface Props {\n  title: string;\n  count: number;\n}\n\nexport const MyComponent: React.FC<Props> = ({ title, count }) => {\n  return <div>{title}: {count}</div>;\n};\n```\n\n## 状态管理\n使用Zustand进行状态管理...',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000002 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# MySQL 8.0 性能优化指南\n\n## 索引优化\n\n### 索引设计原则\n1. 选择性高的列优先创建索引\n2. 联合索引注意最左前缀原则\n3. 避免冗余索引\n\n### 索引创建示例\n```sql\n-- 创建联合索引\nCREATE INDEX idx_user_email ON user(username, email);\n\n-- 创建全文索引\nCREATE FULLTEXT INDEX idx_content ON article(content);\n```\n\n## 查询优化\n\n### EXPLAIN分析\n使用EXPLAIN分析查询执行计划...\n\n### 慢查询日志\n配置慢查询日志定位性能瓶颈...',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000003 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# Docker + Kubernetes 容器化部署\n\n## Docker基础\n\n### Dockerfile编写\n```dockerfile\nFROM openjdk:21-jdk-slim\nWORKDIR /app\nCOPY target/*.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "app.jar"]\n```\n\n## Kubernetes部署\n\n### Deployment配置\n```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: knowledge-base\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: knowledge-base\n  template:\n    metadata:\n      labels:\n        app: knowledge-base\n    spec:\n      containers:\n      - name: app\n        image: kb-app:latest\n        ports:\n        - containerPort: 8080\n```',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000004 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# 企业知识库产品需求文档\n\n## 1. 产品概述\n\n### 1.1 产品定位\n企业级知识管理平台，帮助企业沉淀知识资产，提升协作效率。\n\n### 1.2 目标用户\n- 企业员工：需要快速查找和获取知识\n- 管理员：需要管理和维护知识库\n- 决策者：需要知识数据分析\n\n## 2. 功能需求\n\n### 2.1 核心功能\n1. 文档管理\n2. 知识搜索\n3. 协作编辑\n4. 权限控制\n5. 数据统计\n\n### 2.2 用户体验\n- 简洁直观的界面\n- 快速响应的搜索\n- 便捷的编辑体验',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000005 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# UI设计规范 V2.0\n\n## 色彩系统\n\n### 主色调\n- 主色：#1890ff（蓝色）\n- 成功：#52c41a（绿色）\n- 警告：#faad14（橙色）\n- 错误：#ff4d4f（红色）\n\n### 中性色\n- 标题：#262626\n- 正文：#595959\n- 辅助：#8c8c8c\n- 禁用：#bfbfbf\n\n## 字体规范\n\n### 字号\n- 大标题：24px\n- 中标题：18px\n- 正文：14px\n- 辅助：12px\n\n## 组件规范\n\n### 按钮\n- 主按钮：蓝色背景\n- 次按钮：白色背景\n- 文字按钮：无边框',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000006 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# 文档审核流程规范\n\n## 1. 流程概述\n\n文档发布前需要经过审核流程，确保内容质量。\n\n## 2. 审核流程\n\n### 2.1 提交审核\n作者完成文档后，点击"提交审核"按钮。\n\n### 2.2 审核人处理\n- 检查内容准确性\n- 检查格式规范性\n- 给出审核意见\n\n### 2.3 审核结果\n- **通过**：文档自动发布\n- **拒绝**：作者根据意见修改后重新提交\n\n## 3. 审核标准\n\n### 内容质量\n- 信息准确完整\n- 逻辑清晰条理\n- 格式规范统一\n\n### 技术文档\n- 代码可运行\n- 配置说明完整\n- 注意事项清楚',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000007 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# 员工入职指南\n\n## 欢迎加入！\n\n首先欢迎你加入我们的团队！以下是入职注意事项。\n\n## 入职流程\n\n### 第一天\n1. 人事手续办理\n2. 办公环境介绍\n3. 账号权限开通\n4. 团队成员认识\n\n### 第一周\n1. 熟悉业务流程\n2. 参加新人培训\n3. 完成基础任务\n4. 导师一对一带教\n\n## 常用系统\n\n- 知识库系统：https://kb.company.com\n- OA办公系统：https://oa.company.com\n- 邮件系统：mail.company.com\n\n## 福利制度\n\n### 五险一金\n按国家规定缴纳。\n\n### 带薪年假\n- 工作满1年：5天\n- 工作满3年：10天\n- 工作满5年：15天',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000008 AND (`content` IS NULL OR `content` = '');

UPDATE `kb_document` SET `content` = '# 报销流程说明\n\n## 报销原则\n\n1. **真实合法**：票据必须真实有效\n2. **事前申请**：大额费用需提前申请\n3. **及时报销**：费用发生后1月内报销\n\n## 报销流程\n\n### 第一步：整理票据\n- 发票需为公司抬头的增值税发票\n- 票据日期、金额、项目清晰\n\n### 第二步：填写报销单\n在OA系统填写报销单，上传票据照片。\n\n### 第三步：审批流程\n- 部门经理审批\n- 财务审核\n- 总经理审批（金额>5000元）\n\n### 第四步：打款\n审批通过后3-5个工作日打款至工资卡。\n\n## 注意事项\n\n- 所有票据需按时间顺序整理\n- 交通费需注明往返地点\n- 招待费需注明事由和参与人员',
    `content_length` = CHAR_LENGTH(`content`)
WHERE `id` = 1000000000000000009 AND (`content` IS NULL OR `content` = '');

SELECT id, CHAR_LENGTH(content) AS clen FROM `kb_document` WHERE id BETWEEN 1000000000000000001 AND 1000000000000000009;
