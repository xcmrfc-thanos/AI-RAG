package com.knowledge.base.search;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * 搜索服务启动类（已废弃，由 kb-intelligence 替代）。
 */
@Deprecated(since = "2026-07-10", forRemoval = true)
@EnableFeignClients(basePackages = "com.knowledge.base.search.feign")
@SpringBootApplication(scanBasePackages = "com.knowledge.base")
public class SearchApplication {

    /**
     * 应用入口。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(SearchApplication.class, args);
    }
}
