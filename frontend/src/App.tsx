import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { setMessageApi } from '@/utils/message-holder';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { useAuthStore } from './stores';
import { tokenStorage } from '@/utils/token-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import 'antd/dist/reset.css';
import './styles/global.css';

dayjs.locale('zh-cn');

/**
 * 全局消息注入组件
 * 从 AntdApp.useApp() 获取 message 实例，注入到 messageHolder 供非组件文件使用
 */
const GlobalMessageHolder: React.FC = () => {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setMessageApi(message);
  }, [message]);
  return null;
};

const App: React.FC = () => {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // 页面加载时检查用户认证状态（只执行一次）
    const token = tokenStorage.getAccessToken() || localStorage.getItem('token');

    // 只有在未认证且有token时才调用checkAuth，避免重复调用
    if (!isAuthenticated && token) {
      checkAuth().catch(error => {
        console.error('checkAuth失败:', error);
        tokenStorage.clearToken();
      });
    }
  }, [checkAuth, isAuthenticated]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorTextBase: '#0f172a',
          colorTextSecondary: '#475569',
          colorTextTertiary: '#94a3b8',
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 4,
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
          fontSize: 14,
          fontSizeHeading1: 32,
          fontSizeHeading2: 24,
          fontSizeHeading3: 20,
          fontSizeHeading4: 16,
          fontSizeHeading5: 14,
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            headerHeight: 64,
            siderBg: '#ffffff',
          },
          Menu: {
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemPaddingInline: 12,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
            controlHeightLG: 44,
            controlHeightSM: 28,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
            controlHeightLG: 44,
            controlHeightSM: 28,
          },
        },
      }}
    >
      <AntdApp>
        <GlobalMessageHolder />
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
