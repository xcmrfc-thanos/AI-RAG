/**
 * search 模块导出入口。
 */
export { SearchBox } from './SearchBox';
export type { SearchBoxProps, SearchSuggestion } from './SearchBox';
export { SearchModeToggle } from './SearchModeToggle';
export type { SearchMode, SearchModeToggleProps } from './SearchModeToggle';
export { SearchResultCard } from './SearchResultCard';
export type { SearchResultCardProps } from './SearchResultCard';
export { ChunkHighlightList } from './ChunkHighlightList';
export type { ChunkHighlightListProps } from './ChunkHighlightList';
export {
  highlightKeyword,
  resolveSearchHighlight,
  hasBackendHighlight,
  mergeAdjacentEmTags,
  toUnitRelevance,
  formatRelevancePercent,
  formatRawScoreChip,
  getScoreColor,
  getTypeColor,
  SEARCH_HIGHLIGHT_TAG,
} from './search-utils';
