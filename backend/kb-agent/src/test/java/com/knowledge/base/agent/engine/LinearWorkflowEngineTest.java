package com.knowledge.base.agent.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.agent.model.AgentModelClient;
import com.knowledge.base.agent.model.AgentModelRequest;
import com.knowledge.base.agent.model.AgentModelResponse;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;
import com.knowledge.base.agent.tool.AgentTool;
import com.knowledge.base.agent.tool.AgentToolRegistry;
import com.knowledge.base.agent.tool.ToolContext;
import com.knowledge.base.agent.tool.ToolException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 任务 67：线性引擎单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class LinearWorkflowEngineTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private InMemoryAgentRunPersistence persistence;
    private AgentProperties properties;
    private AtomicInteger toolCalls;
    private AtomicInteger llmCalls;
    private LinearWorkflowEngine engine;

    @BeforeEach
    void setUp() {
        persistence = new InMemoryAgentRunPersistence();
        properties = new AgentProperties();
        properties.getTimeouts().setRunSeconds(90);
        toolCalls = new AtomicInteger();
        llmCalls = new AtomicInteger();

        AgentTool search = new AgentTool() {
            @Override
            public String name() {
                return "hybrid_search";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
                toolCalls.incrementAndGet();
                return Map.of("hits", List.of(Map.of("title", "doc")), "query", input.get("query"));
            }
        };
        AgentTool failDoc = new AgentTool() {
            @Override
            public String name() {
                return "get_document";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
                toolCalls.incrementAndGet();
                throw new ToolException("HTTP_404", name(), "not found");
            }
        };
        AgentToolRegistry registry = new AgentToolRegistry(List.of(search, failDoc));
        AgentModelClient model = (AgentModelRequest request) -> {
            llmCalls.incrementAndGet();
            return new AgentModelResponse("answer:" + request.userPrompt(), "stub", true);
        };
        engine = new LinearWorkflowEngine(registry, model, properties, persistence, objectMapper);
    }

    /**
     * 合法线性图：tool → llm 成功
     */
    @Test
    void successToolThenLlm() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "qa",
                  "nodes": [
                    {"id": "search", "type": "tool", "tool": "hybrid_search",
                     "input": {"query": "${input.query}", "topK": 5}},
                    {"id": "answer", "type": "llm",
                     "input": {"prompt": "Q=${input.query} D=${steps.search.output}"}}
                  ],
                  "edges": [{"from": "search", "to": "answer"}]
                }
                """;
        AgentRunEntity run = newRun(1L, Map.of("query", "hello"));
        AgentRunEntity result = engine.execute(1L, json, "Bearer t", () -> false);
        assertEquals("SUCCEEDED", result.getStatus());
        assertEquals(1, toolCalls.get());
        assertEquals(1, llmCalls.get());
        assertEquals(2, persistence.stepCount());
        assertTrue(result.getOutputJson().contains("answer:"));
    }

    /**
     * 工具失败短路，不调后续 LLM
     */
    @Test
    void toolFailureShortCircuits() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "fail",
                  "nodes": [
                    {"id": "doc", "type": "tool", "tool": "get_document",
                     "input": {"documentId": 1}},
                    {"id": "answer", "type": "llm",
                     "input": {"prompt": "x"}}
                  ],
                  "edges": [{"from": "doc", "to": "answer"}]
                }
                """;
        newRun(2L, Map.of());
        AgentRunEntity result = engine.execute(2L, json, "Bearer t", () -> false);
        assertEquals("FAILED", result.getStatus());
        assertEquals("HTTP_404", result.getErrorCode());
        assertEquals(1, toolCalls.get());
        assertEquals(0, llmCalls.get());
    }

    /**
     * 环图在校验阶段拒绝
     */
    @Test
    void rejectCycle() {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "cycle",
                  "nodes": [
                    {"id": "a", "type": "llm", "input": {"prompt": "1"}},
                    {"id": "b", "type": "llm", "input": {"prompt": "2"}}
                  ],
                  "edges": [{"from": "a", "to": "b"}, {"from": "b", "to": "a"}]
                }
                """;
        assertThrows(ValidationException.class, () -> engine.validateDefinition(json));
    }

    /**
     * 非条件节点并行出边仍拒绝
     */
    @Test
    void rejectParallel() {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "parallel",
                  "nodes": [
                    {"id": "a", "type": "llm", "input": {"prompt": "1"}},
                    {"id": "b", "type": "llm", "input": {"prompt": "2"}},
                    {"id": "c", "type": "llm", "input": {"prompt": "3"}}
                  ],
                  "edges": [{"from": "a", "to": "b"}, {"from": "a", "to": "c"}]
                }
                """;
        ValidationException ex = assertThrows(ValidationException.class,
                () -> engine.validateDefinition(json));
        assertEquals("INVALID_GRAPH", ex.getCode());
        assertTrue(ex.getMessage().contains("并行"));
    }

    /**
     * 条件真分支：只执行 true 路径，汇合后结束
     */
    @Test
    void conditionTruePathJoins() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "cond-true",
                  "nodes": [
                    {"id": "gate", "type": "condition",
                     "input": {"expression": "${input.score} >= 60"}},
                    {"id": "pass", "type": "llm", "input": {"prompt": "pass"}},
                    {"id": "fail", "type": "llm", "input": {"prompt": "fail"}},
                    {"id": "join", "type": "llm", "input": {"prompt": "done-${steps.gate.output.result}"}}
                  ],
                  "edges": [
                    {"from": "gate", "to": "pass", "when": "true"},
                    {"from": "gate", "to": "fail", "when": "false"},
                    {"from": "pass", "to": "join"},
                    {"from": "fail", "to": "join"}
                  ]
                }
                """;
        newRun(10L, Map.of("score", 80));
        AgentRunEntity result = engine.execute(10L, json, "Bearer t", () -> false);
        assertEquals("SUCCEEDED", result.getStatus());
        assertEquals(2, llmCalls.get());
        assertEquals(3, persistence.stepCount());
        assertTrue(result.getOutputJson().contains("done-true"));
    }

    /**
     * 条件假分支：走 false 路径后汇合
     */
    @Test
    void conditionFalsePath() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "cond-false",
                  "nodes": [
                    {"id": "gate", "type": "condition",
                     "input": {"expression": "${input.flag}"}},
                    {"id": "yes", "type": "llm", "input": {"prompt": "yes"}},
                    {"id": "no", "type": "llm", "input": {"prompt": "no"}},
                    {"id": "join", "type": "llm", "input": {"prompt": "tail"}}
                  ],
                  "edges": [
                    {"from": "gate", "to": "yes", "when": "true"},
                    {"from": "gate", "to": "no", "when": "false"},
                    {"from": "yes", "to": "join"},
                    {"from": "no", "to": "join"}
                  ]
                }
                """;
        newRun(11L, Map.of("flag", false));
        AgentRunEntity result = engine.execute(11L, json, "Bearer t", () -> false);
        assertEquals("SUCCEEDED", result.getStatus());
        assertEquals(2, llmCalls.get());
        assertTrue(result.getOutputJson().contains("answer:tail"));
    }

    /**
     * 条件节点缺少 when 标签时校验失败
     */
    @Test
    void rejectConditionWithoutWhen() {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "bad-cond",
                  "nodes": [
                    {"id": "gate", "type": "condition", "input": {"expression": "true"}},
                    {"id": "a", "type": "llm", "input": {"prompt": "1"}},
                    {"id": "b", "type": "llm", "input": {"prompt": "2"}}
                  ],
                  "edges": [
                    {"from": "gate", "to": "a"},
                    {"from": "gate", "to": "b"}
                  ]
                }
                """;
        ValidationException ex = assertThrows(ValidationException.class,
                () -> engine.validateDefinition(json));
        assertEquals("INVALID_GRAPH", ex.getCode());
    }

    /**
     * 缺失变量 → FAILED
     */
    @Test
    void missingVariableFailsRun() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "miss",
                  "nodes": [
                    {"id": "answer", "type": "llm",
                     "input": {"prompt": "${input.missing}"}}
                  ],
                  "edges": []
                }
                """;
        newRun(3L, Map.of("query", "x"));
        AgentRunEntity result = engine.execute(3L, json, "Bearer t", () -> false);
        assertEquals("FAILED", result.getStatus());
        assertEquals("VALIDATION_ERROR", result.getErrorCode());
        assertEquals(0, llmCalls.get());
    }

    /**
     * 协作式取消：当前节点后不再启动下一节点
     */
    @Test
    void cancelStopsBeforeNextNode() throws Exception {
        AtomicBoolean cancel = new AtomicBoolean(false);
        AgentTool slowSearch = new AgentTool() {
            @Override
            public String name() {
                return "hybrid_search";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
                toolCalls.incrementAndGet();
                cancel.set(true);
                return Map.of("ok", true);
            }
        };
        AgentToolRegistry registry = new AgentToolRegistry(List.of(slowSearch));
        AgentModelClient model = req -> {
            llmCalls.incrementAndGet();
            return new AgentModelResponse("nope", "stub", true);
        };
        engine = new LinearWorkflowEngine(registry, model, properties, persistence, objectMapper);

        String json = """
                {
                  "schemaVersion": 1,
                  "name": "cancel",
                  "nodes": [
                    {"id": "search", "type": "tool", "tool": "hybrid_search",
                     "input": {"query": "q"}},
                    {"id": "answer", "type": "llm", "input": {"prompt": "p"}}
                  ],
                  "edges": [{"from": "search", "to": "answer"}]
                }
                """;
        newRun(4L, Map.of());
        AgentRunEntity result = engine.execute(4L, json, "Bearer t", cancel::get);
        assertEquals("CANCELLED", result.getStatus());
        assertEquals(1, toolCalls.get());
        assertEquals(0, llmCalls.get());
    }

    /**
     * 终态 Run 重复执行不重跑
     */
    @Test
    void terminalRunNotReexecuted() throws Exception {
        String json = """
                {
                  "schemaVersion": 1,
                  "name": "once",
                  "nodes": [{"id": "answer", "type": "llm", "input": {"prompt": "hi"}}],
                  "edges": []
                }
                """;
        newRun(5L, Map.of());
        engine.execute(5L, json, "Bearer t", () -> false);
        assertEquals(1, llmCalls.get());
        AgentRunEntity again = engine.execute(5L, json, "Bearer t", () -> false);
        assertEquals("SUCCEEDED", again.getStatus());
        assertEquals(1, llmCalls.get());
    }

    /**
     * 非法状态转换拒绝
     */
    @Test
    void invalidStatusTransitionRejected() {
        assertThrows(ValidationException.class,
                () -> RunStatus.assertTransition(RunStatus.SUCCEEDED, RunStatus.RUNNING));
    }

    private AgentRunEntity newRun(Long id, Map<String, Object> input) throws Exception {
        AgentRunEntity run = new AgentRunEntity();
        run.setId(id);
        run.setWorkflowVersionId(10L);
        run.setUserId(1L);
        run.setStatus(RunStatus.CREATED.name());
        run.setInputJson(objectMapper.writeValueAsString(input));
        run.setCancelRequested(0);
        persistence.putRun(run);
        return run;
    }
}
