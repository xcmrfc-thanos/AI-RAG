package com.knowledge.base.agent.engine;

import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 内存持久化（单测用）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class InMemoryAgentRunPersistence implements AgentRunPersistence {

    private final AtomicLong seq = new AtomicLong(1000);
    private final Map<Long, AgentRunEntity> runs = new ConcurrentHashMap<>();
    private final Map<Long, AgentRunStepEntity> steps = new ConcurrentHashMap<>();

    /**
     * {@inheritDoc}
     */
    @Override
    public long nextId() {
        return seq.incrementAndGet();
    }

    /**
     * 放入 Run
     *
     * @param run 实体
     */
    void putRun(AgentRunEntity run) {
        runs.put(run.getId(), run);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public AgentRunEntity findRun(Long runId) {
        return runs.get(runId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void updateRun(AgentRunEntity run) {
        runs.put(run.getId(), run);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void insertStep(AgentRunStepEntity step) {
        steps.put(step.getId(), step);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void updateStep(AgentRunStepEntity step) {
        steps.put(step.getId(), step);
    }

    /**
     * Step 数量
     *
     * @return 数量
     */
    int stepCount() {
        return steps.size();
    }

    /**
     * 全部 Step
     *
     * @return map
     */
    Map<Long, AgentRunStepEntity> steps() {
        return steps;
    }
}
