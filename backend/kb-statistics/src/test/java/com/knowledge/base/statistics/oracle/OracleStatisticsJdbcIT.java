package com.knowledge.base.statistics.oracle;

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
 * Oracle 统计宽表 upsert + 读回（可选集成测试）。
 *
 * <p>需自行准备 Oracle 并注入
 * {@code SMOKE_ORACLE_JDBC_URL}/{@code SMOKE_ORACLE_USER}/{@code SMOKE_ORACLE_PASSWORD}；
 * 未设置环境变量时跳过，避免默认 CI 无 Oracle 失败。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class OracleStatisticsJdbcIT {

    private static final String ENV_URL = "SMOKE_ORACLE_JDBC_URL";
    private static final String ENV_USER = "SMOKE_ORACLE_USER";
    private static final String ENV_PASSWORD = "SMOKE_ORACLE_PASSWORD";

    private JdbcTemplate jdbcTemplate;
    private StatDocumentRepository repository;

    /**
     * 仅在冒烟脚本提供 JDBC 时装配仓储。
     */
    @BeforeEach
    void setUp() {
        String url = System.getenv(ENV_URL);
        Assumptions.assumeTrue(url != null && !url.isBlank(),
                "skip: set SMOKE_ORACLE_JDBC_URL to a live Oracle JDBC URL");

        String user = System.getenv().getOrDefault(ENV_USER, "kb_statistics");
        String password = System.getenv().getOrDefault(ENV_PASSWORD, "OracleSmoke_1");

        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("oracle.jdbc.OracleDriver");
        ds.setUrl(url);
        ds.setUsername(user);
        ds.setPassword(password);

        try {
            ds.getConnection().close();
        } catch (Exception e) {
            Assumptions.assumeTrue(false,
                    "skip: cannot connect to SMOKE_ORACLE_JDBC_URL: " + e.getMessage());
        }

        jdbcTemplate = new JdbcTemplate(ds);
        SqlDialectHelper helper = new SqlDialectHelper();
        helper.setDbTypeForTest(DbType.ORACLE);
        repository = new StatDocumentRepository(jdbcTemplate, helper);
    }

    /**
     * 健康探测：可执行查询且 stat_document 存在。
     */
    @Test
    void health_statDocumentTableExists() {
        Integer one = jdbcTemplate.queryForObject("SELECT 1 FROM dual", Integer.class);
        assertEquals(1, one);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM stat_document", Long.class);
        assertTrue(count != null && count >= 0);
    }

    /**
     * 写入冒烟：Oracle MERGE upsert 后可读回。
     */
    @Test
    void upsert_thenReadBack() {
        long id = 9_001_002L;
        repository.upsert(id, "ora-smoke-doc", 2L, 3L, 1, 7L, 1L, 0L, "summary", 0, 1, 9L);

        String title = jdbcTemplate.queryForObject(
                "SELECT title FROM stat_document WHERE id = ?", String.class, id);
        assertEquals("ora-smoke-doc", title);

        Long views = jdbcTemplate.queryForObject(
                "SELECT view_count FROM stat_document WHERE id = ?", Long.class, id);
        assertEquals(7L, views);

        repository.upsert(id, "ora-smoke-doc-v2", 2L, 3L, 1, 8L, 1L, 0L, "summary2", 0, 1, 9L);
        String title2 = jdbcTemplate.queryForObject(
                "SELECT title FROM stat_document WHERE id = ?", String.class, id);
        assertEquals("ora-smoke-doc-v2", title2);
    }
}
