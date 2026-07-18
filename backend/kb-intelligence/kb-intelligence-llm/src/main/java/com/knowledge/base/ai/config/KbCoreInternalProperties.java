package com.knowledge.base.ai.config;

import com.knowledge.base.common.utils.InternalServiceHmacUtil;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

/**
 * Intelligence → kb-core 内部调用 HMAC 配置
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "kb-core.internal")
public class KbCoreInternalProperties {

    /** 调用方服务名（写入 X-Internal-Service） */
    private String service = "kb-intelligence";

    /** HMAC 共享密钥，须与 kb-core.internal.secret 一致 */
    private String secret = "";

    /** 系统用户 ID（可选透传，核心以 Core 配置为准） */
    private Long systemUserId = 1000000000000000001L;

    /**
     * 启用内部调用时校验密钥长度
     */
    @PostConstruct
    public void validateSecret() {
        if (!StringUtils.hasText(secret)
                || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "kb-core.internal.secret 必须由环境/Nacos 注入，且 UTF-8 长度不少于 32 字节");
        }
    }

    /**
     * 为指定方法与路径生成当前时间戳的 HMAC 签名
     *
     * @param method HTTP 方法
     * @param path   请求路径（不含 query）
     * @return 时间戳与签名对
     */
    public SignedHeaders sign(String method, String path) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String signature = InternalServiceHmacUtil.sign(secret, method, path, timestamp, service);
        return new SignedHeaders(service, timestamp, signature, systemUserId);
    }

    /**
     * 已签名的内部请求头值
     *
     * @param service     服务名
     * @param timestamp   Unix 秒
     * @param signature   HMAC hex
     * @param systemUserId 系统用户 ID
     */
    public record SignedHeaders(String service, String timestamp, String signature, Long systemUserId) {
    }
}
