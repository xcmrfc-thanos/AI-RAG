-- =====================================================
-- 已有库补丁：Settings 热读相关 kb_system_config 种子
-- 用途：既有环境补齐 EXPORT/RAG/GRAPH/AGENT/COMPLIANCE 键
-- 幂等：依赖 uk_config_key，冲突则 IGNORE
-- 导入后需重启 kb-core（ApplicationReadyEvent loadAll）以便刷 Redis
-- =====================================================

SET NAMES utf8mb4;
USE `kb_foundation`;

INSERT IGNORE INTO `kb_system_config`
  (`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`)
VALUES
(2000000000000000024, 'pdf.watermark.enabled', 'false', 'boolean', 'EXPORT', 'PDF水印开关', 1),
(2000000000000000025, 'pdf.watermark.type', 'user', 'string', 'EXPORT', '水印类型：user/text', 1),
(2000000000000000026, 'pdf.watermark.text', '内部资料', 'string', 'EXPORT', '自定义水印文本', 1),
(2000000000000000027, 'pdf.watermark.opacity', '0.15', 'number', 'EXPORT', '水印透明度', 1),
(2000000000000000028, 'rag.enabled', 'true', 'boolean', 'RAG', '是否启用RAG', 1),
(2000000000000000029, 'rag.retrieval.default-top-k', '5', 'number', 'RAG', '默认Top-K', 1),
(2000000000000000030, 'rag.retrieval.hybrid-top-k', '20', 'number', 'RAG', '混合检索各路候选Top-K', 1),
(2000000000000000031, 'rag.retrieval.final-top-k', '5', 'number', 'RAG', '最终返回Top-K', 1),
(2000000000000000032, 'rag.hybrid.enabled', 'true', 'boolean', 'RAG', '默认混合检索', 1),
(2000000000000000033, 'rag.rerank.enabled', 'true', 'boolean', 'RAG', '启用重排序', 1),
(2000000000000000034, 'rag.vector.store', 'elasticsearch', 'string', 'RAG', '向量存储类型', 1),
(2000000000000000055, 'rag.rerank.mode', 'api', 'string', 'RAG', '重排模式：off/api/llm', 1),
(2000000000000000056, 'rag.rerank.provider', 'auto', 'string', 'RAG', '重排Provider：auto/qwen/siliconflow/custom', 1),
(2000000000000000057, 'rag.rerank.model', '', 'string', 'RAG', '重排模型（空则按Provider默认）', 1),
(2000000000000000058, 'rag.qdrant.enabled', 'false', 'boolean', 'RAG', 'Qdrant旁路（BM25仍ES）', 1),
(2000000000000000059, 'rag.retrieval.profile', 'es-es', 'string', 'RAG', '检索部署形态白名单ID', 1),
(2000000000000000060, 'rag.retrieval.keyword-engine', 'elasticsearch', 'string', 'RAG', '关键词腿引擎', 1),
(2000000000000000061, 'rag.retrieval.dense-engine', 'elasticsearch', 'string', 'RAG', '向量腿引擎', 1),
(2000000000000000035, 'kag.enabled', 'true', 'boolean', 'GRAPH', '是否启用KAG', 1),
(2000000000000000036, 'kag.extraction.auto-enabled', 'true', 'boolean', 'GRAPH', '文档发布后自动抽实体', 1),
(2000000000000000037, 'kag.extraction.model', 'qwen', 'string', 'GRAPH', '抽取模型', 1),
(2000000000000000038, 'kag.extraction.max-entities-per-chunk', '10', 'number', 'GRAPH', '每块最大实体数', 1),
(2000000000000000039, 'kag.retrieval.max-hops', '2', 'number', 'GRAPH', '图谱检索最大跳数', 1),
(2000000000000000040, 'kag.graph.clear-before-build', 'true', 'boolean', 'GRAPH', '重建前清空图谱', 1),
(2000000000000000041, 'agent.default-workflow-id', '0', 'number', 'AGENT', '默认工作流ID', 1),
(2000000000000000042, 'agent.default-model', 'qwen', 'string', 'AGENT', '默认模型', 1),
(2000000000000000043, 'agent.timeouts.run-seconds', '90', 'number', 'AGENT', 'Run超时秒数', 1),
(2000000000000000044, 'agent.timeouts.llm-seconds', '60', 'number', 'AGENT', 'LLM超时秒数', 1),
(2000000000000000045, 'agent.timeouts.tool-seconds', '5', 'number', 'AGENT', '工具超时秒数', 1),
(2000000000000000046, 'agent.tools.hybrid-search.enabled', 'true', 'boolean', 'AGENT', '工具hybrid_search', 1),
(2000000000000000047, 'agent.tools.graph-search.enabled', 'true', 'boolean', 'AGENT', '工具graph_search', 1),
(2000000000000000048, 'agent.tools.get-document.enabled', 'true', 'boolean', 'AGENT', '工具get_document', 1),
(2000000000000000049, 'agent.run-retention-days', '30', 'number', 'AGENT', 'Run保留天数', 1),
(2000000000000000050, 'audit.operation-log.retention-days', '90', 'number', 'COMPLIANCE', '操作日志保留天数', 1),
(2000000000000000051, 'audit.confirm.export', 'true', 'boolean', 'COMPLIANCE', '导出二次确认', 1),
(2000000000000000052, 'audit.confirm.reindex', 'true', 'boolean', 'COMPLIANCE', '重建索引二次确认', 1),
(2000000000000000053, 'audit.confirm.graph-ops', 'true', 'boolean', 'COMPLIANCE', '图谱运维二次确认', 1),
(2000000000000000054, 'audit.confirm.delete', 'true', 'boolean', 'COMPLIANCE', '删除二次确认', 1);

SELECT CONCAT('settings hotread seeds upserted, affected=', ROW_COUNT()) AS info;
