package com.knowledge.base.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;

/**
 * kb-ai 启动类（已废弃，由 kb-intelligence 替代）。
 */
@Deprecated(since = "2026-07-10", forRemoval = true)
@SpringBootApplication
@ComponentScan(basePackages = {"com.knowledge.base.ai", "com.knowledge.base.common"})
@EnableFeignClients(basePackages = "com.knowledge.base.ai.client")
public class AiApplication {

    /**
     * 应用入口。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(AiApplication.class, args);
    }
}
