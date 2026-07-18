import type { Edge, Node } from '@xyflow/react';
import type {
  FlowNodeData,
  WorkflowDefinitionV1,
  WorkflowEdgeV1,
  WorkflowNodeV1,
} from './types';
import { displayTitle, type AgentNodeKind } from './node-catalog';
import { edgeWhen } from './workflow-validation';

/**
 * 解析工作流 JSON 字符串为 Schema v1 对象
 *
 * @param json 草稿 JSON
 * @returns 定义对象
 */
export function parseWorkflowJson(json: string): WorkflowDefinitionV1 {
  const raw = JSON.parse(json) as WorkflowDefinitionV1;
  if (!raw || raw.schemaVersion !== 1) {
    throw new Error('仅支持 schemaVersion=1');
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error('nodes/edges 必须为数组');
  }
  return {
    schemaVersion: 1,
    name: typeof raw.name === 'string' ? raw.name : '未命名',
    ...(raw.inputSchema ? { inputSchema: raw.inputSchema } : {}),
    ...(raw.uiSchema ? { uiSchema: raw.uiSchema } : {}),
    nodes: raw.nodes as WorkflowNodeV1[],
    edges: raw.edges as WorkflowEdgeV1[],
  };
}

/**
 * Schema 节点 → React Flow 节点（按 edges 做简易横向布局）
 *
 * @param workflow 工作流定义
 * @returns RF nodes/edges
 */
export function workflowToFlow(workflow: WorkflowDefinitionV1): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const order = topologicalOrder(
    workflow.nodes.map((n) => n.id),
    workflow.edges,
  );
  const indexOf = new Map(order.map((id, i) => [id, i]));
  const canvasNodeMap = new Map(
    (workflow.uiSchema?.canvasNodes || []).map((item) => [item.id, item]),
  );

  const nodes: Node<FlowNodeData>[] = workflow.nodes.map((n) => {
    const idx = indexOf.get(n.id) ?? 0;
    const kind = n.type === 'tool' ? n.tool : n.type;
    const data: FlowNodeData = {
      label: displayTitle(n.type, n.type === 'tool' ? n.tool : undefined, kind),
      schemaType: n.type,
      kind,
      input: { ...(n.input || {}) },
      ...(n.type === 'tool' ? { tool: n.tool } : {}),
    };
    const saved = canvasNodeMap.get(n.id);
    return {
      id: n.id,
      type: 'agentNode',
      position: saved?.position || { x: 60 + idx * 260, y: 120 + (idx % 2) * 36 },
      data,
    };
  });

  const virtualNodes: Node<FlowNodeData>[] = (workflow.uiSchema?.canvasNodes || [])
    .filter((item) => item.kind === 'start' || item.kind === 'end')
    .map((item) => ({
      id: item.id,
      type: 'agentNode',
      position: item.position,
      data: {
        label: displayTitle('virtual', undefined, item.kind),
        schemaType: 'virtual',
        kind: item.kind,
        input: {},
      },
    }));

  const canvasEdges = workflow.uiSchema?.canvasEdges || workflow.edges;
  const edges: Edge[] = canvasEdges.map((e, i) => {
    const when = e.when === 'true' || e.when === 'false' ? e.when : undefined;
    return {
      id: `e-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      ...(when ? { sourceHandle: when, label: when, data: { when } } : {}),
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 1.5 },
    };
  });

  return { nodes: [...nodes, ...virtualNodes], edges };
}

/**
 * React Flow 状态 → Schema v1（导出同构 JSON 结构）
 *
 * @param name 工作流名称
 * @param nodes RF 节点
 * @param edges RF 边
 * @returns Schema v1 定义
 */
export function flowToWorkflow(
  name: string,
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  metadata?: Pick<WorkflowDefinitionV1, 'inputSchema' | 'uiSchema'>,
): WorkflowDefinitionV1 {
  const executableNodes = nodes.filter((node) => node.data.schemaType !== 'virtual');
  const executableIds = new Set(executableNodes.map((node) => node.id));
  const schemaNodes: WorkflowNodeV1[] = executableNodes.map((n) => {
    const data = n.data;
    if (data.schemaType === 'tool') {
      return {
        id: n.id,
        type: 'tool',
        tool: data.tool || 'hybrid_search',
        input: data.input || {},
      };
    }
    if (data.schemaType === 'condition') {
      const expression = typeof data.input?.expression === 'string'
        ? data.input.expression
        : '${input.score} >= 60';
      return {
        id: n.id,
        type: 'condition',
        input: { ...(data.input || {}), expression },
      };
    }
    const prompt =
      typeof data.input?.prompt === 'string' ? data.input.prompt : '请回答：${input.query}';
    return {
      id: n.id,
      type: 'llm',
      input: { ...(data.input || {}), prompt },
    };
  });

  const schemaEdges: WorkflowEdgeV1[] = edges
    .filter((e) => executableIds.has(e.source) && executableIds.has(e.target))
    .map((e) => {
      const when = edgeWhen(e);
      return when ? { from: e.source, to: e.target, when } : { from: e.source, to: e.target };
    });

  const uiSchema = {
    ...(metadata?.uiSchema || {}),
    canvasNodes: nodes.map((node) => ({
      id: node.id,
      kind: (node.data.kind || node.data.tool || node.data.schemaType) as AgentNodeKind,
      position: node.position,
    })),
    canvasEdges: edges.map((edge) => {
      const when = edgeWhen(edge);
      return when
        ? { from: edge.source, to: edge.target, when }
        : { from: edge.source, to: edge.target };
    }),
  };

  return {
    schemaVersion: 1,
    name: name || '未命名',
    ...(metadata?.inputSchema ? { inputSchema: metadata.inputSchema } : {}),
    ...(nodes.length > 0 ? { uiSchema } : metadata?.uiSchema ? { uiSchema: metadata.uiSchema } : {}),
    nodes: schemaNodes,
    edges: schemaEdges,
  };
}

/**
 * 序列化为紧凑可读 JSON
 *
 * @param workflow 定义
 * @returns JSON 字符串
 */
export function serializeWorkflow(workflow: WorkflowDefinitionV1): string {
  return `${JSON.stringify(workflow, null, 2)}\n`;
}

/**
 * 简易拓扑序；有环时退回原序
 *
 * @param ids 节点 id
 * @param edges 边
 * @returns 排序后的 id
 */
function topologicalOrder(ids: string[], edges: WorkflowEdgeV1[]): string[] {
  const indeg = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(ids.map((id) => [id, [] as string[]]));
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) {
      continue;
    }
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const queue = ids.filter((id) => (indeg.get(id) || 0) === 0);
  const out: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    out.push(cur);
    for (const next of adj.get(cur) || []) {
      const d = (indeg.get(next) || 0) - 1;
      indeg.set(next, d);
      if (d === 0) {
        queue.push(next);
      }
    }
  }
  return out.length === ids.length ? out : ids;
}

/**
 * 生成合法节点 id
 *
 * @param prefix 前缀
 * @param existing 已有 id
 * @returns 新 id
 */
export function nextNodeId(prefix: string, existing: string[]): string {
  let i = 1;
  let candidate = `${prefix}${i}`;
  const set = new Set(existing);
  while (set.has(candidate)) {
    i += 1;
    candidate = `${prefix}${i}`;
  }
  return candidate;
}
