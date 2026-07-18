package com.knowledge.base.agent.security;

/**
 * Agent 权限码常量（任务 70）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class AgentPermissionConstants {

    private AgentPermissionConstants() {
    }

    /** 查看已发布工作流 */
    public static final String WORKFLOW_VIEW = "agent:workflow:view";

    /** 运行已发布工作流 */
    public static final String RUN = "agent:run";

    /** 创建/编辑草稿 */
    public static final String WORKFLOW_EDIT = "agent:workflow:edit";

    /** 发布不可变版本 */
    public static final String WORKFLOW_PUBLISH = "agent:workflow:publish";
}
