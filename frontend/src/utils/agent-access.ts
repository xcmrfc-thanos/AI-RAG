import type { User } from '@/types';
import { AGENT_PERMISSIONS } from '@/constants/ai-entry';
import { hasAdminAccess, hasAnyPermission, hasPermission } from '@/utils/permission';

/**
 * Agent 页面门禁结果
 */
export type AgentPageGate = 'ok' | 'disabled' | 'forbidden';

/**
 * 是否展示用户侧 Agent 导航（需开关 + view/run）
 *
 * @param enableAgent 系统开关
 * @param user 当前用户
 * @returns 是否可见
 */
export function canShowAgentNav(enableAgent: boolean, user?: User | null): boolean {
  if (!enableAgent) {
    return false;
  }
  return hasAnyPermission(user, [AGENT_PERMISSIONS.workflowView, AGENT_PERMISSIONS.run]);
}

/**
 * 是否展示 Agent 管理导航（需开关 + 编辑/发布或管理员）
 *
 * @param enableAgent 系统开关
 * @param user 当前用户
 * @returns 是否可见
 */
export function canShowAgentAdminNav(enableAgent: boolean, user?: User | null): boolean {
  if (!enableAgent) {
    return false;
  }
  if (hasAdminAccess(user)) {
    return true;
  }
  return hasAnyPermission(user, [
    AGENT_PERMISSIONS.workflowEdit,
    AGENT_PERMISSIONS.workflowPublish,
  ]);
}

/**
 * 用户运行页门禁
 *
 * @param enableAgent 系统开关
 * @param user 当前用户
 * @returns 门禁状态
 */
export function getAgentRunPageGate(enableAgent: boolean, user?: User | null): AgentPageGate {
  if (!enableAgent) {
    return 'disabled';
  }
  const canView = hasPermission(user, AGENT_PERMISSIONS.workflowView);
  const canRun = hasPermission(user, AGENT_PERMISSIONS.run);
  if (!canView && !canRun) {
    return 'forbidden';
  }
  return 'ok';
}

/**
 * 管理编排页门禁
 *
 * @param enableAgent 系统开关
 * @param user 当前用户
 * @returns 门禁状态
 */
export function getAgentAdminPageGate(enableAgent: boolean, user?: User | null): AgentPageGate {
  if (!enableAgent) {
    return 'disabled';
  }
  if (canShowAgentAdminNav(true, user)) {
    return 'ok';
  }
  return 'forbidden';
}

/**
 * 从 Run 输出中提取可读答案文本
 *
 * @param outputJson 引擎 output_json
 * @returns 展示文案
 */
export function extractAgentAnswer(outputJson?: string | null): string {
  if (!outputJson) {
    return '';
  }
  try {
    const parsed = JSON.parse(outputJson) as Record<string, unknown>;
    if (typeof parsed.text === 'string' && parsed.text.trim()) {
      return parsed.text;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return outputJson;
  }
}
