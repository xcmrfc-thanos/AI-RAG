import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Avatar,
  Card,
  Modal,
  Form,
  Popconfirm,
  Pagination,
  Checkbox,
} from 'antd';
import { App } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { userService, roleService, teamService } from '@/services';
import permissionService, { PermissionTreeNode } from '@/services/permission.service';
import { useAuthStore } from '@/stores';
import { DEFAULT_AVATAR } from '@/constants/default-avatar';
import { User } from '@/types';

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface PermissionModule {
  id: string;
  name: string;
  children: {
    id: string;
    name: string;
    code: string;
  }[];
}

const flattenPermissionTree = (nodes: PermissionTreeNode[] = []): PermissionModule[] =>
  nodes.map((node) => ({
    id: String(node.id),
    name: node.name,
    children:
      node.children && node.children.length > 0
        ? node.children.flatMap((child) => flattenPermissionChildren(child))
        : [
            {
              id: String(node.id),
              name: node.name,
              code: node.code,
            },
          ],
  }));

const flattenPermissionChildren = (
  node: PermissionTreeNode
): Array<{ id: string; name: string; code: string }> => {
  if (!node.children || node.children.length === 0) {
    return [
      {
        id: String(node.id),
        name: node.name,
        code: node.code,
      },
    ];
  }
  return node.children.flatMap((child) => flattenPermissionChildren(child));
};

const hasCustomAvatar = (avatar?: string) => {
  if (!avatar) {
    return false;
  }
  const normalizedAvatar = avatar.trim();
  if (!normalizedAvatar || normalizedAvatar === DEFAULT_AVATAR) {
    return false;
  }
  if (normalizedAvatar.includes('api.dicebear.com/7.x/avataaars/svg')) {
    return false;
  }
  return true;
};

const { Title, Text } = Typography;
const { Option } = Select;
const { useForm } = Form;

interface UserFormData {
  id?: string;
  username: string;
  email: string;
  password?: string;
  realName?: string;
  department?: string;
  position?: string;
  status: number;
  roleIds?: string[];
}

const defaultUserFormValues: UserFormData = {
  username: '',
  email: '',
  password: '',
  realName: '',
  department: '',
  position: '',
  status: 1,
};

/**
 * 用户管理页（系统唯一入口）。
 * 路由：/admin/users（主路由）及管理中心嵌套路由 users。
 * 能力：分页列表、角色/权限分配、启停、密码重置、团队空间等。
 * 说明：原 UsersPage 为早期原型（本地 mock CRUD），已废弃合并至本页。
 */
