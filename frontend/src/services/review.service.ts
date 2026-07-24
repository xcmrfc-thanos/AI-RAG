/**
 * 前端 API 服务：review.service。
 */
import { http } from './request';
import { EntityId, ReviewTask, User } from '@/types';

/**
 * 后端返回的审核记录原始格式
 */
interface BackendReviewRecord {
  id: EntityId;
  documentId: EntityId;
  documentTitle: string;
  authorId: EntityId | null;
  authorName: string | null;
  reviewerId: EntityId | null;
  reviewerName: string | null;
  reviewResult: number | null;  // null=待审核, 1=通过, 2=驳回
  reviewComment: string | null;
  beforeStatus: number;
  reviewedAt: string | null;
  reviewRound: number;
  createdAt: string;
  categoryId: EntityId | null;
  categoryName: string | null;
}

interface BackendPageResult {
  records: BackendReviewRecord[];
  total: number;
  current: number;
  size: number;
}

/**
 * 将后端审核记录映射为前端 ReviewTask 格式
 */
function mapToReviewTask(record: BackendReviewRecord): ReviewTask {
  // reviewResult: null→pending, 1→approved, 2→rejected
  let status: ReviewTask['status'] = 'pending';
  if (record.reviewResult === 1) status = 'approved';
  else if (record.reviewResult === 2) status = 'rejected';

  return {
    id: String(record.id),
    documentId: String(record.documentId),
    documentTitle: record.documentTitle,
    documentAuthor: record.authorName
      ? { id: String(record.authorId || ''), username: record.authorName, email: '', status: 'active' }
      : ({ id: '', username: '未知', email: '', status: 'active' } as User),
    reviewerId: record.reviewerId ? String(record.reviewerId) : '',
    reviewer: record.reviewerName
      ? { id: String(record.reviewerId || ''), username: record.reviewerName, email: '', status: 'active' }
      : undefined,
    status,
    reviewRound: record.reviewRound,
    comment: record.reviewComment || undefined,
    createdAt: record.createdAt,
    reviewedAt: record.reviewedAt || undefined,
    categoryId: record.categoryId != null ? String(record.categoryId) : undefined,
    categoryName: record.categoryName || undefined,
  };
}

export const reviewService = {
  // 获取审核任务列表
  getReviewTasks: async (params?: { status?: string; page?: number; pageSize?: number; authorId?: string; keyword?: string }) => {
    const response = await http.get<BackendPageResult>('/document/review/tasks', { params });
    return {
      list: (response as unknown as BackendPageResult).records.map(mapToReviewTask),
      total: (response as unknown as BackendPageResult).total,
    };
  },

  // 获取我的被驳回文档（审核不通过）
  getMyRejectedDocuments: async (params: { authorId: string; page?: number; pageSize?: number }) => {
    const requestParams: Record<string, any> = {
      status: 'rejected',
      authorId: params.authorId,
      page: params.page || 1,
      pageSize: params.pageSize || 12,
    };
    const response = await http.get<BackendPageResult>('/document/review/tasks', { params: requestParams });
    return {
      list: (response as unknown as BackendPageResult).records.map(mapToReviewTask),
      total: (response as unknown as BackendPageResult).total,
    };
  },

  // 获取待审核任务数量
  getPendingCount: () => {
    return http.get<number>('/document/review/tasks/pending-count');
  },

  // 获取文档当前审核任务
  getCurrentReviewTask: async (documentId: string) => {
    const response = await http.get<BackendReviewRecord>(`/document/review/documents/${documentId}/current`);
    return mapToReviewTask(response as unknown as BackendReviewRecord);
  },

  // 获取审核统计数据
  getReviewStats: () => {
    return http.get<{ pending: number; approved: number; rejected: number }>('/document/review/tasks/stats');
  },

  // 审核文档（通过或驳回）
  reviewDocument: (taskId: string, data: { status: 'approved' | 'rejected'; comment?: string }) => {
    return http.post(`/document/review/tasks/${taskId}/review`, data);
  },

  // 批量审核
  batchReview: (taskIds: string[], data: { status: 'approved' | 'rejected'; comment?: string }) => {
    return http.post('/document/review/tasks/batch-review', { taskIds, ...data });
  },

  // 提交文档审核
  submitForReview: (documentId: string) => {
    return http.post(`/document/review/submit/${documentId}`);
  },

  // 获取审核历史
  getReviewHistory: async (documentId: string) => {
    const response = await http.get<BackendReviewRecord[]>(`/document/review/documents/${documentId}/history`);
    const records = response as unknown as BackendReviewRecord[];
    return records.map(mapToReviewTask);
  },
};

export default reviewService;
