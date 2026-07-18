package com.knowledge.base.agent.run.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.engine.LinearWorkflowEngine;
import com.knowledge.base.agent.engine.MybatisAgentRunPersistence;
import com.knowledge.base.agent.engine.RunStatus;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;
import com.knowledge.base.agent.run.entity.AgentSessionEntity;
import com.knowledge.base.agent.run.mapper.AgentRunMapper;
import com.knowledge.base.agent.run.mapper.AgentRunStepMapper;
import com.knowledge.base.agent.run.mapper.AgentSessionMapper;
import com.knowledge.base.agent.workflow.entity.AgentWorkflowVersionEntity;
import com.knowledge.base.agent.workflow.service.AgentWorkflowService;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.ResultCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Session / Run 服务（任务 68）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
public class AgentRunService {

    private static final String SOURCE_PUBLISHED = "PUBLISHED";
    private static final String SOURCE_DRAFT = "DRAFT";

    private final AgentSessionMapper sessionMapper;
    private final AgentRunMapper runMapper;
    private final AgentRunStepMapper stepMapper;
    private final AgentWorkflowService workflowService;
    private final LinearWorkflowEngine engine;
    private final MybatisAgentRunPersistence persistence;
    private final ObjectMapper objectMapper;

    /**
     * 创建 Session
     *
     * @param userId 用户
     * @param title  标题
     * @return 摘要
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createSession(Long userId, String title) {
        AgentSessionEntity s = new AgentSessionEntity();
        s.setId(persistence.nextId());
        s.setUserId(userId);
        s.setTitle(title);
        s.setCreatedAt(LocalDateTime.now());
        s.setDeleted(0);
        sessionMapper.insert(s);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("title", s.getTitle());
        m.put("createdAt", s.getCreatedAt());
        return m;
    }

    /**
     * 创建并同步执行 Run（MVP 非流式）
     *
     * @param userId             用户
     * @param workflowVersionId  已发布版本
     * @param sessionId          可选会话
     * @param input              输入
     * @param idempotencyKey     幂等键
     * @param authorization      Bearer Token
     * @return Run 视图
     */
    public Map<String, Object> createAndExecute(Long userId,
                                                Long workflowVersionId,
                                                Long sessionId,
                                                Map<String, Object> input,
                                                String idempotencyKey,
                                                String authorization) {
        assertAuthenticated(userId);
        Map<String, Object> idempotent = existingView(userId, idempotencyKey, SOURCE_PUBLISHED);
        if (idempotent != null) {
            return idempotent;
        }
        AgentWorkflowVersionEntity ver = workflowService.requireVersion(workflowVersionId);
        return createAndExecuteDefinition(userId, ver.getId(), SOURCE_PUBLISHED,
                ver.getDefinitionJson(), sessionId, input, idempotencyKey, authorization);
    }

    /**
     * 使用当前草稿定义快照创建并执行 Run
     */
    public Map<String, Object> createAndExecuteDraft(Long userId,
                                                     Long workflowId,
                                                     String definitionJson,
                                                     Long sessionId,
                                                     Map<String, Object> input,
                                                     String idempotencyKey,
                                                     String authorization) {
        assertAuthenticated(userId);
        Map<String, Object> idempotent = existingView(userId, idempotencyKey, SOURCE_DRAFT);
        if (idempotent != null) {
            return idempotent;
        }
        String definition = workflowService.validateEditableDefinition(
                workflowId, userId, definitionJson);
        return createAndExecuteDefinition(userId, null, SOURCE_DRAFT,
                definition, sessionId, input, idempotencyKey, authorization);
    }

