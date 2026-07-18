package com.knowledge.base.ai;

import com.knowledge.base.common.support.LegacyIntelligenceServiceNotifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
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
     * 启动时打印废弃警告。
     */
    @Bean
    ApplicationRunner legacyIntelligenceDeprecationNotice() {
        return LegacyIntelligenceServiceNotifier.onStartup("kb-ai", "kb-intelligence");
    }

    public static void main(String[] args) {
        SpringApplication.run(AiApplication.class, args);
    }
}
