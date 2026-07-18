import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Card, Result } from 'antd';
import { App } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services';

const { Title, Text, Paragraph } = Typography;

export const ForgotPasswordPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resetSuccess, setResetSuccess] = useState(false);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authService.sendResetCode(values.email);
      setEmail(values.email);
      setCurrentStep(1);
      setCountdown(60); // 60秒倒计时
      message.success('验证码已发送到您的邮箱');
    } catch (error) {
      // Error already handled by HTTP interceptor
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码并进入下一步
  const handleVerifyCode = async (values: { code: string }) => {
    setLoading(true);
    try {
      await authService.verifyResetCode(email, values.code);
      setCode(values.code);
      setCurrentStep(2);
      message.success('验证成功，请设置新密码');
    } catch (error) {
      // Error already handled by HTTP interceptor
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        code,
        newPassword: values.newPassword,
      });
      setResetSuccess(true);
      message.success('密码重置成功，请使用新密码登录');
    } catch (error) {
      // Error already handled by HTTP interceptor
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;

    setLoading(true);
    try {
      await authService.sendResetCode(email);
      setCountdown(60);
      message.success('验证码已重新发送');
    } catch (error) {
      // Error already handled by HTTP interceptor
    } finally {
      setLoading(false);
    }
  };

  // 返回登录
  const handleBackToLogin = () => {
    navigate('/login');
  };

  // 成功页面
  if (resetSuccess) {
    return (
      <Card style={styles.card}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#10b981', fontSize: 72 }} />}
          title={<span style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>密码重置成功！</span>}
          subTitle={<span style={{ fontSize: 15, color: '#6b7280' }}>您的密码已成功重置，现在可以使用新密码登录系统。</span>}
          extra={[
            <Button
              key="login"
              type="primary"
              size="large"
              onClick={handleBackToLogin}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              }}
            >
              前往登录
            </Button>,
            <Button
              key="back"
              size="large"
              onClick={() => setResetSuccess(false)}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
                border: '2px solid #e5e7eb',
              }}
            >
              返回首页
            </Button>,
          ]}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
        {/* 头部 */}
        <div style={styles.header}>
          <Title level={2} style={styles.title}>
            找回密码
          </Title>
          <Text type="secondary" style={styles.subtitle}>
            通过邮箱验证重置您的账户密码
          </Text>
        </div>

        {/* 步骤1：输入邮箱 */}
        {currentStep === 0 && (
          <Form
            name="send-code"
            onFinish={handleSendCode}
            layout="vertical"
            style={styles.form}
          >
            <div style={styles.emailInfo}>
              <Text type="secondary">请输入您注册时使用的邮箱地址，我们将发送验证码到您的邮箱。</Text>
            </div>

            <Form.Item
              name="email"
              label="注册邮箱"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入您的注册邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={styles.button}
              >
                发送验证码
              </Button>
            </Form.Item>

            <div style={styles.footer}>
              <Text type="secondary">记住密码了？</Text>
              <Link to="/login" style={styles.link}>返回登录</Link>
            </div>
          </Form>
        )}

        {/* 步骤2：验证验证码 */}
        {currentStep === 1 && (
          <Form
            name="verify-code"
            onFinish={handleVerifyCode}
            layout="vertical"
            style={styles.form}
          >
            <div style={styles.emailInfo}>
              <Text type="secondary">验证码已发送至：</Text>
              <Text strong style={{ marginLeft: 8 }}>{email}</Text>
            </div>

            <Form.Item
              name="code"
              label="验证码"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码为6位数字' },
                { pattern: /^\d+$/, message: '验证码必须为数字' },
              ]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="请输入6位验证码"
                size="large"
                maxLength={6}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={styles.button}
              >
                验证
              </Button>
            </Form.Item>

            <div style={styles.resendSection}>
              <Text type="secondary">没有收到验证码？</Text>
              <Button
                type="link"
                onClick={handleResendCode}
                disabled={countdown > 0}
                style={styles.link}
              >
                {countdown > 0 ? `${countdown}秒后重试` : '重新发送'}
              </Button>
            </div>

            <div style={styles.footer}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => { setCurrentStep(0); setCode(''); }}
                style={styles.link}
              >
                返回上一步
              </Button>
            </div>
          </Form>
        )}

        {/* 步骤3：设置新密码 */}
        {currentStep === 2 && (
          <Form
            name="reset-password"
            onFinish={handleResetPassword}
            layout="vertical"
            style={styles.form}
          >
            <div style={styles.emailInfo}>
              <Text type="secondary">请设置您的新密码，密码长度为6-20位，必须包含大小写字母和数字。</Text>
            </div>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
                { max: 20, message: '密码最多20个字符' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                  message: '密码必须包含大小写字母和数字',
                },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码（6-20位，包含大小写字母和数字）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
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
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={styles.button}
              >
                重置密码
              </Button>
            </Form.Item>

            <div style={styles.footer}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => { setCurrentStep(0); setCode(''); }}
                style={styles.link}
              >
                重新开始
              </Button>
            </div>
          </Form>
        )}

        {/* 底部帮助信息 */}
        <div style={styles.helpSection}>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
            遇到问题？
          </Paragraph>
          <ul style={styles.helpList}>
            <li>请确认输入的是您注册时使用的邮箱地址</li>
            <li>验证码有效期为10分钟</li>
            <li>如长时间未收到邮件，请检查垃圾邮件文件夹</li>
            <li>如有疑问，请联系系统管理员</li>
          </ul>
        </div>
      </Card>
  );
};

const styles = {
  card: {
    width: '100%',
    maxWidth: 520,
    margin: '40px auto',
    background: '#ffffff',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 8px 20px rgba(0, 0, 0, 0.04)',
    borderRadius: '20px',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  },
  title: {
    fontSize: 28,
    marginBottom: 10,
    color: '#1a1a1a',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: 400,
  },
  form: {
    marginTop: 20,
  },
  button: {
    height: 50,
    fontSize: 16,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
    marginTop: 8,
  },
  emailInfo: {
    padding: '18px 20px',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    borderRadius: '12px',
    marginBottom: 20,
    textAlign: 'left' as const,
    lineHeight: 1.7,
    border: '1px solid rgba(0, 0, 0, 0.04)',
    fontSize: 14,
    color: '#475569',
  },
  resendSection: {
    textAlign: 'center' as const,
    marginTop: 20,
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
  },
  link: {
    fontSize: 14,
    marginLeft: 8,
    color: '#2563eb',
    fontWeight: 500,
  },
  helpSection: {
    marginTop: 28,
    padding: '20px',
    background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  helpList: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.9,
  },
};

export default ForgotPasswordPage;