    private Map<String, Object> createAndExecuteDefinition(Long userId,
                                                           Long workflowVersionId,
                                                           String runSource,
                                                           String definitionJson,
                                                           Long sessionId,
                                                           Map<String, Object> input,
                                                           String idempotencyKey,
                                                           String authorization) {
        validateSession(userId, sessionId);

        AgentRunEntity run = new AgentRunEntity();
        run.setId(persistence.nextId());
        run.setWorkflowVersionId(workflowVersionId);
        run.setRunSource(runSource);
        run.setUserId(userId);
        run.setSessionId(sessionId);
        try {
            run.setInputJson(objectMapper.writeValueAsString(input != null ? input : Map.of()));
        } catch (Exception e) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "input 无法序列化");
        }
        run.setStatus(RunStatus.CREATED.name());
        run.setIdempotencyKey(StringUtils.hasText(idempotencyKey) ? idempotencyKey : null);
        run.setCancelRequested(0);
        run.setCreatedAt(LocalDateTime.now());
        try {
            runMapper.insert(run);
        } catch (Exception e) {
            // 并发幂等冲突
            if (StringUtils.hasText(idempotencyKey)) {
                AgentRunEntity existing = persistence.findByIdempotency(userId, idempotencyKey);
                if (existing != null) {
                    return requireSameSource(existing, runSource);
                }
            }
            throw new BusinessException(409, "Run 创建冲突: " + e.getMessage());
        }

        AgentRunEntity finished = engine.execute(run.getId(), definitionJson, authorization, () -> {
            AgentRunEntity latest = runMapper.selectById(run.getId());
            return latest != null && latest.getCancelRequested() != null && latest.getCancelRequested() == 1;
        });
        return toRunView(finished);
    }

    private void assertAuthenticated(Long userId) {
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
    }

    private void validateSession(Long userId, Long sessionId) {
        if (sessionId == null) {
            return;
        }
        AgentSessionEntity session = sessionMapper.selectById(sessionId);
        if (session == null || !userId.equals(session.getUserId())) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "Session 不存在");
        }
    }

    private Map<String, Object> existingView(Long userId, String key, String source) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        AgentRunEntity existing = persistence.findByIdempotency(userId, key);
        return existing != null ? requireSameSource(existing, source) : null;
    }

    private Map<String, Object> requireSameSource(AgentRunEntity existing, String expectedSource) {
        String actual = StringUtils.hasText(existing.getRunSource())
                ? existing.getRunSource() : SOURCE_PUBLISHED;
        if (!expectedSource.equals(actual)) {
            throw new BusinessException(409, "幂等键已被其他 Run 类型使用");
        }
        return toRunView(existing);
    }

    /**
     * 查询 Run（仅本人）
     *
     * @param runId  Run ID
     * @param userId 用户
     * @return 视图
     */
    public Map<String, Object> getRun(Long runId, Long userId) {
        return toRunView(requireOwnedRun(runId, userId));
    }

    /**
     * Step 轨迹
     *
     * @param runId  Run ID
     * @param userId 用户
     * @return steps
     */
    public List<Map<String, Object>> listSteps(Long runId, Long userId) {
        requireOwnedRun(runId, userId);
        return stepMapper.selectList(new LambdaQueryWrapper<AgentRunStepEntity>()
                        .eq(AgentRunStepEntity::getRunId, runId)
                        .orderByAsc(AgentRunStepEntity::getId))
                .stream()
                .map(this::toStepView)
                .collect(Collectors.toList());
    }

    /**
     * 协作式取消
     *
     * @param runId  Run ID
     * @param userId 用户
     * @return 视图
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> cancel(Long runId, Long userId) {
        AgentRunEntity run = requireOwnedRun(runId, userId);
        RunStatus status = RunStatus.valueOf(run.getStatus());
        if (status.isTerminal()) {
            return toRunView(run);
        }
        run.setCancelRequested(1);
        runMapper.updateById(run);
        Map<String, Object> view = toRunView(run);
        view.put("cancelHint", "取消请求已提交，将在当前节点结束后生效");
        return view;
    }

    private AgentRunEntity requireOwnedRun(Long runId, Long userId) {
        AgentRunEntity run = runMapper.selectById(runId);
        if (run == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "Run 不存在");
        }
        if (!userId.equals(run.getUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN.getCode(), "无权查看该 Run");
        }
        return run;
    }

    private Map<String, Object> toRunView(AgentRunEntity r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("workflowVersionId", r.getWorkflowVersionId());
        m.put("runSource", StringUtils.hasText(r.getRunSource())
                ? r.getRunSource() : SOURCE_PUBLISHED);
        m.put("sessionId", r.getSessionId());
        m.put("status", r.getStatus());
        m.put("errorCode", r.getErrorCode());
        m.put("errorMessage", r.getErrorMessage());
        m.put("inputJson", r.getInputJson());
        m.put("outputJson", r.getOutputJson());
        m.put("idempotencyKey", r.getIdempotencyKey());
        m.put("cancelRequested", r.getCancelRequested());
        m.put("startedAt", r.getStartedAt());
        m.put("finishedAt", r.getFinishedAt());
        m.put("durationMs", r.getDurationMs());
        m.put("createdAt", r.getCreatedAt());
        return m;
    }

    private Map<String, Object> toStepView(AgentRunStepEntity s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("runId", s.getRunId());
        m.put("nodeId", s.getNodeId());
        m.put("nodeType", s.getNodeType());
        m.put("toolName", s.getToolName());
        m.put("status", s.getStatus());
        m.put("inputSnapshot", s.getInputSnapshot());
        m.put("outputSnapshot", s.getOutputSnapshot());
        m.put("errorMessage", s.getErrorMessage());
        m.put("startedAt", s.getStartedAt());
        m.put("finishedAt", s.getFinishedAt());
        m.put("durationMs", s.getDurationMs());
        return m;
    }
}
