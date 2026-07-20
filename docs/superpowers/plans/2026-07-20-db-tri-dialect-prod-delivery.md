# 三库兼容生产交付（MySQL 默认 / PostgreSQL / Oracle）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（推荐逐 Task 执行；可换会话，每次从本文件未勾选项继续）。Steps use checkbox (`- [ ]`) syntax.

**Goal:** 同一套业务制品支持 **MySQL（默认生产）/ PostgreSQL / Oracle** 三种内网部署：换配置 + 对应初始化脚本即可切换，不按客户 fork 业务代码。

**Architecture:** 一部署一方言（`kb.db.type` + JDBC）。DDL 三套目录并行；运行时 DML/函数走 `SqlDialectHelper` + MyBatis `databaseId`；字段类型收敛到三库交集。MySQL 行为与现网一致为硬约束。

**Tech Stack:** MyBatis-Plus、JdbcTemplate、`SqlDialectHelper`、Docker 冒烟、Nacos/`deploy` 配置、PostgreSQL 16、Oracle（XE/容器或文档门禁）

**分支建议：** 继续使用已有 **`feat/db-multi-dialect`**（与 `master` tip `778d3d5` 对齐即可）。不必强制新开 `feat/db-prod-tri-dialect`；若团队偏好短生命周期分支，也可从 master 新开，二选一。

**前置已完成（勿重复造轮）：** 地基～m5 见 `docs/superpowers/specs/2026-07-20-db-multi-dialect-design.md`（helper、LIMIT/DATE、PG DDL 冒烟、已合 master）。

**原则（甲方共识）：**
1. 初始化 SQL 可以有三套，属正常流程。
2. 难点在增删改查与其它 SQL / 函数方言差，用助手与 `databaseId` 消化。
3. **字段尽量选三库都有的类型**（见 Task 0 类型表）；少用 MySQL 专有能力当跨库契约。

---

## 文件与职责地图

| 路径 | 职责 |
|------|------|
| `backend/sql/schema/mysql/` | **权威** MySQL DDL（默认部署） |
| `backend/sql/schema/postgresql/` | PG 初始化（已有翻译稿，需生产级校对） |
| `backend/sql/schema/oracle/` | Oracle 初始化（本计划新建） |
| `backend/sql/schema/DIALECT_CONVERSION.md` | 类型/函数映射 |
| `backend/kb-common/.../SqlDialectHelper.java` | IFNULL/DATE/LIMIT/UPSERT/MERGE |
| `deploy/scripts/verify-*-schema.ps1` | DDL 容器冒烟 |
| `deploy/` + `backend/nacos/*.yaml.template` | 按方言切换数据源示例 |
| `docs/superpowers/plans/2026-07-20-db-dialect-ci-matrix.md` | 验收矩阵 |

---

## Task 0: 类型与函数公约（先落文档，后改 DDL）

**Files:**
- Modify: `backend/sql/schema/DIALECT_CONVERSION.md`
- Create: `docs/superpowers/specs/2026-07-20-db-tri-dialect-prod-design.md`（可把本节复制进去）

### 推荐字段交集（新建/改表优先）

| 用途 | 推荐 | 避免作跨库契约 |
|------|------|----------------|
| 整型 PK/雪花 | `BIGINT` | MySQL `TINYINT` 语义当布尔（PG/Oracle 用 `SMALLINT`/`NUMBER(1)` 分脚本） |
| 短文本 | `VARCHAR(n)` | 前缀索引 `col(191)` 写进跨库契约 |
| 长文本 | `TEXT` | `MEDIUMTEXT`/`LONGTEXT`/`CLOB` 分脚本 |
| 时间 | `TIMESTAMP`（或三库各写等价默认值） | 依赖 `ON UPDATE CURRENT_TIMESTAMP` |
| 布尔/状态 | `SMALLINT`（0/1） | `TINYINT(1)` 仅 MySQL |
| JSON | 分脚本：MySQL `JSON` / PG `JSONB` / Oracle `CLOB` 或 JSON 类型 | 业务 SQL 少用 JSON 函数 |

### 函数映射（运行时）

| 语义 | MySQL | PostgreSQL | Oracle | 助手方法 |
|------|-------|------------|--------|----------|
| 空值 | `IFNULL` | `COALESCE` | `NVL` | `ifNull` |
| 当前时间 | `NOW()` | `NOW()` | `SYSTIMESTAMP` | `currentTimestamp` |
| 取日期 | `DATE(x)` | `CAST(x AS DATE)` | `TRUNC(x)` | `dateOf` |
| 限制行数 | `LIMIT n` | `LIMIT n` | `FETCH FIRST n ROWS ONLY` | `limitClause` |
| Upsert | `ON DUPLICATE KEY` | `ON CONFLICT` | `MERGE` | `onDuplicateKeyUpdate` / `mergeInto`（本计划实现 Oracle） |

- [x] **Step 1:** 将上表写入/更新 `DIALECT_CONVERSION.md` 与 prod design
- [x] **Step 2:** Commit：`docs: 三库字段与函数公约`

