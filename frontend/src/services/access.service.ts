import { http } from './request';

/**
 * 文档访问记录服务
 *
 * @author 一线大厂标准
 * @since 1.0.0
 */
export const accessService = {
  /**
   * 记录文档访问
   * @param documentId 文档ID
   * @param documentTitle 文档标题
   * @returns 是否成功
   */
  recordAccess: (documentId: string, documentTitle: string) => {
    return http.post<boolean>('/document/access/record', {
      documentId,
      documentTitle,
    });
  },

  /**
   * 获取用户最近访问记录
   * @param limit 查询数量限制
   * @returns 访问记录列表
   */
  getRecentAccess: (limit?: number) => {
    const params = limit ? { limit } : {};
    return http.get<any[]>('/document/access/recent', { params });
  },

  /**
   * 删除单条访问记录
   * @param documentId 文档ID
   * @returns 是否成功
   */
  deleteAccess: (documentId: string) => {
    return http.delete<boolean>(`/document/access/remove/${documentId}`);
  },

  /**
   * 清空用户所有访问记录
   * @returns 是否成功
   */
  clearAllAccess: () => {
    return http.delete<boolean>('/document/access/clear');
  },
};

export default accessService;
