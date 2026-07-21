# 方言 SQL 风险清单（活跃代码，排除 _archive）

> 生成自扫描；生产交付计划 Task 1。  
> **2026-07-20 C1 复核**：对「待改」逐文件对照 `databaseId=oracle` / helper；去伪后仅保留真实缺口。

## 汇总

| 状态 | 模式 | 文件数（去重） | 说明 |
|------|------|----------------|------|
| 待改 | LIMIT_ANNOT | 1 | `DocumentAccessMapper` 注解 SQL 无 Oracle 分支 |
| 待改 | LIMIT_XML | 1 | `TagMapper` `selectHotTags` / `selectByTagCode` 缺 Oracle |
| 已Oracle分支 | ON_DUPLICATE / LIMIT / DATE / CONCAT / FETCH | 见明细 | 默认句仍含 MySQL 语法，但已有 `databaseId=oracle` |
| 已helper | LIMIT_HELPER / IFNULL | 14+ | 运行时走 `SqlDialectHelper` |
| 已helper定义 | * | 1 | `SqlDialectHelper` 本身 |
| 已PG分支 | ON_CONFLICT | 1 | SearchHistory upsert |
| 误报 | DATE_FUNC | 1 | `OperationType.UPDATE` 枚举名，非 SQL |
| 测试 | * | 若干 | 单测 / IT，非生产路径 |

## 优先级约定

- **P0**：登录鉴权、主链路文档/文件 CRUD、网关相关
- **P1**：统计聚合/投影 Mapper 与 JDBC
- **P2**：管理端冷路径、Tag/Team 模糊查询等

## 明细（按状态）

### 待改（真实缺口，C1 复核后）

| 优先级 | 模式 | 文件 | 行 | 说明 |
|--------|------|------|----|------|
| P2 | LIMIT_ANNOT | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/mapper/DocumentAccessMapper.java` | 33 | `@Select` 含 `LIMIT`，无 `databaseId`/XML Oracle 副本 |
| P2 | LIMIT_XML | `backend/kb-core/kb-core-document/src/main/resources/mapper/TagMapper.xml` | 47, 78 | `selectByTagCode`（`LIMIT 1`）、`selectHotTags`（`LIMIT #{limit}`）缺 Oracle `FETCH FIRST` |

> 说明：`searchByName` 的 CONCAT 已有 `databaseId=oracle`，不在待改。

### 误报（扫描命中，非 SQL / 非缺口）

| 原模式 | 文件 | 行 | 原因 |
|--------|------|----|------|
| DATE_FUNC | `backend/kb-common/.../enums/OperationType.java` | 29 | 枚举常量名 `UPDATE`，非 `DATE()` 函数 |

### 已Oracle分支（默认 MySQL 句仍会被扫描命中，已有副本）

| 优先级 | 模式 | 文件 | Oracle 证据 |
|--------|------|------|-------------|
| P0 | ON_DUPLICATE / LIMIT / CONCAT | `.../search/SearchHistoryMapper.xml` | `insertOrUpdate` MERGE；热词/精确查 `FETCH FIRST`；`searchByKeyword` `\|\|` |
| P1 | DATE_FUNC / LIMIT | `.../CommentStatisticsMapper.xml` | `countDailyComments` TRUNC；Top 系列 FETCH FIRST |
| P1 | LIMIT | `.../DocumentStatisticsAggMapper.xml` | `selectTopDocumentsByViews` FETCH FIRST |
| P1 | DATE_FUNC / LIMIT | `.../DocumentStatisticsMapper.xml` | `countDailyDocuments` TRUNC；Most* / TopAuthors FETCH FIRST |
| P1 | LIMIT | `.../UserStatisticsAggMapper.xml` | `selectTopActiveUsers` FETCH FIRST |
| P1 | DATE_FUNC / LIMIT | `.../UserStatisticsMapper.xml` | `countDailyUsers` / `countUserViews` TRUNC；`selectMostActiveUsers` FETCH FIRST |
| P1 | DATE_FUNC / LIMIT | `.../ViewStatisticsMapper.xml` | `countDailyViews` TRUNC；多条 FETCH FIRST |
| P2 | CONCAT | `.../TagMapper.xml` `searchByName` | `databaseId=oracle` 用 `\|\|` |
| P2 | CONCAT | `.../TeamMapper.xml` `selectByPathPrefix` | `databaseId=oracle` 用 `\|\|` |
| P1 | FETCH_FIRST | `.../DocumentStatisticsMapper.xml` | 与上表 LIMIT 行同源 |

