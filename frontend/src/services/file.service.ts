import { http } from './request';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export interface FileUploadResponse {
  id: string;
  originalName: string;
  fileSize: number;
  fileSizeReadable: string;
  fileType: string;
  mimeType: string;
  fileUrl: string;
  previewUrl: string;
  uploaderId: number;
  accessLevel: number;
  downloadCount: number;
  storageType: string;
  createdAt: string;
}

export const fileService = {
  // 上传单个文件
  upload: (file: File, options?: UploadOptions) => {
    const formData = new FormData();
    formData.append('file', file);

    return http.post<FileUploadResponse>('/file/files/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent,
          });
        }
      },
    });
  },

  // 批量上传文件
  batchUpload: (files: File[], options?: UploadOptions) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return http.post<{ url: string; filename: string; size: number }[]>('/document/files/batch-upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent,
          });
        }
      },
    });
  },

  // 下载文件
  download: (fileId: string) => {
    return http.get<Blob>(`/document/files/${fileId}/download`, {
      responseType: 'blob',
    }).then((data) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileId);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },

  // 获取文件URL
  getFileUrl: (fileId: string) => {
    return `${import.meta.env.VITE_API_BASE_URL}/document/files/${fileId}/view`;
  },

  // 删除文件
  delete: (fileId: string) => {
    return http.delete(`/document/files/${fileId}`);
  },

  // 获取文件信息
  getFileInfo: (fileId: string) => {
    return http.get<{ id: string; filename: string; size: number; mimeType: string; url: string }>(`/document/files/${fileId}`);
  },

  // 上传图片（带预览）
  uploadImage: (file: File, options?: UploadOptions) => {
    const formData = new FormData();
    formData.append('image', file);

    return http.post<{ url: string; thumbnail: string; width: number; height: number }>('/document/files/images', formData, {
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent,
          });
        }
      },
    });
  },

  // 从URL上传图片（自动下载并上传）
  uploadFromUrl: (imageUrl: string) => {
    return http.post<{ originalUrl: string; convertedUrl: string }>('/document/files/upload-from-url', null, {
      params: { imageUrl },
      timeout: 60000,
    });
  },

  // 批量转换图片URL
  batchConvertUrls: (imageUrls: string[]) => {
    return http.post<{
      urlMappings: Record<string, string>;
      errorMappings: Record<string, string>;
      successCount: number;
      failureCount: number;
    }>('/document/files/batch-convert', imageUrls, {
      timeout: 120000,
    });
  },

  // 导入文档（支持多种格式）
  importDocument: (file: File, options?: { categoryId?: string; tags?: string[] }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.categoryId) {
      formData.append('categoryId', options.categoryId);
    }
    if (options?.tags) {
      formData.append('tags', JSON.stringify(options.tags));
    }

    return http.post<{ documentId: string; title: string; content: string }>('/document/documents/import', formData);
  },

  // 导出文档
  exportDocument: (documentId: string, format: 'pdf' | 'word' | 'markdown' | 'html') => {
    return http.get<Blob>(`/document/documents/${documentId}/export`, {
      params: { format },
      responseType: 'blob',
    }).then((data) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },

  // 获取文件预览
  preview: (fileId: string) => {
    return http.get<{ content: string; format: string }>(`/document/files/${fileId}/preview`);
  },

  // 获取文件列表
  getFileList: (params?: {
    page?: number;
    pageSize?: number;
    fileType?: string;
    keyword?: string;
  }) => {
    return http.get<{
      list: FileUploadResponse[];
      total: number;
      page: number;
      pageSize: number;
    }>('/file/files', { params });
  },

  // 获取文件详情
  getFileDetail: (fileId: string) => {
    return http.get<FileUploadResponse>(`/file/files/${fileId}`);
  },
};

export default fileService;
