package com.knowledge.base.core.config;

import com.baomidou.mybatisplus.core.config.GlobalConfig;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;

/**
 * Core BC 多数据源 MyBatis-Plus 公共配置
 *
 * <p>手动创建 SqlSessionFactory 时需注册 MetaObjectHandler，否则 BaseEntity 的 created_at 等字段不会自动填充。</p>
 */
public final class CoreMybatisPlusConfigurer {

    private CoreMybatisPlusConfigurer() {
    }

    /**
     * 为 SqlSessionFactory 注入字段自动填充处理器
     *
     * @param factoryBean        MyBatis-Plus 工厂 Bean
     * @param metaObjectHandler  自动填充处理器
     */
    public static void applyMetaObjectHandler(MybatisSqlSessionFactoryBean factoryBean,
                                              MetaObjectHandler metaObjectHandler) {
        GlobalConfig globalConfig = new GlobalConfig();
        globalConfig.setMetaObjectHandler(metaObjectHandler);
        factoryBean.setGlobalConfig(globalConfig);
    }
}
