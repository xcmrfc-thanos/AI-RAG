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

  // 恢复到指定版本（后端 POST .../versions/restore + body.versionId）
  restoreVersion: (documentId: string, versionId: string) => {
    return http.post<boolean>(`/document/documents/${documentId}/versions/restore`, {
      versionId,
    });
  },

  // 比较两个版本：拉 diff 文本 + 两端版本详情供 UI 展示
  compareVersions: async (documentId: string, versionId1: string, versionId2: string) => {
    const [diff, oldVersion, newVersion] = await Promise.all([
      http.get<string>(`/document/documents/${documentId}/versions/compare`, {
        params: { versionId1, versionId2 },
      }),
      versionService.getVersion(documentId, versionId1),
      versionService.getVersion(documentId, versionId2),
    ]);
    const diffText = typeof diff === 'string' ? diff : String((diff as any)?.diff ?? diff ?? '');
    return { old: oldVersion, new: newVersion, diff: diffText };
  },

  // 创建版本快照（后端若无创建接口则前端勿用；保留方法签名供后续）
  createSnapshot: (documentId: string, changeLog?: string) => {
    return http.post<DocumentVersion>(`/document/documents/${documentId}/versions`, { changeLog });
  },
};

export default versionService;
