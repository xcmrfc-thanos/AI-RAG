import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Select,
  Row,
  Col,
  Typography,
  Tag,
  Progress,
  Tabs,
  InputNumber,
  Result,
  Divider,
  Statistic,
  Popconfirm,
  Collapse,
  Alert,
  AutoComplete,
  Descriptions,
} from 'antd';
import { App } from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  BellOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  SendOutlined,
  CloudUploadOutlined,
  FileProtectOutlined,
  SearchOutlined,
  ApartmentOutlined,
  ClusterOutlined,
  AuditOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { settingsService, aiService, graphService, agentService } from '@/services';
import { PageLoading, AdminPageHeader } from '@/components/common';
import { useAppStore } from '@/stores';
import type { SystemSettings, AIModelOption } from '@/types';
import type { AgentWorkflowSummary } from '@/services/agent.service';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

/** Embedding 预设（含自定义） */
const EMBEDDING_PRESETS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  siliconflow: {
    label: '硅基流动 SiliconFlow',
    models: [
      { value: 'BAAI/bge-m3', label: 'BAAI/bge-m3' },
      { value: 'BAAI/bge-large-zh-v1.5', label: 'BAAI/bge-large-zh-v1.5' },
    ],
  },
  qwen: {
    label: '通义千问 Qwen',
    models: [
      { value: 'text-embedding-v3', label: 'text-embedding-v3' },
      { value: 'text-embedding-v2', label: 'text-embedding-v2' },
    ],
  },
  custom: { label: '自定义', models: [] },
};

