/**
 * UI 组件：DocumentListCard。
 */
import React from 'react';
import { Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import './DocumentListCard.css';

export interface DocumentListCardProps {
  title: string;
  summary?: string;
  categoryName?: string;
  authorName?: string;
  timeLabel?: string;
  statusTag?: React.ReactNode;
  actions?: React.ReactNode;
  categoryIcon?: React.ReactNode;
  authorIcon?: React.ReactNode;
  timeIcon?: React.ReactNode;
  onClick?: () => void;
}

/**
 * 文档列表行卡片，用于最近访问等单列列表场景。
 */
export const DocumentListCard: React.FC<DocumentListCardProps> = ({
  title,
  summary,
  categoryName,
  authorName,
  timeLabel,
  statusTag,
  actions,
  categoryIcon,
  authorIcon,
  timeIcon,
  onClick,
}) => {
  return (
    <Card className="document-list-card" hoverable onClick={onClick}>
      <div className="card-content">
        <div className="card-header">
          <div className="title-row">
            <FileTextOutlined className="title-icon" />
            <span className="document-title">{title}</span>
            {statusTag}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </div>

        {summary ? <p className="document-summary">{summary}</p> : null}

        <div className="card-meta">
          {categoryName ? (
            <span className="meta-item">
              {categoryIcon}
              {categoryName}
            </span>
          ) : null}
          {authorName ? (
            <span className="meta-item">
              {authorIcon}
              {authorName}
            </span>
          ) : null}
          {timeLabel ? (
            <span className="meta-item time">
              {timeIcon}
              {timeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default DocumentListCard;
