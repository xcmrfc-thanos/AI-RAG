package com.knowledge.base.agent.tool;

import org.springframework.util.StringUtils;

/**
 * Agent Tool 输入值校验辅助
 */
final class ToolInputSupport {

    private ToolInputSupport() {
    }

    static String text(Object value, int maxLength, String field, String tool) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        if (text.length() > maxLength) {
            throw new ToolException("INVALID_ARGUMENT", tool,
                    field + " 长度不能超过 " + maxLength);
        }
        return text;
    }

    static int integer(Object value, int defaultValue, int min, int max,
                       String field, String tool) {
        int result = defaultValue;
        if (value instanceof Number number) {
            result = number.intValue();
        } else if (value != null) {
            try {
                result = Integer.parseInt(String.valueOf(value).trim());
            } catch (NumberFormatException e) {
                throw new ToolException("INVALID_ARGUMENT", tool, field + " 须为整数");
            }
        }
        if (result < min || result > max) {
            throw new ToolException("INVALID_ARGUMENT", tool,
                    field + " 须为 " + min + "～" + max);
        }
        return result;
    }

    static Long positiveLong(Object value, String field, String tool) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        try {
            long result = Long.parseLong(String.valueOf(value).trim());
            if (result <= 0) {
                throw new NumberFormatException();
            }
            return result;
        } catch (NumberFormatException e) {
            throw new ToolException("INVALID_ARGUMENT", tool, field + " 须为正整数");
        }
    }
}
