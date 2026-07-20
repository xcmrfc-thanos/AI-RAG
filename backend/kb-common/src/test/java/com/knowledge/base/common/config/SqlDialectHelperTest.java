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

    /** Oracle 禁止再拼 ON DUPLICATE 后缀。 */
    @Test
    void onDuplicate_oracleUnsupported() {
        helper.setDbTypeForTest(DbType.ORACLE);
        assertThrows(UnsupportedOperationException.class,
                () -> helper.onDuplicateKeyUpdate("id", "title=VALUES(title)"));
    }

    /** Oracle MERGE 含 MERGE INTO / WHEN MATCHED。 */
    @Test
    void mergeInto_oracle() {
        helper.setDbTypeForTest(DbType.ORACLE);
        String sql = helper.mergeInto(
                "stat_user",
                "id",
                "id, username, deleted",
                "?, ?, ?",
                "username=VALUES(username), deleted=VALUES(deleted)");
        assertTrue(sql.contains("MERGE INTO stat_user"));
        assertTrue(sql.contains("WHEN MATCHED THEN UPDATE SET"));
        assertTrue(sql.contains("WHEN NOT MATCHED THEN INSERT"));
        assertTrue(sql.contains("t.username = s.username"));
        assertTrue(sql.contains("FROM dual"));
    }

    /** upsertSql：MySQL 走 INSERT+ON DUPLICATE；Oracle 走 MERGE。 */
    @Test
    void upsertSql_mysqlAndOracle() {
        helper.setDbTypeForTest(DbType.MYSQL);
        String mysql = helper.upsertSql("stat_user", "id", "id, username", "?, ?",
                "username=VALUES(username)");
        assertTrue(mysql.startsWith("INSERT INTO stat_user"));
        assertTrue(mysql.contains("ON DUPLICATE KEY UPDATE"));

        helper.setDbTypeForTest(DbType.ORACLE);
        String oracle = helper.upsertSql("stat_user", "id", "id, username", "?, ?",
                "username=VALUES(username)");
        assertTrue(oracle.contains("MERGE INTO stat_user"));
        assertTrue(oracle.contains("WHEN MATCHED"));
    }

    /** VALUES → EXCLUDED 转换。 */
    @Test
    void toExcludedAssignments() {
        assertEquals("a=EXCLUDED.a, b=EXCLUDED.b",
                SqlDialectHelper.toExcludedAssignments("a=VALUES(a), b=VALUES(b)"));
    }

    /** VALUES → MERGE 源表列。 */
    @Test
    void toMergeAssignments() {
        assertEquals("t.a = s.a, t.deleted = 0",
                SqlDialectHelper.toMergeAssignments("a=VALUES(a), deleted=0"));
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

    /** LIKE 包含：MySQL CONCAT vs Oracle ||。 */
    @Test
    void likeContains_variants() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals("d.title LIKE CONCAT('%', {0}, '%')", helper.likeContains("d.title", "{0}"));
        helper.setDbTypeForTest(DbType.POSTGRE_SQL);
        assertEquals("tag_name LIKE CONCAT('%', #{keyword}, '%')",
                helper.likeContains("tag_name", "#{keyword}"));
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals("d.title LIKE '%' || {0} || '%'", helper.likeContains("d.title", "{0}"));
    }

    /** LIKE 前缀。 */
    @Test
    void likePrefix_variants() {
        helper.setDbTypeForTest(DbType.MYSQL);
        assertEquals("path LIKE CONCAT(#{path}, '%')", helper.likePrefix("path", "#{path}"));
        helper.setDbTypeForTest(DbType.ORACLE);
        assertEquals("path LIKE #{path} || '%'", helper.likePrefix("path", "#{path}"));
    }
}
