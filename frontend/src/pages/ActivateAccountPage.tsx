/**
 * 业务页面：ActivateAccountPage。
 */
import React, { useEffect, useState } from 'react';
import { Typography, Spin, Result, Button } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '@/services';

const { Text } = Typography;

/**
 * 账户激活页面
 *
 * <p>通过邮件中的激活链接进入此页面（/activate?token=xxx），
 * 验证邮箱并激活账户，成功后跳转至登录页。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('激活链接无效：缺少激活令牌');
      return;
    }

    let cancelled = false;

    authService
      .verifyEmail(token)
      .then((msg) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(msg || '账户激活成功');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        // 后端返回的通常是 Result 包装的错误信息
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          '激活失败，请稍后重试';
        setMessage(errorMsg);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">正在验证激活链接...</Text>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Result
        status="error"
        title="激活失败"
        subTitle={message}
        extra={[
          <Link to="/login" key="login">
            <Button type="primary">返回登录</Button>
          </Link>,
        ]}
      />
    );
  }

  return (
    <Result
      status="success"
      title="激活成功"
      subTitle={message}
      extra={[
        <Link to="/login" key="login">
          <Button type="primary">前往登录</Button>
        </Link>,
      ]}
    />
  );
};

export default ActivateAccountPage;
