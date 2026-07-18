package com.knowledge.base.agent.controller;

import com.knowledge.base.agent.workflow.service.AgentWorkflowService;
import com.knowledge.base.agent.run.service.AgentRunService;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.utils.UserContextUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Agent 工作流管理 API（任务 68）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Tag(name = "Agent Workflow")
@RestController
@RequestMapping("/workflows")
@RequiredArgsConstructor
public class AgentWorkflowController {

    private final AgentWorkflowService workflowService;
    private final AgentRunService runService;

    /**
     * 创建草稿
     *
     * @param req 请求
     * @return 工作流
     */
    @Operation(summary = "创建草稿工作流")
    @PostMapping
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<Map<String, Object>> create(@RequestBody CreateWorkflowRequest req) {
        return Result.success(workflowService.createDraft(
                req.getName(), req.getDraftJson(), UserContextUtil.getUserId()));
    }

    /**
     * 更新草稿
     *
     * @param id  工作流 ID
     * @param req 请求
     * @return 摘要
     */
    @Operation(summary = "更新草稿 JSON")
    @PutMapping("/{id}/draft")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<Map<String, Object>> updateDraft(@PathVariable("id") Long id,
                                                   @RequestBody UpdateDraftRequest req) {
        return Result.success(workflowService.updateDraft(id, req.getDraftJson(), UserContextUtil.getUserId()));
    }

    /**
     * 校验草稿
     *
     * @param id 工作流 ID
     * @return 校验结果
     */
    @Operation(summary = "校验草稿")
    @PostMapping("/{id}/validate")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<Map<String, Object>> validate(@PathVariable("id") Long id) {
        return Result.success(workflowService.validateDraft(id));
    }

    /**
     * 使用当前草稿定义快照试运行，不创建发布版本
     */
    @Operation(summary = "试运行草稿工作流")
    @PostMapping("/{id}/draft-runs")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<Map<String, Object>> draftRun(@PathVariable("id") Long id,
                                                @RequestBody DraftRunRequest req,
                                                HttpServletRequest request) {
        return Result.success(runService.createAndExecuteDraft(
                UserContextUtil.getUserId(),
                id,
                req.getDefinitionJson(),
                req.getSessionId(),
                req.getInput(),
                req.getIdempotencyKey(),
                request.getHeader(HttpHeaders.AUTHORIZATION)));
    }

    /**
     * 发布
     *
     * @param id 工作流 ID
     * @return 版本信息
     */
    @Operation(summary = "发布不可变版本")
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_PUBLISH)")
    public Result<Map<String, Object>> publish(@PathVariable("id") Long id) {
        return Result.success(workflowService.publish(id, UserContextUtil.getUserId()));
    }

    /**
     * 详情
     *
     * @param id 工作流 ID
     * @return 摘要
     */
    @Operation(summary = "查询工作流")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_VIEW, T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<Map<String, Object>> get(@PathVariable("id") Long id) {
        return Result.success(workflowService.get(id, UserContextUtil.getUserId()));
    }

    /**
     * 列表
     *
     * @param publishedOnly 仅已发布
     * @return 列表
     */
    @Operation(summary = "工作流列表")
    @GetMapping
    @PreAuthorize("hasAnyAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_VIEW, T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<List<Map<String, Object>>> list(
            @RequestParam(value = "publishedOnly", defaultValue = "false") boolean publishedOnly) {
        return Result.success(workflowService.list(UserContextUtil.getUserId(), publishedOnly));
    }

    /**
     * 版本列表
     *
     * @param id 工作流 ID
     * @return 版本
     */
    @Operation(summary = "已发布版本列表")
    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyAuthority(T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_VIEW, T(com.knowledge.base.agent.security.AgentPermissionConstants).WORKFLOW_EDIT)")
    public Result<List<Map<String, Object>>> versions(@PathVariable("id") Long id) {
        return Result.success(workflowService.listVersions(id));
    }

    /**
     * 创建请求体
     */
    @Data
    public static class CreateWorkflowRequest {
        private String name;
        private String draftJson;
    }

    /**
     * 更新草稿请求体
     */
    @Data
    public static class UpdateDraftRequest {
        private String draftJson;
    }

    /**
     * 草稿试运行请求体
     */
    @Data
    public static class DraftRunRequest {
        private String definitionJson;
        private Long sessionId;
        private Map<String, Object> input;
        private String idempotencyKey;
    }
}
