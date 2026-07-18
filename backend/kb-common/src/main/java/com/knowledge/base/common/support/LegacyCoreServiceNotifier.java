package com.knowledge.base.common.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;

/**
 * 旧 Core 微服务（kb-user-auth / kb-document / kb-foundation）启动废弃提示。
 */
public final class LegacyCoreServiceNotifier {

    private static final Logger log = LoggerFactory.getLogger(LegacyCoreServiceNotifier.class);

    private static final String CUTOVER_DOC = "backend/kb-gateway/GATEWAY_CORE_CUTOVER.md";

    private LegacyCoreServiceNotifier() {
    }

    /**
     * 创建启动时打印废弃警告的 ApplicationRunner。
     *
     * @param legacyServiceName 旧服务名（如 kb-user-auth）
     * @param replacement       替代服务名（如 kb-core）
     * @return 启动回调
     */
    public static ApplicationRunner onStartup(String legacyServiceName, String replacement) {
        return args -> log.warn(
                "[DEPRECATED] {} 已由 {} 替代，请勿新部署实例；网关切流见 {}，模块说明见各目录 DEPRECATED.md",
                legacyServiceName,
                replacement,
                CUTOVER_DOC);
    }
}
