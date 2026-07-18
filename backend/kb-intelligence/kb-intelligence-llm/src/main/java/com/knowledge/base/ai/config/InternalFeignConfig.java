package com.knowledge.base.ai.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.context.annotation.Bean;

/**
 * 内部服务 Feign 调用配置
 *
 * <p>为 Intelligence → kb-core 的内部调用附加 HMAC 签名头，
 * 由 {@code InternalServiceAuthFilter} 校验。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
public class InternalFeignConfig {

    /**
     * 为 Feign 请求附加内部服务 HMAC 鉴权头
     *
     * @param internalProperties 内部调用密钥与服务名
     * @return 请求拦截器
     */
    @Bean
    public RequestInterceptor internalAuthInterceptor(KbCoreInternalProperties internalProperties) {
        return (RequestTemplate template) -> {
            String path = template.path();
            // Feign path 可能含 query；签名只用 path 部分
            int q = path.indexOf('?');
            if (q >= 0) {
                path = path.substring(0, q);
            }
            KbCoreInternalProperties.SignedHeaders signed =
                    internalProperties.sign(template.method(), path);
            template.header("X-Internal-Service", signed.service());
            template.header("X-Internal-Timestamp", signed.timestamp());
            template.header("X-Internal-Signature", signed.signature());
            template.header("X-User-Id", String.valueOf(signed.systemUserId()));
        };
    }
}
