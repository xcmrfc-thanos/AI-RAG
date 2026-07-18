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
 * Core BC IAM 数据源（kb_user，P2-3）。
 */
@Configuration
@MapperScan(basePackages = "com.knowledge.base.userauth.mapper",
        sqlSessionFactoryRef = "iamSqlSessionFactory")
public class CoreIamDataSourceConfig {

    @Resource
    private MybatisPlusInterceptor mybatisPlusInterceptor;

    @Resource
    private MyMetaObjectHandler myMetaObjectHandler;

    /**
     * IAM 数据源
     */
    @Bean("iamDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.iam")
    DataSource iamDataSource() {
        return DataSourceBuilder.create().type(DruidDataSource.class).build();
    }

    /**
     * IAM SqlSessionFactory
     */
    @Bean("iamSqlSessionFactory")
    SqlSessionFactory iamSqlSessionFactory(@Qualifier("iamDataSource") DataSource dataSource)
            throws Exception {
        MybatisSqlSessionFactoryBean factoryBean = new MybatisSqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setPlugins(mybatisPlusInterceptor);
        factoryBean.setMapperLocations(new PathMatchingResourcePatternResolver()
                .getResources("classpath*:/mapper/**/*.xml"));
        factoryBean.setTypeAliasesPackage("com.knowledge.base.userauth.entity");
        CoreMybatisPlusConfigurer.applyMetaObjectHandler(factoryBean, myMetaObjectHandler);
        return factoryBean.getObject();
    }

    /**
     * IAM SqlSessionTemplate
     */
    @Bean("iamSqlSessionTemplate")
    SqlSessionTemplate iamSqlSessionTemplate(
            @Qualifier("iamSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory);
    }

    /**
     * IAM JdbcTemplate（Token 黑名单等）
     */
    @Bean("iamJdbcTemplate")
    JdbcTemplate iamJdbcTemplate(@Qualifier("iamDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    /**
     * IAM 事务管理器
     */
    @Bean("iamTransactionManager")
    PlatformTransactionManager iamTransactionManager(
            @Qualifier("iamDataSource") DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
