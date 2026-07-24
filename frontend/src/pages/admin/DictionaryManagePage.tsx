/**
 * 管理后台页面：DictionaryManagePage。
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
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
  Empty,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  BookOutlined,
  FormatPainterOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { foundationService } from '@/services';
import type { Dict, DictData } from '@/services/foundation.service';
import type { EntityId } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

export const DictionaryManagePage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [dicts, setDicts] = useState<Dict[]>([]);
  const [selectedDict, setSelectedDict] = useState<Dict | null>(null);
  const [dictDataList, setDictDataList] = useState<DictData[]>([]);
  const [dictSearchValue, setDictSearchValue] = useState('');
  const [dataSearchValue, setDataSearchValue] = useState('');
  const [isDictModalVisible, setIsDictModalVisible] = useState(false);
  const [isDataModalVisible, setIsDataModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState<Dict | null>(null);
  const [editingData, setEditingData] = useState<DictData | null>(null);
  const [dictForm] = Form.useForm();
  const [dataForm] = Form.useForm();

  useEffect(() => {
    fetchDicts();
    // 字典列表只在页面首次挂载时加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * fetchDicts。
   */
  const fetchDicts = async () => {
    setLoading(true);
    try {
      const response = await foundationService.dict.list({
        current: 1,
        size: 100,
      });
      setDicts(response.list ?? (response as { records?: Dict[] }).records ?? []);
    } catch (error) {
      message.error('获取字典类型失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * fetchDictData。
   */
  const fetchDictData = async (dict: Dict) => {
    try {
      const data = await foundationService.dict.getData(dict.dictCode);
      setDictDataList(data);
      setSelectedDict(dict);
    } catch (error) {
      message.error('获取字典数据失败');
    }
  };

  const handleAddDict = () => {
    setEditingDict(null);
    dictForm.resetFields();
    dictForm.setFieldsValue({
      status: 1,
      sort: 0,
    });
    setIsDictModalVisible(true);
  };

  /**
   * handleEditDict。
   */
  const handleEditDict = (dict: Dict) => {
    setEditingDict(dict);
    dictForm.setFieldsValue({
      dictCode: dict.dictCode,
      dictName: dict.dictName,
      dictType: dict.dictType,
      description: dict.description,
      sort: dict.sort,
      status: dict.status,
    });
    setIsDictModalVisible(true);
  };

  /**
   * handleDeleteDict。
   */
  const handleDeleteDict = async (dictCode: string) => {
    try {
      await foundationService.dict.delete(dictCode);
      message.success('删除成功');
      if (selectedDict?.dictCode === dictCode) {
        setSelectedDict(null);
        setDictDataList([]);
      }
      fetchDicts();
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * handleDictModalOk。
   */
  const handleDictModalOk = async () => {
    try {
      const values = await dictForm.validateFields();

      if (editingDict) {
        await foundationService.dict.update(editingDict.dictCode, values);
        message.success('更新成功');
      } else {
        await foundationService.dict.create(values);
        message.success('创建成功');
      }

      setIsDictModalVisible(false);
      dictForm.resetFields();
      fetchDicts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleAddData = () => {
    if (!selectedDict) {
      message.warning('请先选择字典类型');
      return;
    }
    setEditingData(null);
    dataForm.resetFields();
    dataForm.setFieldsValue({
      dictSort: dictDataList.length > 0 ? Math.max(...dictDataList.map(d => d.dictSort)) + 1 : 0,
      status: 1,
      isDefault: 0,
    });
    setIsDataModalVisible(true);
  };

  const handleEditData = (data: DictData) => {
    setEditingData(data);
    dataForm.setFieldsValue({
      dictLabel: data.dictLabel,
      dictValue: data.dictValue,
      dictSort: data.dictSort,
      cssClass: data.cssClass,
      listClass: data.listClass,
      isDefault: data.isDefault,
      status: data.status,
    });
    setIsDataModalVisible(true);
  };

  /**
   * handleDeleteData。
   */
  const handleDeleteData = async (id: EntityId) => {
    if (!selectedDict) return;

    try {
      await foundationService.dict.deleteData(selectedDict.dictCode, id);
      message.success('删除成功');
      fetchDictData(selectedDict);
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * handleDataModalOk。
   */
  const handleDataModalOk = async () => {
    if (!selectedDict) return;

    try {
      const values = await dataForm.validateFields();

      if (editingData) {
        await foundationService.dict.updateData(selectedDict.dictCode, {
          ...values,
          id: editingData.id,
        });
        message.success('更新成功');
      } else {
        await foundationService.dict.addData(selectedDict.dictCode, values);
        message.success('添加成功');
      }

      setIsDataModalVisible(false);
      dataForm.resetFields();
      fetchDictData(selectedDict);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const filteredDicts = (dicts ?? []).filter(
    (dict) =>
      dict.dictName.toLowerCase().includes(dictSearchValue.toLowerCase()) ||
      dict.dictCode.toLowerCase().includes(dictSearchValue.toLowerCase()) ||
      dict.dictType.toLowerCase().includes(dictSearchValue.toLowerCase())
  );

  const filteredData = (dictDataList ?? []).filter(
    (data) =>
      data.dictLabel.toLowerCase().includes(dataSearchValue.toLowerCase()) ||
      data.dictValue.toLowerCase().includes(dataSearchValue.toLowerCase())
  );

  const getListClassColor = (listClass?: string) => {
    if (!listClass) return 'default';
    const colorMap: Record<string, string> = {
      default: 'default',
      primary: 'blue',
      success: 'green',
      info: 'cyan',
      warning: 'orange',
      danger: 'red',
    };
    return colorMap[listClass] || 'default';
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <BookOutlined />
            <span>字典管理</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Row gutter={16}>
          {/* 左侧：字典类型列表 */}
          <Col xs={24} lg={8}>
            <Card
              size="small"
              title="字典类型"
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={fetchDicts}
                  >
                    刷新
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddDict}
                  >
                    新增
                  </Button>
                </Space>
              }
            >
              <Search
                placeholder="搜索字典类型"
                allowClear
                style={{ marginBottom: 16 }}
                onChange={(e) => setDictSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
              />

              <List
                loading={loading}
                dataSource={filteredDicts}
                renderItem={(dict) => (
                  <List.Item
                    key={dict.id}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background:
                        selectedDict?.id === dict.id ? '#e6f7ff' : 'transparent',
                      border:
                        selectedDict?.id === dict.id
                          ? '1px solid #1890ff'
                          : '1px solid transparent',
                      marginBottom: 8,
                    }}
                    onClick={() => fetchDictData(dict)}
                  >
                    <List.Item.Meta
                      avatar={<FormatPainterOutlined style={{ fontSize: 20 }} />}
                      title={
                        <Space>
                          <Text strong>{dict.dictName}</Text>
                          <Tag color={dict.status === 1 ? 'green' : 'red'}>
                            {dict.status === 1 ? '启用' : '停用'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dict.dictCode}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dict.dictType} · 排序: {dict.sort}
                          </Text>
                        </div>
                      }
                    />
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDict(dict);
                        }}
                      />
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除该字典类型吗？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteDict(dict.dictCode);
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 右侧：字典数据列表 */}
          <Col xs={24} lg={16}>
            <Card
              size="small"
              title={
                <Space>
                  <span>字典数据</span>
                  {selectedDict && (
                    <Tag color="blue">{selectedDict.dictName}</Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    disabled={!selectedDict}
                    onClick={() => selectedDict && fetchDictData(selectedDict)}
                  >
                    刷新
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedDict}
                    onClick={handleAddData}
                  >
                    新增
                  </Button>
                </Space>
              }
            >
              {!selectedDict ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请选择左侧字典类型"
                  style={{ padding: '60px 0' }}
                />
              ) : (
                <>
                  <Search
                    placeholder="搜索字典数据"
                    allowClear
                    style={{ marginBottom: 16 }}
                    onChange={(e) => setDataSearchValue(e.target.value)}
                    prefix={<SearchOutlined />}
                  />

                  <List
                    loading={loading}
                    dataSource={filteredData}
                    renderItem={(data) => (
                      <List.Item
                        key={data.id}
                        style={{
                          padding: '12px',
                          borderRadius: 8,
                          background: '#fafafa',
                          marginBottom: 8,
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Space direction="vertical" style={{ textAlign: 'center' }}>
                              <DragOutlined style={{ color: '#999', cursor: 'move' }} />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {data.dictSort}
                              </Text>
                            </Space>
                          }
                          title={
                            <Space>
                              <Text strong>{data.dictLabel}</Text>
                              <Tag color={getListClassColor(data.listClass)}>
                                {data.dictValue}
                              </Tag>
                              {data.isDefault === 1 && (
                                <Tag color="orange">默认</Tag>
                              )}
                              <Tag color={data.status === 1 ? 'green' : 'red'}>
                                {data.status === 1 ? '启用' : '停用'}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space>
                              {data.cssClass && (
                                <Text code style={{ fontSize: 12 }}>
                                  CSS: {data.cssClass}
                                </Text>
                              )}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                创建于 {dayjs(data.createdAt).format('YYYY-MM-DD')}
                              </Text>
                            </Space>
                          }
                        />
                        <Space>
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditData(data)}
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="确认删除"
                            description="确定要删除该字典数据吗？"
                            onConfirm={() => handleDeleteData(data.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      </List.Item>
                    )}
                  />
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 新增/编辑字典类型弹窗 */}
      <Modal
        title={editingDict ? '编辑字典类型' : '新增字典类型'}
        open={isDictModalVisible}
        onOk={handleDictModalOk}
        onCancel={() => {
          setIsDictModalVisible(false);
          dictForm.resetFields();
        }}
        width={600}
        destroyOnHidden
      >
        <Form form={dictForm} layout="vertical" preserve={false}>
          <Form.Item
            label="字典名称"
            name="dictName"
            rules={[{ required: true, message: '请输入字典名称' }]}
          >
            <Input placeholder="例如: 用户状态" />
          </Form.Item>

          <Form.Item
            label="字典编码"
            name="dictCode"
            rules={[{ required: true, message: '请输入字典编码' }]}
          >
            <Input placeholder="例如: user_status" disabled={!!editingDict} />
          </Form.Item>

          <Form.Item
            label="字典类型"
            name="dictType"
            rules={[{ required: true, message: '请输入字典类型' }]}
          >
            <Input placeholder="例如: sys_user_status" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="请输入字典描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="排序"
                name="sort"
                rules={[{ required: true, message: '请输入排序' }]}
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Option value={1}>启用</Option>
                  <Option value={0}>停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 新增/编辑字典数据弹窗 */}
      <Modal
        title={editingData ? '编辑字典数据' : '新增字典数据'}
        open={isDataModalVisible}
        onOk={handleDataModalOk}
        onCancel={() => {
          setIsDataModalVisible(false);
          dataForm.resetFields();
        }}
        width={600}
        destroyOnHidden
      >
        <Form form={dataForm} layout="vertical" preserve={false}>
          <Form.Item
            label="数据标签"
            name="dictLabel"
            rules={[{ required: true, message: '请输入数据标签' }]}
          >
            <Input placeholder="例如: 正常" />
          </Form.Item>

          <Form.Item
            label="数据值"
            name="dictValue"
            rules={[{ required: true, message: '请输入数据值' }]}
          >
            <Input placeholder="例如: 1" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="排序"
                name="dictSort"
                rules={[{ required: true, message: '请输入排序' }]}
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="是否默认"
                name="isDefault"
                rules={[{ required: true, message: '请选择是否默认' }]}
              >
                <Select>
                  <Option value={0}>否</Option>
                  <Option value={1}>是</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="CSS类名"
                name="cssClass"
              >
                <Input placeholder="例如: text-success" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="列表样式"
                name="listClass"
              >
                <Select placeholder="请选择">
                  <Option value="default">默认</Option>
                  <Option value="primary">主要</Option>
                  <Option value="success">成功</Option>
                  <Option value="info">信息</Option>
                  <Option value="warning">警告</Option>
                  <Option value="danger">危险</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryManagePage;
