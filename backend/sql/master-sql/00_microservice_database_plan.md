# 企业知识库系统 - 微服务数据库拆分方案

## 📊 架构设计原则

遵循 **Database per Service** 模式，每个微服务拥有独立的数据库，实现：
- 服务数据隔离
- 独立部署和扩展
- 故障隔离
- 技术栈灵活性

## 🗄️ 数据库拆分方案

### 服务与数据库映射

| 微服务 | 数据库名称 | 端口 | 包含表 | 说明 |
|--------|-----------|------|--------|------|
| kb-user-auth | kb_user | 8081 | 用户、角色、权限、团队 | 用户认证与授权 |
| kb-document | kb_document | 8082 | 文档、分类、标签、评论、审核、版本 | 文档管理核心 |
| kb-search | kb_search | 8083 | 搜索历史 | 搜索服务 |
| kb-file | kb_file | 8084 | 文件信息 | 文件存储 |
| kb-ai | kb_ai | 8086 | AI对话、消息、反馈 | AI服务 |
| kb-statistics | kb_statistics | 8085 | 统计数据 | 数据统计 |
| kb-notification | kb_notification | 8087 | 通知消息 | 通知服务 |
| kb-graph | kb_graph | 8088 | 图谱节点和关系 | 知识图谱 |
| kb-common | kb_common | - | 操作日志、系统配置、字典 | 公共模块（共享） |

### 数据库详细信息

#### 1. kb_user (用户认证数据库)
```
📦 kb_user
├── kb_user                  # 用户表
├── kb_role                  # 角色表
├── kb_permission            # 权限表
├── kb_user_role             # 用户角色关联表
├── kb_role_permission       # 角色权限关联表
├── kb_team                  # 团队表
└── kb_team_member           # 团队成员表
```

#### 2. kb_document (文档管理数据库)
```
📦 kb_document
├── kb_document              # 文档表
├── kb_category              # 文档分类表
├── kb_tag                   # 文档标签表
├── kb_document_tag          # 文档标签关联表
├── kb_comment               # 文档评论表
├── kb_document_review       # 文档审核表
└── kb_document_version      # 文档版本表
```

#### 3. kb_search (搜索服务数据库)
```
📦 kb_search
└── kb_search_history        # 搜索历史表
```

#### 4. kb_file (文件服务数据库)
```
📦 kb_file
└── kb_file                  # 文件信息表
```

#### 5. kb_ai (AI服务数据库)
```
📦 kb_ai
├── kb_ai_conversation       # AI对话表
├── kb_ai_message            # AI消息表
└── kb_ai_feedback           # AI反馈表
```

#### 6. kb_statistics (统计服务数据库)
```
📦 kb_statistics
├── kb_document_statistics   # 文档统计表
├── kb_user_statistics       # 用户统计表
├── kb_view_record           # 浏览记录表
└── kb_comment_statistics    # 评论统计表
```

#### 7. kb_notification (通知服务数据库)
```
📦 kb_notification
└── kb_notification          # 系统通知表
```

#### 8. kb_graph (图谱服务数据库)
```
📦 kb_graph
├── kb_graph_node            # 图谱节点表（可选，主要用Neo4j）
├── kb_graph_edge            # 图谱边表（可选，主要用Neo4j）
└── kb_graph_community       # 图谱社区表
```

#### 9. kb_common (公共模块数据库)
```
📦 kb_common
├── kb_operation_log         # 操作日志表
├── kb_system_config         # 系统配置表
├── kb_dict                  # 字典表
└── kb_dict_data             # 字典数据表
```

## 🔗 跨服务关联处理

### 服务间通信方式

| 场景 | 解决方案 | 示例 |
|------|----------|------|
| 用户查询文档 | 通过文档服务API | documentService.getByAuthorId(userId) |
| 文档添加评论 | 文档服务调用用户服务获取用户信息 | userService.getUserById(userId) |
| 统计汇总数据 | 统计服务读取各服务数据 | 通过消息队列同步数据 |
| 全局搜索 | 搜索服务索引各服务数据 | Elasticsearch同步各服务数据 |

### 分布式事务处理

