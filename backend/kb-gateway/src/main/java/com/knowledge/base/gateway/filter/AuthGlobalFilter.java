package com.knowledge.base.gateway.filter;

import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.gateway.config.GatewayAuthProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 全局认证过滤器
 *
 * <p>先剥离外部伪造的内部信任头，再按 {@link GatewayAuthProperties} 白名单跳过或强制 JWT 校验；
 * 合法 Token 将可信 {@code X-User-Id} 注入下游。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_INTERNAL_SERVICE = "X-Internal-Service";
    private static final String HEADER_INTERNAL_TIMESTAMP = "X-Internal-Timestamp";
    private static final String HEADER_INTERNAL_SIGNATURE = "X-Internal-Signature";

    private final JwtTokenUtil jwtTokenUtil;
    private final GatewayAuthProperties authProperties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    /**
     * 构造网关认证过滤器
     *
     * @param jwtTokenUtil   JWT 工具
     * @param authProperties 白名单配置准源
     */
    public AuthGlobalFilter(JwtTokenUtil jwtTokenUtil, GatewayAuthProperties authProperties) {
        this.jwtTokenUtil = jwtTokenUtil;
        this.authProperties = authProperties;
    }

    /**
     * 清理信任头 → 白名单放行 / JWT 强制 401 → 注入可信用户头
     */
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest cleanedRequest = stripTrustHeaders(exchange.getRequest());
        ServerWebExchange cleanedExchange = exchange.mutate().request(cleanedRequest).build();

        String path = cleanedRequest.getURI().getPath();
        String method = cleanedRequest.getMethod() != null
                ? cleanedRequest.getMethod().name()
                : "GET";

        if (shouldSkip(path, method)) {
            return chain.filter(cleanedExchange);
        }

        String token = extractToken(cleanedRequest);
        if (!StringUtils.hasText(token) || !jwtTokenUtil.validateToken(token)) {
            log.debug("AuthGlobalFilter: unauthorized path={}, hasToken={}", path, StringUtils.hasText(token));
            cleanedExchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return cleanedExchange.getResponse().setComplete();
        }

        try {
            Long userId = jwtTokenUtil.getUserIdFromToken(token);
            if (userId == null) {
                cleanedExchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return cleanedExchange.getResponse().setComplete();
            }
            ServerHttpRequest authenticated = cleanedRequest.mutate()
                    .header(HEADER_USER_ID, String.valueOf(userId))
                    .build();
            log.debug("AuthGlobalFilter: token parsed OK, userId={}, path={}", userId, path);
            return chain.filter(cleanedExchange.mutate().request(authenticated).build());
        } catch (Exception e) {
            log.debug("AuthGlobalFilter: token parse failed for path={}: {}", path, e.getMessage());
            cleanedExchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return cleanedExchange.getResponse().setComplete();
        }
    }

    /**
     * 删除外部传入的内部信任头，防止伪造
     */
    private ServerHttpRequest stripTrustHeaders(ServerHttpRequest request) {
        return request.mutate().headers(headers -> {
            headers.remove(HEADER_USER_ID);
            headers.remove(HEADER_INTERNAL_SERVICE);
            headers.remove(HEADER_INTERNAL_TIMESTAMP);
            headers.remove(HEADER_INTERNAL_SIGNATURE);
        }).build();
    }

    /**
     * 是否跳过 JWT（OPTIONS 或配置白名单）
     */
    private boolean shouldSkip(String path, String method) {
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        if (authProperties.getWhiteList() == null) {
            return false;
        }
        for (String pattern : authProperties.getWhiteList()) {
            if (StringUtils.hasText(pattern) && pathMatcher.match(pattern.trim(), path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 从 Authorization、access_token Cookie 或查询参数提取 JWT
     *
     * @param request 网关请求
     * @return JWT 或 null
     */
    private String extractToken(ServerHttpRequest request) {
        String bearerToken = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        var cookies = request.getCookies();
        if (cookies.containsKey("access_token")) {
            var cookie = cookies.getFirst("access_token");
            if (cookie != null && StringUtils.hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        var query = request.getQueryParams();
        String queryToken = query.getFirst("access_token");
        if (!StringUtils.hasText(queryToken)) {
            queryToken = query.getFirst("token");
        }
        if (StringUtils.hasText(queryToken)) {
            return queryToken;
        }
        return null;
    }

    @Override
    public int getOrder() {
        return -200;
    }
}
