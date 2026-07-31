/**
 * Embed Token / 流式对话 API。
 */
import { http } from './request';

export type EmbedTokenView = {
  token: string;
  tokenType: string;
  expiresIn: number;
  nonce: string;
  knowledgeScope?: string;
  allowedOrigin?: string;
};

/**
 * 用当前登录会话换取短期 embed Token。
 */
export async function mintEmbedToken(payload?: {
  knowledgeScope?: string;
  ttlSeconds?: number;
  allowedOrigin?: string;
}): Promise<EmbedTokenView> {
  return http.post<EmbedTokenView>('/auth/embed/tokens', payload ?? {});
}

/**
 * 使用 embed Token 调用流式问答（不写 localStorage）。
 */
export function askStreamWithEmbedToken(
  embedToken: string,
  question: string,
  onMessage: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: string) => void,
): Promise<void> {
  return fetch(`${import.meta.env.VITE_API_BASE_URL}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${embedToken}`,
    },
    body: JSON.stringify({
      content: question.trim(),
      enableRag: true,
      enableKag: false,
    }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      throw new Error('无法读取响应流');
    }
    let buffer = '';
    let currentEvent = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (const line of parts) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5);
            if (currentEvent === 'message') {
              onMessage(data.startsWith(' ') ? data.slice(1) : data);
            } else if (currentEvent === 'error') {
              onError?.(data.trim());
            } else if (currentEvent === 'done') {
              onDone?.();
            }
          }
        }
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    }
  });
}
