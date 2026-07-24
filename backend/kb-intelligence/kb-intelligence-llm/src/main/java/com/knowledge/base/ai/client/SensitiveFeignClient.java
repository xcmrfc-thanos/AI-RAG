package com.knowledge.base.ai.client;

import com.knowledge.base.ai.config.InternalFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

/**
 * kb-core 敏感词内部检测 Feign 客户端。
 */
@FeignClient(name = "kb-core", contextId = "sensitiveFeignClient", url = "${kb-core.url:#{null}}",
        configuration = InternalFeignConfig.class)
public interface SensitiveFeignClient {

    /**
     * 调用 Core 内部敏感词检测。
     *
     * @param body 含 text / scene
     * @return 统一 Result Map（含 data.blocked 等）
     */
    @PostMapping("/internal/sensitive/check")
    Map<String, Object> check(@RequestBody Map<String, String> body);
}
