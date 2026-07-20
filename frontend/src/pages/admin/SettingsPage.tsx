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
} from '@ant-design/icons';
import { settingsService, aiService } from '@/services';
import { PageLoading, AdminPageHeader } from '@/components/common';
import { useAppStore } from '@/stores';
import type { SystemSettings, AIModelOption } from '@/types';
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

type SettingsTab = 'basic' | 'security' | 'storage' | 'notification' | 'ai' | 'status';

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

  const [chatModels, setChatModels] = useState<AIModelOption[]>([]);
  const vectorStoreType = Form.useWatch('vectorStoreType', aiForm);
  const embeddingProvider = Form.useWatch('embeddingProvider', aiForm) || 'siliconflow';

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
