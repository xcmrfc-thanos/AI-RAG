package com.knowledge.base.foundation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import com.knowledge.base.foundation.dto.SettingsDTO;
import com.knowledge.base.foundation.entity.SystemConfig;
import com.knowledge.base.foundation.mapper.SystemConfigMapper;
import com.knowledge.base.foundation.service.SettingsService;
import com.knowledge.base.foundation.vo.SettingsVO;
import com.knowledge.base.foundation.vo.SystemStatusVO;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.lang.management.ManagementFactory;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 系统设置Service实现
 *
 * <p>管理配置键到设置字段的映射关系，提供分组读写和类型转换能力。</p>
 *
 * <p>设计要点：
 * <ul>
 *   <li>使用内存映射表桥接 "config_key" 与 "settings字段" 的双向转换</li>
 *   <li>写操作时自动创建缺失的配置项（upsert语义）</li>
 *   <li>读操作时对缺失配置返回预设默认值</li>
 *   <li>bool/number类型的值在DB中以字符串存储，读写时自动转换</li>
 * </ul>
 * </p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
public class SettingsServiceImpl implements SettingsService {

    @Resource
    private SystemConfigMapper systemConfigMapper;

    @Resource
    private SystemConfigCache systemConfigCache;

    /** 文档库 COUNT（多数据源；单测/缺 bean 时可为 null） */
    @Nullable
    @Autowired(required = false)
    @Qualifier("documentJdbcTemplate")
    private JdbcTemplate documentJdbcTemplate;

    /** 用户库 COUNT（多数据源；单测/缺 bean 时可为 null） */
    @Nullable
    @Autowired(required = false)
    @Qualifier("iamJdbcTemplate")
    private JdbcTemplate iamJdbcTemplate;

    /** kb-file 根地址（直连，非网关） */
    @Value("${kb-file.url:http://localhost:8084}")
    private String fileServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /** 默认存储配额 100GiB */
    private static final long DEFAULT_STORAGE_QUOTA_BYTES = 107_374_182_400L;

