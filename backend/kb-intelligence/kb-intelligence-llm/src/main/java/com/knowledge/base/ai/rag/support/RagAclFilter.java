package com.knowledge.base.ai.rag.support;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.MgetResponse;
import co.elastic.clients.elasticsearch.core.mget.MultiGetResponseItem;
import com.knowledge.base.ai.rag.kag.retrieval.GraphContext;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import com.knowledge.base.common.security.DocumentVisibility;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * RAG/KAG 检索结果 ACL 后置过滤（对齐 Search DocumentVisibility）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RagAclFilter {

    private final RagAclContextResolver aclContextResolver;
    private final IntelligenceIndexingProperties indexingProperties;
    private final ObjectProvider<ElasticsearchClient> elasticsearchClientProvider;

    /**
     * 过滤 RAG 命中，仅保留当前用户可见文档
     *
     * @param results 原始命中
     * @return 可见命中（保持相对顺序）
     */
    public List<RagSearchResultVO> filterVisible(List<RagSearchResultVO> results) {
        if (results == null || results.isEmpty()) {
            return results != null ? results : List.of();
        }
        RagAclContext acl = aclContextResolver.resolve();
        Map<Long, AclMeta> metaByDoc = resolveMissingMeta(results);
        List<RagSearchResultVO> visible = new ArrayList<>(results.size());
        int dropped = 0;
        for (RagSearchResultVO item : results) {
            if (item.getDocumentId() == null) {
                dropped++;
                continue;
            }
            AclMeta meta = metaFromResult(item);
            if (meta == null || !meta.hasAnyField()) {
                meta = metaByDoc.get(item.getDocumentId());
            }
            if (meta == null) {
                dropped++;
                continue;
            }
            if (DocumentVisibility.isVisible(
                    meta.isPublic(), meta.authorId(), meta.teamId(), acl.userId(), acl.teamIds())) {
                visible.add(item);
            } else {
                dropped++;
            }
        }
        if (dropped > 0) {
            log.info("RAG ACL 过滤：userId={}, kept={}, dropped={}", acl.userId(), visible.size(), dropped);
        }
        return visible;
    }

    /**
     * 过滤图谱关联文本块
     *
     * @param chunks 图谱块
     * @return 可见块
     */
    public List<GraphContext.GraphChunk> filterGraphChunks(List<GraphContext.GraphChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return chunks != null ? chunks : List.of();
        }
        RagAclContext acl = aclContextResolver.resolve();
        Set<Long> docIds = chunks.stream()
                .map(GraphContext.GraphChunk::getDocId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, AclMeta> metaByDoc = loadDocumentAcl(docIds);
        List<GraphContext.GraphChunk> visible = new ArrayList<>();
        for (GraphContext.GraphChunk chunk : chunks) {
            if (chunk.getDocId() == null) {
                continue;
            }
            AclMeta meta = metaByDoc.get(chunk.getDocId());
            if (meta == null) {
                continue;
            }
            if (DocumentVisibility.isVisible(
                    meta.isPublic(), meta.authorId(), meta.teamId(), acl.userId(), acl.teamIds())) {
                visible.add(chunk);
            }
        }
        return visible;
    }

    private AclMeta metaFromResult(RagSearchResultVO item) {
        return new AclMeta(item.getIsPublic(), item.getAuthorId(), item.getTeamId());
    }

    private Map<Long, AclMeta> resolveMissingMeta(List<RagSearchResultVO> results) {
        Set<Long> need = new LinkedHashSet<>();
        for (RagSearchResultVO item : results) {
            if (item.getDocumentId() == null) {
                continue;
            }
            AclMeta meta = metaFromResult(item);
            if (!meta.hasAnyField()) {
                need.add(item.getDocumentId());
            }
        }
        return loadDocumentAcl(need);
    }

    /**
     * 从 kb_document 批量读取 ACL 元数据；失败则 fail-closed（返回空 map）
     *
     * @param documentIds 文档 ID
     * @return documentId → ACL
     */
    private Map<Long, AclMeta> loadDocumentAcl(Set<Long> documentIds) {
        Map<Long, AclMeta> out = new HashMap<>();
        if (documentIds == null || documentIds.isEmpty()) {
            return out;
        }
        ElasticsearchClient client = elasticsearchClientProvider.getIfAvailable();
        if (client == null) {
            log.warn("ElasticsearchClient 不可用，无法补全 RAG ACL 元数据");
            return out;
        }
        try {
            List<String> ids = documentIds.stream().map(String::valueOf).toList();
            MgetResponse<Map> response = client.mget(m -> m
                    .index(indexingProperties.getDocumentIndex())
                    .ids(ids), Map.class);
            for (MultiGetResponseItem<Map> item : response.docs()) {
                if (item.isFailure() || item.result() == null || !item.result().found()) {
                    continue;
                }
                Map<String, Object> source = item.result().source();
                if (source == null) {
                    continue;
                }
                Long id;
                try {
                    id = Long.parseLong(item.result().id());
                } catch (NumberFormatException e) {
                    continue;
                }
                Boolean isPublic = toBoolean(source.get("isPublic"));
                Long authorId = toLong(source.get("creatorId"));
                if (authorId == null) {
                    authorId = toLong(source.get("authorId"));
                }
                Long teamId = toLong(source.get("teamId"));
                out.put(id, new AclMeta(isPublic, authorId, teamId));
            }
        } catch (Exception e) {
            log.warn("批量加载文档 ACL 失败：{}", e.getMessage());
        }
        return out;
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() == 1;
        }
        String s = value.toString().trim();
        return "true".equalsIgnoreCase(s) || "1".equals(s);
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record AclMeta(Boolean isPublic, Long authorId, Long teamId) {
        boolean hasAnyField() {
            return isPublic != null || authorId != null || teamId != null;
        }
    }
}
