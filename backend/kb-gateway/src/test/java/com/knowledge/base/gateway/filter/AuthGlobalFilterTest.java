package com.knowledge.base.gateway.filter;

import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.gateway.config.GatewayAuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * AuthGlobalFilter 定向单测：白名单、401、信任头清理、合法 JWT 注入。
 */
class AuthGlobalFilterTest {

    private JwtTokenUtil jwtTokenUtil;
    private GatewayAuthProperties authProperties;
    private AuthGlobalFilter filter;

    /**
     * 初始化过滤器与白名单准源
     */
    @BeforeEach
    void setUp() {
        jwtTokenUtil = mock(JwtTokenUtil.class);
        authProperties = new GatewayAuthProperties();
        authProperties.setWhiteList(List.of(
                "/api/auth/auth/login",
                "/api/auth/auth/refresh",
                "/api/document/share/**",
                "/actuator/health"
        ));
        filter = new AuthGlobalFilter(jwtTokenUtil, authProperties);
    }

    /**
     * 非白名单缺 Token 应返回 401，且不转发
     */
    @Test
    void missingTokenReturns401() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/ai/chat").build());
        boolean[] forwarded = {false};

        filter.filter(exchange, e -> {
            forwarded[0] = true;
            return Mono.empty();
        }).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        assertTrue(!forwarded[0]);
    }

    /**
     * 非法 Token 应返回 401
     */
    @Test
    void invalidTokenReturns401() {
        when(jwtTokenUtil.validateToken(anyString())).thenReturn(false);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/ai/chat")
                        .header("Authorization", "Bearer bad")
                        .build());

        filter.filter(exchange, e -> Mono.empty()).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    /**
     * 白名单路径可无 Token 放行，且外部信任头被剥离
     */
    @Test
    void whitelistSkipsAuthAndStripsTrustHeaders() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/auth/auth/login")
                        .header("X-User-Id", "999")
                        .header("X-Internal-Service", "forged")
                        .header("X-Internal-Timestamp", "1")
                        .header("X-Internal-Signature", "sig")
                        .build());
        AtomicReference<ServerWebExchange> seen = new AtomicReference<>();

        filter.filter(exchange, e -> {
            seen.set(e);
            return Mono.empty();
        }).block();

        assertNull(exchange.getResponse().getStatusCode());
        assertNull(seen.get().getRequest().getHeaders().getFirst("X-User-Id"));
        assertNull(seen.get().getRequest().getHeaders().getFirst("X-Internal-Service"));
        assertNull(seen.get().getRequest().getHeaders().getFirst("X-Internal-Timestamp"));
        assertNull(seen.get().getRequest().getHeaders().getFirst("X-Internal-Signature"));
    }

    /**
     * 合法 JWT 注入可信 X-User-Id，并清理客户端伪造的内部头
     */
    @Test
    void validJwtInjectsUserIdAndStripsInternalHeaders() {
        when(jwtTokenUtil.validateToken(anyString())).thenReturn(true);
        when(jwtTokenUtil.getUserIdFromToken(anyString())).thenReturn(42L);
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/document/list")
                        .header("Authorization", "Bearer good")
                        .header("X-User-Id", "999")
                        .header("X-Internal-Service", "forged")
                        .build());
        AtomicReference<ServerWebExchange> seen = new AtomicReference<>();

        filter.filter(exchange, e -> {
            seen.set(e);
            return Mono.empty();
        }).block();

        assertNull(exchange.getResponse().getStatusCode());
        assertEquals("42", seen.get().getRequest().getHeaders().getFirst("X-User-Id"));
        assertNull(seen.get().getRequest().getHeaders().getFirst("X-Internal-Service"));
    }

    /**
     * 未配置白名单的路径不因硬编码而跳过
     */
    @Test
    void hardcodedPathsNoLongerBypassWithoutConfig() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/doc.html").build());

        filter.filter(exchange, e -> Mono.empty()).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }
}
