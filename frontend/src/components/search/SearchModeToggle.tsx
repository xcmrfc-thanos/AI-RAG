import React from 'react';
import { Tooltip } from 'antd';
import { FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';

export type SearchMode = 'keyword' | 'hybrid';

export interface SearchModeToggleProps {
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

/**
 * 关键词 / 混合智能搜索模式切换。
 */
export const SearchModeToggle: React.FC<SearchModeToggleProps> = ({
  searchMode,
  onModeChange,
}) => {
  return (
    <div className="search-mode-toggle">
      <button
        type="button"
        className={`mode-btn ${searchMode === 'keyword' ? 'active' : ''}`}
        onClick={() => onModeChange('keyword')}
      >
        <FileTextOutlined /> 关键词搜索
      </button>
      <Tooltip title="BM25 + 向量语义检索 + RRF 融合；默认关闭 LLM 重排以提升响应速度">
        <button
          type="button"
          className={`mode-btn hybrid ${searchMode === 'hybrid' ? 'active' : ''}`}
          onClick={() => onModeChange('hybrid')}
        >
          <ThunderboltOutlined /> 混合智能搜索
        </button>
      </Tooltip>
    </div>
  );
};

export default SearchModeToggle;
