package com.knowledge.base.agent.engine;

/**
 * Run 状态枚举（任务 64 状态机）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public enum RunStatus {
    CREATED,
    RUNNING,
    SUCCEEDED,
    FAILED,
    TIMED_OUT,
    CANCELLED;

    /**
     * 是否终态
     *
     * @return 终态则 true
     */
    public boolean isTerminal() {
        return this == SUCCEEDED || this == FAILED || this == TIMED_OUT || this == CANCELLED;
    }

    /**
     * 校验合法状态转换
     *
     * @param from 原状态
     * @param to   目标状态
     */
    public static void assertTransition(RunStatus from, RunStatus to) {
        if (from == null || to == null) {
            throw new ValidationException("INVALID_STATUS", "状态不能为空");
        }
        if (from.isTerminal()) {
            throw new ValidationException("INVALID_TRANSITION",
                    "终态 " + from + " 不可再转换");
        }
        boolean ok = switch (from) {
            case CREATED -> to == RUNNING;
            case RUNNING -> to == SUCCEEDED || to == FAILED || to == TIMED_OUT || to == CANCELLED;
            default -> false;
        };
        if (!ok) {
            throw new ValidationException("INVALID_TRANSITION",
                    "非法状态转换: " + from + " -> " + to);
        }
    }
}
