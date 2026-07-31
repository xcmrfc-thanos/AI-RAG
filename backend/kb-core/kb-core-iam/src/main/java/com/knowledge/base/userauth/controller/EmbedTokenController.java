package com.knowledge.base.userauth.controller;

import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Embed 短期 Token 签发（自嵌试点 / 模拟 OA 宿主后端换票）。
 *
 * <p>对外经网关 {@code POST /api/auth/embed/tokens}；需登录会话 JWT，返回短期 embed JWT。</p>
 */
@RestController
@RequestMapping("/embed")
@Tag(name = "Embed Token", description = "嵌入对话短期 Token")
public class EmbedTokenController {

    private static final long DEFAULT_TTL_SECONDS = 300L;
    private static final long MAX_TTL_SECONDS = 1800L;

    @Resource
    private JwtTokenUtil jwtTokenUtil;

    /**
     * 为当前登录用户签发短期 embed Token。
     *
     * @param body    可选 knowledgeScope / ttlSeconds / allowedOrigin
     * @param request HTTP 请求（Origin 回退）
     * @return token 与过期信息
     */
    @PostMapping("/tokens")
    @Operation(summary = "签发短期 Embed Token")
    public Result<Map<String, Object>> mint(@RequestBody(required = false) MintRequest body,
                                            HttpServletRequest request) {
        Long userId = UserContextUtil.getUserId();
        if (userId == null) {
            throw new BusinessException(401, "未登录");
        }
        MintRequest req = body != null ? body : new MintRequest();
        long ttl = req.getTtlSeconds() != null ? req.getTtlSeconds() : DEFAULT_TTL_SECONDS;
        if (ttl < 60) {
            ttl = 60;
        }
        if (ttl > MAX_TTL_SECONDS) {
            ttl = MAX_TTL_SECONDS;
        }
        String origin = StringUtils.hasText(req.getAllowedOrigin())
                ? req.getAllowedOrigin().trim()
                : request.getHeader("Origin");
        if (!StringUtils.hasText(origin)) {
            String referer = request.getHeader("Referer");
            if (StringUtils.hasText(referer) && referer.startsWith("http")) {
                try {
                    java.net.URI uri = java.net.URI.create(referer);
                    origin = uri.getScheme() + "://" + uri.getAuthority();
                } catch (Exception ignored) {
                    origin = "";
                }
            }
        }
        String nonce = UUID.randomUUID().toString().replace("-", "");
        String username = UserContextUtil.getUsername();
        String token = jwtTokenUtil.generateEmbedToken(
                userId,
                username,
                req.getKnowledgeScope(),
                origin,
                nonce,
                ttl
        );
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("tokenType", "embed");
        data.put("expiresIn", ttl);
        data.put("nonce", nonce);
        data.put("knowledgeScope", req.getKnowledgeScope());
        data.put("allowedOrigin", origin);
        return Result.success(data);
    }

    /**
     * mint 请求体。
     */
    @Data
    public static class MintRequest {
        /** 知识范围声明（如 ticket-space） */
        private String knowledgeScope;
        /** 过期秒数，默认 300，最大 1800 */
        private Long ttlSeconds;
        /** 允许的宿主 Origin；空则尝试从请求头推断 */
        private String allowedOrigin;
    }
}
