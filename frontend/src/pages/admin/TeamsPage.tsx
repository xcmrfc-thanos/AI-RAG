import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Avatar,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  List,
  Typography,
  Row,
  Col,
  Divider,
  Tooltip,
  Pagination,
} from 'antd';
import { App } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  SearchOutlined,
  CrownOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { teamService } from '@/services';
import { userService } from '@/services';
import { Team, TeamMember } from '@/types';
import UserAvatar from '@/components/common/UserAvatar';
import { AdminPageHeader } from '@/components/common';
import TeamIcon from '@/components/common/TeamIcon';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { Search } = Input;

export const TeamsPage: React.FC = () => {
  const { message } = App.useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 分页状态
  const [pagination, setPagination] = useState({ current: 1, size: 10, total: 0 });

  // 添加成员弹窗
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    // 团队与候选用户只在页面首次挂载时加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers({ page: 1, pageSize: 1000 });
      setUsers(data.list || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTeams = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const result = await teamService.getTeams({ current: page, size: pageSize });
      setTeams(result.records || []);
      setPagination({
        current: result.current,
        size: result.size,
        total: result.total,
      });
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const members = await teamService.getTeamMembers(teamId);
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleCreate = () => {
    setEditingTeam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    form.setFieldsValue({
      teamName: team.teamName,
      teamCode: team.teamCode,
      description: team.description,
      icon: team.icon,
      leaderId: team.leaderId,
      status: team.status ?? 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await teamService.deleteTeam(id);
      message.success('删除成功');
      // 如果删除的是当前选中的团队，清除选中状态
      if (selectedTeam?.id === id) {
        setSelectedTeam(null);
        setTeamMembers([]);
      }
      fetchTeams(pagination.current, pagination.size);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTeam) {
        await teamService.updateTeam({
          id: editingTeam.id,
          ...values,
        });
        message.success('更新成功');
      } else {
        await teamService.createTeam({
          teamName: values.teamName,
          teamCode: values.teamCode,
          description: values.description,
          icon: values.icon,
          leaderId: values.leaderId,
          parentId: values.parentId,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchTeams(pagination.current, pagination.size);
      // 更新选中团队的详情
      if (editingTeam && selectedTeam?.id === editingTeam.id) {
        const updated = await teamService.getTeam(editingTeam.id);
        setSelectedTeam(updated);
      }
    } catch (error) {
      console.error('Failed to submit team:', error);
    }
  };

  const handleShowMembers = (team: Team) => {
    setSelectedTeam(team);
    fetchTeamMembers(team.id);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await teamService.removeMembers(selectedTeam.id, [userId]);
      message.success('移除成功');
      fetchTeamMembers(selectedTeam.id);
      fetchTeams(pagination.current, pagination.size);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedTeam || selectedUserIds.length === 0) return;
    try {
      await teamService.addMembers(selectedTeam.id, selectedUserIds);
      message.success(`成功添加 ${selectedUserIds.length} 位成员`);
      setAddMemberVisible(false);
      setSelectedUserIds([]);
      fetchTeamMembers(selectedTeam.id);
      fetchTeams(pagination.current, pagination.size);
    } catch (error) {
      console.error('Failed to add members:', error);
    }
  };

  // 过滤非成员用户
  const nonMemberUsers = users.filter(
    (u) => !teamMembers.some((m) => m.userId === u.id || String(m.userId) === String(u.id))
  );

  // 搜索过滤团队
  const filteredTeams = teams.filter((team) =>
    team.teamName?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 24px', background: '#f8fafc', minHeight: '100vh' }}>
      <AdminPageHeader
        title="团队空间管理"
        description="管理组织架构和团队协作空间"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建团队
          </Button>
        )}
      />

      <Row gutter={24}>
        {/* 左侧团队列表 */}
        <Col span={8}>
          <Card
            title="团队列表"
            extra={
              <Space>
                <Text type="secondary">共 {pagination.total} 个团队</Text>
              </Space>
            }
            style={{ borderRadius: 12, height: 'fit-content' }}
            styles={{ body: { padding: 16 } }}
          >
            <Search
              placeholder="搜索团队"
              prefix={<SearchOutlined />}
              style={{ marginBottom: 16 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleShowMembers(team)}
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    border: `1px solid ${selectedTeam?.id === team.id ? '#2563eb' : 'transparent'}`,
                    background: selectedTeam?.id === team.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTeam?.id !== team.id) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTeam?.id !== team.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {team.icon ? (
                    <TeamIcon icon={team.icon} variant="avatar" size={40} />
                  ) : (
                    <Avatar
                      size={40}
                      style={{
                        background: `linear-gradient(135deg, #2563eb, #8b5cf6)`,
                        fontWeight: 600,
                      }}
                    >
                      <TeamOutlined />
                    </Avatar>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text strong>{team.teamName}</Text>
                      <Tag color={team.status === 1 ? 'success' : 'default'} style={{ fontSize: 11, margin: 0 }}>
                        {team.status === 1 ? '活跃' : '停用'}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {team.memberCount || 0} 位成员 · {team.description || '暂无描述'}
                    </Text>
                  </div>
                  <Space className="team-actions">
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(team);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Popconfirm
                        title="确定要删除这个团队吗？"
                        description="删除后团队成员和关联数据将被清除"
                        onConfirm={() => handleDelete(team.id)}
                        onCancel={(e) => e?.stopPropagation()}
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
                    </Tooltip>
                  </Space>
                </div>
              ))}
            </Space>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.size}
                total={pagination.total}
                size="small"
                onChange={(page, pageSize) => fetchTeams(page, pageSize)}
                showSizeChanger
                showTotal={(total) => `共 ${total} 个团队`}
              />
            </div>
          </Card>
        </Col>

        {/* 右侧团队详情 */}
        <Col span={16}>
          <Card
            title={
              <Space>
                {selectedTeam?.icon ? (
                  <TeamIcon icon={selectedTeam.icon} variant="avatar" size={32} />
                ) : (
                  <Avatar
                    size={32}
                    style={{
                      background: `linear-gradient(135deg, #2563eb, #8b5cf6)`,
                    }}
                  >
                    <TeamOutlined />
                  </Avatar>
                )}
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {selectedTeam?.teamName || '选择团队'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedTeam?.description || '从左侧选择一个团队查看详情'}
                  </Text>
                </div>
              </Space>
            }
            extra={
              selectedTeam && (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(selectedTeam)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除这个团队吗？"
                    onConfirm={() => handleDelete(selectedTeam.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              )
            }
            style={{ borderRadius: 12 }}
          >
            {selectedTeam ? (
              <div>
                <Divider titlePlacement="start">团队信息</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        团队负责人
                      </Text>
                      <br />
                      <Space>
                        <UserAvatar
                          src={selectedTeam.leader?.avatar}
                          alt={selectedTeam.leaderName || selectedTeam.leader?.username || ''}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <Text>{selectedTeam.leaderName || selectedTeam.leader?.username || selectedTeam.leaderId || '未设置'}</Text>
                      </Space>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        创建时间
                      </Text>
                      <br />
                      <Text>{selectedTeam.createdAt ? dayjs(selectedTeam.createdAt).format('YYYY-MM-DD') : '-'}</Text>
                    </div>
                  </Col>
                  {selectedTeam.teamCode && (
                    <Col span={12}>
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>团队编码</Text>
                        <br />
                        <Text code>{selectedTeam.teamCode}</Text>
                      </div>
                    </Col>
                  )}
                  {selectedTeam.docCount !== undefined && (
                    <Col span={12}>
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>文档数量</Text>
                        <br />
                        <Text>{selectedTeam.docCount}</Text>
                      </div>
                    </Col>
                  )}
                </Row>

                <Divider titlePlacement="start">团队成员 ({teamMembers.length})</Divider>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<UserAddOutlined />}
                    onClick={() => {
                      setSelectedUserIds([]);
                      setAddMemberVisible(true);
                    }}
                  >
                    添加成员
                  </Button>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {teamMembers.length > 0 ? (
                    <List
                      dataSource={teamMembers}
                      renderItem={(member) => (
                        <List.Item
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                          actions={[
                            <Popconfirm
                              key="remove"
                              title="确定要移除这个成员吗？"
                              onConfirm={() => handleRemoveMember(member.userId)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button type="text" danger size="small">
                                移除
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <UserAvatar
                                src={member.avatar}
                                alt={member.username || ''}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            }
                            title={
                              <Space>
                                <Text>{member.username}</Text>
                                {member.realName && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>({member.realName})</Text>
                                )}
                                {member.role === 'leader' && (
                                  <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: 11 }}>
                                    负责人
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={`加入时间: ${member.joinedAt ? dayjs(member.joinedAt).format('YYYY-MM-DD') : '-'}`}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <Text type="secondary">暂无成员，点击上方按钮添加</Text>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <TeamOutlined style={{ fontSize: 64, color: '#e2e8f0', marginBottom: 16 }} />
                <Title level={4} type="secondary">
                  选择左侧团队查看详情
                </Title>
                <Text type="secondary">点击团队列表中的项目可以查看和编辑详细信息</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 创建/编辑团队Modal */}
      <Modal
        title={editingTeam ? '编辑团队' : '新建团队'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="团队名称"
            name="teamName"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>

          {!editingTeam && (
            <Form.Item
              label="团队编码"
              name="teamCode"
              rules={[{ required: true, message: '请输入团队编码' }]}
              extra="编码创建后不可修改"
            >
              <Input placeholder="请输入团队编码（唯一标识）" />
            </Form.Item>
          )}

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入团队描述" />
          </Form.Item>

          <Form.Item label="图标" name="icon" initialValue="tech">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { key: 'tech', label: '技术' },
                { key: 'product', label: '产品' },
                { key: 'ops', label: '运营' },
                { key: 'admin', label: '职能' },
                { key: 'backend', label: '后端' },
                { key: 'frontend', label: '前端' },
                { key: 'qa', label: '测试' },
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
                      gap: 4,
                      padding: '8px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#3b82f6' : 'var(--border-color)'}`,
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <TeamIcon icon={key} variant="avatar" size={36} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </Form.Item>

          <Form.Item
            label="团队负责人"
            name="leaderId"
            rules={[{ required: true, message: '请选择团队负责人' }]}
          >
            <Select placeholder="请选择团队负责人" showSearch optionFilterProp="children">
              {users.map((user: any) => (
                <Option key={user.id} value={String(user.id)}>
                  {user.username} {user.realName ? `(${user.realName})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="团队状态"
            name="status"
            initialValue={1}
          >
            <Select>
              <Option value={1}>活跃</Option>
              <Option value={0}>停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加成员弹窗 */}
      <Modal
        title="添加团队成员"
        open={addMemberVisible}
        onCancel={() => {
          setAddMemberVisible(false);
          setSelectedUserIds([]);
        }}
        onOk={handleAddMembers}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: selectedUserIds.length === 0 }}
      >
        <Select
          mode="multiple"
          placeholder="搜索并选择要添加的用户"
          style={{ width: '100%' }}
          value={selectedUserIds}
          onChange={setSelectedUserIds}
          filterOption={(input, option) => {
            const label = option?.label ?? option?.children;
            return String(label ?? '').toLowerCase().includes(input.toLowerCase());
          }}
        >
          {nonMemberUsers.map((user: any) => (
            <Option key={user.id} value={String(user.id)}>
              {user.username} {user.realName ? `(${user.realName})` : ''}
            </Option>
          ))}
        </Select>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {nonMemberUsers.length} 位非成员用户可选
          </Text>
        </div>
      </Modal>

      <style>{`
        .team-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        div:hover > .team-actions {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default TeamsPage;
