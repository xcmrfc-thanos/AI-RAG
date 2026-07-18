/** 后端 ES / 检索服务统一使用的高亮标签 */
export const SEARCH_HIGHLIGHT_TAG = 'em';

/**
 * 判断文本是否已包含后端下发的高亮标签。
 */
export const hasBackendHighlight = (text: string): boolean => {
  return /<em\b/i.test(text);
};

/**
 * 合并相邻 em 标签，与后端 SearchServiceImpl.mergeAdjacentEmTags 行为一致。
 */
export const mergeAdjacentEmTags = (text: string): string => {
  if (!text) {
    return text;
  }
  return text.replace(/<\/em><em>/gi, '');
};

/**
 * 将关键词在文本中高亮为 em 标签（与后端 ES preTags/postTags 一致）。
 */
export const highlightKeyword = (text: string, query: string): string => {
  if (!text || !query) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return mergeAdjacentEmTags(text.replace(regex, '<em>$1</em>'));
};

/**
 * 解析搜索展示用高亮 HTML：优先后端 em 高亮，否则前端按关键词补 em。
 */
export const resolveSearchHighlight = (text: string, query: string): string => {
  if (!text) {
    return text;
  }
  if (hasBackendHighlight(text)) {
    return mergeAdjacentEmTags(text);
  }
  return highlightKeyword(text, query);
};

/**
 * 根据相关度分数返回展示颜色。
 */
export const getScoreColor = (score: number): string => {
  if (score >= 0.8) {
    return '#22c55e';
  }
  if (score >= 0.6) {
    return '#f59e0b';
  }
  if (score >= 0.4) {
    return '#f97316';
  }
  return '#ef4444';
};

/**
 * 根据类型返回 Tag 颜色类名。
 */
export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'tech':
      return 'blue';
    case 'ai':
    case 'purple':
      return 'purple';
    case 'business':
    case 'green':
      return 'green';
    default:
      return 'default';
  }
};
