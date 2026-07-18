package com.knowledge.base.agent.run;

import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.agent.run.entity.AgentRunEntity;
import com.knowledge.base.agent.run.mapper.AgentRunMapper;
import com.knowledge.base.agent.run.mapper.AgentRunStepMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 保留期清理单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class AgentRunRetentionCleanerTest {

    /**
     * 过期 Run 会被删除（含 Step）
     */
    @Test
    void deletesExpiredRuns() {
        AgentRunMapper runMapper = mock(AgentRunMapper.class);
        AgentRunStepMapper stepMapper = mock(AgentRunStepMapper.class);
        AgentProperties props = new AgentProperties();
        props.setRunRetentionDays(30);
        AgentRunEntity old = new AgentRunEntity();
        old.setId(9L);
        old.setCreatedAt(LocalDateTime.now().minusDays(40));
        when(runMapper.selectList(any())).thenReturn(List.of(old));

        AgentRunRetentionCleaner cleaner = new AgentRunRetentionCleaner(props, runMapper, stepMapper);
        int n = cleaner.cleanupOlderThanDays(30);
        assertEquals(1, n);
        verify(stepMapper).delete(any());
        verify(runMapper).deleteById(9L);
    }
}
