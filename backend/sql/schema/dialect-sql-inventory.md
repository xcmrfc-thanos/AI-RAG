# 方言 SQL 风险清单（活跃代码，排除 _archive）
> 生成自扫描；生产交付计划 Task 1。
## 汇总
| 状态 | 模式 | 文件数 |
|------|------|--------|
| 已Oracle分支 | FETCH_FIRST | 1 |
| 已PG分支 | ON_CONFLICT | 1 |
| 已helper | IFNULL | 1 |
| 已helper | LIMIT_HELPER | 14 |
| 已helper定义 | DATE_FUNC | 1 |
| 已helper定义 | DATE_SUB | 1 |
| 已helper定义 | FETCH_FIRST | 1 |
| 已helper定义 | IFNULL | 1 |
| 已helper定义 | LIMIT_HELPER | 1 |
| 已helper定义 | ON_CONFLICT | 1 |
| 已helper定义 | ON_DUPLICATE | 1 |
| 待改 | CONCAT | 4 |
| 待改 | DATE_FUNC | 5 |
| 待改 | LIMIT_ANNOT | 9 |
| 待改 | LIMIT_XML | 9 |
| 待改 | ON_DUPLICATE | 1 |
| 测试 | DATE_FUNC | 1 |
| 测试 | DATE_SUB | 1 |
| 测试 | FETCH_FIRST | 1 |
| 测试 | IFNULL | 1 |
| 测试 | LIMIT_HELPER | 1 |
| 测试 | ON_CONFLICT | 1 |
| 测试 | ON_DUPLICATE | 2 |

## 优先级约定

- **P0**：登录鉴权、主链路文档/文件 CRUD、网关相关
- **P1**：统计聚合/投影 Mapper 与 JDBC
- **P2**：管理端冷路径、Tag/Team 模糊查询等

## 明细（按状态）

### 待改

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | DATE_FUNC | `backend/kb-common/src/main/java/com/knowledge/base/common/enums/OperationType.java` | 29 |
| P2 | LIMIT_XML | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/mapper/DocumentAccessMapper.java` | 33 |
| P2 | LIMIT_ANNOT | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/mapper/DocumentAccessMapper.java` | 33 |
| P2 | CONCAT | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentReviewServiceImpl.java` | 413 |
| P2 | LIMIT_XML | `backend/kb-core/kb-core-document/src/main/resources/mapper/TagMapper.xml` | 78 |
| P2 | LIMIT_ANNOT | `backend/kb-core/kb-core-document/src/main/resources/mapper/TagMapper.xml` | 78 |
| P2 | CONCAT | `backend/kb-core/kb-core-document/src/main/resources/mapper/TagMapper.xml` | 121 |
| P0 | CONCAT | `backend/kb-core/kb-core-iam/src/main/resources/mapper/TeamMapper.xml` | 96 |
| P0 | ON_DUPLICATE | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/resources/mapper/search/SearchHistoryMapper.xml` | 60 |
| P0 | LIMIT_XML | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/resources/mapper/search/SearchHistoryMapper.xml` | 35 |
| P1 | LIMIT_ANNOT | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/resources/mapper/search/SearchHistoryMapper.xml` | 35 |
| P0 | CONCAT | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/resources/mapper/search/SearchHistoryMapper.xml` | 101 |
| P1 | DATE_FUNC | `backend/kb-statistics/src/main/resources/mapper/CommentStatisticsMapper.xml` | 42,46 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/CommentStatisticsMapper.xml` | 65,74 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/CommentStatisticsMapper.xml` | 65,74 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsAggMapper.xml` | 29 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsAggMapper.xml` | 29 |
| P1 | DATE_FUNC | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsMapper.xml` | 71,76 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsMapper.xml` | 98,117,136,155 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsMapper.xml` | 98,117,136,155 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/UserStatisticsAggMapper.xml` | 15 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/UserStatisticsAggMapper.xml` | 15 |
| P1 | DATE_FUNC | `backend/kb-statistics/src/main/resources/mapper/UserStatisticsMapper.xml` | 55,60,106,107 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/UserStatisticsMapper.xml` | 73 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/UserStatisticsMapper.xml` | 73 |
| P1 | DATE_FUNC | `backend/kb-statistics/src/main/resources/mapper/ViewStatisticsMapper.xml` | 57,61 |
| P1 | LIMIT_XML | `backend/kb-statistics/src/main/resources/mapper/ViewStatisticsMapper.xml` | 80,89,99,118 |
| P1 | LIMIT_ANNOT | `backend/kb-statistics/src/main/resources/mapper/ViewStatisticsMapper.xml` | 80,89,99,118 |

