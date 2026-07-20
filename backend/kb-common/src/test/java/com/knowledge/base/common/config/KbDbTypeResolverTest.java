package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * {@link KbDbTypeResolver} 单测。
 */
class KbDbTypeResolverTest {

    /** 显式 postgresql。 */
    @Test
    void resolve_explicitPostgresql() {
        assertEquals(DbType.POSTGRE_SQL, KbDbTypeResolver.resolve("postgresql", null));
        assertEquals(DbType.POSTGRE_SQL, KbDbTypeResolver.resolve("pg", "jdbc:mysql://x"));
    }

    /** 显式 oracle。 */
    @Test
    void resolve_explicitOracle() {
        assertEquals(DbType.ORACLE, KbDbTypeResolver.resolve("oracle", null));
    }

    /** 显式 mysql。 */
    @Test
    void resolve_explicitMysql() {
        assertEquals(DbType.MYSQL, KbDbTypeResolver.resolve("mysql", null));
    }

    /** 从 URL 推断。 */
    @Test
    void resolve_fromJdbcUrl() {
        assertEquals(DbType.POSTGRE_SQL,
                KbDbTypeResolver.resolve("", "jdbc:postgresql://127.0.0.1:5432/kb"));
        assertEquals(DbType.ORACLE,
                KbDbTypeResolver.resolve(null, "jdbc:oracle:thin:@//localhost:1521/ORCL"));
        assertEquals(DbType.MYSQL,
                KbDbTypeResolver.resolve("", "jdbc:mysql://127.0.0.1:3306/kb_user"));
    }

    /** 未配置时默认 mysql。 */
    @Test
    void resolve_defaultMysql() {
        assertEquals(DbType.MYSQL, KbDbTypeResolver.resolve("", null));
        assertEquals(DbType.MYSQL, KbDbTypeResolver.resolve("unknown", "jdbc:foo:bar"));
    }
}
