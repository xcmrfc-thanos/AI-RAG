import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tree,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { ColumnsType } from 'antd/es/table';
import permissionService, { PermissionTreeNode, PermissionVO } from '@/services/permission.service';
import { EmptyState, PageLoading, AdminPageHeader } from '@/components/common';
import { useAuthStore } from '@/stores';
import { PERMISSIONS, hasPermission } from '@/utils/permission';

const { Text } = Typography;

type PermissionFormType = 'menu' | 'button' | 'api';
type ResourceFilterType = 'all' | 'menu' | 'button' | 'api';

const normalizeId = (value?: string | number | bigint | null) => String(value ?? '');

const isMenuType = (type?: string) => type === '1' || type === 'menu';

const getPermissionTypeName = (type?: string): string => {
  const typeMap: Record<string, string> = {
    '1': '菜单',
    '2': '按钮权限',
    '3': '接口权限',
    menu: '菜单',
    button: '按钮权限',
    api: '接口权限',
  };
  return typeMap[type || ''] || '其他';
};

const getPermissionTypeColor = (type?: string) => {
  if (type === '2' || type === 'button') {
    return 'orange';
  }
  if (type === '3' || type === 'api') {
    return 'purple';
  }
  return 'green';
};

const getPermissionIcon = (type?: string) => {
  if (type === '2' || type === 'button') {
    return <KeyOutlined style={{ color: '#f59e0b' }} />;
  }
  if (type === '3' || type === 'api') {
    return <ApiOutlined style={{ color: '#7c3aed' }} />;
  }
  return <FolderOutlined style={{ color: '#2563eb' }} />;
};

const extractMenuNodes = (nodes: PermissionTreeNode[] = []): PermissionTreeNode[] =>
  nodes.flatMap((node) => {
    if (!isMenuType(node.type)) {
      return [];
    }
    return [
      {
        ...node,
        children: extractMenuNodes(node.children || []),
      },
    ];
  });

const filterMenuNodes = (nodes: PermissionTreeNode[], keyword: string): PermissionTreeNode[] => {
  if (!keyword.trim()) {
    return nodes;
  }
  const normalizedKeyword = keyword.trim().toLowerCase();
  return nodes.reduce<PermissionTreeNode[]>((acc, node) => {
    const children = filterMenuNodes(node.children || [], keyword);
    const matched = [node.name, node.code]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword));

    if (matched || children.length > 0) {
      acc.push({
        ...node,
        children,
      });
    }
    return acc;
  }, []);
};

const buildMenuTreeData = (nodes: PermissionTreeNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: normalizeId(node.id),
    title: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FolderOutlined style={{ color: '#2563eb' }} />
        <span>{node.name}</span>
      </span>
    ),
    children: buildMenuTreeData(node.children || []),
  }));

const findNodeById = (nodes: PermissionTreeNode[], targetId?: string | number | null): PermissionTreeNode | null => {
  const normalizedTargetId = normalizeId(targetId);
  if (!normalizedTargetId) {
    return null;
  }

  for (const node of nodes) {
    if (normalizeId(node.id) === normalizedTargetId) {
      return node;
    }
    const child = findNodeById(node.children || [], targetId);
    if (child) {
      return child;
    }
  }
  return null;
};

const findNodePath = (nodes: PermissionTreeNode[], targetId?: string | number | null): PermissionTreeNode[] => {
  const normalizedTargetId = normalizeId(targetId);
  if (!normalizedTargetId) {
    return [];
  }

  for (const node of nodes) {
    if (normalizeId(node.id) === normalizedTargetId) {
      return [node];
    }
    const childPath = findNodePath(node.children || [], targetId);
    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }
  return [];
};

const collectMenuKeys = (nodes: PermissionTreeNode[]): string[] =>
  nodes.flatMap((node) => [normalizeId(node.id), ...collectMenuKeys(node.children || [])]);

const buildParentPermissionOptions = (
  nodes: PermissionTreeNode[],
  level = 0,
): Array<{ label: string; value: string }> =>
  nodes.flatMap((node) => {
    const current = {
      label: `${'　'.repeat(level)}${node.name}`,
      value: normalizeId(node.id),
    };
    return [current, ...buildParentPermissionOptions(node.children || [], level + 1)];
  });

