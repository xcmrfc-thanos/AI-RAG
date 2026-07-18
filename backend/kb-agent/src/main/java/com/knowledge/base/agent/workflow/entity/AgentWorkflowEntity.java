package com.knowledge.base.agent.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent 工作流稳定身份实体
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@TableName("agent_workflow")
public class AgentWorkflowEntity {

    @TableId
    private Long id;
    private String name;
    private Long ownerUserId;
    private String draftJson;
    private Long publishedVersionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
