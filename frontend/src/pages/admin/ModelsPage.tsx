/**
 * 管理后台页面：ModelsPage（第8阶段模型库）。
 *
 * <p>列表 + 抽屉表单（提供方/模型条目）+ 连通性测试 + 启停。</p>
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { modelService } from '@/services';
import type { ModelItem, ModelItemPayload, ModelProvider, ModelProviderPayload, ModelTypeOption } from '@/services/model.service';
import type { EntityId } from '@/types';

const { Text } = Typography;

interface ModelFormValues extends ModelProviderPayload {
  models: ModelItemPayload[];
}

/**
 * 模型管理页。
 */
export const ModelsPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeOptions, setTypeOptions] = useState<ModelTypeOption[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ModelProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ModelFormValues>();

  // 连通测试
  const [testTarget, setTestTarget] = useState<ModelProvider | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testForm] = Form.useForm<{ baseUrl: string; apiKey: string; modelKey: string; modelType: string }>();

  useEffect(() => {
    fetchTypes();
    fetchPage(1, '');
    // 页面挂载时加载一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 加载模型类型枚举。
   */
  const fetchTypes = async () => {
    try {
      setTypeOptions(await modelService.listTypes());
    } catch {
      // 枚举失败不阻塞页面
    }
  };

  /**
   * 分页加载管理列表。
   */
  const fetchPage = useCallback(async (page: number, kw: string) => {
    setLoading(true);
    try {
      const resp = await modelService.page({ current: page, size: 10, keyword: kw || undefined });
      setProviders(resp.records ?? resp.list ?? []);
      setTotal(resp.total ?? 0);
      setCurrent(page);
    } catch {
      message.error('获取模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  /**
   * 打开新增抽屉。
   */
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1,
      models: [{ modelType: 'chat', isDefault: 1, status: 1 }],
    });
    setDrawerOpen(true);
  };

  /**
   * 打开编辑抽屉（apiKey 留空表示不修改）。
   */
  const openEdit = (provider: ModelProvider) => {
    setEditing(provider);
    form.resetFields();
    form.setFieldsValue({
      providerKey: provider.providerKey,
      providerName: provider.providerName,
      baseUrl: provider.baseUrl,
      apiKey: '',
      status: provider.status,
      models: provider.models.map((m) => ({
        modelKey: m.modelKey,
        modelType: m.modelType,
        displayName: m.displayName,
        isDefault: m.isDefault,
        dimension: m.dimension,
        status: m.status,
      })),
    });
    setDrawerOpen(true);
  };

  /**
   * 保存（新增/更新）。
   */
  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: ModelProviderPayload = {
        providerKey: values.providerKey,
        providerName: values.providerName,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey || undefined,
        status: values.status ?? 1,
        models: values.models ?? [],
      };
      if (editing) {
        await modelService.update(editing.id, payload);
        message.success('模型提供方已更新');
      } else {
        await modelService.create(payload);
        message.success('模型提供方已创建');
      }
      setDrawerOpen(false);
      fetchPage(current, keyword);
    } catch (e) {
      // 校验/业务错误由拦截器提示
      if ((e as { errorFields?: unknown }).errorFields) {
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * 删除提供方。
   */
  const handleDelete = async (id: EntityId) => {
    try {
      await modelService.remove(id);
      message.success('已删除');
      fetchPage(current, keyword);
    } catch {
      // 拦截器已提示
    }
  };

  /**
   * 启停切换。
   */
  const handleToggleStatus = async (provider: ModelProvider, status: 0 | 1) => {
    try {
      await modelService.update(provider.id, {
        providerKey: provider.providerKey,
        providerName: provider.providerName,
        baseUrl: provider.baseUrl,
        status,
        models: provider.models.map((m) => ({
          modelKey: m.modelKey,
          modelType: m.modelType,
          displayName: m.displayName,
          isDefault: m.isDefault,
          dimension: m.dimension,
          status: m.status,
        })),
      });
      message.success(status === 1 ? '已启用' : '已禁用');
      fetchPage(current, keyword);
    } catch {
      // 拦截器已提示
    }
  };

  /**
   * 打开连通测试弹窗。
   */
  const openTest = (provider: ModelProvider) => {
    setTestTarget(provider);
    testForm.resetFields();
    testForm.setFieldsValue({
      baseUrl: provider.baseUrl ?? '',
      apiKey: '',
      modelKey: provider.models[0]?.modelKey ?? '',
      modelType: provider.models[0]?.modelType ?? 'chat',
    });
    setTestOpen(true);
  };

  /**
   * 执行连通性测试。
   */
  const handleTest = async () => {
    const values = await testForm.validateFields();
    setTesting(true);
    try {
      const result = await modelService.test(values);
      message[result.includes('成功') ? 'success' : 'warning'](result);
    } catch {
      // 拦截器已提示
    } finally {
      setTesting(false);
    }
  };

  const columns = [
    {
      title: '提供方标识',
      dataIndex: 'providerKey',
      width: 140,
      render: (v: string, row: ModelProvider) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.providerName}</Text>
        </Space>
      ),
    },
    {
      title: '基址',
      dataIndex: 'baseUrl',
      ellipsis: true,
      render: (v?: string) => v || '-',
    },
    {
      title: 'API Key',
      dataIndex: 'apiKeyHint',
      width: 150,
      render: (v?: string) => (v ? <Text code>{v}</Text> : <Text type="secondary">未配置</Text>),
    },
    {
      title: '模型',
      dataIndex: 'models',
      width: 260,
      render: (models: ModelItem[]) => (
        <Space size={[4, 4]} wrap>
          {models.map((m) => (
            <Tag key={`${m.modelType}-${m.modelKey}`} color={m.status === 1 ? 'blue' : 'default'}>
              {m.modelKey}
              {m.isDefault === 1 ? ' ★' : ''}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_: unknown, row: ModelProvider) => (
        <Switch
          checked={row.status === 1}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleToggleStatus(row, checked ? 1 : 0)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: unknown, row: ModelProvider) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button size="small" icon={<ApiOutlined />} onClick={() => openTest(row)}>
            测试
          </Button>
          <Popconfirm title="确认删除该提供方及其模型？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="模型管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索提供方标识/名称"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => fetchPage(1, v)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchPage(current, keyword)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增提供方
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={providers}
        pagination={{
          current,
          total,
          pageSize: 10,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page) => fetchPage(page, keyword),
        }}
      />

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editing ? `编辑提供方：${editing.providerKey}` : '新增模型提供方'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ status: 1 }}>
          <Form.Item
            name="providerKey"
            label="提供方标识"
            rules={[{ required: true, message: '请输入提供方标识' }]}
          >
            <Input placeholder="qwen / siliconflow / deepseek / custom / openai / ollama" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="providerName" label="显示名" rules={[{ required: true, message: '请输入显示名' }]}>
            <Input placeholder="通义千问 / 硅基流动…" />
          </Form.Item>
          <Form.Item
            name="baseUrl"
            label="OpenAI 兼容基址"
            rules={[{ required: true, message: '请输入基址' }]}
          >
            <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API Key"
            extra={editing ? '留空表示不修改' : '将以 AES-GCM 加密存储，列表仅显示掩码'}
            rules={editing ? [] : [{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder={editing ? '留空不修改' : 'sk-...'} />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(v: boolean) => (v ? 1 : 0)} getValueProps={(v: number) => ({ checked: v === 1 })}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.List name="models">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`模型 ${field.name + 1}`}
                    extra={
                      <Button size="small" type="text" danger onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      <Form.Item
                        name={[field.name, 'modelType']}
                        label="类型"
                        rules={[{ required: true, message: '请选择类型' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="选择模型类型"
                          options={typeOptions.map((t) => ({ value: t.value, label: `${t.label}（${t.value}）` }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'modelKey']}
                        label="模型名"
                        rules={[{ required: true, message: '请输入模型名' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="qwen3-max / BAAI/bge-m3 / qwen3-rerank" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'displayName']} label="显示名" style={{ marginBottom: 0 }}>
                        <Input placeholder="下拉显示名（可选）" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'dimension']} label="Embedding 维度" style={{ marginBottom: 0 }}>
                        <InputNumber min={1} placeholder="仅 embedding 需要" style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'isDefault']}
                        label="该类型默认"
                        valuePropName="checked"
                        getValueFromEvent={(v: boolean) => (v ? 1 : 0)}
                        getValueProps={(v: number) => ({ checked: v === 1 })}
                        style={{ marginBottom: 0 }}
                      >
                        <Switch checkedChildren="默认" unCheckedChildren="非默认" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'status']}
                        label="状态"
                        valuePropName="checked"
                        getValueFromEvent={(v: boolean) => (v ? 1 : 0)}
                        getValueProps={(v: number) => ({ checked: v === 1 })}
                        style={{ marginBottom: 0 }}
                      >
                        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ modelType: 'chat', isDefault: 0, status: 1 })}>
                  添加模型
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>

      {/* 连通性测试弹窗 */}
      <Drawer
        title={`连通性测试：${testTarget?.providerKey ?? ''}`}
        width={420}
        open={testOpen}
        onClose={() => setTestOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setTestOpen(false)}>关闭</Button>
            <Button type="primary" loading={testing} onClick={handleTest}>
              开始测试
            </Button>
          </Space>
        }
      >
        <Form form={testForm} layout="vertical">
          <Form.Item name="baseUrl" label="基址" rules={[{ required: true, message: '请输入基址' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API Key（临时明文，仅本次测试）"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="modelKey" label="模型名" rules={[{ required: true, message: '请输入模型名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="modelType" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select options={typeOptions.map((t) => ({ value: t.value, label: `${t.label}（${t.value}）` }))} />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  );
};

export default ModelsPage;
