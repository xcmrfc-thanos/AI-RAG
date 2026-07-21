package com.knowledge.base.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * RAG配置属性
 *
 * <p>集中管理所有RAG相关配置参数，支持通过 application.yml 或环境变量覆盖。
 * Top-K 等检索参数运行时优先经 {@link RagRuntimeSettings} 热读 SystemConfigCache。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "rag")
public class RagProperties {

    /** 是否启用RAG功能 */
    private boolean enabled = true;

    /** 向量存储后端：elasticsearch | milvus */
    private String vectorStore = "elasticsearch";

    /** Milvus 配置 */
    private Milvus milvus = new Milvus();

    /** Qdrant 旁路双写 / dense 检索（默认关闭） */
    private Qdrant qdrant = new Qdrant();

    /** 混合检索融合配置 */
    private Hybrid hybrid = new Hybrid();

    /** 分块配置 */
    private Chunking chunking = new Chunking();

    /** 嵌入配置 */
    private Embedding embedding = new Embedding();

    /** 检索配置 */
    private Retrieval retrieval = new Retrieval();

    /** 重排序配置 */
    private Rerank rerank = new Rerank();

    /** 索引配置 */
    private Index index = new Index();

    /** 异步配置 */
    private Async async = new Async();

    @Data
    public static class Chunking {
        /** 每块目标token数 */
        private int chunkSize = 512;
        /** 块间重叠token数 */
        private int chunkOverlap = 64;
        /** 是否启用段落感知分块 */
        private boolean paragraphAware = true;
    }

    /**
     * 嵌入（向量）配置。
     *
     * <p>模型/维度/提供商标签在此配置；凭证优先根节点 {@code siliconflow.*} /
     * {@code qwen.*}（与对话 LLM 同风格）。{@code apiKey}/{@code baseUrl} 仅作可选覆盖
     *（如内网 Ollama 临时改写）。</p>
     *
     * <p><b>注意：</b>更换 {@code model} 或向量提供商后，ES/Qdrant 索引必须重建，
     * 不同模型的向量空间不可混用（即使维度同为 1024）。</p>
     */
    @Data
    public static class Embedding {
        /** 嵌入模型名称（如 text-embedding-v3、BAAI/bge-m3） */
        private String model = "text-embedding-v3";
        /** 嵌入向量维度（与索引 mapping 一致，默认 1024） */
        private int dimension = 1024;
        /**
         * 提供商标签：qwen | siliconflow | ollama | local（决定回退哪组根节点凭证）
         */
        private String provider = "qwen";
        /**
         * 可选覆盖；空时按 provider 回退 {@code siliconflow.api-key} 或 {@code qwen.api-key}
         */
        private String apiKey = "";
        /**
         * 可选覆盖；空时按 provider 回退 {@code siliconflow.base-url} 或 {@code qwen.base-url}
         */
        private String baseUrl = "";
        /** 批量嵌入大小 */
        private int batchSize = 20;
        /** 是否缓存嵌入结果 */
        private boolean cacheEnabled = true;
        /** 嵌入缓存TTL（秒） */
        private long cacheTtlSeconds = 86400;
    }

    @Data
    public static class Retrieval {
        /** 默认返回Top-K */
        private int defaultTopK = 5;
        /** 混合检索Top-K（BM25和kNN各自返回数） */
        private int hybridTopK = 20;
        /** 最终返回Top-K */
        private int finalTopK = 5;
        /** RRF（倒数排名融合）常数 */
        private int rrfC = 60;
        /**
         * 部署形态 ID（白名单）：es-es | es-qdrant | qdrant-qdrant | es-milvus | milvus-milvus。
         * 空则由 {@code rag.vector-store} + {@code rag.qdrant.enabled} 推导。
         */
        private String profile = "";
        /** 关键词腿：elasticsearch | qdrant | milvus（可与 profile 互推） */
        private String keywordEngine = "";
        /** 向量腿：elasticsearch | qdrant | milvus */
        private String denseEngine = "";
    }

    /**
     * 稀疏关键词腿（Hashing BM25-lite）。
     */
    @Data
    public static class Sparse {
        /** 哈希桶维度 */
        private int dimension = 30_000;
    }

    /** 稀疏嵌入配置 */
    private Sparse sparse = new Sparse();


    /**
     * 重排序配置。
     *
     * <p>{@code mode=api} 走专用 Rerank HTTP；{@code llm} 为旧串行对话打分（不推荐）；
     * {@code provider=auto} 跟随 {@link Embedding#provider}。</p>
     */
    @Data
    public static class Rerank {
        /** false 时等价 mode=off */
        private boolean enabled = true;
        /** off | api | llm；默认 api */
        private String mode = "api";
        /** auto | qwen | siliconflow | custom */
        private String provider = "auto";
        /** 空则按 resolver 默认模型 */
        private String model = "";
        /** 可选覆盖；空则回退硅基/通义根节点凭证 */
        private String apiKey = "";
        /** 可选覆盖；custom 时必填 */
        private String baseUrl = "";
        /** 0 表示使用请求 topK */
        private int topN = 0;
        /** 送入 rerank 的候选上限 */
        private int maxCandidates = 20;
        /** HTTP 超时（毫秒） */
        private long timeoutMs = 8000;
    }

    @Data
    public static class Index {
        /** ES chunk索引名称 */
        private String chunkIndexName = "kb_chunk";
    }

    @Data
    public static class Async {
        /** 是否启用异步索引 */
        private boolean enabled = true;
        /** 每批处理的文档数 */
        private int reindexBatchSize = 10;
    }

    @Data
    public static class Milvus {
        /** Milvus 主机（可被 SystemConfigCache milvus.host 覆盖） */
        private String host = "localhost";
        /** Milvus 端口（可被 SystemConfigCache milvus.port 覆盖） */
        private int port = 19530;
        /** 集合名称 */
        private String collection = "kb_chunk";
        /** 数据库名称 */
        private String database = "default";
        /** 连接超时（毫秒） */
        private long connectTimeoutMs = 10000;
    }

    /**
     * Qdrant 旁路配置（enabled=false 时不装配客户端）
     */
    @Data
    public static class Qdrant {
        /** 是否启用 Qdrant 双写与 dense 检索（代码默认 false；正式由 Nacos/环境变量打开） */
        private boolean enabled = false;
        /** Qdrant 主机 */
        private String host = "127.0.0.1";
        /** gRPC 端口（本地 Docker 映射默认 26334→6334） */
        private int port = 26334;
        /** 集合名称 */
        private String collection = "kb_chunk";
        /** API Key（可选） */
        private String apiKey = "";
        /** 连接超时（毫秒） */
        private long connectTimeoutMs = 10000;
        /** true=Qdrant 失败不阻断 ES 索引 */
        private boolean failOpen = true;
    }

    /**
     * 混合检索融合参数
     */
    @Data
    public static class Hybrid {
        /** 融合算法：rrf | weighted */
        private String fusion = "rrf";
        /** weighted 模式下 BM25 权重 */
        private double bm25Weight = 0.5;
        /** weighted 模式下 dense 权重 */
        private double denseWeight = 0.5;
    }
}
