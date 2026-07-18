package com.knowledge.base.statistics.mapper;

import org.apache.ibatis.annotations.Mapper;

/**
 * AI统计数据 Mapper
 *
 * <p>查询 kb_statistics 本地投影表 stat_ai_conversation / stat_ai_message（P3-1）</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Mapper
public interface AiStatisticsMapper {

    /**
     * 统计 AI 对话总数（智能搜索次数）
     */
    Long countConversations();

    /**
     * 统计 AI 用户提问总数（问答次数）
     */
    Long countUserMessages();
}
