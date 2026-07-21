import { EntityId } from '@/types';
import { http } from './request';
import { SearchResponse } from '@/types';

export interface SearchParams {
  keyword: string;
  searchMode?: 'keyword' | 'hybrid';
  topK?: number;
  enableRerank?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'time' | 'views';
  categoryIds?: Array<string | number>;
}

export interface SearchSuggestVO {
  text: string;
  type: string;
  documentId: EntityId;
}

export interface SearchHistoryVO {
  id: EntityId;
  keyword: string;
  count: number;
  createdAt?: string;
}

export const searchService = {
  // 智能搜索 (keyword / hybrid)
  search: (params: SearchParams, signal?: AbortSignal) => {
    const body: Record<string, unknown> = {
      keyword: (params.keyword || '').trim(),
      searchMode: params.searchMode || 'keyword',
      topK: params.topK || 10,
      enableRerank: params.enableRerank ?? false,
      current: params.page || 1,
      size: params.pageSize || 10,
      sortField: params.sortBy,
    };
    if (params.categoryIds && params.categoryIds.length > 0) {
      body.categoryIds = params.categoryIds.map((id) => Number(id));
    }
    return http.post<SearchResponse>('/search', body, signal ? { signal } : undefined);
  },

  // 搜索建议（自动补全）
  suggestions: (keyword: string, signal?: AbortSignal) => {
    return http.get<SearchSuggestVO[]>('/search/suggest', {
      params: { keyword: (keyword || '').trim(), size: 8 },
      ...(signal ? { signal } : {}),
    });
  },

  // 热门搜索
  hotSearch: () => {
    return http.get<string[]>('/search/hot');
  },

  // 搜索历史
  history: () => {
    return http.get<SearchHistoryVO[]>('/search/history');
  },

  // 清除搜索历史
  clearHistory: () => {
    return http.delete('/search/history');
  },
};

export default searchService;