---

## Task 1: 盘点剩余方言风险 SQL

**Files:**
- Create: `docs/superpowers/plans/artifacts/2026-07-20-dialect-sql-inventory.md`（或仓库内 `backend/sql/schema/dialect-sql-inventory.md`）

扫描范围（活跃代码，排除 `_archive`）：

```text
IFNULL|NVL|COALESCE\(
ON DUPLICATE|ON CONFLICT|MERGE INTO
DATE_SUB|DATE\(|INTERVAL
\.last\(\"LIMIT|LIMIT #\{|FETCH FIRST
CONCAT\(|GROUP_CONCAT|STRING_AGG|LISTAGG
`[^`]+`   (MySQL 反引号手写 SQL)
```

- [x] **Step 1:** 跑 ripgrep，按「已 helper / 待改 / 可接受仅 MySQL」三列建清单
- [x] **Step 2:** 标优先级：P0 登录鉴权与主链路 CRUD；P1 统计；P2 管理端冷路径
- [x] **Step 3:** Commit：`docs: 方言 SQL 风险清单`

---

## Task 2: 实现 Oracle `mergeInto` + 统计 JDBC 接通

**Files:**
- Modify: `backend/kb-common/.../SqlDialectHelper.java`
- Modify: `SqlDialectHelperTest.java`
- Modify: `Stat*Repository`、`AiStatisticsMQListener`、`StatisticsAggregationTask`（Oracle 路径改调 merge 或统一入口）

建议 API 形态（实现时可微调，保持单测覆盖）：

```java
/**
 * 生成简单主键 UPSERT SQL：MySQL/PG 仍走 onDuplicateKeyUpdate；
 * Oracle 生成 MERGE INTO ... USING (SELECT ... FROM dual) ...
 */
public String upsertSql(String table, String conflictColumns,
                        String insertColumnList, String insertValuesSql,
                        String mysqlUpdateAssignments);
```

- [x] **Step 1:** 单测：Oracle `mergeInto`/`upsertSql` 产出含 `MERGE INTO` 与 `WHEN MATCHED`
- [x] **Step 2:** 实现；MySQL/PG 回归单测不变绿
- [x] **Step 3:** 统计投影仓储：Oracle 时不再抛 Unsupported
- [x] **Step 4:** `mvn -pl kb-common,kb-statistics -am test -Dtest=SqlDialectHelperTest,StatDocumentRepositoryTest`
- [x] **Step 5:** Commit：`feat(db): Oracle MERGE upsert 接入统计 JDBC`

---

## Task 3: 补齐 Mapper `databaseId`（统计 + 检索 P0）

**Files（至少）：**
- `backend/kb-statistics/src/main/resources/mapper/*.xml`（`DATE`/`LIMIT` 已部分做 Document；补 View/User/Comment/Agg）
- `backend/kb-intelligence/.../SearchHistoryMapper.xml`（LIMIT 的 oracle 变体；默认仍 MySQL）

规则：
- 无 `databaseId` = MySQL（及多数 PG 可共用时也可作默认）
- `databaseId="postgresql"` 仅当与默认不兼容
- `databaseId="oracle"`：`TRUNC` + `FETCH FIRST`

- [x] **Step 1:** 按清单改 P0 Mapper
- [x] **Step 2:** 抽 1～2 个 XML 做人工对照表（MySQL vs Oracle）
- [x] **Step 3:** Commit：`feat(db): 统计/检索 Mapper Oracle databaseId`

---

## Task 4: PostgreSQL DDL 生产级校对

**Files:**
- Modify: `backend/sql/schema/postgresql/*.sql`
- Modify: `_tools/mysql_to_pg.py`（仅当规则性缺陷）
- Modify: `deploy/scripts/verify-pg-schema.ps1`（可增加「关键表存在」断言）

校对清单：
- 类型符合 Task 0 公约
- 无残留 `FULLTEXT` / `ENGINE` / 反引号
- 唯一索引/主键与 MySQL 语义对齐（雪花 ID，无依赖 AI）
- `install_all.sql` 顺序正确；`kb_notification_template` 重复建表可接受 IF NOT EXISTS

- [x] **Step 1:** 对照 `mysql/` 逐 BC 抽查 + 修翻译稿
- [x] **Step 2:** 跑 `.\deploy\scripts\verify-pg-schema.ps1` 必须 PASS
- [x] **Step 3:** Commit：`fix(db): PostgreSQL DDL 生产级校对`

---

## Task 5: Oracle DDL 首版 + 冒烟脚本

**Files:**
- Create: `backend/sql/schema/oracle/00_create_users.sql`（或 schema/user 说明）
- Create: `backend/sql/schema/oracle/kb_*.sql`（可由工具半自动 + 人工；类型用 `NUMBER`/`VARCHAR2`/`CLOB`/`TIMESTAMP`）
- Create: `backend/sql/schema/oracle/install_all.sql`
- Create: `deploy/scripts/verify-oracle-schema.ps1`（Docker `gvenzl/oracle-xe` 若拉取失败则文档门禁 + 语法审阅）
- Modify: `oracle/README.md`

- [x] **Step 1:** 写转换要点进 `DIALECT_CONVERSION.md`（MySQL→Oracle）
- [x] **Step 2:** 先落地 `kb_intelligence` + `kb_user` 两套可执行，再扩全 BC
- [x] **Step 3:** `verify-oracle-schema.ps1` 或「无镜像则 SKIP 并写明原因」
- [x] **Step 4:** Commit：`feat(db): Oracle schema 首版与冒烟门禁`

---

## Task 6: 部署配置 Profile（换配置即切库）

**Files:**
- Modify: `deploy/env.example`
- Create: `deploy/profiles/mysql.env.example`（可与现有合并说明）
- Create: `deploy/profiles/postgresql.env.example`
- Create: `deploy/profiles/oracle.env.example`
- Modify: 相关 `backend/nacos/*-dev.yaml.template`（`KB_DB_TYPE`、驱动 URL、`currentSchema`/多数据源）
- Modify: `deploy/README.md` 增加「切库检查清单」

PostgreSQL URL 示例要点：
- `jdbc:postgresql://host:5432/postgres?currentSchema=kb_user`（Core 多数据源每个库一个 schema/URL）
- `kb.db.type=postgresql`

Oracle：
- `jdbc:oracle:thin:@//host:1521/XEPDB1`
- `kb.db.type=oracle`
- 业务模块按需引入 `ojdbc11`（父 POM 已管理版本）

- [ ] **Step 1:** 三个 profile 样例写全必填项（无真实密钥）
- [ ] **Step 2:** README 写清：MySQL 默认；切库步骤 1～5
- [ ] **Step 3:** Commit：`docs(deploy): 三库切换 Profile 与检查清单`

---

## Task 7: PG 最小全栈冒烟（生产就绪门槛）

**目标：** 不只 DDL，至少 **一个服务** 能连 PG 完成健康检查 + 一次只读/写入。

建议路径（选一，优先成本低）：
- A. `kb-statistics` 或 `kb-agent` 单服务 + Testcontainers/本地 compose `postgres` profile
- B. 脚本：起 PG → import schema → 启 `kb-core`（若多数据源过重则先单库服务）

- [ ] **Step 1:** 增加 `deploy/docker-compose.pg.yml` 或 compose profile `postgres`
- [ ] **Step 2:** 导入 schema；配置 Nacos/本地 yml
- [ ] **Step 3:** 启动目标服务；打通 1 个 API 或集成测试
- [ ] **Step 4:** 记录失败点回写 Task 1 清单并修
- [ ] **Step 5:** Commit：`test(db): PostgreSQL 最小全栈冒烟`

---

## Task 8: MySQL 回归（硬约束）

- [ ] **Step 1:** 默认 MySQL 栈 `import-schema.ps1` + 现有 `verify-all`/关键冒烟不回退
- [ ] **Step 2:** 确认未改默认 `kb.db.type` 空/mysql 行为
- [ ] **Step 3:** Commit（若有修复）：`fix: MySQL 默认路径回归`

---

## Task 9: 文档收口与合入

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-db-multi-dialect-design.md`（增加「生产交付」章节并链到本计划）
- Modify: 本地 `readme_plan.md`（不入库）
- Update: `docs/superpowers/plans/2026-07-20-db-dialect-ci-matrix.md`

- [ ] **Step 1:** 勾选本计划全部验收项
- [ ] **Step 2:** PR/合入 `master`（或按团队流程）
- [ ] **Step 3:** 在 readme_plan 记差距（Oracle 全栈是否仍仅 DDL 等）

---

## 验收标准（Definition of Done）

- [ ] **MySQL 默认：** 现有部署文档零强制变更即可上线
- [ ] **PostgreSQL：** DDL 冒烟 PASS + 至少 1 个服务全栈冒烟 PASS
- [ ] **Oracle：** DDL 可装载（或官方 SKIP 原因）+ `MERGE` 统计 upsert 不再 Unsupported
- [ ] **切换方式：** 仅 Profile/环境变量 + 执行对应 `schema/{dialect}/install*`，无客户定制业务分支
- [ ] **字段公约：** 新增表/列遵循 Task 0；旧表分脚本差异可保留但有文档

---

## 换会话执行指引

1. 读本文件 + `2026-07-20-db-multi-dialect-design.md` + 本地 `readme_plan.md`
2. `git checkout feat/db-multi-dialect`（推荐沿用；或自建短分支）
3. 从第一个未勾选 `- [ ]` 的 Task 继续；每 Task 结束勾选并 commit
4. 用户口令「按照计划修改，自检，提交，下一步」= 执行下一未完成 Task
5. 阶段完成后再 merge 进 `master`

## 非目标（本计划不做）

- 运行时同进程混用三库
- 历史数据跨库迁移 ETL
- 信创国产库（达梦/人大金仓）——可另开计划，类型公约可复用
- 把统计模块整体从 JdbcTemplate 迁回 MyBatis-Plus
