package com.knowledge.base.common.sensitive;

/**
 * 敏感词门面：业务入口统一拦截 / 清洗。
 *
 * <p>由 kb-core-platform 提供实现；其它模块仅依赖本接口。</p>
 */
public interface SensitiveTextGuard {

    /**
     * 检测文本；若命中 block 策略则抛业务异常。
     *
     * @param text  待检文本
     * @param scene 场景标识（日志用），如 comment / document.publish / ai.chat
     */
    void assertAllowed(String text, String scene);

    /**
     * 检测并返回视图；block 时抛异常，否则返回（可含 replace 后文本）。
     *
     * @param text  待检文本
     * @param scene 场景标识
     * @return 检测视图
     */
    SensitiveCheckView checkAndSanitize(String text, String scene);
}
