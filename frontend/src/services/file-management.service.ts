import { http } from './request';
import { tokenStorage } from '@/utils/token-storage';
import { EntityId } from '@/types';
import {
  uploadWithResume,
  type UploadProgress,
  type FileUploadResponse,
} from './resumable-upload';

/**
 * 文件元数据接口
 */
export interface FileMetadata {
  id: EntityId;
  fileName: string;
  originalFileName: string;
  fileExtension: string;
  fileSize: number;
  fileSizeReadable: string;
  contentType: string;
  accessUrl: string;
  fileCategory: string;
  uploaderId: EntityId;
  uploaderName: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  lastAccessTime: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  /** 时长（秒），音视频文件 */
  duration?: number;
  /** 分辨率，如 "1920x1080" */
  resolution?: string;
  /** 码率（kbps） */
  bitrate?: number;
  /** 转码状态：PENDING/PROCESSING/DONE/FAILED */
  transcodeStatus?: string;
  /** HLS播放URL */
  playUrl?: string;
}

/**
 * 文件统计接口
 */
export interface FileStatistics {
  totalCount: number;
  totalSize: number;
  totalSizeReadable: string;
  categoryCount: Record<string, number>;
  todayCount: number;
}

/**
 * 文件管理服务
 */
export const fileManagementService = {
  /**
   * 上传文件（统一：秒传预检 + 小文件整传 + 大文件分片续传）
   *
   * @param file 待上传文件
   * @param isPublic 是否公开
   * @param onProgress 上传进度回调（含 phase / percent）
   * @returns 文件元数据
   */
  uploadFile: async (
    file: File,
    isPublic: boolean = false,
    onProgress?: (p: UploadProgress) => void
  ): Promise<FileMetadata> => {
    const result: FileUploadResponse = await uploadWithResume(file, {
      isPublic,
      onProgress,
    });

    return {
      id: result.id as EntityId,
      fileName: result.fileName || result.originalFileName || file.name,
      originalFileName: result.originalFileName || result.originalName || file.name,
      fileExtension: result.fileExtension || '',
      fileSize: result.fileSize ?? file.size,
      fileSizeReadable: result.fileSizeReadable || '',
      contentType: result.contentType || file.type || 'application/octet-stream',
      accessUrl: result.accessUrl || result.fileUrl || '',
      fileCategory: result.fileCategory || 'other',
      uploaderId: (result.uploaderId ?? 0) as EntityId,
      uploaderName: result.uploaderName || '',
      isPublic: result.isPublic ?? isPublic,
      downloadCount: result.downloadCount ?? 0,
      createdAt: result.createdAt || new Date().toISOString(),
      updatedAt: result.updatedAt || new Date().toISOString(),
      lastAccessTime: result.lastAccessTime || new Date().toISOString(),
      width: result.width,
      height: result.height,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      resolution: result.resolution,
      bitrate: result.bitrate,
      transcodeStatus: result.transcodeStatus,
      playUrl: result.playUrl,
    };
  },

  /**
   * 获取文件列表
   */
  getFileList: async (): Promise<FileMetadata[]> => {
    const response = await http.get('/document/file-management/list');
    return response;
  },

  /**
   * 按分类获取文件列表
   */
  getFileListByCategory: async (category: string): Promise<FileMetadata[]> => {
    const response = await http.get(`/document/file-management/list/${category}`);
    return response;
  },

  /**
   * 获取文件详情
   */
  getFileDetail: async (fileId: EntityId): Promise<FileMetadata> => {
    const response = await http.get(`/document/file-management/detail/${fileId}`);
    return response;
  },

  /**
   * 重命名文件
   */
  renameFile: async (fileId: EntityId, newFileName: string): Promise<boolean> => {
    const response = await http.put(`/document/file-management/rename/${fileId}`, null, {
      params: { newFileName },
    });
    return response;
  },

  /**
   * 删除文件
   */
  deleteFile: async (fileId: EntityId): Promise<boolean> => {
    const response = await http.delete(`/document/file-management/delete/${fileId}`);
    return response;
  },

  /**
   * 批量删除文件
   */
  batchDeleteFiles: async (fileIds: EntityId[]): Promise<number> => {
    const response = await http.delete('/document/file-management/batch-delete', {
      data: fileIds,
    });
    return response;
  },

  /**
   * 更新文件权限
   */
  updateFilePermission: async (fileId: EntityId, isPublic: boolean): Promise<boolean> => {
    const response = await http.put(`/document/file-management/permission/${fileId}`, null, {
      params: { isPublic },
    });
    return response;
  },

  /**
   * 下载文件（经鉴权流式接口拉取 Blob，避免浏览器直链 RustFS 403 导致伪 PDF）
   *
   * @param fileId 文件 ID
   * @param fileName 下载文件名（可选）
   */
  downloadFile: async (fileId: EntityId, fileName?: string): Promise<void> => {
    await http.download(
      `/document/file-management/stream/${fileId}?download=true`,
      fileName,
    );
    try {
      await http.post(`/document/file-management/download/${fileId}`);
    } catch {
      // 计数失败不影响下载本身
    }
  },

  /**
   * 构造带 Authorization 的 fetch 请求头（供原生 fetch / react-pdf 使用）
   */
  getAuthHeaders: (): Record<string, string> => {
    const authHeader = tokenStorage.getAuthorizationHeader();
    return authHeader ? { Authorization: authHeader } : {};
  },

  /**
   * 获取文件统计信息
   */
  getFileStatistics: async (): Promise<FileStatistics> => {
    const response = await http.get('/document/file-management/statistics');
    return response;
  },

  /**
   * 复制文件
   */
  copyFile: async (fileId: EntityId): Promise<FileMetadata> => {
    const response = await http.post(`/document/file-management/copy/${fileId}`);
    return response;
  },

  /**
   * 搜索文件
   */
  searchFiles: async (keyword: string): Promise<FileMetadata[]> => {
    const response = await http.get('/document/file-management/search', {
      params: { keyword },
    });
    return response;
  },

  /**
   * 获取HLS播放URL（kb-file服务）
   * 注意：此URL由ReactPlayer直接请求，不走axios，因此需要完整路径含/api前缀
   */
  getStreamUrl: (fileId: EntityId): string => {
    return `/api/files/stream/${fileId}/master.m3u8`;
  },

    /**
     * 获取媒体流URL（kb-document 代理）
     * <p>供 img/video/audio/react-pdf 等原生请求使用；追加 access_token 供网关/JWT 在无 Header 时鉴权。</p>
     *
     * @param fileId 文件 ID
     * @return 带可选 token 的完整 /api 路径
     */
  getMediaStreamUrl: (fileId: EntityId): string => {
    const base = `/api/document/file-management/stream/${fileId}`;
    const token = tokenStorage.getAccessToken();
    if (!token) {
      return base;
    }
    return `${base}?access_token=${encodeURIComponent(token)}`;
  },

  /**
   * 获取缩略图URL
   */
  getThumbnailUrl: (fileId: EntityId): string => {
    return `/api/files/thumbnail/${fileId}`;
  },

  /**
   * 获取 PPTX 幻灯片图片（Base64 PNG）
   */
  getPptxSlideImages: async (fileId: EntityId): Promise<string[]> => {
    const response = await http.get(`/document/file-management/preview/${fileId}/slides`);
    return response;
  },
};

export default fileManagementService;
