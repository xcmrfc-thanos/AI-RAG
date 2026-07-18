import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import WorkflowCanvasEditor from '@/features/agent-workflow/WorkflowCanvasEditor';
import DebugDrawer from '@/features/agent-workflow/DebugDrawer';
import DraftRunDialog from '@/features/agent-workflow/DraftRunDialog';
import { draftSaveStatusLabel } from '@/features/agent-workflow/draft-autosave';
import { parseWorkflowJson } from '@/features/agent-workflow/schema-flow-mapper';
import { useDraftAutosave } from '@/features/agent-workflow/useDraftAutosave';
import { useDraftRunDebug } from '@/features/agent-workflow/useDraftRunDebug';
import WorkflowGuidance from '@/features/agent-workflow/WorkflowGuidance';
import WorkflowTemplatePicker from '@/features/agent-workflow/WorkflowTemplatePicker';
import {
  createWorkflowTemplateJson,
  DEFAULT_WORKFLOW_TEMPLATE_JSON,
  WORKFLOW_TEMPLATES,
  type WorkflowTemplateKey,
} from '@/features/agent-workflow/workflow-templates';
import { useAppStore, useAuthStore } from '@/stores';
import { agentService, type AgentWorkflowSummary } from '@/services/agent.service';
import { getAgentAdminPageGate } from '@/utils/agent-access';
import '@/features/agent-workflow/AgentWorkbench.css';

const { Title, Text, Paragraph } = Typography;

/**
 * Agent 管理编排工作台
 */
const AgentAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const enableAgent = useAppStore((state) => state.enableAgent);
  const user = useAuthStore((state) => state.user);
  const gate = getAgentAdminPageGate(enableAgent, user);
  const copy = AI_ENTRY_COPY.agentAdmin;

  const [workflows, setWorkflows] = useState<AgentWorkflowSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('知识库问答');
  const [busy, setBusy] = useState(false);
  const [draftRunOpen, setDraftRunOpen] = useState(false);
  const debug = useDraftRunDebug();
  const { draftJson, saveStatus, updateDraft, loadDraft, saveNow } =
    useDraftAutosave(selectedId, DEFAULT_WORKFLOW_TEMPLATE_JSON);
  const inputSchema = useMemo(() => {
    try {
      return parseWorkflowJson(draftJson).inputSchema;
    } catch {
      return undefined;
    }
  }, [draftJson]);

  const refresh = useCallback(async () => {
    try {
      const rows = await agentService.listMyWorkflows();
      setWorkflows(Array.isArray(rows) ? rows : []);
    } catch {
      setWorkflows([]);
    }
  }, []);

  useEffect(() => {
    if (gate !== 'ok') return undefined;
    const frameId = requestAnimationFrame(() => { void refresh(); });
    return () => cancelAnimationFrame(frameId);
  }, [gate, refresh]);

  const selectWorkflow = async (id: number) => {
    setSelectedId(id);
    setBusy(true);
    try {
      const detail = await agentService.getWorkflow(id);
      setName(detail.name || '未命名工作流');
      loadDraft(detail.draftJson || DEFAULT_WORKFLOW_TEMPLATE_JSON);
      if (!detail.draftJson) message.info('该工作流暂无草稿，已载入默认模板');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载工作流失败');
    } finally {
      setBusy(false);
    }
  };

  const createWorkflow = async () => {
    setBusy(true);
    try {
      const created = await agentService.createWorkflow(name || '未命名工作流', draftJson);
      setSelectedId(created.id);
      await refresh();
      message.success('已创建草稿');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (silent = false) => {
    if (!selectedId) {
      if (!silent) message.warning('请先创建或选择工作流');
      return false;
    }
    const saved = await saveNow();
    if (!saved) throw new Error('草稿保存失败');
    if (!silent) message.success('草稿已保存');
    return true;
  };

  const runAction = async (action: 'save' | 'validate' | 'publish') => {
    setBusy(true);
    try {
      if (action === 'save') {
        await saveDraft();
      } else if (action === 'validate') {
        if (!await saveDraft(true) || !selectedId) return;
        const result = await agentService.validateDraft(selectedId);
        message.success(`校验通过：${(result.nodeOrder || []).join(' → ')}`);
      } else if (action === 'publish') {
        if (!await saveDraft(true) || !selectedId) return;
        const result = await agentService.publish(selectedId);
        message.success(`已发布版本 ${result.workflowVersionId}`);
        await refresh();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const runDraft = async (input: Record<string, unknown>) => {
    if (!selectedId) {
      message.warning('请先创建或选择工作流');
      return;
    }
    setBusy(true);
    try {
      const run = await agentService.runDraft(selectedId, {
        definitionJson: draftJson,
        input,
        idempotencyKey: `draft-${selectedId}-${Date.now()}`,
      });
      const steps = await agentService.listSteps(run.id);
      debug.showRun(run, steps);
      setDraftRunOpen(false);
      message.success(`草稿试运行结束：${run.status}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '草稿试运行失败');
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = (key: WorkflowTemplateKey) => {
    const template = WORKFLOW_TEMPLATES.find((item) => item.key === key);
    if (!template) return;
    const replace = () => {
      setName(template.title);
      updateDraft(createWorkflowTemplateJson(key));
      message.success(`已载入模板：${template.title}`);
    };
    let hasNodes = true;
    try {
      hasNodes = parseWorkflowJson(draftJson).nodes.length > 0;
    } catch {
      // 无法解析的草稿也需要确认后再替换，避免意外丢失。
    }
    if (!hasNodes) {
      replace();
      return;
    }
    modal.confirm({
      title: `使用“${template.title}”模板？`,
      content: '当前画布将被替换；已选工作流会按自动保存规则写入新草稿。',
      okText: '替换画布',
      cancelText: '取消',
      onOk: replace,
    });
  };

  if (gate === 'disabled') {
    return (
      <div className="agent-admin-standalone">
        <nav className="agent-admin-topbar">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>
            返回管理中心
          </Button>
        </nav>
        <div className="agent-admin-gate">
          <RobotOutlined className="agent-admin-gate__icon" />
          <Title level={4}>{AI_ENTRY_COPY.agent.disabledTitle}</Title>
          <Text type="secondary">{AI_ENTRY_COPY.agent.disabledDesc}</Text>
        </div>
      </div>
    );
  }

  if (gate === 'forbidden') {
    return (
      <div className="agent-admin-standalone">
        <nav className="agent-admin-topbar">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>
            返回管理中心
          </Button>
        </nav>
        <div style={{ padding: 48 }}>
          <Alert type="error" showIcon message="无权限编排 Agent"
            description="需要管理员身份或 agent:workflow:edit / publish 权限。" />
        </div>
      </div>
    );
  }

  return (
    <div className="agent-admin-standalone">
      <nav className="agent-admin-topbar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>
          返回管理中心
        </Button>
      </nav>
      <div className="agent-admin-page">
      <div className="agent-admin-header">
        <div>
          <Title level={3}>{copy.title}</Title>
          <Paragraph type="secondary">{copy.subtitle} · 拖拽节点、即时配置、校验并发布。</Paragraph>
        </div>
        <Space wrap>
          <Button onClick={() => { void runAction('save'); }} loading={busy}>保存草稿</Button>
          <Button icon={<CheckOutlined />} onClick={() => { void runAction('validate'); }} loading={busy}>
            校验
          </Button>
          <Button onClick={() => setDraftRunOpen(true)} loading={busy}>试运行草稿</Button>
          <Button type="primary" icon={<CloudUploadOutlined />}
            onClick={() => { void runAction('publish'); }} loading={busy}>
            发布
          </Button>
        </Space>
      </div>

      <Card className="agent-workbench-card" styles={{ body: { padding: 12 } }}>
        <div className="agent-workflow-switcher">
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择工作流"
            value={selectedId ?? undefined}
            loading={busy}
            onChange={(id) => { void selectWorkflow(id); }}
            options={workflows.map((item) => ({
              value: item.id,
              label: item.name,
              title: item.publishedVersionId ? '已发布' : '未发布',
            }))}
          />
          <Input value={name} onChange={(event) => setName(event.target.value)}
            maxLength={128} placeholder="工作流名称" />
          <Button icon={<PlusOutlined />} onClick={() => { void createWorkflow(); }} loading={busy}>
            新建草稿
          </Button>
          <WorkflowTemplatePicker onApply={applyTemplate} />
          {selectedId ? (
            <Space size={4}>
              <Tag color={workflows.find((item) => item.id === selectedId)?.publishedVersionId ? 'green' : 'default'}>
                {workflows.find((item) => item.id === selectedId)?.publishedVersionId ? '已发布' : '草稿'}
              </Tag>
              <Tag color={saveStatus === 'failed' ? 'red' : saveStatus === 'saved' ? 'green' : 'blue'}>
                {draftSaveStatusLabel(saveStatus)}
              </Tag>
            </Space>
          ) : null}
        </div>

        <WorkflowCanvasEditor
          value={draftJson}
          onChange={updateDraft}
          name={name}
          runSteps={debug.steps}
          focusedNodeId={debug.selectedNodeId}
          onApplyTemplate={applyTemplate}
        />
        <WorkflowGuidance draftJson={draftJson} />
      </Card>
      <DraftRunDialog
        open={draftRunOpen}
        busy={busy}
        schema={inputSchema}
        onCancel={() => setDraftRunOpen(false)}
        onRun={(input) => { void runDraft(input); }}
      />
      <DebugDrawer
        open={debug.open}
        run={debug.run}
        steps={debug.steps}
        selectedNodeId={debug.selectedNodeId}
        onSelectNode={debug.setSelectedNodeId}
        onClose={debug.close}
        onCancel={debug.run ? () => { void debug.cancel(); } : undefined}
      />
      </div>
    </div>
  );
};

export default AgentAdminPage;
