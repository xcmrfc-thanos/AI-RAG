package com.knowledge.base.agent.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Agent 权限码与契约一致性
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class AgentPermissionConstantsTest {

    /**
     * 权限码与任务 64/70 冻结值一致
     */
    @Test
    void codesMatchContract() {
        assertEquals("agent:workflow:view", AgentPermissionConstants.WORKFLOW_VIEW);
        assertEquals("agent:run", AgentPermissionConstants.RUN);
        assertEquals("agent:workflow:edit", AgentPermissionConstants.WORKFLOW_EDIT);
        assertEquals("agent:workflow:publish", AgentPermissionConstants.WORKFLOW_PUBLISH);
    }
}
