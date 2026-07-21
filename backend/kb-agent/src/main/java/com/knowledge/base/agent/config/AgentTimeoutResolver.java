package com.knowledge.base.agent.config;

import com.knowledge.base.common.config.SystemConfigCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Agent 超时秒数解析：优先 Redis {@link SystemConfigCache}，否则回退 {@link AgentProperties}。
 *
 * <p>无 Redis / 无缓存 Bean / 非法数字时安全回退，避免 kb-agent 启动失败。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class AgentTimeoutResolver {

    /** 与 Settings AGENT 分组落库键一致 */
    public static final String KEY_RUN_SECONDS = "agent.timeouts.run-seconds";
    /** LLM 调用超时键 */
    public static final String KEY_LLM_SECONDS = "agent.timeouts.llm-seconds";
    /** 工具 HTTP 超时键 */
    public static final String KEY_TOOL_SECONDS = "agent.timeouts.tool-seconds";

    private final AgentProperties agentProperties;
    @Nullable
    private final SystemConfigCache systemConfigCache;

    /**
     * 构造超时解析器（Spring 注入；缓存可选）。
     *
     * @param agentProperties   yml/Nacos 绑定的兜底配置
     * @param systemConfigCache 可选 Redis 配置缓存
     */
    @Autowired
    public AgentTimeoutResolver(AgentProperties agentProperties,
                                @Autowired(required = false) SystemConfigCache systemConfigCache) {
        this.agentProperties = agentProperties;
        this.systemConfigCache = systemConfigCache;
    }

    /**
     * 单测构造：显式指定缓存（可为 null）。
     *
     * @param agentProperties   兜底配置
     * @param systemConfigCache 缓存或 null
     * @return 解析器
     */
    public static AgentTimeoutResolver forTest(AgentProperties agentProperties,
                                               @Nullable SystemConfigCache systemConfigCache) {
        return new AgentTimeoutResolver(agentProperties, systemConfigCache);
    }

    /**
     * 解析单次 Run 总超时（秒），至少为 1。
     *
     * @return Run 超时秒数
     */
    public int resolveRunSeconds() {
        return resolvePositiveInt(KEY_RUN_SECONDS, agentProperties.getTimeouts().getRunSeconds());
    }

    /**
     * 解析 LLM 调用超时（秒），至少为 1。
     *
     * @return LLM 超时秒数
     */
    public int resolveLlmSeconds() {
        return resolvePositiveInt(KEY_LLM_SECONDS, agentProperties.getTimeouts().getLlmSeconds());
    }

    /**
     * 解析工具 HTTP 超时（秒），至少为 1。
     *
     * @return 工具超时秒数
     */
    public int resolveToolSeconds() {
        return resolvePositiveInt(KEY_TOOL_SECONDS, agentProperties.getTimeouts().getToolSeconds());
    }

    /**
     * 从缓存读取正整数配置；失败或非法时回退 fallback（并 clamp 到 ≥1）。
     *
     * @param configKey 配置键
     * @param fallback  属性默认值
     * @return 有效秒数
     */
    int resolvePositiveInt(String configKey, int fallback) {
        int safeFallback = Math.max(1, fallback);
        if (systemConfigCache == null) {
            return safeFallback;
        }
        try {
            String raw = systemConfigCache.getConfig(configKey);
            if (raw == null || raw.isBlank()) {
                return safeFallback;
            }
            int value = Integer.parseInt(raw.trim());
            if (value <= 0) {
                log.warn("配置 {}={} 非法，回退 {}", configKey, raw, safeFallback);
                return safeFallback;
            }
            return value;
        } catch (NumberFormatException e) {
            log.warn("配置 {} 非数字，回退 {}: {}", configKey, safeFallback, e.getMessage());
            return safeFallback;
        } catch (Exception e) {
            log.warn("读取配置 {} 失败，回退 {}: {}", configKey, safeFallback, e.getMessage());
            return safeFallback;
        }
    }
}
