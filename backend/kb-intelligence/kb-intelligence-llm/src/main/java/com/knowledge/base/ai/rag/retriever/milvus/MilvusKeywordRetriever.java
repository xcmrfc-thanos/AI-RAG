package com.knowledge.base.ai.rag.retriever.milvus;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.milvus.MilvusCollectionSupport;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.sparse.HashingBm25SparseEmbedder;
import com.knowledge.base.ai.rag.sparse.SparseVectorSupport;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.Bm25CollapsedDocumentVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.SearchResults;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.dml.SearchParam;
import io.milvus.response.QueryResultsWrapper;
import io.milvus.response.SearchResultsWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.stream.Collectors;

/**
 * Milvus 关键词检索器（Hashing BM25-lite sparse，禁止 VARCHAR like）。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${rag.vector-store:}'.equalsIgnoreCase('milvus') "
        + "|| '${rag.retrieval.keyword-engine:}'.equalsIgnoreCase('milvus') "
        + "|| '${rag.retrieval.profile:}'.equalsIgnoreCase('milvus-milvus')")
public class MilvusKeywordRetriever implements KeywordRetriever {

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;
    private final MilvusCollectionSupport collectionSupport;
    private final HashingBm25SparseEmbedder sparseEmbedder;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieveCandidates(String queryText, int topK) {
        return sparseSearch(queryText, topK);
    }

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> retrieve(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        return sparseSearch(queryText, topK).stream()
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
        int fetchSize = Math.min((from + size) * Math.max(1, innerHitsPerDoc), 500);
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
     * sparse ANN 检索（IP）。
     *
     * @param queryText 查询
     * @param topK      条数
     * @return 候选
     */
    private List<HybridSearchFusion.FusionCandidate> sparseSearch(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        Map<Integer, Float> sparse = sparseEmbedder.embed(queryText);
        SortedMap<Long, Float> querySparse = SparseVectorSupport.toMilvusSortedMap(sparse);
        if (querySparse.isEmpty()) {
            return List.of();
        }
        try {
            collectionSupport.ensureCollection(true);
            SearchParam searchParam = SearchParam.newBuilder()
                    .withCollectionName(collectionSupport.collectionName())
                    .withMetricType(MetricType.IP)
                    .withTopK(topK)
                    .withSparseFloatVectors(Collections.singletonList(querySparse))
                    .withVectorFieldName(MilvusCollectionSupport.FIELD_SPARSE)
                    .withOutFields(Arrays.asList(
                            "chunk_id", "document_id", "document_title", "content", "heading", "publish_time",
                            "author_id", "team_id"))
                    .withParams("{\"drop_ratio_search\":0.2}")
                    .build();

            R<SearchResults> response = milvusClient.search(searchParam);
            if (response.getStatus() != R.Status.Success.getCode() || response.getData() == null) {
                log.warn("Milvus sparse 关键词检索失败：{}", response.getMessage());
                return List.of();
            }

            SearchResultsWrapper wrapper = new SearchResultsWrapper(response.getData().getResults());
            List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>();
            if (wrapper.getRowRecords(0) == null) {
                return results;
            }
            List<SearchResultsWrapper.IDScore> scores = wrapper.getIDScore(0);
            for (int i = 0; i < wrapper.getRowRecords(0).size(); i++) {
                QueryResultsWrapper.RowRecord record = wrapper.getRowRecords(0).get(i);
                float score = scores != null && scores.size() > i ? scores.get(i).getScore() : 0f;
                results.add(toCandidate(record, score));
            }
            log.debug("Milvus sparse 检索命中 {} 条", results.size());
            return results;
        } catch (Exception e) {
            log.warn("Milvus sparse 关键词检索异常：{}", e.getMessage());
            return List.of();
        }
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
}
