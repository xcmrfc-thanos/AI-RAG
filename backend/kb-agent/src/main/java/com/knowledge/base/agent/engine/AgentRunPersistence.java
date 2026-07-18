package com.knowledge.base.agent.engine;

import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;

/**
 * Run/Step 持久化端口（便于单测内存实现）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public interface AgentRunPersistence {

    /**
     * 生成新 ID
     *
     * @return 雪花风格简易 ID
     */
    long nextId();

    /**
     * 按主键加载 Run
     *
     * @param runId Run ID
     * @return 实体；不存在则 null
     */
    AgentRunEntity findRun(Long runId);

    /**
     * 更新 Run
     *
     * @param run 实体
     */
    void updateRun(AgentRunEntity run);

    /**
     * 插入 Step
     *
     * @param step 实体
     */
    void insertStep(AgentRunStepEntity step);

    /**
     * 更新 Step
     *
     * @param step 实体
     */
    void updateStep(AgentRunStepEntity step);
}
