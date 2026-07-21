package com.knowledge.base.ai.rag.retriever.qdrant;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.qdrant.QdrantChunkWriter;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.sparse.HashingBm25SparseEmbedder;
import com.knowledge.base.ai.rag.sparse.SparseVectorSupport;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.rag.support.RagAclContextResolver;
import com.knowledge.base.ai.rag.support.RagAclQuerySupport;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.Bm25CollapsedDocumentVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.WithPayloadSelectorFactory;
import io.qdrant.client.grpc.Points.ScoredPoint;
import io.qdrant.client.grpc.Points.SearchPoints;
import io.qdrant.client.grpc.Points.SparseIndices;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Qdrant sparse 关键词检索器（{@code qdrant-qdrant}）。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${rag.vector-store:}'.equalsIgnoreCase('qdrant') "
        + "|| '${rag.retrieval.keyword-engine:}'.equalsIgnoreCase('qdrant') "
        + "|| '${rag.retrieval.profile:}'.equalsIgnoreCase('qdrant-qdrant')")
public class QdrantKeywordRetriever implements KeywordRetriever {

    private final QdrantClient qdrantClient;
    private final RagProperties ragProperties;
    private final QdrantChunkWriter qdrantChunkWriter;
    private final HashingBm25SparseEmbedder sparseEmbedder;
    private final RagAclContextResolver aclContextResolver;

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
                .map(c -> RagSearchResultVO.builder()
                        .chunkId(c.getChunkId())
                        .documentId(c.getDocumentId())
                        .documentTitle(c.getDocumentTitle())
                        .content(c.getContent())
                        .heading(c.getHeading())
                        .publishTime(c.getPublishTime())
                        .score(c.getScore())
                        .bm25Score(c.getScore())
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

    private List<HybridSearchFusion.FusionCandidate> sparseSearch(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        Map<Integer, Float> sparse = sparseEmbedder.embed(queryText);
        List<Integer> indices = SparseVectorSupport.toIndexList(sparse);
        List<Float> values = SparseVectorSupport.toValueList(sparse);
        if (indices.isEmpty()) {
            return List.of();
        }
        try {
            qdrantChunkWriter.ensureCollection();
            SearchPoints request = SearchPoints.newBuilder()
                    .setCollectionName(collectionName())
                    .setVectorName(QdrantChunkWriter.VECTOR_SPARSE)
                    .setSparseIndices(SparseIndices.newBuilder().addAllData(indices).build())
                    .addAllVector(values)
                    .setLimit(topK)
                    .setFilter(RagAclQuerySupport.buildQdrantChunkAclFilter(aclContextResolver.resolve()))
                    .setWithPayload(WithPayloadSelectorFactory.enable(true))
                    .build();
            List<ScoredPoint> points = qdrantClient.searchAsync(request)
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>(points.size());
            for (ScoredPoint point : points) {
                results.add(toCandidate(point));
            }
            return results;
        } catch (Exception e) {
            log.warn("Qdrant sparse 关键词检索失败：{}", e.getMessage());
            return List.of();
        }
    }

    private HybridSearchFusion.FusionCandidate toCandidate(ScoredPoint point) {
        var payload = point.getPayloadMap();
        String chunkId = payload.containsKey("chunk_id")
                ? payload.get("chunk_id").getStringValue()
                : point.getId().getUuid();
        return HybridSearchFusion.FusionCandidate.of(
                chunkId,
                payloadLong(payload, "document_id"),
                payloadString(payload, "document_title"),
                payloadString(payload, "content"),
                payloadString(payload, "heading"),
                payloadString(payload, "publish_time"),
                point.getScore(),
                payloadBoolean(payload, "is_public"),
                payloadLong(payload, "author_id"),
                payloadLong(payload, "team_id")
        );
    }

    private String collectionName() {
        return ragProperties.getQdrant().getCollection();
    }

    private static String payloadString(Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload, String key) {
        if (payload == null || !payload.containsKey(key)) {
            return null;
        }
        var value = payload.get(key);
        return value.hasStringValue() ? value.getStringValue() : value.toString();
    }

    private static Long payloadLong(Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload, String key) {
        if (payload == null || !payload.containsKey(key)) {
            return null;
        }
        var value = payload.get(key);
        if (value.hasIntegerValue()) {
            return value.getIntegerValue();
        }
        try {
            return Long.parseLong(value.getStringValue());
        } catch (Exception ignored) {
            return null;
        }
    }

    private static Boolean payloadBoolean(Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload, String key) {
        if (payload == null || !payload.containsKey(key)) {
            return null;
        }
        var value = payload.get(key);
        if (value.hasBoolValue()) {
            return value.getBoolValue();
        }
        if (value.hasIntegerValue()) {
            return value.getIntegerValue() == 1;
        }
        return null;
    }
}
