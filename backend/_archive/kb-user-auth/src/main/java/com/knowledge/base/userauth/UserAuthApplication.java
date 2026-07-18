package com.knowledge.base.userauth;

import com.knowledge.base.common.support.LegacyCoreServiceNotifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {"com.knowledge.base.userauth", "com.knowledge.base.common"})
public class UserAuthApplication {

    /**
     * 应用入口
     */
    public static void main(String[] args) {
        SpringApplication.run(UserAuthApplication.class, args);
        System.out.println("========================================");
        System.out.println("用户权限服务启动成功！");
        System.out.println("Swagger文档地址: http://localhost:8081/api/auth/doc.html");
        System.out.println("========================================");
    }

    /**
     * 启动时打印废弃警告（P2-7）
     */
    @Bean
    ApplicationRunner legacyCoreDeprecationWarning() {
        return LegacyCoreServiceNotifier.onStartup("kb-user-auth", "kb-core");
    }
}