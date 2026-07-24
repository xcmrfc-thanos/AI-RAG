/**
 * 管理后台页面：CategoriesPage。
 */
import React, { useState, useEffect } from 'react';
import {
  Tree,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Card,
  Space,
  Popconfirm,
  Row,
  Col,
  Typography,
  Tag,
  Tooltip,
  Divider,
  Select,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  FolderAddOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { CategoryTree } from '@/types';
import { categoryService } from '@/services';
import CategoryIcon from '@/components/common/CategoryIcon';
import { useAuthStore } from '@/stores';
import { PERMISSIONS, hasPermission } from '@/utils/permission';
import { AdminPageHeader } from '@/components/common';
import './AdminPages.css';

const { Title, Text } = Typography;
const { Search } = Input;

interface ExtendedDataNode extends DataNode {
  data?: CategoryTree;
  children?: ExtendedDataNode[];
}

export const CategoriesPage: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const canManageCategories = hasPermission(user, PERMISSIONS.documentCategory);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [treeData, setTreeData] = useState<ExtendedDataNode[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryTree | null>(null);
  const [parentCategory, setParentCategory] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
    // 分类加载只在管理页首次挂载时执行。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    buildTreeData();
    // 树结构只由 categories 变化驱动，构建函数身份不参与刷新判定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  /**
   * fetchCategories。
   */
  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategoryTree();
      setCategories(data);
    } catch (error) {
      message.error('获取分类列表失败');
    }
  };

  const buildTreeData = () => {
    const buildNode = (parentId: string = '0'): ExtendedDataNode[] => {
      return categories
        .filter((cat) => cat.parentId === parentId)
        .sort((a, b) => (a.sortOrder ?? a.sort ?? 0) - (b.sortOrder ?? b.sort ?? 0))
        .map((cat) => ({
          key: cat.id,
          title: cat.name,
          children: buildNode(cat.id),
          data: cat,
        }));
    };

    setTreeData(buildNode());
  };

  const handleAdd = (parentId: string = '0') => {
    setEditingCategory(null);
    setParentCategory(parentId);
    form.resetFields();
    setIsModalVisible(true);
  };

  /**
   * handleEdit。
   */
  const handleEdit = (category: CategoryTree) => {
    setEditingCategory(category);
    setParentCategory(category.parentId || '0');
    form.setFieldsValue(category);
    setIsModalVisible(true);
  };

  /**
   * handleDelete。
   */
  const handleDelete = async (categoryId: string) => {
    try {
      // 检查是否有子分类
      const hasChildren = categories.some((cat) => cat.parentId === categoryId);
      if (hasChildren) {
        message.warning('该分类下有子分类，无法删除');
        return;
      }

      // 调用删除API
      setCategories(categories.filter((cat) => cat.id !== categoryId));
      message.success('删除成功');
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

      if (editingCategory) {
        // 更新分类
        setCategories(
          categories.map((cat) =>
            cat.id === editingCategory.id ? { ...cat, ...values } : cat
          )
        );
        message.success('更新成功');
      } else {
        // 创建分类
        const newCategory: CategoryTree = {
          id: Date.now().toString(),
          ...values,
          parentId: parentCategory,
          sort: categories.filter((cat) => cat.parentId === parentCategory).length + 1,
          documentCount: 0,
        };
        setCategories([...categories, newCategory]);
        message.success('创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDrop: TreeProps['onDrop'] = (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    // 处理拖拽排序逻辑
    const dragIndex = categories.findIndex((cat) => cat.id === dragKey);
    const dragItem = categories[dragIndex];

    const newCategories = [...categories];
    newCategories.splice(dragIndex, 1);

    if (dropPosition === 0) {
      // 放置在目标节点内部作为子节点
      dragItem.parentId = dropKey;
    } else {
      // 放置在目标节点的兄弟位置
      dragItem.parentId = '0';
    }

    newCategories.splice(dragIndex, 0, dragItem);
    setCategories(newCategories);
  };

  const getTreeIcon = ({ expanded }: { expanded?: boolean }) => {
    return expanded ? <FolderOpenOutlined /> : <FolderOutlined />;
  };

  return (
    <div style={{ padding: '8px 8px', background: '#f8fafc', minHeight: '100vh' }}>
      <AdminPageHeader
        title="分类管理"
        description="管理文档分类结构和层级关系"
        extra={
          canManageCategories ? (
            <Button type="primary" icon={<FolderAddOutlined />} onClick={() => handleAdd()}>
              新建分类
            </Button>
          ) : undefined
        }
      />

      <Row gutter={24}>
        {/* 左侧分类树 */}
        <Col span={10}>
          <Card
            title="分类树"
            extra={
              <Space>
                <Text type="secondary">共 {categories.length} 个分类</Text>
              </Space>
            }
            style={{ borderRadius: 12, height: 'fit-content' }}
            styles={{ body: { padding: 16 } }}
          >
            <Search
              placeholder="搜索分类"
              prefix={<SearchOutlined />}
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                拖拽分类可调整排序和层级
              </Text>
            </div>
            <Tree
              className="category-tree"
              treeData={treeData}
              icon={getTreeIcon}
              showLine
              draggable
              blockNode
              onDrop={handleDrop}
              selectedKeys={selectedCategory ? [selectedCategory] : []}
              onSelect={(keys) => setSelectedCategory(keys[0] as string)}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              titleRender={(nodeData: ExtendedDataNode) => {
                const category = nodeData.data as CategoryTree;
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      width: '100%',
                    }}
                  >
                    <CategoryIcon icon={category.icon} variant="sidebar" />
                    <span style={{ flex: 1 }}>{category.name}</span>
                    <Tag color="blue" style={{ margin: 0 }}>
                      {category.documentCount ?? 0}
                    </Tag>
                    {canManageCategories && (
                      <Space className="category-actions" size="small">
                        <Tooltip title="添加子分类">
                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdd(category.id);
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="编辑">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(category);
                            }}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定删除该分类吗？"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDelete(category.id);
                          }}
                          onCancel={(e) => e?.stopPropagation()}
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
                    )}
                  </div>
                );
              }}
            />
          </Card>
        </Col>

        {/* 右侧分类详情 */}
        <Col span={14}>
          <Card
            title={
              <Space>
                <FolderOutlined style={{ color: '#2563eb' }} />
                <Text strong>分类详情</Text>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {!selectedCategory ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <FolderOutlined style={{ fontSize: 64, color: '#e2e8f0', marginBottom: 16 }} />
                <Title level={4} type="secondary">
                  选择左侧分类查看详情
                </Title>
                <Text type="secondary">点击分类树中的项目可以查看和编辑详细信息</Text>
              </div>
            ) : (
              <div>
                {(() => {
                  const category = categories.find(c => c.id === selectedCategory);
                  if (!category) return null;
                  return (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col span={24}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <CategoryIcon icon={category.icon || undefined} variant="avatar" size={56} />
                            <div>
                              <Title level={4} style={{ margin: 0 }}>{category.name}</Title>
                              <Text type="secondary">ID: {category.id}</Text>
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="分类名称" style={{ marginBottom: 12 }}>
                            <Input value={category.name} disabled />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="排序" style={{ marginBottom: 12 }}>
                            <InputNumber value={category.sortOrder ?? category.sort ?? 1} disabled style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item label="分类描述" style={{ marginBottom: 12 }}>
                            <Input.TextArea value={category.description || '暂无描述'} rows={3} disabled />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="文档数量" style={{ marginBottom: 12 }}>
                            <InputNumber value={category.documentCount ?? 0} disabled style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="层级" style={{ marginBottom: 12 }}>
                            <InputNumber value={category.level ?? 1} disabled style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Divider />
                      {canManageCategories && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <Button
                            type="primary"
                            onClick={() => handleEdit(category)}
                          >
                            编辑分类
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text type="secondary">
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  分类变更会影响文档的归类
                </Text>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingCategory ? '编辑分类' : '新建分类'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item
            label="分类描述"
            name="description"
          >
            <Input.TextArea
              placeholder="请输入分类描述"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            label="图标"
            name="icon"
            initialValue="tech"
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { key: 'tech', label: '技术' },
                { key: 'product', label: '产品' },
                { key: 'business', label: '业务' },
                { key: 'hr', label: '人力' },
                { key: 'finance', label: '财务' },
                { key: 'marketing', label: '市场' },
                { key: 'legal', label: '合规' },
                { key: 'training', label: '培训' },
                { key: 'backend', label: '后端' },
                { key: 'frontend', label: '前端' },
                { key: 'database', label: '数据库' },
                { key: 'devops', label: 'DevOps' },
                { key: 'architecture', label: '架构' },
                { key: 'requirement', label: '需求' },
                { key: 'design', label: 'UI设计' },
                { key: 'planning', label: '规划' },
                { key: 'competitive', label: '竞品' },
              ] as const).map(({ key, label }) => {
                const currentIcon = form.getFieldValue('icon');
                const isSelected = currentIcon === key;
                return (
                  <div
                    key={key}
                    onClick={() => form.setFieldValue('icon', key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '6px 10px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#3b82f6' : 'var(--border-color)'}`,
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                    title={label}
                  >
                    <CategoryIcon icon={key} variant="sidebar" />
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </Form.Item>

          <Form.Item
            label="父级分类"
            name="parentId"
          >
            <Select
              placeholder="选择父级分类"
              allowClear
              options={categories.map(cat => ({
                label: cat.name,
                value: cat.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort"
            initialValue={1}
          >
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .category-tree .ant-tree-node-content-wrapper {
          border-radius: 8px;
          padding: 4px 8px;
          margin: 2px 0;
          transition: all 0.2s;
        }
        .category-tree .ant-tree-node-content-wrapper:hover {
          background-color: #f1f5f9;
        }
        .category-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
          background-color: rgba(37, 99, 235, 0.1);
        }
        .category-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ant-tree-node-content-wrapper:hover .category-actions {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default CategoriesPage;
