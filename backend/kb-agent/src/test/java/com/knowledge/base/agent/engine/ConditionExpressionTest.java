package com.knowledge.base.agent.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 条件表达式求值单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class ConditionExpressionTest {

    /**
     * 数值比较与布尔字面量
     */
    @Test
    void comparesNumbersAndBooleans() {
        assertTrue(ConditionExpression.evaluate("80 >= 60"));
        assertFalse(ConditionExpression.evaluate("10 > 20"));
        assertTrue(ConditionExpression.evaluate("true"));
        assertFalse(ConditionExpression.evaluate("false"));
        assertTrue(ConditionExpression.evaluate("\"ok\" == \"ok\""));
        assertFalse(ConditionExpression.evaluate("\"a\" == \"b\""));
    }

    /**
     * 空表达式拒绝
     */
    @Test
    void blankRejected() {
        assertThrows(ValidationException.class, () -> ConditionExpression.evaluate("  "));
    }
}
