import React from 'react';
import './DocumentCard.css';

export type DocumentCategoryType = 'tech' | 'business' | 'ai';

/** 文档卡片预览区渐变背景（按索引循环） */
export const DOCUMENT_CARD_GRADIENTS = [
  'linear-gradient(135deg, #dbeafe, #bfdbfe)',
  'linear-gradient(135deg, #ede9fe, #ddd6fe)',
  'linear-gradient(135deg, #d1fae5, #a7f3d0)',
  'linear-gradient(135deg, #ffedd5, #fed7aa)',
  'linear-gradient(135deg, #cffafe, #a5f3fc)',
  'linear-gradient(135deg, #fce7f3, #fbcfe8)',
];

const CATEGORY_TYPE_MAP: Record<string, DocumentCategoryType> = {
  '技术': 'tech',
  'AI': 'ai',
  '业务': 'business',
  '合规': 'business',
};

export interface DocumentCardProps {
  title: string;
  excerpt?: string;
  authorName?: string;
  categoryName?: string;
  categoryType?: DocumentCategoryType;
  publishTime?: string;
  viewCount?: number;
  favoriteCount?: number;
  previewGradient?: string;
  trendBadge?: { label: string; className: string };
  listView?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface DocumentsGridProps {
  listView?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * 将分类名称映射为 document-card 徽章样式类型。
 */
export const resolveDocumentCategoryType = (categoryName?: string): DocumentCategoryType => {
  if (!categoryName) {
    return 'tech';
  }
  return CATEGORY_TYPE_MAP[categoryName] || 'tech';
};

/**
 * 格式化浏览量/收藏量等数字展示。
 */
export const formatDocumentCardNumber = (num: number): string => {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  }
  return num.toLocaleString('zh-CN');
};

/**
 * 文档卡片网格容器，支持 grid / list 两种布局。
 */
export const DocumentsGrid: React.FC<DocumentsGridProps> = ({
  listView = false,
  className,
  children,
}) => {
  const classes = ['documents-grid', listView ? 'list-view' : '', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes}>{children}</div>;
};

/**
 * 企业文档卡片（网格/列表），用于首页、统计等场景的文档展示。
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  excerpt = '',
  authorName = '未知',
  categoryName = '文档',
  categoryType,
  publishTime,
  viewCount = 0,
  favoriteCount = 0,
  previewGradient,
  trendBadge,
  listView = false,
  onClick,
  className,
}) => {
  const badgeType = categoryType || resolveDocumentCategoryType(categoryName);
  const authorInitials = authorName.length > 0 ? authorName.substring(0, 2).toUpperCase() : '?';
  const cardClass = ['document-card', listView ? 'list-view' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cardClass} onClick={onClick} role="presentation">
      <div
        className="doc-preview"
        style={{ background: previewGradient || DOCUMENT_CARD_GRADIENTS[0] }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        {trendBadge && (
          <span className={`doc-trend-badge ${trendBadge.className}`}>{trendBadge.label}</span>
        )}
        <span className={`doc-badge ${badgeType}`}>{categoryName}</span>
      </div>
      <div className="doc-content">
        <div className="doc-content-main">
          <h3 className="doc-title">{title}</h3>
          {excerpt ? <p className="doc-excerpt">{excerpt}</p> : null}
        </div>
        <div className="doc-meta">
          <div className="doc-author">
            <div className="doc-author-avatar">{authorInitials}</div>
            <span className="doc-author-name">{authorName}</span>
          </div>
          {publishTime ? <span className="doc-publish-time">{publishTime}</span> : null}
          <div className="doc-stats">
            <span className="doc-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {formatDocumentCardNumber(viewCount)}
            </span>
            <span className="doc-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {formatDocumentCardNumber(favoriteCount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
