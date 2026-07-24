package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.core.incrementer.IdentifierGenerator;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.BlockAttackInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.mapping.DatabaseIdProvider;
import org.apache.ibatis.mapping.VendorDatabaseIdProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

/**
 * MyBatis Plus 配置类。
 *
 * <p>分页方言由 {@code kb.db.type}（或 JDBC URL 推断）决定，默认 MySQL。
 * 一部署一方言；Core 多数据源须使用同一方言。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Configuration
public class MybatisPlusConfig {

    @Autowired
    private KbDbProperties kbDbProperties;

    /**
     * 可选：单数据源场景的 spring.datasource.url，用于推断方言。
     * Core 多数据源未绑定时可为空，此时依赖 kb.db.type 或默认 mysql。
     */
    @Value("${spring.datasource.url:}")
    private String springDatasourceUrl;

    /**
     * 配置 MyBatis Plus 拦截器（乐观锁 → 分页 → 防全表更新）。
     *
     * @return MybatisPlusInterceptor
     */
    /**
     * mybatisPlusInterceptor 方法。
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());

        DbType dbType = KbDbTypeResolver.resolve(kbDbProperties.getType(), springDatasourceUrl);
        log.info("MyBatis-Plus 分页方言：dbType={}, kb.db.type={}, datasourceUrlConfigured={}",
                dbType, kbDbProperties.getType(),
                springDatasourceUrl != null && !springDatasourceUrl.isBlank());
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(dbType));

        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());
        return interceptor;
    }

    /**
     * 自定义 ID 生成器（雪花算法）。
     *
     * @return IdentifierGenerator
     */
    /**
     * customIdGenerator 方法。
     */
    @Bean
    public IdentifierGenerator customIdGenerator() {
        return new IdentifierGenerator() {
            /**
             * nextId 方法。
             */
            @Override
            public Number nextId(Object entity) {
                return SnowflakeIdGenerator.getInstance().nextId();
            }
        };
    }

    /**
     * MyBatis databaseId：供 Mapper XML 按方言分支（如 upsert）。
     *
     * @return DatabaseIdProvider
     */
    /**
     * databaseIdProvider 方法。
     */
    @Bean
    public DatabaseIdProvider databaseIdProvider() {
        VendorDatabaseIdProvider provider = new VendorDatabaseIdProvider();
        Properties properties = new Properties();
        properties.setProperty("MySQL", "mysql");
        properties.setProperty("MariaDB", "mysql");
        properties.setProperty("PostgreSQL", "postgresql");
        properties.setProperty("Oracle", "oracle");
        provider.setProperties(properties);
        return provider;
    }
}
