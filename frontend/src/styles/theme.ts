/**
 * 主题与样式变量。
 */
import { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#2563eb',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    // 中性色
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBgSpotlight: '#f1f5f9',

    // 边框
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',

    // 文字
    colorTextBase: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#cbd5e1',

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusOuter: 8,

    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,

    // 行高
    lineHeight: 1.5,
    lineHeightLG: 1.6,
    lineHeightSM: 1.4,

    // 间距
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,

    // 动画
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',

    // 阴影
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 8px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      headerColor: '#0f172a',
      siderBg: '#ffffff',
      bodyBg: '#f8fafc',
    },

    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      itemHeight: 40,
      itemActiveBg: '#eff6ff',
      itemSelectedBg: '#eff6ff',
      itemSelectedColor: '#2563eb',
    },

    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      paddingMD: 16,
    },

    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingInlineLG: 20,
      paddingInlineSM: 12,
    },

    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingInline: 12,
    },

    Select: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },

    Modal: {
      borderRadiusLG: 12,
    },

    Table: {
      borderRadiusLG: 8,
      headerBg: '#f8fafc',
      headerColor: '#475569',
    },

    Tabs: {
      itemActiveColor: '#2563eb',
      itemSelectedColor: '#2563eb',
    },

    Tag: {
      borderRadiusSM: 4,
    },

    Avatar: {
      borderRadius: 50,
    },

    Form: {
      itemMarginBottom: 16,
      verticalLabelPadding: '0 0 8px',
    },

    Progress: {
      borderRadius: 8,
    },

    Radio: {
      buttonBg: '#f8fafc',
      buttonSolidCheckedColor: '#ffffff',
      colorBorder: '#d9d9d9',
    },

    Slider: {
      railBg: '#f1f5f9',
      trackBg: '#2563eb',
      handleActiveColor: '#2563eb',
    },

    Switch: {
      handleBg: '#ffffff',
    },

    DatePicker: {
      borderRadius: 8,
      controlHeight: 36,
    },

    Rate: {
      starColor: '#f59e0b',
    },

    Breadcrumb: {
      separatorColor: '#cbd5e1',
      separatorMargin: 8,
    },

    Divider: {
      marginLG: 24,
      marginSM: 16,
      marginXS: 8,
    },

    Dropdown: {
      borderRadius: 8,
    },

    Alert: {
      borderRadius: 8,
    },

    Message: {
      borderRadius: 8,
    },

    Notification: {
      borderRadius: 8,
    },

    Popover: {
      borderRadius: 8,
    },

    Tooltip: {
      borderRadius: 6,
    },

    Pagination: {
      borderRadius: 8,
      itemActiveBgDisabled: '#f1f5f9',
    },

    Steps: {
      navArrowColor: '#94a3b8',
    },

    Transfer: {
      borderRadius: 8,
    },

    Tree: {
      nodeSelectedBg: '#eff6ff',
    },
  },
  algorithm: undefined, // 默认算法
};

export default theme;
