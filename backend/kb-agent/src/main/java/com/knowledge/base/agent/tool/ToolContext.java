package com.knowledge.base.agent.tool;

/**
 * 工具执行上下文（透传终端用户身份，禁止系统 HMAC）
 *
 * @param authorization Bearer Token（含或不含 Bearer 前缀均可）
 * @param runId         Run ID（审计）
 * @param stepId        Step ID（审计）
 * @author AI-RAG
 * @since 1.0.0
 */
public record ToolContext(String authorization, Long runId, Long stepId) {

    /**
     * 规范化 Authorization 头值
     *
     * @return Bearer ... 形式；空则 null
     */
    public String bearerHeader() {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        String t = authorization.trim();
        return t.startsWith("Bearer ") ? t : "Bearer " + t;
    }
}
