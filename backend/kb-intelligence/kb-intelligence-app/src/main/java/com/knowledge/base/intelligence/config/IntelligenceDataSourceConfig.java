package com.knowledge.base.intelligence.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;

/**
 * Intelligence BC 数据源辅助配置
 *
 * <p>单库 {@code kb_intelligence}，由 Spring Boot 自动配置 DataSource。
 * 本类仅将 JDBC 事务管理器标记为 {@code @Primary}，避免 Neo4j 抢占 {@code @Transactional}。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration
@MapperScan(basePackages = {
        "com.knowledge.base.search.mapper",
        "com.knowledge.base.ai.mapper"
})
public class IntelligenceDataSourceConfig {

    /**
     * JDBC 主事务管理器
     */
    /**
     * transactionManager 方法。
     */
    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
