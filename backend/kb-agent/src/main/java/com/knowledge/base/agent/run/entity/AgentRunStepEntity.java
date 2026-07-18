package com.knowledge.base.agent.run.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent Run Step 实体
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@TableName("agent_run_step")
public class AgentRunStepEntity {

    @TableId
    private Long id;
    private Long runId;
    private String nodeId;
    private String nodeType;
    private String toolName;
    private String status;
    private String inputSnapshot;
    private String outputSnapshot;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Long durationMs;
}
