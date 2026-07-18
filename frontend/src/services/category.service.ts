import { http } from './request';
import { DocumentCategory, CategoryTree, PageParams } from '@/types';

export interface CategoryMoveParams {
  categoryId: string;
  targetParentId?: string;
  position?: number;
}

export const categoryService = {
  // 获取分类列表（平铺）
  getCategories: () => {
    return http.get<DocumentCategory[]>('/document/categories/list');
  },

  // 获取分类树
  getCategoryTree: () => {
    return http.get<CategoryTree[]>('/document/categories/tree');
  },

  // 获取一级分类（rootOnly，用于侧边栏）
  getRootCategories: () => {
    return http.get<CategoryTree[]>('/document/categories/children/0');
  },

  // 获取分类详情
  getCategory: (id: string) => {
    return http.get<DocumentCategory>(`/document/categories/${id}`);
  },

  // 创建分类
  createCategory: (data: {
    name: string;
    description?: string;
    icon?: string;
    parentId?: string;
    sort?: number;
  }) => {
    return http.post<DocumentCategory>('/document/categories', data);
  },

  // 更新分类
  updateCategory: (id: string, data: Partial<DocumentCategory>) => {
    return http.put<DocumentCategory>(`/document/categories/${id}`, data);
  },

  // 删除分类
  deleteCategory: (id: string) => {
    return http.delete(`/document/categories/${id}`);
  },

  // 移动分类
  moveCategory: (params: CategoryMoveParams) => {
    return http.post('/document/categories/move', params);
  },

  // 批量删除分类
  batchDeleteCategories: (ids: string[]) => {
    return http.delete('/document/categories/batch', { data: { ids } });
  },

  // 获取分类下的文档
  getCategoryDocuments: (categoryId: string, params?: PageParams) => {
    return http.get(`/document/categories/${categoryId}/documents`, { params });
  },

  // 获取分类统计
  getCategoryStats: () => {
    return http.get<Array<{
      categoryId: string;
      categoryName: string;
      documentCount: number;
      viewCount: number;
    }>>('/document/categories/stats');
  },

  // 搜索分类
  searchCategories: (keyword: string) => {
    return http.get<DocumentCategory[]>('/document/categories/search', { params: { keyword } });
  },
};

export default categoryService;
