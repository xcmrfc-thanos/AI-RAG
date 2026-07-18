package com.knowledge.base.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Core BC 启动类
 *
 * <p>合并 kb-user-auth + kb-document + kb-foundation；P2-4 已迁入 Document。</p>
 */
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
@EnableAsync
@EnableCaching
@EnableScheduling
@EnableTransactionManagement
@EnableFeignClients(basePackages = "com.knowledge.base.document.feign")
@ComponentScan(basePackages = {
        "com.knowledge.base.core",
        "com.knowledge.base.foundation",
        "com.knowledge.base.userauth",
        "com.knowledge.base.document",
        "com.knowledge.base.common"
})
public class CoreApplication {

    /**
     * 应用入口
     */
    public static void main(String[] args) {
        SpringApplication.run(CoreApplication.class, args);
    }
}
