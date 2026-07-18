package com.knowledge.base.core.config;

import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.knowledge.base.common.handler.MyMetaObjectHandler;
import jakarta.annotation.Resource;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import com.alibaba.druid.pool.DruidDataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;

/**
 * Core BC Platform 数据源（kb_foundation，P2-2）。
 */
@Configuration
@MapperScan(basePackages = "com.knowledge.base.foundation.mapper",
        sqlSessionFactoryRef = "platformSqlSessionFactory")
public class CorePlatformDataSourceConfig {

    @Resource
    private MybatisPlusInterceptor mybatisPlusInterceptor;

    @Resource
    private MyMetaObjectHandler myMetaObjectHandler;

    /**
     * Platform 数据源
     */
    @Bean("platformDataSource")
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource.platform")
    DataSource platformDataSource() {
        return DataSourceBuilder.create().type(DruidDataSource.class).build();
    }

    /**
     * Platform SqlSessionFactory
     */
    @Bean("platformSqlSessionFactory")
    @Primary
    SqlSessionFactory platformSqlSessionFactory(
            @Qualifier("platformDataSource") DataSource dataSource) throws Exception {
        MybatisSqlSessionFactoryBean factoryBean = new MybatisSqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPlugins(mybatisPlusInterceptor);
        factoryBean.setTypeAliasesPackage("com.knowledge.base.foundation.entity");
        CoreMybatisPlusConfigurer.applyMetaObjectHandler(factoryBean, myMetaObjectHandler);
        return factoryBean.getObject();
    }

    /**
     * Platform SqlSessionTemplate
     */
    @Bean("platformSqlSessionTemplate")
    @Primary
    SqlSessionTemplate platformSqlSessionTemplate(
            @Qualifier("platformSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory);
    }

    /**
     * Platform 事务管理器
     */
    @Bean("platformTransactionManager")
    @Primary
    PlatformTransactionManager platformTransactionManager(
            @Qualifier("platformDataSource") DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }

    /**
     * Platform JdbcTemplate（操作日志 MQ 等）
     */
    @Bean("platformJdbcTemplate")
    @Primary
    JdbcTemplate platformJdbcTemplate(@Qualifier("platformDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
