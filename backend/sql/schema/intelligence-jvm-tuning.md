# Intelligence JVM 内存调优（任务 35）

> 更新：2026-07-11  
> 关联脚本：`deploy/start-services.ps1`、`deploy/scripts/stress-intelligence.ps1`

## 背景

`kb-intelligence` 单进程承载 **LLM（RAG/KAG）+ 全文/混合搜索 + 知识图谱 + MQ 索引消费**，Spring Boot 3.2 + ES/Neo4j/MySQL/RabbitMQ 客户端同栈加载，256m/512m 堆在并发搜索与 RAG 向量检索时易触发 Full GC 或 OOM。

遗留治理计划 P1 目标：**生产酌情 512m/1g，并记录调优参数**。

## 推荐 JVM 参数

| 环境 | 服务 | -Xms | -Xmx | 说明 |
|------|------|------|------|------|
| 本地开发 | kb-intelligence | **512m** | **1g** | 默认已写入 `deploy/.env` |
| 本地开发 | file/core/statistics/gateway | 256m | 512m | 轻量 BC，保持不变 |
| 生产（建议起点） | kb-intelligence | 512m | **1536m~2g** | 视并发与 embedding 维度上调 |
| 生产 | 其余 BC | 256m~512m | 512m~1g | 按监控调整 |

### Intelligence 附加参数

```
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=<deploy/logs>
```

- Java 21 默认 **G1GC**，无需额外 `-XX:+UseG1GC`
- 若 p99 延迟抖动大，可试 `-XX:MaxGCPauseMillis=200`（非必须）

## 配置方式

### 1. 环境变量（`deploy/.env`）

```env
JVM_XMS=256m
JVM_XMX=512m
JVM_INTELLIGENCE_XMS=512m
JVM_INTELLIGENCE_XMX=1g
```

### 2. 启动脚本

`start-services.ps1` 通过 `-Dspring-boot.run.jvmArguments=...` 为各服务注入堆参数，**不再**全局设置 `JAVA_TOOL_OPTIONS`（避免污染 Maven 编译进程）。

```powershell
cd deploy
.\start-services.ps1 -Only intelligence
# 临时覆盖
.\start-services.ps1 -Only intelligence -IntelligenceJvmXms 512m -IntelligenceJvmXmx 1536m
```

## 压测验收（搜索 + RAG）

### 前置

1. Docker 基础环境：`.\setup.ps1`
2. 微服务：`.\start-services.ps1`
3. ES 双索引已初始化（`.\scripts\rebuild-es-indices.ps1`）

### 执行

```powershell
cd deploy
.\scripts\stress-intelligence.ps1
# 直连 intelligence（不经网关）
.\scripts\stress-intelligence.ps1 -Direct -Iterations 50
```

### 验收标准

| 项 | 标准 |
|----|------|
| HTTP | 搜索 `/api/search/` 与 RAG `/api/ai/rag/search` 无连续失败 |
| 日志 | `deploy/logs/kb-intelligence.err.log` 无 `OutOfMemoryError` |
| 堆 | 512m/1g 下压测后工作集稳定，无进程退出 |
| 单元/E2E | `PublishDualIndexE2EAcceptanceTest` 通过（进程内双索引路径） |

### 2026-07-11 自检记录

| 检查项 | 结果 |
|--------|------|
| 全仓 `mvn test`（Java 21） | BUILD SUCCESS（含 intelligence E2E） |
| 运行时压测 | 本机 Docker/微服务未启动；脚本已就绪，环境就绪后执行上节命令 |
| 历史日志 OOM 扫描 | `deploy/logs/kb-intelligence*.log` 无 OOM 记录（旧配置 256m/512m 下仅启动成功） |

## 调优决策树

```text
启动失败 / Metaspace 不足 → 先确认 JDK 21，勿低于 512m 堆
并发搜索+RAG 出现 OOM → 升至 1g~2g，检查 ES 返回 chunk 大小
Full GC 频繁、延迟高 → 升 Xmx 或降 topK；任务 36 线程池隔离
单场景仍不足 → 中期拆 intelligence 读模型（见 service-merge-plan.md）
```

## 参考

- `遗留治理计划.md` 任务 35、P1 Intelligence JVM 偏小
- `deploy/README.md` 启动与压测说明
- `backend/kb-intelligence/kb-intelligence-app` 聚合 llm + retrieval + graph
