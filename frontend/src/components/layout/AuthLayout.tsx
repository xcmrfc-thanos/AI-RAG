import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { Logo } from '@/components/common';
import { useAppStore } from '@/stores';

const { Content } = Layout;

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const systemName = useAppStore((s) => s.systemName);
  const fetchAppConfig = useAppStore((s) => s.fetchAppConfig);
  useEffect(() => { fetchAppConfig(); }, [fetchAppConfig]);
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Content
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size="large" />
          <p style={{ fontSize: 14, color: '#8c8c8c', marginTop: 16 }}>
            {systemName}
          </p>
        </div>
        {children}
      </Content>
    </Layout>
  );
};

export default AuthLayout;
