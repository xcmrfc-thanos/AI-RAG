package com.knowledge.base.agent.workflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.engine.LinearWorkflowEngine;
import com.knowledge.base.agent.engine.MybatisAgentRunPersistence;
import com.knowledge.base.agent.engine.ValidationException;
import com.knowledge.base.agent.workflow.entity.AgentWorkflowEntity;
import com.knowledge.base.agent.workflow.entity.AgentWorkflowVersionEntity;
import com.knowledge.base.agent.workflow.mapper.AgentWorkflowMapper;
import com.knowledge.base.agent.workflow.mapper.AgentWorkflowVersionMapper;
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
 * 工作流草稿 / 发布服务（任务 68）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
public class AgentWorkflowService {

    private final AgentWorkflowMapper workflowMapper;
    private final AgentWorkflowVersionMapper versionMapper;
    private final LinearWorkflowEngine engine;
    private final MybatisAgentRunPersistence persistence;
    private final ObjectMapper objectMapper;

    /**
     * 创建草稿工作流
     *
     * @param name         名称
     * @param draftJson    草稿 JSON（可空，稍后更新）
     * @param ownerUserId  所有者
     * @return 工作流摘要
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createDraft(String name, String draftJson, Long ownerUserId) {
        if (!StringUtils.hasText(name) || name.length() > 128) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "name 须为 1～128 字符");
        }
        AgentWorkflowEntity entity = new AgentWorkflowEntity();
        entity.setId(persistence.nextId());
        entity.setName(name.trim());
        entity.setOwnerUserId(ownerUserId);
        entity.setDraftJson(StringUtils.hasText(draftJson) ? draftJson : null);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setDeleted(0);
        workflowMapper.insert(entity);
        return toWorkflowView(entity, true);
    }

    /**
     * 更新草稿 JSON
     *
     * @param workflowId  工作流 ID
     * @param draftJson   草稿
     * @param operatorId  操作人
     * @return 摘要
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateDraft(Long workflowId, String draftJson, Long operatorId) {
        AgentWorkflowEntity entity = requireWorkflow(workflowId);
        assertOwnerOrAdmin(entity, operatorId);
        if (StringUtils.hasText(draftJson)) {
            try {
                engine.validateDefinition(draftJson);
            } catch (ValidationException ve) {
                throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), ve.getMessage());
            }
        }
        entity.setDraftJson(draftJson);
        if (StringUtils.hasText(draftJson)) {
            try {
                JsonNode root = objectMapper.readTree(draftJson);
                String n = root.path("name").asText(null);
                if (StringUtils.hasText(n)) {
                    entity.setName(n.trim());
                }
            } catch (Exception ignored) {
                // name 保持原值
            }
        }
        entity.setUpdatedAt(LocalDateTime.now());
        workflowMapper.updateById(entity);
        return toWorkflowView(entity, true);
    }

    /**
     * 校验草稿
     *
     * @param workflowId 工作流 ID
     * @return 校验结果
     */
    public Map<String, Object> validateDraft(Long workflowId) {
        AgentWorkflowEntity entity = requireWorkflow(workflowId);
        if (!StringUtils.hasText(entity.getDraftJson())) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "草稿为空，无法校验");
        }
        try {
            var ordered = engine.validateDefinition(entity.getDraftJson());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("valid", true);
            data.put("nodeOrder", ordered.stream().map(n -> n.getId()).collect(Collectors.toList()));
            return data;
        } catch (ValidationException ve) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), ve.getMessage());
        }
    }

    /**
     * 发布不可变版本
     *
     * @param workflowId 工作流 ID
     * @param publisher  发布人
     * @return 版本摘要
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> publish(Long workflowId, Long publisher) {
        AgentWorkflowEntity entity = requireWorkflow(workflowId);
        assertOwnerOrAdmin(entity, publisher);
        if (!StringUtils.hasText(entity.getDraftJson())) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "草稿为空，无法发布");
        }
        try {
            engine.validateDefinition(entity.getDraftJson());
        } catch (ValidationException ve) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), ve.getMessage());
        }
        AgentWorkflowVersionEntity ver = new AgentWorkflowVersionEntity();
        ver.setId(persistence.nextId());
        ver.setWorkflowId(workflowId);
        ver.setSchemaVersion(1);
        ver.setDefinitionJson(entity.getDraftJson());
        ver.setPublishedAt(LocalDateTime.now());
        ver.setPublishedBy(publisher);
        versionMapper.insert(ver);

        entity.setPublishedVersionId(ver.getId());
        entity.setUpdatedAt(LocalDateTime.now());
        workflowMapper.updateById(entity);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("workflowId", workflowId);
        data.put("workflowVersionId", ver.getId());
        data.put("publishedAt", ver.getPublishedAt());
        return data;
    }

    /**
     * 查询工作流（所有者可见完整 draftJson）
     *
     * @param workflowId  ID
     * @param operatorId  当前用户（可空；非所有者不返回 draftJson）
     * @return 摘要或详情
     */
    public Map<String, Object> get(Long workflowId, Long operatorId) {
        AgentWorkflowEntity entity = requireWorkflow(workflowId);
        boolean includeDraft = operatorId != null && operatorId.equals(entity.getOwnerUserId());
        return toWorkflowView(entity, includeDraft);
    }

    /**
     * 列表（当前用户拥有的 + 已发布可供运行的简化列表）
     *
     * @param userId 用户
     * @param publishedOnly 仅已发布
     * @return 列表
     */
    public List<Map<String, Object>> list(Long userId, boolean publishedOnly) {
        LambdaQueryWrapper<AgentWorkflowEntity> q = new LambdaQueryWrapper<>();
        if (publishedOnly) {
            q.isNotNull(AgentWorkflowEntity::getPublishedVersionId);
        } else {
            q.eq(AgentWorkflowEntity::getOwnerUserId, userId);
        }
        q.orderByDesc(AgentWorkflowEntity::getUpdatedAt);
        return workflowMapper.selectList(q).stream()
                .map(e -> toWorkflowView(e, false))
                .collect(Collectors.toList());
    }

    /**
     * 版本列表
     *
     * @param workflowId 工作流 ID
     * @return 版本
     */
    public List<Map<String, Object>> listVersions(Long workflowId) {
        requireWorkflow(workflowId);
        return versionMapper.selectList(new LambdaQueryWrapper<AgentWorkflowVersionEntity>()
                        .eq(AgentWorkflowVersionEntity::getWorkflowId, workflowId)
                        .orderByDesc(AgentWorkflowVersionEntity::getPublishedAt))
                .stream()
                .map(this::toVersionView)
                .collect(Collectors.toList());
    }

    /**
     * 按版本 ID 取不可变定义
     *
     * @param versionId 版本 ID
     * @return 版本实体
     */
    public AgentWorkflowVersionEntity requireVersion(Long versionId) {
        AgentWorkflowVersionEntity ver = versionMapper.selectById(versionId);
        if (ver == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "工作流版本不存在");
        }
        return ver;
    }

    /**
     * 校验当前用户可编辑的草稿定义快照
     *
     * @param workflowId    工作流 ID
     * @param operatorId    操作人
     * @param definitionJson 本次试运行定义快照
     * @return 已校验的定义快照
     */
    public String validateEditableDefinition(Long workflowId,
                                             Long operatorId,
                                             String definitionJson) {
        AgentWorkflowEntity entity = requireWorkflow(workflowId);
        assertOwnerOrAdmin(entity, operatorId);
        if (!StringUtils.hasText(definitionJson)) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "草稿定义不能为空");
        }
        try {
            engine.validateDefinition(definitionJson);
            return definitionJson;
        } catch (ValidationException ve) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), ve.getMessage());
        }
    }

    private AgentWorkflowEntity requireWorkflow(Long workflowId) {
        AgentWorkflowEntity entity = workflowMapper.selectById(workflowId);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "工作流不存在");
        }
        return entity;
    }

    private void assertOwnerOrAdmin(AgentWorkflowEntity entity, Long operatorId) {
        if (operatorId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (!operatorId.equals(entity.getOwnerUserId())) {
            // 细粒度权限矩阵见任务 70；MVP 仅允许所有者改草稿/发布
            throw new BusinessException(ResultCode.FORBIDDEN.getCode(), "仅所有者可编辑/发布该工作流");
        }
    }

    private Map<String, Object> toWorkflowView(AgentWorkflowEntity e, boolean includeDraft) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("name", e.getName());
        m.put("ownerUserId", e.getOwnerUserId());
        m.put("publishedVersionId", e.getPublishedVersionId());
        m.put("hasDraft", StringUtils.hasText(e.getDraftJson()));
        m.put("updatedAt", e.getUpdatedAt());
        if (includeDraft && StringUtils.hasText(e.getDraftJson())) {
            m.put("draftJson", e.getDraftJson());
        }
        return m;
    }

    private Map<String, Object> toVersionView(AgentWorkflowVersionEntity v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("workflowId", v.getWorkflowId());
        m.put("schemaVersion", v.getSchemaVersion());
        m.put("publishedAt", v.getPublishedAt());
        m.put("publishedBy", v.getPublishedBy());
        return m;
    }
}
