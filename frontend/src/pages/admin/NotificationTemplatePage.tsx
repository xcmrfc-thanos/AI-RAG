import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Tag,
  Popconfirm,
  Row,
  Col,
  Typography,
  Alert,
  Divider,
  Tabs,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SendOutlined,
  EyeOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  WechatOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { foundationService } from '@/services';
import { useAppStore } from '@/stores';
import type { EntityId } from '@/types';
import type { NotificationTemplate as NotificationTemplateDTO } from '@/services/foundation.service';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

// 通知预览数据
interface PreviewData {
  [key: string]: string;
}

interface NotificationTemplate extends Omit<NotificationTemplateDTO, 'id' | 'variables'> {
  id: EntityId;
  variables: string[];
}

const NOTIFICATION_TYPES = [
  { value: 'EMAIL', label: '邮件', icon: <MailOutlined />, color: 'blue' },
  { value: 'SMS', label: '短信', icon: <MessageOutlined />, color: 'green' },
  { value: 'WECHAT', label: '微信', icon: <WechatOutlined />, color: 'green' },
  { value: 'SYSTEM', label: '系统', icon: <BellOutlined />, color: 'orange' },
  { value: 'BROWSER', label: '浏览器', icon: <DesktopOutlined />, color: 'purple' },
];

const COMMON_VARIABLES = [
  { name: '{{userName}}', description: '用户名' },
  { name: '{{userEmail}}', description: '用户邮箱' },
  { name: '{{currentTime}}', description: '当前时间' },
  { name: '{{systemName}}', description: '系统名称' },
  { name: '{{verifyCode}}', description: '验证码' },
  { name: '{{documentTitle}}', description: '文档标题' },
  { name: '{{documentUrl}}', description: '文档链接' },
  { name: '{{operatorName}}', description: '操作人' },
];

