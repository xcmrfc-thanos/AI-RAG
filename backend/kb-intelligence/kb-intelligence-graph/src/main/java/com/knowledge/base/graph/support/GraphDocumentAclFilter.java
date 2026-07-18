package com.knowledge.base.graph.support;

import com.knowledge.base.common.utils.InternalServiceHmacUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.graph.vo.GraphNodeVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 图谱节点按关联文档 ACL 过滤（Core 内部批量可见性）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class GraphDocumentAclFilter {

    @Value("${kb-core.url:http://localhost:8090}")
    private String kbCoreUrl;

    @Value("${kb-core.internal.service:kb-intelligence}")
    private String internalService;

    @Value("${kb-core.internal.secret:}")
    private String internalSecret;

    @Value("${kb-core.internal.system-user-id:1000000000000000001}")
    private Long systemUserId;

    /**
     * 过滤带 documentId 且当前用户不可见的节点；无 documentId 的实体节点保留
     *
     * @param nodes 原始节点
     * @return 可见节点
     */
    public List<GraphNodeVO> filterVisibleNodes(List<GraphNodeVO> nodes) {
        if (nodes == null || nodes.isEmpty()) {
            return nodes != null ? nodes : List.of();
        }
        Set<Long> candidateIds = new LinkedHashSet<>();
        for (GraphNodeVO node : nodes) {
            Long docId = parseDocumentId(node != null ? node.getDocumentId() : null);
            if (docId != null) {
                candidateIds.add(docId);
            }
        }
        if (candidateIds.isEmpty()) {
            return nodes;
        }
        Set<Long> visibleIds = fetchVisibleIds(UserContextUtil.getUserId(), candidateIds);
        List<GraphNodeVO> out = new ArrayList<>();
        for (GraphNodeVO node : nodes) {
            Long docId = parseDocumentId(node.getDocumentId());
            if (docId == null || visibleIds.contains(docId)) {
                out.add(node);
            }
        }
        return out;
    }

    /**
     * 调用 Core 批量可见性接口
     *
     * @param userId 用户
     * @param docIds 候选文档
     * @return 可见集合；调用失败时 fail-closed（空集）
     */
    @SuppressWarnings("unchecked")
    private Set<Long> fetchVisibleIds(Long userId, Set<Long> docIds) {
        if (docIds == null || docIds.isEmpty()) {
            return Set.of();
        }
        if (!StringUtils.hasText(internalSecret)
                || internalSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            log.warn("kb-core.internal.secret 未配置，图谱文档节点全部隐藏");
            return Set.of();
        }
        String path = "/internal/documents/visible-ids";
        try {
            String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
            String signature = InternalServiceHmacUtil.sign(
                    internalSecret, "POST", path, timestamp, internalService);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service", internalService);
            headers.set("X-Internal-Timestamp", timestamp);
            headers.set("X-Internal-Signature", signature);
            if (systemUserId != null) {
                headers.set("X-User-Id", String.valueOf(systemUserId));
            }
            Map<String, Object> body = new HashMap<>();
            body.put("userId", userId);
            body.put("documentIds", new ArrayList<>(docIds));
            ResponseEntity<Map> response = new RestTemplate().exchange(
                    kbCoreUrl + path,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class);
            Map resp = response.getBody();
            if (resp == null || !(resp.get("data") instanceof List<?> list)) {
                return Set.of();
            }
            return list.stream()
                    .map(this::toLong)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(HashSet::new));
        } catch (Exception e) {
            log.warn("图谱 ACL 批量查询失败：{}", e.getMessage());
            return Set.of();
        }
    }

    private Long parseDocumentId(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
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
}
