/**
 * 前端 API 服务：agent.service。
 */
import { http } from './request';

/**
 * 工作流列表项
 */
export interface AgentWorkflowSummary {
  id: number;
  name: string;
  ownerUserId: number;
  publishedVersionId?: number | null;
  hasDraft?: boolean;
  draftJson?: string | null;
  updatedAt?: string;
}

/**
 * Run 视图
 */
export interface AgentRunView {
  id: number;
  workflowVersionId: number | null;
  runSource?: 'PUBLISHED' | 'DRAFT';
  sessionId?: number | null;
  status: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  inputJson?: string | null;
  outputJson?: string | null;
  idempotencyKey?: string | null;
  cancelRequested?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt?: string | null;
  cancelHint?: string;
}

/**
 * Step 轨迹
 */
export interface AgentRunStepView {
  id: number;
  runId: number;
  nodeId: string;
  nodeType: string;
  toolName?: string | null;
  status: string;
  inputSnapshot?: string | null;
  outputSnapshot?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
}

/**
 * Agent HTTP API（经网关 /api/agent/**）
 *
 * @author AI-RAG
 */
export const agentService = {
  /**
   * 已发布工作流列表（用户运行页）
   */
  listPublishedWorkflows: () =>
    http.get<AgentWorkflowSummary[]>('/agent/workflows', { params: { publishedOnly: true } }),

  /**
   * 我的工作流列表（管理页）
   */
  listMyWorkflows: () =>
    http.get<AgentWorkflowSummary[]>('/agent/workflows', { params: { publishedOnly: false } }),

  /**
   * 工作流详情（所有者含 draftJson）
   */
  getWorkflow: (id: number) => http.get<AgentWorkflowSummary>(`/agent/workflows/${id}`),

  /**
   * 创建草稿
   */
  createWorkflow: (name: string, draftJson?: string) =>
    http.post<AgentWorkflowSummary>('/agent/workflows', { name, draftJson }),

  /**
   * 更新草稿
   */
  updateDraft: (id: number, draftJson: string) =>
    http.put<AgentWorkflowSummary>(`/agent/workflows/${id}/draft`, { draftJson }),

  /**
   * 校验草稿
   */
  validateDraft: (id: number) =>
    http.post<{ valid: boolean; nodeOrder: string[] }>(`/agent/workflows/${id}/validate`),

  /**
   * 发布
   */
  publish: (id: number) =>
    http.post<{ workflowId: number; workflowVersionId: number }>(`/agent/workflows/${id}/publish`),

  /**
   * 使用当前定义快照试运行草稿，不创建发布版本
   */
  runDraft: (id: number, payload: {
    definitionJson: string;
    sessionId?: number;
    input?: Record<string, unknown>;
    idempotencyKey?: string;
  }) => http.post<AgentRunView>(`/agent/workflows/${id}/draft-runs`, payload),

  /**
   * 创建 Session
   */
  createSession: (title?: string) =>
    http.post<{ id: number }>('/agent/sessions', { title }),

  /**
   * 发起 Run（同步至终态）
   */
  createRun: (payload: {
    workflowVersionId: number;
    sessionId?: number;
    input?: Record<string, unknown>;
    idempotencyKey?: string;
  }) => http.post<AgentRunView>('/agent/runs', payload),

  /**
   * 查询 Run
   */
  getRun: (id: number) => http.get<AgentRunView>(`/agent/runs/${id}`),

  /**
   * Step 轨迹
   */
  listSteps: (id: number) => http.get<AgentRunStepView[]>(`/agent/runs/${id}/steps`),

  /**
   * 协作取消
   */
  cancelRun: (id: number) => http.post<AgentRunView>(`/agent/runs/${id}/cancel`),
};

export default agentService;
