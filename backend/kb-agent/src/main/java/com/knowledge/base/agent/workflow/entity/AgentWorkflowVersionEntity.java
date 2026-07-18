package com.knowledge.base.agent.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent 不可变工作流版本实体
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@TableName("agent_workflow_version")
public class AgentWorkflowVersionEntity {

    @TableId
    private Long id;
    private Long workflowId;
    private Integer schemaVersion;
    private String definitionJson;
    private LocalDateTime publishedAt;
    private Long publishedBy;
}
