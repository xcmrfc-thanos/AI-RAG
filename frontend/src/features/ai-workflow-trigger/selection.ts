/**
 * AI 助手结构化工作流触发：选中态与 Run 载荷构建。
 * 禁止从消息正文解析 @名称 + JSON。
 */
export type WorkflowSelection = {
  workflowId: number;
  workflowVersionId: number;
  name: string;
};

/**
 * 构建 Run 幂等键。
 *
 * @param conversationId 当前会话 ID，无会话时传 null
 * @param workflowVersionId 已发布版本 ID
 * @param nonce 单次触发随机串
 * @returns 幂等键
 */
export function buildIdempotencyKey(
  conversationId: string | number | null,
  workflowVersionId: number,
  nonce: string,
): string {
  const conv = conversationId == null || conversationId === '' ? 'anon' : String(conversationId);
  return `ai-wf-${conv}-${workflowVersionId}-${nonce}`;
}

/**
 * 由结构化选中态与用户问题构建 createRun 载荷；无选中或空问题时返回 null。
 *
 * @param selection 选择器保存的工作流引用
 * @param query 用户输入的问题
 * @param idempotencyKey 幂等键
 * @returns createRun payload 或 null
 */
export function buildCreateRunPayload(
  selection: WorkflowSelection | null,
  query: string,
  idempotencyKey: string,
): { workflowVersionId: number; input: { query: string }; idempotencyKey: string } | null {
  if (!selection) {
    return null;
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  return {
    workflowVersionId: selection.workflowVersionId,
    input: { query: trimmed },
    idempotencyKey,
  };
}

/**
 * 明确拒绝「从正文解析工作流命令」——始终返回 null，供测试锁定非目标。
 *
 * @param _messageText 用户消息正文（忽略）
 * @returns 始终 null
 */
export function parseWorkflowCommandFromMessage(_messageText: string): null {
  return null;
}
