package com.knowledge.base.graph;

import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;

/**
 * kb-graph 启动类（已废弃，由 kb-intelligence 替代）。
 */
@Deprecated(since = "2026-07-10", forRemoval = true)
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
@EnableRabbit
@ComponentScan(basePackages = {"com.knowledge.base.graph", "com.knowledge.base.common"})
@EnableNeo4jRepositories(basePackages = "com.knowledge.base.graph.repository")
public class GraphApplication {

    /**
     * 应用入口。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(GraphApplication.class, args);
    }
}
