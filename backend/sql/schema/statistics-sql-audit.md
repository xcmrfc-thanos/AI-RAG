# kb-statistics SQL 审计报告（任务 32）

> **状态：历史审计快照（已收口）** — 非运维入口；现行 DDL 见 `schema/mysql/kb_statistics.sql`。  
> **审计日期**：2026-07-11  
> **审计范围**：`backend/kb-statistics` 全部 Mapper XML、JdbcTemplate 内联 SQL、Entity `@TableName`、定时任务 SQL  
> **权威 Schema（现行）**：`backend/sql/schema/mysql/kb_statistics.sql`  
> **下一任务**：任务 33 — 按本表「待改造项」执行去 VIEW 改造并标注废弃 SQL（已完成，本文仅留档）

---

## 1. 结论摘要

| 维度 | 结论 |
|------|------|
| **跨库 VIEW 运行时依赖** | **无**。运行时代码未引用 `kb_document`/`kb_user`/`kb_comment`/`kb_operation_log`/`kb_category`/`kb_ai_*` 等跨库视图名 |
| **本库表使用** | 已全面迁移至 `stat_*` 投影宽表 + `kb_view_history` 事件表 + `kb_*_statistics` 日聚合表 |
| **遗留风险** | ① 旧 SQL 脚本仍含 `CREATE VIEW`；② `StatisticsServiceImpl` 存在 `kb_view_history` 回退路径；③ 部分指标仍扫原始浏览表而非预聚合表 |
| **任务 33 工作量** | 低～中：以标注废弃 SQL、去除回退、统一预聚合读路径为主，无需大规模改 Mapper |

---

## 2. 跨库 VIEW 清单（历史债务，运行时不应依赖）

来源文件（已归档，仅本地）：`sql/_archive/master-sql/12_kb_statistics_views.sql`、`14_kb_statistics_ai_views.sql`、旧 export

| VIEW 名 | 跨库来源 | 运行时 Java/SQL 是否引用 | 替代方案（已落地） |
|---------|----------|--------------------------|-------------------|
| `kb_document` | `kb_document.kb_document` | **否** | `stat_document`（MQ 投影，`CoreStatisticsProjectionListener`） |
| `kb_user` | `kb_user.kb_user` | **否** | `stat_user` |
| `kb_comment` | `kb_document.tb_comment` | **否** | `stat_comment` |
| `kb_operation_log` | `kb_foundation.kb_operation_log` | **否** | `stat_operation_log`（`OperationLogStatisticsListener`） |
| `kb_category` | `kb_document.kb_category` | **否** | `stat_category` |
| `kb_ai_conversation` | `kb_ai.conversation` | **否** | `stat_ai_conversation`（`AiStatisticsMQListener`） |
| `kb_ai_message` | `kb_ai.message` | **否** | `stat_ai_message` |

**任务 33 动作**：在上述 SQL 文件头部加 `@deprecated` 说明，全新部署仅执行 `sql/schema/kb_statistics.sql`。

---

## 3. 本库表分类（合法依赖）

| 表名 | 类型 | 用途 |
|------|------|------|
| `stat_document` / `stat_user` / `stat_comment` / `stat_category` / `stat_operation_log` | MQ 投影宽表 | 文档/用户/评论/分类/操作日志只读副本 |
| `stat_ai_conversation` / `stat_ai_message` | MQ 投影宽表 | AI 统计 |
| `kb_view_history` | 事件明细表 | 浏览事件写入（MQ 监听）与明细查询 |
| `kb_document_statistics` / `kb_user_statistics` | 日聚合表 | 趋势、排行（`StatisticsAggregationTask` 每日聚合） |
| `kb_comment_statistics` | 日聚合表 | 评论日统计（schema 已定义，业务暂未深度使用） |

> **注意**：`kb_view_history` 名称含 “view”，但是 **本库物理表**，不是跨库 VIEW。

---

## 4. 运行时代码审计明细

### 4.1 Mapper XML

