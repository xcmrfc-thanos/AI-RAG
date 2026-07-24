/**
 * UI 组件：ChunkedDocumentViewer。
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from 'antd';
import { CaretRightOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import './ChunkedDocumentViewer.css';

// ── Types ──────────────────────────────────────────────────

export interface DocSection {
  id: string;
  title: string;
  level: number;
  content: string;
}

/** 文档记录的最小类型 - 避免导入 Document 与全局 DOM Document 冲突 */
interface DocRecord {
  id: string;
  content: string;
  contentLength?: number;
  fileSize?: number;
}

interface ChunkedDocumentViewerProps {
  document: DocRecord;
  /** Markdown 自定义组件（复用 DocumentDetailPage 的 renderers） */
  markdownComponents?: Record<string, React.ComponentType<any>>;
  /** 展开/折叠回调，用于通知外部 TOC */
  onSectionToggle?: (sectionId: string, isExpanded: boolean) => void;
  /** 外部传入的要滚动到的 section id */
  scrollToSectionId?: string | null;
  /** 当前激活 section 变化回调 */
  onActiveSectionChange?: (sectionId: string) => void;
  /** 所有展开的 sections */
  onExpandedSectionsChange?: (sections: DocSection[]) => void;
}

// ── Constants ──────────────────────────────────────────────

/** 超过此字符数默认折叠 */
const AUTO_COLLAPSE_THRESHOLD = 50000;

// ── Parsing ────────────────────────────────────────────────

function parseSections(content: string): DocSection[] {
  if (!content) return [];

  const lines = content.split('\n');
  const sections: DocSection[] = [];

  let currentContent: string[] = [];
  let currentHeading: DocSection | null = null;
  let headingIndex = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      // Save previous section
      if (currentHeading) {
        currentHeading.content = currentContent.join('\n');
        sections.push(currentHeading);
      } else if (currentContent.length > 0) {
        // Content before first heading becomes preamble
        const preambleText = currentContent.join('\n').trim();
        if (preambleText) {
          sections.push({
            id: 'preamble',
            title: '概述',
            level: 2,
            content: preambleText,
          });
        }
      }

      const level = match[1].length;
      const rawTitle = match[2];

      // Strip numbering for display
      const displayTitle = rawTitle
        .replace(/^[\d]+\.[\d]+(?:\.\d+)*[\s.)）、]*/, '')
        .replace(/^[\d]+[.)）、]\s*/, '')
        .trim();

      currentHeading = {
        id: `section-${headingIndex}`,
        title: displayTitle || rawTitle,
        level,
        content: '',
      };
      currentContent = [line]; // Keep original heading line for Markdown rendering
      headingIndex++;
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentHeading) {
    currentHeading.content = currentContent.join('\n');
    sections.push(currentHeading);
  } else if (currentContent.length > 0 && sections.length === 0) {
    // All content without headings
    sections.push({
      id: 'preamble',
      title: '概述',
      level: 1,
      content: currentContent.join('\n'),
    });
  }

  return sections;
}

// ── Component ──────────────────────────────────────────────

