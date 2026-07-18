package com.knowledge.base.core.config;

import com.knowledge.base.common.utils.InternalServiceHmacUtil;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.userauth.entity.User;
import com.knowledge.base.userauth.mapper.UserMapper;
import com.knowledge.base.userauth.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 内部微服务调用鉴权过滤器
 *
 * <p>校验 Intelligence → Core 的 HMAC 签名、时间窗与路径白名单后，注入系统用户上下文。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Component
public class InternalServiceAuthFilter extends OncePerRequestFilter {

    private final CoreInternalServiceProperties internalProperties;
    private final UserMapper userMapper;
    private final UserService userService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    /**
     * 构造内部鉴权过滤器
     *
     * @param internalProperties 内部调用配置
     * @param userMapper         用户仓储
     * @param userService        用户权限服务
     */
    public InternalServiceAuthFilter(CoreInternalServiceProperties internalProperties,
                                     UserMapper userMapper,
                                     UserService userService) {
        this.internalProperties = internalProperties;
        this.userMapper = userMapper;
        this.userService = userService;
    }

    /**
     * 校验内部服务 HMAC 并注入系统用户上下文；失败则 401/403
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            if (internalProperties.isEnabled() && hasInternalAuthAttempt(request)) {
                InternalAuthResult result = validateInternalCall(request);
                if (result == InternalAuthResult.FORBIDDEN_PATH) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Internal path not allowed");
                    return;
                }
                if (result != InternalAuthResult.OK) {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid internal signature");
                    return;
                }
                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    authenticateSystemUser();
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            UserContextUtil.clear();
        }
    }

    /**
     * 是否携带任一内部鉴权头（视为内部调用尝试）
     */
    private boolean hasInternalAuthAttempt(HttpServletRequest request) {
        return StringUtils.hasText(request.getHeader(internalProperties.getHeaderName()))
                || StringUtils.hasText(request.getHeader(internalProperties.getTimestampHeader()))
                || StringUtils.hasText(request.getHeader(internalProperties.getSignatureHeader()));
    }

    /**
     * 校验服务名、路径白名单、时间窗与 HMAC
     */
    private InternalAuthResult validateInternalCall(HttpServletRequest request) {
        String service = request.getHeader(internalProperties.getHeaderName());
        String timestamp = request.getHeader(internalProperties.getTimestampHeader());
        String signature = request.getHeader(internalProperties.getSignatureHeader());
        String path = request.getRequestURI();
        String method = request.getMethod();

        if (!StringUtils.hasText(service)
                || !internalProperties.getHeaderValue().equals(service.trim())) {
            return InternalAuthResult.UNAUTHORIZED;
        }
        if (!isAllowedPath(method, path)) {
            log.warn("内部调用路径不在白名单：{} {}", method, path);
            return InternalAuthResult.FORBIDDEN_PATH;
        }
        boolean ok = InternalServiceHmacUtil.verifyWithRotation(
                internalProperties.getSecret(),
                internalProperties.getPreviousSecret(),
                method,
                path,
                timestamp,
                service.trim(),
                signature,
                System.currentTimeMillis() / 1000,
                internalProperties.getMaxClockSkewSeconds());
        if (!ok) {
            log.warn("内部调用签名校验失败：{} {}", method, path);
            return InternalAuthResult.UNAUTHORIZED;
        }
        return InternalAuthResult.OK;
    }

    /**
     * 路径是否命中内部白名单
     *
     * @param method HTTP 方法
     * @param path   请求路径
     * @return 是否允许
     */
    private boolean isAllowedPath(String method, String path) {
        if (!"GET".equalsIgnoreCase(method) && !"POST".equalsIgnoreCase(method)) {
            return false;
        }
        List<String> allowed = internalProperties.getAllowedPaths();
        if (allowed == null || allowed.isEmpty()) {
            return false;
        }
        for (String pattern : allowed) {
            if (StringUtils.hasText(pattern) && pathMatcher.match(pattern.trim(), path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 以配置的系统用户建立 Spring Security 与 ThreadLocal 上下文
     */
    private void authenticateSystemUser() {
        Long userId = internalProperties.getSystemUserId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            log.warn("内部服务鉴权失败：系统用户不存在 userId={}", userId);
            return;
        }
        List<String> permissions = userService.getUserPermissions(userId);
        List<SimpleGrantedAuthority> authorities = permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(user.getUsername(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserContextUtil.setUserId(userId);
        UserContextUtil.setUsername(user.getUsername());
        UserContextUtil.setInternalService(true);
        log.debug("内部服务鉴权成功：userId={}, username={}", userId, user.getUsername());
    }

    /**
     * 内部鉴权结果
     */
    enum InternalAuthResult {
        OK,
        UNAUTHORIZED,
        FORBIDDEN_PATH
    }
}
