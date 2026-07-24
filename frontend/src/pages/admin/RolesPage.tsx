/**
 * 管理后台页面：RolesPage。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Checkbox,
  Card,
  Row,
  Col,
  Typography,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { roleService } from '@/services';
import permissionService, { PermissionVO } from '@/services/permission.service';
import type { Role } from '@/types';
import { AdminPageHeader } from '@/components/common';

interface RoleFormData {
  name: string;
  code: string;
  description?: string;
  permissions: string[];
}

const normalizeRole = (role: Role): Role => ({
  ...role,
  userCount: Number(role.userCount) || 0,
  status: role.status !== undefined ? Number(role.status) : role.status,
});

export const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionVO[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm<RoleFormData>();

  useEffect(() => {
    fetchPageData();
    // 角色与权限准源只在页面首次挂载时同步。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionNameMap = useMemo(
    () =>
      permissions.reduce<Record<string, string>>((acc, permission) => {
        acc[String(permission.id)] = permission.name;
        return acc;
      }, {}),
    [permissions]
  );

  const permissionOptions = useMemo(
    () =>
      permissions.map((permission) => ({
        label: `${permission.name} (${permission.code})`,
        value: String(permission.id),
      })),
    [permissions]
  );

  /**
   * fetchPageData。
   */
  const fetchPageData = async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([
        roleService.getRoles({ skipErrorToast: true }),
        permissionService.getAllPermissions(),
      ]);
      setRoles((roleList || []).map(normalizeRole));
      setPermissions(permissionList || []);
    } catch (error) {
      message.error('获取角色数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return roles;
    }
    return roles.filter((role) =>
      [role.name, role.code, role.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword))
    );
  }, [roles, searchText]);

  const activeRoleCount = useMemo(
    () => roles.filter((role) => role.status !== 0).length,
    [roles]
  );

  const assignedUserCount = useMemo(
    () => roles.reduce((sum, role) => sum + (Number(role.userCount) || 0), 0),
    [roles]
  );

  const permissionBindingCount = useMemo(
    () => roles.reduce((sum, role) => sum + (role.permissions?.length || 0), 0),
    [roles]
  );

  const getLinkedStatCardStyle = (clickable: boolean): React.CSSProperties => ({
    cursor: clickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    borderRadius: 12,
  });

  const statCardBodyStyle: React.CSSProperties = {
    minHeight: 120,
    display: 'flex',
    alignItems: 'stretch',
  };

  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 88,
    width: '100%',
  };

  /**
   * handleAdd。
   */
  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setIsModalVisible(true);
  };

  /**
   * handleEdit。
   */
  const handleEdit = async (role: Role) => {
    setEditingRole(role);
    setSaving(true);
    try {
      const permissionIds = await roleService.getRolePermissions(String(role.id), {
        skipErrorToast: true,
      });
      form.setFieldsValue({
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: permissionIds || [],
      });
      setIsModalVisible(true);
    } catch (error) {
      message.error('获取角色权限失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * handleDelete。
   */
  const handleDelete = (role: Role) => {
    if ((Number(role.userCount) || 0) > 0) {
      message.warning('该角色已分配给用户，请先解除用户关联后再删除');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色“${role.name}”吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await roleService.deleteRole(String(role.id));
          message.success('删除成功');
          fetchPageData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  /**
   * handleModalOk。
   */
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingRole) {
        await roleService.updateRole(String(editingRole.id), values);
        await roleService.assignPermissions(String(editingRole.id), values.permissions || []);
        message.success('更新角色成功');
      } else {
        const roleId = await roleService.createRole(values);
        await roleService.assignPermissions(String(roleId), values.permissions || []);
        message.success('创建角色成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchPageData();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(editingRole ? '更新角色失败' : '创建角色失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <SafetyOutlined style={{ color: '#2563eb' }} />
          <div>
            <div>{text}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.code}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (value?: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: number) => (
        <Tag color={status === 0 ? 'default' : 'success'}>
          {status === 0 ? '禁用' : '启用'}
        </Tag>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissionIds: string[] = []) => (
        <Space size="small" wrap>
          {permissionIds.slice(0, 3).map((permissionId) => (
            <Tag key={permissionId} color="blue">
              {permissionNameMap[permissionId] || permissionId}
            </Tag>
          ))}
          {permissionIds.length > 3 && <Tag>+{permissionIds.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count?: number | string) => <Tag color="green">{Number(count) || 0} 人</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            disabled={(Number(record.userCount) || 0) > 0}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-roles-page">
      <AdminPageHeader
        title="角色管理"
        description="管理系统角色、状态和权限绑定关系"
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPageData}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加角色
            </Button>
          </Space>
        )}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: statCardBodyStyle }}>
            <div className="stat-item" style={statItemStyle}>
              <div className="stat-value">{roles.length}</div>
              <div className="stat-label">总角色数</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={getLinkedStatCardStyle(true)}
            styles={{ body: statCardBodyStyle }}
            onClick={() => navigate('/admin/users')}
          >
            <div className="stat-item" style={statItemStyle}>
              <div className="stat-value">{assignedUserCount}</div>
              <div className="stat-label">已分配用户</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                点击查看用户管理
              </Typography.Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: statCardBodyStyle }}>
            <div className="stat-item" style={statItemStyle}>
              <div className="stat-value">{activeRoleCount}</div>
              <div className="stat-label">启用角色</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={getLinkedStatCardStyle(true)}
            styles={{ body: statCardBodyStyle }}
            onClick={() => navigate('/admin/permissions')}
          >
            <div className="stat-item" style={statItemStyle}>
              <div className="stat-value">{permissionBindingCount}</div>
              <div className="stat-label">权限绑定数</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                点击查看权限管理
              </Typography.Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索角色名称、角色编码或描述"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 320 }}
          />
          <Typography.Text type="secondary">
            已分配用户的角色不允许直接删除
          </Typography.Text>
        </div>
        <Table
          columns={columns}
          dataSource={filteredRoles}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '添加角色'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRole(null);
          form.resetFields();
        }}
        confirmLoading={saving}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            label="角色代码"
            name="code"
            rules={[
              { required: true, message: '请输入角色代码' },
              { pattern: /^ROLE_[A-Z0-9_]+$/, message: '角色代码需以 ROLE_ 开头且使用大写字母' },
            ]}
          >
            <Input placeholder="请输入角色代码，如：ROLE_ADMIN" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="请输入角色描述" rows={3} />
          </Form.Item>

          <Form.Item
            label="权限"
            name="permissions"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                {permissionOptions.map((option) => (
                  <Col xs={24} sm={12} key={option.value}>
                    <Checkbox value={option.value}>{option.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;
