package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.vo.RagSearchResultVO;

import java.util.List;

/**
 * 候选块重排服务。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public interface RerankService {

    /**
     * 对候选重排并截断到 topK。
     *
     * @param query      用户查询
     * @param candidates 候选列表
     * @param topK       返回条数
     * @return 重排后的结果
     */
    List<RagSearchResultVO> rerank(String query, List<RagSearchResultVO> candidates, int topK);
}
