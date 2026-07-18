package com.knowledge.base.search;

import com.knowledge.base.common.support.LegacyIntelligenceServiceNotifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;

/**
 * 搜索服务启动类（已废弃，由 kb-intelligence 替代）。
 *
 * @author 苏三
 * @since 2026-04-24
 */
@Deprecated(since = "2026-07-10", forRemoval = true)
@EnableFeignClients(basePackages = "com.knowledge.base.search.feign")
@SpringBootApplication(scanBasePackages = "com.knowledge.base")
public class SearchApplication {

    /**
     * 启动时打印废弃警告。
     */
    @Bean
    ApplicationRunner legacyIntelligenceDeprecationNotice() {
        return LegacyIntelligenceServiceNotifier.onStartup("kb-search", "kb-intelligence");
    }

    public static void main(String[] args) {
        SpringApplication.run(SearchApplication.class, args);
    }
}
