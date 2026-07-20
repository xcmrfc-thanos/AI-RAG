package com.knowledge.base.statistics.pg;

import com.baomidou.mybatisplus.annotation.DbType;
import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.statistics.repository.StatDocumentRepository;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * PostgreSQL 最小全栈冒烟：连本地 compose PG，完成统计宽表 upsert + 读回。
 *
 * <p>由 {@code deploy/scripts/smoke-pg-stack.ps1} 注入
 * {@code SMOKE_PG_JDBC_URL}/{@code SMOKE_PG_USER}/{@code SMOKE_PG_PASSWORD}；
 * 未设置环境变量时跳过，避免默认 CI 无 PG 失败。</p>
 */
class PgStatisticsJdbcIT {

    private static final String ENV_URL = "SMOKE_PG_JDBC_URL";
    private static final String ENV_USER = "SMOKE_PG_USER";
    private static final String ENV_PASSWORD = "SMOKE_PG_PASSWORD";

    private JdbcTemplate jdbcTemplate;
    private StatDocumentRepository repository;

    /**
     * 仅在冒烟脚本提供 JDBC 时装配仓储。
     */
    @BeforeEach
    void setUp() {
        String url = System.getenv(ENV_URL);
        Assumptions.assumeTrue(url != null && !url.isBlank(),
                "skip: set SMOKE_PG_JDBC_URL via smoke-pg-stack.ps1");

        String user = System.getenv().getOrDefault(ENV_USER, "postgres");
        String password = System.getenv().getOrDefault(ENV_PASSWORD, "pg_smoke_pass");

        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(url);
        ds.setUsername(user);
        ds.setPassword(password);

        jdbcTemplate = new JdbcTemplate(ds);
        SqlDialectHelper helper = new SqlDialectHelper();
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        repository = new StatDocumentRepository(jdbcTemplate, helper);
    }

    /**
     * 健康探测：stat_document 表可查询。
     */
    @Test
    void health_statDocumentTableExists() {
        Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertEquals(1, one);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM stat_document", Long.class);
        assertTrue(count != null && count >= 0);
    }

    /**
     * 写入冒烟：PostgreSQL ON CONFLICT upsert 后可读回。
     */
    @Test
    void upsert_thenReadBack() {
        long id = 9_001_001L;
        repository.upsert(id, "pg-smoke-doc", 2L, 3L, 1, 7L, 1L, 0L, "summary", 0, 1, 9L);

        String title = jdbcTemplate.queryForObject(
                "SELECT title FROM stat_document WHERE id = ?", String.class, id);
        assertEquals("pg-smoke-doc", title);

        Long views = jdbcTemplate.queryForObject(
                "SELECT view_count FROM stat_document WHERE id = ?", Long.class, id);
        assertEquals(7L, views);

        repository.upsert(id, "pg-smoke-doc-v2", 2L, 3L, 1, 8L, 1L, 0L, "summary2", 0, 1, 9L);
        String title2 = jdbcTemplate.queryForObject(
                "SELECT title FROM stat_document WHERE id = ?", String.class, id);
        assertEquals("pg-smoke-doc-v2", title2);
    }
}
