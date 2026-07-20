package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL 方言片段助手（JdbcTemplate / 手写 SQL）。
 *
 * <p>覆盖 IFNULL、当前时间、按天清理、UPSERT 后缀。默认与 MySQL 语义对齐。
 * PostgreSQL 使用 COALESCE / ON CONFLICT；Oracle 的 UPSERT 本阶段抛出明确异常（待 MERGE）。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Component
public class SqlDialectHelper {

    private static final Pattern VALUES_PATTERN =
            Pattern.compile("VALUES\\((\\w+)\\)", Pattern.CASE_INSENSITIVE);

    @Autowired
    private KbDbProperties kbDbProperties;

    @Value("${spring.datasource.url:}")
    private String springDatasourceUrl;

    private DbType dbType = DbType.MYSQL;

    /**
     * 解析并缓存当前部署方言。
     */
    @PostConstruct
    public void init() {
        this.dbType = KbDbTypeResolver.resolve(kbDbProperties.getType(), springDatasourceUrl);
        log.info("SqlDialectHelper 方言：{}", dbType);
    }

    /**
     * 当前 DbType（供测试或调用方分支）。
     *
     * @return DbType
     */
    public DbType getDbType() {
        return dbType;
    }

    /**
     * 供单测注入方言，避免启动 Spring。
     *
     * @param dbType 方言
     */
    public void setDbTypeForTest(DbType dbType) {
        this.dbType = dbType;
    }

    /**
     * 空值函数：MySQL IFNULL / PG&amp;Oracle COALESCE（Oracle 亦可用 NVL，统一 COALESCE 兼容性更好）。
     *
     * @param expression 列或表达式
     * @param defaultSql 默认值 SQL 字面量（如 {@code 0}）
     * @return 方言函数调用
     */
    public String ifNull(String expression, String defaultSql) {
        return switch (dbType) {
            case MYSQL -> "IFNULL(" + expression + ", " + defaultSql + ")";
            case ORACLE -> "NVL(" + expression + ", " + defaultSql + ")";
            default -> "COALESCE(" + expression + ", " + defaultSql + ")";
        };
    }

    /**
     * 当前时间戳表达式。
     *
     * @return SQL 片段
     */
    public String currentTimestamp() {
        return switch (dbType) {
            case ORACLE -> "SYSTIMESTAMP";
            default -> "NOW()";
        };
    }

    /**
     * 删除「早于 N 天」条件右侧的时间表达式（不含列名）。
     *
     * @param days 保留天数
     * @return 如 {@code DATE_SUB(NOW(), INTERVAL 90 DAY)} 或 PG/Oracle 等价
     */
    public String timestampDaysAgo(int days) {
        if (days < 0) {
            throw new IllegalArgumentException("days must be >= 0");
        }
        return switch (dbType) {
            case MYSQL -> "DATE_SUB(NOW(), INTERVAL " + days + " DAY)";
            case POSTGRE_SQL -> "(NOW() - INTERVAL '" + days + " days')";
            case ORACLE -> "(SYSTIMESTAMP - NUMTODSINTERVAL(" + days + ", 'DAY'))";
            default -> "DATE_SUB(NOW(), INTERVAL " + days + " DAY)";
        };
    }

    /**
     * 生成 UPSERT 冲突更新后缀。
     *
     * <p>MySQL：{@code ON DUPLICATE KEY UPDATE a=VALUES(a), ...}<br>
     * PostgreSQL：{@code ON CONFLICT (cols) DO UPDATE SET a=EXCLUDED.a, ...}<br>
     * Oracle：本阶段不支持，抛出 {@link UnsupportedOperationException}。</p>
     *
     * @param conflictColumns        冲突列（PG 必填，逗号分隔，如 {@code id}）
     * @param mysqlUpdateAssignments MySQL 风格赋值，可用 {@code VALUES(col)}
     * @return SQL 后缀（含前导空格）
     */
    public String onDuplicateKeyUpdate(String conflictColumns, String mysqlUpdateAssignments) {
        if (!StringUtils.hasText(mysqlUpdateAssignments)) {
            throw new IllegalArgumentException("mysqlUpdateAssignments required");
        }
        return switch (dbType) {
            case MYSQL -> " ON DUPLICATE KEY UPDATE " + mysqlUpdateAssignments.trim();
            case POSTGRE_SQL -> {
                if (!StringUtils.hasText(conflictColumns)) {
                    throw new IllegalArgumentException("conflictColumns required for PostgreSQL");
                }
                yield " ON CONFLICT (" + conflictColumns.trim() + ") DO UPDATE SET "
                        + toExcludedAssignments(mysqlUpdateAssignments.trim());
            }
            case ORACLE -> throw new UnsupportedOperationException(
                    "Oracle UPSERT 请改用 MERGE；SqlDialectHelper 尚未实现");
            default -> " ON DUPLICATE KEY UPDATE " + mysqlUpdateAssignments.trim();
        };
    }

    /**
     * 将 {@code col=VALUES(col)} 转为 {@code col=EXCLUDED.col}。
     *
     * @param mysqlAssignments MySQL 赋值列表
     * @return PG 赋值列表
     */
    static String toExcludedAssignments(String mysqlAssignments) {
        Matcher m = VALUES_PATTERN.matcher(mysqlAssignments);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            m.appendReplacement(sb, "EXCLUDED." + m.group(1).toLowerCase(Locale.ROOT));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
