package com.knowledge.base.statistics.repository;

import com.baomidou.mybatisplus.annotation.DbType;
import com.knowledge.base.common.config.SqlDialectHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * StatDocumentRepository SQL 封装单测
 */
@ExtendWith(MockitoExtension.class)
class StatDocumentRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private SqlDialectHelper sqlDialectHelper;
    private StatDocumentRepository repository;

    /**
     * 注入真实方言助手（默认 MySQL）。
     */
    @BeforeEach
    void setUp() {
        sqlDialectHelper = new SqlDialectHelper();
        sqlDialectHelper.setDbTypeForTest(DbType.MYSQL);
        repository = new StatDocumentRepository(jdbcTemplate, sqlDialectHelper);
    }

    /**
     * 验证 upsert 命中 stat_document INSERT
     */
    @Test
    void upsert_usesStatDocumentSql() {
        repository.upsert(1L, "t", 2L, 3L, 1, 0L, 0L, 0L, "s", 0, 1, 9L);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sql.capture(), eq(1L), eq("t"), eq(2L), eq(3L), eq(1),
                eq(0L), eq(0L), eq(0L), eq("s"), eq(1), eq(9L), eq(0));
        assertTrue(sql.getValue().contains("INSERT INTO stat_document"));
        assertTrue(sql.getValue().contains("is_public"));
        assertTrue(sql.getValue().contains("ON DUPLICATE KEY UPDATE"));
    }

    /**
     * 验证删除标记 SQL
     */
    @Test
    void markDeleted_updatesDeletedFlag() {
        repository.markDeleted(9L);
        verify(jdbcTemplate).update(contains("UPDATE stat_document SET deleted = 1"), eq(9L));
    }
}
