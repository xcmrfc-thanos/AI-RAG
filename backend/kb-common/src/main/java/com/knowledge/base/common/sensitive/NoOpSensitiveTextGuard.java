package com.knowledge.base.common.sensitive;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * 无敏感词引擎时的空实现（单测或未装配 platform 时兜底）。
 */
@Component
@ConditionalOnMissingBean(SensitiveTextGuard.class)
public class NoOpSensitiveTextGuard implements SensitiveTextGuard {

    /**
     * 放行任意文本。
     */
    @Override
    public void assertAllowed(String text, String scene) {
        // no-op
    }

    /**
     * 原样返回。
     */
    @Override
    public SensitiveCheckView checkAndSanitize(String text, String scene) {
        return SensitiveCheckView.pass(text);
    }
}