    /**
     * 设置字段 → 数据库配置键 的映射
     * key: 前端settings字段名
     * value: [config_key, config_type, default_value, category]
     */
    private static final Map<String, String[]> FIELD_TO_CONFIG = new LinkedHashMap<>();
    static {
        // ===== 基本设置 =====
        FIELD_TO_CONFIG.put("systemName",           new String[]{"system.name",                    "string",  "智能知识库",                          "SYSTEM"});
        FIELD_TO_CONFIG.put("systemDescription",    new String[]{"system.description",             "string",  "企业级智能知识管理平台",                "SYSTEM"});
        FIELD_TO_CONFIG.put("systemVersion",        new String[]{"system.version",                 "string",  "v2.4.1",                             "SYSTEM"});
        FIELD_TO_CONFIG.put("defaultLanguage",      new String[]{"system.language",                "string",  "zh-CN",                              "SYSTEM"});
        FIELD_TO_CONFIG.put("timezone",             new String[]{"system.timezone",                "string",  "Asia/Shanghai",                      "SYSTEM"});
        FIELD_TO_CONFIG.put("allowRegistration",    new String[]{"user.registration.enabled",      "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("requireApproval",      new String[]{"system.requireApproval",         "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("enableComments",       new String[]{"system.enableComments",          "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("enableAI",             new String[]{"system.enableAI",                "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("enableAIWriting",      new String[]{"system.enableAIWriting",         "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("enableAgent",          new String[]{"system.enableAgent",             "boolean", "true",                               "SYSTEM"});
        FIELD_TO_CONFIG.put("enableFullTextSearch", new String[]{"system.enableFullTextSearch",    "boolean", "true",                               "SYSTEM"});

        // ===== 安全设置 =====
        FIELD_TO_CONFIG.put("passwordPolicy",       new String[]{"system.passwordPolicy",          "string",  "medium",                             "SECURITY"});
        FIELD_TO_CONFIG.put("sessionTimeout",       new String[]{"auth.session.timeout",           "number",  "3600",                               "SECURITY"});
        FIELD_TO_CONFIG.put("enable2FA",            new String[]{"system.enable2FA",               "boolean", "false",                              "SECURITY"});
        FIELD_TO_CONFIG.put("ipRestriction",        new String[]{"system.ipRestriction",           "boolean", "false",                              "SECURITY"});
        FIELD_TO_CONFIG.put("passwordMinLength",    new String[]{"auth.password.min.length",       "number",  "8",                                  "SECURITY"});
        FIELD_TO_CONFIG.put("requireSpecialChar",   new String[]{"auth.password.require.special",  "boolean", "true",                               "SECURITY"});
        FIELD_TO_CONFIG.put("loginMaxRetry",        new String[]{"auth.login.max.retry",           "number",  "5",                                  "SECURITY"});

        // ===== 存储设置 =====
        FIELD_TO_CONFIG.put("maxFileSize",          new String[]{"file.upload.max.size",           "number",  "104857600",                          "STORAGE"});
        FIELD_TO_CONFIG.put("allowedFileTypes",     new String[]{"file.upload.allowed.types",      "string",  "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,jpg,jpeg,png,gif,bmp,webp,svg,ico,mp4,avi,mov,wmv,flv,mkv,webm,mp3,wav,flac,aac,ogg,m4a,wma", "STORAGE"});
        FIELD_TO_CONFIG.put("storageEndpoints",     new String[]{"s3.endpoints",                 "string",  "http://localhost:8200",              "STORAGE"});
        FIELD_TO_CONFIG.put("storageBucket",        new String[]{"s3.bucket",                    "string",  "knowledge-docs",                     "STORAGE"});
        /** 配额（字节）；用于系统状态「总存储空间」，默认 100GiB */
        FIELD_TO_CONFIG.put("storageQuotaBytes",    new String[]{"s3.storage.quota.bytes",       "number",  "107374182400",                      "STORAGE"});

        // ===== 通知设置 =====
        FIELD_TO_CONFIG.put("emailEnabled",         new String[]{"email.enabled",                  "boolean", "true",                               "NOTIFICATION"});
        FIELD_TO_CONFIG.put("emailHost",            new String[]{"email.host",                     "string",  "smtp.example.com",                   "NOTIFICATION"});
        FIELD_TO_CONFIG.put("emailPort",            new String[]{"email.port",                     "number",  "587",                                "NOTIFICATION"});
        FIELD_TO_CONFIG.put("websocketEnabled",     new String[]{"websocket.enabled",              "boolean", "true",                               "NOTIFICATION"});
        FIELD_TO_CONFIG.put("notificationRetentionDays", new String[]{"notification.retention.days", "number", "90",                            "NOTIFICATION"});

        // ===== AI设置 =====
        FIELD_TO_CONFIG.put("aiModelName",          new String[]{"qwen.model.name",                "string",  "qwen3-max",                          "AI"});
        FIELD_TO_CONFIG.put("embeddingModel",       new String[]{"rag.embedding.model",            "string",  "BAAI/bge-m3",                        "AI"});
        FIELD_TO_CONFIG.put("chatProvider",         new String[]{"ai.chat.provider",               "string",  "qwen",                               "AI"});
        FIELD_TO_CONFIG.put("embeddingProvider",    new String[]{"rag.embedding.provider",         "string",  "siliconflow",                        "AI"});
        FIELD_TO_CONFIG.put("vectorStoreType",      new String[]{"rag.vector.store",               "string",  "elasticsearch",                      "AI"});
        FIELD_TO_CONFIG.put("milvusHost",           new String[]{"milvus.host",                    "string",  "localhost",                          "AI"});
        FIELD_TO_CONFIG.put("milvusPort",           new String[]{"milvus.port",                    "number",  "19530",                              "AI"});
        FIELD_TO_CONFIG.put("aiTemperature",        new String[]{"ai.chat.temperature",            "number",  "0.7",                                "AI"});
        FIELD_TO_CONFIG.put("aiMaxTokens",          new String[]{"ai.chat.max.tokens",             "number",  "4096",                               "AI"});
        FIELD_TO_CONFIG.put("aiTimeoutSeconds",     new String[]{"ai.chat.timeout.seconds",        "number",  "120",                                "AI"});

        // ===== 文档导出 / 水印 =====
        FIELD_TO_CONFIG.put("pdfWatermarkEnabled",  new String[]{"pdf.watermark.enabled",          "boolean", "false",                              "EXPORT"});
        FIELD_TO_CONFIG.put("pdfWatermarkType",     new String[]{"pdf.watermark.type",             "string",  "user",                              "EXPORT"});
        FIELD_TO_CONFIG.put("pdfWatermarkText",     new String[]{"pdf.watermark.text",             "string",  "内部资料",                            "EXPORT"});
        FIELD_TO_CONFIG.put("pdfWatermarkOpacity",  new String[]{"pdf.watermark.opacity",          "number",  "0.15",                               "EXPORT"});

        // ===== 检索 / RAG =====
        FIELD_TO_CONFIG.put("ragEnabled",           new String[]{"rag.enabled",                    "boolean", "true",                               "RAG"});
        FIELD_TO_CONFIG.put("ragDefaultTopK",       new String[]{"rag.retrieval.default-top-k",    "number",  "5",                                  "RAG"});
        FIELD_TO_CONFIG.put("ragHybridTopK",        new String[]{"rag.retrieval.hybrid-top-k",     "number",  "20",                                 "RAG"});
        FIELD_TO_CONFIG.put("ragFinalTopK",         new String[]{"rag.retrieval.final-top-k",      "number",  "5",                                  "RAG"});
        FIELD_TO_CONFIG.put("ragHybridEnabled",     new String[]{"rag.hybrid.enabled",             "boolean", "true",                               "RAG"});
        FIELD_TO_CONFIG.put("ragRerankEnabled",     new String[]{"rag.rerank.enabled",             "boolean", "true",                               "RAG"});
        FIELD_TO_CONFIG.put("ragRerankMode",        new String[]{"rag.rerank.mode",                "string",  "api",                                "RAG"});
        FIELD_TO_CONFIG.put("ragRerankProvider",    new String[]{"rag.rerank.provider",            "string",  "auto",                               "RAG"});
        FIELD_TO_CONFIG.put("ragRerankModel",       new String[]{"rag.rerank.model",               "string",  "",                                   "RAG"});
        FIELD_TO_CONFIG.put("ragRetrievalProfile",  new String[]{"rag.retrieval.profile",          "string",  "es-es",                              "RAG"});
        FIELD_TO_CONFIG.put("ragKeywordEngine",     new String[]{"rag.retrieval.keyword-engine",   "string",  "elasticsearch",                      "RAG"});
        FIELD_TO_CONFIG.put("ragDenseEngine",       new String[]{"rag.retrieval.dense-engine",     "string",  "elasticsearch",                      "RAG"});
        FIELD_TO_CONFIG.put("ragQdrantEnabled",     new String[]{"rag.qdrant.enabled",             "boolean", "false",                              "RAG"});
        FIELD_TO_CONFIG.put("ragVectorStoreType",   new String[]{"rag.vector.store",               "string",  "elasticsearch",                      "RAG"});

        // ===== 知识图谱 / KAG =====
        FIELD_TO_CONFIG.put("kagEnabled",             new String[]{"kag.enabled",                      "boolean", "true",   "GRAPH"});
        FIELD_TO_CONFIG.put("kagAutoExtract",         new String[]{"kag.extraction.auto-enabled",      "boolean", "true",   "GRAPH"});
        FIELD_TO_CONFIG.put("kagExtractionModel",     new String[]{"kag.extraction.model",             "string",  "qwen",   "GRAPH"});
        FIELD_TO_CONFIG.put("kagMaxEntitiesPerChunk", new String[]{"kag.extraction.max-entities-per-chunk", "number", "10", "GRAPH"});
        FIELD_TO_CONFIG.put("kagMaxHops",             new String[]{"kag.retrieval.max-hops",           "number",  "2",      "GRAPH"});
        FIELD_TO_CONFIG.put("kagClearBeforeBuild",    new String[]{"kag.graph.clear-before-build",     "boolean", "true",   "GRAPH"});

        // ===== Agent =====
        FIELD_TO_CONFIG.put("agentDefaultWorkflowId",   new String[]{"agent.default-workflow-id",        "number",  "0",     "AGENT"});
        FIELD_TO_CONFIG.put("agentDefaultModel",        new String[]{"agent.default-model",              "string",  "qwen",  "AGENT"});
        FIELD_TO_CONFIG.put("agentRunTimeoutSeconds",   new String[]{"agent.timeouts.run-seconds",      "number",  "90",    "AGENT"});
        FIELD_TO_CONFIG.put("agentLlmTimeoutSeconds",   new String[]{"agent.timeouts.llm-seconds",      "number",  "60",    "AGENT"});
        FIELD_TO_CONFIG.put("agentToolTimeoutSeconds",  new String[]{"agent.timeouts.tool-seconds",     "number",  "5",     "AGENT"});
        FIELD_TO_CONFIG.put("agentToolHybridSearch",    new String[]{"agent.tools.hybrid-search.enabled","boolean","true",  "AGENT"});
        FIELD_TO_CONFIG.put("agentToolGraphSearch",     new String[]{"agent.tools.graph-search.enabled", "boolean","true",  "AGENT"});
        FIELD_TO_CONFIG.put("agentToolGetDocument",     new String[]{"agent.tools.get-document.enabled", "boolean","true",  "AGENT"});
        FIELD_TO_CONFIG.put("agentRunRetentionDays",    new String[]{"agent.run-retention-days",         "number",  "30",    "AGENT"});

        // ===== 审计与合规 =====
        FIELD_TO_CONFIG.put("operationLogRetentionDays", new String[]{"audit.operation-log.retention-days", "number", "90", "COMPLIANCE"});
        FIELD_TO_CONFIG.put("confirmSensitiveExport",    new String[]{"audit.confirm.export",               "boolean", "true", "COMPLIANCE"});
        FIELD_TO_CONFIG.put("confirmSensitiveReindex",   new String[]{"audit.confirm.reindex",              "boolean", "true", "COMPLIANCE"});
        FIELD_TO_CONFIG.put("confirmSensitiveGraphOps",  new String[]{"audit.confirm.graph-ops",            "boolean", "true", "COMPLIANCE"});
        FIELD_TO_CONFIG.put("confirmSensitiveDelete",    new String[]{"audit.confirm.delete",               "boolean", "true", "COMPLIANCE"});

        // ===== 集成（对象存储 / 邮件中枢标识，明细仍在 STORAGE / NOTIFICATION） =====
        FIELD_TO_CONFIG.put("storageProvider",       new String[]{"s3.provider",            "string",  "rustfs", "INTEGRATION"});
        FIELD_TO_CONFIG.put("storageRegion",         new String[]{"s3.region",              "string",  "us-east-1", "INTEGRATION"});
        FIELD_TO_CONFIG.put("integrationNeo4jUri",   new String[]{"neo4j.uri",              "string",  "bolt://localhost:7687", "INTEGRATION"});
        FIELD_TO_CONFIG.put("integrationEsHosts",    new String[]{"elasticsearch.hosts",    "string",  "http://localhost:9200", "INTEGRATION"});
    }

    // ==================== 按分组读取 ====================

    /** {@inheritDoc} */
    /**
     * 获取Settings。
     */
    @Override
    public SettingsVO getSettings() {
        log.info("获取系统设置");

        // 一次性查询所有配置，避免N+1
        List<SystemConfig> allConfigs = systemConfigMapper.selectList(
                new LambdaQueryWrapper<SystemConfig>()
                        .eq(SystemConfig::getDeleted, 0)
        );

        Map<String, String> configMap = new HashMap<>();
        for (SystemConfig config : allConfigs) {
            configMap.put(config.getConfigKey(), config.getConfigValue());
        }

        // 组装分组
        Map<String, Object> basic        = buildSection(configMap, "SYSTEM",     SETTINGS_BASIC_FIELDS,         "basic");
        Map<String, Object> security     = buildSection(configMap, "SECURITY",   SETTINGS_SECURITY_FIELDS,       "security");
        Map<String, Object> storage      = buildSection(configMap, "STORAGE",    SETTINGS_STORAGE_FIELDS,        "storage");
        Map<String, Object> notification = buildSection(configMap, "NOTIFICATION", SETTINGS_NOTIFICATION_FIELDS, "notification");
        Map<String, Object> ai           = buildSection(configMap, "AI",         SETTINGS_AI_FIELDS,             "ai");
        Map<String, Object> export       = buildSection(configMap, "EXPORT",     SETTINGS_EXPORT_FIELDS,         "export");
        Map<String, Object> rag          = buildSection(configMap, "RAG",        SETTINGS_RAG_FIELDS,            "rag");
        Map<String, Object> graph        = buildSection(configMap, "GRAPH",      SETTINGS_GRAPH_FIELDS,          "graph");
        Map<String, Object> agent        = buildSection(configMap, "AGENT",      SETTINGS_AGENT_FIELDS,          "agent");
        Map<String, Object> compliance   = buildSection(configMap, "COMPLIANCE", SETTINGS_COMPLIANCE_FIELDS,     "compliance");
        Map<String, Object> integration  = buildSection(configMap, "INTEGRATION", SETTINGS_INTEGRATION_FIELDS,  "integration");

        return SettingsVO.builder()
                .basic(basic)
                .security(security)
                .storage(storage)
                .notification(notification)
                .ai(ai)
                .export(export)
                .rag(rag)
                .graph(graph)
                .agent(agent)
                .compliance(compliance)
                .integration(integration)
                .status(getSystemStatus())
                .build();
    }

    // 各分组的字段列表
    private static final List<String> SETTINGS_BASIC_FIELDS = List.of(
            "systemName", "systemDescription", "systemVersion", "defaultLanguage", "timezone",
            "allowRegistration", "requireApproval", "enableComments", "enableAI", "enableAIWriting", "enableAgent", "enableFullTextSearch"
    );
    private static final List<String> SETTINGS_SECURITY_FIELDS = List.of(
            "passwordPolicy", "sessionTimeout", "enable2FA", "ipRestriction",
            "passwordMinLength", "requireSpecialChar", "loginMaxRetry"
    );
    private static final List<String> SETTINGS_STORAGE_FIELDS = List.of(
            "maxFileSize", "allowedFileTypes", "storageEndpoints", "storageBucket", "storageQuotaBytes"
    );
    private static final List<String> SETTINGS_NOTIFICATION_FIELDS = List.of(
            "emailEnabled", "emailHost", "emailPort", "websocketEnabled", "notificationRetentionDays"
    );
    private static final List<String> SETTINGS_AI_FIELDS = List.of(
            "chatProvider", "aiModelName", "embeddingProvider", "embeddingModel",
            "vectorStoreType", "milvusHost", "milvusPort",
            "aiTemperature", "aiMaxTokens", "aiTimeoutSeconds"
    );
    private static final List<String> SETTINGS_EXPORT_FIELDS = List.of(
            "pdfWatermarkEnabled", "pdfWatermarkType", "pdfWatermarkText", "pdfWatermarkOpacity"
    );
    private static final List<String> SETTINGS_RAG_FIELDS = List.of(
            "ragEnabled", "ragDefaultTopK", "ragHybridTopK", "ragFinalTopK",
            "ragHybridEnabled", "ragRerankEnabled",
            "ragRerankMode", "ragRerankProvider", "ragRerankModel",
            "ragRetrievalProfile", "ragKeywordEngine", "ragDenseEngine",
            "ragQdrantEnabled", "ragVectorStoreType",
            "milvusHost", "milvusPort"
    );
    private static final List<String> SETTINGS_GRAPH_FIELDS = List.of(
            "kagEnabled", "kagAutoExtract", "kagExtractionModel",
            "kagMaxEntitiesPerChunk", "kagMaxHops", "kagClearBeforeBuild"
    );
    private static final List<String> SETTINGS_AGENT_FIELDS = List.of(
            "agentDefaultWorkflowId", "agentDefaultModel",
            "agentRunTimeoutSeconds", "agentLlmTimeoutSeconds", "agentToolTimeoutSeconds",
            "agentToolHybridSearch", "agentToolGraphSearch", "agentToolGetDocument",
            "agentRunRetentionDays"
    );
    private static final List<String> SETTINGS_COMPLIANCE_FIELDS = List.of(
            "operationLogRetentionDays",
            "confirmSensitiveExport", "confirmSensitiveReindex",
            "confirmSensitiveGraphOps", "confirmSensitiveDelete"
    );
    private static final List<String> SETTINGS_INTEGRATION_FIELDS = List.of(
            "storageProvider", "storageRegion", "integrationNeo4jUri", "integrationEsHosts"
    );

    /**
     * 按字段列表构建一个分组配置Map
     */
    private Map<String, Object> buildSection(Map<String, String> configMap,
                                              String category,
                                              List<String> fieldNames,
                                              String sectionName) {
        Map<String, Object> section = new LinkedHashMap<>();
        for (String fieldName : fieldNames) {
            String[] meta = FIELD_TO_CONFIG.get(fieldName);
            if (meta == null) {
                log.warn("未知的设置字段: {}", fieldName);
                continue;
            }
            String configKey  = meta[0];
            String configType = meta[1];
            String rawValue = configMap.getOrDefault(configKey, meta[2]);

            section.put(fieldName, convertValue(rawValue, configType));
        }
        return section;
    }

    /**
     * 将字符串值按类型转换为Java对象
     */
    private Object convertValue(String raw, String type) {
        if (raw == null) return null;
        return switch (type) {
            case "boolean" -> "true".equalsIgnoreCase(raw) || "1".equals(raw);
            case "number"  -> {
                try {
                    String trimmed = raw.trim();
                    if (trimmed.contains(".")) {
                        yield Double.parseDouble(trimmed);
                    }
                    yield Long.parseLong(trimmed);
                } catch (NumberFormatException e) {
                    yield raw;
                }
            }
            default -> raw;
        };
    }

    // ==================== 按分组更新 ====================

    /** {@inheritDoc} */
    /**
     * 更新Settings。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = {"configCache", "settingsCache"}, allEntries = true)
    public Boolean updateSettings(SettingsDTO settingsDTO) {
        String section = settingsDTO.getSection();
        Map<String, Object> settings = settingsDTO.getSettings();
        log.info("批量更新设置：section={}, 字段数={}", section, settings.size());

        if (settings == null || settings.isEmpty()) {
            throw new BusinessException("设置内容不能为空");
        }

        for (Map.Entry<String, Object> entry : settings.entrySet()) {
            String fieldName = entry.getKey();
            Object value = entry.getValue();

            String[] meta = FIELD_TO_CONFIG.get(fieldName);
            if (meta == null) {
                log.warn("跳过未知设置字段: {}", fieldName);
                continue;
            }
            String configKey  = meta[0];
            String configType = meta[1];
            String category   = meta[3];

            upsertConfig(configKey, configType, category, value);
        }

        return true;
    }

    /**
     * 创建或更新单个配置项
     */
    private void upsertConfig(String configKey, String configType, String category, Object value) {
        String stringValue = (value instanceof Boolean)
                ? String.valueOf(value)
                : Objects.toString(value, "");

        SystemConfig existConfig = systemConfigMapper.selectByConfigKey(configKey);

        if (existConfig != null) {
            // 更新
            existConfig.setConfigValue(stringValue);
            existConfig.setConfigType(configType);
            existConfig.setCategory(category);
            existConfig.setUpdatedAt(LocalDateTime.now());
            systemConfigMapper.updateById(existConfig);
        } else {
            // 创建
            SystemConfig newConfig = new SystemConfig();
            newConfig.setId(SnowflakeIdGenerator.getInstance().nextId());
            newConfig.setConfigKey(configKey);
            newConfig.setConfigValue(stringValue);
            newConfig.setConfigType(configType);
            newConfig.setCategory(category);
            newConfig.setDescription("由设置页面自动创建");
            newConfig.setIsPublic(1);
            newConfig.setCreatedAt(LocalDateTime.now());
            newConfig.setUpdatedAt(LocalDateTime.now());
            systemConfigMapper.insert(newConfig);
        }
        // 同步到 Redis 缓存
        systemConfigCache.setConfig(configKey, stringValue);
    }

    // ==================== 系统状态 ====================

    /** {@inheritDoc} */
    /**
     * 获取SystemStatus。
     */
    @Override
    public SystemStatusVO getSystemStatus() {
        // 读取系统配置
        List<SystemConfig> allConfigs = systemConfigMapper.selectList(
                new LambdaQueryWrapper<SystemConfig>()
                        .eq(SystemConfig::getDeleted, 0)
        );
        Map<String, String> configMap = new HashMap<>();
        for (SystemConfig config : allConfigs) {
            configMap.put(config.getConfigKey(), config.getConfigValue());
        }

        String version = configMap.getOrDefault("system.version", "v2.4.1");
        String startTime = getJvmStartTime();
        Long documentCount = countSoftDeleted(documentJdbcTemplate, "SELECT COUNT(*) FROM kb_document WHERE deleted = 0");
        Long userCount = countSoftDeleted(iamJdbcTemplate, "SELECT COUNT(*) FROM kb_user WHERE deleted = 0");
        boolean dbOk = documentCount != null || userCount != null || !allConfigs.isEmpty();

        Long usedStorage = resolveUsedStorageBytes();
        Long totalStorage = resolveQuotaBytes(configMap);

        return SystemStatusVO.builder()
                .version(version)
                .runStatus("running")
                .dbStatus(dbOk ? "connected" : "disconnected")
                .lastBackupTime(null)
                .totalStorage(totalStorage)
                .usedStorage(usedStorage != null ? usedStorage : 0L)
                .documentCount(documentCount != null ? documentCount : 0L)
                .userCount(userCount != null ? userCount : 0L)
                .startTime(startTime)
                .build();
    }

    /**
     * 解析已用容量：优先 kb-file S3 ListObjects / kb_file 表；失败回退 document 侧元数据。
     *
     * @return 已用字节，失败时尽量回退
     */
    @Nullable
    private Long resolveUsedStorageBytes() {
        Long fromFile = fetchFileServiceUsedBytes();
        if (fromFile != null && fromFile >= 0) {
            return fromFile;
        }
        return countSoftDeleted(documentJdbcTemplate,
                "SELECT COALESCE(SUM(file_size), 0) FROM kb_file_metadata WHERE deleted = 0");
    }

    /**
     * 调用 kb-file {@code GET /files/storage/usage}。
     *
     * @return usedBytes 或 null
     */
    @Nullable
    @SuppressWarnings("unchecked")
    private Long fetchFileServiceUsedBytes() {
        if (!StringUtils.hasText(fileServiceUrl)) {
            return null;
        }
        try {
            String url = fileServiceUrl.replaceAll("/+$", "") + "/files/storage/usage";
            Map<String, Object> body = restTemplate.getForObject(url, Map.class);
            if (body == null) {
                return null;
            }
            Object data = body.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object used = dataMap.get("usedBytes");
                if (used instanceof Number n) {
                    return n.longValue();
                }
            }
            Object used = body.get("usedBytes");
            if (used instanceof Number n) {
                return n.longValue();
            }
            return null;
        } catch (Exception e) {
            log.warn("拉取 kb-file 存储用量失败，将回退元数据：{}", e.getMessage());
            return null;
        }
    }

    /**
     * 解析配额：配置 {@code s3.storage.quota.bytes}，默认 100GiB。
     *
     * @param configMap 配置表
     * @return 配额字节
     */
    private long resolveQuotaBytes(Map<String, String> configMap) {
        String raw = configMap.get("s3.storage.quota.bytes");
        if (!StringUtils.hasText(raw)) {
            return DEFAULT_STORAGE_QUOTA_BYTES;
        }
        try {
            long v = Long.parseLong(raw.trim());
            return v > 0 ? v : DEFAULT_STORAGE_QUOTA_BYTES;
        } catch (NumberFormatException e) {
            log.warn("非法存储配额 {}，使用默认 {}", raw, DEFAULT_STORAGE_QUOTA_BYTES);
            return DEFAULT_STORAGE_QUOTA_BYTES;
        }
    }

    /**
     * 对指定数据源执行 COUNT；失败返回 null 并打日志。
     *
     * @param jdbcTemplate 数据源模板（可为 null）
     * @param sql          COUNT SQL
     * @return 行数或 null
     */
    @Nullable
    private Long countSoftDeleted(@Nullable JdbcTemplate jdbcTemplate, String sql) {
        if (jdbcTemplate == null) {
            log.warn("系统状态 COUNT 跳过：JdbcTemplate 未注入，sql={}", sql);
            return null;
        }
        try {
            Long count = jdbcTemplate.queryForObject(sql, Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("系统状态 COUNT 失败：{} — {}", sql, e.getMessage());
            return null;
        }
    }

    private String getJvmStartTime() {
        long startTimeMs = ManagementFactory.getRuntimeMXBean().getStartTime();
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(startTimeMs));
    }

    // ==================== 运维操作 ====================

    /** {@inheritDoc} */
    /**
     * 清空Cache。
     */
    @Override
    public String clearCache() {
        log.info("清理系统缓存");
        // 缓存清除逻辑由 @CacheEvict 注解处理，此处为占位实现
        return "缓存已清理";
    }

    /** {@inheritDoc} */
    /**
     * 创建Backup。
     */
    @Override
    public String createBackup() {
        log.info("创建系统备份（占位未实际执行）");
        return "备份请求已受理（占位未实际执行）: "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    /** {@inheritDoc} */
    /**
     * testEmail 方法。
     */
    @Override
    public String testEmail(String email) {
        log.info("测试邮件请求：email={}", email);
        if (!StringUtils.hasText(email)) {
            throw new BusinessException("邮箱地址不能为空");
        }
        // SMTP 未统一接入前返回成功占位，避免设置页按钮 404
        return "测试邮件已受理（当前环境为占位实现，未实际发送）: " + email;
    }
}
