/**
 * 业务页面：AgentPage。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { PlayCircleOutlined, RobotOutlined, StopOutlined } from '@ant-design/icons';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import { useAppStore, useAuthStore } from '@/stores';
import { agentService, type AgentRunStepView, type AgentRunView, type AgentWorkflowSummary } from '@/services/agent.service';
import { settingsService } from '@/services';
import { extractAgentAnswer, getAgentRunPageGate } from '@/utils/agent-access';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 用户 Agent 运行页（仅运行已发布版本，无 JSON 编排）
 *
 * @author AI-RAG
 */
const AgentPage: React.FC = () => {
  const { message } = App.useApp();
  const enableAgent = useAppStore((s) => s.enableAgent);
  const user = useAuthStore((s) => s.user);
  const gate = getAgentRunPageGate(enableAgent, user);

  const [workflows, setWorkflows] = useState<AgentWorkflowSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState<AgentRunView | null>(null);
  const [steps, setSteps] = useState<AgentRunStepView[]>([]);
  const [cancelHint, setCancelHint] = useState<string | null>(null);

  const copy = AI_ENTRY_COPY.agent;

  /**
   * loadWorkflows。
   */
  const loadWorkflows = useCallback(async () => {
    try {
      const [list, settings] = await Promise.all([
        agentService.listPublishedWorkflows(),
        settingsService.getSettings().catch(() => null),
      ]);
      const workflowsList = Array.isArray(list) ? list : [];
      setWorkflows(workflowsList);

      const defaultId = Number(settings?.agent?.agentDefaultWorkflowId || 0);
      if (defaultId > 0) {
        const matched = workflowsList.find((w) => w.id === defaultId && w.publishedVersionId);
        if (matched?.publishedVersionId) {
          setSelectedVersionId(matched.publishedVersionId);
        }
      }
    } catch {
      setWorkflows([]);
    }
  }, []);

  useEffect(() => {
    if (gate === 'ok') {
      loadWorkflows();
    }
  }, [gate, loadWorkflows]);

  const options = useMemo(
    () =>
      workflows
        .filter((w) => w.publishedVersionId)
        .map((w) => ({
          value: w.publishedVersionId as number,
          label: `${w.name}（v${w.publishedVersionId}）`,
        })),
    [workflows],
  );

  if (gate === 'disabled') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <RobotOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
          <Title level={4}>{copy.disabledTitle}</Title>
          <Text type="secondary">{copy.disabledDesc}</Text>
        </div>
      </div>
    );
  }

  if (gate === 'forbidden') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Alert
          type="error"
          showIcon
          message="无权限访问 Agent"
          description="当前账号缺少 agent:workflow:view / agent:run 权限。Search ACL 未通过时普通用户不可用。"
          style={{ maxWidth: 520 }}
        />
      </div>
    );
  }

  /**
   * 发起一次 Run
   */
  const handleRun = async () => {
    if (!selectedVersionId) {
      message.warning('请先选择已发布工作流');
      return;
    }
    if (!query.trim()) {
      message.warning('请输入问题或关键词');
      return;
    }
    setLoading(true);
    setCancelHint(null);
    setRun(null);
    setSteps([]);
    try {
      const session = await agentService.createSession(query.slice(0, 40));
      const result = await agentService.createRun({
        workflowVersionId: selectedVersionId,
        sessionId: session?.id,
        input: { query: query.trim() },
      });
      setRun(result);
      if (result?.id) {
        const traj = await agentService.listSteps(result.id);
        setSteps(Array.isArray(traj) ? traj : []);
      }
      if (result?.status === 'FAILED') {
        message.error(result.errorMessage || '运行失败');
      } else if (result?.status === 'SUCCEEDED') {
        message.success('运行完成');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message || '发起 Run 失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 协作式取消
   */
  const handleCancel = async () => {
    if (!run?.id) {
      return;
    }
    try {
      const updated = await agentService.cancelRun(run.id);
      setRun(updated);
      setCancelHint(updated.cancelHint || copy.cancelHint);
      message.info(copy.cancelHint);
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message || '取消失败');
    }
  };

  const answer = extractAgentAnswer(run?.outputJson);
  const running = loading || run?.status === 'RUNNING' || run?.status === 'CREATED';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        {copy.title}
      </Title>
      <Paragraph type="secondary">{copy.subtitle}</Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>已发布工作流</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder={copy.emptyTitle}
              options={options}
              value={selectedVersionId}
              onChange={setSelectedVersionId}
              notFoundContent={<Empty description={copy.emptySubtitle} />}
            />
          </div>
          <div>
            <Text strong>输入</Text>
            <TextArea
              style={{ marginTop: 8 }}
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.placeholder}
            />
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={loading}
              onClick={handleRun}
            >
              运行
            </Button>
            <Button
              icon={<StopOutlined />}
              disabled={!run?.id || !running}
              onClick={handleCancel}
            >
              取消
            </Button>
          </Space>
          {cancelHint && <Alert type="info" showIcon message={cancelHint} />}
        </Space>
      </Card>

      {run && (
        <Card title="运行结果" style={{ marginBottom: 16 }}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Tag color={statusColor(run.status)}>{run.status}</Tag>
            {run.durationMs != null && <Text type="secondary">耗时 {run.durationMs} ms</Text>}
            {run.errorMessage && <Text type="danger">{run.errorMessage}</Text>}
          </Space>
          {answer ? (
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{answer}</Paragraph>
          ) : (
            <Empty description="暂无输出" />
          )}
        </Card>
      )}

      {steps.length > 0 && (
        <Card title="执行轨迹">
          <Timeline
            items={steps.map((s) => ({
              color: s.status === 'SUCCEEDED' ? 'green' : s.status === 'FAILED' ? 'red' : 'blue',
              children: (
                <div>
                  <Text strong>
                    {s.nodeId}（{s.nodeType}
                    {s.toolName ? ` / ${s.toolName}` : ''}）
                  </Text>
                  <div>
                    <Tag>{s.status}</Tag>
                    {s.durationMs != null && <Text type="secondary">{s.durationMs} ms</Text>}
                  </div>
                  {s.errorMessage && <Text type="danger">{s.errorMessage}</Text>}
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
};

/**
 * Run 状态颜色
 *
 * @param status 状态
 * @returns antd Tag 色
 */
function statusColor(status: string): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'success';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'error';
    case 'CANCELLED':
      return 'default';
    case 'RUNNING':
      return 'processing';
    default:
      return 'blue';
  }
}

export default AgentPage;
