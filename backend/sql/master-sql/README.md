# 企业知识库系统 - 数据库脚本

本目录包含企业知识库系统的所有数据库脚本。

## 📁 文件说明

| 文件名 | 说明 | 执行顺序 |
|--------|------|----------|
| `01_create_tables.sql` | 创建所有数据库表结构 | 1 |
| `02_init_data.sql` | 初始化企业级数据 | 2 |

## 🚀 快速开始

### 1. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS `knowledge_base`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 2. 执行建表脚本

```bash
mysql -u root -p knowledge_base < 01_create_tables.sql
```

或在MySQL客户端中：

```sql
USE knowledge_base;
SOURCE /path/to/01_create_tables.sql;
```

### 3. 初始化数据

```bash
mysql -u root -p knowledge_base < 02_init_data.sql
```

或在MySQL客户端中：

```sql
USE knowledge_base;
SOURCE /path/to/02_init_data.sql;
```

## 📊 数据库表结构

### 核心表统计

| 模块 | 表数量 | 说明 |
|------|--------|------|
| 用户认证模块 (kb-user-auth) | 6张表 | 用户、角色、权限、团队管理 |
| 文档管理模块 (kb-document) | 8张表 | 文档、分类、标签、评论、审核、版本 |
| 搜索模块 (kb-search) | 1张表 | 搜索历史记录 |
| 文件管理模块 (kb-file) | 1张表 | 文件信息管理 |
| 通知模块 (kb-notification) | 1张表 | 系统通知 |
| AI模块 (kb-ai) | 3张表 | AI对话、消息、反馈 |
| 统计模块 (kb-statistics) | 4张表 | 文档、用户、评论、浏览统计 |
| 公共模块 (kb-common) | 5张表 | 操作日志、系统配置、字典 |
| **总计** | **29张表** | - |

### 表关系说明

```
kb_user (用户表)
  ├── kb_user_role (用户角色关联)
  │     └── kb_role (角色表)
  │           └── kb_role_permission (角色权限关联)
  │                 └── kb_permission (权限表)
  ├── kb_team_member (团队成员)
  │     └── kb_team (团队表)
  └── kb_document (文档表)
        ├── kb_category (分类表)
        ├── kb_document_tag (文档标签关联)
        │     └── kb_tag (标签表)
        ├── kb_document_version (文档版本)
        ├── kb_comment (评论表)
        ├── kb_document_review (文档审核)
        └── kb_file (文件表)
```

## 👤 默认账户

系统初始化后包含以下测试账户：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 超级管理员 | 拥有所有权限 |
| editor | admin123 | 编辑 | 可编辑和管理文档 |
| tester | admin123 | 普通用户 | 测试人员账户 |
| developer | admin123 | 普通用户 | 开发工程师账户 |
| product | admin123 | 普通用户 | 产品经理账户 |
| designer | admin123 | 普通用户 | UI设计师账户 |
| sales | admin123 | 普通用户 | 销售经理账户 |
| hr | admin123 | 普通用户 | 人事专员账户 |
| finance | admin123 | 普通用户 | 财务主管账户 |
| guest | admin123 | 访客 | 只读访问权限 |

⚠️ **重要提示**：生产环境部署后请立即修改默认密码！

## 📦 初始化数据说明

### 已初始化的内容

1. **用户数据**：10个测试用户，覆盖不同部门
2. **角色权限**：6个角色 + 36个权限（菜单、按钮、API）
3. **文档分类**：8个一级分类 + 多个二级分类
4. **标签数据**：12个常用标签
5. **团队数据**：4个中心 + 3个开发组
6. **文档数据**：9篇示例文档（技术、产品、流程等）
7. **评论数据**：8条示例评论
8. **系统配置**：12项系统配置
9. **字典数据**：2个字典类型 + 6个字典项
10. **通知数据**：4条示例通知
11. **AI对话**：3个对话 + 5条消息
12. **统计数据**：文档和用户统计数据

### 文档分类结构

```
技术文档 (💻)
├── 后端开发 (🔧)
├── 前端开发 (🎨)
├── 数据库 (🗄️)
├── DevOps (🚀)
└── 架构设计 (🏗️)

产品文档 (📦)
├── 产品需求 (📝)
├── UI设计 (🎭)
├── 产品规划 (🎯)
└── 竞品分析 (🔍)

业务流程 (📋)
人力资源 (👥)
财务制度 (💰)
市场营销 (📈)
合规法务 (⚖️)
培训资料 (📚)
```

## 🔧 维护说明

### 备份数据库

```bash
mysqldump -u root -p knowledge_base > kb_backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
mysql -u root -p knowledge_base < kb_backup_20240101.sql
```

### 清空测试数据

如需清空所有数据但保留表结构：

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE kb_ai_conversation;
TRUNCATE TABLE kb_ai_feedback;
TRUNCATE TABLE kb_ai_message;
TRUNCATE TABLE kb_comment;
TRUNCATE TABLE kb_comment_statistics;
TRUNCATE TABLE kb_dict;
TRUNCATE TABLE kb_dict_data;
TRUNCATE TABLE kb_document;
TRUNCATE TABLE kb_document_review;
TRUNCATE TABLE kb_document_statistics;
TRUNCATE TABLE kb_document_tag;
TRUNCATE TABLE kb_document_version;
TRUNCATE TABLE kb_file;
TRUNCATE TABLE kb_notification;
TRUNCATE TABLE kb_operation_log;
TRUNCATE TABLE kb_permission;
TRUNCATE TABLE kb_role;
TRUNCATE TABLE kb_role_permission;
TRUNCATE TABLE kb_search_history;
TRUNCATE TABLE kb_system_config;
TRUNCATE TABLE kb_tag;
TRUNCATE TABLE kb_team;
TRUNCATE TABLE kb_team_member;
TRUNCATE TABLE kb_user;
TRUNCATE TABLE kb_user_role;
TRUNCATE TABLE kb_user_statistics;
TRUNCATE TABLE kb_view_record;
TRUNCATE TABLE kb_category;
SET FOREIGN_KEY_CHECKS = 1;
```

## 📝 注意事项

1. **字符集**：数据库和表统一使用 `utf8mb4` 字符集
2. **排序规则**：使用 `utf8mb4_unicode_ci` 排序规则
3. **时间字段**：统一使用 `DATETIME` 类型
4. **主键类型**：使用 `BIGINT` 类型，配合雪花算法生成分布式ID
5. **软删除**：核心业务表包含 `deleted` 字段实现软删除
6. **审计字段**：包含 `create_time`、`update_time`、`create_by`、`update_by`
7. **索引优化**：为常用查询字段添加了合适的索引
8. **全文搜索**：文档表包含全文索引用于内容搜索

## 🔄 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | 2024-01-01 | 初始版本，创建完整表结构和初始化数据 |

## 📞 技术支持

如有问题，请联系技术团队或提交Issue。
