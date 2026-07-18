package com.knowledge.base.core.controller;

import com.knowledge.base.common.result.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Core BC 健康检查
 */
@RestController
public class HealthController {

    /**
     * 健康检查
     */
    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.success("kb-core pong");
    }

    /**
     * 返回已挂载子模块列表
     */
    @GetMapping("/modules")
    public Result<List<String>> modules() {
        return Result.success(List.of(
                "kb-core-iam",
                "kb-core-platform",
                "kb-core-document"
        ));
    }
}
