import React from 'react';
import { Tag } from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  FolderOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { EntityId, SearchResult } from '@/types';
import { ChunkHighlightList } from './ChunkHighlightList';
import type { SearchMode } from './SearchModeToggle';
import {
  formatRawScoreChip,
  formatRelevancePercent,
  getScoreColor,
  getTypeColor,
  resolveSearchHighlight,
} from './search-utils';

export interface SearchResultCardProps {
  result: SearchResult;
  searchMode: SearchMode;
  query: string;
  /** 当前结果页最高相关分，用于相对归一避免 900%+ */
  maxScore?: number;
  expanded: boolean;
  onToggleChunks: (resultId: string) => void;
  onClick: (e: React.MouseEvent, documentId: EntityId) => void;
}

/**
 * 根据结果类型返回图标。
 */
const getIconForType = (type: string) => {
  switch (type) {
    case 'document':
      return <FileTextOutlined />;
    case 'user':
      return <UserOutlined />;
    case 'category':
      return <FolderOutlined />;
    default:
      return <FileTextOutlined />;
  }
};

/**
 * 单条搜索结果卡片。
 */
export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  searchMode,
  query,
  maxScore,
  expanded,
  onToggleChunks,
  onClick,
}) => {
  const resultId = String(result.id);

  return (
    <div
      className="search-result"
      onClick={(e) => onClick(e, result.id)}
    >
      <div className="result-header">
        <div className="result-icon">
          {getIconForType('document')}
        </div>
        <div className="result-title-wrapper">
          <div className="result-badges">
            <Tag className={`result-badge ${getTypeColor('tech')}`}>
              文档
            </Tag>
            {result.score !== undefined && (
              <span
                className="result-score-badge"
                style={{ color: getScoreColor(result.score, maxScore) }}
                title="相对本页结果的相关度（非绝对命中率）"
              >
                {formatRelevancePercent(result.score, maxScore)}
              </span>
            )}
          </div>
          <h3
            className="result-title"
            dangerouslySetInnerHTML={{ __html: result.title || '未命名文档' }}
          />

          {result.summary && (
            <div
              className="result-excerpt"
              dangerouslySetInnerHTML={{
                __html: resolveSearchHighlight(result.summary, query),
              }}
            />
          )}

          {result.highlights && result.highlights.length > 0 && (
            <div className="result-highlights">
              {result.highlights.slice(0, 2).map((h, i) => (
                <div
                  key={i}
                  className="result-excerpt"
                  dangerouslySetInnerHTML={{ __html: h }}
                />
              ))}
            </div>
          )}

          {result.chunks && result.chunks.length > 0 && (
            <ChunkHighlightList
              resultId={resultId}
              chunks={result.chunks}
              query={query}
              expanded={expanded}
              onToggle={onToggleChunks}
            />
          )}

          {searchMode === 'hybrid' && (
            <div className="score-breakdown">
              {result.bm25Score !== undefined && (
                <span className="score-chip bm25" title="关键词检索原始分">
                  BM25 {formatRawScoreChip(result.bm25Score)}
                </span>
              )}
              {result.vectorScore !== undefined && (
                <span className="score-chip vector" title="向量检索原始分">
                  向量 {formatRawScoreChip(result.vectorScore)}
                </span>
              )}
              {result.rerankScore !== undefined && (
                <span className="score-chip rerank" title="重排原始分">
                  重排 {formatRawScoreChip(result.rerankScore)}
                </span>
              )}
            </div>
          )}

          <div className="result-meta">
            {result.categoryName && (
              <span className="meta-item">
                <FolderOutlined />
                {result.categoryName}
              </span>
            )}
            <span className="meta-item">
              <ClockCircleOutlined />
              {result.publishAt || '暂无时间'}
            </span>
            {result.creatorName && (
              <span className="meta-item">
                <UserOutlined />
                {result.creatorName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultCard;
