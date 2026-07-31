package com.knowledge.base.mcp.support;

import com.knowledge.base.mcp.config.McpProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link McpServerGate} 单测：默认关闭与 requireEnabled
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class McpServerGateTest {

    /**
     * 默认 enabled=false 时 isEnabled 为假且 requireEnabled 抛异常
     */
    @Test
    void defaultDisabled() {
        McpProperties props = new McpProperties();
        McpServerGate gate = new McpServerGate(props);
        assertFalse(gate.isEnabled());
        assertThrows(McpDisabledException.class, gate::requireEnabled);
    }

    /**
     * 显式启用后放行
     */
    @Test
    void enabledAllows() {
        McpProperties props = new McpProperties();
        props.getServer().setEnabled(true);
        McpServerGate gate = new McpServerGate(props);
        assertTrue(gate.isEnabled());
        gate.requireEnabled();
    }
}
