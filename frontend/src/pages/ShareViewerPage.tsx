import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Typography } from 'antd';
import { App } from 'antd';
import {
  LockOutlined,
  EyeOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  WarningOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { normalizeMarkdown } from '../utils/markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { documentService, ShareVO } from '@/services/document.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { APP_CONFIG } from '@/config';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// ─────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────
const tokens = {
  primary: '#1a56db',
  primaryHover: '#1e40af',
  primaryLight: '#e8f0fe',
  primaryGradient: 'linear-gradient(135deg, #1a56db 0%, #4f46e5 100%)',
  success: '#059669',
  successLight: '#ecfdf5',
  warning: '#d97706',
  warningLight: '#fffbeb',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerGradient: 'linear-gradient(135deg, #dc2626 0%, #e11d48 100%)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgElevated: '#ffffff',
  bgSubtle: '#f8fafc',
  borderLight: '#e2e8f0',
  borderMedium: '#cbd5e1',
  shadowXs: '0 1px 2px rgba(0,0,0,0.04)',
  shadowSm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
  shadowLg: '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
  shadowXl: '0 20px 40px -8px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.04)',
  radiusXs: '6px',
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '20px',
  radiusFull: '9999px',
  fontMono: "'SF Mono','Fira Code','Fira Mono','Roboto Mono','Menlo','Monaco','Consolas',monospace",
  fontSans: "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
  contentMaxWidth: '1100px',
  headerHeight: '60px',
};

// ─────────────────────────────────────
// Global Styles
// ─────────────────────────────────────
const globalCSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .share-viewer * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  .share-viewer {
    font-family: ${tokens.fontSans};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* ── Code Block ── */
  .share-viewer .code-block-wrapper {
    background: #1e1e2e;
    border-radius: ${tokens.radiusSm};
    margin: 24px 0;
    overflow: hidden;
    border: 1px solid #313244;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .share-viewer .code-block-wrapper .code-lang-label {
    padding: 8px 16px;
    font-size: 12px;
    color: #a6adc8;
    background: #181825;
    border-bottom: 1px solid #313244;
    font-family: ${tokens.fontMono};
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .share-viewer .code-block-wrapper .code-lang-label::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f38ba8;
    box-shadow: 14px 0 0 #fab387, 28px 0 0 #a6e3a1;
  }
  .share-viewer .code-block-wrapper pre {
    margin: 0;
    padding: 20px;
    overflow-x: auto;
    background: #1e1e2e;
  }
  .share-viewer .code-block-wrapper pre code {
    font-family: ${tokens.fontMono};
    font-size: 13.5px;
    line-height: 1.7;
    color: #cdd6f4;
  }

  /* ── Prism Tokens (Catppuccin Mocha) ── */
  .share-viewer .code-block-wrapper pre code .token.comment,
  .share-viewer .code-block-wrapper pre code .token.prolog,
  .share-viewer .code-block-wrapper pre code .token.doctype,
  .share-viewer .code-block-wrapper pre code .token.cdata {
    color: #6c7086;
    font-style: italic;
  }
  .share-viewer .code-block-wrapper pre code .token.punctuation { color: #bac2de; }
  .share-viewer .code-block-wrapper pre code .token.property,
  .share-viewer .code-block-wrapper pre code .token.tag,
  .share-viewer .code-block-wrapper pre code .token.boolean,
  .share-viewer .code-block-wrapper pre code .token.number,
  .share-viewer .code-block-wrapper pre code .token.constant,
  .share-viewer .code-block-wrapper pre code .token.symbol,
  .share-viewer .code-block-wrapper pre code .token.deleted { color: #fab387; }
  .share-viewer .code-block-wrapper pre code .token.selector,
  .share-viewer .code-block-wrapper pre code .token.attr-name,
  .share-viewer .code-block-wrapper pre code .token.string,
  .share-viewer .code-block-wrapper pre code .token.char,
  .share-viewer .code-block-wrapper pre code .token.builtin,
  .share-viewer .code-block-wrapper pre code .token.inserted { color: #a6e3a1; }
  .share-viewer .code-block-wrapper pre code .token.operator,
  .share-viewer .code-block-wrapper pre code .token.entity,
  .share-viewer .code-block-wrapper pre code .token.url { color: #89dceb; }
  .share-viewer .code-block-wrapper pre code .token.atrule,
  .share-viewer .code-block-wrapper pre code .token.attr-value,
  .share-viewer .code-block-wrapper pre code .token.keyword { color: #cba6f7; }
  .share-viewer .code-block-wrapper pre code .token.function { color: #89b4fa; }
  .share-viewer .code-block-wrapper pre code .token.class-name { color: #f9e2af; }
  .share-viewer .code-block-wrapper pre code .token.regex,
  .share-viewer .code-block-wrapper pre code .token.important,
  .share-viewer .code-block-wrapper pre code .token.variable { color: #f38ba8; }
  .share-viewer .code-block-wrapper pre code .token.important,
  .share-viewer .code-block-wrapper pre code .token.bold { font-weight: bold; }
  .share-viewer .code-block-wrapper pre code .token.italic { font-style: italic; }
  .share-viewer .code-block-wrapper pre code .token.namespace { opacity: 0.7; }

  /* ── Markdown Content ── */
  .share-viewer .markdown-body { color: ${tokens.textPrimary}; }
  .share-viewer .markdown-body h1 { font-size: 2em; font-weight: 800; margin: 48px 0 20px; color: ${tokens.textPrimary}; letter-spacing: -0.02em; line-height: 1.3; }
  .share-viewer .markdown-body h2 { font-size: 1.5em; font-weight: 700; margin: 40px 0 16px; color: ${tokens.textPrimary}; letter-spacing: -0.01em; line-height: 1.4; padding-bottom: 8px; border-bottom: 1px solid ${tokens.borderLight}; }
  .share-viewer .markdown-body h3 { font-size: 1.25em; font-weight: 600; margin: 32px 0 12px; color: ${tokens.textPrimary}; line-height: 1.5; }
  .share-viewer .markdown-body h4, .share-viewer .markdown-body h5, .share-viewer .markdown-body h6 { font-weight: 600; margin: 24px 0 8px; color: ${tokens.textSecondary}; }
  .share-viewer .markdown-body p { margin: 0 0 16px; line-height: 1.85; }
  .share-viewer .markdown-body a { color: ${tokens.primary}; text-decoration: none; border-bottom: 1px solid ${tokens.primaryLight}; transition: border-color 0.2s; }
  .share-viewer .markdown-body a:hover { border-bottom-color: ${tokens.primary}; }
  .share-viewer .markdown-body strong { font-weight: 700; color: ${tokens.textPrimary}; }
  .share-viewer .markdown-body blockquote { margin: 20px 0; padding: 16px 20px; border-left: 4px solid ${tokens.primary}; background: ${tokens.primaryLight}; border-radius: 0 ${tokens.radiusXs} ${tokens.radiusXs} 0; color: ${tokens.textSecondary}; }
  .share-viewer .markdown-body blockquote p:last-child { margin-bottom: 0; }
  .share-viewer .markdown-body ul, .share-viewer .markdown-body ol { margin: 0 0 16px; padding-left: 24px; }
  .share-viewer .markdown-body li { margin-bottom: 6px; line-height: 1.8; }
  .share-viewer .markdown-body hr { border: none; height: 1px; background: ${tokens.borderLight}; margin: 40px 0; }
  .share-viewer .markdown-body img { max-width: 100%; border-radius: ${tokens.radiusSm}; margin: 16px 0; }
  .share-viewer .markdown-body table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; border-radius: ${tokens.radiusSm}; overflow: hidden; border: 1px solid ${tokens.borderLight}; }
  .share-viewer .markdown-body th { background: ${tokens.bgSubtle}; font-weight: 700; text-align: left; padding: 12px 16px; border-bottom: 2px solid ${tokens.borderLight}; color: ${tokens.textPrimary}; }
  .share-viewer .markdown-body td { padding: 10px 16px; border-bottom: 1px solid ${tokens.borderLight}; color: ${tokens.textSecondary}; }
  .share-viewer .markdown-body tr:last-child td { border-bottom: none; }
  .share-viewer .markdown-body code:not(pre code) { background: ${tokens.bgSubtle}; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; font-family: ${tokens.fontMono}; border: 1px solid ${tokens.borderLight}; }
`;

// ─────────────────────────────────────
// View State
// ─────────────────────────────────────
type ViewState = 'loading' | 'verify' | 'password-error' | 'expired' | 'error' | 'content';

// ─────────────────────────────────────
// Sub-components
// ─────────────────────────────────────

/** Animated gradient background with floating orbs */
const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: tokens.bgPage,
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Decorative orbs */}
    <div style={{
      position: 'absolute',
      top: '-15%',
      right: '-10%',
      width: '500px',
      height: '500px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(26,86,219,0.06) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />
    <div style={{
      position: 'absolute',
      bottom: '-10%',
      left: '-8%',
      width: '400px',
      height: '400px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(79,70,229,0.04) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />
    {children}
  </div>
);

/** Centered layout for gate/error states */
const CenteredLayout: React.FC<{ children: React.ReactNode; animate?: boolean }> = ({ children, animate = true }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 24px',
    position: 'relative',
    zIndex: 1,
    animation: animate ? 'fadeInUp 0.5s ease-out' : undefined,
  }}>
    {children}
  </div>
);

/** Brand badge */
const BrandBadge: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    ...style,
  }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: tokens.radiusSm,
      background: tokens.primaryGradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
    }}>
      <ShareAltOutlined style={{ fontSize: 18, color: '#fff' }} />
    </div>
    <span style={{
      fontSize: 15,
      fontWeight: 700,
      color: tokens.textPrimary,
      letterSpacing: '-0.01em',
    }}>
      {APP_CONFIG.name}
    </span>
  </div>
);

/** Status card wrapper */
const StatusCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div style={{
    background: tokens.bgCard,
    borderRadius: tokens.radiusXl,
    padding: '48px 44px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
    boxShadow: tokens.shadowXl,
    border: `1px solid ${tokens.borderLight}`,
    animation: 'fadeInUp 0.4s ease-out',
  }}>
    <div style={{
      width: 80,
      height: 80,
      borderRadius: tokens.radiusFull,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
    }}>
      {icon}
    </div>
    <Typography.Title level={3} style={{ marginBottom: 12, color: tokens.textPrimary, fontWeight: 700, letterSpacing: '-0.01em' }}>
      {title}
    </Typography.Title>
    <Typography.Text style={{ fontSize: 15, color: tokens.textSecondary, lineHeight: 1.7, display: 'block', marginBottom: 28 }}>
      {description}
    </Typography.Text>
    {action}
  </div>
);


// ─────────────────────────────────────
// Main Component
// ─────────────────────────────────────
const ShareViewerPage: React.FC = () => {
  const { message } = App.useApp();
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [shareInfo, setShareInfo] = useState<ShareVO | null>(null);
  const [document, setDocument] = useState<{
    title: string;
    content: string;
    authorName?: string;
    publishTime?: string;
    viewCount?: number;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDocument = useCallback(async (pwd: string) => {
    if (!shareId) return;
    setVerifying(true);
    try {
      const doc = await documentService.accessPublicShare(shareId, pwd || undefined);
      setDocument(doc);
      setViewState('content');
    } catch (error: any) {
      const msg = error?.message || '访问失败';
      if (msg.includes('密码')) {
        setViewState('password-error');
      } else if (msg.includes('过期') || msg.includes('失效')) {
        setViewState('expired');
      } else {
        setViewState('error');
      }
      setErrorMessage(msg);
    } finally {
      setVerifying(false);
    }
  }, [shareId]);

  const loadShareInfo = useCallback(async () => {
    if (!shareId) return;
    setViewState('loading');
    try {
      const info = await documentService.getPublicShareInfo(shareId);
      setShareInfo(info);
      if (info.requirePassword) {
        setViewState('verify');
      } else {
        await loadDocument('');
      }
    } catch (error: any) {
      const msg = error?.message || '分享不存在或已失效';
      if (msg.includes('过期') || msg.includes('失效')) {
        setViewState('expired');
      } else {
        setViewState('error');
      }
      setErrorMessage(msg);
    }
  }, [loadDocument, shareId]);

  useEffect(() => {
    loadShareInfo();
  }, [loadShareInfo]);

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      message.warning('请输入访问密码');
      return;
    }
    await loadDocument(password);
  };

  // ─── Loading ───
  if (viewState === 'loading') {
    return (
      <Background>
        <CenteredLayout animate={false}>
          <BrandBadge />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: tokens.radiusFull,
              border: `3px solid ${tokens.borderLight}`,
              borderTopColor: tokens.primary,
              animation: 'spin 0.8s linear infinite',
            }} />
            <div>
              <Typography.Text style={{
                fontSize: 15,
                color: tokens.textSecondary,
                fontWeight: 500,
              }}>
                正在加载分享内容
              </Typography.Text>
              <span style={{
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
                color: tokens.textTertiary,
                fontSize: 15,
                marginLeft: 2,
              }}>...</span>
            </div>
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            ${globalCSS}
          `}</style>
        </CenteredLayout>
      </Background>
    );
  }

  // ─── Expired ───
  if (viewState === 'expired') {
    return (
      <Background>
        <CenteredLayout>
          <StatusCard
            icon={<ExclamationCircleOutlined style={{ fontSize: 36, color: tokens.warning }} />}
            title="分享已失效"
            description={errorMessage || '该分享链接已过期或已被分享者删除，请联系分享者重新获取链接。'}
            action={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  style={{
                    height: 44,
                    paddingLeft: 32,
                    paddingRight: 32,
                    borderRadius: tokens.radiusSm,
                    fontWeight: 600,
                    fontSize: 15,
                    background: tokens.primaryGradient,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
                  }}
                >
                  返回首页
                </Button>
                <BrandBadge style={{ marginBottom: 0, marginTop: 16, opacity: 0.6, transform: 'scale(0.85)' }} />
              </div>
            }
          />
          <style>{globalCSS}</style>
        </CenteredLayout>
      </Background>
    );
  }

  // ─── Error / Not Found ───
  if (viewState === 'error') {
    return (
      <Background>
        <CenteredLayout>
          <StatusCard
            icon={<WarningOutlined style={{ fontSize: 36, color: tokens.danger }} />}
            title="无法访问"
            description={errorMessage || '分享链接不存在，请检查链接是否正确。'}
            action={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  style={{
                    height: 44,
                    paddingLeft: 32,
                    paddingRight: 32,
                    borderRadius: tokens.radiusSm,
                    fontWeight: 600,
                    fontSize: 15,
                    background: tokens.dangerGradient,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                  }}
                >
                  返回首页
                </Button>
                <BrandBadge style={{ marginBottom: 0, marginTop: 16, opacity: 0.6, transform: 'scale(0.85)' }} />
              </div>
            }
          />
          <style>{globalCSS}</style>
        </CenteredLayout>
      </Background>
    );
  }

  // ─── Password Gate ───
  if (viewState === 'verify' || viewState === 'password-error') {
    return (
      <Background>
        <CenteredLayout>
          <BrandBadge />

          <div style={{
            background: tokens.bgCard,
            borderRadius: tokens.radiusXl,
            padding: '48px 44px 36px',
            maxWidth: 440,
            width: '100%',
            boxShadow: tokens.shadowXl,
            border: `1px solid ${tokens.borderLight}`,
            animation: 'fadeInUp 0.45s ease-out',
          }}>
            {/* Lock icon */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: tokens.radiusFull,
              background: tokens.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <LockOutlined style={{ fontSize: 32, color: tokens.primary }} />
            </div>

            {/* Title & Info */}
            <Typography.Title level={3} style={{
              textAlign: 'center',
              marginBottom: 8,
              color: tokens.textPrimary,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}>
              {shareInfo?.title || '加密文档'}
            </Typography.Title>

            <Typography.Text style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 14,
              color: tokens.textSecondary,
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              由 <strong style={{ color: tokens.textPrimary }}>{shareInfo?.sharerName || '未知用户'}</strong> 分享
              {shareInfo?.description && (
                <><br /><span style={{ color: tokens.textTertiary, fontSize: 13 }}>{shareInfo.description}</span></>
              )}
            </Typography.Text>

            {/* Meta info */}
            {shareInfo?.shareTime && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                marginBottom: 28,
                fontSize: 12,
                color: tokens.textTertiary,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarOutlined style={{ fontSize: 13 }} />
                  {dayjs(shareInfo.shareTime).format('YYYY/MM/DD HH:mm')}
                </span>
                {shareInfo.accessCount != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <EyeOutlined style={{ fontSize: 13 }} />
                    {shareInfo.accessCount} 次访问
                  </span>
                )}
              </div>
            )}

            {/* Password input */}
            <div style={{ marginBottom: viewState === 'password-error' ? 8 : 20 }}>
              <Input.Password
                prefix={<LockOutlined style={{ color: tokens.textTertiary }} />}
                placeholder="请输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={handleVerifyPassword}
                size="large"
                autoFocus
                status={viewState === 'password-error' ? 'error' : undefined}
                style={{
                  height: 48,
                  borderRadius: tokens.radiusSm,
                  fontSize: 15,
                }}
              />
            </div>

            {viewState === 'password-error' && (
              <Typography.Text type="danger" style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 13,
                marginBottom: 16,
              }}>
                {errorMessage || '密码错误，请重试'}
              </Typography.Text>
            )}

            <Button
              type="primary"
              block
              size="large"
              loading={verifying}
              onClick={handleVerifyPassword}
              style={{
                height: 48,
                borderRadius: tokens.radiusSm,
                fontWeight: 600,
                fontSize: 15,
                background: tokens.primaryGradient,
                border: 'none',
                boxShadow: '0 2px 8px rgba(26,86,219,0.25)',
              }}
            >
              验证并访问
            </Button>

            {/* Security note */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 20,
              color: tokens.textTertiary,
              fontSize: 12,
            }}>
              <SafetyOutlined style={{ fontSize: 13 }} />
              安全加密分享，输入密码后即可查看
            </div>
          </div>

          <style>{globalCSS}</style>
        </CenteredLayout>
      </Background>
    );
  }

  // ─── Content View ───
  return (
    <div className="share-viewer" style={{
      minHeight: '100vh',
      background: tokens.bgPage,
    }}>
      <style>{globalCSS}</style>

      {/* ── Top Navigation Bar ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: tokens.headerHeight,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${tokens.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        animation: 'slideDown 0.35s ease-out',
      }}>
        {/* Left: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: tokens.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <Typography.Text style={{
            fontSize: 14,
            fontWeight: 600,
            color: tokens.textSecondary,
            letterSpacing: '-0.01em',
          }}>
            {APP_CONFIG.name}
          </Typography.Text>
        </div>

        {/* Right: Share context */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          color: tokens.textTertiary,
          flexShrink: 0,
        }}>
          <span>由</span>
          {shareInfo?.sharerName ? (
            <span style={{ fontWeight: 600, color: '#334155' }}>{shareInfo.sharerName}</span>
          ) : (
            <span style={{ fontWeight: 600, color: '#334155' }}>系统用户</span>
          )}
          <span>于</span>
          {shareInfo?.shareTime ? (
            <span style={{ fontWeight: 500, color: '#334155' }}>
              {dayjs(shareInfo.shareTime).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          ) : (
            <span style={{ fontWeight: 500, color: '#334155' }}>-</span>
          )}
          <span>分享</span>
        </div>
      </header>

      {/* ── Document Meta Card ── */}
      <div style={{
        maxWidth: tokens.contentMaxWidth,
        margin: '0 auto',
        padding: '28px 24px 0',
        animation: 'fadeInUp 0.45s ease-out',
      }}>
        <div style={{
          background: tokens.bgCard,
          borderRadius: tokens.radiusLg,
          padding: '28px 36px',
          boxShadow: tokens.shadowSm,
          border: `1px solid ${tokens.borderLight}`,
          marginBottom: 24,
        }}>
          {/* Title */}
          <Typography.Title level={2} style={{
            marginBottom: 16,
            color: tokens.textPrimary,
            fontWeight: 800,
            fontSize: '1.75em',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}>
            {document?.title || shareInfo?.title || '分享文档'}
          </Typography.Title>

          {/* Meta Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 13,
            color: tokens.textTertiary,
          }}>
            {shareInfo?.sharerName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: tokens.radiusFull,
                  background: tokens.primaryGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserOutlined style={{ fontSize: 10, color: '#fff' }} />
                </div>
                <span style={{ color: tokens.textSecondary }}>作者：</span>
                <span style={{ fontWeight: 500, color: tokens.textPrimary }}>{shareInfo.sharerName}</span>
              </span>
            )}
            {document?.publishTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CalendarOutlined style={{ fontSize: 12 }} />
                发布于 {dayjs(document.publishTime).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            )}
            {document?.viewCount != null && document.viewCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <EyeOutlined style={{ fontSize: 12 }} />
                {document.viewCount.toLocaleString()} 次阅读
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main style={{
        maxWidth: tokens.contentMaxWidth,
        margin: '0 auto',
        padding: '0 24px 80px',
        animation: 'fadeInUp 0.5s ease-out 0.1s both',
      }}>
        <article style={{
          background: tokens.bgCard,
          borderRadius: tokens.radiusLg,
          padding: '44px 48px',
          boxShadow: tokens.shadowSm,
          border: `1px solid ${tokens.borderLight}`,
        }}>
          {document?.content && document.content.trim() !== '' ? (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  pre: ({ children, ...props }: any) => {
                    const codeChild = props?.children?.[0];
                    const className = codeChild?.props?.className || '';
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    return (
                      <div className="code-block-wrapper">
                        <div className="code-lang-label">
                          {language || 'code'}
                        </div>
                        <pre>{children}</pre>
                      </div>
                    );
                  },
                }}
              >
                {normalizeMarkdown(document.content)}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '64px 0',
              color: tokens.textTertiary,
            }}>
              <FileTextOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block', color: tokens.borderMedium }} />
              <Typography.Text style={{ color: tokens.textTertiary, fontSize: 15 }}>文档内容为空</Typography.Text>
            </div>
          )}
        </article>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center',
        padding: '28px 24px',
        borderTop: `1px solid ${tokens.borderLight}`,
        background: tokens.bgCard,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          color: tokens.textTertiary,
          fontSize: 12,
        }}>
          <div style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: tokens.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          本文档分享，来自 <span style={{ fontWeight: 600, color: tokens.textSecondary }}>{APP_CONFIG.name}</span>
        </div>
      </footer>
    </div>
  );
};

export default ShareViewerPage;
