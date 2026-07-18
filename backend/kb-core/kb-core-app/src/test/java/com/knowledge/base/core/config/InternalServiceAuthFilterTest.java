package com.knowledge.base.core.config;

import com.knowledge.base.common.utils.InternalServiceHmacUtil;
import com.knowledge.base.userauth.mapper.UserMapper;
import com.knowledge.base.userauth.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * InternalServiceAuthFilter HMAC / 路径白名单定向单测。
 */
class InternalServiceAuthFilterTest {

    private static final String SECRET = "ai-rag-local-dev-hmac-secret-key!!";

    private CoreInternalServiceProperties properties;
    private InternalServiceAuthFilter filter;
    private FilterChain chain;

    /**
     * 初始化过滤器与合法密钥
     */
    @BeforeEach
    void setUp() {
        properties = new CoreInternalServiceProperties();
        properties.setEnabled(true);
        properties.setSecret(SECRET);
        properties.setAllowedPaths(List.of("/documents/page", "/documents/*"));
        filter = new InternalServiceAuthFilter(properties, mock(UserMapper.class), mock(UserService.class));
        chain = mock(FilterChain.class);
    }

    /**
     * 合法签名且路径在白名单内应放行
     */
    @Test
    void validSignatureOnAllowedPathContinues() throws Exception {
        MockHttpServletRequest request = signedGet("/documents/page");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    /**
     * 错误签名应 401 且不进入后续链
     */
    @Test
    void wrongSignatureReturns401() throws Exception {
        long ts = System.currentTimeMillis() / 1000;
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/documents/1");
        request.setRequestURI("/documents/1");
        request.addHeader("X-Internal-Service", "kb-intelligence");
        request.addHeader("X-Internal-Timestamp", String.valueOf(ts));
        request.addHeader("X-Internal-Signature", "bad-signature");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        verify(chain, never()).doFilter(request, response);
    }

    /**
     * 过期时间戳应 401
     */
    @Test
    void expiredTimestampReturns401() throws Exception {
        long ts = System.currentTimeMillis() / 1000 - 120;
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/documents/1");
        request.setRequestURI("/documents/1");
        request.addHeader("X-Internal-Service", "kb-intelligence");
        request.addHeader("X-Internal-Timestamp", String.valueOf(ts));
        request.addHeader("X-Internal-Signature",
                InternalServiceHmacUtil.sign(SECRET, "GET", "/documents/1", String.valueOf(ts), "kb-intelligence"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        verify(chain, never()).doFilter(request, response);
    }

    /**
     * 非白名单路径即使签名正确也应 403
     */
    @Test
    void nonWhitelistedPathReturns403() throws Exception {
        MockHttpServletRequest request = signedGet("/documents/1/export-pdf");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        verify(chain, never()).doFilter(request, response);
    }

    /**
     * 密钥长度不足时应在校验阶段失败
     */
    @Test
    void shortSecretFailsValidation() {
        properties.setSecret("too-short");
        try {
            properties.validateSecret();
            throw new AssertionError("expected IllegalStateException");
        } catch (IllegalStateException ex) {
            assertEquals(true, ex.getMessage().contains("32"));
        }
    }

    /**
     * 构造带合法 HMAC 的 GET 请求
     */
    private MockHttpServletRequest signedGet(String path) {
        long ts = System.currentTimeMillis() / 1000;
        String timestamp = String.valueOf(ts);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRequestURI(path);
        request.setCharacterEncoding(StandardCharsets.UTF_8.name());
        request.addHeader("X-Internal-Service", "kb-intelligence");
        request.addHeader("X-Internal-Timestamp", timestamp);
        request.addHeader("X-Internal-Signature",
                InternalServiceHmacUtil.sign(SECRET, "GET", path, timestamp, "kb-intelligence"));
        return request;
    }
}
