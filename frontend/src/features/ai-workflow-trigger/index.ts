/**
 * AI 助手结构化工作流触发模块导出。
 */
export { canShowWorkflowTrigger } from './gate';
export type { WorkflowTriggerGateInput } from './gate';
export {
  buildCreateRunPayload,
  buildIdempotencyKey,
  parseWorkflowCommandFromMessage,
} from './selection';
export type { WorkflowSelection } from './selection';
export { WorkflowMentionPicker } from './WorkflowMentionPicker';
export { WorkflowRunCard } from './WorkflowRunCard';
