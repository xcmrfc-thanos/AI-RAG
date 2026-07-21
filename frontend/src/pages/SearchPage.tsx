import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Select, Pagination, Card, Typography, Button, Switch, Space } from 'antd';
import {
  SearchOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { EntityId, SearchResult, DocumentCategory } from '@/types';
import { searchService, categoryService, settingsService } from '@/services';
import { useAppStore } from '@/stores';
import {
  SearchBox,
  SearchModeToggle,
  SearchResultCard,
  type SearchMode,
} from '@/components/search';
import { EmptyState, PageLoading } from '@/components/common';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import './SearchPage.css';

const { Option } = Select;

/**
 * 判断是否为请求取消错误，避免取消时误报失败。
 */
const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as { code?: string; name?: string };
  return e.code === 'ERR_CANCELED' || e.name === 'CanceledError' || e.name === 'AbortError';
};

const SearchContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  /** 混合检索是否请求重排；默认跟随系统设置 ragRerankEnabled */
  const [enableRerank, setEnableRerank] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searched, setSearched] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<Array<{ text: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hot searches & history
  const [hotSearches, setHotSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<Array<{ id: EntityId; keyword: string }>>([]);

  // Expanded chunks
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  // Filters
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'views'>('relevance');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    searchParams.get('category') || undefined,
  );
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  // Load hot searches & history on mount
  useEffect(() => {
    loadHotSearches();
    loadHistory();
    loadCategories();
    loadRerankSetting();

    return () => {
      searchAbortRef.current?.abort();
      suggestAbortRef.current?.abort();
      if (suggestTimer.current) {
        clearTimeout(suggestTimer.current);
      }
    };
  }, []);

  /**
   * 从系统设置读取默认重排开关（失败时保持关闭）。
   */
  const loadRerankSetting = async () => {
    try {
      const settings = await settingsService.getSettings();
      setEnableRerank(Boolean(settings?.rag?.ragRerankEnabled));
    } catch {
      /* ignore：保持默认关闭 */
    }
  };

  /**
   * 加载文档分类列表，供搜索筛选使用。
   */
  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch { /* ignore */ }
  };

  /**
   * 构建带关键词、分类与页码的搜索 URL。
   */
  const buildSearchUrl = (keyword: string, category?: string, currentPage = 1) => {
    const params = new URLSearchParams({ q: keyword.trim() });
    if (category) {
      params.set('category', category);
    }
    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }
    return `/search?${params.toString()}`;
  };

  // 由 URL 与搜索模式/排序统一触发检索，取消过期请求避免重复与竞态
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    const cat = searchParams.get('category') || undefined;
    const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    setCategoryId(cat);
    if (!q) {
      searchAbortRef.current?.abort();
      setQuery('');
      setSearched(false);
      setResults([]);
      setTotal(0);
      setPage(1);
      setLoading(false);
      setShowSuggestions(false);
      return;
    }

    setQuery(q);
    setPage(pageParam);
    setSearched(true);
    setShowSuggestions(false);
    setLoading(true);

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    let cancelled = false;

    const runSearch = async () => {
      try {
        const useRerank = searchMode === 'hybrid' && enableRerank;
        const response = await searchService.search({
          keyword: q,
          searchMode,
          topK: 10,
          enableRerank: useRerank,
          page: pageParam,
          pageSize,
          sortBy,
          categoryIds: cat ? [cat] : undefined,
        }, controller.signal);

        if (cancelled || controller.signal.aborted) {
          return;
        }

        setResults(response.records || []);
        setTotal(response.total || 0);
        loadHistory();
        loadHotSearches();
      } catch (error) {
        if (isAbortError(error) || cancelled || controller.signal.aborted) {
          return;
        }
        console.error('Search failed:', error);
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [searchParams, searchMode, sortBy, pageSize, enableRerank]);

  // Debounced suggestions
  const fetchSuggestions = useCallback(async (keyword: string) => {
    if (keyword.trim().length < 1) {
      suggestAbortRef.current?.abort();
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    try {
      const data = await searchService.suggestions(keyword, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (Array.isArray(data)) {
        setSuggestions(data.map((s: { text?: string }) => ({ text: s.text || String(s) })));
        setShowSuggestions(true);
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        return;
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
    }
    suggestTimer.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const loadHotSearches = async () => {
    try {
      const data = await searchService.hotSearch();
      if (Array.isArray(data)) {
        setHotSearches(data);
      }
    } catch { /* ignore */ }
  };

  const loadHistory = async () => {
    try {
      const data = await searchService.history();
      if (Array.isArray(data)) {
        setSearchHistory(data.map((h: { id: EntityId; keyword: string }) => ({
          id: h.id,
          keyword: h.keyword,
        })));
      }
    } catch { /* ignore */ }
  };

  const clearHistory = async () => {
    try {
      await searchService.clearHistory();
      setSearchHistory([]);
    } catch { /* ignore */ }
  };

  const handleSearch = (value?: string) => {
    const q = value || query;
    if (!q.trim()) {
      return;
    }
    setQuery(q);
    navigate(buildSearchUrl(q, categoryId));
    inputRef.current?.blur();
  };

  /**
   * 清除搜索关键词并重置到初始态，同步清空 URL 参数。
   */
  const handleClearSearch = () => {
    searchAbortRef.current?.abort();
    suggestAbortRef.current?.abort();
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
    }
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearched(false);
    setResults([]);
    setTotal(0);
    setPage(1);
    setExpandedChunks(new Set());
    setCategoryId(undefined);
    navigate('/search');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handlePageChange = (p: number) => {
    const q = query.trim();
    if (!q) {
      return;
    }
    navigate(buildSearchUrl(q, categoryId, p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHotClick = (term: string) => {
    setQuery(term);
    navigate(buildSearchUrl(term, categoryId));
  };

  /**
   * 处理搜索结果卡片点击：默认本页跳转，Ctrl/Cmd+点击在新标签打开。
   */
  const handleResultClick = (e: React.MouseEvent, documentId: EntityId) => {
    const path = `/documents/${documentId}`;
    if (e.ctrlKey || e.metaKey) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(path);
  };

  /**
   * 切换分类筛选并重新搜索。
   */
  const handleCategoryChange = (value: string | undefined) => {
    const nextCategory = value || undefined;
    setCategoryId(nextCategory);
    const q = query.trim();
    if (q) {
      navigate(buildSearchUrl(q, nextCategory));
    }
  };

  const toggleChunks = (resultId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  /**
   * 无结果时切换到混合搜索并重新检索。
   */
  const switchToHybridSearch = () => {
    if (searchMode === 'hybrid') {
      return;
    }
    setSearchMode('hybrid');
  };

  /**
   * 无结果时清除分类筛选并重新检索。
   */
  const clearCategoryAndSearch = () => {
    if (!categoryId) {
      return;
    }
    handleCategoryChange(undefined);
  };

  const handleSuggestionSelect = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    handleSearch(text);
  };

  /** 本页最高检索分，用于相关度相对归一 */
  const pageMaxScore = useMemo(
    () => Math.max(0, ...results.map((r) => (typeof r.score === 'number' ? r.score : 0))),
    [results],
  );

  return (
    <div className="search-page">
      <div className="search-container">
        <div className="search-header">
          <h1 className="search-title">{AI_ENTRY_COPY.search.title}</h1>
          <p className="search-subtitle">
            {searchMode === 'hybrid'
              ? AI_ENTRY_COPY.search.subtitleHybrid
              : AI_ENTRY_COPY.search.subtitleKeyword}
          </p>
        </div>

        <SearchBox
          query={query}
          loading={loading}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          inputRef={inputRef}
          onQueryChange={handleInputChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onSuggestionSelect={handleSuggestionSelect}
        />

        <SearchModeToggle
          searchMode={searchMode}
          onModeChange={setSearchMode}
        />

        {searchMode === 'hybrid' && (
          <Space className="rerank-toggle" style={{ marginTop: 12 }} size={8}>
            <Switch
              size="small"
              checked={enableRerank}
              onChange={setEnableRerank}
              checkedChildren="精排"
              unCheckedChildren="精排"
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              开启后调用重排打分模型；关闭则不显示重排分
            </Typography.Text>
          </Space>
        )}

        {loading && <PageLoading />}

        {!loading && searched && (
          <div className="results-section">
            <div className="results-header">
              <span className="results-count">
                找到 <strong>{total}</strong> 个相关结果
                <span className="mode-badge">
                  {searchMode === 'hybrid' ? '混合智能' : '关键词'}
                </span>
              </span>
              <div className="sort-dropdown">
                <span className="sort-label">分类：</span>
                <Select
                  allowClear
                  placeholder="全部分类"
                  value={categoryId}
                  onChange={handleCategoryChange}
                  className="sort-select"
                  style={{ minWidth: 140, marginRight: 16 }}
                >
                  {categories.map((cat) => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
                <span className="sort-label">排序方式：</span>
                <Select
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  className="sort-select"
                >
                  <Option value="relevance">相关度</Option>
                  <Option value="time">最新</Option>
                  <Option value="views">浏览量</Option>
                </Select>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="results-list">
                {results.map((result) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    searchMode={searchMode}
                    query={query}
                    maxScore={pageMaxScore}
                    enableRerank={searchMode === 'hybrid' && enableRerank}
                    expanded={expandedChunks.has(String(result.id))}
                    onToggleChunks={toggleChunks}
                    onClick={handleResultClick}
                  />
                ))}

                {total > pageSize && (
                  <div className="search-pagination">
                    <Pagination
                      current={page}
                      pageSize={pageSize}
                      total={total}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                type="search"
                className="no-results"
                descriptionNode={(
                  <div className="no-results-content">
                    <div className="no-results-title">未找到与「{query}」相关的结果</div>
                    <p className="no-results-text">
                      可以尝试以下方式提高命中率：
                    </p>
                    <ul className="no-results-tips">
                      <li>检查关键词拼写，或改用更短、更通用的词</li>
                      <li>切换到混合智能搜索，适合自然语言问句与语义相近内容</li>
                      {categoryId && <li>当前已限定分类，可尝试扩大搜索范围</li>}
                    </ul>
                    <div className="no-results-actions">
                      {searchMode === 'keyword' && (
                        <Button type="primary" icon={<ThunderboltOutlined />} onClick={switchToHybridSearch}>
                          切换到混合智能搜索
                        </Button>
                      )}
                      {categoryId && (
                        <Button onClick={clearCategoryAndSearch}>
                          清除分类筛选
                        </Button>
                      )}
                    </div>
                    {hotSearches.length > 0 && (
                      <div className="no-results-hot">
                        <span className="no-results-hot-label">热门搜索：</span>
                        {hotSearches.slice(0, 6).map((term) => (
                          <button
                            key={term}
                            type="button"
                            className="no-results-hot-link"
                            onClick={() => handleHotClick(term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        )}

        {!loading && !searched && (
          <div className="search-suggestions">
            <div className="suggestions-grid">
              <Card title={<span><FireOutlined style={{ color: '#f97316' }} /> 热门搜索</span>} className="suggestion-card">
                <div className="suggestion-card-body">
                  {hotSearches.length > 0 ? (
                    hotSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="suggestion-link"
                        onClick={() => handleHotClick(term)}
                      >
                        {term}
                      </button>
                    ))
                  ) : (
                    <div className="suggestion-empty">暂无热词</div>
                  )}
                </div>
              </Card>

              <Card
                title={<span><HistoryOutlined /> 搜索历史</span>}
                className="suggestion-card"
                extra={
                  searchHistory.length > 0 && (
                    <button type="button" className="clear-history-link" onClick={clearHistory}>
                      <DeleteOutlined /> 清空
                    </button>
                  )
                }
              >
                <div className="suggestion-card-body">
                  {searchHistory.length > 0 ? (
                    searchHistory.map((h) => (
                      <div
                        key={h.id}
                        className="history-row"
                        onClick={() => handleHotClick(h.keyword)}
                      >
                        <ClockCircleOutlined className="history-row-icon" />
                        {h.keyword}
                      </div>
                    ))
                  ) : (
                    <div className="suggestion-empty">暂无搜索历史</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchPage: React.FC = () => {
  const { enableFullTextSearch } = useAppStore();

  if (!enableFullTextSearch) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Card style={{ textAlign: 'center', maxWidth: 400 }}>
          <SearchOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
          <Typography.Title level={4}>全文搜索功能已关闭</Typography.Title>
          <Typography.Text type="secondary">管理员已在系统设置中关闭了全文搜索功能，如需使用请联系管理员。</Typography.Text>
        </Card>
      </div>
    );
  }

  return <SearchContent />;
};

export default SearchPage;