### 已helper

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | LIMIT_HELPER | `backend/kb-agent/.../MybatisAgentRunPersistence.java` | 80 |
| P2 | LIMIT_HELPER | `backend/kb-agent/.../AgentRunRetentionCleaner.java` | 54 |
| P0 | IFNULL | `backend/kb-agent/.../AgentJwtAuthenticationFilter.java` | 86,104 |
| P0 | LIMIT_HELPER | `backend/kb-core/.../DocumentServiceImpl.java` | 354 |
| P2 | LIMIT_HELPER | `backend/kb-core/.../DocumentVersionServiceImpl.java` | 79 |
| P2 | LIMIT_HELPER | `backend/kb-core/.../FileManagementServiceImpl.java` | 290 |
| P2 | LIMIT_HELPER | `backend/kb-core/.../TagServiceImpl.java` | 225 |
| P0 | LIMIT_HELPER | `backend/kb-core/.../UserServiceImpl.java` | 629 |
| P0 | LIMIT_HELPER | `backend/kb-file/.../FileServiceImpl.java` | 457,484 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/.../RagChatServiceImpl.java` | 344 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/.../AiChatServiceImpl.java` | 399 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/.../SearchHistoryServiceImpl.java` | 98 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/.../StatisticsServiceImpl.java` | 528,631 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/.../HotDocumentsCacheTask.java` | 126 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/.../LatestDocumentsCacheTask.java` | 115 |

### 已helper定义

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | IFNULL / ON_DUPLICATE / ON_CONFLICT / DATE_* / LIMIT / FETCH / likeContains / likePrefix | `.../SqlDialectHelper.java` | 见源码 |

### 已PG分支

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P1 | ON_CONFLICT | `.../search/SearchHistoryMapper.xml` | `insertOrUpdate` postgresql |

### 测试

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | * | `.../SqlDialectHelperTest.java` | 多处 |
| P1 | ON_DUPLICATE | `.../StatDocumentRepositoryTest.java` | 52 |

## 下一步

- **无 P0/P1 阻塞待改**（统计 / SearchHistory / CONCAT 均已有 Oracle 分支或 helper）
- **P2 真实剩余**（可选，非本收尾 C1～C4 必做）：
  1. `DocumentAccessMapper.selectRecentAccessByUserId` → 迁 XML 并加 `databaseId=oracle`，或改用 helper + Provider
  2. `TagMapper.selectByTagCode` / `selectHotTags` → 增加 Oracle `FETCH FIRST` 分支
- 附录 O1/O2（全栈冒烟、`level` 全扫）见 `docs/superpowers/plans/2026-07-20-backlog-closeout.md`，默认不做
- 收尾下一 Phase：**C2** 导出 / 删日志二次确认接到业务页

## Task 3 人工对照（MySQL 默认 vs Oracle）

### DocumentStatisticsMapper.countDailyDocuments

| | MySQL（无 databaseId） | Oracle |
|--|--|--|
| 取日 | `DATE(created_at)` | `TRUNC(created_at)` |
| 分组 | `GROUP BY DATE(created_at)` | `GROUP BY TRUNC(created_at)` |

### SearchHistoryMapper

| 语句 | MySQL | Oracle |
|--|--|--|
| 热词 LIMIT | `LIMIT #{limit}` | `FETCH FIRST #{limit} ROWS ONLY` |
| upsert | `ON DUPLICATE KEY UPDATE` | `MERGE INTO ... USING dual` |
| 模糊搜 | `LIKE CONCAT('%', #{keyword}, '%')` | `LIKE '%' \|\| #{keyword} \|\| '%'` |
