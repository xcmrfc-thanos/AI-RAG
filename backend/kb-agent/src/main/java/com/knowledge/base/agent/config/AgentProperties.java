package com.knowledge.base.agent.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Agent 运行时配置（默认模型、Gateway、超时）
 *
 * <p>系统设置 AGENT 分组写入同名配置键（如 {@code agent.default-model}、
 * {@code agent.timeouts.run-seconds}、{@code agent.tools.*.enabled}），
 * 供管理面落库；本服务当前以 yml/Nacos 绑定为准，后续可接 SystemConfigCache 热读。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "agent")
public class AgentProperties {

    /** 默认模型：qwen | deepseek */
    private String defaultModel = "qwen";

    /** 工具出站 Gateway 基址（禁止直连业务端口） */
    private String gatewayBaseUrl = "http://127.0.0.1:8080";

    /** Run/Step 保留天数 */
    private int runRetentionDays = 30;

    private Llm llm = new Llm();
    private Timeouts timeouts = new Timeouts();

    /**
     * LLM 提供商配置
     */
    @Data
    public static class Llm {
        private Provider qwen = new Provider();
        private Provider deepseek = new Provider();
    }

    /**
     * OpenAI-compatible 提供商
     */
    @Data
    public static class Provider {
        private String apiKey = "";
        private String baseUrl = "";
        private String model = "";
    }

    /**
     * 超时（秒）
     */
    @Data
    public static class Timeouts {
        private int runSeconds = 90;
        private int llmSeconds = 60;
        private int toolSeconds = 5;
    }
}
