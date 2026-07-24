package com.knowledge.base.agent.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 白名单变量解析：${input.x} / ${steps.nodeId.output}
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class VariableResolver {

    private static final Pattern FULL_VAR = Pattern.compile("^\\$\\{([^}]+)}$");
    private static final Pattern ANY_VAR = Pattern.compile("\\$\\{([^}]+)}");
    private static final String PATH_TAIL = "(?:\\.[a-zA-Z_][a-zA-Z0-9_]*|\\[[0-9]+])*";
    private static final Pattern INPUT_REF = Pattern.compile(
            "^input\\.([a-zA-Z_][a-zA-Z0-9_]*)(" + PATH_TAIL + ")$");
    private static final Pattern STEP_REF = Pattern.compile(
            "^steps\\.([a-zA-Z_][a-zA-Z0-9_]*)\\.output(" + PATH_TAIL + ")$");
    private static final Pattern PATH_SEGMENT = Pattern.compile(
            "\\.([a-zA-Z_][a-zA-Z0-9_]*)|\\[([0-9]+)]");

    private final ObjectMapper objectMapper;
    private final Map<String, Object> runInput;
    private final Map<String, Object> stepOutputs;

    /**
     * 构造解析器
     *
     * @param objectMapper JSON
     * @param runInput     Run 输入
     * @param stepOutputs  已成功节点输出（nodeId → output）
     */
    public VariableResolver(ObjectMapper objectMapper,
                            Map<String, Object> runInput,
                            Map<String, Object> stepOutputs) {
        this.objectMapper = objectMapper;
        this.runInput = runInput != null ? runInput : Map.of();
        this.stepOutputs = stepOutputs != null ? stepOutputs : Map.of();
    }

    /**
     * 展开 map 中的字符串模板（递归）
     *
     * @param source 源 map
     * @return 展开后的新 map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> expandMap(Map<String, Object> source) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (source == null) {
            return out;
        }
        for (Map.Entry<String, Object> e : source.entrySet()) {
            out.put(e.getKey(), expandValue(e.getValue()));
        }
        return out;
    }

    /**
     * 展开任意值
     *
     * @param value 原值
     * @return 展开值
     */
    /**
     * expandValue 方法。
     */
    @SuppressWarnings("unchecked")
    public Object expandValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String s) {
            return expandString(s);
        }
        if (value instanceof Map<?, ?> m) {
            Map<String, Object> cast = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : m.entrySet()) {
                cast.put(String.valueOf(e.getKey()), expandValue(e.getValue()));
            }
            return cast;
        }
        if (value instanceof List<?> list) {
            List<Object> out = new ArrayList<>();
            for (Object item : list) {
                out.add(expandValue(item));
            }
            return out;
        }
        return value;
    }

    /**
     * 展开字符串；整段为单一变量时保留对象类型
     *
     * @param template 模板
     * @return 展开结果
     */
    public Object expandString(String template) {
        if (template == null) {
            return null;
        }
        Matcher full = FULL_VAR.matcher(template.trim());
        if (full.matches()) {
            return resolveRef(full.group(1));
        }
        Matcher m = ANY_VAR.matcher(template);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            Object resolved = resolveRef(m.group(1));
            m.appendReplacement(sb, Matcher.quoteReplacement(stringify(resolved)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private Object resolveRef(String ref) {
        Matcher input = INPUT_REF.matcher(ref);
        if (input.matches()) {
            String key = input.group(1);
            if (!runInput.containsKey(key)) {
                throw new ValidationException("VALIDATION_ERROR", "缺失变量 ${input." + key + "}");
            }
            return resolvePath(runInput.get(key), input.group(2), ref);
        }
        Matcher step = STEP_REF.matcher(ref);
        if (step.matches()) {
            String nodeId = step.group(1);
            if (!stepOutputs.containsKey(nodeId)) {
                throw new ValidationException("VALIDATION_ERROR",
                        "缺失或不可引用变量 ${steps." + nodeId + ".output}");
            }
            return resolvePath(stepOutputs.get(nodeId), step.group(2), ref);
        }
        throw new ValidationException("VALIDATION_ERROR", "存在非白名单变量语法: ${" + ref + "}");
    }

    private Object resolvePath(Object current, String tail, String fullRef) {
        Matcher matcher = PATH_SEGMENT.matcher(tail != null ? tail : "");
        while (matcher.find()) {
            current = matcher.group(1) != null
                    ? readField(current, matcher.group(1), fullRef)
                    : readIndex(current, Integer.parseInt(matcher.group(2)), fullRef);
        }
        return current;
    }

    private Object readField(Object current, String field, String fullRef) {
        if (!(current instanceof Map<?, ?> map) || !map.containsKey(field)) {
            throw missingPath(fullRef);
        }
        return map.get(field);
    }

    private Object readIndex(Object current, int index, String fullRef) {
        if (current instanceof List<?> list) {
            if (index >= list.size()) {
                throw missingPath(fullRef);
            }
            return list.get(index);
        }
        if (current != null && current.getClass().isArray()) {
            if (index >= Array.getLength(current)) {
                throw missingPath(fullRef);
            }
            return Array.get(current, index);
        }
        throw missingPath(fullRef);
    }

    private ValidationException missingPath(String fullRef) {
        return new ValidationException("VALIDATION_ERROR", "变量路径不存在: ${" + fullRef + "}");
    }

    private String stringify(Object v) {
        if (v == null) {
            return "";
        }
        if (v instanceof String s) {
            return s;
        }
        if (v instanceof Number || v instanceof Boolean) {
            return String.valueOf(v);
        }
        try {
            return objectMapper.writeValueAsString(v);
        } catch (JsonProcessingException e) {
            return String.valueOf(v);
        }
    }
}
