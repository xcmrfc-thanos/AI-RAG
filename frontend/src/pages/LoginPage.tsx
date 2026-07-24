/**
 * 业务页面：LoginPage。
 */
import React from 'react';
import { Form, Input, Button, Typography, Tabs, Spin, Select } from 'antd';
import { App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { foundationService, authService, teamService } from '@/services';
import type { RegisterResponse } from '@/types';

const { Text } = Typography;

/** 注册Tab对应的配置键 */
const REGISTRATION_CONFIG_KEY = 'user.registration.enabled';

/** 密码策略配置键 */
const PW_POLICY_KEY = 'system.passwordPolicy';
const PW_MIN_LENGTH_KEY = 'auth.password.min.length';
const PW_REQUIRE_SPECIAL_KEY = 'auth.password.require.special';

interface SecurityConfig {
  passwordPolicy: string;
  passwordMinLength: number;
  requireSpecialChar: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  passwordPolicy: 'medium',
  passwordMinLength: 8,
  requireSpecialChar: true,
};

/**
 * 根据密码策略生成提示文字
 */
function getPasswordHint(config: SecurityConfig): string {
  const parts: string[] = [`至少${config.passwordMinLength}个字符`];

  switch (config.passwordPolicy) {
    case 'low':
      if (config.requireSpecialChar) parts.push('包含特殊字符');
      break;
    case 'high':
      parts.push('包含大写字母、小写字母、数字和特殊字符');
      break;
    case 'medium':
    default:
      parts.push('同时包含字母和数字');
      if (config.requireSpecialChar) parts.push('包含特殊字符');
      break;
  }

  return '密码要求：' + parts.join('，');
}

/**
 * 根据密码策略生成动态的密码校验规则
 */
function getPasswordRules(config: SecurityConfig): any[] {
  const rules: any[] = [
    { required: true, message: '请输入密码' },
    { min: config.passwordMinLength, message: `密码至少${config.passwordMinLength}个字符` },
  ];

  switch (config.passwordPolicy) {
    case 'low':
      if (config.requireSpecialChar) {
        rules.push({
          pattern: /[^a-zA-Z0-9]/,
          message: '密码必须包含至少一个特殊字符',
        });
      }
      break;
    case 'high':
      rules.push({
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
        message: '密码必须包含大写、小写、数字和特殊字符',
      });
      break;
    case 'medium':
    default:
      rules.push({
        pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/,
        message: '密码必须同时包含字母和数字',
      });
      if (config.requireSpecialChar) {
        rules.push({
          pattern: /[^a-zA-Z0-9]/,
          message: '密码必须包含至少一个特殊字符',
        });
      }
      break;
  }

  return rules;
}

export const LoginPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [allowRegistration, setAllowRegistration] = React.useState<boolean | null>(null);
  const [securityConfig, setSecurityConfig] = React.useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [registerForm] = Form.useForm();
  const [activeTab, setActiveTab] = React.useState('login');
  const [teams, setTeams] = React.useState<any[]>([]);
  const [teamsFetched, setTeamsFetched] = React.useState(false);

  // 读取系统配置中的"允许注册"开关和安全配置
  React.useEffect(() => {
    let cancelled = false;
    foundationService.config
      .getPublic()
      .then((configs: Record<string, string>) => {
        if (cancelled) return;
        const raw = configs[REGISTRATION_CONFIG_KEY];
        setAllowRegistration(raw === 'true');

        // 读取密码策略配置
        const policy = configs[PW_POLICY_KEY] || 'medium';
        const minLengthRaw = configs[PW_MIN_LENGTH_KEY];
        const requireSpecialRaw = configs[PW_REQUIRE_SPECIAL_KEY];

        setSecurityConfig({
          passwordPolicy: policy,
          passwordMinLength: minLengthRaw ? parseInt(minLengthRaw, 10) || 8 : 8,
          requireSpecialChar: requireSpecialRaw === 'true',
        });
      })
      .catch(() => {
        if (!cancelled) setAllowRegistration(false);
      });
    return () => { cancelled = true; };
  }, []);

  /**
   * handleTabChange。
   */
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'register') {
      registerForm.resetFields();
      // 首次切换到注册Tab时才拉取团队空间列表
      if (!teamsFetched) {
        setTeamsFetched(true);
        teamService.getTeamTree(true).then(setTeams).catch((err) => {
          console.error('获取团队空间列表失败:', err);
        });
      }
    }
  };

  /**
   * handleLogin。
   */
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      // Error already handled in store
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleRegister。
   */
  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      // 调用注册接口
      const response: RegisterResponse = await authService.register({
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        email: values.email,
        realName: values.realName,
        teamId: values.teamId,
        phone: values.phone || undefined,
      });

      // 邮箱验证流程：显示提示信息，切换到登录区域
      message.success(response.message || '注册成功，请查看邮箱完成账户激活');
      registerForm.resetFields();
      setActiveTab('login');
    } catch (error) {
      // Error already handled by HTTP interceptor
    } finally {
      setLoading(false);
    }
  };

  // 读取注册开关配置时的加载态
  if (allowRegistration === null) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const passwordHint = getPasswordHint(securityConfig);
  const passwordRules = getPasswordRules(securityConfig);

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                border: 'none',
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              忘记密码？ <Link to="/forgot-password">找回密码</Link>
            </Text>
          </div>
        </Form>
      ),
    },
  ];

  // 仅当系统配置允许注册时才显示注册Tab
  if (allowRegistration) {
    tabItems.push({
      key: 'register',
      label: '注册',
      children: (
        <Form
          form={registerForm}
          name="register"
          onFinish={handleRegister}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, max: 20, message: '用户名长度4-20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="realName"
            rules={[
              { required: true, message: '请输入真实姓名' },
              { max: 50, message: '真实姓名长度不能超过50个字符' },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="真实姓名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="teamId"
            label="团队空间"
            rules={[
              { required: true, message: '请选择团队空间' },
            ]}
          >
            <Select
              placeholder="请选择团队空间"
              size="large"
            >
              {teams.map((team: any) => (
                <Select.Option key={team.id} value={String(team.id)}>
                  {team.teamName || team.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            rules={passwordRules}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>{passwordHint}</Text>}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                border: 'none',
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    });
  }

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        centered
        items={tabItems}
      />
    </div>
  );
};

export default LoginPage;
