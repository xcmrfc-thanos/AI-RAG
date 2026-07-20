package com.knowledge.base.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 关系数据库方言配置。
 *
 * <p>一部署一方言：MySQL / PostgreSQL / Oracle 不可在同一次部署中混用。
 * 默认 mysql；未配置时由 JDBC URL 推断，再回退 mysql。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "kb.db")
public class KbDbProperties {

    /**
     * 方言类型：mysql | postgresql | oracle。
     * 空字符串表示未显式配置，交由 {@link KbDbTypeResolver} 从 JDBC URL 推断。
     */
    private String type = "";
}