const PermissionsPage: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const canCreatePermission = hasPermission(user, PERMISSIONS.systemPermission)
    || hasPermission(user, PERMISSIONS.systemPermissionCreate);
  const canEditPermission = hasPermission(user, PERMISSIONS.systemPermission)
    || hasPermission(user, PERMISSIONS.systemPermissionEdit);
  const canDeletePermission = hasPermission(user, PERMISSIONS.systemPermission)
    || hasPermission(user, PERMISSIONS.systemPermissionDelete);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [currentMenu, setCurrentMenu] = useState<PermissionVO | null>(null);
  const [currentResources, setCurrentResources] = useState<PermissionVO[]>([]);
  const [menuSearchText, setMenuSearchText] = useState('');
  const [resourceSearchText, setResourceSearchText] = useState('');
  const [resourceFilterType, setResourceFilterType] = useState<ResourceFilterType>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionVO | null>(null);
  const [previewPermission, setPreviewPermission] = useState<PermissionVO | null>(null);
  const [form] = Form.useForm();
  const permissionType = Form.useWatch<PermissionFormType>('type', form) || 'menu';

  const menuTree = useMemo(() => extractMenuNodes(permissionTree), [permissionTree]);
  const filteredMenuTree = useMemo(
    () => filterMenuNodes(menuTree, menuSearchText),
    [menuTree, menuSearchText]
  );
  const parentPermissionOptions = useMemo(
    () => [{ label: '顶级菜单', value: '0' }, ...buildParentPermissionOptions(menuTree)],
    [menuTree]
  );
  const selectedMenuPath = useMemo(
    () => findNodePath(menuTree, selectedMenuId),
    [menuTree, selectedMenuId]
  );
  const selectedMenuPathText = useMemo(() => {
    if (selectedMenuPath.length <= 1) {
      return '';
    }
    return selectedMenuPath.map((item) => item.name).join(' / ');
  }, [selectedMenuPath]);

  const filteredResources = useMemo(() => {
    const normalizedKeyword = resourceSearchText.trim().toLowerCase();
    return currentResources.filter((permission) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [permission.name, permission.code, permission.menuUrl, permission.apiUrl]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword));

      if (!matchesKeyword) {
        return false;
      }

      if (resourceFilterType === 'all') {
        return true;
      }
      if (resourceFilterType === 'menu') {
        return isMenuType(permission.type);
      }
      return permission.type === resourceFilterType || permission.type === (resourceFilterType === 'button' ? '2' : '3');
    });
  }, [currentResources, resourceSearchText, resourceFilterType]);

  const childMenuCount = useMemo(
    () => currentResources.filter((permission) => isMenuType(permission.type)).length,
    [currentResources]
  );
  const childPointCount = useMemo(
    () => currentResources.filter((permission) => !isMenuType(permission.type)).length,
    [currentResources]
  );

  const syncPageData = async (preferredSelectedMenuId?: string | null) => {
    setLoading(true);
    setTreeLoading(true);
    try {
      const treeResult = await permissionService.getPermissionTree({ skipErrorToast: true });
      const nextTree = treeResult || [];
      const nextMenuTree = extractMenuNodes(nextTree);
      const fallbackMenuId = normalizeId(nextMenuTree[0]?.id);
      const targetMenuId = normalizeId(preferredSelectedMenuId || selectedMenuId);
      const nextSelectedMenuId = findNodeById(nextMenuTree, targetMenuId)
        ? targetMenuId
        : fallbackMenuId;

      setPermissionTree(nextTree);
      setSelectedMenuId(nextSelectedMenuId);
      setExpandedKeys(Array.from(new Set(collectMenuKeys(nextMenuTree))));
    } catch (error) {
      message.error('获取权限数据失败');
    } finally {
      setLoading(false);
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    syncPageData();
    // 权限准源只在页面首次挂载时同步。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadCurrentMenuData = async () => {
      if (!selectedMenuId) {
        setCurrentMenu(null);
        setCurrentResources([]);
        return;
      }

      setLoading(true);
      try {
        const [menuDetail, childResources] = await Promise.all([
          permissionService.getPermissionById(selectedMenuId, { skipErrorToast: true }),
          permissionService.getPermissionsByParentId(selectedMenuId, { skipErrorToast: true }),
        ]);
        setCurrentMenu(menuDetail || null);
        setCurrentResources(childResources || []);
      } catch (error) {
        setCurrentMenu(null);
        setCurrentResources([]);
        message.error('获取菜单资源失败');
      } finally {
        setLoading(false);
      }
    };

    loadCurrentMenuData();
  }, [selectedMenuId, message]);

  const openPermissionModal = (type: PermissionFormType, parentId: string) => {
    setEditingPermission(null);
    form.resetFields();
    form.setFieldsValue({
      type,
      parentId,
      sortOrder: 0,
      status: 1,
    });
    setIsModalVisible(true);
  };

  const handleCreateTopMenu = () => openPermissionModal('menu', '0');

  const handleCreateChildMenu = () => openPermissionModal('menu', selectedMenuId || '0');

  const handleCreatePermissionPoint = () => {
    if (!selectedMenuId) {
      message.warning('请先在左侧菜单树中选择一个菜单');
      return;
    }
    openPermissionModal('button', selectedMenuId);
  };

  const handleEditCurrentMenu = () => {
    if (!currentMenu) {
      message.warning('请先在左侧菜单树中选择一个菜单');
      return;
    }
    handleEditPermission(currentMenu);
  };

  const handleEditPermission = (permission: PermissionVO) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      name: permission.name,
      code: permission.code,
      type: permission.type,
      parentId: normalizeId(permission.parentId || 0),
      menuUrl: permission.menuUrl,
      apiUrl: permission.apiUrl,
      method: permission.method,
      description: permission.description,
      sortOrder: permission.sortOrder,
      status: permission.status,
    });
    setIsModalVisible(true);
  };

  const handleDeletePermission = async (permission: PermissionVO) => {
    try {
      await permissionService.deletePermission(normalizeId(permission.id));
      message.success(isMenuType(permission.type) ? '删除菜单成功' : '删除权限成功');
      const nextSelectedId = normalizeId(permission.id) === selectedMenuId
        ? normalizeId(permission.parentId)
        : selectedMenuId;
      syncPageData(nextSelectedId === '0' ? null : nextSelectedId);
    } catch (error) {
      message.error(isMenuType(permission.type) ? '删除菜单失败' : '删除权限失败');
    }
  };

  const handleSavePermission = async () => {
    try {
      const values = await form.validateFields();
      if (editingPermission) {
        await permissionService.updatePermission({
          ...values,
          id: editingPermission.id,
        });
        message.success('更新成功');
      } else {
        await permissionService.createPermission(values);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      syncPageData(selectedMenuId || null);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(editingPermission ? '更新失败' : '创建失败');
    }
  };

  const handleSelectMenu = (keys: React.Key[]) => {
    const nextSelectedId = normalizeId(keys[0]);
    if (!nextSelectedId) {
      return;
    }
    setSelectedMenuId(nextSelectedId);
    setResourceFilterType('all');
    setResourceSearchText('');
  };

  const handleEnterMenu = (permission: PermissionVO) => {
    const nextMenuId = normalizeId(permission.id);
    const pathIds = findNodePath(menuTree, nextMenuId).map((item) => normalizeId(item.id));
    setExpandedKeys((prev) => Array.from(new Set([...prev, ...pathIds])));
    setSelectedMenuId(nextMenuId);
  };

  const getCreateModalTitle = (type: PermissionFormType) => {
    if (type === 'button') {
      return '新增按钮权限点';
    }
    if (type === 'api') {
      return '新增接口权限';
    }
    return '新增菜单';
  };

  const resourceColumns: ColumnsType<PermissionVO> = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      width: 196,
      ellipsis: true,
      render: (name: string, record) => (
        <Space align="start" size={10}>
          <span style={{ marginTop: 4 }}>{getPermissionIcon(record.type)}</span>
          <div style={{ minWidth: 0 }}>
            {isMenuType(record.type) ? (
              <Button
                type="link"
                style={{
                  padding: 0,
                  height: 'auto',
                  fontWeight: 600,
                  maxWidth: 130,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => handleEnterMenu(record)}
              >
                {name}
              </Button>
            ) : (
              <Text strong ellipsis style={{ display: 'block', maxWidth: 130 }}>
                {name}
              </Text>
            )}
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                maxWidth: 130,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {record.code}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 92,
      render: (type: string) => (
        <Tag color={getPermissionTypeColor(type)}>{getPermissionTypeName(type)}</Tag>
      ),
    },
    {
      title: '路径 / 接口',
      key: 'path',
      width: 150,
      ellipsis: true,
      render: (_: unknown, record) => record.menuUrl || record.apiUrl || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 68,
      render: (status?: number) => (
        <Tag color={status === 0 ? 'default' : 'success'}>
          {status === 0 ? '禁用' : '启用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      render: (_: unknown, record) => (
        <Space size={[4, 4]} wrap>
          {isMenuType(record.type) && (
            <Button type="text" size="small" onClick={() => handleEnterMenu(record)}>
              进入
            </Button>
          )}
          <Button
            type="text"
            size="small"
            onClick={() => setPreviewPermission(record)}
          >
            查看
          </Button>
          {canEditPermission && (
            <Button
              type="text"
              size="small"
              onClick={() => handleEditPermission(record)}
            >
              编辑
            </Button>
          )}
          {canDeletePermission && (
            <Popconfirm
              title={`确定要删除“${record.name}”吗？`}
              onConfirm={() => handleDeletePermission(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const menuTreeData = buildMenuTreeData(filteredMenuTree);
  const overviewCards = [
    { label: '当前菜单', value: currentMenu?.name || '-', color: '#2563eb' },
    { label: '子菜单数', value: String(childMenuCount), color: '#0f766e' },
    { label: '权限点数', value: String(childPointCount), color: '#7c3aed' },
    { label: '资源总数', value: String(currentResources.length), color: '#f59e0b' },
  ];

  return (
    <div style={{ padding: '0 4px 12px 0', marginTop: -4, marginLeft: -8, background: '#f8fafc', minHeight: '100vh' }}>
      <AdminPageHeader
        title="权限管理"
        description="采用菜单树导航和上下文资源联动，快速完成菜单、按钮权限和接口权限管理"
      />

      <Row gutter={16} align="top">
        <Col span={6}>
          <Card
            title="菜单树"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 14 } }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Input
                placeholder="搜索菜单名称或编码"
                prefix={<SearchOutlined />}
                value={menuSearchText}
                onChange={(event) => setMenuSearchText(event.target.value)}
              />
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 12 }}>
                <Text type="secondary">已加载 {collectMenuKeys(menuTree).length} 个菜单节点</Text>
              </div>
              <Spin spinning={treeLoading && menuTreeData.length > 0}>
                {treeLoading && menuTreeData.length === 0 ? (
                  <PageLoading style={{ padding: '120px 0', minHeight: 560 }} />
                ) : menuTreeData.length > 0 ? (
                  <Tree
                    selectedKeys={selectedMenuId ? [selectedMenuId] : []}
                    expandedKeys={expandedKeys}
                    onExpand={(keys) =>
                      setExpandedKeys(
                        keys.filter((key): key is string => typeof key === 'string')
                      )
                    }
                    onSelect={handleSelectMenu}
                    treeData={menuTreeData}
                    style={{ minHeight: 560 }}
                  />
                ) : (
                  <EmptyState message="暂无菜单数据" className="permissions-menu-empty" />
                )}
              </Spin>
            </Space>
          </Card>
        </Col>

        <Col span={18}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: 18 } }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col span={14}>
                  <Space direction="vertical" size={6}>
                    <Space align="center" size={8}>
                      <FolderOpenOutlined style={{ color: '#2563eb' }} />
                      <Text type="secondary">当前定位</Text>
                      <Text strong>{selectedMenuPathText || currentMenu?.name || '未选择菜单'}</Text>
                    </Space>
                    <Text type="secondary">
                      {currentMenu
                        ? `菜单编码：${currentMenu.code}，点击左侧菜单树或资源表中的菜单即可切换上下文。`
                        : '建议先在左侧选择菜单，再进行新增、编辑和权限点维护。'}
                    </Text>
                  </Space>
                </Col>
                <Col span={10}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    {canCreatePermission && (
                      <Button icon={<PlusOutlined />} onClick={handleCreateTopMenu}>
                        新增菜单
                      </Button>
                    )}
                    {canCreatePermission && (
                      <Button icon={<PlusOutlined />} onClick={handleCreateChildMenu}>
                        新增子菜单
                      </Button>
                    )}
                    {canCreatePermission && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePermissionPoint}>
                        新增权限点
                      </Button>
                    )}
                    {canEditPermission && (
                      <Button icon={<EditOutlined />} onClick={handleEditCurrentMenu} disabled={!currentMenu}>
                        编辑菜单
                      </Button>
                    )}
                    <Button icon={<ReloadOutlined />} onClick={() => syncPageData(selectedMenuId || null)}>
                      刷新
                    </Button>
                  </div>
                </Col>
              </Row>

              <Row gutter={12} style={{ marginTop: 18 }}>
                {overviewCards.map((item) => (
                  <Col key={item.label} span={6}>
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 14,
                        padding: '14px 16px',
                        border: '1px solid #eef2f7',
                        minHeight: 88,
                      }}
                    >
                      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>{item.label}</div>
                      <div style={{ color: item.color, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                        {item.value}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>

              {currentMenu && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    borderRadius: 14,
                    background: '#ffffff',
                    border: '1px solid #eef2f7',
                  }}
                >
                  <div style={{ marginBottom: 14, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                    当前菜单详情
                  </div>
                  <Descriptions
                    bordered
                    size="middle"
                    column={3}
                    labelStyle={{
                      width: 120,
                      minWidth: 120,
                      color: '#64748b',
                      fontWeight: 500,
                      background: '#f8fafc',
                      whiteSpace: 'nowrap',
                    }}
                    contentStyle={{
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                    }}
                    items={[
                      {
                        key: 'name',
                        label: '菜单名称',
                        children: <Text strong>{currentMenu.name}</Text>,
                      },
                      {
                        key: 'code',
                        label: '菜单编码',
                        children: (
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                            <Tag color="blue" style={{ marginInlineEnd: 0 }}>{currentMenu.code}</Tag>
                          </span>
                        ),
                      },
                      {
                        key: 'status',
                        label: '状态',
                        children: (
                          <Tag color={currentMenu.status === 0 ? 'default' : 'success'} style={{ marginInlineEnd: 0 }}>
                            {currentMenu.status === 0 ? '禁用' : '启用'}
                          </Tag>
                        ),
                      },
                      {
                        key: 'path',
                        label: '菜单路径',
                        children: (
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                            {currentMenu.menuUrl || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'parent',
                        label: '父级菜单',
                        children: (
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                            {selectedMenuPath.length > 1
                              ? selectedMenuPath[selectedMenuPath.length - 2]?.name || '-'
                              : '顶级菜单'}
                          </span>
                        ),
                      },
                      {
                        key: 'description',
                        label: '菜单说明',
                        span: 3,
                        children: (
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                            {currentMenu.description || '暂无'}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </Card>

            <Card
              title={currentMenu ? `${currentMenu.name} 下级资源` : '资源列表'}
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: 20, overflow: 'hidden' } }}
              extra={
                <Space size={12} wrap>
                  <ConfigProvider
                    theme={{
                      components: {
                        Segmented: {
                          trackBg: '#f1f5f9',
                          itemSelectedBg: '#dbeafe',
                          itemSelectedColor: '#1d4ed8',
                          itemHoverBg: '#e2e8f0',
                          itemActiveBg: '#bfdbfe',
                        },
                      },
                    }}
                  >
                    <Segmented<ResourceFilterType>
                      value={resourceFilterType}
                      onChange={(value) => setResourceFilterType(value)}
                      options={[
                        { label: <span style={{ whiteSpace: 'nowrap' }}>全部资源</span>, value: 'all' },
                        { label: <span style={{ whiteSpace: 'nowrap' }}>子菜单</span>, value: 'menu' },
                        { label: <span style={{ whiteSpace: 'nowrap' }}>按钮权限</span>, value: 'button' },
                        { label: <span style={{ whiteSpace: 'nowrap' }}>接口权限</span>, value: 'api' },
                      ]}
                    />
                  </ConfigProvider>
                  <Input
                    placeholder="搜索当前菜单下资源"
                    prefix={<SearchOutlined />}
                    style={{ width: 240 }}
                    value={resourceSearchText}
                    onChange={(event) => setResourceSearchText(event.target.value)}
                  />
                </Space>
              }
            >
              <Spin spinning={loading}>
                <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                  <Table
                    tableLayout="fixed"
                    style={{ width: '100%' }}
                    columns={resourceColumns}
                    dataSource={filteredResources}
                    rowKey={(record) => normalizeId(record.id)}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条资源`,
                    }}
                    locale={{
                      emptyText: currentMenu ? '当前菜单下暂无资源' : '请先在左侧选择菜单',
                    }}
                  />
                </div>
              </Spin>
            </Card>
          </Space>
        </Col>
      </Row>

      <Modal
        title={editingPermission ? '编辑资源' : getCreateModalTitle(permissionType)}
        open={isModalVisible}
        onOk={handleSavePermission}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingPermission(null);
          form.resetFields();
        }}
        width={620}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="资源名称"
            name="name"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="请输入资源名称" />
          </Form.Item>

          <Form.Item
            label="权限编码"
            name="code"
            rules={[
              { required: true, message: '请输入权限编码' },
              { pattern: /^[a-z:_]+$/, message: '权限编码只能包含小写字母、冒号和下划线' },
            ]}
          >
            <Input placeholder="如：system:user:view" disabled={!!editingPermission} />
          </Form.Item>

          <Form.Item
            label="资源类型"
            name="type"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select
              options={[
                { label: '菜单', value: 'menu' },
                { label: '按钮权限', value: 'button' },
                { label: '接口权限', value: 'api' },
              ]}
            />
          </Form.Item>

          <Form.Item label="所属父菜单" name="parentId">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="请选择父菜单"
              options={parentPermissionOptions.filter(
                (option) => option.value !== normalizeId(editingPermission?.id)
              )}
            />
          </Form.Item>

          {permissionType === 'menu' && (
            <Form.Item label="菜单路径" name="menuUrl">
              <Input placeholder="如：/admin/permissions" />
            </Form.Item>
          )}

          {permissionType !== 'menu' && (
            <Form.Item label="接口地址" name="apiUrl">
              <Input placeholder={permissionType === 'api' ? '如：/api/auth/permissions' : '可选，填写关联接口地址'} />
            </Form.Item>
          )}

          {permissionType === 'api' && (
            <Form.Item
              label="请求方法"
              name="method"
              rules={[{ required: true, message: '请选择请求方法' }]}
            >
              <Select
                placeholder="请选择请求方法"
                options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => ({
                  label: method,
                  value: method,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item label="排序号" name="sortOrder">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="数字越小越靠前"
            />
          </Form.Item>

          <Form.Item label="状态" name="status" initialValue={1}>
            <Select
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入资源描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资源详情"
        open={!!previewPermission}
        onCancel={() => setPreviewPermission(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewPermission(null)}>
            关闭
          </Button>,
        ]}
        width={560}
      >
        {previewPermission && (
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                资源名称
              </Text>
              <Text strong>{previewPermission.name}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                权限编码
              </Text>
              <Tag color="blue">{previewPermission.code}</Tag>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                资源类型
              </Text>
              <Tag color={getPermissionTypeColor(previewPermission.type)}>
                {getPermissionTypeName(previewPermission.type)}
              </Tag>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                状态
              </Text>
              <Tag color={previewPermission.status === 0 ? 'default' : 'success'}>
                {previewPermission.status === 0 ? '禁用' : '启用'}
              </Tag>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                路径 / 接口
              </Text>
              <Text>{previewPermission.menuUrl || previewPermission.apiUrl || '-'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                请求方法
              </Text>
              <Tag color="geekblue">{previewPermission.method || '-'}</Tag>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                描述
              </Text>
              <Text>{previewPermission.description || '-'}</Text>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default PermissionsPage;
