package com.knowledge.base.agent.run.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent Run 实体
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@TableName("agent_run")
public class AgentRunEntity {

    @TableId
    private Long id;
    private Long workflowVersionId;
    private String runSource;
    private Long userId;
    private Long sessionId;
    private String inputJson;
    private String outputJson;
    private String status;
    private String errorCode;
    private String errorMessage;
    private String idempotencyKey;
    private Integer cancelRequested;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Long durationMs;
    private LocalDateTime createdAt;
}
