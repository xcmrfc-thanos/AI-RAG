package com.knowledge.base.foundation.controller;

import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.sensitive.SensitiveCheckView;
import com.knowledge.base.foundation.dto.SensitiveCheckResult;
import com.knowledge.base.foundation.service.SensitiveWordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.Data;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 内部敏感词检测接口（供 Intelligence 等服务 HMAC 调用）。
 *
 * <p>命中 block 时仍返回 200 + {@code blocked=true}，由调用方决定是否拒绝。</p>
 */
@RestController
@RequestMapping("/internal/sensitive")
@Tag(name = "内部-敏感词", description = "跨服务敏感词检测")
public class InternalSensitiveController {

    @Resource
    private SensitiveWordService sensitiveWordService;

    @Resource
    private SystemConfigCache systemConfigCache;

    /**
     * 内部检测。
     *
     * @param req 请求体
     * @return 检测视图
     */
    @PostMapping("/check")
    @Operation(summary = "内部敏感词检测")
    public Result<SensitiveCheckView> check(@RequestBody CheckRequest req) {
        String text = req == null ? null : req.getText();
        String enabled = systemConfigCache.getConfig("sensitive.filter.enabled", "true");
        if ("false".equalsIgnoreCase(enabled) || "0".equals(enabled)) {
            return Result.success(SensitiveCheckView.pass(text));
        }
        SensitiveCheckResult result = sensitiveWordService.check(text);
        SensitiveCheckView view = new SensitiveCheckView();
        view.setBlocked(result.isBlocked());
        view.setHit(result.isHit());
        view.setFilteredText(result.getFilteredText());
        List<String> words = result.getHits() == null ? List.of() : result.getHits().stream()
                .map(SensitiveCheckResult.HitItem::getWord)
                .filter(StringUtils::hasText)
                .distinct()
                .limit(8)
                .collect(Collectors.toList());
        view.setHitWords(words);
        return Result.success(view);
    }

    /**
     * 内部检测请求体。
     */
    @Data
    public static class CheckRequest {
        /** 待检文本 */
        private String text;
        /** 场景标识（可选） */
        private String scene;
    }
}
