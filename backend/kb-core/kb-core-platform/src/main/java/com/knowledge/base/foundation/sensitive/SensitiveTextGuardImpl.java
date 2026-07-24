package com.knowledge.base.foundation.sensitive;

import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.sensitive.SensitiveCheckView;
import com.knowledge.base.common.sensitive.SensitiveTextGuard;
import com.knowledge.base.foundation.dto.SensitiveCheckResult;
import com.knowledge.base.foundation.service.SensitiveWordService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 敏感词门面实现：读配置开关 + 调用内存 AC/正则引擎。
 */
@Slf4j
@Service
@Primary
public class SensitiveTextGuardImpl implements SensitiveTextGuard {

    private static final String CFG_ENABLED = "sensitive.filter.enabled";

    @Resource
    private SensitiveWordService sensitiveWordService;

    @Resource
    private SystemConfigCache systemConfigCache;

    /**
     * 若开关关闭则跳过；命中 block 则抛业务异常。
     */
    @Override
    public void assertAllowed(String text, String scene) {
        checkAndSanitize(text, scene);
    }

    /**
     * 检测并返回可写入的清洗文本。
     */
    @Override
    public SensitiveCheckView checkAndSanitize(String text, String scene) {
        if (!isFilterEnabled()) {
            return SensitiveCheckView.pass(text);
        }
        if (!StringUtils.hasText(text)) {
            return SensitiveCheckView.pass(text);
        }
        SensitiveCheckResult result = sensitiveWordService.check(text);
        SensitiveCheckView view = toView(result, text);
        if (view.isBlocked()) {
            String hits = view.getHitWords().isEmpty() ? "敏感内容" : String.join("、", view.getHitWords());
            log.warn("敏感词拦截 scene={} hits={}", scene, hits);
            throw new BusinessException("内容包含敏感词，请修改后重试：" + hits);
        }
        if (view.isHit()) {
            log.info("敏感词命中(非拦截) scene={} hits={}", scene, view.getHitWords());
        }
        return view;
    }

    /**
     * 是否启用过滤（默认 true）。
     */
    private boolean isFilterEnabled() {
        String v = systemConfigCache.getConfig(CFG_ENABLED, "true");
        return !"false".equalsIgnoreCase(v) && !"0".equals(v);
    }

    /**
     * 引擎结果转跨模块视图。
     */
    private SensitiveCheckView toView(SensitiveCheckResult result, String raw) {
        SensitiveCheckView view = new SensitiveCheckView();
        if (result == null) {
            return SensitiveCheckView.pass(raw);
        }
        view.setBlocked(result.isBlocked());
        view.setHit(result.isHit());
        view.setFilteredText(result.getFilteredText() != null ? result.getFilteredText() : raw);
        List<String> words = result.getHits() == null ? List.of() : result.getHits().stream()
                .map(SensitiveCheckResult.HitItem::getWord)
                .filter(StringUtils::hasText)
                .distinct()
                .limit(8)
                .collect(Collectors.toList());
        view.setHitWords(words);
        return view;
    }
}
