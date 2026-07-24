package com.knowledge.base.agent.tool;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;

/**
 * 将已由 VariableResolver 展开的模板输出为稳定 text 字段
 */
@Component
public class TextTemplateTool implements AgentTool {

    /**
     * name 方法。
     */
    @Override
    public String name() {
        return "text_template";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Object raw = input != null ? input.get("template") : null;
        String template = raw != null ? String.valueOf(raw) : null;
        if (!StringUtils.hasText(template)) {
            throw new ToolException("INVALID_ARGUMENT", name(), "template 必填");
        }
        if (template.length() > 10000) {
            throw new ToolException("INVALID_ARGUMENT", name(), "template 长度不能超过 10000");
        }
        return Map.of("text", template);
    }
}
