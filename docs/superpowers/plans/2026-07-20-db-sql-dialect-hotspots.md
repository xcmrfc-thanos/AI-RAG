# 多库方言 · 高风险 SQL 热点（第二里程碑）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 在地基之上，把会在 PG/Oracle 直接炸的 **Java JDBC / 关键 Mapper** 方言点收敛到 `SqlDialectHelper` + MyBatis `databaseId`，默认 MySQL 行为不变。

**Architecture:** `kb-common` 提供 `SqlDialectHelper`（IFNULL / NOW / 过期删除 / UPSERT 后缀）。统计投影与 Agent 鉴权等 JDBC 改走 helper。`SearchHistoryMapper.insertOrUpdate` 用 `databaseId=mysql|postgresql`。Neo4j Cypher 的 LIMIT **不动**。`.last("LIMIT n")` 对 MySQL+PG 可用，Oracle 留待第三里程碑。

**Tech Stack:** MyBatis DatabaseIdProvider、JdbcTemplate、KbDbTypeResolver

**分支：** 继续 `feat/db-multi-dialect`

---

### Task 1: SqlDialectHelper + 单测

**Files:**
- Create: `backend/kb-common/.../config/SqlDialectHelper.java`
- Test: `.../SqlDialectHelperTest.java`

- [x] **Step 1:** 实现 `ifNull` / `currentTimestamp` / `deleteOlderThanDays` / `onDuplicateKeyUpdate`（mysql VALUES → pg EXCLUDED）
- [x] **Step 2:** 单测三方言（oracle upsert 可暂返回明确 Unsupported 或简化 MERGE 占位注释）
- [x] **Step 3:** Commit（可与后续同批）

### Task 2: DatabaseIdProvider

**Files:**
- Modify: `MybatisPlusConfig.java` 或新建 `MybatisDatabaseIdConfig.java`

- [x] **Step 1:** VendorDatabaseIdProvider：MySQL→mysql，PostgreSQL→postgresql，Oracle→oracle
- [x] **Step 2:** Commit

### Task 3: AgentJwt IFNULL

**Files:**
- Modify: `AgentJwtAuthenticationFilter.java`

- [x] **Step 1:** 注入 SqlDialectHelper，SQL 拼 `ifNull("r.deleted","0")`
- [x] **Step 2:** Commit

### Task 4: StatisticsAggregationTask + Stat* upsert

**Files:**
- Modify: `StatisticsAggregationTask.java`
- Modify: `StatDocumentRepository` 及同目录其它 Stat*Repository、`AiStatisticsMQListener`

- [x] **Step 1:** DATE_SUB → helper.deleteOlderThanDays
- [x] **Step 2:** ON DUPLICATE → helper.onDuplicateKeyUpdate（冲突列按表主键）
- [x] **Step 3:** Commit

### Task 5: SearchHistoryMapper databaseId

**Files:**
- Modify: `SearchHistoryMapper.xml`

- [x] **Step 1:** mysql / postgresql 两套 insertOrUpdate；oracle 暂缺（日志/文档说明）
- [x] **Step 2:** Commit

### Task 6: 文档自检推送

- [x] 更新 design/spec 一小节；`KbDbTypeResolverTest` + `SqlDialectHelperTest`；push 分支

---

## 验收

- [x] 默认 mysql 下现有 upsert/清理 SQL 语义不变
- [x] `kb.db.type=postgresql` 时 helper 产出 ON CONFLICT / COALESCE
- [x] Agent 鉴权 IFNULL 可方言化
- [x] 单测通过
