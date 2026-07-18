import React from 'react';

interface TeamIconProps {
  icon?: string;
  variant?: 'sidebar' | 'avatar';
  size?: number;
}

/** 团队图标颜色映射 */
const ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  tech:     { bg: '#eff6ff', fg: '#3b82f6' },
  product:  { bg: '#f5f3ff', fg: '#8b5cf6' },
  ops:      { bg: '#ecfdf5', fg: '#10b981' },
  admin:    { bg: '#fff7ed', fg: '#f97316' },
  backend:  { bg: '#f1f5f9', fg: '#64748b' },
  frontend: { bg: '#fdf2f8', fg: '#ec4899' },
  qa:       { bg: '#f0fdfa', fg: '#14b8a6' },
};

const FALLBACK_COLOR = { bg: '#f8fafc', fg: '#94a3b8' };

/** 兼容旧数据的 emoji → 图标 key 映射 */
const EMOJI_TO_KEY: Record<string, string> = {
  '🖥️': 'tech',
  '🎯': 'product',
  '📊': 'ops',
  '🏢': 'admin',
  '⚙️': 'backend',
  '🎨': 'frontend',
  '🧪': 'qa',
};

/** 将可能为 emoji 的 icon 值转换为标准 key */
const resolveIconKey = (icon?: string): string | undefined => {
  if (!icon) return undefined;
  if (ICON_COLORS[icon]) return icon;
  return EMOJI_TO_KEY[icon];
};

/**
 * 根据团队图标 key 返回对应的 SVG 图标（Feather-style stroke icons）。
 */
const getIconSvg = (rawIcon: string | undefined, variant: 'sidebar' | 'avatar'): React.ReactNode => {
  const icon = resolveIconKey(rawIcon);
  const size = variant === 'sidebar' ? 18 : 24;

  switch (icon) {
    // ─── 技术中心 ───
    case 'tech':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      );

    // ─── 产品中心 ───
    case 'product':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      );

    // ─── 运营中心 ───
    case 'ops':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      );

    // ─── 职能中心 ───
    case 'admin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="9" y1="6" x2="15" y2="6"></line>
          <line x1="9" y1="10" x2="15" y2="10"></line>
          <line x1="9" y1="14" x2="12" y2="14"></line>
        </svg>
      );

    // ─── 后端开发组 ───
    case 'backend':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      );

    // ─── 前端开发组 ───
    case 'frontend':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      );

    // ─── 测试组 ───
    case 'qa':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
          <line x1="9" y1="15" x2="9.01" y2="15"></line>
          <line x1="15" y1="15" x2="15.01" y2="15"></line>
        </svg>
      );

    // ─── 默认 / 未匹配 ───
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
  }
};

/**
 * 团队图标组件。
 *
 * <p>sidebar 变体：18×18 纯 SVG，跟随父元素文字颜色，与「知识空间」侧边栏图标风格一致。</p>
 * <p>avatar  变体：带圆角彩色背景的方形图标容器，参考原型中 stat-icon 的设计语言。</p>
 */
const TeamIcon: React.FC<TeamIconProps> = ({ icon, variant = 'sidebar', size }) => {
  const resolvedKey = resolveIconKey(icon);
  const colors = ICON_COLORS[resolvedKey || ''] || FALLBACK_COLOR;

  if (variant === 'sidebar') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.fg }}>
        {getIconSvg(icon, 'sidebar')}
      </span>
    );
  }

  // avatar variant
  const boxSize = size || 40;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: boxSize,
        height: boxSize,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${colors.bg}, ${colors.fg}22)`,
        color: colors.fg,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {getIconSvg(icon, 'avatar')}
      </span>
    </span>
  );
};

export default TeamIcon;
