package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link SqlDialectHelper} 单测。
 */
class SqlDialectHelperTest {

    private SqlDialectHelper helper;

    @BeforeEach
    void setUp() {
        helper = new SqlDialectHelper();
    }

    /** MySQL IFNULL。 */
    @Test
    void ifNull_mysql() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals("IFNULL(r.deleted, 0)", helper.ifNull("r.deleted", "0"));
    }

    /** PostgreSQL COALESCE。 */
    @Test
    void ifNull_postgresql() {
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        assertEquals("COALESCE(r.deleted, 0)", helper.ifNull("r.deleted", "0"));
    }

    /** Oracle NVL。 */
    @Test
    void ifNull_oracle() {
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals("NVL(r.deleted, 0)", helper.ifNull("r.deleted", "0"));
    }

    /** 过期时间表达式。 */
    @Test
    void timestampDaysAgo_variants() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals("DATE_SUB(NOW(), INTERVAL 90 DAY)", helper.timestampDaysAgo(90));
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        assertEquals("(NOW() - INTERVAL '90 days')", helper.timestampDaysAgo(90));
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals("(SYSTIMESTAMP - NUMTODSINTERVAL(90, 'DAY'))", helper.timestampDaysAgo(90));
    }

    /** MySQL upsert 后缀。 */
    @Test
    void onDuplicate_mysql() {
        helper.setDbTypeForTest(DbType.MYSQL);
        String s = helper.onDuplicateKeyUpdate("id", "title=VALUES(title), deleted=VALUES(deleted)");
        assertTrue(s.contains("ON DUPLICATE KEY UPDATE"));
        assertTrue(s.contains("VALUES(title)"));
    }

    /** PostgreSQL ON CONFLICT。 */
    @Test
    void onDuplicate_postgresql() {
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        String s = helper.onDuplicateKeyUpdate("id", "title=VALUES(title), deleted=VALUES(deleted)");
        assertTrue(s.contains("ON CONFLICT (id) DO UPDATE SET"));
        assertTrue(s.contains("EXCLUDED.title"));
        assertTrue(s.contains("EXCLUDED.deleted"));
    }

    /** Oracle 暂不支持。 */
    @Test
    void onDuplicate_oracleUnsupported() {
        helper.setDbTypeForTest(DbType.ORACLE);
        assertThrows(UnsupportedOperationException.class,
                () -> helper.onDuplicateKeyUpdate("id", "title=VALUES(title)"));
    }

    /** MERGE 占位仍抛异常。 */
    @Test
    void mergeInto_unsupported() {
        helper.setDbTypeForTest(DbType.ORACLE);
        assertThrows(UnsupportedOperationException.class,
                () -> helper.mergeInto("stat_user", "id", "id,username", "username=EXCLUDED.username"));
    }

    /** VALUES → EXCLUDED 转换。 */
    @Test
    void toExcludedAssignments() {
        assertEquals("a=EXCLUDED.a, b=EXCLUDED.b",
                SqlDialectHelper.toExcludedAssignments("a=VALUES(a), b=VALUES(b)"));
    }

    /** DATE 方言。 */
    @Test
    void dateOf_variants() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals("DATE(created_at)", helper.dateOf("created_at"));
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        assertEquals("CAST(created_at AS DATE)", helper.dateOf("created_at"));
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals("TRUNC(created_at)", helper.dateOf("created_at"));
    }

    /** LIMIT / FETCH FIRST。 */
    @Test
    void limitClause_variants() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals(" LIMIT 10", helper.limitClause(10));
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        assertEquals(" LIMIT 10", helper.limitClause(10));
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals(" FETCH FIRST 10 ROWS ONLY", helper.limitClause(10));
        assertThrows(IllegalArgumentException.class, () -> helper.limitClause(0));
    }
}
