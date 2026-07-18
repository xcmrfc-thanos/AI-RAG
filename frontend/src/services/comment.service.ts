import { http } from './request';
import { Comment } from '@/types';

export interface CommentQueryDTO {
  current?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

/**
 * 评论服务
 *
 * <p>后端接口路径：/api/comments</p>
 * <p>注意：评论接口独立于文档接口，不在 /documents 路径下</p>
 */
export const commentService = {
  // 创建评论
  createComment: (data: {
    documentId: string | number;
    content: string;
    parentId?: string | number;
  }) => {
    return http.post<number>('/document/comments', data);
  },

  // 删除评论
  deleteComment: (commentId: string | number) => {
    return http.delete(`/document/comments/${commentId}`);
  },

  // 点赞评论
  likeComment: (commentId: string | number) => {
    return http.post(`/document/comments/${commentId}/like`);
  },

  // 取消点赞评论
  unlikeComment: (commentId: string | number) => {
    return http.delete(`/document/comments/${commentId}/like`);
  },

  // 分页查询文档评论（注意：后端使用POST请求）
  pageDocumentComments: (
    documentId: string | number,
    query: CommentQueryDTO = {}
  ) => {
    const params = {
      current: query.current || 1,
      size: query.size || 10,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };
    return http.post<PageResult<Comment>>(
      `/document/comments/document/${documentId}`,
      params
    );
  },

  // 获取评论回复列表
  getCommentReplies: (parentCommentId: string | number) => {
    return http.get<Comment[]>(`/document/comments/${parentCommentId}/replies`);
  },
};

export default commentService;
