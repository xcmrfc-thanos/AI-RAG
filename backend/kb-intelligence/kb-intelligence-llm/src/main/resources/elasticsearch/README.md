# ES 索引定义（P1-5c）

**运行时单源**：`kb-common/src/main/resources/elasticsearch/`

- `kb_document_index.json` — 文档级 BM25（`SearchServiceImpl.rebuildIndex`）
- `kb_chunk_index.json` — 分块 + dense_vector（`ElasticsearchVectorIndexServiceImpl.createIndexIfNotExists`）

**运维脚本单源**：`backend/sql/es/`（内容与 classpath 保持同步）

修改 mapping 时两处 JSON 须同时更新，再重建索引。
