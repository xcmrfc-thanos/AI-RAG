/**
 * 管理后台页面：SensitiveWordsPage。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { foundationService } from '@/services';
import type {
  SensitiveCheckResult,
  SensitiveHomophone,
  SensitiveRegex,
  SensitiveWord,
} from '@/services/foundation.service';

const { Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 敏感词管理页：词库 L1 / 正则与谐音 L1.5 / 试检测。
 */
const SensitiveWordsPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [regexList, setRegexList] = useState<SensitiveRegex[]>([]);
  const [homoList, setHomoList] = useState<SensitiveHomophone[]>([]);
  const [wordModal, setWordModal] = useState(false);
  const [editing, setEditing] = useState<SensitiveWord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [checkText, setCheckText] = useState('');
  const [checkResult, setCheckResult] = useState<SensitiveCheckResult | null>(null);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [regexForm] = Form.useForm();
  const [homoForm] = Form.useForm();

  /** 分页加载词库 */
  const loadWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await foundationService.sensitive.list({
        current: page,
        size: 20,
        keyword: keyword || undefined,
        category,
      });
      setWords(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch {
      message.error('加载敏感词失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category, message]);

  /** 加载正则与谐音元数据 */
  const loadMeta = useCallback(async () => {
    try {
      const [r, h] = await Promise.all([
        foundationService.sensitive.listRegex(),
        foundationService.sensitive.listHomophones(),
      ]);
      setRegexList(r || []);
      setHomoList(h || []);
    } catch {
      message.error('加载规则失败');
    }
  }, [message]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  /** 打开新增词条弹窗 */
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: 'custom', action: 'block', enabled: 1 });
    setWordModal(true);
  };

  /** 打开编辑词条弹窗 */
  const openEdit = (row: SensitiveWord) => {
    setEditing(row);
    form.setFieldsValue(row);
    setWordModal(true);
  };

  /** 保存词条（新增或更新） */
  const saveWord = async () => {
    const values = await form.validateFields();
    try {
      if (editing?.id) {
        await foundationService.sensitive.update(editing.id, values);
        message.success('已更新');
      } else {
        await foundationService.sensitive.create(values);
        message.success('已创建');
      }
      setWordModal(false);
      loadWords();
    } catch {
      message.error('保存失败');
    }
  };

  /** 批量导入词条 */
  const doImport = async () => {
    const values = await importForm.validateFields();
    try {
      const res = await foundationService.sensitive.import(values);
      message.success(`导入 ${res?.imported ?? 0} 条`);
      setImportOpen(false);
      loadWords();
    } catch {
      message.error('导入失败');
    }
  };

  /** 试检测文本 */
  const doCheck = async () => {
    try {
      const res = await foundationService.sensitive.check(checkText);
      setCheckResult(res);
    } catch {
      message.error('检测失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        敏感词管理
      </Typography.Title>
      <Paragraph type="secondary">
        L1 本地词库（AC 自动机）+ L1.5 归一化（去空白/全半角/谐音）与正则（手机号等）。不走 BM25/向量，不消耗大模型 tokens。
      </Paragraph>

      <Tabs
        items={[
          {
            key: 'words',
            label: '词库 L1',
            children: (
              <Card>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    allowClear
                    placeholder="搜索词条"
                    prefix={<SearchOutlined />}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onPressEnter={() => {
                      setPage(1);
                      loadWords();
                    }}
                    style={{ width: 200 }}
                  />
                  <Select
                    allowClear
                    placeholder="分类"
                    style={{ width: 140 }}
                    value={category}
                    onChange={(v) => {
                      setCategory(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'spam', label: '营销 spam' },
                      { value: 'abuse', label: '辱骂 abuse' },
                      { value: 'porn', label: '色情 porn' },
                      { value: 'gambling', label: '赌博 gambling' },
                      { value: 'ad', label: '广告 ad' },
                      { value: 'privacy', label: '隐私 privacy' },
                      { value: 'custom', label: '自定义' },
                    ]}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    新增
                  </Button>
                  <Button onClick={() => setImportOpen(true)}>批量导入</Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={async () => {
                      await foundationService.sensitive.reload();
                      message.success('引擎已重载');
                      loadWords();
                    }}
                  >
                    重载引擎
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={words}
                  pagination={{
                    current: page,
                    total,
                    pageSize: 20,
                    onChange: setPage,
                  }}
                  columns={[
                    { title: '词条', dataIndex: 'word' },
                    {
                      title: '分类',
                      dataIndex: 'category',
                      render: (v) => <Tag>{v}</Tag>,
                    },
                    {
                      title: '策略',
                      dataIndex: 'action',
                      render: (v) => (
                        <Tag color={v === 'block' ? 'red' : v === 'replace' ? 'orange' : 'blue'}>
                          {v}
                        </Tag>
                      ),
                    },
                    { title: '替换为', dataIndex: 'replaceTo' },
                    {
                      title: '启用',
                      dataIndex: 'enabled',
                      render: (v) => (v === 1 ? '是' : '否'),
                    },
                    {
                      title: '操作',
                      render: (_, row) => (
                        <Space>
                          <Button type="link" onClick={() => openEdit(row)}>
                            编辑
                          </Button>
                          <Popconfirm
                            title="确认删除？"
                            onConfirm={async () => {
                              await foundationService.sensitive.delete(row.id!);
                              message.success('已删除');
                              loadWords();
                            }}
                          >
                            <Button type="link" danger>
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'regex',
            label: '正则 L1.5',
            children: (
              <Card>
                <Form
                  form={regexForm}
                  layout="inline"
                  style={{ marginBottom: 16 }}
                  onFinish={async (v) => {
                    await foundationService.sensitive.saveRegex(v);
                    message.success('已保存');
                    regexForm.resetFields();
                    loadMeta();
                  }}
                >
                  <Form.Item name="name" rules={[{ required: true }]}>
                    <Input placeholder="名称" />
                  </Form.Item>
                  <Form.Item name="pattern" rules={[{ required: true }]}>
                    <Input placeholder="Java 正则" style={{ width: 280 }} />
                  </Form.Item>
                  <Form.Item name="category" initialValue="privacy">
                    <Input placeholder="分类" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name="action" initialValue="replace">
                    <Select
                      style={{ width: 110 }}
                      options={[
                        { value: 'block', label: '拦截' },
                        { value: 'replace', label: '替换' },
                        { value: 'audit', label: '审计' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="replaceTo">
                    <Input placeholder="替换文本" style={{ width: 120 }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    添加
                  </Button>
                </Form>
                <Table
                  rowKey="id"
                  dataSource={regexList}
                  pagination={false}
                  columns={[
                    { title: '名称', dataIndex: 'name' },
                    { title: '正则', dataIndex: 'pattern', ellipsis: true },
                    { title: '分类', dataIndex: 'category' },
                    { title: '策略', dataIndex: 'action' },
                    {
                      title: '操作',
                      render: (_, row) => (
                        <Popconfirm
                          title="删除？"
                          onConfirm={async () => {
                            await foundationService.sensitive.deleteRegex(row.id!);
                            loadMeta();
                          }}
                        >
                          <Button type="link" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'homo',
            label: '谐音映射',
            children: (
              <Card>
                <Form
                  form={homoForm}
                  layout="inline"
                  style={{ marginBottom: 16 }}
                  onFinish={async (v) => {
                    await foundationService.sensitive.saveHomophone(v);
                    message.success('已保存');
                    homoForm.resetFields();
                    loadMeta();
                  }}
                >
                  <Form.Item name="src" rules={[{ required: true }]}>
                    <Input placeholder="源" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name="dst" rules={[{ required: true }]}>
                    <Input placeholder="目标" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name="remark">
                    <Input placeholder="备注" style={{ width: 160 }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    添加
                  </Button>
                </Form>
                <Table
                  rowKey="id"
                  dataSource={homoList}
                  pagination={false}
                  columns={[
                    { title: '源', dataIndex: 'src' },
                    { title: '目标', dataIndex: 'dst' },
                    { title: '备注', dataIndex: 'remark' },
                    {
                      title: '操作',
                      render: (_, row) => (
                        <Popconfirm
                          title="删除？"
                          onConfirm={async () => {
                            await foundationService.sensitive.deleteHomophone(row.id!);
                            loadMeta();
                          }}
                        >
                          <Button type="link" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'check',
            label: '试检测',
            children: (
              <Card>
                <TextArea
                  rows={5}
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  placeholder="输入待检测文本，例如：加微♥信 免费领取 13800138000"
                />
                <Button type="primary" style={{ marginTop: 12 }} onClick={doCheck}>
                  检测
                </Button>
                {checkResult && (
                  <div style={{ marginTop: 16 }}>
                    <Space>
                      <Tag color={checkResult.blocked ? 'red' : 'green'}>
                        {checkResult.blocked ? '应拦截' : '不拦截'}
                      </Tag>
                      <Tag>{checkResult.hit ? '有命中' : '无命中'}</Tag>
                    </Space>
                    <Paragraph style={{ marginTop: 8 }}>
                      处理后：{checkResult.filteredText}
                    </Paragraph>
                    <Table
                      size="small"
                      rowKey={(_, i) => String(i)}
                      dataSource={checkResult.hits}
                      pagination={false}
                      columns={[
                        { title: '类型', dataIndex: 'type' },
                        { title: '内容', dataIndex: 'word' },
                        { title: '分类', dataIndex: 'category' },
                        { title: '策略', dataIndex: 'action' },
                      ]}
                    />
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑敏感词' : '新增敏感词'}
        open={wordModal}
        onOk={saveWord}
        onCancel={() => setWordModal(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="word" label="词条" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select
              options={[
                { value: 'spam', label: '营销' },
                { value: 'abuse', label: '辱骂' },
                { value: 'porn', label: '色情' },
                { value: 'gambling', label: '赌博' },
                { value: 'ad', label: '广告' },
                { value: 'privacy', label: '隐私' },
                { value: 'custom', label: '自定义' },
              ]}
            />
          </Form.Item>
          <Form.Item name="action" label="策略">
            <Select
              options={[
                { value: 'block', label: '拦截' },
                { value: 'replace', label: '替换' },
                { value: 'audit', label: '仅审计' },
              ]}
            />
          </Form.Item>
          <Form.Item name="replaceTo" label="替换为">
            <Input />
          </Form.Item>
          <Form.Item name="enabled" label="启用">
            <Select
              options={[
                { value: 1, label: '是' },
                { value: 0, label: '否' },
              ]}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入（每行一词，# 开头为注释）"
        open={importOpen}
        onOk={doImport}
        onCancel={() => setImportOpen(false)}
      >
        <Form form={importForm} layout="vertical" initialValues={{ category: 'custom', action: 'block' }}>
          <Form.Item name="text" rules={[{ required: true }]}>
            <TextArea rows={10} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input />
          </Form.Item>
          <Form.Item name="action" label="策略">
            <Select
              options={[
                { value: 'block', label: '拦截' },
                { value: 'replace', label: '替换' },
                { value: 'audit', label: '审计' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SensitiveWordsPage;
