package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.CitationVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RAG/KAG 接地（grounding）辅助：短主题改写、Prompt 规则、拒答时引用收敛。
 *
 * <p>避免「检索有来源、模型却拒答且仍挂全量引用」的矛盾体验。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class RagGroundingSupport {

    /** 模型拒答固定文案（与 Prompt 约定一致） */
    public static final String REFUSAL_PHRASE = "【根据现有知识库暂时无法回答此问题】";

    private static final Pattern QUESTION_MARK = Pattern.compile("[?？]");
    private static final Pattern INTENT_WORDS = Pattern.compile(
            "(什么|怎么|如何|怎样|哪些|哪个|为何|为什么|是否|能否|可以吗|请|介绍|说明|解释|总结|对比|区别|列出|有哪些|是什么|讲讲|说说)");
    private static final Pattern CITATION_REF = Pattern.compile("\\[(\\d+)]");

    /** 主题词长度上限：不超过此长度且无明确问句意图时，按「介绍主题」改写 */
    private static final int TOPIC_QUERY_MAX_LEN = 40;

    private RagGroundingSupport() {
    }

    /**
     * 将短主题/关键词改写为可总结的问法；完整问句原样返回。
     *
     * @param query 用户原始输入（已 trim）
     * @return 写入 Prompt「用户问题」区的有效问法
     */
    public static String resolveEffectiveQuery(String query) {
        if (query == null || query.isBlank()) {
            return query;
        }
        String trimmed = query.trim();
        if (!isTopicLikeQuery(trimmed)) {
            return trimmed;
        }
        return "请根据参考资料，简要介绍与「" + trimmed + "」相关的内容与要点，并归纳资料中的关键信息。";
    }

    /**
     * 判断是否为「主题/关键词」式短查询（非明确问句）。
     *
     * @param query 用户输入
     * @return true 表示应按介绍主题处理
     */
    public static boolean isTopicLikeQuery(String query) {
        if (query == null || query.isBlank()) {
            return false;
        }
        String trimmed = query.trim();
        if (trimmed.length() > TOPIC_QUERY_MAX_LEN) {
            return false;
        }
        if (QUESTION_MARK.matcher(trimmed).find()) {
            return false;
        }
        return !INTENT_WORDS.matcher(trimmed).find();
    }

    /**
     * 追加 RAG/KAG 共用的接地规则到 Prompt。
     *
     * @param sb Prompt 构建器
     */
    public static void appendGroundingRules(StringBuilder sb) {
        sb.append("你是一个企业知识库助手。请仅根据以下参考资料回答用户问题。\n");
        sb.append("规则：\n");
        sb.append("1. 若用户只给出主题或关键词，请根据参考资料对该主题做简要介绍与要点归纳，不要拒答。\n");
        sb.append("2. 仅当参考资料与问题确实无关、无法提炼任何相关信息时，才回复")
                .append(REFUSAL_PHRASE)
                .append("，绝对不要编造内容。\n");
        sb.append("3. 回答时在引用资料处标注编号，如 [1]、[2]。\n");
        sb.append("4. 回答应当专业、准确、简洁。\n\n");
    }

    /**
     * 判断回答是否为知识库拒答。
     *
     * @param response 模型完整回答
     * @return true 表示拒答
     */
    public static boolean isRefusalAnswer(String response) {
        return response != null && response.contains(REFUSAL_PHRASE);
    }

    /**
     * 按回答收敛引用：拒答清空；若回答中出现 [n] 则只保留被引用的；否则保留全部命中。
     *
     * @param context  检索命中片段（顺序与 Prompt 编号一致，从 1 起）
     * @param response 模型回答
     * @return 展示给前端的引用列表
     */
    public static List<CitationVO> buildCitationsForAnswer(List<RagSearchResultVO> context, String response) {
        if (context == null || context.isEmpty()) {
            return List.of();
        }
        if (isRefusalAnswer(response)) {
            return List.of();
        }

        Set<Integer> mentioned = extractMentionedCitationIndexes(response);
        List<CitationVO> citations = new ArrayList<>();
        for (int i = 0; i < context.size(); i++) {
            int index = i + 1;
            if (!mentioned.isEmpty() && !mentioned.contains(index)) {
                continue;
            }
            RagSearchResultVO chunk = context.get(i);
            String excerpt = chunk.getContent();
            if (excerpt != null && excerpt.length() > 100) {
                excerpt = excerpt.substring(0, 100) + "...";
            }
            citations.add(CitationVO.builder()
                    .index(index)
                    .documentId(chunk.getDocumentId())
                    .documentTitle(chunk.getDocumentTitle())
                    .excerpt(excerpt)
                    .relevanceScore(chunk.getScore())
                    .build());
        }
        // 回答里标了编号但解析后为空（编号越界等）时，回退为全量命中，避免「有答无来源」
        if (citations.isEmpty() && !mentioned.isEmpty()) {
            return buildAllCitations(context);
        }
        return citations;
    }

    /**
     * 从回答中解析 [1]、[2] 等引用编号。
     *
     * @param response 模型回答
     * @return 出现过的编号集合（保持出现顺序）
     */
    public static Set<Integer> extractMentionedCitationIndexes(String response) {
        Set<Integer> indexes = new LinkedHashSet<>();
        if (response == null || response.isBlank()) {
            return indexes;
        }
        Matcher matcher = CITATION_REF.matcher(response);
        while (matcher.find()) {
            try {
                indexes.add(Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException ignored) {
                // 忽略非法编号
            }
        }
        return indexes;
    }

    /**
     * 构建全量引用（不做拒答/编号过滤）。
     *
     * @param context 检索命中
     * @return 引用列表
     */
    private static List<CitationVO> buildAllCitations(List<RagSearchResultVO> context) {
        List<CitationVO> citations = new ArrayList<>();
        for (int i = 0; i < context.size(); i++) {
            RagSearchResultVO chunk = context.get(i);
            String excerpt = chunk.getContent();
            if (excerpt != null && excerpt.length() > 100) {
                excerpt = excerpt.substring(0, 100) + "...";
            }
            citations.add(CitationVO.builder()
                    .index(i + 1)
                    .documentId(chunk.getDocumentId())
                    .documentTitle(chunk.getDocumentTitle())
                    .excerpt(excerpt)
                    .relevanceScore(chunk.getScore())
                    .build());
        }
        return citations;
    }
}
