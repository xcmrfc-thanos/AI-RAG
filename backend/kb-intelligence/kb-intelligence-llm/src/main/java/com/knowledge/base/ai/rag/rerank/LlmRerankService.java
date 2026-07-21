package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.config.ModelProvider;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 旧版串行对话 LLM 重排（mode=llm，生产不推荐）。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LlmRerankService {

    private static final Pattern RERANK_SCORE_PATTERN = Pattern.compile("\\b([1-9]|10)\\b");

    private final ModelProvider modelProvider;

    /**
     * 对候选重排并截断到 topK。
     *
     * @param query      用户查询
     * @param candidates 候选列表
     * @param topK       返回条数
     * @return 重排后的结果
     */
    public List<RagSearchResultVO> rerank(String query, List<RagSearchResultVO> candidates, int topK) {
        try {
            ChatLanguageModel model = modelProvider.getDefaultModel();
            List<ScoredChunk> scored = new ArrayList<>();
            for (RagSearchResultVO candidate : candidates) {
                String prompt = buildRerankPrompt(query, candidate.getContent());
                try {
                    String response = model.generate(UserMessage.from(prompt)).content().text();
                    int score = parseRelevanceScore(response);
                    scored.add(new ScoredChunk(candidate, score));
                } catch (Exception e) {
                    log.warn("重排序评分失败：chunkId={}, error={}", candidate.getChunkId(), e.getMessage());
                    scored.add(new ScoredChunk(candidate, (int) (candidate.getScore() * 10)));
                }
            }
            scored.sort(Comparator.comparingInt(ScoredChunk::score).reversed());
            return scored.stream().limit(topK).map(sc -> {
                sc.result.setScore(sc.score);
                sc.result.setRerankScore((double) sc.score);
                return sc.result;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("LLM重排序失败，降级为原序截断：{}", e.getMessage());
            return candidates.stream().limit(topK).collect(Collectors.toList());
        }
    }

    /**
     * 构建重排 Prompt。
     *
     * @param query        查询
     * @param chunkContent 片段
     * @return prompt
     */
    private String buildRerankPrompt(String query, String chunkContent) {
        return String.format("""
                你是一个搜索相关性评估专家。
                请根据以下"用户查询"和"文档片段"，评估该文档片段对回答用户查询的相关程度。

                用户查询：%s

                文档片段：
                %s

                请仅返回一个整数评分（1-10分），不要返回其他内容。
                10 - 直接完美回答 | 7-9 - 高度相关 | 4-6 - 部分相关 | 1-3 - 基本无关
                """, query, truncateForRerank(chunkContent));
    }

    /**
     * 截断过长片段。
     *
     * @param content 原文
     * @return 截断文本
     */
    private String truncateForRerank(String content) {
        int maxLen = 1000;
        if (content == null) {
            return "";
        }
        return content.length() > maxLen ? content.substring(0, maxLen) : content;
    }

    /**
     * 解析 1～10 分。
     *
     * @param scoreText 模型输出
     * @return 分数
     */
    private int parseRelevanceScore(String scoreText) {
        if (scoreText == null) {
            return 5;
        }
        Matcher m = RERANK_SCORE_PATTERN.matcher(scoreText.trim());
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        return 5;
    }

    private record ScoredChunk(RagSearchResultVO result, int score) {
    }
}
