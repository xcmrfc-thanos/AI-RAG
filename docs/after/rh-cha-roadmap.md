# rh-cha 架构改造执行路线图

> 依据：[rh-cha.md](./rh-cha.md) · [service-merge-plan.md](./service-merge-plan.md)  
> **环境说明（2026-07-10）**：本地 Docker 中间件（`deploy/`）+ 微服务 + 前端已可启动；**无历史数据**，`stat_*` 由 MQ 增量投影。

---

## 进度总览

| 阶段 | 主题 | 进度 | 下一步 |
|------|------|------|--------|
| **Phase 0** | Document 改事件驱动 | ✅ 完成 | — |
| **Phase 1** | Intelligence 三合一 | ✅ 完成 | Phase 2 **P2-1** kb-core 骨架 |
| **Phase 2** | Core 三合一 | ✅ 完成 | Phase 3 **P3-1** |
| **Phase 3** | Statistics 净化 + 部署收敛 | ✅ 完成 | 联调冒烟（verify-all.ps1） |

---

## Phase 0 — Document 解耦（✅）

| ID | 任务 | 自检 | 状态 |
|----|------|------|------|
| P0-1 | `DocumentLifecycleEventDTO` + MQ 常量 | kb-common 存在三类事件 | ✅ |
| P0-2 | kb-document 默认 event-only 发事件 | `document.indexing.mode=event`（任务 57）；`legacy-feign` 仅应急 | ✅ 任务 57 收口 |
| P0-3 | kb-ai 消费 → RAG/KAG | `DocumentLifecycleListener` | ✅ |
| P0-4 | kb-search 消费 → ES doc 索引 | 同上 | ✅ |
| P0-5 | kb-graph 消费 → REMOVED 删节点 | 同上 | ✅ |

---

## Phase 1 — Intelligence BC

| ID | 任务 | 自检 | 状态 |
|----|------|------|------|
| P1-1 | 多模块骨架 | `mvn compile -pl kb-intelligence-app -am` | ✅ |
| P1-2 | 迁入 kb-graph | `/api/intel-graph/**` 试点 | ✅ |
| P1-3 | 迁入 kb-search | retrieval 模块编译通过 | ✅ |
| P1-4 | 迁入 kb-ai | llm 模块；删 GraphFeign / RagSearchFeign | ✅ |
| P1-DB | MySQL 单库 kb_intelligence | `backend/sql/intelligence/` + 单 DataSource | ✅ 脚本就绪 |
| **P1-5a** | **统一 ES 索引配置** | `IntelligenceIndexingProperties`；两 Service 读配置 | ✅ |
| **P1-5b** | ES mapping 脚本归集 | `sql/intelligence/es/` + create_indices | ✅ |
| P1-5c | Java createIndex 读 JSON（可选） | `ElasticsearchIndexDefinitionLoader` + classpath JSON | ✅ |
| **P1-6** | 网关切主路由 + Nacos 模板 | `kb-intelligence-*-main` order=1 | ✅ |
| **P1-7** | 下线 kb-ai / kb-search / kb-graph | DEPRECATED.md + 切流脚本；运行验收待环境 | ✅ 代码侧 |

### P1-5 细分（rh-cha §3 双 ES → Indexing Pipeline）

| 子步 | 内容 | 验收 |
|------|------|------|
| 5a | 配置中心化 `intelligence.indexing.document-index` / `chunk-index` | 无硬编码 `kb_document`/`kb_chunk` 于 Service 层 |
| 5b | hybrid 检索链：Keyword(doc) + Vector(chunk) 进程内 | 已实现 RagRetrievalService |
| 5c | 可选：nested 单索引（后期） | 现网一致后再评估 |

---

## Phase 2 — Core BC（✅）

| ID | 任务 | 自检 | 状态 |
|----|------|------|------|
| **P2-1** | `backend/kb-core` 骨架 | `mvn compile -pl kb-core/kb-core-app -am` | ✅ |
| **P2-2** | 迁入 kb-foundation → platform | 61 类；Feign 仍调 kb-user-auth | ✅ |
| **P2-3** | 迁入 kb-user-auth → iam | 双库 + UserAuthLocalClient 进程内 | ✅ |
| P2-4 | 迁入 kb-document → document | Mongo + 事件发布 + 三数据源 | ✅ |
| P2-5 | document→file Feign 保留 | 上传/download + multipart | ✅ |
| P2-6 | 网关 auth/document/foundation → kb-core | 前端无感 + 切流脚本 | ✅ |
| P2-7 | 下线原三服务 | 归档 _archive + 网关收敛 | ✅ |

---

## Phase 3 — Analytics 净化（✅）

| ID | 任务 | 自检 | 状态 |
|----|------|------|------|
| P3-1 | statistics 跨库 VIEW → MQ 宽表投影 | AI + Core 本地投影 | ✅ |
| P3-2 | 部署文档 / Nacos DataId 更新 | `docs/after/p3-2-deployment.md` + `backend/nacos/` | ✅ |
| P3-3 | 监控面板 / 运行手册 | `docs/after/p3-3-operations.md` | ✅ |

---

## 每步通用自检命令

```bash
set JAVA_HOME=D:\Users\environments\Java21
cd backend
mvn install -pl kb-common -DskipTests -q
mvn compile -pl kb-core/kb-core-app -am
```

---

## 当前 Next 3

1. **联调冒烟** — `deploy/scripts/verify-all.ps1`（integration / api / llm / admin-ui / build）
2. 可选：Actuator + Prometheus（见 p3-3-operations.md §五）
3. 可选：P1-5 nested 单索引（现网一致后再评估）

### 遗留治理可选收尾（2026-07-11 已完成）

| 任务 | 内容 |
|------|------|
| 42 | KnowledgeGraphPage EmptyState |
| 43 | stat_role / stat_team 投影 |
| 44 | AdminLayout 统一侧栏 |
| 45 | AdminPageHeader + 联调清单 |

---

## 本地环境速查

| 类别 | 命令 / 地址 |
|------|-------------|
| Docker 一键 | `cd deploy && .\setup.ps1` |
| 微服务 | `.\start-services.ps1`（JVM 256m/512m） |
| 前端 | `cd frontend && npm run dev` → :3002 |
| 网关 / Nacos | :8080 / http://127.0.0.1:20848/nacos |
| 对象存储 | RustFS :20090，bucket `kb-files` |

详见 [p3-2-deployment.md](./p3-2-deployment.md)、[deploy/README.md](../../deploy/README.md)。

---

*版本：2026-07-10 v2（本地 Docker 就绪）*
