package com.knowledge.base.agent.run.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.engine.LinearWorkflowEngine;
import com.knowledge.base.agent.engine.MybatisAgentRunPersistence;
import com.knowledge.base.agent.engine.RunStatus;
import com.knowledge.base.agent.model.AgentModelClient;
import com.knowledge.base.agent.model.AgentModelResponse;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.mapper.AgentRunMapper;
import com.knowledge.base.agent.run.mapper.AgentRunStepMapper;
import com.knowledge.base.agent.run.mapper.AgentSessionMapper;
import com.knowledge.base.agent.tool.AgentTool;
import com.knowledge.base.agent.tool.AgentToolRegistry;
import com.knowledge.base.agent.tool.ToolContext;
import com.knowledge.base.agent.workflow.entity.AgentWorkflowVersionEntity;
import com.knowledge.base.agent.workflow.service.AgentWorkflowService;
import com.knowledge.base.agent.config.AgentProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.knowledge.base.common.exception.BusinessException;

/**
 * Run 服务：幂等与版本绑定单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class AgentRunServiceTest {

    private AgentRunMapper runMapper;
    private AgentWorkflowService workflowService;
    private MybatisAgentRunPersistence persistence;
    private AgentRunService service;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicLong ids = new AtomicLong(500);

    @BeforeEach
    void setUp() {
        runMapper = mock(AgentRunMapper.class);
        AgentRunStepMapper stepMapper = mock(AgentRunStepMapper.class);
        AgentSessionMapper sessionMapper = mock(AgentSessionMapper.class);
        workflowService = mock(AgentWorkflowService.class);
        persistence = mock(MybatisAgentRunPersistence.class);
        when(persistence.nextId()).thenAnswer(inv -> ids.incrementAndGet());

        AgentToolRegistry registry = new AgentToolRegistry(List.of(new AgentTool() {
            @Override
            public String name() {
                return "hybrid_search";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
                return Map.of("ok", true);
            }
        }));
        AgentModelClient model = req -> new AgentModelResponse("x", "stub", true);
        LinearWorkflowEngine engine = new LinearWorkflowEngine(
                registry, model, new AgentProperties(), persistence, objectMapper);

        // engine 会走 persistence.findRun/update — 用真实内存困难；此处仅测幂等短路
        service = new AgentRunService(sessionMapper, runMapper, stepMapper, workflowService,
                engine, persistence, objectMapper);
    }

    /**
     * 相同幂等键直接返回已有 Run，不插入
     */
    @Test
    void idempotentReturnsExisting() {
        AgentRunEntity existing = new AgentRunEntity();
        existing.setId(9L);
        existing.setUserId(1L);
        existing.setStatus(RunStatus.SUCCEEDED.name());
        existing.setIdempotencyKey("k1");
        when(persistence.findByIdempotency(1L, "k1")).thenReturn(existing);

        Map<String, Object> view = service.createAndExecute(
                1L, 100L, null, Map.of("q", "a"), "k1", "Bearer t");

        assertEquals(9L, view.get("id"));
        assertEquals("SUCCEEDED", view.get("status"));
        verify(runMapper, never()).insert(any(AgentRunEntity.class));
        verify(workflowService, never()).requireVersion(anyLong());
    }

    /**
     * 新 Run 必须绑定已发布版本定义
     */
    @Test
    void newRunUsesPublishedDefinition() {
        when(persistence.findByIdempotency(anyLong(), anyString())).thenReturn(null);
        AgentWorkflowVersionEntity ver = new AgentWorkflowVersionEntity();
        ver.setId(100L);
        ver.setDefinitionJson("""
                {"schemaVersion":1,"name":"t","nodes":[{"id":"a","type":"llm","input":{"prompt":"hi"}}],"edges":[]}
                """);
        when(workflowService.requireVersion(100L)).thenReturn(ver);

        // persistence 给 engine 用：插入后 find/update
        AgentRunEntity[] holder = new AgentRunEntity[1];
        when(persistence.findRun(anyLong())).thenAnswer(inv -> holder[0]);
        when(persistence.nextId()).thenAnswer(inv -> ids.incrementAndGet());
        org.mockito.Mockito.doAnswer(inv -> {
            holder[0] = inv.getArgument(0);
            return null;
        }).when(persistence).updateRun(any(AgentRunEntity.class));
        org.mockito.Mockito.doAnswer(inv -> null).when(persistence).insertStep(any(com.knowledge.base.agent.run.entity.AgentRunStepEntity.class));
        org.mockito.Mockito.doAnswer(inv -> null).when(persistence).updateStep(any(com.knowledge.base.agent.run.entity.AgentRunStepEntity.class));

        when(runMapper.insert(any(AgentRunEntity.class))).thenAnswer(inv -> {
            holder[0] = inv.getArgument(0);
            return 1;
        });
        when(runMapper.selectById(anyLong())).thenAnswer(inv -> holder[0]);

        Map<String, Object> view = service.createAndExecute(
                1L, 100L, null, Map.of(), null, "Bearer t");

        assertEquals("SUCCEEDED", view.get("status"));
        verify(workflowService).requireVersion(eq(100L));
        verify(runMapper).insert(any(AgentRunEntity.class));
    }

    /**
     * 草稿 Run 使用传入定义快照且不加载发布版本
     */
    @Test
    void draftRunUsesEditableDefinitionWithoutPublishedVersion() {
        String definition = """
                {"schemaVersion":1,"name":"draft","nodes":[{"id":"a","type":"llm","input":{"prompt":"hi"}}],"edges":[]}
                """;
        when(workflowService.validateEditableDefinition(30L, 1L, definition))
                .thenReturn(definition);
        AgentRunEntity[] holder = prepareExecutionPersistence();

        Map<String, Object> view = service.createAndExecuteDraft(
                1L, 30L, definition, null, Map.of(), "draft-key", "Bearer t");

        assertEquals("SUCCEEDED", view.get("status"));
        assertEquals("DRAFT", view.get("runSource"));
        assertEquals(null, view.get("workflowVersionId"));
        verify(workflowService, never()).requireVersion(anyLong());
        verify(workflowService).validateEditableDefinition(30L, 1L, definition);
        assertEquals("DRAFT", holder[0].getRunSource());
    }

    /**
     * 草稿和发布 Run 不共享同一个幂等结果
     */
    @Test
    void draftRunRejectsPublishedIdempotencyCollision() {
        AgentRunEntity existing = new AgentRunEntity();
        existing.setId(9L);
        existing.setUserId(1L);
        existing.setStatus(RunStatus.SUCCEEDED.name());
        existing.setIdempotencyKey("same-key");
        existing.setRunSource("PUBLISHED");
        when(persistence.findByIdempotency(1L, "same-key")).thenReturn(existing);

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.createAndExecuteDraft(
                        1L, 30L, "{}", null, Map.of(), "same-key", "Bearer t"));

        assertEquals(409, error.getCode());
    }

    private AgentRunEntity[] prepareExecutionPersistence() {
        AgentRunEntity[] holder = new AgentRunEntity[1];
        when(persistence.findByIdempotency(anyLong(), anyString())).thenReturn(null);
        when(persistence.findRun(anyLong())).thenAnswer(inv -> holder[0]);
        when(persistence.nextId()).thenAnswer(inv -> ids.incrementAndGet());
        org.mockito.Mockito.doAnswer(inv -> {
            holder[0] = inv.getArgument(0);
            return null;
        }).when(persistence).updateRun(any(AgentRunEntity.class));
        org.mockito.Mockito.doAnswer(inv -> null).when(persistence)
                .insertStep(any(com.knowledge.base.agent.run.entity.AgentRunStepEntity.class));
        org.mockito.Mockito.doAnswer(inv -> null).when(persistence)
                .updateStep(any(com.knowledge.base.agent.run.entity.AgentRunStepEntity.class));
        when(runMapper.insert(any(AgentRunEntity.class))).thenAnswer(inv -> {
            holder[0] = inv.getArgument(0);
            return 1;
        });
        when(runMapper.selectById(anyLong())).thenAnswer(inv -> holder[0]);
        return holder;
    }
}