export const UsersManagementPage: React.FC = () => {
  const { message } = App.useApp();
  const authUser = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = useForm<UserFormData>();

  // 权限分配相关状态
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionModalLoading, setPermissionModalLoading] = useState(false);

  // 团队空间选择
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    // 用户请求由分页与筛选标量驱动，加载器身份不参与刷新判定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, roleFilter, statusFilter]);

  useEffect(() => {
    teamService.getTeamTree(true).then(setTeams).catch((err) => {
      console.error('获取团队空间列表失败:', err);
    });
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const filter: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      if (searchText) {
        filter.keyword = searchText;
      }
      if (roleFilter !== 'all') {
        filter.role = roleFilter;
      }
      if (statusFilter !== 'all') {
        filter.status = statusFilter === 'active' ? 1 : 0;
      }

      const response = await userService.getUsers(filter);
      setUsers(response.list || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
      }));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开权限分配模态框
  const handleOpenPermissionModal = async (user: User) => {
    setSelectedUserId(String(user.id));
    setSelectedUserName(user.username || '');
    setPermissionModalLoading(true);
    try {
      const [rolesResponse, userRoles, permissionTree, userPermissions] = await Promise.all([
        roleService.getRoles({ skipErrorToast: true }),
        userService.getUserRoles(String(user.id), { skipErrorToast: true }),
        permissionService.getPermissionTree({ skipErrorToast: true }),
        userService.getUserPermissions(String(user.id), { skipErrorToast: true }),
      ]);
      setRoles(rolesResponse || []);
      setSelectedRoles(userRoles || []);
      setPermissionModules(flattenPermissionTree(permissionTree || []));
      setSelectedPermissions(userPermissions || []);
    } catch (error) {
      message.error('获取权限信息失败');
    } finally {
      setPermissionModalLoading(false);
      setIsPermissionModalVisible(true);
    }
  };

  // 保存权限分配
  const handleSavePermissions = async () => {
    setPermissionModalLoading(true);
    try {
      const permissionIds = permissionModules
        .flatMap((module) => module.children)
        .filter((permission) => selectedPermissions.includes(permission.code))
        .map((permission) => permission.id);

      // 保存角色分配
      await userService.assignRoles(selectedUserId, selectedRoles);
      await userService.assignPermissions(selectedUserId, permissionIds);

      if (String(authUser?.id) === selectedUserId) {
        await checkAuth();
      }
      message.success('权限分配成功');
      setIsPermissionModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('权限分配失败');
    } finally {
      setPermissionModalLoading(false);
    }
  };

  // 全选/取消全选角色
  const handleSelectAllRoles = (checked: boolean) => {
    if (checked) {
      setSelectedRoles(roles.map(r => r.id));
    } else {
      setSelectedRoles([]);
    }
  };

  // 全选/取消全选权限模块
  const handleSelectModule = (moduleId: string, checked: boolean) => {
    const module = permissionModules.find(m => m.id === moduleId);
    if (module) {
      const modulePermissions = module.children.map(c => c.code);
      if (checked) {
        setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissions])]);
      } else {
        setSelectedPermissions(prev => prev.filter(p => !modulePermissions.includes(p)));
      }
    }
  };

  // 切换单个权限
  const handleTogglePermission = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, code]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== code));
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUsers();
  };

  const handleReset = () => {
    setSearchText('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUsers();
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue(defaultUserFormValues);
    setIsModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      id: String(user.id),
      username: user.username,
      email: user.email,
      realName: user.realName || user.nickname || '',
      department: user.department || '',
      position: user.position || '',
      status: user.status === 'active' || user.status === 1 ? 1 : 0,
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('提交的用户数据:', values);
      if (editingUser) {
        await userService.updateUser(String(editingUser.id), values);
        message.success('更新用户成功');
      } else {
        const userId = await userService.createUser(values as any);
        // 如果选择了团队空间，将用户添加到该团队
        if (selectedTeamId) {
          try {
            await teamService.addMembers(selectedTeamId, [String(userId)]);
          } catch (e) {
            console.warn('添加团队空间失败:', e);
          }
        }
        setSelectedTeamId('');
        message.success('创建用户成功');
      }
      setEditingUser(null);
      form.resetFields();
      form.setFieldsValue(defaultUserFormValues);
      setIsModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setSelectedTeamId('');
    setIsModalVisible(false);
    form.resetFields();
    form.setFieldsValue(defaultUserFormValues);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await userService.deleteUser(String(id));
      message.success('删除用户成功');
      fetchUsers();
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize, total: pagination.total });
  };

  const normalizeRoleCode = (role: string) => {
    const roleMap: Record<string, string> = {
      ROLE_SUPER_ADMIN: 'SUPER_ADMIN',
      ROLE_ADMIN: 'KNOWLEDGE_ADMIN',
      ROLE_REVIEWER: 'REVIEWER',
      ROLE_EDITOR: 'EDITOR',
      ROLE_USER: 'VIEWER',
      ROLE_GUEST: 'VIEWER',
    };
    return roleMap[role] || role;
  };

  const getRoleBadge = (role: string) => {
    const normalizedRole = normalizeRoleCode(role);
    const roleConfig: Record<string, { color: string; text: string }> = {
      SUPER_ADMIN: { color: 'error', text: '超级管理员' },
      KNOWLEDGE_ADMIN: { color: 'processing', text: '知识管理员' },
      REVIEWER: { color: 'warning', text: '审核员' },
      EDITOR: { color: 'success', text: '编辑者' },
      VIEWER: { color: 'default', text: '查看者' },
    };
    const config = roleConfig[normalizedRole] || roleConfig.VIEWER;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusBadge = (status: number | string) => {
    const isActive = status === 'active' || status === 1 || status === '1';
    return isActive ? (
      <Tag color="success">
        启用
      </Tag>
    ) : (
      <Tag color="default">
        禁用
      </Tag>
    );
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 280,
      render: (_, record) => (
        <Space size={12}>
          {(() => {
            const showCustomAvatar = hasCustomAvatar(record.avatar);
            return (
          <Avatar
            size={48}
            src={showCustomAvatar ? record.avatar : undefined}
            style={
              showCustomAvatar
                ? undefined
                : {
                    background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                    fontWeight: 600,
                    fontSize: 18,
                  }
            }
          >
            {!showCustomAvatar ? record.username?.charAt(0).toUpperCase() : null}
          </Avatar>
            );
          })()}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
              {record.username}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      key: 'role',
      width: 220,
      render: (_, record) => {
        const roles = Array.from(
          new Set(
            (record.roles && record.roles.length > 0 ? record.roles : [record.role || 'VIEWER']).filter(Boolean)
          )
        );
        return <Space size={[4, 4]} wrap>{roles.map((role) => <React.Fragment key={role}>{getRoleBadge(role)}</React.Fragment>)}</Space>;
      },
    },
    {
      title: '真实姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 120,
      render: (realName: string) => (
        <Text style={{ fontSize: 14, color: '#475569' }}>{realName || '-'}</Text>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      render: (department: string) => (
        <Text style={{ fontSize: 14, color: '#475569' }}>{department || '-'}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number | string) => getStatusBadge(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => (
        <Text style={{ fontSize: 14, color: '#475569' }}>{createdAt ? createdAt.replace('T', ' ') : '-'}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: '#64748b' }}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            icon={<LockOutlined />}
            size="small"
            style={{ color: '#3b82f6' }}
            onClick={() => handleOpenPermissionModal(record)}
          />
          <Popconfirm
            title="确定删除该用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              style={{ color: '#ef4444' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div style={styles.pageTitleSection}>
          <Title level={1} style={styles.pageTitle}>
            用户管理
          </Title>
          <Text style={styles.pageDescription}>
            管理系统用户、权限分配和账户信息
          </Text>
        </div>
        <div style={styles.actionButtons}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={styles.primaryButton}
            onClick={handleAdd}
          >
            添加用户
          </Button>
        </div>
      </div>

      <Card style={styles.filterBar} variant="borderless">
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <Input
              placeholder="搜索用户名或邮箱"
              prefix={<SearchOutlined />}
              style={styles.filterInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </div>
          <div style={styles.filterGroup}>
            <Select
              style={styles.filterSelect}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            >
              <Option value="all">全部角色</Option>
              <Option value="SUPER_ADMIN">超级管理员</Option>
              <Option value="KNOWLEDGE_ADMIN">知识管理员</Option>
              <Option value="EDITOR">编辑者</Option>
              <Option value="VIEWER">查看者</Option>
            </Select>
          </div>
          <div style={styles.filterGroup}>
            <Select
              style={styles.filterSelect}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </div>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
        </div>
      </Card>

      <Card style={styles.usersTable} variant="borderless">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 个用户`}
          />
        </div>
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleCloseModal}
        width={600}
        okText={editingUser ? '更新' : '创建'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form
          key={editingUser ? 'edit-user-form' : 'create-user-form'}
          form={form}
          layout="vertical"
          initialValues={defaultUserFormValues}
          preserve={false}
          autoComplete="off"
        >
          {!editingUser && (
            <>
              <input
                type="text"
                name="fake-username"
                autoComplete="username"
                style={{ display: 'none' }}
              />
              <input
                type="password"
                name="fake-password"
                autoComplete="current-password"
                style={{ display: 'none' }}
              />
            </>
          )}
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              disabled={!!editingUser}
              autoComplete={editingUser ? 'off' : 'new-password'}
              name={editingUser ? 'edit-username' : 'create-username'}
            />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码长度不能少于6位' },
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                autoComplete="new-password"
                name="create-password"
              />
            </Form.Item>
          )}

          <Form.Item
            label="真实姓名"
            name="realName"
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            label="部门"
            name="department"
          >
            <Input placeholder="请输入部门" />
          </Form.Item>

          <Form.Item
            label="岗位"
            name="position"
          >
            <Input placeholder="请输入岗位" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="团队空间"
              name="teamId"
            >
              <Select
                placeholder="请选择团队空间（选填）"
                allowClear
                onChange={(value) => setSelectedTeamId(value || '')}
              >
                {teams.map((team: any) => (
                  <Option key={team.id} value={String(team.id)}>
                    {team.teamName || team.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            label="状态"
            name="status"
          >
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限分配模态框 */}
      <Modal
        title={`为用户 "${selectedUserName}" 分配权限`}
        open={isPermissionModalVisible}
        onOk={handleSavePermissions}
        onCancel={() => setIsPermissionModalVisible(false)}
        width={800}
        okText="保存权限"
        cancelText="取消"
        confirmLoading={permissionModalLoading}
      >
        <div style={{ padding: '16px 0' }}>
          {/* 角色分配区域 */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>
              <span style={{ marginRight: 8 }}>
                <UnlockOutlined />
              </span>
              角色分配
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <Checkbox
                checked={selectedRoles.length === roles.length && roles.length > 0}
                onChange={(e) => handleSelectAllRoles(e.target.checked)}
                style={{ marginRight: 12 }}
              >
                全选
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 12 }}>
                已选择 {selectedRoles.length} 个角色
              </Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {roles.map((role) => (
                <Checkbox
                  key={role.id}
                  checked={selectedRoles.includes(role.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles((prev) => [...prev, role.id]);
                    } else {
                      setSelectedRoles((prev) => prev.filter((id) => id !== role.id));
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{role.name}</span>
                    {role.description && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        ({role.description})
                      </span>
                    )}
                  </span>
                </Checkbox>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0' }} />

          {/* 权限分配区域 */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>
              <span style={{ marginRight: 8 }}>
                <FolderOpenOutlined />
              </span>
              权限分配
            </h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {permissionModules.map((module) => {
                const isModuleSelected = module.children.every((child) =>
                  selectedPermissions.includes(child.code)
                );
                return (
                  <div key={module.id} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Checkbox
                        checked={isModuleSelected}
                        onChange={(e) => handleSelectModule(module.id, e.target.checked)}
                        style={{ marginRight: 12 }}
                      />
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>
                        {module.name}
                      </span>
                    </div>
                    <div style={{ paddingLeft: 48 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {module.children.map((permission) => (
                          <Checkbox
                            key={permission.id}
                            checked={selectedPermissions.includes(permission.code)}
                            onChange={(e) =>
                              handleTogglePermission(permission.code, e.target.checked)
                            }
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color: '#475569',
                              }}
                            >
                              {permission.name}
                            </span>
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                已选择 {selectedPermissions.length} 项权限
              </Text>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: 'none',
    margin: 0,
    padding: '8px 8px',
    minHeight: '100vh',
    background: '#f8fafc',
  },
  pageHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitleSection: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  pageDescription: {
    fontSize: 14,
    color: '#475569',
  },
  actionButtons: {
    display: 'flex' as const,
    gap: 12,
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    border: 'none',
    height: 40,
    fontWeight: 600,
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)',
  },
  filterBar: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  filterRow: {
    display: 'flex' as const,
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    display: 'flex' as const,
    alignItems: 'center',
    gap: 12,
  },
  filterInput: {
    width: 200,
  },
  filterSelect: {
    width: 150,
  },
  usersTable: {
    background: '#ffffff',
    borderRadius: 16,
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
};

export default UsersManagementPage;
