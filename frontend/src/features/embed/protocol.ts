/**
 * Embed iframe 与宿主 postMessage 协议（同源试点）。
 */

export const EMBED_MSG = {
  READY: 'EMBED_READY',
  INIT: 'EMBED_INIT',
  ERROR: 'EMBED_ERROR',
} as const;

export type EmbedMsgType = (typeof EMBED_MSG)[keyof typeof EMBED_MSG];

export type EmbedInitPayload = {
  type: typeof EMBED_MSG.INIT;
  token: string;
  knowledgeScope?: string;
  allowedOrigin: string;
};

/**
 * 解析并校验来自宿主的 INIT 消息。
 *
 * @param data postMessage data
 * @param expectedOrigin 期望 Origin
 * @param eventOrigin 事件 origin
 * @returns 载荷或 null
 */
export function parseEmbedInit(
  data: unknown,
  expectedOrigin: string,
  eventOrigin: string,
): EmbedInitPayload | null {
  if (eventOrigin !== expectedOrigin) {
    return null;
  }
  if (!data || typeof data !== 'object') {
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (obj.type !== EMBED_MSG.INIT) {
    return null;
  }
  if (typeof obj.token !== 'string' || !obj.token.trim()) {
    return null;
  }
  if (typeof obj.allowedOrigin !== 'string' || obj.allowedOrigin !== expectedOrigin) {
    return null;
  }
  return {
    type: EMBED_MSG.INIT,
    token: obj.token.trim(),
    knowledgeScope: typeof obj.knowledgeScope === 'string' ? obj.knowledgeScope : undefined,
    allowedOrigin: obj.allowedOrigin,
  };
}

/**
 * 构造 READY 消息。
 */
export function buildEmbedReady(): { type: typeof EMBED_MSG.READY } {
  return { type: EMBED_MSG.READY };
}
