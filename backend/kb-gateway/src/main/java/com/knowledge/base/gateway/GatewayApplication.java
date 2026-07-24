package com.knowledge.base.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

import com.knowledge.base.common.config.CorsConfig;

/**
 * GatewayApplication：服务启动入口。
 */
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
@ComponentScan(basePackages = {"com.knowledge.base.gateway", "com.knowledge.base.common"}, excludeFilters = {
    @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = CorsConfig.class)
})
public class GatewayApplication {

    /**
     * 应用入口。
     */
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
        System.out.println("========================================");
        System.out.println("API网关服务启动成功！");
        System.out.println("网关地址: http://localhost:18080");
        System.out.println("========================================");
    }
}