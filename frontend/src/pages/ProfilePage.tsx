/**
 * 业务页面：ProfilePage。
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Typography,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Tag,
  Modal,
} from 'antd';
import { App } from 'antd';
import type { UploadFile } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SaveOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore, useAppStore } from '@/stores';
import { authService } from '@/services';
import { userService } from '@/services/user.service';
import type { User } from '@/types';
import UserAvatar from '@/components/common/UserAvatar';

const { Title, Text } = Typography;

export const ProfilePage: React.FC = () => {
  const { message } = App.useApp();
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);
  const [stats, setStats] = useState<{ documentCount: number; viewCount: number; likeCount: number; commentCount: number } | null>(null);
  const [, setFileList] = useState<UploadFile[]>([]);
  const maxFileSize = useAppStore((s) => s.maxFileSize);
  const allowedFileTypes = useAppStore((s) => s.allowedFileTypes);

  useEffect(() => {
    /**
     * fetchStats。
     */
    const fetchStats = async () => {
      try {
        const result = await userService.getUserStats();
        if (result) {
          setStats(result as { documentCount: number; viewCount: number; likeCount: number; commentCount: number });
        }
      } catch {
        // 统计数据加载失败不影响页面使用
      }
    };
    if (user) {
      fetchStats();
    }
  }, [user]);

  /**
   * handleProfileUpdate。
   */
  const handleProfileUpdate = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      // 构建UserDTO请求参数
      const params = {
        id: user?.id,
        username: values.username,
        email: values.email,
        department: values.department,
        position: values.position,
        remark: values.remark,
        avatar: avatarUrl,
      };
      await authService.updateProfile(params);
      // 更新auth store中的用户信息
      if (user) {
        updateUser({ ...user, ...params } as User);
      }
      message.success('个人信息更新成功');
    } catch {
      message.error('保存修改失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * handlePasswordChange。
   */
  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      await authService.changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功，请重新登录');
      passwordForm.resetFields();
      // 修改密码后退出登录
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1500);
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setPasswordLoading(false);
    }
  };

  /**
   * handleAvatarChange。
   */
  const handleAvatarChange = async (info: UploadChangeParam<UploadFile>) => {
    setFileList(info.fileList);
    if (info.file.status === 'done') {
      const res = info.file.response;
      if (res && (res.code === 200 || res.code === 0)) {
        const fileUrl = res.data?.fileUrl || res.url;
        setAvatarUrl(fileUrl);
        // 上传成功后保存头像URL到用户信息（必须带上必填字段）
        try {
          await authService.updateProfile({
            id: user?.id,
            username: user?.username,
            email: user?.email,
            avatar: fileUrl,
          });
          if (user) {
            updateUser({ ...user, avatar: fileUrl });
          }
        } catch {
          // 头像文件已上传成功，保存到用户信息失败不影响提示
        }
        message.success('头像上传成功');
      } else {
        message.error(res?.message || '头像上传失败');
      }
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  const beforeUpload = (file: File) => {
    // 使用系统配置的允许文件类型校验
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = allowedFileTypes.split(',').map(t => {
      const trimmed = t.trim().toLowerCase();
      return trimmed.startsWith('.') ? trimmed : '.' + trimmed;
    });
    if (!allowedExts.includes(ext)) {
      message.error(`不支持的文件类型：${ext}，允许的类型：${allowedFileTypes}`);
      return false;
    }
    // 头像最大5MB，同时不超过系统配置的文件大小上限
    const maxAvatarSize = Math.min(maxFileSize, 5 * 1024 * 1024);
    if (file.size > maxAvatarSize) {
      const maxMB = Math.round(maxAvatarSize / 1048576 * 10) / 10;
      message.error(`图片大小不能超过 ${maxMB}MB`);
      return false;
    }
    return true;
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        个人中心
      </Title>

      <Row gutter={[24, 24]}>
        {/* 头像和基本信息 */}
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Upload
                name="file"
                listType="picture-circle"
                className="avatar-uploader"
                showUploadList={false}
                action="/api/file/files/upload"
                beforeUpload={beforeUpload}
                onChange={handleAvatarChange}
              >
                <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', marginBottom: 16 }}>
                  <UserAvatar
                    src={avatarUrl}
                    alt="头像"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </Upload>
              <div>
                <Title level={4} style={{ marginBottom: 4 }}>
                  {user?.username}
                </Title>
                <Text type="secondary">{user?.email}</Text>
              </div>
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Tag color="blue">{user?.role === 'admin' ? '管理员' : '普通用户'}</Tag>
                  <Tag color="green">在线</Tag>
                </Space>
              </div>
            </div>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="文档数"
                  value={stats?.documentCount ?? 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="获赞数"
                  value={stats?.likeCount ?? 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 个人信息表单 */}
        <Col xs={24} lg={16}>
          <Card
            title="基本信息"
            style={{ borderRadius: 12, marginBottom: 24 }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                username: user?.username,
                email: user?.email,
                department: user?.department,
                position: user?.position,
                remark: user?.remark,
              }}
              onFinish={handleProfileUpdate}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="请输入用户名"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="请输入邮箱"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="部门" name="department">
                    <Input placeholder="请输入部门" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="职位" name="position">
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="请输入职位"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="个人简介" name="remark">
                <Input.TextArea
                  rows={4}
                  placeholder="介绍一下自己..."
                  showCount
                  maxLength={200}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                    border: 'none',
                  }}
                >
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 修改密码 */}
          <Card title="修改密码" style={{ borderRadius: 12 }}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                label="当前密码"
                name="currentPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入当前密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入新密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请确认新密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={passwordLoading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #52c41a, #1890ff)',
                    border: 'none',
                  }}
                >
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 退出登录 */}
          <Card style={{ borderRadius: 12, marginTop: 24 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                安全退出当前账号
              </span>
              <Button
                type="primary"
                icon={<LogoutOutlined />}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                }}
                onClick={() => {
                  Modal.confirm({
                    title: '确认退出',
                    content: '确定要退出登录吗？',
                    okText: '确定退出',
                    cancelText: '取消',
                    onOk: async () => {
                      await logout();
                      message.success('已退出登录');
                      navigate('/login');
                    },
                  });
                }}
              >
                退出登录
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
