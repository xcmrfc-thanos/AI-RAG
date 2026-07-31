package com.knowledge.base.mcp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * MCP Server 运行时配置（默认关闭）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "mcp")
public class McpProperties {

    /**
     * 服务开关与网关等核心项
     */
    private Server server = new Server();

    /**
     * 出站 Gateway 基址
     */
    private String gatewayBaseUrl = "http://127.0.0.1:18080";

    /**
     * 超时
     */
    private Timeouts timeouts = new Timeouts();

    /**
     * 限流
     */
    private RateLimit rateLimit = new RateLimit();

    /**
     * 服务开关
     */
    @Data
    public static class Server {
        /**
         * 是否启用 MCP 业务入口；默认 false
         */
        private boolean enabled = false;
    }

    /**
     * 工具超时
     */
    @Data
    public static class Timeouts {
        /**
         * 工具调用超时（秒）
         */
        private int toolSeconds = 5;
    }

    /**
     * 限流
     */
    @Data
    public static class RateLimit {
        /**
         * 每用户近似 QPS
         */
        private int perUserQps = 5;
    }
}
