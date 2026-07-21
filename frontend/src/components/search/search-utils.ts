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
 * 将后端原始检索分映射到 [0,1]，供百分比与配色使用。
 *
 * <p>BM25 / RRF / 重排分数量纲不同，不能直接 ×100。优先用当前结果页最高分做相对归一；
 * 无参照时对 ≤1、≤10、更大 BM25 分别做兜底映射。</p>
 *
 * @param score 后端原始分
 * @param maxScore 当前列表最高分（可选）
 * @return [0,1] 相关度
 */
export const toUnitRelevance = (score: number, maxScore?: number): number => {
  if (!Number.isFinite(score) || score <= 0) {
    return 0;
  }
  if (maxScore != null && Number.isFinite(maxScore) && maxScore > 0) {
    return Math.min(1, Math.max(0, score / maxScore));
  }
  if (score <= 1) {
    return Math.min(1, score);
  }
  // BM25 / 重排等无上界分数：软饱和，避免 900%+；有 maxScore 时优走上分支
  return 1 - 1 / (1 + score / 10);
};

/**
 * 格式化为用户可读相关度百分比（0%～100%）。
 *
 * @param score 后端原始分
 * @param maxScore 当前列表最高分（可选）
 * @return 如 "87%"
 */
export const formatRelevancePercent = (score: number, maxScore?: number): string => {
  return `${Math.round(toUnitRelevance(score, maxScore) * 100)}%`;
};

/**
 * 通道原始分展示（BM25 / 向量等），不伪装成百分比。
 *
 * @param score 原始分
 * @param decimals 小数位
 * @return 展示字符串
 */
export const formatRawScoreChip = (score: number, decimals = 2): string => {
  if (!Number.isFinite(score)) {
    return '-';
  }
  if (score >= 0 && score <= 1) {
    return score.toFixed(decimals);
  }
  if (Math.abs(score - Math.round(score)) < 1e-6) {
    return String(Math.round(score));
  }
  return score.toFixed(decimals);
};

/**
 * 根据相关度分数返回展示颜色（入参可为原始分，内部归一到 [0,1]）。
 *
 * @param score 原始分或已归一分
 * @param maxScore 当前列表最高分（可选）
 */
export const getScoreColor = (score: number, maxScore?: number): string => {
  const unit = toUnitRelevance(score, maxScore);
  if (unit >= 0.8) {
    return '#22c55e';
  }
  if (unit >= 0.6) {
    return '#f59e0b';
  }
  if (unit >= 0.4) {
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
