package com.knowledge.base.agent.engine;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 条件表达式求值（变量展开后的简易比较 / 真值）
 *
 * <p>支持：裸真值；{@code A op B}，op ∈ {@code > >= < <= == !=}。</p>
 */
public final class ConditionExpression {

    private static final Pattern COMPARE = Pattern.compile(
            "^\\s*(.+?)\\s*(>=|<=|==|!=|>|<)\\s*(.+?)\\s*$");

    private ConditionExpression() {
    }

    /**
     * 将展开后的表达式求值为布尔值
     *
     * @param expression 已展开表达式
     * @return 结果
     */
    public static boolean evaluate(String expression) {
        if (expression == null || expression.isBlank()) {
            throw new ValidationException("INVALID_ARGUMENT", "condition.expression 不能为空");
        }
        String text = expression.trim();
        Matcher m = COMPARE.matcher(text);
        if (m.matches()) {
            return compare(m.group(1).trim(), m.group(2), m.group(3).trim());
        }
        return asBoolean(text);
    }

    private static boolean compare(String leftRaw, String op, String rightRaw) {
        Double leftNum = tryNumber(leftRaw);
        Double rightNum = tryNumber(rightRaw);
        if (leftNum != null && rightNum != null) {
            int cmp = Double.compare(leftNum, rightNum);
            return switch (op) {
                case ">" -> cmp > 0;
                case ">=" -> cmp >= 0;
                case "<" -> cmp < 0;
                case "<=" -> cmp <= 0;
                case "==" -> cmp == 0;
                case "!=" -> cmp != 0;
                default -> throw new ValidationException("INVALID_ARGUMENT", "不支持的比较符: " + op);
            };
        }
        String left = stripQuotes(leftRaw);
        String right = stripQuotes(rightRaw);
        int cmp = left.compareTo(right);
        return switch (op) {
            case "==" -> cmp == 0;
            case "!=" -> cmp != 0;
            case ">" -> cmp > 0;
            case ">=" -> cmp >= 0;
            case "<" -> cmp < 0;
            case "<=" -> cmp <= 0;
            default -> throw new ValidationException("INVALID_ARGUMENT", "不支持的比较符: " + op);
        };
    }

    private static boolean asBoolean(String text) {
        String normalized = stripQuotes(text).toLowerCase(Locale.ROOT);
        if ("true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized)) {
            return true;
        }
        if ("false".equals(normalized) || "0".equals(normalized) || "no".equals(normalized)
                || "null".equals(normalized) || normalized.isEmpty()) {
            return false;
        }
        Double num = tryNumber(normalized);
        if (num != null) {
            return num != 0d;
        }
        return true;
    }

    private static Double tryNumber(String raw) {
        try {
            return Double.parseDouble(stripQuotes(raw));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String stripQuotes(String raw) {
        String t = raw == null ? "" : raw.trim();
        if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.substring(1, t.length() - 1);
        }
        return t;
    }
}
