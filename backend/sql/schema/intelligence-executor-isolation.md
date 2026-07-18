# Intelligence 线程池隔离（任务 36）

> 更新：2026-07-11  
> 配置类：`IntelligenceExecutorConfig`；Bean 名称见 `IntelligenceExecutorNames`

## 背景

`kb-intelligence` 单 JVM 承载搜索、RAG、KAG 图谱构建。任务 35 已调大堆内存；本任务通过 **分域线程池** 避免某一域高负载占满共享队列，导致其他域请求饿死。

## 三池划分

| Bean 名称 | 线程前缀 | 用途 | 默认 core/max | 队列 |
|-----------|----------|------|---------------|------|
| `searchTaskExecutor` | `intel-search-` | 关键词并行检索、搜索历史异步写入 | CPU/2 ~ CPU | 200 |
| `ragTaskExecutor` | `intel-rag-` | BM25+kNN 混合检索、RAG/KAG 对话 SSE、MQ 重建索引 | CPU ~ CPU×2 | 300 |
| `graphTaskExecutor` | `intel-graph-` | KAG 图谱并行检索、MQ 图谱构建 | 2 ~ 4 | 50 |

core/max 为 `0` 时按 CPU 自动推算（见 `IntelligenceExecutorConfig`）。

## 配置（Nacos / application.yml）

```yaml
intelligence:
  executor:
    search:
      core-pool-size: 0    # 0=自动
      max-pool-size: 0
      queue-capacity: 200
    rag:
      core-pool-size: 0
      max-pool-size: 0
      queue-capacity: 300
    graph:
      core-pool-size: 2
      max-pool-size: 4
      queue-capacity: 50
```

## 注入方式

```java
@Resource(name = IntelligenceExecutorNames.SEARCH)
private ThreadPoolTaskExecutor searchTaskExecutor;
```

## 主要消费点

| 模块 | 类 | 线程池 |
|------|-----|--------|
| retrieval | `SearchServiceImpl` | search |
| retrieval | `SearchHistoryServiceImpl` | search |
| llm | `ElasticsearchVectorIndexServiceImpl` / `MilvusVectorIndexServiceImpl` | rag |
| llm | `RagChatServiceImpl` / `AiChatServiceImpl` / `KAGChatServiceImpl` | rag |
| llm | `HybridRetrievalServiceImpl`（KAG 并行分支） | graph |
| llm | `ReindexConsumer` | rag |
| llm | `KAGReindexConsumer` | graph |

## 与通用 AsyncTaskConfig 的关系

`IntelligenceApplication` **排除** `kb-common` 的 `AsyncTaskConfig`，避免与三池重复注册 `asyncTaskExecutor`。其他 BC（core/file/statistics）仍使用通用 `asyncTaskExecutor`。

## 验收

- [x] 三池 Bean 独立注册（`IntelligenceExecutorConfigTest`）
- [x] 全仓 `mvn test` 通过
- [x] E2E 测试配置提供三池别名 Bean

## 调优建议

- 搜索 QPS 高：升 `search.max-pool-size` 与 `queue-capacity`
- RAG 重建索引与对话争抢：升 `rag` 池或降 `graph` 并发
- 图谱全量构建占满 LLM：保持 `graph` 小并发（2~4），批量任务走 MQ 排队

## 参考

- `遗留治理计划.md` 任务 36、A3 单 JVM 多职责
- `backend/sql/schema/intelligence-jvm-tuning.md` JVM 调优（任务 35）
