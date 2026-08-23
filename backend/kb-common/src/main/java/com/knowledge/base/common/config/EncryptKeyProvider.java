package com.knowledge.base.common.config;

/**
 * 模型凭证加密密钥提供器。
 *
 * <p>模型库（kb_model_provider.api_key）落库前经 AES-GCM 加密，
 * 加密密钥由此接口解析。默认实现 {@link NacosEncryptKeyProvider}
 * 读取配置项 {@code kb.security.encrypt-key}（Nacos / 环境变量
 * {@code KB_SECURITY_ENCRYPT_KEY} 兜底）。</p>
 *
 * <p>预留扩展实现（无需改动业务代码）：</p>
 * <ul>
 *   <li>{@code EnvEncryptKeyProvider}：仅从环境变量读取；</li>
 *   <li>{@code KmsEncryptKeyProvider}：对接外部 KMS / Vault。</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.1.0
 */
public interface EncryptKeyProvider {

    /**
     * 解析加密密钥。
     *
     * @return 密钥字符串（任意长度，{@link ModelCrypto} 统一派生 32 字节）；
     *         未配置时返回 {@code null}，调用方应拒写并告警，不得降级为弱密钥
     */
    String resolveEncryptKey();
}
