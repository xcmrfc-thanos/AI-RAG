package com.knowledge.base.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL 方言片段助手（JdbcTemplate / 手写 SQL）。
 *
 * <p>覆盖 IFNULL、当前时间、按天清理、DATE/LIMIT、UPSERT。MySQL/PG 用 ON DUPLICATE/CONFLICT；
 * Oracle 用 {@link #mergeInto} / {@link #upsertSql} 生成 MERGE。</p>
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
    /**
     * 初始化。
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
     * 空值函数：MySQL IFNULL / PG COALESCE / Oracle NVL。
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
     * 取日期部分：MySQL {@code DATE(x)} / PG {@code CAST(x AS DATE)} / Oracle {@code TRUNC(x)}。
     *
     * @param expression 时间列或表达式
     * @return 方言日期表达式
     */
    public String dateOf(String expression) {
        if (!StringUtils.hasText(expression)) {
            throw new IllegalArgumentException("expression required");
        }
        String expr = expression.trim();
        return switch (dbType) {
            case MYSQL -> "DATE(" + expr + ")";
            case POSTGRE_SQL -> "CAST(" + expr + " AS DATE)";
            case ORACLE -> "TRUNC(" + expr + ")";
            default -> "DATE(" + expr + ")";
        };
    }

    /**
     * 行数限制子句（供 {@code QueryWrapper.last} 或手写 SQL 末尾追加）。
     *
     * <p>MySQL/PostgreSQL：{@code LIMIT n}；Oracle 12c+：{@code FETCH FIRST n ROWS ONLY}
     *（调用方须已有 {@code ORDER BY}，否则结果不确定）。</p>
     *
     * @param n 最大行数，须 &gt; 0
     * @return 含前导空格的限制子句
     */
    public String limitClause(int n) {
        if (n <= 0) {
            throw new IllegalArgumentException("limit must be > 0");
        }
        return switch (dbType) {
            case ORACLE -> " FETCH FIRST " + n + " ROWS ONLY";
            default -> " LIMIT " + n;
        };
    }

    /**
     * LIKE 包含匹配表达式（多参数 CONCAT 在 Oracle 不安全）。
     *
     * <p>MySQL/PG：{@code col LIKE CONCAT('%', valueExpr, '%')}；
     * Oracle：{@code col LIKE '%' || valueExpr || '%'}。</p>
     *
     * @param column    列或表达式（如 {@code d.title}）
     * @param valueExpr 值片段（如 {@code #{keyword}} 或 MyBatis-Plus {@code {0}}）
     * @return 完整 LIKE 条件（不含 WHERE）
     */
    public String likeContains(String column, String valueExpr) {
        if (!StringUtils.hasText(column) || !StringUtils.hasText(valueExpr)) {
            throw new IllegalArgumentException("column/valueExpr required");
        }
        String col = column.trim();
        String val = valueExpr.trim();
        return switch (dbType) {
            case ORACLE -> col + " LIKE '%' || " + val + " || '%'";
            default -> col + " LIKE CONCAT('%', " + val + ", '%')";
        };
    }

    /**
     * LIKE 前缀匹配表达式。
     *
     * <p>MySQL/PG：{@code col LIKE CONCAT(valueExpr, '%')}；
     * Oracle：{@code col LIKE valueExpr || '%'}。</p>
     *
     * @param column    列或表达式
     * @param valueExpr 值片段
     * @return 完整 LIKE 条件（不含 WHERE）
     */
    public String likePrefix(String column, String valueExpr) {
        if (!StringUtils.hasText(column) || !StringUtils.hasText(valueExpr)) {
            throw new IllegalArgumentException("column/valueExpr required");
        }
        String col = column.trim();
        String val = valueExpr.trim();
        return switch (dbType) {
            case ORACLE -> col + " LIKE " + val + " || '%'";
            default -> col + " LIKE CONCAT(" + val + ", '%')";
        };
    }

    /**
     * 生成简单主键 UPSERT 完整语句。
     *
     * <p>MySQL/PG：{@code INSERT INTO ... VALUES ...} + {@link #onDuplicateKeyUpdate}；
     * Oracle：{@link #mergeInto}。</p>
     *
     * @param table                  目标表
     * @param conflictColumns        冲突列（逗号分隔）
     * @param insertColumnList       INSERT 列清单
     * @param insertValuesSql        VALUES 内表达式（与列一一对应，可含 {@code ?} / {@code NOW()}）
     * @param mysqlUpdateAssignments MySQL 风格赋值，可用 {@code VALUES(col)}
     * @return 完整 UPSERT SQL
     */
    public String upsertSql(String table, String conflictColumns,
                            String insertColumnList, String insertValuesSql,
                            String mysqlUpdateAssignments) {
        if (!StringUtils.hasText(table)) {
            throw new IllegalArgumentException("table required");
        }
        if (!StringUtils.hasText(insertColumnList) || !StringUtils.hasText(insertValuesSql)) {
            throw new IllegalArgumentException("insertColumnList/insertValuesSql required");
        }
        if (!StringUtils.hasText(mysqlUpdateAssignments)) {
            throw new IllegalArgumentException("mysqlUpdateAssignments required");
        }
        if (dbType == DbType.ORACLE) {
            return mergeInto(table, conflictColumns, insertColumnList, insertValuesSql, mysqlUpdateAssignments);
        }
        return "INSERT INTO " + table.trim() + " (" + insertColumnList.trim() + ") VALUES ("
                + insertValuesSql.trim() + ")"
                + onDuplicateKeyUpdate(conflictColumns, mysqlUpdateAssignments);
    }

    /**
     * 生成 UPSERT 冲突更新后缀（仅 MySQL/PostgreSQL）。
     *
     * <p>Oracle 请改用 {@link #upsertSql} / {@link #mergeInto}。</p>
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
                    "Oracle 请使用 SqlDialectHelper.upsertSql / mergeInto，勿再拼接 ON DUPLICATE 后缀");
            default -> " ON DUPLICATE KEY UPDATE " + mysqlUpdateAssignments.trim();
        };
    }

    /**
     * 生成 Oracle MERGE UPSERT 语句。
     *
     * @param table           目标表
     * @param conflictColumns 冲突列（逗号分隔）
     * @param insertColumns   INSERT 列清单
     * @param insertValues    与列对应的值表达式
     * @param updateSet       MySQL 风格 UPDATE 赋值（可含 {@code VALUES(col)}）
     * @return MERGE INTO ... SQL
     */
    public String mergeInto(String table, String conflictColumns, String insertColumns,
                            String insertValues, String updateSet) {
        if (!StringUtils.hasText(table)) {
            throw new IllegalArgumentException("table required");
        }
        if (!StringUtils.hasText(conflictColumns)) {
            throw new IllegalArgumentException("conflictColumns required for Oracle MERGE");
        }
        if (!StringUtils.hasText(insertColumns) || !StringUtils.hasText(insertValues)) {
            throw new IllegalArgumentException("insertColumns/insertValues required");
        }
        if (!StringUtils.hasText(updateSet)) {
            throw new IllegalArgumentException("updateSet required");
        }
        List<String> cols = splitCsv(insertColumns);
        List<String> vals = splitCsv(insertValues);
        if (cols.size() != vals.size()) {
            throw new IllegalArgumentException(
                    "insertColumns/insertValues size mismatch: " + cols.size() + " vs " + vals.size());
        }
        StringBuilder usingSelect = new StringBuilder("SELECT ");
        for (int i = 0; i < cols.size(); i++) {
            if (i > 0) {
                usingSelect.append(", ");
            }
            usingSelect.append(vals.get(i)).append(" AS ").append(cols.get(i));
        }
        usingSelect.append(" FROM dual");

        List<String> conflicts = splitCsv(conflictColumns);
        StringBuilder on = new StringBuilder();
        for (int i = 0; i < conflicts.size(); i++) {
            if (i > 0) {
                on.append(" AND ");
            }
            String c = conflicts.get(i);
            on.append("t.").append(c).append(" = s.").append(c);
        }

        StringBuilder insertSrc = new StringBuilder();
        for (int i = 0; i < cols.size(); i++) {
            if (i > 0) {
                insertSrc.append(", ");
            }
            insertSrc.append("s.").append(cols.get(i));
        }

        return "MERGE INTO " + table.trim() + " t USING (" + usingSelect + ") s ON (" + on + ") "
                + "WHEN MATCHED THEN UPDATE SET " + toMergeAssignments(updateSet.trim()) + " "
                + "WHEN NOT MATCHED THEN INSERT (" + String.join(", ", cols) + ") VALUES ("
                + insertSrc + ")";
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

    /**
     * 将 MySQL 风格赋值转为 Oracle MERGE：{@code t.col = s.col}；字面量右侧保持不变。
     *
     * @param mysqlAssignments MySQL 赋值列表
     * @return MERGE UPDATE SET 列表
     */
    static String toMergeAssignments(String mysqlAssignments) {
        List<String> parts = splitCsv(mysqlAssignments);
        List<String> out = new ArrayList<>(parts.size());
        for (String part : parts) {
            int eq = part.indexOf('=');
            if (eq <= 0) {
                throw new IllegalArgumentException("invalid assignment: " + part);
            }
            String left = part.substring(0, eq).trim();
            String right = part.substring(eq + 1).trim();
            if (!left.contains(".")) {
                left = "t." + left;
            }
            Matcher m = VALUES_PATTERN.matcher(right);
            if (m.matches()) {
                right = "s." + m.group(1).toLowerCase(Locale.ROOT);
            }
            out.add(left + " = " + right);
        }
        return String.join(", ", out);
    }

    /**
     * 按顶层逗号拆分（忽略括号内逗号）。
     *
     * @param csv 逗号分隔文本
     * @return 片段列表
     */
    static List<String> splitCsv(String csv) {
        List<String> parts = new ArrayList<>();
        if (csv == null) {
            return parts;
        }
        StringBuilder cur = new StringBuilder();
        int depth = 0;
        for (int i = 0; i < csv.length(); i++) {
            char ch = csv.charAt(i);
            if (ch == '(') {
                depth++;
                cur.append(ch);
            } else if (ch == ')') {
                depth = Math.max(0, depth - 1);
                cur.append(ch);
            } else if (ch == ',' && depth == 0) {
                String piece = cur.toString().trim();
                if (!piece.isEmpty()) {
                    parts.add(piece);
                }
                cur.setLength(0);
            } else {
                cur.append(ch);
            }
        }
        String last = cur.toString().trim();
        if (!last.isEmpty()) {
            parts.add(last);
        }
        return parts;
    }
}
