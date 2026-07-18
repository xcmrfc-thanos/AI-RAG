package com.knowledge.base.agent.engine;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;
import com.knowledge.base.agent.run.mapper.AgentRunMapper;
import com.knowledge.base.agent.run.mapper.AgentRunStepMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * MyBatis 持久化实现
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class MybatisAgentRunPersistence implements AgentRunPersistence {

    private final AgentRunMapper runMapper;
    private final AgentRunStepMapper stepMapper;
    private final AtomicLong localSeq = new AtomicLong(System.currentTimeMillis());

    /**
     * {@inheritDoc}
     */
    @Override
    public long nextId() {
        return localSeq.incrementAndGet();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public AgentRunEntity findRun(Long runId) {
        return runMapper.selectById(runId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void updateRun(AgentRunEntity run) {
        runMapper.updateById(run);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void insertStep(AgentRunStepEntity step) {
        stepMapper.insert(step);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void updateStep(AgentRunStepEntity step) {
        stepMapper.updateById(step);
    }

    /**
     * 按幂等键查找 Run（供任务 68 API 使用）
     *
     * @param userId          用户
     * @param idempotencyKey  幂等键
     * @return 已有 Run 或 null
     */
    public AgentRunEntity findByIdempotency(Long userId, String idempotencyKey) {
        return runMapper.selectOne(new LambdaQueryWrapper<AgentRunEntity>()
                .eq(AgentRunEntity::getUserId, userId)
                .eq(AgentRunEntity::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
    }
}
