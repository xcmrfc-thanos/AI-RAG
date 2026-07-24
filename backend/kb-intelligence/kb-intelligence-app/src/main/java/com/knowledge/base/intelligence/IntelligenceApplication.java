package com.knowledge.base.intelligence;

import com.knowledge.base.common.config.AsyncTaskConfig;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;

/**
 * Intelligence BC 启动类（运行时唯一进程 :8091）
 *
 * <p>承载 LLM/RAG、检索与图谱子模块；历史上来自 kb-ai + kb-search + kb-graph 合并。
 * MySQL 单库 {@code kb_intelligence}。包名 {@code ai/search/graph} 为遗留路径，不等于三进程部署。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@SpringBootApplication
@EnableRabbit
@EnableFeignClients(basePackages = "com.knowledge.base.ai.client")
@ComponentScan(basePackages = {
        "com.knowledge.base.intelligence",
        "com.knowledge.base.graph",
        "com.knowledge.base.search",
        "com.knowledge.base.ai",
        "com.knowledge.base.common"
}, excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = AsyncTaskConfig.class
))
/**
 * IntelligenceApplication：服务启动入口。
 */
@EnableNeo4jRepositories(basePackages = "com.knowledge.base.graph.repository")
public class IntelligenceApplication {

    /**
     * 应用入口
     */
    public static void main(String[] args) {
        SpringApplication.run(IntelligenceApplication.class, args);
    }
}
