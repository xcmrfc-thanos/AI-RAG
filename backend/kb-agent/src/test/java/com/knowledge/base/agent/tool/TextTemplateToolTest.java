package com.knowledge.base.agent.tool;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * 安全文本模板工具测试
 */
class TextTemplateToolTest {

    @Test
    void returnsAlreadyResolvedTemplateAsText() {
        Map<String, Object> out = new TextTemplateTool().execute(
                Map.of("template", "标题：Agent\n内容：已完成"),
                new ToolContext("Bearer token", 1L, 2L));

        assertEquals("标题：Agent\n内容：已完成", out.get("text"));
    }

    @Test
    void rejectsBlankOrOversizedTemplate() {
        TextTemplateTool tool = new TextTemplateTool();
        assertThrows(ToolException.class,
                () -> tool.execute(Map.of("template", " "), new ToolContext("t", 1L, 1L)));
        assertThrows(ToolException.class,
                () -> tool.execute(Map.of("template", "x".repeat(10001)), new ToolContext("t", 1L, 1L)));
    }
}
