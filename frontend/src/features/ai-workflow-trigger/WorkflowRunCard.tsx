/**
 * AI 助手内工作流 Run 状态卡片。
 */
import React from 'react';
import { Alert, Button, Card, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { AI_ENTRY_COPY, AI_ENTRY_ROUTES } from '@/constants/ai-entry';
import type { AgentRunView } from '@/services/agent.service';
import { extractAgentAnswer } from '@/utils/agent-access';
import { isTerminalRunStatus } from '@/features/agent-workflow/run-debug';
import type { WorkflowSelection } from './selection';

export type WorkflowRunCardProps = {
  selection: WorkflowSelection;
  query: string;
  run: AgentRunView | null;
  errorMessage?: string | null;
  onCancel?: () => void;
  cancelling?: boolean;
};

/**
 * 渲染单次结构化工作流触发结果。
 *
 * @param props 选中流程、问题与 Run 状态
 */
export const WorkflowRunCard: React.FC<WorkflowRunCardProps> = ({
  selection,
  query,
  run,
  errorMessage,
  onCancel,
  cancelling,
}) => {
  const copy = AI_ENTRY_COPY.assistant;
  const agentCopy = AI_ENTRY_COPY.agent;
  const status = run?.status ?? (errorMessage ? 'FAILED' : 'RUNNING');
  const answer = extractAgentAnswer(run?.outputJson);
  const terminal = isTerminalRunStatus(status);

  return (
    <Card size="small" style={{ marginBottom: 12, maxWidth: 720 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue">@{selection.name}</Tag>
          <Tag>{status}</Tag>
          {run?.id != null ? <Typography.Text type="secondary">Run #{run.id}</Typography.Text> : null}
        </Space>
        <Typography.Text type="secondary">问题：{query}</Typography.Text>
        {errorMessage ? (
          <Alert type="error" showIcon message={copy.workflowFailed} description={errorMessage} />
        ) : null}
        {!errorMessage && !terminal ? (
          <Typography.Text>{copy.workflowRunning}</Typography.Text>
        ) : null}
        {answer ? (
          <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {answer}
          </Typography.Paragraph>
        ) : null}
        <Space>
          {!terminal && onCancel ? (
            <Button size="small" danger loading={cancelling} onClick={onCancel}>
              取消
            </Button>
          ) : null}
          {run?.id != null ? (
            <Link to={AI_ENTRY_ROUTES.agent}>
              <Button size="small" type="link">
                {copy.workflowOpenAgent}
              </Button>
            </Link>
          ) : null}
          {run?.cancelRequested ? (
            <Typography.Text type="secondary">{agentCopy.cancelHint}</Typography.Text>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
};
