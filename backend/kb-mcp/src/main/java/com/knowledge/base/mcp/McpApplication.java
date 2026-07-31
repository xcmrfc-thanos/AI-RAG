package com.knowledge.base.mcp;

import com.knowledge.base.common.config.CustomAccessDeniedHandler;
import com.knowledge.base.common.config.CustomAuthenticationEntryPoint;
import com.knowledge.base.common.config.JwtConfig;
import com.knowledge.base.common.utils.JwtTokenUtil;
import com.knowledge.base.common.utils.SpringContextUtil;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Import;

/**
 * kb-mcp 启动类（独立进程；只读 MCP，不并入 Intelligence JVM）
 *
 * <p>仅扫描 mcp 包并显式导入 JWT/安全入口，避免拉入 Redis/MyBatis 等无关 common Bean。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@SpringBootApplication(
        scanBasePackages = "com.knowledge.base.mcp",
        exclude = {DataSourceAutoConfiguration.class}
)
@EnableDiscoveryClient
@Import({
        JwtConfig.class,
        JwtTokenUtil.class,
        SpringContextUtil.class,
        CustomAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class
})
public class McpApplication {

    /**
     * 启动 MCP 服务
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(McpApplication.class, args);
        System.out.println("""

            ========================================
              kb-mcp 启动成功
              端口：8095
              API：http://127.0.0.1:18080/api/mcp/
              默认：mcp.server.enabled=false
            ========================================
            """);
    }
}
