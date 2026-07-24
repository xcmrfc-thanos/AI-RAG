/**
 * 功能模块：NodeInspector。
 */
import React, { memo, useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { Alert, Divider, Input, InputNumber, Space, Tag, Typography } from 'antd';
import { getCatalogItem, type AgentNodeKind } from './node-catalog';
import { getUpstreamVariableOptions } from './workflow-editor-operations';
import type { FlowNodeData } from './types';
import VariablePicker from './VariablePicker';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface NodeInspectorProps {
  node: Node<FlowNodeData> | null;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onChange: (nodeId: string, data: FlowNodeData) => void;
}

/**
 * NodeInspector 组件。
 */
const NodeInspector: React.FC<NodeInspectorProps> = ({ node, nodes, edges, onChange }) => {
  const options = useMemo(
    () => node ? getUpstreamVariableOptions(node.id, nodes, edges) : [],
    [node, nodes, edges],
  );

  if (!node) {
    return (
      <aside className="wf-editor__inspector">
        <div className="wf-editor__section-title">节点配置</div>
        <div className="wf-inspector-empty">
          点选画布节点后在这里配置。字段修改会立即写回草稿，无需再点击“应用”。
        </div>
      </aside>
    );
  }

  const kind = (node.data.kind || node.data.tool || node.data.schemaType) as AgentNodeKind;
  const meta = getCatalogItem(kind);
  const updateInput = (path: string, value: unknown) => onChange(node.id, {
    ...node.data,
    input: { ...node.data.input, [path]: value },
  });

  return (
    <aside className="wf-editor__inspector">
      <div className="wf-inspector-heading">
        <span className="wf-inspector-heading__mark" style={{ background: meta.accent }} />
        <div>
          <div className="wf-editor__section-title">{meta.title}</div>
          <Text type="secondary" className="wf-inspector-tool-name">{meta.subtitle}</Text>
        </div>
      </div>
      <Paragraph type="secondary" className="wf-inspector-description">{meta.hint}</Paragraph>

      <div className="wf-inspector-field">
        <span className="wf-inspector-label">节点 ID</span>
        <Input value={node.id} disabled />
      </div>

      {meta.virtual ? (
        <Alert
          type="info"
          showIcon
          message={kind === 'start' ? '运行输入入口' : '最终结果出口'}
          description={kind === 'start'
            ? '开始节点的输入字段由工作流模板或 inputSchema 定义。'
            : '结束节点用于表达最终结果，后端仍返回最后一个真实节点的输出。'}
        />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {meta.inputs.map((field) => {
            const value = node.data.input[field.path];
            const isLongText = field.path === 'prompt' || field.path === 'template'
              || field.path === 'expression';
            return (
              <div key={field.path} className="wf-inspector-field">
                <span className="wf-inspector-label">
                  {field.label}{field.required ? ' *' : ''}
                </span>
                {field.type === 'number' ? (
                  <InputNumber
                    style={{ width: '100%' }}
                    value={typeof value === 'number' ? value : undefined}
                    onChange={(next) => updateInput(field.path, next)}
                  />
                ) : isLongText ? (
                  <TextArea
                    rows={field.path === 'prompt' ? 10 : 6}
                    value={value == null ? '' : String(value)}
                    onChange={(event) => updateInput(field.path, event.target.value)}
                  />
                ) : (
                  <Input
                    value={value == null ? '' : String(value)}
                    onChange={(event) => updateInput(field.path, event.target.value)}
                  />
                )}
                {field.type === 'string' ? (
                  <div className="wf-variable-picker">
                    <VariablePicker
                      options={options}
                      onPick={(picked) => updateInput(
                        field.path,
                        `${value == null ? '' : String(value)}${picked}`,
                      )}
                    />
                  </div>
                ) : null}
                {field.description ? <Text type="secondary">{field.description}</Text> : null}
              </div>
            );
          })}
        </Space>
      )}

      <Divider />
      <div className="wf-inspector-label">输出字段</div>
      <Space wrap size={[4, 6]}>
        {meta.outputs.length > 0
          ? meta.outputs.map((output) => <Tag key={output.path}>{output.path}</Tag>)
          : <Text type="secondary">无</Text>}
      </Space>
    </aside>
  );
};

export default memo(NodeInspector);
