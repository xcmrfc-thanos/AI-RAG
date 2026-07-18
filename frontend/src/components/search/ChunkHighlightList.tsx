import React from 'react';
import type { SearchResult } from '@/types';
import { resolveSearchHighlight } from './search-utils';

export interface ChunkHighlightListProps {
  resultId: string;
  chunks: NonNullable<SearchResult['chunks']>;
  query: string;
  expanded: boolean;
  onToggle: (resultId: string) => void;
}

/**
 * 搜索结果命中片段折叠列表。
 */
export const ChunkHighlightList: React.FC<ChunkHighlightListProps> = ({
  resultId,
  chunks,
  query,
  expanded,
  onToggle,
}) => {
  if (!chunks.length) {
    return null;
  }

  return (
    <div
      className="result-chunks"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(resultId);
      }}
    >
      <div className="chunks-toggle">
        相关片段 ({chunks.length})
        <span className={`toggle-arrow ${expanded ? 'expanded' : ''}`}>&#9654;</span>
      </div>
      {expanded && chunks.map((chunk, idx) => {
        const text = chunk.content.length > 300
          ? `${chunk.content.slice(0, 300)}...`
          : chunk.content;
        const html = resolveSearchHighlight(text, query);

        return (
          <div key={chunk.chunkId || idx} className="chunk-item">
            {chunk.heading && <div className="chunk-heading">{chunk.heading}</div>}
            <div
              className="chunk-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ChunkHighlightList;
