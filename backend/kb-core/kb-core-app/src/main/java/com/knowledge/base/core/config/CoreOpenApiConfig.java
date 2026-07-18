package com.knowledge.base.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Core BC 统一 OpenAPI 文档配置。
 */
@Configuration
public class CoreOpenApiConfig {

    /**
     * Knife4j / OpenAPI 信息
     */
    @Bean
    OpenAPI coreOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("企业知识库系统 - Core BC API")
                        .version("1.0.0")
                        .description("IAM + Platform + Document（合并中）")
                        .contact(new Contact()
                                .name("苏三")
                                .email("support@knowledge-base.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")));
    }
}
