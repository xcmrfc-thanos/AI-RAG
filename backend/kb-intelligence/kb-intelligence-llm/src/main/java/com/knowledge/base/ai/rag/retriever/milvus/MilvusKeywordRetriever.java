package com.knowledge.base.ai.rag.retriever.milvus;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.Bm25CollapsedDocumentVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.milvus.client.MilvusServiceClient;
import io.milvus.param.R;
import io.milvus.param.collection.LoadCollectionParam;
import io.milvus.param.dml.QueryParam;
import io.milvus.response.QueryResultsWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Milvus 关键词检索器（VARCHAR like 近似，非真 BM25）
 *
 * <p>降级完整度：无分词打分、collapse 为内存聚合；与 ES BM25 指标不可直接对比。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "milvus")
public class MilvusKeywordRetriever implements KeywordRetriever {

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieveCandidates(String queryText, int topK) {
        return keywordSearch(queryText, topK);
    }

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> retrieve(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        return keywordSearch(queryText, topK).stream()
                .map(candidate -> RagSearchResultVO.builder()
                        .chunkId(candidate.getChunkId())
                        .documentId(candidate.getDocumentId())
                        .documentTitle(candidate.getDocumentTitle())
                        .content(candidate.getContent())
                        .heading(candidate.getHeading())
                        .publishTime(candidate.getPublishTime())
                        .score(candidate.getScore())
                        .bm25Score(candidate.getScore())
                        .build())
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public Bm25CollapsePageVO retrieveCollapsed(String queryText, int from, int size,
                                                int innerHitsPerDoc, List<Long> categoryIds) {
        if (!StringUtils.hasText(queryText) || size <= 0) {
            return Bm25CollapsePageVO.builder().total(0L).documents(List.of()).build();
        }
        int fetchSize = Math.min((from + size) * innerHitsPerDoc, 500);
        List<RagSearchResultVO> chunks = retrieve(queryText, fetchSize);
        Map<Long, Bm25CollapsedDocumentVO> docMap = new LinkedHashMap<>();

        for (RagSearchResultVO item : chunks) {
            Long docId = item.getDocumentId();
            if (docId == null) {
                continue;
            }
            Bm25CollapsedDocumentVO existing = docMap.get(docId);
            if (existing == null) {
                docMap.put(docId, Bm25CollapsedDocumentVO.builder()
                        .documentId(docId)
                        .documentTitle(item.getDocumentTitle())
                        .publishTime(item.getPublishTime())
                        .score(item.getScore())
                        .chunks(new ArrayList<>(List.of(item)))
                        .build());
            } else if (existing.getChunks().size() < innerHitsPerDoc) {
                existing.getChunks().add(item);
                if (existing.getScore() == null || item.getScore() > existing.getScore()) {
                    existing.setScore(item.getScore());
                }
            }
        }

        List<Bm25CollapsedDocumentVO> all = new ArrayList<>(docMap.values());
        int start = Math.min(from, all.size());
        int end = Math.min(from + size, all.size());
        return Bm25CollapsePageVO.builder()
                .total((long) all.size())
                .documents(all.subList(start, end))
                .build();
    }

    /**
     * 关键词检索（Milvus VARCHAR like）
     */
    private List<HybridSearchFusion.FusionCandidate> keywordSearch(String queryText, int topK) {
        if (!StringUtils.hasText(queryText)) {
            return List.of();
        }
        loadCollection();
        String keyword = escapeExprValue(queryText.trim());
        String expr = String.format("content like \"%%%s%%\" || document_title like \"%%%s%%\"", keyword, keyword);

        QueryParam queryParam = QueryParam.newBuilder()
                .withCollectionName(collectionName())
                .withExpr(expr)
                .withOutFields(Arrays.asList("chunk_id", "document_id", "document_title", "content", "heading", "publish_time"))
                .withLimit((long) topK)
                .build();

        R<io.milvus.grpc.QueryResults> response = milvusClient.query(queryParam);
        if (response.getStatus() != R.Status.Success.getCode() || response.getData() == null) {
            log.warn("Milvus 关键词检索失败：{}", response.getMessage());
            return List.of();
        }

        QueryResultsWrapper wrapper = new QueryResultsWrapper(response.getData());
        List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>();
        for (QueryResultsWrapper.RowRecord record : wrapper.getRowRecords()) {
            results.add(toCandidate(record, 1.0));
        }
        return results;
    }

    /**
     * 加载集合到内存
     */
    private void loadCollection() {
        milvusClient.loadCollection(LoadCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
    }

    private String collectionName() {
        return ragProperties.getMilvus().getCollection();
    }

    private HybridSearchFusion.FusionCandidate toCandidate(QueryResultsWrapper.RowRecord record, double score) {
        return HybridSearchFusion.FusionCandidate.of(
                asString(record.get("chunk_id")),
                asLong(record.get("document_id")),
                asString(record.get("document_title")),
                asString(record.get("content")),
                asString(record.get("heading")),
                asString(record.get("publish_time")),
                score,
                asBoolean(record.get("is_public")),
                asLong(record.get("author_id")),
                asLong(record.get("team_id"))
        );
    }

    private static Boolean asBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() == 1;
        }
        String s = value.toString().trim();
        if ("true".equalsIgnoreCase(s) || "1".equals(s)) {
            return true;
        }
        if ("false".equalsIgnoreCase(s) || "0".equals(s)) {
            return false;
        }
        return null;
    }

    private static String asString(Object value) {
        return value != null ? value.toString() : null;
    }

    private static Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static String escapeExprValue(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
