package com.knowledge.base.agent.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.engine.LinearWorkflowEngine;
import com.knowledge.base.agent.engine.MybatisAgentRunPersistence;
import com.knowledge.base.agent.workflow.entity.AgentWorkflowEntity;
import com.knowledge.base.agent.workflow.mapper.AgentWorkflowMapper;
import com.knowledge.base.agent.workflow.mapper.AgentWorkflowVersionMapper;
import com.knowledge.base.agent.workflow.service.AgentWorkflowService;
import com.knowledge.base.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 草稿试运行前的工作流所有权与定义校验
 */
class AgentWorkflowDraftValidationTest {

    @Test
    void ownerCanValidateSuppliedDraftSnapshot() {
        AgentWorkflowMapper workflowMapper = mock(AgentWorkflowMapper.class);
        LinearWorkflowEngine engine = mock(LinearWorkflowEngine.class);
        AgentWorkflowEntity workflow = workflow(10L, 2L);
        when(workflowMapper.selectById(10L)).thenReturn(workflow);
        AgentWorkflowService service = service(workflowMapper, engine);
        String definition = "{\"schemaVersion\":1}";

        assertEquals(definition,
                service.validateEditableDefinition(10L, 2L, definition));
        verify(engine).validateDefinition(definition);
    }

    @Test
    void nonOwnerCannotValidateDraftSnapshot() {
        AgentWorkflowMapper workflowMapper = mock(AgentWorkflowMapper.class);
        AgentWorkflowEntity workflow = workflow(10L, 2L);
        when(workflowMapper.selectById(10L)).thenReturn(workflow);
        AgentWorkflowService service = service(workflowMapper, mock(LinearWorkflowEngine.class));

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.validateEditableDefinition(10L, 3L, "{}"));
        assertEquals(403, error.getCode());
    }

    private AgentWorkflowService service(AgentWorkflowMapper workflowMapper,
                                         LinearWorkflowEngine engine) {
        return new AgentWorkflowService(
                workflowMapper,
                mock(AgentWorkflowVersionMapper.class),
                engine,
                mock(MybatisAgentRunPersistence.class),
                new ObjectMapper());
    }

    private AgentWorkflowEntity workflow(Long id, Long ownerId) {
        AgentWorkflowEntity workflow = new AgentWorkflowEntity();
        workflow.setId(id);
        workflow.setOwnerUserId(ownerId);
        return workflow;
    }
}
