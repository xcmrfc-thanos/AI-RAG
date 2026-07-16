# kb-intelligence 合并实施计划（Phase 1）

> **状态（2026-07-16 / 任务 59）**：**合并已完成并上线为 4 BC 运行时**。  
> **运行时只有** `kb-intelligence:8091` 一个进程；**不要**再部署 `kb-ai` / `kb-search` / `kb-graph`。  
> 旧源码在 `backend/_archive/`；包名 `com.knowledge.base.ai|search|graph` 为历史遗留，≠ 三进程。  
> 模块说明准源：[backend/kb-intelligence/README.md](../../backend/kb-intelligence/README.md)。  
> ---  
> **历史目标**：kb-ai + kb-search + kb-graph → **kb-intelligence**（8091）  
> **历史原则**：复制不移动，旧服务并行；网关试点用独立前缀，稳定后再切 `/api/ai|search|graph/**`  
> **父计划**：[service-merge-plan.md](./service-merge-plan.md)

---

## 模块结构

```text
backend/kb-intelligence/
├── pom.xml
├── kb-intelligence-app/          # 启动模块 :8091
├── kb-intelligence-graph/        # 源自 kb-graph（P1-2 ✅）
├── kb-intelligence-retrieval/    # 源自 kb-search（P1-3）
└── kb-intelligence-llm/          # 源自 kb-ai（P1-4）
```

---

## 进度

| 步骤 | 内容 | 状态 |
|------|------|------|
| P1-1 | 多模块骨架 + backend/pom 注册 | ✅ |
| P1-2 | 复制 kb-graph → kb-intelligence-graph | ✅ |
| P1-3 | 复制 kb-search → kb-intelligence-retrieval | ✅ |
| P1-4 | 复制 kb-ai → kb-intelligence-llm | ✅ |
| P1-DB | MySQL 单库 `kb_intelligence` + SQL 脚本 | ✅ 规划/脚本就绪，待环境部署后执行 |
| P1-5 | 统一 ES（kb_document + kb_chunk）Indexing Pipeline | 🟡 P1-5a/b ✅ |
| P1-6 | 网关切主路由 + Nacos `kb-intelligence-dev.yaml` | 🟡 主路由已加(order=1)；Nacos 模板就绪 |
| P1-7 | 下线 kb-ai / kb-search / kb-graph | ✅ 已归档 `_archive/`，运行时仅 Intelligence |

---

## 网关路由策略

| 阶段 | 前缀 | 指向 | 说明 |
|------|------|------|------|
| **试点（当前）** | `/api/intel-graph/**` | `127.0.0.1:8091` | 仅 graph，与 kb-graph 并存 |
| 检索试点 | `/api/intel-search/**` | 8091 | P1-3 完成后 |
| AI 试点 | `/api/intel-ai/**` | 8091 | P1-4 完成后 ✅ |
| **正式切换** | `/api/ai/**`、`/api/search/**`、`/api/graph/**` | `lb://kb-intelligence` | P1-6，删旧路由 |

---

## ES 归属（合并后）

| 索引 | 现 owner | 合并后 owner |
|------|----------|--------------|
| `kb_document` | kb-search | kb-intelligence-retrieval |
| `kb_chunk` | kb-ai | kb-intelligence-llm（RAG 子包） |

同一 ES 集群，合并后由 **kb-intelligence-app** 统一连接；P1-5 再谈是否合成单 index。

---

## MySQL 单库 `kb_intelligence`（P1-DB）

> **项目开发中，还未部署数据库中间件** — 脚本已就绪，待 MySQL 可用后按序执行。

### 策略

| 项 | 决策 |
|----|------|
| 库名 | **`kb_intelligence`**（替代原 `kb_search` + `kb_ai` 双库） |
| 表 | `kb_search_history`、`conversation`、`message`、`ai_feedback` |
| 图谱 | **Neo4j**（不使用 MySQL `kb_graph`） |
| 应用 | 单 `DataSource`，`application.yml` 指向 `kb_intelligence` |
| 统计 | `kb_statistics` 视图改指 `kb_intelligence`（见 `03_kb_statistics_views.sql`） |

### 脚本目录

```text
backend/sql/
├── schema/00_create_databases.sql
├── intelligence/01_init_tables.sql
```

### 首次部署（环境就绪后）

```bash
mysql -u root -p < backend/sql/intelligence/00_create_database.sql
mysql -u root -p < backend/sql/intelligence/01_init_tables.sql
```

### 与旧分库关系

| 旧库 | 处置 |
|------|------|
| `kb_search` | P1-7 下线 kb-search 后可弃用；有数据则跑 `02_migrate_from_legacy.sql` |
| `kb_ai` | 同上 |
| `kb_graph`（MySQL） | 历史遗留，intelligence **不需要** |

---

## P1-3 检索迁入清单

1. 复制 `kb-search/src/**` → `kb-intelligence-retrieval/`
2. 删除 `SearchApplication.java`
3. app 增加 `@ComponentScan("com.knowledge.base.search")`
4. 删除 `RagSearchFeignClient`，hybrid 改调 llm 模块内 `VectorIndexService`
5. 网关加 `/api/intel-search/**`

---

## P1-4 AI 迁入清单

1. 复制 `kb-ai/src/**` → `kb-intelligence-llm/`
2. 删除 `AiApplication.java`
3. 删除 `GraphFeignClient`（graph 同进程）
4. `DocumentFeignClient` 保留（document 仍在 kb-core 未合并）
5. 合并 `DocumentLifecycleListener`（ai/search/graph 各一份 → 统一 infra 或保留模块内）

---

## 本地验证（graph 阶段）

```bash
cd backend/kb-intelligence
mvn compile -pl kb-intelligence-app -am

# 启动
mvn spring-boot:run -pl kb-intelligence-app

# 直连
curl http://127.0.0.1:8091/ping

# 经网关试点
curl http://127.0.0.1:8080/api/intel-graph/nodes?type=entity
```

---

## Next 3

1. [ ] P1-5 统一 ES 双索引 Indexing Pipeline
2. [ ] Nacos 创建 `kb-intelligence-dev.yaml`
3. [ ] P1-6 网关切主路由 `lb://kb-intelligence`

---

*版本：2026-07-10 v2（+ P1-DB kb_intelligence 单库）*
