import { http } from './request';
import { GraphContext } from '@/types';

/**
 * KAG 知识图谱服务
 *
 * <p>提供知识图谱检索和图谱增强对话能力。</p>
 */
export const kagService = {
  /**
   * 图谱检索（不对话，仅返回图谱上下文）
   */
  searchGraph: (query: string) => {
    return http.post<GraphContext>('/kag/search', { query });
  },

  /**
   * KAG 增强对话
   */
  kagChat: (content: string, conversationId?: string) => {
    return http.post<{ content: string; conversationId: string; messageId: string; graphContext?: GraphContext }>(
      '/kag/chat',
      { content, conversationId, enableKag: true },
    );
  },
};

export default kagService;