export const NotificationTemplatePage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NotificationTemplate[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({});
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('form');

  const enableEmail = useAppStore((s) => s.enableEmail);

  const availableTypes = useMemo(
    () => enableEmail ? NOTIFICATION_TYPES : NOTIFICATION_TYPES.filter(t => t.value !== 'EMAIL'),
    [enableEmail]
  );

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response: any = await foundationService.notificationTemplate.list({
        current: 1,
        size: 100,
        notificationType: typeFilter !== 'all' ? typeFilter : undefined,
      });
      const records = response?.records || [];
      // Parse variables from JSON string to array
      const parsedRecords = records.map((t: any) => ({
        ...t,
        variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : (t.variables || []),
      }));
      setTemplates(parsedRecords);
    } catch {
      message.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, message]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    filterTemplates();
    // 过滤结果仅由模板数据与搜索词驱动。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, searchValue]);

  const filterTemplates = () => {
    let filtered = [...templates];

    if (searchValue) {
      filtered = filtered.filter(
        (template) =>
          template.templateName.toLowerCase().includes(searchValue.toLowerCase()) ||
          template.templateCode.toLowerCase().includes(searchValue.toLowerCase()) ||
          template.title.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((template) => template.notificationType === typeFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      notificationType: 'SYSTEM',
      isActive: 1,
      variables: [],
    });
    setActiveTab('form');
    setIsTemplateModalVisible(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      templateCode: template.templateCode,
      templateName: template.templateName,
      notificationType: template.notificationType,
      title: template.title,
      content: template.content,
      variables: template.variables,
      description: template.description,
      isActive: template.isActive,
    });
    setActiveTab('form');
    setIsTemplateModalVisible(true);
  };

  const handleDelete = async (id: EntityId) => {
    try {
      await foundationService.notificationTemplate.delete(id);
      setTemplates(templates.filter((t) => t.id !== id));
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const handleTemplateModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Extract variables from title and content
      const variablePattern = /\{\{(\w+)\}\}/g;
      const titleVars = Array.from(values.title.matchAll(variablePattern), (m: RegExpMatchArray) => m[1]);
      const contentVars = Array.from(values.content.matchAll(variablePattern), (m: RegExpMatchArray) => m[1]);
      const allVars = Array.from(new Set([...titleVars, ...contentVars]));
      // variables stored as JSON string in backend
      const variablesJson = JSON.stringify(allVars);

      if (editingTemplate) {
        await foundationService.notificationTemplate.update(editingTemplate.id, {
          ...values,
          variables: variablesJson,
        });
        message.success('更新成功');
      } else {
        await foundationService.notificationTemplate.create({
          ...values,
          variables: variablesJson,
        });
        message.success('创建成功');
      }

      setIsTemplateModalVisible(false);
      form.resetFields();
      // Refresh list after create/update
      fetchTemplates();
    } catch (error: any) {
      // form validation error doesn't show message
      if (error?.errorFields) return;
      message.error('操作失败');
    }
  };

  const handlePreview = (template: NotificationTemplate) => {
    setPreviewTemplate(template);
    // 初始化预览数据
    const initData: PreviewData = {};
    template.variables.forEach((v) => {
      initData[v] = `[${v}]`;
    });
    setPreviewData(initData);
    setIsPreviewModalVisible(true);
  };

  const handleTest = (template: NotificationTemplate) => {
    setPreviewTemplate(template);
    testForm.resetFields();
    testForm.setFieldsValue({
      testTarget: 'test@example.com',
    });
    setIsTestModalVisible(true);
  };

  const handleSendTest = async () => {
    if (!previewTemplate?.id) return;
    try {
      const values = await testForm.validateFields();
      await foundationService.notificationTemplate.test(previewTemplate.id, values.testTarget);
      message.success('测试发送成功，请检查收件箱');
      setIsTestModalVisible(false);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('发送失败');
    }
  };

  const renderPreview = (text: string, data: PreviewData) => {
    let result = text;
    Object.keys(data).forEach((key) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key] || `[${key}]`);
    });
    return result;
  };

  const getTypeInfo = (type: NotificationTemplate['notificationType']) => {
    return availableTypes.find((t) => t.value === type) || {
      label: type,
      color: 'default',
      icon: <BellOutlined />,
    };
  };

  const columns: ColumnsType<NotificationTemplate> = [
    {
      title: '模板编码',
      dataIndex: 'templateCode',
      key: 'templateCode',
      width: 180,
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '模板名称',
      dataIndex: 'templateName',
      key: 'templateName',
      width: 150,
    },
    {
      title: '通知类型',
      dataIndex: 'notificationType',
      key: 'notificationType',
      width: 100,
      render: (type) => {
        const info = getTypeInfo(type);
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.label}
          </Tag>
        );
      },
      filters: availableTypes.map((t) => ({ text: t.label, value: t.value })),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (text) => (
        <Text
          ellipsis={{
            tooltip: text,
          }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: '变量',
      dataIndex: 'variables',
      key: 'variables',
      width: 200,
      render: (variables) => (
        <Space wrap>
          {variables?.map((v: string, i: number) => (
            <Tag key={i}>{`{{${v}}}`}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive) =>
        isActive ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">停用</Tag>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => handleTest(record)}
          >
            测试
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除该模板吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <BellOutlined />
            <span>通知模板管理</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Alert
          message="模板管理"
          description="通知模板用于系统发送各类通知。模板中可以使用变量，格式为 {{变量名}}。发送时会自动替换为实际值。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Search
                placeholder="搜索模板名称、编码或标题"
                allowClear
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                placeholder="选择通知类型"
                allowClear
                style={{ width: '100%' }}
                value={typeFilter === 'all' ? undefined : typeFilter}
                onChange={(value) => setTypeFilter(value || 'all')}
              >
                {availableTypes.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.icon}
                    <span style={{ marginLeft: 8 }}>{type.label}</span>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} lg={10}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>
                  刷新
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  新增模板
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={filteredTemplates}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑模板弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={isTemplateModalVisible}
        onOk={handleTemplateModalOk}
        onCancel={() => {
          setIsTemplateModalVisible(false);
          form.resetFields();
        }}
        width={900}
        destroyOnHidden
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="基本信息" key="form">
            <Form form={form} layout="vertical" preserve={false}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="模板编码"
                    name="templateCode"
                    rules={[{ required: true, message: '请输入模板编码' }]}
                  >
                    <Input placeholder="例如: EMAIL_VERIFY_CODE" disabled={!!editingTemplate} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="模板名称"
                    name="templateName"
                    rules={[{ required: true, message: '请输入模板名称' }]}
                  >
                    <Input placeholder="例如: 邮箱验证码" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="通知类型"
                    name="notificationType"
                    rules={[{ required: true, message: '请选择通知类型' }]}
                  >
                    <Select>
                      {availableTypes.map((type) => (
                        <Option key={type.value} value={type.value}>
                          {type.icon}
                          <span style={{ marginLeft: 8 }}>{type.label}</span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="状态"
                    name="isActive"
                    rules={[{ required: true, message: '请选择状态' }]}
                  >
                    <Select>
                      <Option value={1}>启用</Option>
                      <Option value={0}>停用</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="标题"
                name="title"
                rules={[{ required: true, message: '请输入标题' }]}
                extra="可使用变量，格式为 {{变量名}}"
              >
                <Input placeholder="例如: 验证码 - {{systemName}}" />
              </Form.Item>

              <Form.Item
                label="内容"
                name="content"
                rules={[{ required: true, message: '请输入内容' }]}
                extra="可使用变量，格式为 {{变量名}}"
              >
                <TextArea rows={6} placeholder="例如: 尊敬的{{userName}}，您的验证码是：{{verifyCode}}" />
              </Form.Item>

              <Form.Item
                label="描述"
                name="description"
              >
                <TextArea rows={2} placeholder="请输入模板描述" />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="可用变量" key="variables">
            <Alert
              message="变量说明"
              description="点击变量可自动插入到模板中。变量格式为 {{变量名}}"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {COMMON_VARIABLES.map((variable) => (
                  <Card
                    size="small"
                    key={variable.name}
                    hoverable
                    onClick={() => {
                      const title = form.getFieldValue('title') || '';
                      const content = form.getFieldValue('content') || '';
                      form.setFieldsValue({
                        title: title + variable.name,
                        content: content + variable.name,
                      });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Row>
                      <Col span={12}>
                        <Text code copyable={{ text: variable.name }}>
                          {variable.name}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">{variable.description}</Text>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="预览模板"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {previewTemplate && (
          <div>
            <Divider titlePlacement="start">变量设置</Divider>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form layout="vertical">
                {previewTemplate.variables.map((variable) => (
                  <Form.Item key={variable} label={`{{${variable}}}`}>
                    <Input
                      value={previewData[variable]}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [variable]: e.target.value })
                      }
                      placeholder={`请输入${variable}的值`}
                    />
                  </Form.Item>
                ))}
              </Form>
            </Card>

            <Divider titlePlacement="start">预览效果</Divider>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>标题:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Title level={5}>
                      {renderPreview(previewTemplate.title, previewData)}
                    </Title>
                  </div>
                </div>
                <div>
                  <Text strong>内容:</Text>
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12 }}>
                    {renderPreview(previewTemplate.content, previewData)}
                  </div>
                </div>
              </Space>
            </Card>
          </div>
        )}
      </Modal>

      {/* 测试发送弹窗 */}
      <Modal
        title="测试发送"
        open={isTestModalVisible}
        onOk={handleSendTest}
        onCancel={() => setIsTestModalVisible(false)}
        width={600}
      >
        {previewTemplate && (
          <Form form={testForm} layout="vertical" preserve={false}>
            <Alert
              message="测试说明"
              description="使用当前模板和示例数据发送测试通知，请确保目标地址正确。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              label="测试目标"
              name="testTarget"
              rules={[{ required: true, message: '请输入测试目标' }]}
              extra={previewTemplate.notificationType === 'EMAIL' ? '请输入邮箱地址' : '请输入手机号'}
            >
              <Input
                placeholder={
                  previewTemplate.notificationType === 'EMAIL'
                    ? 'test@example.com'
                    : '+86 13800000000'
                }
              />
            </Form.Item>

            <Divider>预览内容</Divider>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>标题:</Text>
                  <div>{previewTemplate.title}</div>
                </div>
                <div>
                  <Text strong>内容:</Text>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{previewTemplate.content}</div>
                </div>
              </Space>
            </Card>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default NotificationTemplatePage;
