package com.knowledge.base.statistics.support;

import com.knowledge.base.common.security.DocumentVisibility;
import com.knowledge.base.common.utils.InternalServiceHmacUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.statistics.vo.HotDocumentVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 热门/最新文档列表按投影 ACL 字段过滤
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class StatisticsDocumentAclFilter {

    @Value("${kb-core.url:http://localhost:8090}")
    private String kbCoreUrl;

    @Value("${kb-core.internal.service:kb-intelligence}")
    private String internalService;

    @Value("${kb-core.internal.secret:}")
    private String internalSecret;

    @Value("${kb-core.internal.system-user-id:1000000000000000001}")
    private Long systemUserId;

    /**
     * 过滤不可见文档并截断到 size
     *
     * @param source 候选（通常超采）
     * @param size   目标条数
     * @return 可见列表
     */
    public List<HotDocumentVO> filterVisible(List<HotDocumentVO> source, int size) {
        if (source == null || source.isEmpty() || size <= 0) {
            return List.of();
        }
        Long userId = UserContextUtil.getUserId();
        List<Long> teamIds = fetchUserTeamIds(userId);
        List<HotDocumentVO> visible = new ArrayList<>();
        for (HotDocumentVO item : source) {
            if (visible.size() >= size) {
                break;
            }
            if (item == null || item.getDocumentId() == null) {
                continue;
            }
            if (DocumentVisibility.isVisible(
                    item.getIsPublic(),
                    item.getAuthorId(),
                    item.getTeamId(),
                    userId,
                    teamIds)) {
                visible.add(item);
            }
        }
        return visible;
    }

    /**
     * 查询用户团队
     *
     * @param userId 用户
     * @return 团队 ID
     */
    @SuppressWarnings("unchecked")
    private List<Long> fetchUserTeamIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        if (!StringUtils.hasText(internalSecret)
                || internalSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            log.debug("kb-core.internal.secret 未配置，跳过团队 ACL");
            return List.of();
        }
        String path = "/internal/users/" + userId + "/team-ids";
        try {
            String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
            String signature = InternalServiceHmacUtil.sign(
                    internalSecret, "GET", path, timestamp, internalService);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Service", internalService);
            headers.set("X-Internal-Timestamp", timestamp);
            headers.set("X-Internal-Signature", signature);
            if (systemUserId != null) {
                headers.set("X-User-Id", String.valueOf(systemUserId));
            }
            ResponseEntity<Map> response = new RestTemplate().exchange(
                    kbCoreUrl + path, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map body = response.getBody();
            if (body == null || !(body.get("data") instanceof List<?> list)) {
                return List.of();
            }
            return list.stream()
                    .map(this::toLong)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("查询用户团队失败：userId={}, err={}", userId, e.getMessage());
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
