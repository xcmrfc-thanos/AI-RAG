# P2-7 — 下线 kb-user-auth / kb-document / kb-foundation

> Phase 2 Core 合并最后一步。**本地 Docker 已就绪**（`deploy/`）；以 DEPRECATED + 归档 + compile 自检为准；运行验收见 [p3-2-deployment.md](./p3-2-deployment.md)。

## 已完成（代码侧）

| 项 | 说明 |
|----|------|
| DEPRECATED.md | `backend/_archive/kb-user-auth`、`kb-document`、`kb-foundation` 各一份 |
| 启动警告 | `LegacyCoreServiceNotifier` + 三启动类 |
| Maven reactor | 六旧模块移出 `backend/pom.xml`，归档至 `backend/_archive/` |
| 网关 | 删除旧 Core/Intelligence 路由，主路由指向 `kb-core` / `kb-intelligence` |

## 归档目录

```text
backend/_archive/
├── kb-user-auth/    → kb-core-iam
├── kb-document/     → kb-core-document
├── kb-foundation/   → kb-core-platform
├── kb-ai/           → kb-intelligence-llm
├── kb-search/       → kb-intelligence-retrieval
└── kb-graph/        → kb-intelligence-graph
```

## 待环境就绪后执行

### 1. 启动新 BC

- `kb-core-app` :8090
- `kb-intelligence-app` :8091

### 2. 验证

```bash
curl http://localhost:8080/api/auth/...
curl http://localhost:8080/api/document/...
curl http://localhost:8080/api/ai/...
```

### 3. 禁止启动 `_archive` 下旧模块

## 自检命令

```bash
set JAVA_HOME=D:\Users\environments\Java21
cd backend
mvn compile -pl kb-core/kb-core-app,kb-intelligence/kb-intelligence-app,kb-gateway -am
```

## 下一步

**Phase 3 P3-1**：kb-statistics 跨库 VIEW → MQ 宽表投影。
