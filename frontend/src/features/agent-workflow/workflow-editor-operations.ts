import type { Edge, Node, XYPosition } from '@xyflow/react';
import { defaultInputFor, getCatalogItem, type AgentNodeKind } from './node-catalog';
import type { FlowNodeData, WorkflowToolName } from './types';

export interface VariableOption {
  value: string;
  label: string;
  description?: string;
}

export interface FlowSnapshot {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

export interface CopiedFlowNode {
  label: string;
  schemaType: 'tool' | 'llm' | 'condition';
  kind?: string;
  tool?: WorkflowToolName;
  input: Record<string, unknown>;
}

export function cloneFlowSnapshot(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): FlowSnapshot {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      data: { ...node.data, input: { ...node.data.input } },
    })),
    edges: edges.map((edge) => ({ ...edge })),
  };
}

/**
 * 是否允许连线：条件节点最多两条出边；普通节点一条；允许汇合入边
 *
 * @param connection 待连线
 * @param nodes 节点
 * @param edges 已有边
 * @returns 是否允许
 */
export function isAllowedLinearConnection(
  connection: {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
  },
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): boolean {
  const { source, target, sourceHandle } = connection;
  if (!source || !target || source === target) return false;
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) return false;
  if (sourceNode.data.kind === 'end' || targetNode.data.kind === 'start') return false;

  const isCondition = sourceNode.data.schemaType === 'condition';
  const sourceOuts = edges.filter((edge) => edge.source === source);
  if (isCondition) {
    if (sourceOuts.length >= 2) return false;
    const when = sourceHandle === 'true' || sourceHandle === 'false'
      ? sourceHandle
      : undefined;
    if (when && sourceOuts.some((edge) => edge.sourceHandle === when
      || (edge.data as { when?: string } | undefined)?.when === when)) {
      return false;
    }
  } else if (sourceOuts.length >= 1) {
    return false;
  }

  if (edges.some((edge) => edge.source === source && edge.target === target)) {
    return false;
  }
  return true;
}

export function createFlowNode(
  kind: AgentNodeKind,
  id: string,
  position: XYPosition,
): Node<FlowNodeData> {
  const meta = getCatalogItem(kind);
  if (meta.virtual) {
    return {
      id,
      type: 'agentNode',
      position,
      data: { label: meta.title, schemaType: 'virtual', kind, input: {} },
    };
  }
  if (kind === 'llm') {
    return {
      id,
      type: 'agentNode',
      position,
      data: { label: meta.title, schemaType: 'llm', kind, input: defaultInputFor(kind) },
    };
  }
  if (kind === 'condition') {
    return {
      id,
      type: 'agentNode',
      position,
      data: { label: meta.title, schemaType: 'condition', kind, input: defaultInputFor(kind) },
    };
  }
  return {
    id,
    type: 'agentNode',
    position,
    data: {
      label: meta.title,
      schemaType: 'tool',
      kind,
      tool: kind as WorkflowToolName,
      input: defaultInputFor(kind),
    },
  };
}

export function disconnectEdge(edges: Edge[], edgeId: string): Edge[] {
  if (!edges.some((edge) => edge.id === edgeId)) return edges;
  return edges.filter((edge) => edge.id !== edgeId);
}

export function copyFlowNode(node: Node<FlowNodeData>): CopiedFlowNode | null {
  if (node.data.schemaType === 'virtual') return null;
  return {
    label: node.data.label,
    schemaType: node.data.schemaType,
    kind: node.data.kind,
    tool: node.data.tool,
    input: cloneJsonRecord(node.data.input),
  };
}

export function pasteFlowNode(
  copied: CopiedFlowNode,
  id: string,
  position: XYPosition,
): Node<FlowNodeData> {
  return {
    id,
    type: 'agentNode',
    position,
    data: {
      ...copied,
      input: cloneJsonRecord(copied.input),
    },
  };
}

export function positionBetweenConnectedNodes(
  nodes: Node<FlowNodeData>[],
  edge: Edge,
): XYPosition {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return { x: 80, y: 160 };
  return {
    x: (source.position.x + target.position.x) / 2,
    y: (source.position.y + target.position.y) / 2,
  };
}

export function selectOnlyFlowNode<T extends Node>(nodes: T[], nodeId: string): T[] {
  return selectOnlyElement(nodes, nodeId);
}

export function selectOnlyFlowEdge<T extends Edge>(edges: T[], edgeId: string): T[] {
  return selectOnlyElement(edges, edgeId);
}