const CHAT_PROVIDER_OPTIONS = [
  { value: 'qwen', label: '通义千问 Qwen' },
  { value: 'siliconflow', label: '硅基流动 SiliconFlow' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
];

const VECTOR_STORE_OPTIONS = [
  { value: 'elasticsearch', label: 'Elasticsearch（推荐）' },
  { value: 'qdrant', label: 'Qdrant' },
  { value: 'milvus', label: 'Milvus（兼容）' },
];

const WATERMARK_TYPE_OPTIONS = [
  { value: 'user', label: '当前用户名' },
  { value: 'custom', label: '自定义文案' },
  { value: 'user_time', label: '用户名 + 导出时间' },
];

const KAG_MODEL_OPTIONS = [
  { value: 'qwen', label: '通义千问（默认）' },
  { value: 'siliconflow', label: '硅基流动' },
  { value: 'custom', label: '自定义（与聊天模型一致）' },
];

const AGENT_MODEL_OPTIONS = [
  { value: 'qwen', label: '通义千问 Qwen' },
  { value: 'deepseek', label: 'DeepSeek' },
];

const STORAGE_PROVIDER_OPTIONS = [
  { value: 'rustfs', label: 'RustFS（S3 兼容，推荐）' },
  { value: 'minio', label: 'MinIO' },
  { value: 's3', label: 'AWS S3 / 兼容服务' },
  { value: 'other', label: '其他' },
];

type SettingsTab = 'basic' | 'security' | 'storage' | 'notification' | 'ai' | 'export' | 'rag' | 'graph' | 'agent' | 'compliance' | 'integration' | 'status';

interface TabConfig {
  key: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { key: 'basic',         label: '基本设置',     icon: <SettingOutlined /> },
  { key: 'security',      label: '安全设置',     icon: <SecurityScanOutlined /> },
  { key: 'storage',       label: '存储设置',     icon: <CloudServerOutlined /> },
  { key: 'notification',  label: '通知设置',     icon: <BellOutlined /> },
  { key: 'ai',            label: 'AI设置',       icon: <RobotOutlined /> },
  { key: 'rag',           label: '检索/RAG',     icon: <SearchOutlined /> },
  { key: 'graph',         label: '知识图谱',     icon: <ApartmentOutlined /> },
  { key: 'agent',         label: 'Agent',        icon: <ClusterOutlined /> },
  { key: 'compliance',    label: '审计与合规',   icon: <AuditOutlined /> },
  { key: 'integration',   label: '集成',         icon: <ApiOutlined /> },
  { key: 'export',        label: '文档与导出',   icon: <FileProtectOutlined /> },
  { key: 'status',        label: '系统状态',     icon: <DatabaseOutlined /> },
];

interface SettingsPageState {
  loading: boolean;
  saving: boolean;
  settings: SystemSettings | null;
  error: string | null;
  activeTab: SettingsTab;
}

export const SettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [state, setState] = useState<SettingsPageState>({
    loading: true,
    saving: false,
    settings: null,
    error: null,
    activeTab: 'basic',
  });

  const [basicForm]    = Form.useForm();
  const [securityForm] = Form.useForm();
  const [storageForm]  = Form.useForm();
  const [notifForm]    = Form.useForm();
  const [aiForm]       = Form.useForm();
  const [exportForm]   = Form.useForm();
  const [ragForm]      = Form.useForm();
  const [graphForm]    = Form.useForm();
  const [agentForm]    = Form.useForm();
  const [complianceForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  const [reindexing, setReindexing] = useState(false);
  const [graphBusy, setGraphBusy] = useState<'rebuild' | 'cleanup' | null>(null);
  const [agentWorkflows, setAgentWorkflows] = useState<AgentWorkflowSummary[]>([]);

  const confirmReindex = Form.useWatch('confirmSensitiveReindex', complianceForm);
  const confirmGraphOps = Form.useWatch('confirmSensitiveGraphOps', complianceForm);

  const [chatModels, setChatModels] = useState<AIModelOption[]>([]);
  const vectorStoreType = Form.useWatch('vectorStoreType', aiForm);
  const embeddingProvider = Form.useWatch('embeddingProvider', aiForm) || 'siliconflow';
  const pdfWatermarkEnabled = Form.useWatch('pdfWatermarkEnabled', exportForm);
  const pdfWatermarkType = Form.useWatch('pdfWatermarkType', exportForm) || 'user';

  const enableEmail = useAppStore((s) => s.enableEmail);

  // ---- Data Fetching ----

  const fetchSettings = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await settingsService.getSettings();
      setState(prev => ({ ...prev, settings: data, loading: false }));

      // Populate all forms
      if (data.basic)    basicForm.setFieldsValue(data.basic);
      if (data.security) securityForm.setFieldsValue(data.security);
      if (data.storage)  storageForm.setFieldsValue(data.storage);
      if (data.notification) notifForm.setFieldsValue(data.notification);
      if (data.ai) {
        aiForm.setFieldsValue({
          ...data.ai,
          chatProvider: (data.ai as any).chatProvider || 'qwen',
          embeddingProvider: (data.ai as any).embeddingProvider || 'siliconflow',
          vectorStoreType: (data.ai as any).vectorStoreType || 'elasticsearch',
        });
      }
      if (data.export) {
        exportForm.setFieldsValue({
          pdfWatermarkEnabled: false,
          pdfWatermarkType: 'user',
          pdfWatermarkText: '内部资料',
          pdfWatermarkOpacity: 0.15,
          ...data.export,
        });
      } else {
        exportForm.setFieldsValue({
          pdfWatermarkEnabled: false,
          pdfWatermarkType: 'user',
          pdfWatermarkText: '内部资料',
          pdfWatermarkOpacity: 0.15,
        });
      }
      if (data.rag) {
        ragForm.setFieldsValue({
          ragEnabled: true,
          ragDefaultTopK: 5,
          ragHybridTopK: 20,
          ragFinalTopK: 5,
          ragHybridEnabled: true,
          ragRerankEnabled: true,
          ragVectorStoreType: 'elasticsearch',
          ...data.rag,
        });
      } else {
        ragForm.setFieldsValue({
          ragEnabled: true,
          ragDefaultTopK: 5,
          ragHybridTopK: 20,
          ragFinalTopK: 5,
          ragHybridEnabled: true,
          ragRerankEnabled: true,
          ragVectorStoreType: (data.ai as any)?.vectorStoreType || 'elasticsearch',
        });
      }
      if (data.graph) {
        graphForm.setFieldsValue({
          kagEnabled: true,
          kagAutoExtract: true,
          kagExtractionModel: 'qwen',
          kagMaxEntitiesPerChunk: 10,
          kagMaxHops: 2,
          kagClearBeforeBuild: true,
          ...data.graph,
        });
      } else {
        graphForm.setFieldsValue({
          kagEnabled: true,
          kagAutoExtract: true,
          kagExtractionModel: 'qwen',
          kagMaxEntitiesPerChunk: 10,
          kagMaxHops: 2,
          kagClearBeforeBuild: true,
        });
      }
      if (data.agent) {
        agentForm.setFieldsValue({
          agentDefaultWorkflowId: 0,
          agentDefaultModel: 'qwen',
          agentRunTimeoutSeconds: 90,
          agentLlmTimeoutSeconds: 60,
          agentToolTimeoutSeconds: 5,
          agentToolHybridSearch: true,
          agentToolGraphSearch: true,
          agentToolGetDocument: true,
          agentRunRetentionDays: 30,
          ...data.agent,
        });
      } else {
        agentForm.setFieldsValue({
          agentDefaultWorkflowId: 0,
          agentDefaultModel: 'qwen',
          agentRunTimeoutSeconds: 90,
          agentLlmTimeoutSeconds: 60,
          agentToolTimeoutSeconds: 5,
          agentToolHybridSearch: true,
          agentToolGraphSearch: true,
          agentToolGetDocument: true,
          agentRunRetentionDays: 30,
        });
      }
      if (data.compliance) {
        complianceForm.setFieldsValue({
          operationLogRetentionDays: 90,
          confirmSensitiveExport: true,
          confirmSensitiveReindex: true,
          confirmSensitiveGraphOps: true,
          confirmSensitiveDelete: true,
          ...data.compliance,
        });
      } else {
        complianceForm.setFieldsValue({
          operationLogRetentionDays: 90,
          confirmSensitiveExport: true,
          confirmSensitiveReindex: true,
          confirmSensitiveGraphOps: true,
          confirmSensitiveDelete: true,
        });
      }
      if (data.integration) {
        integrationForm.setFieldsValue({
          storageProvider: 'rustfs',
          storageRegion: 'us-east-1',
          integrationNeo4jUri: 'bolt://localhost:7687',
          integrationEsHosts: 'http://localhost:9200',
          ...data.integration,
        });
      } else {
        integrationForm.setFieldsValue({
          storageProvider: 'rustfs',
          storageRegion: 'us-east-1',
          integrationNeo4jUri: 'bolt://localhost:7687',
          integrationEsHosts: 'http://localhost:9200',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载设置失败';
      setState(prev => ({ ...prev, loading: false, error: msg }));
      message.error(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      void fetchSettings();
    });
    return () => cancelAnimationFrame(frameId);
  }, [fetchSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const models = await aiService.getModels();
        const list = Array.isArray(models) ? models : ((models as any)?.data ?? []);
        if (!cancelled) setChatModels(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setChatModels([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await agentService.listPublishedWorkflows();
        if (!cancelled) setAgentWorkflows(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAgentWorkflows([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Save Handlers ----

  const handleSave = useCallback(async (section: string, values: Record<string, unknown>) => {
    setState(prev => ({ ...prev, saving: true }));
    try {
      await settingsService.updateSettings(section, values);
      message.success('设置已保存');
      // Refresh to get latest server state
      await fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      message.error(msg);
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [fetchSettings, message]);

  const handleSaveBasic    = () => { basicForm.validateFields().then(v => handleSave('basic', Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'systemVersion')))); };
  const handleSaveSecurity = () => { securityForm.validateFields().then(v => handleSave('security', v)); };
  const handleSaveStorage  = () => { storageForm.validateFields().then(v => handleSave('storage', v)); };
  const handleSaveNotif    = () => { notifForm.validateFields().then(v => handleSave('notification', Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'emailTestAddress')))); };
  const handleSaveAI       = () => { aiForm.validateFields().then(v => handleSave('ai', v)); };
  const handleSaveExport   = () => { exportForm.validateFields().then(v => handleSave('export', v)); };
  const handleSaveRag      = () => { ragForm.validateFields().then(v => handleSave('rag', v)); };
  const handleSaveGraph    = () => { graphForm.validateFields().then(v => handleSave('graph', v)); };
  const handleSaveAgent    = () => { agentForm.validateFields().then(v => handleSave('agent', v)); };
  const handleSaveCompliance = () => { complianceForm.validateFields().then(v => handleSave('compliance', v)); };
  const handleSaveIntegration = () => { integrationForm.validateFields().then(v => handleSave('integration', v)); };

  /**
   * 触发全量重建向量索引（异步任务）。
   */
  const handleReindexAll = async () => {
    setReindexing(true);
    try {
      const taskId = await aiService.reindexAll();
      message.success(taskId ? `全量重建已提交，任务ID：${taskId}` : '全量重建任务已提交');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重建索引失败';
      message.error(msg);
    } finally {
      setReindexing(false);
    }
  };

  /**
   * 重建知识图谱（链到已有 graph rebuild）。
   */
  const handleRebuildGraph = async () => {
    setGraphBusy('rebuild');
    try {
      const result = await graphService.rebuildGraph();
      message.success(typeof result === 'string' && result ? result : '知识图谱重建任务已提交');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '重建图谱失败';
      message.error(msg);
    } finally {
      setGraphBusy(null);
    }
  };

  /**
   * 清理知识图谱脏数据（链到已有 graph cleanup）。
   */
  const handleCleanupGraph = async () => {
    setGraphBusy('cleanup');
    try {
      const result = await graphService.cleanupGraph();
      message.success(typeof result === 'string' && result ? result : '图谱清理任务已提交');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '清理图谱失败';
      message.error(msg);
    } finally {
      setGraphBusy(null);
    }
  };

  // ---- Status Actions ----

  const handleClearCache = async () => {
    try {
      const result = await settingsService.clearCache();
      message.success(result || '缓存已清理');
    } catch {
      message.error('清理缓存失败');
    }
  };

  const handleBackup = async () => {
    try {
      const result = await settingsService.createBackup();
      message.success(result || '备份创建成功');
    } catch {
      message.error('创建备份失败');
    }
  };

  const handleTestEmail = async () => {
    try {
      const email = notifForm.getFieldValue('emailTestAddress');
      if (!email) {
        message.warning('请先在通知设置中配置测试邮箱地址');
        return;
      }
      await settingsService.testEmail(email);
      message.success('测试邮件已发送');
    } catch {
      message.error('测试邮件发送失败');
    }
  };

  // ---- Tab Change ----

  const handleTabChange = (key: string) => {
    setState(prev => ({ ...prev, activeTab: key as SettingsTab }));
  };

  // ---- Render Helpers ----

  const renderSwitchItem = (
    title: string,
    description: string,
    name: string,
    _formInstance: typeof basicForm,
  ) => (
    <div style={SWITCH_ITEM_STYLE}>
      <div style={{ flex: 1, paddingRight: 24 }}>
        <div style={SWITCH_TITLE_STYLE}>{title}</div>
        <div style={SWITCH_DESC_STYLE}>{description}</div>
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch />
      </Form.Item>
    </div>
  );

  const renderSectionHeader = (
    icon: React.ReactNode,
    title: string,
    description: string,
    onSave: () => void,
  ) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div>
        <Space>
          <span style={{ color: '#2563eb', fontSize: 20 }}>{icon}</span>
          <div>
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{description}</Text>
          </div>
        </Space>
      </div>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={fetchSettings} disabled={state.saving}>
          重置
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={state.saving}
        >
          保存设置
        </Button>
      </Space>
    </div>
  );

  const renderSaveBar = (onSave: () => void) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 0 0 0', borderTop: '1px solid #f1f5f9', marginTop: 24 }}>
      <Button icon={<ReloadOutlined />} onClick={fetchSettings} disabled={state.saving}>
        重置
      </Button>
      <Button type="primary" icon={<SaveOutlined />} onClick={onSave} loading={state.saving}>
        保存设置
      </Button>
    </div>
  );

  // ---- Main Render ----

  if (state.loading) {
    return (
      <div style={PAGE_STYLE}>
        <PageLoading style={{ padding: '80px 0' }} tip="正在加载系统设置..." />
      </div>
    );
  }

  if (state.error && !state.settings) {
    return (
      <div style={PAGE_STYLE}>
        <Result
          status="error"
          title="加载设置失败"
          subTitle={state.error}
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchSettings}>
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  const { settings } = state;

  return (
    <div style={PAGE_STYLE}>
      <AdminPageHeader
        title="系统设置"
        description="配置知识库系统的基础设置和运行参数"
      />

      <Tabs
        activeKey={state.activeTab}
        onChange={handleTabChange}
        items={TABS.map(tab => ({
          key: tab.key,
          label: (
            <Space>
              {tab.icon}
              <span>{tab.label}</span>
            </Space>
          ),
          children: renderTabContent(tab.key),
        }))}
        tabBarStyle={{ marginBottom: 0 }}
      />
      <style>{TAB_CARD_STYLE}</style>
    </div>
  );

  function renderTabContent(tab: SettingsTab): React.ReactNode {
    switch (tab) {
      case 'basic':
        return renderBasicTab();
      case 'security':
        return renderSecurityTab();
      case 'storage':
        return renderStorageTab();
      case 'notification':
        return renderNotificationTab();
      case 'ai':
        return renderAITab();
      case 'rag':
        return renderRagTab();
      case 'graph':
        return renderGraphTab();
      case 'agent':
        return renderAgentTab();
      case 'compliance':
        return renderComplianceTab();
      case 'integration':
        return renderIntegrationTab();
      case 'export':
        return renderExportTab();
      case 'status':
        return renderStatusTab();
      default:
        return null;
    }
  }

  // ===================== BASIC TAB =====================
  function renderBasicTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <SettingOutlined />,
          '基本设置',
          '配置系统基本信息、语言和功能开关',
          handleSaveBasic,
        )}
        <Form form={basicForm} layout="vertical">
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="系统名称"
                name="systemName"
                rules={[{ required: true, message: '请输入系统名称' }]}
              >
                <Input placeholder="显示在页面标题和导航栏中的系统名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="系统描述"
                name="systemDescription"
                rules={[{ required: true, message: '请输入系统描述' }]}
              >
                <Input placeholder="系统的简短描述" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="默认语言"
                name="defaultLanguage"
                rules={[{ required: true, message: '请选择默认语言' }]}
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="时区设置"
                name="timezone"
                rules={[{ required: true, message: '请选择时区' }]}
              >
                <Select>
                  <Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Option>
                  <Option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</Option>
                  <Option value="America/New_York">America/New_York (UTC-5)</Option>
                  <Option value="Europe/London">Europe/London (UTC+0)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="系统版本"
                name="systemVersion"
              >
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start" style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>功能开关</Text>
          </Divider>

          {renderSwitchItem('用户注册', '是否允许新用户自行注册账号', 'allowRegistration', basicForm)}
          {renderSwitchItem('文档审核', '新发布的文档是否需要经过审核', 'requireApproval', basicForm)}
          {renderSwitchItem('评论功能', '是否允许用户对文档进行评论', 'enableComments', basicForm)}
          {renderSwitchItem('AI助手', '启用AI智能问答助手功能', 'enableAI', basicForm)}
          {renderSwitchItem('AI写作', '启用AI智能写作辅助功能', 'enableAIWriting', basicForm)}
          {renderSwitchItem('Agent', '启用Agent工作流（默认开启）', 'enableAgent', basicForm)}
          {renderSwitchItem('全文搜索', '启用文档全文检索功能', 'enableFullTextSearch', basicForm)}
        </Form>
        {renderSaveBar(handleSaveBasic)}
      </Card>
    );
  }

  // ===================== SECURITY TAB =====================
  function renderSecurityTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <SecurityScanOutlined />,
          '安全设置',
          '配置密码策略、会话管理和登录安全',
          handleSaveSecurity,
        )}
        <Form form={securityForm} layout="vertical">
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="密码策略"
                name="passwordPolicy"
                rules={[{ required: true, message: '请选择密码策略' }]}
              >
                <Select>
                  <Option value="low">低（6位以上）</Option>
                  <Option value="medium">中（8位+字母数字）</Option>
                  <Option value="high">高（12位+特殊字符）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="会话超时（秒）"
                name="sessionTimeout"
                rules={[{ required: true, message: '请输入会话超时时间' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={300}
                  max={86400}
                  step={300}
                  addonAfter="秒"
                  placeholder="3600"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="密码最小长度"
                name="passwordMinLength"
                rules={[{ required: true, message: '请输入密码最小长度' }]}
              >
                <InputNumber style={{ width: '100%' }} min={4} max={32} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="最大登录尝试次数"
                name="loginMaxRetry"
                rules={[{ required: true, message: '请输入最大登录尝试次数' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} max={20} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start" style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>安全开关</Text>
          </Divider>

          {renderSwitchItem('两步验证', '启用用户两步验证（2FA）', 'enable2FA', securityForm)}
          {renderSwitchItem('登录限制', '限制IP地址登录', 'ipRestriction', securityForm)}
          {renderSwitchItem('特殊字符要求', '密码必须包含特殊字符', 'requireSpecialChar', securityForm)}
        </Form>
        {renderSaveBar(handleSaveSecurity)}
      </Card>
    );
  }

  // ===================== STORAGE TAB =====================
  function renderStorageTab() {
    const status = settings?.status;
    const usedPercent = status ? Math.round((status.usedStorage / status.totalStorage) * 100) : 0;

    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <CloudServerOutlined />,
          '存储设置',
          '配置文件存储策略和上传限制',
          handleSaveStorage,
        )}

        {/* Storage Stats */}
        {status && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small" style={STAT_CARD_STYLE}>
                <Statistic
                  title="总存储空间"
                  value={formatBytes(status.totalStorage)}
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={STAT_CARD_STYLE}>
                <Statistic
                  title="已使用"
                  value={formatBytes(status.usedStorage)}
                  suffix={`(${usedPercent}%)`}
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={STAT_CARD_STYLE}>
                <Statistic
                  title="文档数量"
                  value={status.documentCount}
                  suffix="个"
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={STAT_CARD_STYLE}>
                <Statistic
                  title="用户数量"
                  value={status.userCount}
                  suffix="人"
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {status && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">存储使用率</Text>
              <Text>{usedPercent}%</Text>
            </div>
            <Progress
              percent={usedPercent}
              strokeColor={usedPercent > 80 ? '#ef4444' : usedPercent > 60 ? '#f59e0b' : '#2563eb'}
            />
          </div>
        )}

        <Form form={storageForm} layout="vertical">
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="最大文件大小（MB）"
                name="maxFileSize"
                rules={[{ required: true, message: '请输入最大文件大小' }]}
                getValueFromEvent={(val: number) => val}
                getValueProps={(val: number) => ({ value: val ? Math.round(val / 1048576) : null })}
                normalize={(val: number) => (val ? val * 1048576 : undefined)}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={1024}
                  addonAfter="MB"
                  placeholder="100"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="允许的文件类型"
                name="allowedFileTypes"
                rules={[{ required: true, message: '请选择文件类型' }]}
              >
                <Select mode="tags" placeholder="输入或选择文件类型">
                  <Option value="pdf">PDF</Option>
                  <Option value="doc">DOC</Option>
                  <Option value="docx">DOCX</Option>
                  <Option value="xlsx">XLSX</Option>
                  <Option value="pptx">PPTX</Option>
                  <Option value="txt">TXT</Option>
                  <Option value="md">Markdown</Option>
                  <Option value="jpg">JPG</Option>
                  <Option value="png">PNG</Option>
                  <Option value="gif">GIF</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="存储服务端点"
                name="storageEndpoints"
              >
                <Input placeholder="http://localhost:8200" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="存储桶名称"
                name="storageBucket"
              >
                <Input placeholder="knowledge-docs" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {renderSaveBar(handleSaveStorage)}
      </Card>
    );
  }

  // ===================== NOTIFICATION TAB =====================
  function renderNotificationTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <BellOutlined />,
          '通知设置',
          '配置邮件通知和WebSocket推送',
          handleSaveNotif,
        )}
        <Form form={notifForm} layout="vertical">
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="SMTP服务器"
                name="emailHost"
              >
                <Input placeholder="smtp.example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="SMTP端口"
                name="emailPort"
              >
                <InputNumber style={{ width: '100%' }} min={1} max={65535} placeholder="587" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="通知保留天数"
                name="notificationRetentionDays"
              >
                <InputNumber style={{ width: '100%' }} min={1} max={365} addonAfter="天" placeholder="90" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="测试邮箱地址"
                name="emailTestAddress"
              >
                <Input placeholder="admin@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start" style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>通知开关</Text>
          </Divider>

          {renderSwitchItem('邮件通知', '启用邮件通知功能', 'emailEnabled', notifForm)}
          {renderSwitchItem('WebSocket推送', '启用实时消息推送', 'websocketEnabled', notifForm)}

          {enableEmail && (
            <div style={{ marginTop: 16 }}>
              <Space>
                <Button icon={<SendOutlined />} onClick={handleTestEmail}>
                  发送测试邮件
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  点击发送测试邮件以验证邮件配置是否正确
                </Text>
              </Space>
            </div>
          )}
        </Form>
        {renderSaveBar(handleSaveNotif)}
      </Card>
    );
  }

  // ===================== AI TAB =====================
  function renderAITab() {
    const embeddingPresets = EMBEDDING_PRESETS[embeddingProvider]?.models ?? [];
    const modelSelectOptions = chatModels.length > 0
      ? chatModels.map((m) => ({
          value: m.key,
          label: m.displayName || m.key,
        }))
      : [
          { value: 'qwen3-max', label: 'qwen3-max' },
          { value: 'qwen-max', label: 'qwen-max' },
          { value: 'qwen-plus', label: 'qwen-plus' },
        ];

    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <RobotOutlined />,
          'AI设置',
          '对齐现网：聊天模型 / Embedding Provider / 向量库（ES·Qdrant）',
          handleSaveAI,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="此处配置写入系统配置表，供管理与审计；运行时 LLM/向量仍以 deploy/.env 与 Nacos 为准，变更后通常需重启 intelligence。"
        />
        <Form form={aiForm} layout="vertical" initialValues={{
          chatProvider: 'qwen',
          embeddingProvider: 'siliconflow',
          vectorStoreType: 'elasticsearch',
          aiModelName: 'qwen3-max',
          embeddingModel: 'BAAI/bge-m3',
        }}>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="聊天 Provider"
                name="chatProvider"
                rules={[{ required: true, message: '请选择聊天 Provider' }]}
              >
                <Select
                  options={CHAT_PROVIDER_OPTIONS}
                  onChange={() => {
                    /* 保留当前模型名，允许跨 Provider 自定义 */
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="聊天 / 写作模型"
                name="aiModelName"
                rules={[{ required: true, message: '请选择或填写模型' }]}
                extra="优先从 /ai/chat/models 拉取；也可直接输入自定义模型名"
              >
                <AutoComplete
                  options={modelSelectOptions}
                  filterOption={(input, option) =>
                    String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                    || String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="qwen3-max"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="Embedding Provider"
                name="embeddingProvider"
                rules={[{ required: true, message: '请选择 Embedding Provider' }]}
              >
                <Select
                  options={Object.entries(EMBEDDING_PRESETS).map(([value, meta]) => ({
                    value,
                    label: meta.label,
                  }))}
                  onChange={(v) => {
                    const first = EMBEDDING_PRESETS[v]?.models?.[0]?.value;
                    if (first) aiForm.setFieldValue('embeddingModel', first);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Embedding 模型"
                name="embeddingModel"
                rules={[{ required: true, message: '请选择或填写 Embedding 模型' }]}
              >
                <AutoComplete
                  options={
                    embeddingProvider === 'custom' || embeddingPresets.length === 0
                      ? []
                      : embeddingPresets.map((m) => ({ value: m.value, label: m.label }))
                  }
                  filterOption={(input, option) =>
                    String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="BAAI/bge-m3"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="向量库"
                name="vectorStoreType"
                rules={[{ required: true, message: '请选择向量库' }]}
              >
                <Select options={VECTOR_STORE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          {vectorStoreType === 'milvus' && (
            <Row gutter={[24, 0]}>
              <Col span={12}>
                <Form.Item label="Milvus 主机" name="milvusHost">
                  <Input placeholder="localhost" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Milvus 端口" name="milvusPort">
                  <InputNumber style={{ width: '100%' }} min={1} max={65535} placeholder="19530" />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Collapse
            ghost
            items={[{
              key: 'advanced',
              label: '高级参数（温度 / Token / 超时）',
              children: (
                <Row gutter={[24, 0]}>
                  <Col span={8}>
                    <Form.Item label="温度" name="aiTemperature" extra="0~1，如 0.7">
                      <InputNumber style={{ width: '100%' }} min={0} max={2} step={0.1} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="最大 Token" name="aiMaxTokens">
                      <InputNumber style={{ width: '100%' }} min={256} max={128000} step={256} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="超时（秒）" name="aiTimeoutSeconds">
                      <InputNumber style={{ width: '100%' }} min={10} max={600} />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            }]}
          />
        </Form>
        {renderSaveBar(handleSaveAI)}
      </Card>
    );
  }

  // ===================== RAG TAB =====================
  /**
   * 检索 / RAG 设置：TopK、混合检索、向量库与重建索引入口。
   *
   * @returns RAG 设置 Tab 内容
   */
  function renderRagTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <SearchOutlined />,
          '检索 / RAG',
          'TopK、混合检索、重排序与向量库；重建索引走已有 /rag/reindex',
          handleSaveRag,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="配置写入系统配置表并同步 Redis（rag.retrieval.* 等）。intelligence 对 default/hybrid Top-K 优先热读 SystemConfigCache；无 Redis 或读失败时回退 Nacos/yml。更换 Embedding/向量库后必须重建索引。"
        />
        <Form
          form={ragForm}
          layout="vertical"
          initialValues={{
            ragEnabled: true,
            ragDefaultTopK: 5,
            ragHybridTopK: 20,
            ragFinalTopK: 5,
            ragHybridEnabled: true,
            ragRerankEnabled: true,
            ragVectorStoreType: 'elasticsearch',
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="启用 RAG" name="ragEnabled" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="默认混合检索" name="ragHybridEnabled" valuePropName="checked"
                extra="管理面偏好开关；搜索 API 仍可按请求指定 mode">
                <Switch checkedChildren="混合" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="启用重排序" name="ragRerankEnabled" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="默认 TopK" name="ragDefaultTopK" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={50} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="混合检索 TopK" name="ragHybridTopK" extra="BM25/kNN 各自召回数"
                rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="最终 TopK" name="ragFinalTopK" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={50} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="向量库"
                name="ragVectorStoreType"
                rules={[{ required: true, message: '请选择向量库' }]}
                extra="与 AI 设置中的向量库同源配置键 rag.vector.store"
              >
                <Select options={VECTOR_STORE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text strong>重建索引</Text>
          <Text type="secondary" style={{ display: 'block' }}>
            调用已有接口 POST /api/ai/rag/reindex/all，对已发布文档重新分块与嵌入。耗时长，请勿频繁触发。
          </Text>
          {confirmReindex === false ? (
            <Button type="primary" danger loading={reindexing} icon={<ReloadOutlined />} onClick={handleReindexAll}>
              全量重建索引
            </Button>
          ) : (
            <Popconfirm
              title="确认全量重建向量索引？"
              description="将提交异步任务，可能占用 Embedding 与 ES 资源"
              onConfirm={handleReindexAll}
              okText="确认重建"
              cancelText="取消"
            >
              <Button type="primary" danger loading={reindexing} icon={<ReloadOutlined />}>
                全量重建索引
              </Button>
            </Popconfirm>
          )}
        </Space>
        {renderSaveBar(handleSaveRag)}
      </Card>
    );
  }

  // ===================== GRAPH TAB =====================
  /**
   * 知识图谱 / KAG 设置：自动抽取、模型与重建/清理入口。
   *
   * @returns 图谱设置 Tab 内容
   */
  function renderGraphTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <ApartmentOutlined />,
          '知识图谱',
          'KAG 自动抽实体、抽取模型与图谱重建/清理',
          handleSaveGraph,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="配置写入系统配置表并同步 Redis。文档发布后的自动抽实体开关（kag.extraction.auto-enabled）由 intelligence 热读；关闭后仍可手动重建/清理。重建/清理接口与「知识图谱」页相同。"
        />
        <Form
          form={graphForm}
          layout="vertical"
          initialValues={{
            kagEnabled: true,
            kagAutoExtract: true,
            kagExtractionModel: 'qwen',
            kagMaxEntitiesPerChunk: 10,
            kagMaxHops: 2,
            kagClearBeforeBuild: true,
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="启用 KAG" name="kagEnabled" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="自动抽实体"
                name="kagAutoExtract"
                valuePropName="checked"
                extra="文档发布后触发实体/关系抽取"
              >
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="重建前清空图谱"
                name="kagClearBeforeBuild"
                valuePropName="checked"
              >
                <Switch checkedChildren="清空" unCheckedChildren="保留" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="抽取模型"
                name="kagExtractionModel"
                rules={[{ required: true, message: '请选择抽取模型' }]}
              >
                <Select options={KAG_MODEL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="每块最大实体数" name="kagMaxEntitiesPerChunk">
                <InputNumber style={{ width: '100%' }} min={1} max={50} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="检索跳数 maxHops" name="kagMaxHops">
                <InputNumber style={{ width: '100%' }} min={1} max={5} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text strong>图谱运维</Text>
          <Text type="secondary" style={{ display: 'block' }}>
            重建：POST /api/document/documents/graph/rebuild；清理脏节点：POST .../graph/cleanup。也可在「知识图谱」页面操作。
          </Text>
          <Space wrap>
            {confirmGraphOps === false ? (
              <Button
                type="primary"
                loading={graphBusy === 'rebuild'}
                disabled={graphBusy === 'cleanup'}
                icon={<ReloadOutlined />}
                onClick={handleRebuildGraph}
              >
                重建知识图谱
              </Button>
            ) : (
              <Popconfirm
                title="确认全量重建知识图谱？"
                description="可能耗时较长，并按配置决定是否先清空图数据"
                onConfirm={handleRebuildGraph}
                okText="确认重建"
                cancelText="取消"
              >
                <Button
                  type="primary"
                  loading={graphBusy === 'rebuild'}
                  disabled={graphBusy === 'cleanup'}
                  icon={<ReloadOutlined />}
                >
                  重建知识图谱
                </Button>
              </Popconfirm>
            )}
            {confirmGraphOps === false ? (
              <Button
                danger
                loading={graphBusy === 'cleanup'}
                disabled={graphBusy === 'rebuild'}
                icon={<DeleteOutlined />}
                onClick={handleCleanupGraph}
              >
                清理脏节点
              </Button>
            ) : (
              <Popconfirm
                title="确认清理图谱脏节点？"
                description="将移除无效/孤立节点等脏数据"
                onConfirm={handleCleanupGraph}
                okText="确认清理"
                cancelText="取消"
              >
                <Button
                  danger
                  loading={graphBusy === 'cleanup'}
                  disabled={graphBusy === 'rebuild'}
                  icon={<DeleteOutlined />}
                >
                  清理脏节点
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Space>
        {renderSaveBar(handleSaveGraph)}
      </Card>
    );
  }

  // ===================== AGENT TAB =====================
  /**
   * Agent 设置：默认工作流、超时与工具开关。
   *
   * @returns Agent 设置 Tab 内容
   */
  function renderAgentTab() {
    const workflowOptions = [
      { value: 0, label: '未指定（运行页自行选择）' },
      ...agentWorkflows.map((w) => ({
        value: w.id,
        label: `${w.name} (#${w.id})`,
      })),
    ];

    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <ClusterOutlined />,
          'Agent',
          '默认工作流、Run/LLM/工具超时与常用工具开关',
          handleSaveAgent,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="配置写入系统配置表并同步 Redis（键名 agent.timeouts.* 等）。kb-agent 对 Run/工具超时优先热读 SystemConfigCache；无 Redis 或读失败时回退 application.yml / Nacos。功能入口开关见「基本设置 → enableAgent」。"
        />
        <Form
          form={agentForm}
          layout="vertical"
          initialValues={{
            agentDefaultWorkflowId: 0,
            agentDefaultModel: 'qwen',
            agentRunTimeoutSeconds: 90,
            agentLlmTimeoutSeconds: 60,
            agentToolTimeoutSeconds: 5,
            agentToolHybridSearch: true,
            agentToolGraphSearch: true,
            agentToolGetDocument: true,
            agentRunRetentionDays: 30,
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="默认工作流"
                name="agentDefaultWorkflowId"
                extra="已发布工作流列表；0 表示不预选"
              >
                <Select options={workflowOptions} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="默认模型"
                name="agentDefaultModel"
                rules={[{ required: true, message: '请选择默认模型' }]}
              >
                <Select options={AGENT_MODEL_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="Run 超时（秒）" name="agentRunTimeoutSeconds" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={10} max={600} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="LLM 超时（秒）" name="agentLlmTimeoutSeconds" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={5} max={300} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="工具超时（秒）" name="agentToolTimeoutSeconds" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={120} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="工具 hybrid_search" name="agentToolHybridSearch" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="工具 graph_search" name="agentToolGraphSearch" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="工具 get_document" name="agentToolGetDocument" valuePropName="checked">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={8}>
              <Form.Item label="Run 保留天数" name="agentRunRetentionDays">
                <InputNumber style={{ width: '100%' }} min={1} max={365} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {renderSaveBar(handleSaveAgent)}
      </Card>
    );
  }

  // ===================== COMPLIANCE TAB =====================
  /**
   * 审计与合规：操作日志保留期与敏感操作二次确认开关。
   *
   * @returns 合规设置 Tab 内容
   */
  function renderComplianceTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <AuditOutlined />,
          '审计与合规',
          '操作日志保留期与敏感操作二次确认',
          handleSaveCompliance,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="保留期由 kb-core 定时任务按日清理过期操作日志（最少 7 天）。二次确认开关影响设置页/图谱页等敏感按钮；导出确认供业务页按配置接入。"
        />
        <Form
          form={complianceForm}
          layout="vertical"
          initialValues={{
            operationLogRetentionDays: 90,
            confirmSensitiveExport: true,
            confirmSensitiveReindex: true,
            confirmSensitiveGraphOps: true,
            confirmSensitiveDelete: true,
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="操作日志保留天数"
                name="operationLogRetentionDays"
                rules={[{ required: true, message: '请填写保留天数' }]}
                extra="实际清理下限为 7 天，防止误配清库"
              >
                <InputNumber style={{ width: '100%' }} min={7} max={3650} />
              </Form.Item>
            </Col>
            <Col span={12} style={{ display: 'flex', alignItems: 'center' }}>
              <Button onClick={() => navigate('/admin/operation-logs')}>
                查看操作日志
              </Button>
            </Col>
          </Row>
          <Divider orientation="left" plain>敏感操作二次确认</Divider>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="导出 PDF / 批量导出"
                name="confirmSensitiveExport"
                valuePropName="checked"
                extra="配置落库，文档页可按此开关接入确认框"
              >
                <Switch checkedChildren="需确认" unCheckedChildren="跳过" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="全量重建向量索引"
                name="confirmSensitiveReindex"
                valuePropName="checked"
              >
                <Switch checkedChildren="需确认" unCheckedChildren="跳过" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="图谱重建 / 清理"
                name="confirmSensitiveGraphOps"
                valuePropName="checked"
              >
                <Switch checkedChildren="需确认" unCheckedChildren="跳过" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="删除类操作"
                name="confirmSensitiveDelete"
                valuePropName="checked"
                extra="如批量删日志等，业务页按配置接入"
              >
                <Switch checkedChildren="需确认" unCheckedChildren="跳过" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {renderSaveBar(handleSaveCompliance)}
      </Card>
    );
  }

  // ===================== INTEGRATION TAB =====================
  /**
   * 集成中枢：对象存储/邮件等集中展示，明细编辑跳转存储与通知 Tab。
   *
   * @returns 集成 Tab 内容
   */
  function renderIntegrationTab() {
    const storage = settings?.storage;
    const notification = settings?.notification;
    const rag = settings?.rag;

    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <ApiOutlined />,
          '集成',
          '对象存储（RustFS/S3）、邮件与检索依赖集中一览；避免与存储/通知 Tab 重复维护',
          handleSaveIntegration,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Endpoint/Bucket、SMTP 主机端口等明细请在「存储设置」「通知设置」中修改；本页保存提供商标识与 Neo4j/ES 说明项。运行时仍以 deploy/.env / Nacos 为准。"
        />

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card size="small" title={<Space><CloudServerOutlined /> 对象存储</Space>}
              extra={<Button type="link" size="small" onClick={() => handleTabChange('storage')}>去编辑</Button>}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Endpoint">{storage?.storageEndpoints || '—'}</Descriptions.Item>
                <Descriptions.Item label="Bucket">{storage?.storageBucket || '—'}</Descriptions.Item>
                <Descriptions.Item label="最大上传">{storage?.maxFileSize ? formatBytes(Number(storage.maxFileSize)) : '—'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={<Space><MailOutlined /> 邮件通知</Space>}
              extra={<Button type="link" size="small" onClick={() => handleTabChange('notification')}>去编辑</Button>}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="启用">{notification?.emailEnabled ? '是' : '否'}</Descriptions.Item>
                <Descriptions.Item label="SMTP">{notification?.emailHost || '—'}{notification?.emailPort ? `:${notification.emailPort}` : ''}</Descriptions.Item>
                <Descriptions.Item label="WebSocket">{notification?.websocketEnabled ? '开' : '关'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={<Space><SearchOutlined /> 向量 / 检索</Space>}
              extra={<Button type="link" size="small" onClick={() => handleTabChange('rag')}>去编辑</Button>}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="向量库">{rag?.ragVectorStoreType || settings?.ai?.vectorStoreType || '—'}</Descriptions.Item>
                <Descriptions.Item label="RAG">{rag?.ragEnabled === false ? '关' : '开'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={<Space><ApartmentOutlined /> 图谱库</Space>}
              extra={<Button type="link" size="small" onClick={() => handleTabChange('graph')}>去编辑</Button>}
            >
              <Text type="secondary">Neo4j 连接说明见下方表单；KAG 开关在「知识图谱」Tab。</Text>
            </Card>
          </Col>
        </Row>

        <Divider orientation="left" plain>集成标识（可保存）</Divider>
        <Form
          form={integrationForm}
          layout="vertical"
          initialValues={{
            storageProvider: 'rustfs',
            storageRegion: 'us-east-1',
            integrationNeo4jUri: 'bolt://localhost:7687',
            integrationEsHosts: 'http://localhost:9200',
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="对象存储提供商"
                name="storageProvider"
                rules={[{ required: true, message: '请选择提供商' }]}
                extra="标识用途；实际访问仍用存储 Tab 的 Endpoint"
              >
                <Select options={STORAGE_PROVIDER_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="存储 Region" name="storageRegion">
                <Input placeholder="us-east-1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Neo4j URI" name="integrationNeo4jUri" extra="说明项，runtime 以 Nacos neo4j.* 为准">
                <Input placeholder="bolt://localhost:7687" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Elasticsearch Hosts" name="integrationEsHosts" extra="说明项，runtime 以 Nacos elasticsearch.* 为准">
                <Input placeholder="http://localhost:9200" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {renderSaveBar(handleSaveIntegration)}
      </Card>
    );
  }

  // ===================== EXPORT TAB =====================
  /**
   * 文档与导出设置：PDF 水印开关/类型/文案/透明度。
   *
   * @returns 导出设置 Tab 内容
   */
  function renderExportTab() {
    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <FileProtectOutlined />,
          '文档与导出',
          'PDF 导出水印（用户名 / 自定义 / 用户+时间）',
          handleSaveExport,
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="开启后，文档「导出 PDF」会对每一页叠加斜向水印；配置写入系统配置表并同步 Redis，导出时即时生效。"
        />
        <Form
          form={exportForm}
          layout="vertical"
          initialValues={{
            pdfWatermarkEnabled: false,
            pdfWatermarkType: 'user',
            pdfWatermarkText: '内部资料',
            pdfWatermarkOpacity: 0.15,
          }}
        >
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="启用 PDF 水印"
                name="pdfWatermarkEnabled"
                valuePropName="checked"
              >
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="水印透明度"
                name="pdfWatermarkOpacity"
                extra="建议 0.1～0.3，过大影响阅读"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  disabled={!pdfWatermarkEnabled}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 0]}>
            <Col span={12}>
              <Form.Item
                label="水印类型"
                name="pdfWatermarkType"
                rules={[{ required: true, message: '请选择水印类型' }]}
              >
                <Select options={WATERMARK_TYPE_OPTIONS} disabled={!pdfWatermarkEnabled} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="自定义水印文案"
                name="pdfWatermarkText"
                extra={pdfWatermarkType === 'custom' ? '将作为水印正文' : '类型为「自定义」时生效；其他类型作兜底'}
                rules={
                  pdfWatermarkEnabled && pdfWatermarkType === 'custom'
                    ? [{ required: true, message: '请填写自定义水印文案' }]
                    : undefined
                }
              >
                <Input
                  placeholder="内部资料"
                  maxLength={40}
                  disabled={!pdfWatermarkEnabled || pdfWatermarkType !== 'custom'}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {renderSaveBar(handleSaveExport)}
      </Card>
    );
  }

  // ===================== STATUS TAB =====================
  function renderStatusTab() {
    const status = settings?.status;

    if (!status) {
      return (
        <Card style={CARD_STYLE}>
          <Result
            status="warning"
            title="无法获取系统状态"
            extra={
              <Button icon={<ReloadOutlined />} onClick={fetchSettings}>
                重新加载
              </Button>
            }
          />
        </Card>
      );
    }

    return (
      <Card style={CARD_STYLE} styles={{ body: { padding: '24px 32px' } }}>
        {renderSectionHeader(
          <DatabaseOutlined />,
          '系统状态',
          '查看系统运行状态和执行运维操作',
          () => fetchSettings(),
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <Statistic
                title="系统版本"
                value={status.version}
                prefix={<Tag color="blue" style={{ marginRight: 0 }}>v</Tag>}
                valueStyle={{ fontSize: 18, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>运行状态</div>
              <Space>
                {status.runStatus === 'running' ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
                    <Tag color="success" style={{ margin: 0 }}>正常运行</Tag>
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                    <Tag color="error" style={{ margin: 0 }}>{status.runStatus}</Tag>
                  </>
                )}
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>数据库状态</div>
              <Space>
                {status.dbStatus === 'connected' ? (
                  <>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <Tag color="success" style={{ margin: 0 }}>连接正常</Tag>
                  </>
                ) : (
                  <>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <Tag color="error" style={{ margin: 0 }}>连接异常</Tag>
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <Statistic
                title="系统启动时间"
                value={status.startTime ? dayjs(status.startTime).format('MM-DD HH:mm') : '-'}
                valueStyle={{ fontSize: 14, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <Statistic
                title="上次备份"
                value={status.lastBackupTime || '暂无'}
                valueStyle={{ fontSize: 14, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <Statistic
                title="文档总数"
                value={status.documentCount}
                suffix="篇"
                valueStyle={{ fontSize: 14, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={STAT_CARD_STYLE}>
              <Statistic
                title="注册用户"
                value={status.userCount}
                suffix="人"
                valueStyle={{ fontSize: 14, fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        <Divider titlePlacement="start">
          <Text type="secondary" style={{ fontSize: 12 }}>运维操作</Text>
        </Divider>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" style={OP_CARD_STYLE}>
              <div style={OP_CARD_CONTENT_STYLE}>
                <div>
                  <Text strong>缓存清理</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    清理Redis缓存以释放内存空间
                  </Text>
                </div>
              </div>
              <Popconfirm
                title="确认清理缓存"
                description="清理缓存后部分数据需要重新加载，确定继续？"
                onConfirm={handleClearCache}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<DeleteOutlined />} danger size="small">
                  清理缓存
                </Button>
              </Popconfirm>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={OP_CARD_STYLE}>
              <div style={OP_CARD_CONTENT_STYLE}>
                <div>
                  <Text strong>数据备份</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建系统数据的完整备份
                  </Text>
                </div>
              </div>
              <Popconfirm
                title="确认创建备份"
                description="创建备份可能需要几分钟时间，确定继续？"
                onConfirm={handleBackup}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<CloudUploadOutlined />} size="small">
                  立即备份
                </Button>
              </Popconfirm>
            </Card>
          </Col>
          {enableEmail && (
            <Col span={8}>
              <Card size="small" style={OP_CARD_STYLE}>
                <div style={OP_CARD_CONTENT_STYLE}>
                  <div>
                    <Text strong>邮件测试</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      测试邮件服务配置是否正常
                    </Text>
                  </div>
                </div>
                <Button
                  icon={<MailOutlined />}
                  size="small"
                  onClick={handleTestEmail}
                >
                  发送测试邮件
                </Button>
              </Card>
            </Col>
          )}
        </Row>
      </Card>
    );
  }
};

// ---- Utility ----

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

// ---- Styles ----

const PAGE_STYLE: React.CSSProperties = {
  padding: '24px 24px 32px 24px',
  background: '#f8fafc',
  minHeight: '100vh',
};

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  marginTop: 16,
};

const STAT_CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid #f1f5f9',
};

const OP_CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const OP_CARD_CONTENT_STYLE: React.CSSProperties = {
  flex: 1,
  paddingRight: 16,
};

const SWITCH_ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  padding: '16px 0',
  borderBottom: '1px solid #f1f5f9',
};

const SWITCH_TITLE_STYLE: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  marginBottom: 4,
};

const SWITCH_DESC_STYLE: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
};

const TAB_CARD_STYLE = `
  .ant-tabs-nav {
    margin-bottom: 0 !important;
  }
  .ant-tabs-nav::before {
    border-bottom: none !important;
  }
`;

export default SettingsPage;
