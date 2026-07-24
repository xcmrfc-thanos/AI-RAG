/**
 * 功能模块：WorkflowNode。
 */
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from './types';
import { displayTitle, getCatalogItem } from './node-catalog';

/**
 * Agent 画布自定义节点（工具 / LLM / 条件）
 *
 * @param props React Flow 节点属性
 */
const WorkflowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as FlowNodeData;
  const kind =
    nodeData.schemaType === 'virtual'
      ? (nodeData.kind as 'start' | 'end')
      : nodeData.schemaType === 'llm' || nodeData.schemaType === 'condition'
      ? nodeData.schemaType
      : (nodeData.tool || 'hybrid_search');
  const meta = getCatalogItem(kind);
  const title = displayTitle(nodeData.schemaType, nodeData.tool, nodeData.kind);
  const summary = summarizeInput(nodeData.input, kind);
  const stateLabel = runStateLabel(nodeData.runStatus)
    || (meta.virtual || Object.keys(nodeData.input || {}).length > 0 ? '配置完整' : '待配置');
  const isCondition = nodeData.schemaType === 'condition';

  return (
    <div
      className={`wf-node${selected ? ' is-selected' : ''}${nodeData.runStatus ? ` is-${nodeData.runStatus.toLowerCase()}` : ''}`}
      style={{ ['--wf-accent' as string]: meta.accent }}
    >
      {kind !== 'start' ? (
        <Handle type="target" position={Position.Left} className="wf-node__handle" />
      ) : null}
      <div className="wf-node__bar" />
      <div className="wf-node__body">
        <div className="wf-node__title">{title}</div>
        <div className="wf-node__sub">{meta.subtitle}</div>
        <div className="wf-node__summary">{summary}</div>
        <div className="wf-node__state">
          <span className="wf-node__state-dot" />
          {stateLabel}{nodeData.durationMs != null ? ` · ${nodeData.durationMs} ms` : ''}
        </div>
      </div>
      {kind !== 'end' && !isCondition ? (
        <Handle type="source" position={Position.Right} className="wf-node__handle" />
      ) : null}
      {isCondition ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            className="wf-node__handle wf-node__handle--true"
            style={{ top: '32%' }}
            title="true"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            className="wf-node__handle wf-node__handle--false"
            style={{ top: '68%' }}
            title="false"
          />
        </>
      ) : null}
    </div>
  );
};

export default memo(WorkflowNode);

/**
 * 摘要展示节点关键输入
 *
 * @param input 输入
 * @param kind 节点 kind
 * @returns 摘要文本
 */
function summarizeInput(input: Record<string, unknown>, kind: string): string {
  if (kind === 'start') return '运行输入';
  if (kind === 'end') return '最终结果';
  if (kind === 'condition') {
    const expression = input?.expression != null ? String(input.expression) : '';
    return expression.length > 42 ? `${expression.slice(0, 42)}…` : (expression || '待配置表达式');
  }
  const preferred = ['query', 'documentId', 'keyword', 'template', 'prompt'];
  const key = preferred.find((item) => input?.[item] != null);
  if (!key) return '无需参数';
  const value = String(input[key]);
  return value.length > 42 ? `${value.slice(0, 42)}…` : value;
}

/**
 * 运行态标签
 *
 * @param status 状态
 * @returns 文案
 */
function runStateLabel(status?: string): string | null {
  if (status === 'RUNNING') return '运行中';
  if (status === 'SUCCEEDED') return '运行成功';
  if (status === 'FAILED') return '运行失败';
  if (status === 'CANCELLED') return '已取消';
  if (status === 'TIMED_OUT') return '已超时';
  return null;
}
