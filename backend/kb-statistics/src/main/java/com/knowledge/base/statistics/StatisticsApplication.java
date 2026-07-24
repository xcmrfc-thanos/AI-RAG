package com.knowledge.base.statistics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * StatisticsApplication：服务启动入口。
 */
@SpringBootApplication
@ComponentScan(basePackages = {"com.knowledge.base.statistics", "com.knowledge.base.common"})
@EnableScheduling
public class StatisticsApplication {

    /**
     * 应用入口。
     */
    public static void main(String[] args) {
        SpringApplication.run(StatisticsApplication.class, args);
    }
}