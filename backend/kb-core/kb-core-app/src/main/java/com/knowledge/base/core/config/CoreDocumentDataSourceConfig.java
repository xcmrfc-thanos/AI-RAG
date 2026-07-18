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
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;

/**
 * Core BC Document 数据源（kb_document MySQL，P2-4）。
 */
@Configuration
@MapperScan(basePackages = "com.knowledge.base.document.mapper",
        sqlSessionFactoryRef = "documentSqlSessionFactory")
public class CoreDocumentDataSourceConfig {

    @Resource
    private MybatisPlusInterceptor mybatisPlusInterceptor;

    @Resource
    private MyMetaObjectHandler myMetaObjectHandler;

    /**
     * Document MySQL 数据源
     */
    @Bean("documentDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.document")
    DataSource documentDataSource() {
        return DataSourceBuilder.create().type(DruidDataSource.class).build();
    }

    /**
     * Document SqlSessionFactory
     */
    @Bean("documentSqlSessionFactory")
    SqlSessionFactory documentSqlSessionFactory(
            @Qualifier("documentDataSource") DataSource dataSource) throws Exception {
        MybatisSqlSessionFactoryBean factoryBean = new MybatisSqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPlugins(mybatisPlusInterceptor);
        factoryBean.setMapperLocations(new PathMatchingResourcePatternResolver()
                .getResources("classpath*:/mapper/**/*.xml"));
        factoryBean.setTypeAliasesPackage("com.knowledge.base.document.entity");
        CoreMybatisPlusConfigurer.applyMetaObjectHandler(factoryBean, myMetaObjectHandler);
        return factoryBean.getObject();
    }

    /**
     * Document SqlSessionTemplate
     */
    @Bean("documentSqlSessionTemplate")
    SqlSessionTemplate documentSqlSessionTemplate(
            @Qualifier("documentSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory);
    }

    /**
     * Document JdbcTemplate
     */
    @Bean("documentJdbcTemplate")
    JdbcTemplate documentJdbcTemplate(@Qualifier("documentDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    /**
     * Document 事务管理器
     */
    @Bean("documentTransactionManager")
    PlatformTransactionManager documentTransactionManager(
            @Qualifier("documentDataSource") DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
