package com.knowledge.base.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 默认加密密钥提供器。
 *
 * <p>读取顺序：</p>
 * <ol>
 *   <li>配置项 {@code kb.security.encrypt-key}（Nacos 配置中心 / 本地 yml）；</li>
 *   <li>环境变量 {@code KB_SECURITY_ENCRYPT_KEY}。</li>
 * </ol>
 *
 * <p>两者均未配置时返回 {@code null}，模型库写接口应拒绝落库并告警，
 * 业务读侧回退旧 Nacos 配置，保证服务不崩溃。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Slf4j
@Component
public class NacosEncryptKeyProvider implements EncryptKeyProvider {

    /** 环境变量兜底名 */
    public static final String ENV_KEY = "KB_SECURITY_ENCRYPT_KEY";

    @Value("${kb.security.encrypt-key:}")
    private String encryptKey;

    @Override
    public String resolveEncryptKey() {
        if (encryptKey != null && !encryptKey.isBlank()) {
            return encryptKey;
        }
        String envKey = System.getenv(ENV_KEY);
        if (envKey != null && !envKey.isBlank()) {
            log.info("kb.security.encrypt-key 未配置，使用环境变量 {} 兜底", ENV_KEY);
            return envKey;
        }
        log.warn("未配置模型凭证加密密钥（kb.security.encrypt-key / {}），模型库写接口将拒写", ENV_KEY);
        return null;
    }
}
