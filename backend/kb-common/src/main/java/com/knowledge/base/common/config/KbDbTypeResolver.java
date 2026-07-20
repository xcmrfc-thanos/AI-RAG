package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import org.springframework.util.StringUtils;

/**
 * 将配置或 JDBC URL 解析为 MyBatis-Plus {@link DbType}。
 *
 * @author 苏三
 * @since 1.0.0
 */
public final class KbDbTypeResolver {

    private KbDbTypeResolver() {
    }

    /**
     * 解析数据库方言。
     *
     * @param configuredType {@code kb.db.type}，可为空
     * @param jdbcUrl        可选 JDBC URL（用于推断）
     * @return MyBatis-Plus DbType，无法识别时返回 {@link DbType#MYSQL}
     */
    public static DbType resolve(String configuredType, String jdbcUrl) {
        DbType fromConfig = fromTypeLabel(configuredType);
        if (fromConfig != null) {
            return fromConfig;
        }
        DbType fromUrl = fromJdbcUrl(jdbcUrl);
        if (fromUrl != null) {
            return fromUrl;
        }
        return DbType.MYSQL;
    }

    /**
     * 解析显式类型标签。
     *
     * @param type mysql/postgresql/oracle 等
     * @return DbType 或 null（未配置/不认识）
     */
    static DbType fromTypeLabel(String type) {
        if (!StringUtils.hasText(type)) {
            return null;
        }
        String t = type.trim().toLowerCase();
        return switch (t) {
            case "mysql", "mariadb" -> DbType.MYSQL;
            case "postgresql", "postgres", "pg" -> DbType.POSTGRE_SQL;
            case "oracle" -> DbType.ORACLE;
            default -> null;
        };
    }

    /**
     * 从 JDBC URL 推断方言。
     *
     * @param jdbcUrl JDBC 连接串
     * @return DbType 或 null
     */
    static DbType fromJdbcUrl(String jdbcUrl) {
        if (!StringUtils.hasText(jdbcUrl)) {
            return null;
        }
        String u = jdbcUrl.trim().toLowerCase();
        if (u.startsWith("jdbc:postgresql:") || u.contains(":postgresql:")) {
            return DbType.POSTGRE_SQL;
        }
        if (u.startsWith("jdbc:oracle:") || u.contains(":oracle:")) {
            return DbType.ORACLE;
        }
        if (u.startsWith("jdbc:mysql:") || u.startsWith("jdbc:mariadb:")
                || u.contains(":mysql:") || u.contains(":mariadb:")) {
            return DbType.MYSQL;
        }
        return null;
    }
}
