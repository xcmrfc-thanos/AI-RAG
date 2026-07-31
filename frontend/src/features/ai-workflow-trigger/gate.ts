/**
 * AI 助手结构化工作流触发门禁。
 */
import type { User } from '@/types';
import { AGENT_PERMISSIONS } from '@/constants/ai-entry';
import { hasAnyPermission } from '@/utils/permission';

export type WorkflowTriggerGateInput = {
  enableAI: boolean;
  enableAgent: boolean;
  enableAiWorkflowTrigger: boolean;
  user?: User | null;
};

/**
 * 是否在 AI 助手展示工作流选择器。
 *
 * @param input 开关与用户
 * @returns 是否展示
 */
export function canShowWorkflowTrigger(input: WorkflowTriggerGateInput): boolean {
  if (!input.enableAI || !input.enableAgent || !input.enableAiWorkflowTrigger) {
    return false;
  }
  return hasAnyPermission(input.user, [AGENT_PERMISSIONS.workflowView, AGENT_PERMISSIONS.run]);
}
