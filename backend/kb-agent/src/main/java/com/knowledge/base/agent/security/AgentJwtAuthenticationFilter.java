package com.knowledge.base.agent.security;

import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Agent JWT 过滤器：校验 Bearer Token，并从 kb_user 加载角色/权限码
 *
 * <p>身份仅来自合法 JWT；网关注入的 X-User-Id 可作为辅助校验日志，
 * 不得单独作为鉴权依据。权限查询跨库读取同实例 {@code kb_user}。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentJwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenUtil jwtTokenUtil;
    private final JdbcTemplate jdbcTemplate;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * 解析并校验 JWT，写入 Security / UserContext
     */
    /**
     * doFilterInternal 方法。
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
                    List<SimpleGrantedAuthority> authorities = loadAuthorities(userId);
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            username != null ? username : String.valueOf(userId),
                            null,
                            authorities);
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
     * 从 kb_user 加载角色与权限码作为 Authority
     *
     * @param userId 用户 ID
     * @return 权限列表
     */
    private List<SimpleGrantedAuthority> loadAuthorities(Long userId) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        try {
            String roleDeletedOk = sqlDialectHelper.ifNull("r.deleted", "0");
            List<String> roles = jdbcTemplate.query(
                    """
                            SELECT r.role_code
                            FROM kb_user.kb_user_role ur
                            JOIN kb_user.kb_role r ON r.id = ur.role_id
                            WHERE ur.user_id = ? AND r.status = 1 AND %s = 0
                            """.formatted(roleDeletedOk),
                    (rs, rowNum) -> rs.getString(1),
                    userId);
            for (String roleCode : roles) {
                if (!StringUtils.hasText(roleCode)) {
                    continue;
                }
                String withPrefix = roleCode.startsWith("ROLE_") ? roleCode : "ROLE_" + roleCode;
                authorities.add(new SimpleGrantedAuthority(withPrefix));
            }

            String permDeletedOk = sqlDialectHelper.ifNull("p.deleted", "0");
            List<String> permissions = jdbcTemplate.query(
                    """
                            SELECT DISTINCT p.permission_code
                            FROM kb_user.kb_user_role ur
                            JOIN kb_user.kb_role_permission rp ON rp.role_id = ur.role_id
                            JOIN kb_user.kb_permission p ON p.id = rp.permission_id
                            WHERE ur.user_id = ? AND %s = 0 AND p.status = 1
                            """.formatted(permDeletedOk),
                    (rs, rowNum) -> rs.getString(1),
                    userId);
            for (String code : permissions) {
                if (StringUtils.hasText(code)) {
                    authorities.add(new SimpleGrantedAuthority(code));
                }
            }
        } catch (Exception e) {
            log.warn("加载 Agent 用户权限失败 userId={}: {}", userId, e.getMessage());
        }
        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }
        return authorities;
    }

    /**
     * 从 Authorization 头提取 Bearer Token
     */
    private String extractBearer(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
