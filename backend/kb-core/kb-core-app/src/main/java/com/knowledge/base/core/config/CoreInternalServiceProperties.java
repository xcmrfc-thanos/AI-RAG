package com.knowledge.base.core.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * kb-core 内部微服务调用鉴权配置（Intelligence → Core HMAC）
 *
 * @author 苏三
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "kb-core.internal")
public class CoreInternalServiceProperties {

    /** 最小密钥字节长度 */
    public static final int MIN_SECRET_BYTES = 32;

    /** 是否启用内部服务 HMAC 鉴权 */
    private boolean enabled = true;

    /** 服务名请求头 */
    private String headerName = "X-Internal-Service";

    /** 允许的调用方服务名 */
    private String headerValue = "kb-intelligence";

    /** 时间戳请求头 */
    private String timestampHeader = "X-Internal-Timestamp";

    /** 签名请求头 */
    private String signatureHeader = "X-Internal-Signature";

    /** HMAC 共享密钥（环境/Nacos 注入，UTF-8 长度不少于 32 字节） */
    private String secret = "";

    /**
     * 轮换窗口内保留的旧密钥（可选；非空时 Core 同时接受新旧签名）
     *
     * <p>对应环境变量 {@code KB_INTERNAL_HMAC_SECRET_PREVIOUS}。</p>
     */
    private String previousSecret = "";

    /** 允许的时钟偏差（秒） */
    private long maxClockSkewSeconds = 60;

    /** 内部调用使用的系统用户 ID（需存在于 kb_user） */
    private Long systemUserId = 1000000000000000001L;

    /**
     * 允许以系统身份访问的路径 Ant 模式（仅 Intelligence 实际文档读取路径）
     */
    private List<String> allowedPaths = new ArrayList<>(List.of(
            "/documents/page",
            "/documents/*",
            "/internal/users/*/team-ids",
            "/internal/documents/visible-ids"
    ));

    /**
     * 启用时校验密钥长度，避免空密钥上线
     */
    @PostConstruct
    public void validateSecret() {
        if (!enabled) {
            return;
        }
        if (!StringUtils.hasText(secret)
                || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "kb-core.internal.secret 必须由环境/Nacos 注入，且 UTF-8 长度不少于 "
                            + MIN_SECRET_BYTES + " 字节");
        }
    }
}
