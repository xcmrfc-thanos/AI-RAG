package com.knowledge.base.agent.run.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.agent.run.entity.AgentSessionEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * agent_session Mapper
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Mapper
public interface AgentSessionMapper extends BaseMapper<AgentSessionEntity> {
}
