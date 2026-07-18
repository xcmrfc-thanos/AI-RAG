import React from 'react';

interface CategoryIconProps {
  icon?: string;
  variant?: 'sidebar' | 'avatar';
  size?: number;
}

/** 分类目录图标颜色映射 */
const ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  tech:         { bg: '#eff6ff', fg: '#3b82f6' },
  product:      { bg: '#f5f3ff', fg: '#8b5cf6' },
  business:     { bg: '#ecfdf5', fg: '#10b981' },
  hr:           { bg: '#fff7ed', fg: '#f97316' },
  finance:      { bg: '#ecfdf5', fg: '#059669' },
  marketing:    { bg: '#fdf2f8', fg: '#ec4899' },
  legal:        { bg: '#fffbeb', fg: '#d97706' },
  training:     { bg: '#eef2ff', fg: '#4f46e5' },
  backend:      { bg: '#f1f5f9', fg: '#64748b' },
  frontend:     { bg: '#fff1f2', fg: '#e11d48' },
  database:     { bg: '#f0fdfa', fg: '#0d9488' },
  devops:       { bg: '#fef2f2', fg: '#dc2626' },
  architecture: { bg: '#ecfeff', fg: '#0891b2' },
  requirement:  { bg: '#f5f3ff', fg: '#7c3aed' },
  design:       { bg: '#fdf2f8', fg: '#db2777' },
  planning:     { bg: '#fffbeb', fg: '#f59e0b' },
  competitive:  { bg: '#f0f9ff', fg: '#0284c7' },
};

const FALLBACK_COLOR = { bg: '#f8fafc', fg: '#94a3b8' };

/** 兼容旧数据的 emoji → 图标 key 映射 */
const EMOJI_TO_KEY: Record<string, string> = {
  '💻': 'tech',
  '📦': 'product',
  '📋': 'business',
  '👥': 'hr',
  '💰': 'finance',
  '📈': 'marketing',
  '⚖️': 'legal',
  '📚': 'training',
  '🔧': 'backend',
  '🎨': 'frontend',
  '🗄️': 'database',
  '🚀': 'devops',
  '🏗️': 'architecture',
  '📝': 'requirement',
  '🎭': 'design',
  '🎯': 'planning',
  '🔍': 'competitive',
  '📁': 'tech',
};

/** 将可能为 emoji 的 icon 值转换为标准 key */
const resolveIconKey = (icon?: string): string | undefined => {
  if (!icon) return undefined;
  // 如果已经是 key，直接返回
  if (ICON_COLORS[icon]) return icon;
  // 尝试 emoji → key 映射
  return EMOJI_TO_KEY[icon];
};

/**
 * 根据分类图标 key 返回对应的 SVG 图标（Feather-style stroke icons）。
 */
const getIconSvg = (rawIcon: string | undefined, variant: 'sidebar' | 'avatar'): React.ReactNode => {
  const icon = resolveIconKey(rawIcon);
  const size = variant === 'sidebar' ? 18 : 24;

  switch (icon) {
    // ─── 技术文档 ───
    case 'tech':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      );

    // ─── 产品文档 ───
    case 'product':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      );

    // ─── 业务流程 ───
    case 'business':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      );

    // ─── 人力资源 ───
    case 'hr':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );

    // ─── 财务制度 ───
    case 'finance':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );

    // ─── 市场营销 ───
    case 'marketing':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      );

    // ─── 合规法务 ───
    case 'legal':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      );

    // ─── 培训资料 ───
    case 'training':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      );

    // ─── 后端开发 ───
    case 'backend':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );

    // ─── 前端开发 ───
    case 'frontend':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      );

    // ─── 数据库 ───
    case 'database':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      );

    // ─── DevOps ───
    case 'devops':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          <line x1="12" y1="20" x2="12" y2="12"></line>
          <path d="M12 2v4m0 0l-4 4m4-4l4 4"></path>
        </svg>
      );

    // ─── 架构设计 ───
    case 'architecture':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      );

    // ─── 产品需求 ───
    case 'requirement':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      );

    // ─── UI设计 ───
    case 'design':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          <path d="M2 12h20"></path>
        </svg>
      );

    // ─── 产品规划 ───
    case 'planning':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      );

    // ─── 竞品分析 ───
    case 'competitive':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      );

    // ─── 默认 / 未匹配 ───
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      );
  }
};

/**
 * 分类目录图标组件。
 *
 * <p>sidebar 变体：18×18 纯 SVG，跟随父元素文字颜色，与「知识空间」侧边栏图标风格一致。</p>
 * <p>avatar  变体：带圆角彩色背景的方形图标容器，参考原型中 stat-icon 的设计语言。</p>
 */
const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, variant = 'sidebar', size }) => {
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

export default CategoryIcon;