const ChunkedDocumentViewer: React.FC<ChunkedDocumentViewerProps> = ({
  document,
  markdownComponents,
  onSectionToggle,
  scrollToSectionId,
  onActiveSectionChange,
  onExpandedSectionsChange,
}) => {
  const content = document.content || '';
  const isLongDoc = content.length >= AUTO_COLLAPSE_THRESHOLD;

  // Parse sections
  const sections = useMemo(() => parseSections(content), [content]);

  // Expanded state: Set of section IDs
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (!isLongDoc) {
      // Short doc: expand all
      return new Set(sections.map((s) => s.id));
    }
    // Long doc: expand only first section
    return sections.length > 0 ? new Set([sections[0].id]) : new Set();
  });

  // Track all-expanded state
  const allExpanded = sections.length > 0 && sections.every((s) => expandedSections.has(s.id));

  // Scroll to section when triggered externally (from TOC click)
  useEffect(() => {
    if (scrollToSectionId) {
      const el = window.document.getElementById(scrollToSectionId);
      if (el) {
        // Expand the section if not already
        setExpandedSections((prev) => new Set(prev).add(scrollToSectionId));
        onSectionToggle?.(scrollToSectionId, true);

        // Scroll with offset
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const navHeight = 48;
          const extraOffset = 20;
          const pos = el.getBoundingClientRect().top + window.scrollY - navHeight - extraOffset;
          window.scrollTo({ top: pos, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [scrollToSectionId, onSectionToggle]);

  // Notify parent of visible sections when expandedSections change
  useEffect(() => {
    const visible = sections.filter((s) => expandedSections.has(s.id));
    onExpandedSectionsChange?.(visible);
  }, [expandedSections, sections, onExpandedSectionsChange]);

  // ── Actions ─────────────────────────────────────────────

  const toggleSection = useCallback(
    (sectionId: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) {
          next.delete(sectionId);
          onSectionToggle?.(sectionId, false);
        } else {
          next.add(sectionId);
          onSectionToggle?.(sectionId, true);
        }
        return next;
      });
    },
    [onSectionToggle],
  );

  const expandAll = useCallback(() => {
    const allIds = new Set(sections.map((s) => s.id));
    setExpandedSections(allIds);
    sections.forEach((s) => onSectionToggle?.(s.id, true));
  }, [sections, onSectionToggle]);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
    sections.forEach((s) => onSectionToggle?.(s.id, false));
  }, [sections, onSectionToggle]);

  // ── Scroll-spy for active section ───────────────────────

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = window.document.querySelectorAll('[data-section-id]');
      if (sectionElements.length === 0) return;

      const scrollPos = window.scrollY + 150;
      let currentId = '';

      sectionElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const top = htmlEl.offsetTop;
        const bottom = top + htmlEl.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          currentId = htmlEl.dataset.sectionId || '';
        }
      });

      if (currentId) {
        onActiveSectionChange?.(currentId);
      }
    };

    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debounced);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', debounced);
    };
  }, [onActiveSectionChange, sections]);

  // ── Empty state ─────────────────────────────────────────

  if (!content) {
    return (
      <div className="chunked-viewer">
        <div className="chunked-viewer-empty">暂无文档内容</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="chunked-viewer">
      {/* Metadata bar */}
      <div className="chunked-viewer-meta">
        <span className="chunked-viewer-meta-item">
          {document.contentLength?.toLocaleString() || content.length.toLocaleString()} 字符
        </span>
        {document.fileSize != null && (
          <span className="chunked-viewer-meta-item">
            {(document.fileSize / 1024).toFixed(1)} KB
          </span>
        )}
        <span className="chunked-viewer-meta-item">
          {sections.length} 个章节
        </span>
        <span className="chunked-viewer-meta-sep" />
        <span className="chunked-viewer-meta-item">
          已展开 {expandedSections.size}/{sections.length}
        </span>
      </div>

      {/* Toolbar */}
      {sections.length > 1 && (
        <div className="chunked-viewer-toolbar">
          {allExpanded ? (
            <Button
              size="small"
              icon={<CompressOutlined />}
              onClick={collapseAll}
            >
              折叠全部
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<ExpandOutlined />}
              onClick={expandAll}
            >
              展开全部
            </Button>
          )}
        </div>
      )}

      {/* Section list */}
      <div className="chunked-viewer-sections">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const hasContent = section.content.trim().length > 0;
          const levelClass = `section-level-${Math.min(section.level, 6)}`;

          return (
            <div
              key={section.id}
              id={section.id}
              data-section-id={section.id}
              className={`chunked-section ${isExpanded ? 'expanded' : 'collapsed'}`}
            >
              {/* Section header */}
              <div
                className={`chunked-section-header ${levelClass}`}
                onClick={() => hasContent && toggleSection(section.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (hasContent) {
                      toggleSection(section.id);
                    }
                  }
                }}
              >
                <CaretRightOutlined
                  className={`chunked-section-arrow ${isExpanded ? 'rotated' : ''}`}
                />
                <span className="chunked-section-title">
                  {section.title}
                </span>
              </div>

              {/* Section content */}
              {isExpanded && hasContent && (
                <div className="chunked-section-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Collapsed gradient indicator for folded sections with content */}
              {!isExpanded && hasContent && (
                <div className="chunked-section-collapsed-hint" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ChunkedDocumentViewer);
