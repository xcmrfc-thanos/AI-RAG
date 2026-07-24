/**
 * 业务页面：AIWritingPage。
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Spin,
  InputNumber,
  Tooltip,
} from 'antd';
import { App } from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  EditOutlined,
  CopyOutlined,
  CheckOutlined,
  ExpandOutlined,
  FormatPainterOutlined,
  ForwardOutlined,
  FileAddOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import { useAIWritingStore, useAppStore } from '@/stores';
import { EmptyState, PageLoading } from '@/components/common';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import type { WritingRequest, WritingTemplate } from '@/types';
import type { Components } from 'react-markdown';

const { Text } = Typography;
const { TextArea } = Input;

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('css', css);

// ==================== 设计系统：颜色 & 样式常量 ====================

const COLORS = {
  pageBg: '#f7f8fa',
  cardBg: '#ffffff',
  cardBorder: '#e9ebf0',
  sidebarBg: '#fafbfc',
  sidebarBorder: '#edf0f4',
  sidebarHover: '#f1f4f9',
  sidebarActive: '#e8edf4',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  accent: '#2563eb',
  accentLight: '#3b82f6',
  accentBg: 'rgba(37, 99, 235, 0.06)',
  accentBorder: 'rgba(37, 99, 235, 0.15)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb',
  inputFocusBorder: '#2563eb',
  tagBg: '#f1f4f9',
  tagHover: '#e4e9f2',
  tagText: '#4b5563',
  quickTagBg: '#f1f4f9',
  sendBtnStart: '#2563eb',
  sendBtnEnd: '#1d4ed8',
};

const SHADOWS = {
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  panel: '0 1px 3px rgba(0, 0, 0, 0.04)',
  button: '0 2px 8px rgba(37, 99, 235, 0.25)',
  icon: '0 4px 12px rgba(37, 99, 235, 0.18)',
};

// ==================== Markdown 样式（与 AIAssistantPage 保持一致） ====================

const MARKDOWN_STYLES = `
.writing-content {
  color: #1e293b;
  font-size: 15px;
  line-height: 1.85;
  word-break: break-word;
}
.writing-content > *:first-child { margin-top: 0 !important; }
.writing-content > *:last-child { margin-bottom: 0 !important; }

.writing-content h1 { font-size: 1.5em; font-weight: 700; margin: 1.2em 0 0.6em; color: #0f172a; letter-spacing: -0.01em; padding-bottom: 0.3em; border-bottom: 1px solid #e9ebf0; }
.writing-content h2 { font-size: 1.3em; font-weight: 700; margin: 1em 0 0.5em; color: #111827; letter-spacing: -0.01em; }
.writing-content h3 { font-size: 1.15em; font-weight: 600; margin: 0.9em 0 0.45em; color: #1f2937; }
.writing-content h4 { font-size: 1.05em; font-weight: 600; margin: 0.8em 0 0.4em; color: #374151; }

.writing-content p { margin: 0.65em 0; line-height: 1.85; }

.writing-content strong { font-weight: 650; color: #0f172a; }
.writing-content em { font-style: italic; color: #374151; }

.writing-content code:not(pre code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.15em 0.45em;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.writing-content ul, .writing-content ol {
  padding-left: 1.6em;
  margin: 0.6em 0;
}
.writing-content li { margin: 0.3em 0; line-height: 1.75; padding-left: 0.15em; }
.writing-content li > p { margin: 0.15em 0; }
.writing-content ul > li::marker { color: #94a3b8; }
.writing-content ol > li::marker { color: #64748b; font-weight: 500; font-size: 0.9em; }

.writing-content blockquote {
  border-left: 3px solid #2563eb;
  padding: 0.6em 1em;
  margin: 0.8em 0;
  background: linear-gradient(90deg, #eff6ff 0%, #f6f9ff 100%);
  color: #4b5563;
  border-radius: 0 8px 8px 0;
}
.writing-content blockquote p { margin: 0.3em 0; }

.writing-content a {
  color: #2563eb;
  text-decoration: none;
  border-bottom: 1px solid #bfdbfe;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.writing-content a:hover {
  color: #1d4ed8;
  border-bottom-color: #8b9cf7;
}

.writing-content hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%);
  margin: 1.2em 0;
}

.writing-content .md-table-wrapper {
  overflow-x: auto;
  margin: 1em 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.writing-content table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
  min-width: 400px;
}
.writing-content thead { background: #f8fafc; }
.writing-content thead th { font-weight: 600; color: #1f2937; text-align: left; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.03em; }
.writing-content th, .writing-content td { border-bottom: 1px solid #f1f5f9; padding: 0.65em 0.9em; }
.writing-content tbody tr:nth-child(even) { background: #fafbfc; }
.writing-content tbody tr:hover { background: #f1f5f9; }
.writing-content tbody tr:last-child td { border-bottom: none; }

.writing-content .code-block-wrapper {
  margin: 1em 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #2d2d3f;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.writing-content .code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45em 1em;
  background: #252536;
  border-bottom: 1px solid #3a3a55;
}
.writing-content .code-block-lang {
  font-size: 11px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
}
.writing-content .code-block-copy {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8b949e;
  cursor: pointer;
  background: none;
  border: none;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-family: inherit;
}
.writing-content .code-block-copy:hover { color: #e6edf3; background: #3a3a55; }
.writing-content .code-block-wrapper pre { margin: 0 !important; border-radius: 0 !important; }
.writing-content .code-block-wrapper code {
  font-size: 0.82em !important;
  line-height: 1.6 !important;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace !important;
}

.writing-content pre:not(.code-block-wrapper pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 1em 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.8em 0;
  line-height: 1.55;
  font-size: 0.85em;
}
.writing-content pre:not(.code-block-wrapper pre) code {
  background: none !important;
  padding: 0 !important;
  color: inherit;
  font-size: inherit;
  border: none !important;
}

.writing-content pre::-webkit-scrollbar,
.writing-content .code-block-wrapper pre::-webkit-scrollbar { height: 6px; }
.writing-content pre::-webkit-scrollbar-track,
.writing-content .code-block-wrapper pre::-webkit-scrollbar-track { background: transparent; }
.writing-content pre::-webkit-scrollbar-thumb,
.writing-content .code-block-wrapper pre::-webkit-scrollbar-thumb { background: #4a4a65; border-radius: 3px; }

.writing-content img { max-width: 100%; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin: 0.4em 0; }
.writing-content input[type="checkbox"] { margin-right: 0.4em; accent-color: #2563eb; }
`;

// ==================== 代码块组件 ====================

const CodeBlock: React.FC<{ language: string | undefined; value: string }> = ({ language, value }) => {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);
  const lang = language || 'text';

  /**
   * handleCopy。
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button className="code-block-copy" onClick={handleCopy} type="button">
          {copied ? (
            <><span style={{ fontSize: 12 }}>&#10003;</span> 已复制</>
          ) : (
            <><CopyOutlined style={{ fontSize: 12 }} /> 复制代码</>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.82em', lineHeight: 1.6 }}
        codeTagProps={{
          style: { fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace" },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// ==================== Markdown 组件映射 ====================

const markdownComponents: Components = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const value = String(children).replace(/\n$/, '');
    if (match) {
      return <CodeBlock language={match[1]} value={value} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
  pre({ children }: any) {
    return <>{children}</>;
  },
  table({ children }: any) {
    return <div className="md-table-wrapper"><table>{children}</table></div>;
  },
  img({ src, alt }: any) {
    return <img src={src} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} loading="lazy" />;
  },
  a({ href, children }: any) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

// ==================== 选项数据 ====================

const contentTypes = [
  { value: 'article', label: '文章' },
  { value: 'report', label: '报告' },
  { value: 'documentation', label: '技术文档' },
  { value: 'email', label: '邮件' },
  { value: 'announcement', label: '公告' },
];

const styleOptions = [
  { value: 'formal', label: '正式' },
  { value: 'casual', label: '轻松' },
  { value: 'technical', label: '技术' },
  { value: 'creative', label: '创意' },
  { value: 'academic', label: '学术' },
];

const toneOptions = [
  { value: 'neutral', label: '中性' },
  { value: 'enthusiastic', label: '热情' },
  { value: 'serious', label: '严肃' },
  { value: 'friendly', label: '友好' },
  { value: 'authoritative', label: '权威' },
];

/** 空态快捷写作入口（映射后端模板或动作提示） */
const QUICK_WRITING_TIPS: Array<{
  label: string;
  templateId?: string;
  /** 无后端模板时的本地填表 */
  fallback?: {
    topic: string;
    requirements: string;
    contentType: string;
    style: string;
  };
}> = [
  { label: '撰写技术方案', templateId: 'tech-solution' },
  { label: '编写项目周报', templateId: 'weekly-report' },
  {
    label: '优化已有文档',
    fallback: {
      topic: '优化已有文档',
      requirements: '请将下方待优化原文粘贴到此处，并说明优化目标（更清晰 / 更正式 / 更简洁等）。',
      contentType: 'documentation',
      style: 'formal',
    },
  },
  {
    label: '续写未完成内容',
    fallback: {
      topic: '续写未完成内容',
      requirements: '请将已写好的前文粘贴到此处，我将按相同风格继续撰写。',
      contentType: 'article',
      style: 'formal',
    },
  },
];

