/**
 * Agent 工作流 Schema v1 类型（与 docs/agent/workflow-schema-v1.json 对齐）
 */

/** Agent v1 工具白名单 */
export type WorkflowToolName =
  | 'hybrid_search'
  | 'get_document'
  | 'list_documents'
  | 'list_categories'
  | 'list_tags'
  | 'hot_documents'
  | 'latest_documents'
  | 'graph_search'
  | 'text_template';

/** 工具节点 */
export interface WorkflowToolNode {
  id: string;
  type: 'tool';
  tool: WorkflowToolName;
  input: Record<string, unknown>;
}

/** LLM 节点 */
export interface WorkflowLlmNode {
  id: string;
  type: 'llm';
  input: Record<string, unknown> & { prompt: string };
}

/** 条件节点（二分支，须汇合） */
export interface WorkflowConditionNode {
  id: string;
  type: 'condition';
  input: Record<string, unknown> & { expression: string };
}

/** Schema v1 节点联合 */
export type WorkflowNodeV1 = WorkflowToolNode | WorkflowLlmNode | WorkflowConditionNode;

/** Schema v1 边（条件出边带 when） */
export interface WorkflowEdgeV1 {
  from: string;
  to: string;
  when?: 'true' | 'false';
}

/** Run 输入字段声明 */
export interface WorkflowInputFieldSchema {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  label?: string;
  description?: string;
  defaultValue?: unknown;
}

/** 画布扩展元数据；后端执行器忽略该字段 */
export interface WorkflowUiSchema {
  canvasNodes?: Array<{
    id: string;
    kind: string;
    position: { x: number; y: number };
    [key: string]: unknown;
  }>;
  canvasEdges?: Array<{ from: string; to: string; when?: 'true' | 'false' }>;
  endOutput?: string;
  [key: string]: unknown;
}

/** Schema v1 根对象 */
export interface WorkflowDefinitionV1 {
  schemaVersion: 1;
  name: string;
  inputSchema?: Record<string, WorkflowInputFieldSchema>;
  uiSchema?: WorkflowUiSchema;
  nodes: WorkflowNodeV1[];
  edges: WorkflowEdgeV1[];
}

/** 画布节点 data */
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  schemaType: 'tool' | 'llm' | 'condition' | 'virtual';
  kind?: string;
  tool?: WorkflowToolName;
  input: Record<string, unknown>;
  runStatus?: string;
  durationMs?: number | null;
  runError?: string | null;
}