| 文件 | 涉及表 | 跨库 VIEW | 任务 33 建议 |
|------|--------|-----------|--------------|
| `DocumentStatisticsMapper.xml` | `stat_document`（14 处） | 无 | 保持 |
| `UserStatisticsMapper.xml` | `stat_user`、`stat_operation_log`、`stat_document`、`stat_comment`；`countUserViews` → `kb_view_history` | 无 | `countUserViews` 可改查 `kb_user_statistics` 按日 SUM |
| `CommentStatisticsMapper.xml` | `stat_comment`（9 处） | 无 | 保持 |
| `AiStatisticsMapper.xml` | `stat_ai_conversation`、`stat_ai_message` | 无 | 保持 |
| `ViewStatisticsMapper.xml` | `kb_view_history`（13 处） | 无 | 概览总浏览量可改 `stat_document`/`kb_document_statistics`；明细保留 |
| `DocumentStatisticsAggMapper.xml` | `kb_document_statistics` | 无 | 保持 |
| `UserStatisticsAggMapper.xml` | `kb_user_statistics` | 无 | 保持 |

### 4.2 Entity `@TableName`

| 实体 | 表名 | 跨库 VIEW |
|------|------|-----------|
| `DocumentStatistics` | `stat_document` | 无 |
| `UserStatistics` | `stat_user` | 无 |
| `CommentStatistics` | `stat_comment` | 无 |
| `ViewStatistics` | `kb_view_history` | 无（本库表） |

### 4.3 JdbcTemplate 内联 SQL

| 文件 | SQL 摘要 | 表 | 跨库 VIEW | 任务 33 建议 |
|------|----------|-----|-----------|--------------|
| `CoreStatisticsProjectionListener` | INSERT/UPDATE | `stat_document`、`stat_user`、`stat_comment`、`stat_category` | 无 | 保持 |
| `OperationLogStatisticsListener` | INSERT | `stat_operation_log` | 无 | 保持 |
| `AiStatisticsMQListener` | INSERT/UPDATE | `stat_ai_conversation`、`stat_ai_message` | 无 | 保持 |
| `StatisticsMQListener` | INSERT + UPDATE | `kb_view_history`、`stat_document` | 无 | 保持 |
| `StatisticsAggregationTask` | SELECT/INSERT/DELETE | `kb_view_history` → `kb_document_statistics` / `kb_user_statistics` | 无 | 保持（聚合流水线） |
| `StatisticsServiceImpl` | SELECT | `stat_category`、`stat_document` | 无 | 保持 |
| `HotDocumentsCacheTask` | SELECT | `stat_category`、`stat_document` | 无 | 保持 |
| `LatestDocumentsCacheTask` | SELECT | `stat_category`、`stat_document` | 无 | 保持 |

### 4.4 Service 层逻辑回退（任务 33 必改）

| 文件 | 方法 | 现状 | 替代方案 |
|------|------|------|----------|
| `StatisticsServiceImpl` | `queryTopUsersByType("view")` | 先查 `kb_user_statistics` 预聚合，失败则 **回退** `viewMapper.selectMostActiveViewers`（扫 `kb_view_history`） | 移除 try/catch 回退；预聚合空结果时返回空列表或改查 `kb_user_statistics` 全量 |
| `StatisticsServiceImpl` | `loadOverview` / `getAdminOverview` | `viewMapper.countAll()` / `countByDateRange` 扫 `kb_view_history` | 总浏览量改用 `documentMapper.sumViewCount()`（`stat_document`）；今日浏览可改 `kb_document_statistics` 当日 SUM |
| `StatisticsServiceImpl` | `buildViewCountMap` | MyBatis-Plus 扫 `kb_view_history` 全量 | 改 `kb_user_statistics` 日期范围 SUM 或保留（用户活跃度需明细时合理） |

---

## 5. 按文件 → SQL → 替代方案（完整索引）

