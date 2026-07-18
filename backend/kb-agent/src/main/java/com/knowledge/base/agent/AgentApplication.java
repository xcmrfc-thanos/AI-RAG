package com.knowledge.base.agent;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * kb-agent 启动类（独立进程，不并入 Intelligence JVM）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@SpringBootApplication(scanBasePackages = "com.knowledge.base")
@EnableDiscoveryClient
@EnableScheduling
@MapperScan({
        "com.knowledge.base.agent.run.mapper",
        "com.knowledge.base.agent.workflow.mapper"
})
public class AgentApplication {

    /**
     * 启动 Agent 服务
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
        System.out.println("""

            ========================================
              kb-agent 启动成功
              端口：8092
              API：http://127.0.0.1:8080/api/agent/
            ========================================
            """);
    }
}
