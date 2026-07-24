/**
 * 功能模块：workflow-validation。
 */
import type { Edge, Node } from '@xyflow/react';
import type { FlowNodeData } from './types';

export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 校验画布：线性链 + 条件二分支（须汇合）
 *
 * @param nodes RF 节点
 * @param edges RF 边
 * @returns 校验结果
 */
export function validateFlow(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): FlowValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, Edge[]>();
  const neighbors = new Map<string, Set<string>>();

  for (const node of nodes) {
    if (ids.has(node.id)) errors.push(`节点 ID 重复：${node.id}`);
    ids.add(node.id);
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
    neighbors.set(node.id, new Set());
  }

  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      errors.push(`连线引用不存在节点：${edge.source} → ${edge.target}`);
      continue;
    }
    if (edge.source === edge.target) errors.push(`不允许自环：${edge.source}`);
    const when = edgeWhen(edge);
    const key = `${edge.source}->${edge.target}:${when || ''}`;
    if (edgeKeys.has(key)) errors.push(`连线重复：${edge.source} → ${edge.target}`);
    edgeKeys.add(key);
    outgoing.get(edge.source)!.push(edge);
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
  }

  for (const node of nodes) {
    const inCount = incoming.get(node.id) || 0;
    const outs = outgoing.get(node.id) || [];
    const outCount = outs.length;
    const isCondition = node.data.schemaType === 'condition' || node.data.kind === 'condition';

    if (isCondition) {
      if (outCount !== 2) {
        errors.push(`条件节点必须恰好两条出边(true/false)：${node.id}`);
      } else {
        const whens = outs.map((edge) => edgeWhen(edge));
        if (!whens.includes('true') || !whens.includes('false')) {
          errors.push(`条件节点出边须分别标记 true/false：${node.id}`);
        }
      }
    } else if (outCount > 1) {
      errors.push(`节点存在多个后继：${node.id}`);
    } else if (outCount === 1 && edgeWhen(outs[0])) {
      errors.push(`非条件节点出边不能带 when：${node.id}`);
    }

    if (node.data.kind === 'start' && inCount > 0) errors.push('开始节点不能有输入连线');
    if (node.data.kind === 'end' && outCount > 0) errors.push('结束节点不能有输出连线');
    if (nodes.length > 1 && inCount === 0 && outCount === 0) errors.push(`存在孤立节点：${node.id}`);
  }
  if (nodes.length > 0 && connectedCount(nodes[0].id, neighbors) !== nodes.length) {
    errors.push('工作流存在不连通片段');
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

/**
 * 读取边上的 when 标签
 *
 * @param edge RF 边
 * @returns true|false|undefined
 */
export function edgeWhen(edge: Edge): 'true' | 'false' | undefined {
  const fromData = edge.data && typeof edge.data === 'object'
    ? (edge.data as { when?: unknown }).when
    : undefined;
  const raw = fromData ?? edge.label;
  if (raw === 'true' || raw === 'false') return raw;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false') return normalized;
  }
  if (edge.sourceHandle === 'true' || edge.sourceHandle === 'false') {
    return edge.sourceHandle;
  }
  return undefined;
}

/**
 * connectedCount 方法。
 */
function connectedCount(start: string, neighbors: Map<string, Set<string>>): number {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of neighbors.get(current) || []) queue.push(next);
  }
  return seen.size;
}