// ==================== 主页面组件 ====================

const AIWritingContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const store = useAIWritingStore();
  const fetchTemplates = useAIWritingStore((state) => state.fetchTemplates);
  const contentRef = useRef<HTMLDivElement>(null);

  // 表单状态
  const [topic, setTopic] = useState('');
  const [requirements, setRequirements] = useState('');
  const [contentType, setContentType] = useState<string>('article');
  const [style, setStyle] = useState<string>('formal');
  const [tone, setTone] = useState<string>('neutral');
  const [length, setLength] = useState<number | null>(800);
  const [useStream, setUseStream] = useState(true);
  /** 左侧写作表单是否收起 */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** 当前选中的写作模板 id（用于列表高亮） */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // 读取 URL 参数预填表单
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const contentParam = searchParams.get('content');
    if (titleParam) setTopic(decodeURIComponent(titleParam));
    if (contentParam) setRequirements(decodeURIComponent(contentParam));
  }, [searchParams]);

  // 加载模板
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 应用模板：名称→主题，prompt→写作要求（并给出可见反馈）
  const applyTemplate = useCallback((tpl: WritingTemplate) => {
    setTopic(tpl.name || '');
    setRequirements(tpl.prompt || '');
    if (tpl.suggestedContentType) setContentType(tpl.suggestedContentType);
    if (tpl.suggestedStyle) setStyle(tpl.suggestedStyle);
    setSelectedTemplateId(tpl.id);
    setSidebarCollapsed(false);
    message.success(`已应用模板「${tpl.name}」，可补充主题细节后点击生成`);
  }, [message]);

  /**
   * 应用空态快捷写作入口。
   *
   * @param tip 快捷标签配置
   */
  const applyQuickTip = useCallback((tip: (typeof QUICK_WRITING_TIPS)[number]) => {
    if (tip.templateId) {
      const matched = store.templates.find((t) => t.id === tip.templateId);
      if (matched) {
        applyTemplate(matched);
        return;
      }
    }
    if (tip.fallback) {
      setTopic(tip.fallback.topic);
      setRequirements(tip.fallback.requirements);
      setContentType(tip.fallback.contentType);
      setStyle(tip.fallback.style);
      setSelectedTemplateId(null);
      setSidebarCollapsed(false);
      message.success(`已填入「${tip.label}」，请完善左侧表单后生成`);
      return;
    }
    setTopic(tip.label);
    setSelectedTemplateId(null);
    setSidebarCollapsed(false);
    message.info('已填入主题，请补充写作要求后生成');
  }, [applyTemplate, message, store.templates]);

  // 构建请求参数
  const buildRequest = (actionType: WritingRequest['actionType']): WritingRequest => ({
    topic: topic.trim(),
    requirements: requirements.trim() || undefined,
    existingContent: requirements.trim() || undefined,
    contentType: contentType as WritingRequest['contentType'],
    style: style as WritingRequest['style'],
    tone: tone as WritingRequest['tone'],
    length: length || undefined,
    actionType,
  });

  // 生成内容
  const handleGenerate = async () => {
    if (!topic.trim()) {
      message.warning('请输入写作主题');
      return;
    }
    try {
      if (useStream) {
        await store.generateContentStream(buildRequest('generate'));
      } else {
        await store.generateContent(buildRequest('generate'));
      }
    } catch {
      message.error('生成失败，请稍后重试');
    }
  };

  // 扩写
  const handleExpand = async () => {
    if (!topic.trim()) { message.warning('请输入写作主题'); return; }
    if (!requirements.trim()) { message.warning('请在写作要求中输入需要扩写的内容'); return; }
    try {
      await store.expandContent(buildRequest('expand'));
    } catch {
      message.error('扩写失败，请稍后重试');
    }
  };

  // 优化
  const handleOptimize = async () => {
    if (!topic.trim()) { message.warning('请输入写作主题'); return; }
    if (!requirements.trim()) { message.warning('请在写作要求中输入需要优化的内容'); return; }
    try {
      await store.optimizeContent(buildRequest('optimize'));
    } catch {
      message.error('优化失败，请稍后重试');
    }
  };

  // 续写
  const handleContinueWriting = async () => {
    if (!topic.trim()) { message.warning('请输入写作主题'); return; }
    if (!requirements.trim()) { message.warning('请在写作要求中输入需要续写的内容'); return; }
    try {
      await store.continueWriting(buildRequest('continue'));
    } catch {
      message.error('续写失败，请稍后重试');
    }
  };

  // 复制
  const [copied, setCopied] = useState(false);
  const handleCopyContent = () => {
    if (!store.generatedContent) return;
    navigator.clipboard.writeText(store.generatedContent).then(() => {
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 从生成内容中提取标题：取首行有意义文本，去除 Markdown 标记
  const extractTitleFromContent = (content: string): { title: string; body: string } => {
    const lines = content.split('\n');
    // 跳过开头的空行
    let titleLineIdx = 0;
    while (titleLineIdx < lines.length && lines[titleLineIdx].trim() === '') {
      titleLineIdx++;
    }
    if (titleLineIdx >= lines.length) {
      return { title: topic || 'AI 生成文档', body: content };
    }
    const firstLine = lines[titleLineIdx].trim();
    // 去除 Markdown 标题标记（#、## 等）和加粗标记
    const title = firstLine
      .replace(/^#{1,6}\s+/, '')   // # Heading → Heading
      .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** → bold
      .replace(/^>\s*/, '')         // > Blockquote
      .trim();
    // 标题过长则不提取，回退到 topic
    if (title.length > 80 || title.length < 2) {
      return { title: topic || 'AI 生成文档', body: content };
    }
    // 从内容中移除已用作标题的首行（避免标题在正文中重复）
    const bodyLines = [...lines];
    bodyLines.splice(titleLineIdx, 1);
    // 同时删除标题行和正文之间的空行
    while (bodyLines.length > 0 && bodyLines[0] !== undefined && bodyLines[0].trim() === '') {
      bodyLines.shift();
    }
    const body = bodyLines.join('\n').trim();
    return { title, body };
  };

  // 插入到新文档（新窗口打开）
  const handleInsertToDocument = () => {
    if (!store.generatedContent) return;
    const { title, body } = extractTitleFromContent(store.generatedContent);
    const encodedContent = encodeURIComponent(body);
    const encodedTitle = encodeURIComponent(title);
    window.open(`/documents/new?content=${encodedContent}&title=${encodedTitle}`, '_blank');
  };

  // 清空
  const handleClear = () => {
    setTopic('');
    setRequirements('');
    setContentType('article');
    setStyle('formal');
    setTone('neutral');
    setLength(800);
    setSelectedTemplateId(null);
    store.clearResult();
  };

  // ==================== 渲染：空状态 ====================

  const renderEmptyState = () => (
    <EmptyState
      image={false}
      className="ai-writing-empty"
      descriptionNode={(
        <>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <EditOutlined style={{ fontSize: 34, color: '#3b82f6' }} />
          </div>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginBottom: 8,
              letterSpacing: '-0.01em',
              display: 'block',
            }}
          >
            {AI_ENTRY_COPY.writing.emptyTitle}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              textAlign: 'center',
              lineHeight: 1.7,
              maxWidth: 360,
              display: 'block',
              margin: '0 auto',
            }}
          >
            {AI_ENTRY_COPY.writing.emptySubtitle}
          </Text>
        </>
      )}
      footer={(
        <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480, marginInline: 'auto' }}>
          {QUICK_WRITING_TIPS.map((tip) => {
            const selected = Boolean(tip.templateId && tip.templateId === selectedTemplateId);
            return (
            <Tag
              key={tip.label}
              onClick={() => applyQuickTip(tip)}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 20,
                background: selected ? COLORS.accentBg : COLORS.quickTagBg,
                border: selected ? `1px solid ${COLORS.accentBorder}` : '1px solid transparent',
                color: selected ? COLORS.accent : COLORS.tagText,
                fontWeight: selected ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (selected) return;
                e.currentTarget.style.background = '#e8edf6';
                e.currentTarget.style.borderColor = '#d4ddf0';
              }}
              onMouseLeave={(e) => {
                if (selected) {
                  e.currentTarget.style.background = COLORS.accentBg;
                  e.currentTarget.style.borderColor = COLORS.accentBorder;
                  return;
                }
                e.currentTarget.style.background = COLORS.quickTagBg;
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {tip.label}
            </Tag>
            );
          })}
        </div>
      )}
    />
  );

  // ==================== 渲染：加载状态 ====================

  const renderLoadingState = () => (
    <PageLoading
      style={{ padding: '80px 0', minHeight: 400 }}
      tip={(
        <>
          <Text strong style={{ fontSize: 16, color: COLORS.textPrimary, display: 'block', marginBottom: 6 }}>
            {store.isStreaming ? 'AI 正在写作中...' : '正在生成内容...'}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
            请稍候，内容正在生成
          </Text>
        </>
      )}
    />
  );

  // ==================== 渲染：错误状态 ====================

  const renderErrorState = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 400,
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 28, color: COLORS.danger }}>!</Text>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Text strong style={{ fontSize: 16, color: COLORS.textPrimary, display: 'block', marginBottom: 6 }}>
          生成失败
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, display: 'block', marginBottom: 16 }}>
          {store.error || '请稍后重试'}
        </Text>
        <Button type="primary" onClick={handleGenerate}>重新生成</Button>
      </div>
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <>
      <style>{MARKDOWN_STYLES}</style>

      <div
        style={{
          height: 'calc(100vh - 80px)',
          display: 'flex',
          gap: 0,
          background: COLORS.pageBg,
          overflow: 'hidden',
        }}
      >
        {/* ==================== 左侧面板 ==================== */}
        <div
          style={{
            width: sidebarCollapsed ? 0 : 380,
            minWidth: sidebarCollapsed ? 0 : 380,
            height: '100%',
            overflow: sidebarCollapsed ? 'hidden' : 'hidden auto',
            borderRight: sidebarCollapsed ? 'none' : `1px solid ${COLORS.sidebarBorder}`,
            background: COLORS.sidebarBg,
            padding: sidebarCollapsed ? 0 : '20px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            transition: 'width 0.2s ease, min-width 0.2s ease, padding 0.2s ease',
            opacity: sidebarCollapsed ? 0 : 1,
            pointerEvents: sidebarCollapsed ? 'none' : 'auto',
          }}
        >
          {/* ---- 头部 ---- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${COLORS.sendBtnStart}, ${COLORS.sendBtnEnd})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: SHADOWS.icon,
                flexShrink: 0,
              }}
            >
              <EditOutlined style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text
                strong
                style={{
                  fontSize: 17,
                  color: COLORS.textPrimary,
                  display: 'block',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {AI_ENTRY_COPY.writing.title}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                {AI_ENTRY_COPY.writing.subtitle}
              </Text>
            </div>
            <Tooltip title="返回上一页">
              <Button
                type="text"
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ color: COLORS.textMuted }}
              />
            </Tooltip>
          </div>

          {/* 分割线 */}
          <div style={{ height: 1, background: COLORS.sidebarBorder, margin: '0 -20px' }} />

          {/* ---- 写作主题 ---- */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary }}>
                写作主题
              </Text>
              <Text type="danger" style={{ fontSize: 11 }}>* 必填</Text>
            </div>
            <Input
              placeholder="例如：如何写好一份技术方案"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                height: 40,
                borderRadius: 8,
                borderColor: COLORS.inputBorder,
                background: COLORS.cardBg,
                fontSize: 13,
              }}
            />
          </div>

          {/* ---- 写作要求 ---- */}
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary }}>
                写作要求 / 参考内容
              </Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 4 }}>
                （扩写/优化/续写时在此输入已有内容）
              </Text>
            </div>
            <TextArea
              placeholder="补充写作要求、关键要点，或粘贴已有内容..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{
                borderRadius: 8,
                borderColor: COLORS.inputBorder,
                background: COLORS.cardBg,
                fontSize: 13,
              }}
            />
          </div>

          {/* ---- 内容类型 + 写作风格 ---- */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}>
                内容类型
              </Text>
              <Select
                value={contentType}
                onChange={setContentType}
                style={{ width: '100%' }}
                options={contentTypes}
                popupMatchSelectWidth={false}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}>
                写作风格
              </Text>
              <Select
                value={style}
                onChange={setStyle}
                style={{ width: '100%' }}
                options={styleOptions}
                popupMatchSelectWidth={false}
              />
            </div>
          </div>

          {/* ---- 语气 + 期望字数 ---- */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}>
                语气
              </Text>
              <Select
                value={tone}
                onChange={setTone}
                style={{ width: '100%' }}
                options={toneOptions}
                popupMatchSelectWidth={false}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}>
                期望字数
              </Text>
              <InputNumber
                value={length}
                onChange={(v) => setLength(v)}
                min={100}
                max={10000}
                step={100}
                style={{ width: '100%' }}
                placeholder="800"
              />
            </div>
          </div>

          {/* ---- 生成方式 ---- */}
          <div>
            <Text strong style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 8 }}>
              生成方式
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                onClick={() => setUseStream(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  border: useStream ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.inputBorder}`,
                  background: useStream ? COLORS.accentBg : COLORS.cardBg,
                  color: useStream ? COLORS.accent : COLORS.textSecondary,
                  transition: 'all 0.15s ease',
                }}
              >
                <ThunderboltOutlined style={{ fontSize: 14 }} />
                流式生成
              </div>
              <div
                onClick={() => setUseStream(false)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  border: !useStream ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.inputBorder}`,
                  background: !useStream ? COLORS.accentBg : COLORS.cardBg,
                  color: !useStream ? COLORS.accent : COLORS.textSecondary,
                  transition: 'all 0.15s ease',
                }}
              >
                <RobotOutlined style={{ fontSize: 14 }} />
                普通生成
              </div>
            </div>
          </div>

          {/* ---- 操作按钮 ---- */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleGenerate}
              loading={store.isGenerating && !store.isStreaming}
              disabled={store.isGenerating}
              style={{
                background: `linear-gradient(135deg, ${COLORS.sendBtnStart}, ${COLORS.sendBtnEnd})`,
                border: 'none',
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: SHADOWS.button,
                flex: '1 1 auto',
                minWidth: 100,
              }}
            >
              生成内容
            </Button>
            <Button
              icon={<ExpandOutlined />}
              onClick={handleExpand}
              disabled={store.isGenerating}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              扩写
            </Button>
            <Button
              icon={<FormatPainterOutlined />}
              onClick={handleOptimize}
              disabled={store.isGenerating}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              优化
            </Button>
            <Button
              icon={<ForwardOutlined />}
              onClick={handleContinueWriting}
              disabled={store.isGenerating}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              续写
            </Button>
          </div>

          {/* 分割线 */}
          <div style={{ height: 1, background: COLORS.sidebarBorder, margin: '0 -20px' }} />

          {/* ---- 写作模板 ---- */}
          <div>
            <Text strong style={{ fontSize: 14, color: COLORS.textPrimary, display: 'block', marginBottom: 10 }}>
              写作模板
            </Text>
            {store.templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
                <Text style={{ fontSize: 12, color: COLORS.textMuted, display: 'block', marginTop: 8 }}>加载模板中...</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {store.templates.slice(0, 6).map((tpl) => {
                  const selected = selectedTemplateId === tpl.id;
                  return (
                  <div
                    key={tpl.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    onClick={() => applyTemplate(tpl)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        applyTemplate(tpl);
                      }
                    }}
                    style={{
                      padding: '11px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: selected ? '#eff6ff' : COLORS.cardBg,
                      border: selected ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.cardBorder}`,
                      boxShadow: selected
                        ? '0 0 0 3px rgba(37, 99, 235, 0.12)'
                        : '0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selected) return;
                      e.currentTarget.style.borderColor = '#bfdbfe';
                      e.currentTarget.style.background = '#f0f6ff';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      if (selected) {
                        e.currentTarget.style.borderColor = COLORS.accent;
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                        return;
                      }
                      e.currentTarget.style.borderColor = COLORS.cardBorder;
                      e.currentTarget.style.background = COLORS.cardBg;
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 13, color: selected ? COLORS.accent : COLORS.textPrimary }}>
                        {tpl.name}
                      </Text>
                      <Tag
                        style={{
                          fontSize: 10,
                          borderRadius: 4,
                          background: COLORS.accentBg,
                          border: `1px solid ${COLORS.accentBorder}`,
                          color: COLORS.accent,
                          lineHeight: '18px',
                          margin: 0,
                        }}
                      >
                        {tpl.category}
                      </Tag>
                    </div>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        marginTop: 4,
                        display: 'block',
                        lineHeight: 1.5,
                      }}
                    >
                      {tpl.description}
                    </Text>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- 清空按钮 ---- */}
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            block
            style={{
              borderRadius: 8,
              fontWeight: 500,
              color: COLORS.textMuted,
              borderColor: COLORS.inputBorder,
              marginTop: 'auto',
            }}
          >
            清空所有内容
          </Button>
        </div>

        {/* ==================== 右侧面板 ==================== */}
        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.pageBg,
            overflow: 'hidden',
          }}
        >
          {/* ---- 工具栏 ---- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              borderBottom: `1px solid ${COLORS.cardBorder}`,
              background: COLORS.cardBg,
              minHeight: 52,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              flexShrink: 0,
            }}
          >
            {/* 左侧：展开侧栏 + 统计 */}
            <Space size={14}>
              {sidebarCollapsed && (
                <Tooltip title="展开写作面板">
                  <Button
                    type="text"
                    size="small"
                    icon={<MenuUnfoldOutlined />}
                    onClick={() => setSidebarCollapsed(false)}
                    style={{ color: COLORS.textSecondary }}
                  />
                </Tooltip>
              )}
              {!sidebarCollapsed && (
                <Tooltip title="收起写作面板">
                  <Button
                    type="text"
                    size="small"
                    icon={<MenuFoldOutlined />}
                    onClick={() => setSidebarCollapsed(true)}
                    style={{ color: COLORS.textMuted }}
                  />
                </Tooltip>
              )}
              {store.lastResult && (
                <>
                  <Tag
                    style={{
                      fontSize: 11,
                      borderRadius: 5,
                      background: COLORS.accentBg,
                      border: `1px solid ${COLORS.accentBorder}`,
                      color: COLORS.accent,
                      padding: '0 10px',
                      lineHeight: '22px',
                      margin: 0,
                    }}
                  >
                    <RobotOutlined style={{ marginRight: 4 }} />
                    {store.lastResult.model || 'AI'}
                  </Tag>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      paddingLeft: 14,
                      borderLeft: `1px solid ${COLORS.cardBorder}`,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                      <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{store.wordCount}</span> 字
                    </Text>
                    {store.tokens > 0 && (
                      <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                        {store.tokens} tokens
                      </Text>
                    )}
                  </div>
                </>
              )}
              {store.isStreaming && (
                <Tag
                  style={{
                    fontSize: 11,
                    borderRadius: 5,
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    color: '#92400e',
                    padding: '0 10px',
                    lineHeight: '22px',
                    margin: 0,
                  }}
                >
                  <Spin size="small" style={{ marginRight: 4 }} />
                  实时生成中...
                </Tag>
              )}
            </Space>

            {/* 右侧操作按钮 */}
            <Space size={8}>
              <Tooltip title="复制全部内容">
                <Button
                  type="text"
                  size="small"
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={handleCopyContent}
                  disabled={!store.generatedContent}
                  style={{
                    color: copied ? COLORS.success : COLORS.textMuted,
                    fontSize: 13,
                    borderRadius: 6,
                  }}
                >
                  复制
                </Button>
              </Tooltip>
              <Button
                type="primary"
                size="small"
                icon={<FileAddOutlined />}
                onClick={handleInsertToDocument}
                disabled={!store.generatedContent}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.sendBtnStart}, ${COLORS.sendBtnEnd})`,
                  border: 'none',
                  fontWeight: 600,
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: SHADOWS.button,
                  padding: '0 16px',
                  height: 32,
                  color: '#fff',
                }}
              >
                插入到文档
              </Button>
            </Space>
          </div>

          {/* ---- 内容区域 ---- */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflow: 'hidden auto',
              padding: '28px 32px',
            }}
          >
            {/* 有内容 → Markdown 渲染 */}
            {store.generatedContent ? (
              <div className="writing-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                  {store.generatedContent}
                </ReactMarkdown>
                {store.isStreaming && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 20,
                      padding: 10,
                    }}
                  >
                    <Spin size="small" />
                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>AI 正在写作中...</Text>
                  </div>
                )}
              </div>
            ) : store.isGenerating ? (
              renderLoadingState()
            ) : store.error ? (
              renderErrorState()
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* ---- 底部声明 ---- */}
          <div
            style={{
              padding: '10px 24px',
              borderTop: `1px solid ${COLORS.cardBorder}`,
              background: COLORS.cardBg,
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
              内容由 AI 生成，仅供参考和辅助写作使用
            </Text>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * AIWritingPage 页面组件。
 */
const AIWritingPage: React.FC = () => {
  const { enableAIWriting } = useAppStore();

  if (!enableAIWriting) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <RobotOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
          <Typography.Title level={4}>{AI_ENTRY_COPY.writing.disabledTitle}</Typography.Title>
          <Typography.Text type="secondary">{AI_ENTRY_COPY.writing.disabledDesc}</Typography.Text>
        </div>
      </div>
    );
  }

  return <AIWritingContent />;
};

export default AIWritingPage;
