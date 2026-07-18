package com.knowledge.base.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 网关鉴权配置（白名单唯一准源）
 *
 * <p>由 Nacos / 本地属性注入 {@code gateway.white-list}，
 * {@link com.knowledge.base.gateway.filter.AuthGlobalFilter} 仅消费本配置，不再硬编码路径。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "gateway")
public class GatewayAuthProperties {

    /**
     * 公开路径白名单（Ant 风格，如 /api/auth/auth/login、/api/document/share/**）
     */
    private List<String> whiteList = new ArrayList<>();
}
