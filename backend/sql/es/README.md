# Intelligence BC — Elasticsearch 索引脚本

> **项目开发中，还未部署 ES**。本目录为 **kb_document** / **kb_chunk** 的 canonical mapping，与代码中 `SearchServiceImpl.rebuildIndex()`、`ElasticsearchVectorIndexServiceImpl.createIndexIfNotExists()` 对齐。  
> 索引名由 `intelligence.indexing.document-index` / `chunk-index` 配置（默认 `kb_document`、`kb_chunk`）。

## 文件

| 文件 | 索引 | 用途 |
|------|------|------|
| `kb_document_index.json` | 文档级 BM25 全文 | 关键词搜索、hybrid 元数据补全 |
| `kb_chunk_index.json` | 分块 + dense_vector | RAG 混合检索（BM25 + kNN） |
| `create_indices.sh` | — | Linux/macOS 一键创建 |
| `create_indices.ps1` | — | Windows 一键创建 |

## 前置

- Elasticsearch 8.x（需安装 **IK 分词** 插件，若使用 `ik_max_word`）
- 环境变量（可选）：

```bash
export ES_HOST=http://127.0.0.1:20920
export ES_USER=elastic
export ES_PASS=your_password
export DOCUMENT_INDEX=kb_document
export CHUNK_INDEX=kb_chunk
```

## 创建索引

```bash
cd backend/sql/es
./create_indices.sh
```

```powershell
# 删建 ES 索引（可选 -Token 自动触发业务回填）
cd deploy\scripts
.\rebuild-es-indices.ps1
# 或带 Token：
.\rebuild-es-indices.ps1 -Token "<JWT>"
```

Windows 仅创建（不删除旧索引）：

## 与运行时关系

| 场景 | 行为 |
|------|------|
| 首次部署 | 先跑本脚本，再启动 kb-intelligence |
| 应用内 rebuild | `SearchServiceImpl.rebuildIndex()` 删建 document 索引（读 classpath JSON）；chunk 由 RAG `createIndexIfNotExists()` 读 JSON 创建 |
| 修改 mapping / 升级搜索 | 运行 `deploy/scripts/rebuild-es-indices.ps1`，再触发 rebuild + reindex |
| 验证深搜 | 关键词搜索 `startTransition`，应命中正文相关片段 |

## embedding 维度

`kb_chunk_index.json` 中 `embedding.dims` 默认为 **1024**（与 `rag.embedding.dimension` 一致）。若改维度，须同时改 JSON 与 `application.yml`。
