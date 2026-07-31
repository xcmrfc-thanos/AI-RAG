package com.knowledge.base.mcp.security;

import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * MCP JWT 过滤器：校验 Bearer，写入 UserContext；不查库（ACL 由下游 Gateway 强制）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class McpJwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenUtil jwtTokenUtil;

    /**
     * 解析并校验 JWT
     *
     * @param request     请求
     * @param response    响应
     * @param filterChain 链
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String token = extractBearer(request);
            if (StringUtils.hasText(token) && jwtTokenUtil.validateToken(token)) {
                Long userId = jwtTokenUtil.getUserIdFromToken(token);
                String username = jwtTokenUtil.getUsernameFromToken(token);
                if (userId != null) {
                    UserContextUtil.setUserId(userId);
                    UserContextUtil.setUsername(username);
                    UserContextUtil.setToken(token);
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            username != null ? username : String.valueOf(userId),
                            null,
                            AuthorityUtils.NO_AUTHORITIES);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    String forged = request.getHeader("X-User-Id");
                    if (StringUtils.hasText(forged) && !String.valueOf(userId).equals(forged.trim())) {
                        log.debug("忽略与 JWT 不一致的外部 X-User-Id={} jwtUserId={}", forged, userId);
                    }
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            UserContextUtil.clear();
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * 提取 Bearer Token
     *
     * @param request 请求
     * @return token 或 null
     */
    private String extractBearer(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return header.substring(7).trim();
    }
}
