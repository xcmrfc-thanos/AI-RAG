package com.knowledge.base.agent.engine;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * 变量解析单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class VariableResolverTest {

    private final com.fasterxml.jackson.databind.ObjectMapper mapper =
            new com.fasterxml.jackson.databind.ObjectMapper();

    /**
     * 整段变量保留对象
     */
    @Test
    void wholeVarKeepsObject() {
        VariableResolver r = new VariableResolver(mapper,
                java.util.Map.of("query", "q"),
                java.util.Map.of("search", java.util.Map.of("hits", 1)));
        Object v = r.expandString("${steps.search.output}");
        assertEquals(java.util.Map.of("hits", 1), v);
    }

    /**
     * 非白名单语法拒绝
     */
    @Test
    void rejectScriptLike() {
        VariableResolver r = new VariableResolver(mapper, java.util.Map.of(), java.util.Map.of());
        assertThrows(ValidationException.class, () -> r.expandString("${input.query.toUpperCase()}"));
    }

    /**
     * 支持读取节点输出的嵌套字段和数组元素
     */
    @Test
    void resolvesNestedObjectAndArrayPath() {
        VariableResolver resolver = new VariableResolver(
                mapper,
                Map.of("query", "q"),
                Map.of(
                        "search", Map.of("hits", List.of(Map.of("documentId", 7L))),
                        "answer", Map.of("text", "ok")));

        assertEquals(7L,
                resolver.expandString("${steps.search.output.hits[0].documentId}"));
        assertEquals("ok",
                resolver.expandString("${steps.answer.output.text}"));
    }

    /**
     * 嵌入普通文本时将嵌套值转换为字符串
     */
    @Test
    void stringifiesNestedValueInsideTemplate() {
        VariableResolver resolver = new VariableResolver(
                mapper,
                Map.of(),
                Map.of("answer", Map.of("text", "完成")));

        assertEquals("结果：完成",
                resolver.expandString("结果：${steps.answer.output.text}"));
    }

    /**
     * 拒绝通配符、方法调用和缺失路径
     */
    @Test
    void rejectsUnsafeOrMissingNestedPath() {
        VariableResolver resolver = new VariableResolver(
                mapper,
                Map.of(),
                Map.of("search", Map.of("hits", List.of(Map.of("documentId", 7L)))));

        assertThrows(ValidationException.class,
                () -> resolver.expandString("${steps.search.output.hits[*]}"));
        assertThrows(ValidationException.class,
                () -> resolver.expandString("${steps.search.output.toString()}"));
        assertThrows(ValidationException.class,
                () -> resolver.expandString("${steps.search.output.hits[1].documentId}"));
    }
}