| # | 源文件 | SQL/表 | 是否跨库 VIEW | 替代方案 / 状态 |
|---|--------|--------|---------------|-----------------|
| 1 | `DocumentStatisticsMapper.xml` | `FROM stat_document` | 否 | ✅ 已用投影表 |
| 2 | `UserStatisticsMapper.xml` | `FROM stat_user` | 否 | ✅ 已用投影表 |
| 3 | `UserStatisticsMapper.xml` | `FROM stat_operation_log` | 否 | ✅ 已用投影表 |
| 4 | `UserStatisticsMapper.xml` | `FROM kb_view_history`（`countUserViews`） | 否 | ⚠️ 任务 33：改 `kb_user_statistics` |
| 5 | `CommentStatisticsMapper.xml` | `FROM stat_comment` | 否 | ✅ 已用投影表 |
| 6 | `AiStatisticsMapper.xml` | `FROM stat_ai_*` | 否 | ✅ 已用投影表 |
| 7 | `ViewStatisticsMapper.xml` | `FROM kb_view_history`（13 语句） | 否 | ⚠️ 任务 33：概览类改聚合表；明细保留 |
| 8 | `DocumentStatisticsAggMapper.xml` | `FROM kb_document_statistics` | 否 | ✅ 已用预聚合 |
| 9 | `UserStatisticsAggMapper.xml` | `FROM kb_user_statistics` | 否 | ✅ 已用预聚合 |
| 10 | `StatisticsServiceImpl.java:733` | 回退 `viewMapper.selectMostActiveViewers` | 否 | ❌ 任务 33：删除回退 |
| 11 | `StatisticsAggregationTask.java` | `kb_view_history` 读写 | 否 | ✅ 聚合管道，保留 |
| 12 | `StatisticsMQListener.java` | INSERT `kb_view_history` | 否 | ✅ 事件采集，保留 |
| 13 | `12_kb_statistics_views.sql` | CREATE VIEW ×5 | **是（脚本）** | ❌ 任务 33：标注废弃，不纳入新部署 |
| 14 | `14_kb_statistics_ai_views.sql` | CREATE VIEW ×2 | **是（脚本）** | ❌ 任务 33：标注废弃 |
| 15 | `knowledge_base_export_*.sql` | CREATE VIEW 段 | **是（脚本）** | ❌ 任务 33：标注废弃 |

---

## 6. 自检命令（任务 32）

```powershell
# 确认 kb-statistics 运行时代码无跨库 VIEW 表名引用
rg "FROM kb_document[^_]|FROM kb_user[^_]|FROM kb_comment|FROM kb_operation_log|FROM kb_category[^_]|FROM kb_ai_" backend/kb-statistics/src

# 预期：无匹配（或仅注释/文档）

# 确认 stat_* 投影表已覆盖主要查询
rg "stat_document|stat_user|stat_comment|stat_category|stat_operation_log|stat_ai_" backend/kb-statistics/src --count
```

**自检结果（2026-07-11）**：第一条命令 **0 匹配**；投影表引用 **60+ 处**。

---

## 7. 任务 33 改造清单（预排）

1. `12_kb_statistics_views.sql`、`14_kb_statistics_ai_views.sql`、export 中 VIEW 段 — 头部加废弃说明，指向 `sql/schema/kb_statistics.sql`
2. `StatisticsServiceImpl.queryTopUsersByType` — 移除 `kb_view_history` 回退
3. `StatisticsServiceImpl.loadOverview` / `getAdminOverview` — 总浏览量改 `stat_document.sumViewCount`
4. `UserStatisticsMapper.countUserViews` — 可选改 `kb_user_statistics`
5. 更新 `sql/schema/kb_statistics.sql` 注释，声明不含 VIEW
6. 全仓 `mvn test` 回归

---

## 8. 参考文件

| 路径 | 说明 |
|------|------|
| `backend/sql/schema/kb_statistics.sql` | 权威 schema（无 VIEW） |
| `backend/sql/_archive/master-sql/12_kb_statistics_views.sql` | 已归档跨库 VIEW |
| `backend/sql/_archive/master-sql/14_kb_statistics_ai_views.sql` | 已归档 AI VIEW |
| `backend/kb-statistics/src/main/java/.../StatisticsServiceImpl.java` | 唯一运行时回退点 |
| `遗留治理计划.md` | 任务 32/33 定义 |
