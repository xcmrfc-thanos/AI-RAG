/**
 * 功能模块：DebugDrawer。
 */
import React, { memo, useMemo } from 'react';
import { Button, Drawer, Empty, Space, Tag, Typography } from 'antd';
import type { AgentRunStepView, AgentRunView } from '@/services/agent.service';
import { isTerminalRunStatus, parseSnapshot } from './run-debug';
import './DebugDrawer.css';

const { Text, Paragraph } = Typography;

interface DebugDrawerProps {
  open: boolean;
  run: AgentRunView | null;
  steps: AgentRunStepView[];
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
  onCancel?: () => void;
}

/**
 * DebugDrawer 组件。
 */
const DebugDrawer: React.FC<DebugDrawerProps> = ({
  open,
  run,
  steps,
  selectedNodeId,
  onSelectNode,
  onClose,
  onCancel,
}) => {
  const selectedStep = useMemo(
    () => steps.find((step) => step.nodeId === selectedNodeId) || steps.at(-1) || null,
    [selectedNodeId, steps],
  );
  const running = run ? !isTerminalRunStatus(run.status) : false;

  return (
    <Drawer
      title="草稿调试"
      placement="bottom"
      size="46vh"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
      extra={run ? (
        <Space>
          <Tag color={statusColor(run.status)}>{run.status}</Tag>
          <Text type="secondary">{run.durationMs ?? 0} ms</Text>
          {running && onCancel ? <Button danger size="small" onClick={onCancel}>请求取消</Button> : null}
        </Space>
      ) : null}
    >
      {!run ? <Empty description="运行草稿后在这里查看节点轨迹" /> : (
        <div className="wf-debug-layout">
          <aside className="wf-debug-steps">
            <div className="wf-debug-run-summary">
              <Text strong>Run #{run.id}</Text>
              <Text type="secondary">来源：{run.runSource || 'DRAFT'}</Text>
              {run.errorMessage ? <Text type="danger">{run.errorMessage}</Text> : null}
            </div>
            {steps.map((step, index) => (
              <button
                key={step.id || `${step.nodeId}-${index}`}
                type="button"
                className={`wf-debug-step${selectedStep?.nodeId === step.nodeId ? ' is-selected' : ''}`}
                onClick={() => onSelectNode(step.nodeId)}
              >
                <span className={`wf-debug-step__dot is-${step.status.toLowerCase()}`} />
                <span className="wf-debug-step__main">
                  <span className="wf-debug-step__name">{step.nodeId}</span>
                  <span className="wf-debug-step__tool">{step.toolName || step.nodeType}</span>
                </span>
                <span className="wf-debug-step__time">{step.durationMs ?? 0} ms</span>
              </button>
            ))}
          </aside>
          <main className="wf-debug-detail">
            {selectedStep ? (
              <>
                <Space wrap>
                  <Text strong>{selectedStep.nodeId}</Text>
                  <Tag color={statusColor(selectedStep.status)}>{selectedStep.status}</Tag>
                  <Text type="secondary">{selectedStep.durationMs ?? 0} ms</Text>
                </Space>
                {selectedStep.errorMessage ? (
                  <Paragraph type="danger" className="wf-debug-error">
                    {selectedStep.errorMessage}
                  </Paragraph>
                ) : null}
                <Snapshot title="输入快照" value={selectedStep.inputSnapshot} />
                <Snapshot title="输出快照" value={selectedStep.outputSnapshot} />
              </>
            ) : <Empty description="暂无节点步骤" />}
          </main>
        </div>
      )}
    </Drawer>
  );
};

/**
 * Snapshot 组件。
 */
const Snapshot: React.FC<{ title: string; value?: string | null }> = ({ title, value }) => (
  <section className="wf-debug-snapshot">
    <Text strong>{title}</Text>
    <pre>{parseSnapshot(value) || '无'}</pre>
  </section>
);

/**
 * statusColor 方法。
 */
function statusColor(status: string): string {
  if (status === 'SUCCEEDED') return 'green';
  if (status === 'RUNNING' || status === 'CREATED') return 'blue';
  if (status === 'CANCELLED') return 'default';
  return 'red';
}

export default memo(DebugDrawer);
