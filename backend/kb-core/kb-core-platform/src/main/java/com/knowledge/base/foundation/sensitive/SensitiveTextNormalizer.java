package com.knowledge.base.foundation.sensitive;

import java.util.Map;

/**
 * L1.5 文本归一化：全半角、去干扰符、谐音映射、ASCII 小写。
 */
public final class SensitiveTextNormalizer {

    private SensitiveTextNormalizer() {
    }

    /**
     * 归一化文本，供 AC 匹配使用。
     *
     * @param raw        原文
     * @param homophones 谐音/形近映射表（可空）
     * @return 归一化结果；空输入返回空串
     */
    public static String normalize(String raw, Map<String, String> homophones) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = toHalfWidth(raw.charAt(i));
            if (isIgnorableSeparator(c)) {
                continue;
            }
            if (c >= 'A' && c <= 'Z') {
                c = (char) (c + 32);
            }
            sb.append(c);
        }
        String s = sb.toString();
        if (homophones != null && !homophones.isEmpty()) {
            for (Map.Entry<String, String> e : homophones.entrySet()) {
                if (e.getKey() != null && e.getValue() != null && !e.getKey().isEmpty()) {
                    s = s.replace(e.getKey(), e.getValue());
                }
            }
        }
        return s;
    }

    /**
     * 全角字符转半角。
     *
     * @param c 原字符
     * @return 半角字符
     */
    private static char toHalfWidth(char c) {
        if (c == 12288) {
            return ' ';
        }
        if (c >= 65281 && c <= 65374) {
            return (char) (c - 65248);
        }
        return c;
    }

    /**
     * 判断是否为可忽略的干扰符（空白、插符等）。
     *
     * @param c 字符
     * @return true 表示归一化时丢弃
     */
    private static boolean isIgnorableSeparator(char c) {
        if (Character.isWhitespace(c)) {
            return true;
        }
        return c == '*' || c == '·' || c == '•' || c == '_' || c == '-' || c == '.'
                || c == '|' || c == '/' || c == '\\' || c == '♥' || c == '❤' || c == '☆'
                || c == '★' || c == '〇' || c == '○';
    }
}
