package com.knowledge.base.userauth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * kb-user-auth 启动类（已废弃，由 kb-core 替代）。
 */
@Deprecated(since = "2026-07-10", forRemoval = true)
@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {"com.knowledge.base.userauth", "com.knowledge.base.common"})
public class UserAuthApplication {

    /**
     * 应用入口。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(UserAuthApplication.class, args);
        System.out.println("========================================");
        System.out.println("用户权限服务启动成功！");
        System.out.println("Swagger文档地址: http://localhost:8081/api/auth/doc.html");
        System.out.println("========================================");
    }
}
