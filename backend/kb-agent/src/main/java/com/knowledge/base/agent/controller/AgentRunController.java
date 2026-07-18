package com.knowledge.base.agent.controller;

import com.knowledge.base.agent.run.service.AgentRunService;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.utils.UserContextUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Agent Session / Run API（任务 68）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Tag(name = "Agent Run")
@RestController
@RequiredArgsConstructor
public class AgentRunController {

    private final AgentRunService runService;

    /**
     * 创建 Session
     *
     * @param req 请求
     * @return Session
     */
    @Operation(summary = "创建 Session")
    @PostMapping("/sessions")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).RUN)")
    public Result<Map<String, Object>> createSession(@RequestBody CreateSessionRequest req) {
        return Result.success(runService.createSession(
                UserContextUtil.getUserId(),
                req != null ? req.getTitle() : null));
    }

    /**
     * 发起 Run（同步执行至终态）
     *
     * @param req     请求
     * @param request HTTP 请求（取 Authorization）
     * @return Run
     */
    @Operation(summary = "发起 Run（绑定已发布 workflowVersionId）")
    @PostMapping("/runs")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).RUN)")
    public Result<Map<String, Object>> createRun(@RequestBody CreateRunRequest req,
                                                 HttpServletRequest request) {
        return Result.success(runService.createAndExecute(
                UserContextUtil.getUserId(),
                req.getWorkflowVersionId(),
                req.getSessionId(),
                req.getInput(),
                req.getIdempotencyKey(),
                request.getHeader(HttpHeaders.AUTHORIZATION)));
    }

    /**
     * 查询 Run
     *
     * @param id Run ID
     * @return Run
     */
    @Operation(summary = "查询 Run")
    @GetMapping("/runs/{id}")
    @PreAuthorize("hasAnyAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).RUN, T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_VIEW)")
    public Result<Map<String, Object>> getRun(@PathVariable("id") Long id) {
        return Result.success(runService.getRun(id, UserContextUtil.getUserId()));
    }

    /**
     * Step 轨迹
     *
     * @param id Run ID
     * @return steps
     */
    @Operation(summary = "查询 Run Step 轨迹")
    @GetMapping("/runs/{id}/steps")
    @PreAuthorize("hasAnyAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).RUN, T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_VIEW)")
    public Result<List<Map<String, Object>>> steps(@PathVariable("id") Long id) {
        return Result.success(runService.listSteps(id, UserContextUtil.getUserId()));
    }

    /**
     * 取消 Run
     *
     * @param id Run ID
     * @return Run
     */
    @Operation(summary = "协作式取消 Run")
    @PostMapping("/runs/{id}/cancel")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).RUN)")
    public Result<Map<String, Object>> cancel(@PathVariable("id") Long id) {
        return Result.success(runService.cancel(id, UserContextUtil.getUserId()));
    }

    /**
     * 创建 Session 请求
     */
    @Data
    public static class CreateSessionRequest {
        private String title;
    }

    /**
     * 创建 Run 请求
     */
    @Data
    public static class CreateRunRequest {
        private Long workflowVersionId;
        private Long sessionId;
        private Map<String, Object> input;
        private String idempotencyKey;
    }
}
