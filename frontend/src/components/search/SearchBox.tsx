import React, { RefObject } from 'react';
import { SearchOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { resolveSearchHighlight } from './search-utils';

export interface SearchSuggestion {
  text: string;
}

export interface SearchBoxProps {
  query: string;
  loading: boolean;
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: (value?: string) => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSuggestionSelect: (text: string) => void;
}

/**
 * 搜索输入框：含清除、提交按钮与自动补全下拉。
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  loading,
  suggestions,
  showSuggestions,
  inputRef,
  onQueryChange,
  onSearch,
  onClear,
  onKeyDown,
  onFocus,
  onBlur,
  onSuggestionSelect,
}) => {
  return (
    <div className="search-box-wrapper">
      <div className="search-box-inner">
        <SearchOutlined className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索文档、用户、标签..."
          value={query}
          onChange={onQueryChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {query && (
          <CloseCircleOutlined
            className="search-clear-btn"
            onClick={onClear}
          />
        )}
      </div>
      <button className="search-btn" type="button" onClick={() => onSearch()}>
        {loading ? <LoadingOutlined spin /> : '搜索'}
      </button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="suggestion-item"
              onMouseDown={() => onSuggestionSelect(s.text)}
            >
              <SearchOutlined className="suggestion-icon" />
              <span dangerouslySetInnerHTML={{ __html: resolveSearchHighlight(s.text, query) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
