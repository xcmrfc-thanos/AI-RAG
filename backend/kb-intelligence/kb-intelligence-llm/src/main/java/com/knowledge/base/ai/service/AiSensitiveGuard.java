package com.knowledge.base.ai.service;

import com.knowledge.base.ai.client.SensitiveFeignClient;
import com.knowledge.base.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Intelligence 侧敏感词守卫：经 Feign 调 kb-core 内部检测接口。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSensitiveGuard {

    private final SensitiveFeignClient sensitiveFeignClient;

    /**
     * 用户输入拦截：命中 block 则抛业务异常。
     *
     * @param text  待检文本
     * @param scene 场景
     */
    public void assertUserInputAllowed(String text, String scene) {
        if (!StringUtils.hasText(text)) {
            return;
        }
        try {
            Map<String, Object> data = invokeCheck(text, scene);
            if (data == null) {
                return;
            }
            if (isTruthy(data.get("blocked"))) {
                String hits = formatHits(data.get("hitWords"));
                throw new BusinessException("内容包含敏感词，请修改后重试" + (hits.isEmpty() ? "" : "：" + hits));
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // 检测服务不可用时不阻断主流程，仅告警（避免 Core 短暂故障拖垮全部 AI）
            log.warn("敏感词检测调用失败，已放行 scene={} err={}", scene, e.getMessage());
        }
    }

    /**
     * 判断关键词是否不宜写入搜索历史 / 热搜展示。
     *
     * <p>命中任意敏感策略（block / privacy / replace / audit）则跳过；
     * 检测服务不可用时返回 false（不阻断检索，仅可能漏过滤）。</p>
     *
     * @param text 搜索关键词
     * @return true 表示应跳过持久化或从热搜中剔除
     */
    public boolean shouldSkipSearchHistory(String text) {
        if (!StringUtils.hasText(text)) {
            return false;
        }
        try {
            Map<String, Object> data = invokeCheck(text, "search-history");
            if (data == null) {
                return false;
            }
            // 任意命中均不记历史，避免敏感词进入热搜再曝光
            return isTruthy(data.get("blocked")) || isTruthy(data.get("hit"));
        } catch (Exception e) {
            log.warn("搜索历史敏感词检测失败，已放行写入 keyword 截断 err={}", e.getMessage());
            return false;
        }
    }

    /**
     * 调用 Core 内部敏感词检测并取出 data。
     *
     * @param text  待检文本
     * @param scene 场景
     * @return data Map，失败或空响应时为 null
     */
    private Map<String, Object> invokeCheck(String text, String scene) {
        Map<String, Object> resp = sensitiveFeignClient.check(Map.of(
                "text", text,
                "scene", scene == null ? "ai" : scene
        ));
        return extractData(resp);
    }

    /**
     * 判断 JSON 布尔或字符串 true。
     *
     * @param value 原始值
     * @return 是否为真
     */
    private boolean isTruthy(Object value) {
        return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    /**
     * 从 Result Map 取出 data。
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> resp) {
        if (resp == null) {
            return null;
        }
        Object data = resp.get("data");
        if (data instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    /**
     * 格式化命中词列表。
     */
    @SuppressWarnings("unchecked")
    private String formatHits(Object hitWords) {
        if (!(hitWords instanceof List<?> list) || list.isEmpty()) {
            return "";
        }
        List<String> words = new ArrayList<>();
        for (Object o : list) {
            if (o != null && StringUtils.hasText(o.toString())) {
                words.add(o.toString());
            }
            if (words.size() >= 8) {
                break;
            }
        }
        return String.join("、", words);
    }
}