export function insertNodeOnEdge<T extends Node<FlowNodeData>>(
  nodes: T[],
  edges: Edge[],
  edgeId: string,
  inserted: T,
): { nodes: T[]; edges: Edge[] } {
  const targetEdge = edges.find((edge) => edge.id === edgeId);
  if (!targetEdge) return { nodes, edges };
  const nextEdges = edges.flatMap((edge) => {
    if (edge.id !== edgeId) return [edge];
    const previousData = edge.data && typeof edge.data === 'object'
      ? edge.data as Record<string, unknown>
      : undefined;
    const strippedData = previousData
      ? Object.fromEntries(Object.entries(previousData).filter(([key]) => key !== 'when'))
      : undefined;
    return [
      {
        ...edge,
        id: `e-${edge.source}-${inserted.id}`,
        target: inserted.id,
      },
      {
        id: `e-${inserted.id}-${edge.target}`,
        source: inserted.id,
        target: edge.target,
        animated: edge.animated,
        style: edge.style,
        ...(strippedData && Object.keys(strippedData).length > 0 ? { data: strippedData } : {}),
      },
    ];
  });
  return { nodes: [...nodes, inserted], edges: nextEdges };
}

export function deleteNodeAndReconnect<T extends Node<FlowNodeData>>(
  nodes: T[],
  edges: Edge[],
  nodeId: string,
): { nodes: T[]; edges: Edge[] } {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  const outgoing = edges.filter((edge) => edge.source === nodeId);
  const kept = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
  const deleted = nodes.find((node) => node.id === nodeId);
  const isCondition = deleted?.data.schemaType === 'condition';
  // 条件节点删除时不自动叉乘重连，避免生成非法并行
  const reconnect = (!isCondition && incoming.length === 1 && outgoing.length === 1)
    ? [{
        id: `e-${incoming[0].source}-${outgoing[0].target}`,
        source: incoming[0].source,
        target: outgoing[0].target,
        ...(outgoing[0].sourceHandle ? { sourceHandle: outgoing[0].sourceHandle } : {}),
        ...(outgoing[0].data ? { data: outgoing[0].data } : {}),
        ...(outgoing[0].label != null ? { label: outgoing[0].label } : {}),
      }]
    : (!isCondition
      ? incoming.flatMap((left) => outgoing.map((right) => ({
          id: `e-${left.source}-${right.target}`,
          source: left.source,
          target: right.target,
        })))
      : []);
  return { nodes: nodes.filter((node) => node.id !== nodeId), edges: [...kept, ...reconnect] };
}

export function layoutLinearFlow<T extends Node<FlowNodeData>>(
  nodes: T[],
  edges: Edge[],
  xStart = 40,
  xGap = 260,
  y = 120,
): T[] {
  const order = topologicalOrder(nodes.map((node) => node.id), edges);
  const indexes = new Map(order.map((id, index) => [id, index]));
  return nodes.map((node) => ({
    ...node,
    position: { x: xStart + (indexes.get(node.id) || 0) * xGap, y },
  }));
}

export function getUpstreamVariableOptions(
  nodeId: string,
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): VariableOption[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const previous = new Map<string, string[]>();
  for (const edge of edges) {
    previous.set(edge.target, [...(previous.get(edge.target) || []), edge.source]);
  }
  const seen = new Set<string>();
  const queue = [...(previous.get(nodeId) || [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(previous.get(id) || []));
  }
  const options: VariableOption[] = [];
  for (const id of seen) {
    const node = nodeMap.get(id);
    if (!node) continue;
    const kind = (node.data.kind || node.data.tool || node.data.schemaType) as AgentNodeKind;
    for (const output of getCatalogItem(kind).outputs) {
      const value = node.data.schemaType === 'virtual'
        ? `\${input.${output.path}}`
        : `\${steps.${id}.output.${output.path}}`;
      options.push({ value, label: `${node.data.label} · ${output.label}`, description: output.description });
    }
  }
  return options;
}

function topologicalOrder(ids: string[], edges: Edge[]): string[] {
  const indegree = new Map(ids.map((id) => [id, 0]));
  const next = new Map(ids.map((id) => [id, [] as string[]]));
  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    next.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
  }
  const queue = ids.filter((id) => indegree.get(id) === 0);
  const result: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(id);
    for (const child of next.get(id) || []) {
      indegree.set(child, (indegree.get(child) || 0) - 1);
      if (indegree.get(child) === 0) queue.push(child);
    }
  }
  return result.length === ids.length ? result : ids;
}

function cloneJsonRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]));
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (value && typeof value === 'object') return cloneJsonRecord(value as Record<string, unknown>);
  return value;
}

function selectOnlyElement<T extends { id: string; selected?: boolean }>(
  elements: T[],
  selectedId: string,
): T[] {
  let changed = false;
  const selected = elements.map((element) => {
    const shouldSelect = element.id === selectedId;
    if (Boolean(element.selected) === shouldSelect) return element;
    changed = true;
    return { ...element, selected: shouldSelect };
  });
  return changed ? selected : elements;
}
