import { http } from './request';
import { DocumentVersion } from '@/types';

export const versionService = {
  // 获取文档版本列表
  getVersions: (documentId: string) => {
    return http.get<DocumentVersion[]>(`/document/documents/${documentId}/versions`);
  },

  // 获取版本详情
  getVersion: (documentId: string, versionId: string) => {
    return http.get<DocumentVersion>(`/document/documents/${documentId}/versions/${versionId}`);
  },

  // 恢复到指定版本
  restoreVersion: (documentId: string, versionId: string) => {
    return http.post<DocumentVersion>(`/document/documents/${documentId}/versions/${versionId}/restore`, {});
  },

  // 比较两个版本
  compareVersions: (documentId: string, versionId1: string, versionId2: string) => {
    return http.get<{ old: DocumentVersion; new: DocumentVersion; diff: string }>(
      `/document/documents/${documentId}/versions/compare`,
      { params: { v1: versionId1, v2: versionId2 } }
    );
  },

  // 创建版本快照
  createSnapshot: (documentId: string, changeLog?: string) => {
    return http.post<DocumentVersion>(`/document/documents/${documentId}/versions`, { changeLog });
  },
};

export default versionService;
