# 多数据库方言地基（MySQL / PostgreSQL / Oracle）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AI-RAG 建立 **可配置数据库方言** 地基：驱动可选、分页按方言、schema 按方言分目录；默认仍为 MySQL，行为不变。

**Architecture:** 统一配置项 `kb.db.type=mysql|postgresql|oracle`（可从 JDBC URL 推断）。`MybatisPlusConfig` 分页拦截器改用该 DbType。父 POM 增加 PG/Oracle 驱动为 optional。`sql/schema/mysql/` 迁入现有 DDL；PG/Oracle 仅占位 README。**本阶段不批量改写 Mapper XML / ON DUPLICATE / DATE_SUB。**

**Tech Stack:** MyBatis-Plus 3.5.x、Spring Boot 3.2、mysql-connector-j / postgresql / ojdbc（optional）

**分支：** `feat/db-multi-dialect`（**一个分支**，不要按库拆三个）

**非目标：** 全量 DDL 翻译、全量 Mapper 多 `databaseId`、信创库、跨库 VIEW、Flyway 多方言。

---

## 已知方言风险（后续里程碑）

| 风险 | 位置 |
|------|------|
| `PaginationInnerInterceptor(DbType.MYSQL)` 硬编码 | `kb-common/.../MybatisPlusConfig.java` |
| XML `LIMIT` / `NOW()` / `ON DUPLICATE KEY` | 约 26 个活跃 Mapper |
| `DATE_SUB` / `IFNULL` | StatisticsAggregationTask、AgentJwtAuthenticationFilter |
| DDL `` `backtick` `` / InnoDB / AUTO_INCREMENT | `sql/schema/*.sql` |

---

### Task 1: 配置项 + 方言解析工具

**Files:**
- Create: `backend/kb-common/.../config/KbDbProperties.java`
- Create: `backend/kb-common/.../config/KbDbTypeResolver.java`
- Test: `backend/kb-common/src/test/java/.../KbDbTypeResolverTest.java`

- [x] **Step 1: KbDbProperties**

```java
@ConfigurationProperties(prefix = "kb.db")
public class KbDbProperties {
    /** mysql | postgresql | oracle；空则从 JDBC URL 推断，再默认 mysql */
    private String type = "";
}
```

需在某个 `@EnableConfigurationProperties` 或 `@Component` 注册；若 kb-common 无 Boot 自动配置，用 `@Component` + `@ConfigurationProperties`。

- [x] **Step 2: KbDbTypeResolver**

```java
/**
 * 将 kb.db.type 或 jdbcUrl 解析为 MyBatis-Plus DbType。
 */
public static DbType resolve(String configuredType, String jdbcUrl);
```

规则：`postgresql`/`postgres`/`pg` → POSTGRE_SQL；`oracle` → ORACLE；`mysql`/`mariadb` → MYSQL；URL 含 `jdbc:postgresql` / `jdbc:oracle` / `jdbc:mysql`；否则 MYSQL。

- [x] **Step 3: 单测** 覆盖显式 type、URL 推断、默认。

- [x] **Step 4: Commit** `feat(db): 增加 kb.db.type 方言解析`

---

### Task 2: 动态分页拦截器

**Files:**
- Modify: `backend/kb-common/.../MybatisPlusConfig.java`
- Modify: `backend/nacos/application-dev.yaml.template`（加 kb.db.type 注释默认 mysql）

- [x] **Step 1: MybatisPlusConfig 注入 KbDbProperties + 可选 datasource url**

优先用 `kb.db.type`；若空，尝试 `@Value("${spring.datasource.url:}")`（多数据源场景 core 可能不是这个键——此时默认 MYSQL 并打 warn）。

Core 有三数据源且同方言：文档声明「一部署一方言」。

- [x] **Step 2: `new PaginationInnerInterceptor(resolvedDbType)`**

- [x] **Step 3: application-dev.yaml.template**

```yaml
kb:
  db:
    type: ${KB_DB_TYPE:mysql}
```

- [x] **Step 4: Commit** `feat(db): MyBatis-Plus 分页按 kb.db.type 切换`

---

### Task 3: 父 POM optional 驱动

**Files:**
- Modify: `backend/pom.xml`（dependencyManagement）
- Modify: 各用到 JDBC 的模块 pom（或仅 common）——**仅 dependencyManagement + 文档**；mysql 保持现有 compile 依赖不动。

- [x] **Step 1: dependencyManagement 增加**

```xml
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <version>...</version>
</dependency>
<!-- ojdbc：使用 Oracle 官方坐标，version 与 Boot 3.2 兼容；optional -->
```

- [x] **Step 2: kb-common 或 README 说明**：切 PG/Oracle 时在对应服务 pom 打开依赖。

YAGNI：本阶段**不**给每个模块强制加 PG/Oracle 依赖，避免无 License/体积问题；只在 dependencyManagement 锁版本。

- [x] **Step 3: Commit** `chore(db): 父 POM 管理 postgresql/ojdbc 版本`

---

### Task 4: Schema 目录拆分（mysql 迁入 + PG/Oracle 占位）

**Files:**
- Move: `backend/sql/schema/*.sql` → `backend/sql/schema/mysql/`
- Keep: `backend/sql/schema/*.md` 可留在 schema/ 或一并移到 mysql/docs——**md 审计文档留在 schema/ 根**以免断链
- Create: `backend/sql/schema/postgresql/README.md`、`oracle/README.md`
- Modify: `deploy/mysql/init-schema.sh`、`backend/sql/install_*.sh/bat`、文档中路径引用

- [x] **Step 1: 创建 mysql/ 并 git mv 全部 .sql**

- [x] **Step 2: 更新 init-schema.sh / install 脚本路径**

- [x] **Step 3: PG/Oracle README** 写明：DDL 未翻译；地基阶段仅占位；切库前需补 schema + 改 Mapper。

- [x] **Step 4: `backend/sql/README.md` 更新目录说明**

- [x] **Step 5: Commit** `chore(sql): schema 按方言分目录（mysql 为准）`

---

### Task 5: 文档 + env + 自检

**Files:**
- Modify: `readme.md`（一行：DB 方言地基）
- Modify: `docs/README.md`
- Create: `docs/superpowers/specs/2026-07-20-db-multi-dialect-design.md`
- Modify: `deploy/env.example` → `KB_DB_TYPE=mysql`

- [x] **Step 1–3: 文档与 env**

- [x] **Step 4: 单测 + 编译**

```powershell
mvn -pl kb-common -am test -Dtest=KbDbTypeResolverTest -Dsurefire.failIfNoSpecifiedTests=false
```

- [x] **Step 5: 合并说明**：默认 mysql 回归；不跑 PG/Oracle 集成。

---

## 验收

- [ ] 默认 `KB_DB_TYPE=mysql` 或未配置时，分页仍为 MYSQL
- [ ] `kb.db.type=postgresql` 时拦截器为 POSTGRE_SQL（单测或日志可验证）
- [ ] `sql/schema/mysql/` 含原 DDL；PG/Oracle 有 README 占位
- [ ] 现有 MySQL 安装脚本路径已更新且文档指向正确
- [ ] 未改业务 Mapper SQL（本阶段）

## 后续里程碑（不在本计划）

1. Mapper `databaseId` 或方言 SQL 抽象（ON DUPLICATE / LIMIT）
2. PG/Oracle 全量 DDL
3. CI 矩阵（Testcontainers MySQL + PG）
