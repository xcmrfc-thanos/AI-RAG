import { http } from './request';
import { AIRequest, AIConversation, AIQuickQuestion, AIModelOption, WritingRequest, WritingResult, WritingTemplate } from '@/types';
import { tokenStorage } from '@/utils/token-storage';

/**
 * 流式输出批处理回调
 *
 * <p>每隔 flushInterval ms 将缓冲区中的 token 批量发送给 onMessage，
 * 而非每个 token 都触发一次回调，减少状态更新频率，避免页面跳动。</p>
 */
function createBatchedCallback(
  onMessage: (chunk: string) => void,
  flushInterval: number = 80,
): { addToken: (token: string) => void; flush: () => void } {
  let buffer: string[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;

  const startTimer = () => {
    if (timer) return;
    timer = setInterval(() => {
      if (buffer.length > 0) {
        const batch = buffer.join('');
        buffer = [];
        onMessage(batch);
      }
    }, flushInterval);
  };

  return {
    addToken: (token: string) => {
      buffer.push(token);
      startTimer();
    },
    flush: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (buffer.length > 0) {
        const batch = buffer.join('');
        buffer = [];
        onMessage(batch);
      }
    },
  };
}

export const aiService = {
  // 获取可用AI模型列表
  getModels: () => {
    return http.get<AIModelOption[]>('/ai/chat/models');
  },

  // AI问答
  ask: (data: AIRequest) => {
    return http.post<{ content: string; conversationId: string; messageId: string; tokens: number }>('/ai/chat', {
      content: data.question,
      conversationId: data.conversationId,
      model: data.model,
    });
  },

  // 获取对话历史
  getConversations: async (): Promise<AIConversation[]> => {
    const pageData = await http.get<any>('/ai/conversation/list');
    return pageData?.records || pageData || [];
  },

  // 获取对话详情
  getConversation: (id: string) => {
    return http.get<AIConversation>(`/ai/conversation/${id}`);
  },

  // 创建新对话
  createConversation: (title: string) => {
    return http.post<AIConversation>('/ai/conversation', { title });
  },

  // 删除对话
  deleteConversation: (id: string) => {
    return http.delete(`/ai/conversation/${id}`);
  },

  // 清空对话历史
  clearConversation: (id: string) => {
    return http.delete(`/ai/conversation/${id}/messages`);
  },

  // 流式问答（带 token 批处理，减少页面刷新频率）
  askStream: (
    data: AIRequest,
    onMessage: (message: string) => void,
    onDone?: (result: { conversationId: number | string; messageId: number | string; content: string; tokens: number }) => void,
    onError?: (error: string) => void,
  ) => {
    // 创建批处理回调：每 80ms 批量输出一次，避免逐 token 刷新导致页面跳动
    const { addToken, flush } = createBatchedCallback(onMessage, 80);

    return fetch(`${import.meta.env.VITE_API_BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tokenStorage.getAuthorizationHeader(),
      },
      body: JSON.stringify({
        content: data.question,
        conversationId: data.conversationId,
        model: data.model,
        enableRag: data.context?.knowledgeBase === true,
        enableKag: data.context?.enableKag === true,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      let currentEvent = '';
      let messageLines: string[] = [];  // 累积 message 事件的多行 data

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行在缓冲区中
        buffer = lines.pop() || '';

        for (const line of lines) {
          // 解析 event: 行
          if (line.startsWith('event:')) {
            // 事件切换前，先发送累积的 message 数据
            if (messageLines.length > 0) {
              addToken(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = line.slice(6).trim();
            continue;
          }

          // 解析 data: 行（去除 'data:' 前缀，保留一个可选的前导空格）
          if (line.startsWith('data:')) {
            const data = line.startsWith('data: ') ? line.slice(6) : line.slice(5);

            if (currentEvent === 'error') {
              flush(); // 错误前先刷出已累积的内容
              onError?.(data);
              continue;
            }

            if (currentEvent === 'done') {
              flush(); // 完成后先刷出最后一批内容
              try {
                const parsed = JSON.parse(data);
                onDone?.(parsed);
              } catch {
                // done 事件数据非 JSON，忽略
              }
              continue;
            }

            // message 事件（或无事件类型）：累积 data 行，保留空行
            messageLines.push(data);
            continue;
          }

          // 空行 = SSE 事件边界，发送累积的 message 数据
          if (line === '') {
            if (messageLines.length > 0) {
              addToken(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = '';
          }
        }
      }

      // 流结束时发送残留的 message 数据
      if (messageLines.length > 0) {
        addToken(messageLines.join('\n'));
      }
      // 确保最后一批被刷出
      flush();
    });
  },

  // 获取AI建议
  getSuggestions: (documentId?: string) => {
    return http.get<string[]>('/ai/suggestions', {
      params: { documentId },
    });
  },

  // 提交反馈
  submitFeedback: (data: { messageId: string; conversationId: string; type: 'like' | 'dislike' }) => {
    return http.post('/ai/feedback', data);
  },

  // 获取快捷问题
  getQuickQuestions: () => {
    return http.get<AIQuickQuestion[]>('/ai/quick-questions');
  },

  // ==================== AI Writing APIs ====================

  // 获取写作模板
  getWritingTemplates: () => {
    return http.get<WritingTemplate[]>('/ai/writing/templates');
  },

  // 生成写作内容
  generateWriting: (data: WritingRequest) => {
    return http.post<WritingResult>('/ai/writing/generate', { ...data, actionType: 'generate' });
  },

  // 流式生成写作内容
  generateWritingStream: (
    data: WritingRequest,
    onMessage: (chunk: string) => void,
    onDone?: (result: WritingResult) => void,
    onError?: (error: string) => void,
  ) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    return fetch(`${apiBase}/ai/writing/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tokenStorage.getAuthorizationHeader(),
      },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法读取响应流');

      let buffer = '';
      let currentEvent = '';
      let messageLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            if (messageLines.length > 0) {
              onMessage(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            const data = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
            if (currentEvent === 'error') {
              onError?.(data);
              continue;
            }
            if (currentEvent === 'done') {
              try {
                const parsed = JSON.parse(data);
                onDone?.(parsed);
              } catch { /* ignore */ }
              continue;
            }
            messageLines.push(data);
            continue;
          }
          if (line === '') {
            if (messageLines.length > 0) {
              onMessage(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = '';
          }
        }
      }
      if (messageLines.length > 0) {
        onMessage(messageLines.join('\n'));
      }
    });
  },

  // 扩写内容
  expandWriting: (data: WritingRequest) => {
    return http.post<WritingResult>('/ai/writing/expand', { ...data, actionType: 'expand' });
  },

  // 优化内容
  optimizeWriting: (data: WritingRequest) => {
    return http.post<WritingResult>('/ai/writing/optimize', { ...data, actionType: 'optimize' });
  },

  // 续写内容
  continueWriting: (data: WritingRequest) => {
    return http.post<WritingResult>('/ai/writing/continue', { ...data, actionType: 'continue' });
  },

  // ==================== Document Summary APIs ====================

  /**
   * 基于文档内容生成AI摘要（非流式）
   */
  generateDocSummary: (params: { content: string; title?: string; length?: number }) => {
    return http.post<{
      processType: string;
      processedContent: string;
      success: boolean;
      message: string;
      tokens?: number;
    }>('/ai/document/summary/content', {
      content: params.content,
      title: params.title || '',
      processType: 'summary',
      processParams: {
        summaryLength: params.length || 200,
      },
    });
  },

  /**
   * 基于文档内容生成AI摘要（流式SSE）
   */
  generateDocSummaryStream: (
    params: { content: string; title?: string; length?: number },
    onChunk: (chunk: string) => void,
    onDone?: (result: { processedContent: string; success: boolean; message: string }) => void,
    onError?: (error: string) => void,
  ) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    return fetch(`${apiBase}/ai/document/summary/content/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tokenStorage.getAuthorizationHeader(),
      },
      body: JSON.stringify({
        content: params.content,
        title: params.title || '',
        processType: 'summary',
        processParams: {
          summaryLength: params.length || 200,
        },
      }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法读取响应流');

      let buffer = '';
      let currentEvent = '';
      let messageLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            if (messageLines.length > 0) {
              onChunk(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            const data = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
            if (currentEvent === 'error') {
              onError?.(data);
              continue;
            }
            if (currentEvent === 'done') {
              try {
                const parsed = JSON.parse(data);
                onDone?.(parsed);
              } catch { /* ignore */ }
              continue;
            }
            messageLines.push(data);
            continue;
          }
          if (line === '') {
            if (messageLines.length > 0) {
              onChunk(messageLines.join('\n'));
              messageLines = [];
            }
            currentEvent = '';
          }
        }
      }
      if (messageLines.length > 0) {
        onChunk(messageLines.join('\n'));
      }
    });
  },
};

export default aiService;
