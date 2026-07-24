package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.config.KbCoreInternalProperties;
import com.knowledge.base.common.utils.UserContextUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 解析当前请求的 RAG ACL 上下文（用户 + 团队）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RagAclContextResolver {

    private final KbCoreInternalProperties kbCoreInternalProperties;

    @Value("${kb-core.url:http://localhost:8090}")
    private String kbCoreUrl;

    /**
     * 从 ThreadLocal 用户上下文解析 ACL（含团队查询）
     *
     * @return ACL 上下文
     */
    public RagAclContext resolve() {
        Long userId = UserContextUtil.getUserId();
        if (userId == null) {
            return RagAclContext.anonymous();
        }
        return RagAclContext.of(userId, fetchUserTeamIds(userId));
    }

    /**
     * 查询用户所属团队（Core 内部接口）
     *
     * @param userId 用户
     * @return 团队列表
     */
    /**
     * fetchUserTeamIds 方法。
     */
    @SuppressWarnings("unchecked")
    public List<Long> fetchUserTeamIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        String path = "/internal/users/" + userId + "/team-ids";
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            KbCoreInternalProperties.SignedHeaders signed = kbCoreInternalProperties.sign("GET", path);
            headers.set("X-Internal-Service", signed.service());
            headers.set("X-Internal-Timestamp", signed.timestamp());
            headers.set("X-Internal-Signature", signed.signature());
            if (signed.systemUserId() != null) {
                headers.set("X-User-Id", String.valueOf(signed.systemUserId()));
            }
            ResponseEntity<Map> response = restTemplate.exchange(
                    kbCoreUrl + path,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class);
            Map body = response.getBody();
            if (body == null) {
                return List.of();
            }
            Object data = body.get("data");
            if (!(data instanceof List<?> list) || list.isEmpty()) {
                return List.of();
            }
            return list.stream()
                    .map(this::toLong)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("查询用户团队失败，按无团队继续 ACL：userId={}, err={}", userId, e.getMessage());
            return List.of();
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
