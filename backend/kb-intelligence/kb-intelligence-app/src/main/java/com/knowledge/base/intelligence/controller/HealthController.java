package com.knowledge.base.intelligence.controller;

import com.knowledge.base.common.result.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Intelligence BC 健康检查
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@RestController
public class HealthController {

    /**
     * 健康检查
     */
    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.success("kb-intelligence pong");
    }
}
