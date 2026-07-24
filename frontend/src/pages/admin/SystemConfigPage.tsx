/**
 * 管理后台页面：SystemConfigPage。
 */
import React, { useState, useEffect } from 'react';
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
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tabs,
  Switch,
  InputNumber,
  Typography,
  Alert,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  SecurityScanOutlined,
  BellOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { foundationService } from '@/services';
import type { SystemConfig } from '@/services/foundation.service';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const CONFIG_CATEGORIES = [
  { value: 'AI', label: 'AI配置', icon: <RobotOutlined />, color: 'purple' },
  { value: 'STORAGE', label: '存储配置', icon: <CloudUploadOutlined />, color: 'blue' },
  { value: 'NOTIFICATION', label: '通知配置', icon: <BellOutlined />, color: 'orange' },
  { value: 'SECURITY', label: '安全配置', icon: <SecurityScanOutlined />, color: 'red' },
  { value: 'SYSTEM', label: '系统配置', icon: <SettingOutlined />, color: 'green' },
];

const CONFIG_TYPES = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'json', label: 'JSON' },
];

export const SystemConfigPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<SystemConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchValue, setSearchValue] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [form] = Form.useForm();
  const configType = Form.useWatch('configType', form);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    fetchConfigs();
    // 配置请求由分页与分类标量驱动，加载器身份不参与刷新判定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, activeCategory]);

  useEffect(() => {
    filterConfigs();
    // 本地过滤仅由配置数据、搜索词和分类驱动。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, searchValue, activeCategory]);

  /**
   * fetchConfigs。
   */
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await foundationService.config.list({
        current: pagination.current,
        size: pagination.pageSize,
        category: activeCategory === 'all' ? undefined : activeCategory,
      });

      setConfigs(response.list);
      setPagination((prev) => ({ ...prev, total: response.total }));
    } catch (error) {
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filterConfigs = () => {
    let filtered = [...configs];

    if (searchValue) {
      filtered = filtered.filter(
        (config) =>
          config.configKey.toLowerCase().includes(searchValue.toLowerCase()) ||
          config.configValue.toLowerCase().includes(searchValue.toLowerCase()) ||
          (config.description &&
            config.description.toLowerCase().includes(searchValue.toLowerCase()))
      );
    }

    setFilteredConfigs(filtered);
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      configType: 'string',
      isPublic: 0,
      status: 1,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      configKey: config.configKey,
      configValue: config.configValue,
      configType: config.configType,
      category: config.category,
      description: config.description,
      isPublic: config.isPublic,
    });
    setIsModalVisible(true);
  };

  /**
   * handleDelete。
   */
  const handleDelete = async (key: string) => {
    try {
      await foundationService.config.delete(key);
      message.success('删除成功');
      fetchConfigs();
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * handleModalOk。
   */
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingConfig) {
        await foundationService.config.update(editingConfig.configKey, values);
        message.success('更新成功');
      } else {
        await foundationService.config.create(values);
        message.success('创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchConfigs();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CONFIG_CATEGORIES.find((c) => c.value === category) || {
      label: category,
      color: 'default',
    };
  };

  const renderConfigValue = (config: SystemConfig) => {
    const { configType, configValue } = config;

    switch (configType) {
      case 'boolean':
        return configValue === 'true' ? (
          <Tag color="green">是</Tag>
        ) : (
          <Tag color="red">否</Tag>
        );
      case 'number':
        return <Text code>{Number(configValue).toLocaleString()}</Text>;
      case 'json':
        try {
          const jsonObj = JSON.parse(configValue);
          return (
            <Tooltip title={<pre>{JSON.stringify(jsonObj, null, 2)}</pre>}>
              <Text ellipsis style={{ maxWidth: 200 }}>
                {JSON.stringify(jsonObj)}
              </Text>
            </Tooltip>
          );
        } catch {
          return <Text code>{configValue}</Text>;
        }
      default:
        return (
          <Text
            ellipsis={{
              tooltip: configValue,
            }}
            style={{ maxWidth: 300 }}
          >
            {configValue}
          </Text>
        );
    }
  };

  const columns: ColumnsType<SystemConfig> = [
    {
      title: '配置键',
      dataIndex: 'configKey',
      key: 'configKey',
      width: 200,
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '配置值',
      dataIndex: 'configValue',
      key: 'configValue',
      render: (_, record) => renderConfigValue(record),
    },
    {
      title: '类型',
      dataIndex: 'configType',
      key: 'configType',
      width: 100,
      render: (type) => {
        const typeInfo = CONFIG_TYPES.find((t) => t.value === type);
        return <Tag>{typeInfo?.label || type}</Tag>;
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => {
        const info = getCategoryInfo(category);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (text) => (
        <Text
          ellipsis={{
            tooltip: text,
          }}
        >
          {text || '-'}
        </Text>
      ),
    },
    {
      title: '公开',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 80,
      render: (isPublic) =>
        isPublic ? (
          <Tag color="blue">公开</Tag>
        ) : (
          <Tag color="default">私有</Tag>
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
      width: 150,
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
          <Popconfirm
            title="确认删除"
            description="确定要删除该配置吗？"
            onConfirm={() => handleDelete(record.configKey)}
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

  const renderValueInput = () => {
    switch (configType) {
      case 'boolean':
        return (
          <Form.Item
            label="配置值"
            name="configValue"
            rules={[{ required: true, message: '请选择配置值' }]}
          >
            <Select>
              <Option value="true">true</Option>
              <Option value="false">false</Option>
            </Select>
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item
            label="配置值"
            name="configValue"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        );
      case 'json':
        return (
          <Form.Item
            label="配置值 (JSON)"
            name="configValue"
            rules={[
              { required: true, message: '请输入JSON格式的配置值' },
              {
                validator: (_, value) => {
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('请输入有效的JSON格式'));
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={6} placeholder='{"key": "value"}' />
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            label="配置值"
            name="configValue"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入配置值" />
          </Form.Item>
        );
    }
  };

  // 统计数据
  const categoryStats = CONFIG_CATEGORIES.map((cat) => ({
    ...cat,
    count: configs.filter((c) => c.category === cat.value).length,
  }));

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>系统配置管理</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Alert
          message="配置管理"
          description="系统配置影响系统运行，修改时请谨慎操作。建议在修改前先备份当前配置。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 分类统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="总配置数"
                value={configs.length}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          {categoryStats.map((stat) => (
            <Col xs={24} sm={12} lg={4} key={stat.value}>
              <Card>
                <Statistic
                  title={stat.label}
                  value={stat.count}
                  prefix={stat.icon}
                  valueStyle={{ color: stat.color === 'red' ? '#ff4d4f' : '#52c41a' }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* 分类标签页 */}
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={[
            {
              key: 'all',
              label: (
                <span>
                  全部配置
                  <Tag style={{ marginLeft: 8 }}>{configs.length}</Tag>
                </span>
              ),
            },
            ...CONFIG_CATEGORIES.map((cat) => ({
              key: cat.value,
              label: (
                <span>
                  {cat.icon}
                  <span style={{ marginLeft: 8 }}>{cat.label}</span>
                  <Tag style={{ marginLeft: 8 }}>
                    {configs.filter((c) => c.category === cat.value).length}
                  </Tag>
                </span>
              ),
            })),
          ]}
        />

        <Card style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Search
                placeholder="搜索配置键、配置值或描述"
                allowClear
                style={{ width: 400 }}
                onChange={(e) => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增配置
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={filteredConfigs}
            rowKey="configKey"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) =>
                setPagination({ current: page, pageSize, total: pagination.total }),
            }}
          />
        </Card>
      </Card>

      {/* 新增/编辑配置弹窗 */}
      <Modal
        title={editingConfig ? '编辑配置' : '新增配置'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="配置键"
            name="configKey"
            rules={[{ required: true, message: '请输入配置键' }]}
          >
            <Input
              placeholder="例如: system.max_upload_size"
              disabled={!!editingConfig}
            />
          </Form.Item>

          <Form.Item
            label="配置类型"
            name="configType"
            rules={[{ required: true, message: '请选择配置类型' }]}
          >
            <Select>
              {CONFIG_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {renderValueInput()}

          <Form.Item
            label="配置分类"
            name="category"
            rules={[{ required: true, message: '请选择配置分类' }]}
          >
            <Select>
              {CONFIG_CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.icon}
                  <span style={{ marginLeft: 8 }}>{cat.label}</span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>

          <Form.Item
            label="是否公开"
            name="isPublic"
            valuePropName="checked"
            getValueFromEvent={(checked: boolean) => checked ? 1 : 0}
            tooltip="公开配置可被前端访问（如登录页注册入口）"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemConfigPage;