| 场景 | 解决方案 | 说明 |
|------|----------|------|
| 文档创建+统计更新 | 异步消息队列 | 文档创建后发送消息，统计服务消费更新 |
| 用户删除+数据清理 | Saga模式 | 按步骤执行，失败时补偿 |
| 文档审核+通知 | 事件驱动 | 审核完成发布事件，通知服务订阅 |

### 数据一致性策略

1. **最终一致性**：通过消息队列保证最终一致
2. **补偿机制**：Saga模式处理分布式事务
3. **幂等设计**：所有API支持幂等调用
4. **事件溯源**：关键操作记录事件日志

## 📁 数据库创建脚本

### 执行顺序

```bash
# 1. 创建所有数据库
mysql -u root -p123456 < sql/00_create_databases.sql

# 2. 创建各数据库表结构
mysql -u root -p123456 kb_user < sql/01_kb_user.sql
mysql -u root -p123456 kb_document < sql/02_kb_document.sql
mysql -u root -p123456 kb_search < sql/03_kb_search.sql
mysql -u root -p123456 kb_file < sql/04_kb_file.sql
mysql -u root -p123456 kb_ai < sql/05_kb_ai.sql
mysql -u root -p123456 kb_statistics < sql/06_kb_statistics.sql
mysql -u root -p123456 kb_notification < sql/07_kb_notification.sql
mysql -u root -p123456 kb_graph < sql/08_kb_graph.sql
mysql -u root -p123456 kb_common < sql/09_kb_common.sql

# 3. 初始化各数据库数据
mysql -u root -p123456 kb_user < sql/init_kb_user.sql
mysql -u root -p123456 kb_document < sql/init_kb_document.sql
# ... 其他初始化脚本
```

## ⚙️ 配置文件修改

### 各服务配置

每个微服务的 application.yml 配置对应的数据库名称：

```yaml
# kb-user-auth
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/kb_user

# kb-document
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/kb_document

# kb-search
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/kb_search
```

## 🚀 迁移步骤

### 从单体数据库迁移到微服务数据库

1. **备份现有数据**
   ```bash
   mysqldump -u root -p123456 knowledge_base > kb_backup.sql
   ```

2. **创建新数据库**
   ```bash
   mysql -u root -p123456 < sql/00_create_databases.sql
   ```

3. **分步迁移表结构**
   ```bash
   # 按顺序执行各数据库创建脚本
   ```

4. **迁移数据**
   - 使用 mysqldump 导出单个表
   - 导入到对应的新数据库
   - 或使用数据迁移工具

5. **更新配置文件**
   - 修改所有 application.yml
   - 更新数据库名称

6. **测试验证**
   - 单元测试
   - 集成测试
   - 端到端测试

## 📊 数据库连接池配置

每个服务独立配置连接池：

```yaml
spring:
  datasource:
    druid:
      initial-size: 5      # 根据服务负载调整
      min-idle: 5
      max-active: 20       # 不同服务可配置不同值
      max-wait: 60000
```

### 连接池大小建议

| 服务 | 初始连接 | 最小空闲 | 最大活跃 |
|------|----------|----------|----------|
| user-auth | 10 | 5 | 50 |
| document | 20 | 10 | 100 |
| search | 5 | 5 | 30 |
| statistics | 5 | 5 | 20 |

## 🔒 安全建议

1. **数据库用户隔离**
   ```sql
   -- 为每个服务创建独立的数据库用户
   CREATE USER 'kb_user'@'%' IDENTIFIED BY 'kb_user_2024';
   CREATE USER 'kb_document'@'%' IDENTIFIED BY 'kb_document_2024';
   -- 授权
   GRANT ALL ON kb_user.* TO 'kb_user'@'%';
   GRANT ALL ON kb_document.* TO 'kb_document'@'%';
   ```

2. **网络隔离**
   - 生产环境使用VPC隔离
   - 只允许服务间通过内网访问

3. **备份策略**
   - 每个数据库独立备份
   - 不同的备份保留策略

## 📝 注意事项

1. **分布式ID生成**
   - 确保所有服务使用雪花算法生成全局唯一ID
   - 避免ID冲突

2. **外键处理**
   - 微服务架构不使用跨库外键
   - 通过应用层保证数据一致性

3. **事务边界**
   - 事务只在单个服务内
   - 跨服务事务使用最终一致性

4. **监控告警**
   - 监控每个数据库的连接数、性能
   - 设置合理的告警阈值