### 已helper

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | LIMIT_HELPER | `backend/kb-agent/src/main/java/com/knowledge/base/agent/engine/MybatisAgentRunPersistence.java` | 80 |
| P2 | LIMIT_HELPER | `backend/kb-agent/src/main/java/com/knowledge/base/agent/run/AgentRunRetentionCleaner.java` | 54 |
| P0 | IFNULL | `backend/kb-agent/src/main/java/com/knowledge/base/agent/security/AgentJwtAuthenticationFilter.java` | 86,104 |
| P0 | LIMIT_HELPER | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentServiceImpl.java` | 354 |
| P2 | LIMIT_HELPER | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentVersionServiceImpl.java` | 79 |
| P2 | LIMIT_HELPER | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/FileManagementServiceImpl.java` | 290 |
| P2 | LIMIT_HELPER | `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/TagServiceImpl.java` | 225 |
| P0 | LIMIT_HELPER | `backend/kb-core/kb-core-iam/src/main/java/com/knowledge/base/userauth/service/impl/UserServiceImpl.java` | 629 |
| P0 | LIMIT_HELPER | `backend/kb-file/src/main/java/com/knowledge/base/file/service/impl/FileServiceImpl.java` | 457,484 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/service/impl/RagChatServiceImpl.java` | 344 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/service/impl/AiChatServiceImpl.java` | 399 |
| P1 | LIMIT_HELPER | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/java/com/knowledge/base/search/service/impl/SearchHistoryServiceImpl.java` | 98 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/src/main/java/com/knowledge/base/statistics/service/impl/StatisticsServiceImpl.java` | 528,631 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/src/main/java/com/knowledge/base/statistics/task/HotDocumentsCacheTask.java` | 126 |
| P1 | LIMIT_HELPER | `backend/kb-statistics/src/main/java/com/knowledge/base/statistics/task/LatestDocumentsCacheTask.java` | 115 |

### 已helper定义

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | IFNULL | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 18,67,73,75 |
| P2 | ON_DUPLICATE | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 152,165,178 |
| P2 | ON_CONFLICT | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 19,153,170 |
| P2 | DATE_SUB | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 97,104,107 |
| P2 | DATE_FUNC | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 112,123,126 |
| P2 | LIMIT_HELPER | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 139 |
| P2 | FETCH_FIRST | `backend/kb-common/src/main/java/com/knowledge/base/common/config/SqlDialectHelper.java` | 133,144 |

### 已PG分支

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P1 | ON_CONFLICT | `backend/kb-intelligence/kb-intelligence-retrieval/src/main/resources/mapper/search/SearchHistoryMapper.xml` | 70 |

### 已Oracle分支

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P1 | FETCH_FIRST | `backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsMapper.xml` | 107,126,145,165 |

### 测试

| 优先级 | 模式 | 文件 | 行 |
|--------|------|------|----|
| P2 | IFNULL | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 23,25,27,32,34,39,41 |
| P2 | ON_DUPLICATE | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 60 |
| P2 | ON_CONFLICT | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 64,69 |
| P2 | DATE_SUB | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 48 |
| P2 | DATE_FUNC | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 101 |
| P2 | LIMIT_HELPER | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 112,114,116,117 |
| P2 | FETCH_FIRST | `backend/kb-common/src/test/java/com/knowledge/base/common/config/SqlDialectHelperTest.java` | 108,116 |
| P1 | ON_DUPLICATE | `backend/kb-statistics/src/test/java/com/knowledge/base/statistics/repository/StatDocumentRepositoryTest.java` | 52 |

## 下一步（对应计划）

- Task 2：Oracle MERGE（统计 JDBC `ON_DUPLICATE`/`已helper组装` 在 Oracle 下接通）
- Task 3：统计 Mapper 的 `DATE_FUNC`/`LIMIT_XML` 补 `databaseId=oracle`；SearchHistory `LIMIT`/`CONCAT`
- P2：`TeamMapper`/`TagMapper`/`DocumentReview` 的 `CONCAT` 在 Oracle 验证
