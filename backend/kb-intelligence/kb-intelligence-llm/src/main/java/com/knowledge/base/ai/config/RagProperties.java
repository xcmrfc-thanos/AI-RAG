package com.knowledge.base.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * RAG配置属性
 *
 * <p>集中管理所有RAG相关配置参数，支持通过 application.yml 或环境变量覆盖。</p>
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

    @Data
    public static class Embedding {
        /** 嵌入模型名称 */
        private String model = "text-embedding-v3";
        /** 嵌入向量维度 */
        private int dimension = 1024;
        /** 嵌入提供商：qwen */
        private String provider = "qwen";
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
    }

    @Data
    public static class Rerank {
        /** 是否启用重排序 */
        private boolean enabled = true;
        /** 重排序使用的模型 */
        private String model = "qwen";
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
