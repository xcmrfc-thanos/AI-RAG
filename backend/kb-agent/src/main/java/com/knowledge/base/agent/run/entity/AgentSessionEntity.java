package com.knowledge.base.agent.run.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent Session 实体（Run 分组，无记忆）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Data
@TableName("agent_session")
public class AgentSessionEntity {

    @TableId
    private Long id;
    private Long userId;
    private String title;
    private LocalDateTime createdAt;
    @TableLogic
    private Integer deleted;
}
