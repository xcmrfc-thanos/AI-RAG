/**
 * 前端 API 服务：document.service。
 */
import type { AxiosProgressEvent } from 'axios';
import { http } from './request';
import request from './request';
import { Document, DocumentFilter } from '@/types';

export const documentService = {
  // 获取文档列表（分页）
  // 后端返回 IPage<DocumentVO> 结构：{ records, total, current, size }
  // 前端期望 DocumentListResponse 结构：{ list, total, page, pageSize }
  getDocuments: (filter: DocumentFilter) => {
    // 转换前端参数名为后端期望的参数名
    const params: Record<string, any> = {
      current: filter.page || 1,
      size: filter.pageSize || 10,
    };

    // 只添加后端支持的参数
    if (filter.categoryId) params.categoryId = filter.categoryId;
    if (filter.teamId) params.teamId = filter.teamId;
    if (filter.keyword) params.keyword = filter.keyword;
    if (filter.status !== undefined) params.status = filter.status;
    if (filter.authorId) params.authorId = filter.authorId;

    // 添加排序参数
    if (filter.sortBy) params.sortBy = filter.sortBy;
    if (filter.sortOrder) params.sortOrder = filter.sortOrder;

    return http.get<any>('/document/documents/page', { params }).then((data) => ({
      list: data.records || [],
      total: data.total || 0,
      page: data.current || 1,
      pageSize: data.size || 10,
    }));
  },

  // 获取文档详情
  getDocument: (id: string) => {
    return http.get<Document>(`/document/documents/${id}`);
  },

  // 获取文档的上一篇和下一篇
  getDocumentNeighbors: (id: string) => {
    return http.get<{ prevId: string | null; prevTitle: string | null; nextId: string | null; nextTitle: string | null }>(`/document/documents/${id}/neighbors`);
  },

  // 创建文档
  // 后端返回 Result<Long>，即文档ID
  createDocument: (data: any) => {
    return http.post<{ id: string }>('document/documents', data);
  },

  // 更新文档（注意：后端接口是 PUT /documents，id在请求体中）
  updateDocument: (id: string, data: Partial<Document>) => {
    return http.put<Document>('/document/documents', { ...data, id });
  },

  // 自动保存文档（创建或更新草稿，允许空标题，不触发索引）
  autoSaveDocument: (data: {
    id?: number | string;
    title?: string;
    content?: string;
    summary?: string;
    categoryId?: number | string;
    teamId?: number | string;
    tags?: string;
  }) => {
    return http.post<{ id: string }>('/document/documents/autosave', data);
  },

  // 仅更新文档摘要（走专用PATCH端点，不做全量校验）
  updateSummary: (id: string, summary: string) => {
    return http.patch<boolean>(`/document/documents/${id}/summary`, { summary });
  },

  // 删除文档
  deleteDocument: (id: string) => {
    return http.delete(`/document/documents/${id}`);
  },

  // 发布文档（注意：后端接口是 PUT /documents/{id}/publish）
  publishDocument: (id: string) => {
    return http.put<Document>(`/document/documents/${id}/publish`);
  },

  // 归档文档（注意：后端接口是 PUT /documents/{id}/archive）
  archiveDocument: (id: string) => {
    return http.put<Document>(`/document/documents/${id}/archive`);
  },

  // 点赞文档
  likeDocument: (id: string) => {
    return http.post(`/document/documents/${id}/like`);
  },

  // 取消点赞文档
  unlikeDocument: (id: string) => {
    return http.delete(`/document/documents/${id}/like`);
  },

  // 收藏文档
  favoriteDocument: (id: string) => {
    return http.post(`/document/documents/${id}/favorite`);
  },

  // 浏览文档（增加浏览次数）
  viewDocument: (id: string) => {
    return http.get<Document>(`/document/documents/${id}/view`);
  },

  // 注意：分类相关方法已移动到 categoryService，请使用 categoryService 代替

  // 上传文档文件
  uploadDocumentFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // 使用postForm方法处理文件上传
    return http.postForm<string>('/document/documents/upload', formData);
  },

  /**
   * 上传文件并解析创建文档（支持真实上传进度回调）
   *
   * @param file 待上传文件
   * @param onProgress 上传进度百分比回调（0-100）
   * @returns 解析后的文档摘要信息
   */
  uploadAndParseDocument: (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{
    documentId: string;
    title: string;
    fileUrl: string;
    fileSize: number;
    contentLength: number;
    contentPreview: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    return http.postForm('/document/documents/upload/parse', formData, {
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
  },

  /**
   * 基于已登记的文件管理元数据解析并创建文档草稿。
   *
   * <p>大文件分片/秒传完成后调用：fileId 为 FileMetadata.id。</p>
   *
   * @param fileId 文件管理元数据 ID
   * @returns 与 uploadAndParseDocument 相同结构
   */
  createDocumentFromStoredFile: (
    fileId: string | number
  ): Promise<{
    documentId: string;
    title: string;
    fileUrl: string;
    fileSize: number;
    contentLength: number;
    contentPreview: string;
  }> => {
    return http.post(`/document/documents/from-file/${fileId}`);
  },

  // 导出文档为PDF（获取下载链接）
  exportDocumentToPdf: (documentId: string) => {
    return http.get<string>(`/document/documents/${documentId}/export-pdf`);
  },

  // 下载文档PDF（直接下载）
  downloadDocumentPdf: (documentId: string) => {
    return (http as any).download(`/document/documents/${documentId}/download-pdf`);
  },

  // 批量导出文档
  batchExportDocuments: async (documentIds: string[], format: 'pdf' | 'markdown') => {
    const response: any = await request.post('/document/documents/batch-export', { documentIds, format }, {
      responseType: 'blob',
      _download: true,
    } as any);

    // 检查响应是否为 JSON 错误（而非 ZIP 文件）
    const contentType = response.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
      // 读取错误信息
      const text = await response.data.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || '导出失败');
    }

    const contentDisposition = response.headers?.['content-disposition'] || '';
    let filename = `documents_export_${new Date().toISOString().slice(0, 10)}.zip`;
    const match = contentDisposition.match(/filename\*=UTF-8''([^"';]+)/);
    if (match) {
      try { filename = decodeURIComponent(match[1]); } catch { filename = match[1]; }
    }
    const blob = new Blob([response.data], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  // 创建分享链接
  createShare: (data: {
    documentId: string;
    shareType?: number;
    expireType?: number;
    expireTime?: string;
    accessLimit?: number;
    requirePassword?: number;
    password?: string;
    description?: string;
  }) => {
    return http.post<ShareVO>('/document/documents/share', data);
  },

  // 获取分享信息
  getShareInfo: (shareId: string) => {
    return http.get<ShareVO>(`/document/documents/share/${shareId}`);
  },

  // 访问分享链接
  accessShare: (shareId: string, password?: string) => {
    const params = password ? { password } : {};
    return http.post<number>(`/document/documents/share/${shareId}/access`, null, { params });
  },

  // 获取文档的所有分享
  getDocumentShares: (documentId: string) => {
    return http.get<ShareVO[]>(`/document/documents/${documentId}/shares`);
  },

  // 获取我的分享列表
  getMyShares: () => {
    return http.get<ShareVO[]>('/document/documents/share/my');
  },

  // 删除分享链接
  deleteShare: (shareId: string) => {
    return http.delete(`/document/documents/share/${shareId}`);
  },

  // 更新分享设置
  updateShare: (shareId: string, data: any) => {
    return http.put(`/document/documents/share/${shareId}`, data);
  },

  // ========== 公开分享接口（无需登录，skipAuth） ==========

  // 公开获取分享信息
  getPublicShareInfo: (shareId: string) => {
    return http.get<ShareVO>(`/document/share/${shareId}`, { skipAuth: true } as any);
  },

  // 公开验证分享密码
  verifyPublicShare: (shareId: string, password?: string) => {
    const params: Record<string, string> = {};
    if (password) params.password = password;
    return http.post<boolean>(`/document/share/${shareId}/verify`, null, {
      params,
      skipAuth: true,
    } as any);
  },

  // 公开访问分享（获取文档内容）
  accessPublicShare: (shareId: string, password?: string) => {
    const params: Record<string, string> = {};
    if (password) params.password = password;
    return http.post<any>(`/document/share/${shareId}/access`, null, {
      params,
      skipAuth: true,
    } as any);
  },

  // ========== 自动保存历史 ==========

  // 获取文档的自动保存历史快照列表
  getAutoSaveHistory: (documentId: string, page = 1, pageSize = 20) => {
    return http.get<any>(`/document/documents/${documentId}/autosave-history`, {
      params: { current: page, size: pageSize },
    }).then((data: any) => ({
      list: data.records || [],
      total: data.total || 0,
      page: data.current || 1,
      pageSize: data.size || 20,
    }));
  },

  // 获取单个自动保存快照详情（含完整内容）
  getAutoSaveSnapshot: (documentId: string, snapshotId: string) => {
    return http.get<any>(`/document/documents/${documentId}/autosave-history/${snapshotId}`);
  },

  // 放弃自动保存草稿（标记当前用户所有草稿为已确认，不再弹出恢复提示）
  dismissAutoSaveDrafts: () => {
    return http.put<boolean>('/document/documents/autosave/dismiss');
  },
};

export interface ShareVO {
  shareId: string;
  shareUrl: string;
  documentId: string | number;
  title: string;
  shareType: number;
  shareTypeDesc: string;
  expireType: number;
  expireTime: string;
  expired: boolean;
  requirePassword: boolean;
  sharerName: string;
  shareTime: string;
  accessCount: number;
  description: string;
}

export default documentService;
