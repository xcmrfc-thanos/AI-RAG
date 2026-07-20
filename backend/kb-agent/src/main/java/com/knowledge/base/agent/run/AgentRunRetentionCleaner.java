package com.knowledge.base.agent.run;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.entity.AgentRunStepEntity;
import com.knowledge.base.agent.run.mapper.AgentRunMapper;
import com.knowledge.base.agent.run.mapper.AgentRunStepMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Run/Step 保留期清理（默认 30 天；不落 Token/全文到日志）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentRunRetentionCleaner {

    private final AgentProperties agentProperties;
    private final AgentRunMapper runMapper;
    private final AgentRunStepMapper stepMapper;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * 每天凌晨清理过期 Run 及其 Step
     */
    @Scheduled(cron = "0 30 3 * * ?")
    public void cleanupExpired() {
        int days = Math.max(1, agentProperties.getRunRetentionDays());
        int deleted = cleanupOlderThanDays(days);
        log.info("agent_retention_cleanup retentionDays={} deletedRuns={}", days, deleted);
    }

    /**
     * 删除早于保留期的 Run/Step
     *
     * @param days 保留天数
     * @return 删除的 Run 数
     */
    public int cleanupOlderThanDays(int days) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(days);
        List<AgentRunEntity> expired = runMapper.selectList(new LambdaQueryWrapper<AgentRunEntity>()
                .lt(AgentRunEntity::getCreatedAt, threshold)
                .last(sqlDialectHelper.limitClause(500)));
        int count = 0;
        for (AgentRunEntity run : expired) {
            stepMapper.delete(new LambdaQueryWrapper<AgentRunStepEntity>()
                    .eq(AgentRunStepEntity::getRunId, run.getId()));
            runMapper.deleteById(run.getId());
            count++;
        }
        return count;
    }
}
