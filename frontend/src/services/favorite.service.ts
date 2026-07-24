/**
 * 前端 API 服务：favorite.service。
 */
import { http } from './request';

/**
 * 用户收藏服务
 *
 * @author 一线大厂标准
 * @since 1.0.0
 */
export const favoriteService = {
  /**
   * 切换收藏状态
   * @param documentId 文档ID
   * @returns 收藏状态
   */
  toggleFavorite: (documentId: string) => {
    return http.post<boolean>(`/document/favorite/toggle/${documentId}`);
  },

  /**
   * 添加收藏
   * @param documentId 文档ID
   * @returns 是否成功
   */
  addFavorite: (documentId: string) => {
    return http.post<boolean>(`/document/favorite/add/${documentId}`);
  },

  /**
   * 取消收藏
   * @param documentId 文档ID
   * @returns 是否成功
   */
  removeFavorite: (documentId: string) => {
    return http.delete<boolean>(`/document/favorite/remove/${documentId}`);
  },

  /**
   * 检查是否已收藏
   * @param documentId 文档ID
   * @returns 是否已收藏
   */
  checkFavorite: (documentId: string) => {
    return http.get<boolean>(`/document/favorite/check/${documentId}`);
  },

  /**
   * 获取用户收藏列表
   * @returns 收藏列表
   */
  getFavorites: () => {
    return http.get<any[]>('/document/favorite/list');
  },

  /**
   * 获取文档收藏数量
   * @param documentId 文档ID
   * @returns 收藏数量
   */
  getFavoriteCount: (documentId: string) => {
    return http.get<number>(`/document/favorite/count/${documentId}`);
  },
};

export default favoriteService;
