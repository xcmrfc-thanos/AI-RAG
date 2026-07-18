package com.knowledge.base.core.config;

import com.knowledge.base.common.config.CustomAccessDeniedHandler;
import com.knowledge.base.common.config.CustomAuthenticationEntryPoint;
import com.knowledge.base.userauth.filter.JwtAuthenticationFilter;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Core BC 统一 Security 配置（合并 IAM + Platform，P2-3）。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class CoreSecurityConfig {

    @Resource
    private JwtAuthenticationFilter iamJwtAuthenticationFilter;

    @Resource
    private InternalServiceAuthFilter internalServiceAuthFilter;

    @Resource
    private CustomAuthenticationEntryPoint authEntryPoint;

    @Resource
    private CustomAccessDeniedHandler accessDeniedHandler;

    /**
     * 统一安全过滤链
     */
    @Bean
    SecurityFilterChain coreSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(AbstractHttpConfigurer::disable)
                .addFilterBefore(internalServiceAuthFilter,
                        org.springframework.security.web.authentication
                                .UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(iamJwtAuthenticationFilter,
                        org.springframework.security.web.authentication
                                .UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/ping", "/modules").permitAll()
                        .requestMatchers("/auth/login", "/auth/register", "/auth/verify-email",
                                "/auth/password/reset/**", "/auth/auth/**").permitAll()
                        .requestMatchers("/teams/tree").permitAll()
                        .requestMatchers("/auth/validate", "/auth/users/by-role",
                                "/auth/reviewer-ids").permitAll()
                        .requestMatchers("/auth/me").authenticated()
                        .requestMatchers("/auth/debug/**", "/auth/test/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/doc.html", "/swagger-resources/**",
                                "/v3/api-docs/**", "/webjars/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/config/public").permitAll()
                        .requestMatchers("/public/**").permitAll()
                        .requestMatchers("/test", "/test-error").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/share/**").permitAll()
                        .requestMatchers("/notifications/**").authenticated()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler));
        return http.build();
    }

    /**
     * 密码编码器（IAM 注册/登录使用）
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
