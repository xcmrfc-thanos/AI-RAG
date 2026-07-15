# P1-7 — 下线 kb-ai / kb-search / kb-graph

> Phase 1 Intelligence 合并最后一步。本地 Docker 已就绪；以废弃标记 + 编译自检为准；运行验收见 [p3-2-deployment.md](./p3-2-deployment.md)。

## 已完成（代码侧）

| 项 | 说明 |
|----|------|
| DEPRECATED.md | `backend/kb-ai`、`kb-search`、`kb-graph` 各一份 |
| 启动警告 | `LegacyIntelligenceServiceNotifier` + 三启动类 |
| 网关 metadata | 旧三条路由标记 `superseded-by-kb-intelligence` |
| 切流脚本 | `backend/kb-gateway/scripts/switch-intelligence-primary.ps1` |

## 待环境就绪后执行

### 1. 切流（网关）

```powershell
cd backend/kb-gateway/scripts
.\switch-intelligence-primary.ps1 -Mode primary   # 主路由优先
# 回滚
.\switch-intelligence-primary.ps1 -Mode legacy
```

或手动改 `application.yml`：`*-main` order → `-1`，旧路由 order → `10`。

### 2. 验证

```bash
curl http://localhost:8080/api/ai/health
curl http://localhost:8080/api/search/health
curl http://localhost:8080/api/graph/health
```

### 3. 停止旧进程

- 停止 kb-ai、kb-search、kb-graph
- Nacos 控制台确认仅剩 `kb-intelligence`（Intelligence 域）

### 4. 可选清理

- 注释或删除 gateway 中 `kb-ai` / `kb-search` / `kb-graph` 三条路由
- 删除 `/api/intel-*` 试点路由（与主路径重复后）
- Maven reactor 中旧模块可保留至 Phase 2 结束

## 自检命令

```bash
set JAVA_HOME=D:\Users\environments\Java21
cd backend
mvn compile -pl kb-gateway,kb-ai,kb-search,kb-graph,kb-intelligence/kb-intelligence-app -am
```

## 下一步

**Phase 2 P2-1**：创建 `backend/kb-core` 多模块骨架（auth + document + foundation）。
