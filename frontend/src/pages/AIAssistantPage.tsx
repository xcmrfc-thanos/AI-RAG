import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Card,
  Input,
  List,
  Typography,
  Button,
  Space,
  Tag,
  Avatar,
  Spin,
  Dropdown,
  Select,
  Switch,
  MenuProps,
  Tooltip,
} from 'antd';
import { App } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  LikeOutlined,
  DislikeOutlined,
  BookOutlined,
  ThunderboltOutlined,
  MoreOutlined,
  CopyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAIStore, useAuthStore, useAppStore } from '@/stores';
import { aiService } from '@/services';
import { EmptyState } from '@/components/common';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import { AIQuickQuestion, Citation, openCitationDocument } from '@/types';
import type { GraphContext } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { prepareStreamingMarkdown } from '@/utils/markdown';
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
import type { Components } from 'react-markdown';

const { Title, Text, Paragraph } = Typography;
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
  // 页面背景
  pageBg: '#f7f8fa',
  // 卡片
  cardBg: '#ffffff',
  cardBorder: '#e9ebf0',
  // 侧边栏
  sidebarBg: '#fafbfc',
  sidebarBorder: '#edf0f4',
  sidebarHover: '#f1f4f9',
  sidebarActive: '#e8edf4',
  // 用户消息气泡
  userBubbleBg: '#eff3ff',
  userBubbleBorder: '#d9e2f7',
  userBubbleText: '#1a1d23',
  userAvatarBg: '#5b7ce6',
  // AI 消息气泡
  aiBubbleBg: '#ffffff',
  aiBubbleBorder: '#e9ebf0',
  aiBubbleText: '#1a1d23',
  aiAvatarStart: '#6366f1',
  aiAvatarEnd: '#8b5cf6',
  // 操作按钮
  actionColor: '#9ca3af',
  actionHoverColor: '#4b5563',
  actionActiveColor: '#5b7ce6',
  // 输入区
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb',
  inputFocusBorder: '#6366f1',
  sendBtnStart: '#6366f1',
  sendBtnEnd: '#8b5cf6',
  // 快捷问题
  quickTagBg: '#f1f4f9',
  quickTagHover: '#e4e9f2',
  quickTagText: '#4b5563',
  // 其他
  dividerColor: '#edf0f4',
  timestampColor: '#9ca3af',
  codeBlockBg: '#1e1e2e',
  codeBlockText: '#cdd6f4',
};

const SHADOWS = {
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  aiBubble: '0 1px 2px rgba(0, 0, 0, 0.03)',
  userBubble: 'none',
};

// ==================== 注入 Markdown 样式（一线大厂设计标准） ====================

const MARKDOWN_STYLES = `
/* ---------- 基础排版 ---------- */
.ai-message-content {
  color: #1e293b;
  font-size: 14px;
  line-height: 1.8;
  word-break: break-word;
}
.ai-message-content > *:first-child { margin-top: 0 !important; }
.ai-message-content > *:last-child { margin-bottom: 0 !important; }

/* ---------- 标题 ---------- */
.ai-message-content h1 { font-size: 1.35em; font-weight: 700; margin: 1.2em 0 0.6em; color: #0f172a; letter-spacing: -0.01em; padding-bottom: 0.3em; border-bottom: 1px solid #e9ebf0; }
.ai-message-content h2 { font-size: 1.2em; font-weight: 700; margin: 1em 0 0.5em; color: #111827; letter-spacing: -0.01em; }
.ai-message-content h3 { font-size: 1.08em; font-weight: 600; margin: 0.9em 0 0.45em; color: #1f2937; }
.ai-message-content h4 { font-size: 1em; font-weight: 600; margin: 0.8em 0 0.4em; color: #374151; }
.ai-message-content h5, .ai-message-content h6 { font-size: 0.95em; font-weight: 600; margin: 0.7em 0 0.35em; color: #4b5563; }

/* ---------- 段落 ---------- */
.ai-message-content p { margin: 0.6em 0; line-height: 1.8; }
.ai-message-content p:first-child { margin-top: 0; }
.ai-message-content p:last-child { margin-bottom: 0; }

/* ---------- 强调 & 加粗 ---------- */
.ai-message-content strong { font-weight: 650; color: #0f172a; }
.ai-message-content em { font-style: italic; color: #374151; }

/* ---------- 行内代码 ---------- */
.ai-message-content code:not(pre code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.15em 0.45em;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

/* ---------- 列表 ---------- */
.ai-message-content ul, .ai-message-content ol {
  padding-left: 1.6em;
  margin: 0.6em 0;
}
.ai-message-content li {
  margin: 0.3em 0;
  line-height: 1.75;
  padding-left: 0.15em;
}
.ai-message-content li > p { margin: 0.15em 0; }
.ai-message-content ul ul, .ai-message-content ol ol, .ai-message-content ul ol, .ai-message-content ol ul {
  margin: 0.2em 0;
}
.ai-message-content ul > li::marker { color: #94a3b8; }
.ai-message-content ol > li::marker { color: #64748b; font-weight: 500; font-size: 0.9em; }

/* ---------- 引用块 ---------- */
.ai-message-content blockquote {
  border-left: 3px solid #6366f1;
  padding: 0.6em 1em;
  margin: 0.8em 0;
  background: linear-gradient(90deg, #f5f3ff 0%, #faf9ff 100%);
  color: #4b5563;
  border-radius: 0 8px 8px 0;
  font-style: normal;
}
.ai-message-content blockquote p { margin: 0.3em 0; }
.ai-message-content blockquote strong { color: #374151; }

/* ---------- 链接 ---------- */
.ai-message-content a {
  color: #6366f1;
  text-decoration: none;
  border-bottom: 1px solid #c7d2fe;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.ai-message-content a:hover {
  color: #4f46e5;
  border-bottom-color: #8b9cf7;
}

/* ---------- 分割线 ---------- */
.ai-message-content hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%);
  margin: 1.2em 0;
}

/* ---------- 表格 ---------- */
.ai-message-content .md-table-wrapper {
  overflow-x: auto;
  margin: 1em 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.ai-message-content table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
  min-width: 400px;
}
.ai-message-content thead {
  background: #f8fafc;
}
.ai-message-content thead th {
  font-weight: 600;
  color: #1f2937;
  text-align: left;
}
.ai-message-content th, .ai-message-content td {
  border-bottom: 1px solid #f1f5f9;
  padding: 0.65em 0.9em;
}
.ai-message-content th {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ai-message-content tbody tr:nth-child(even) { background: #fafbfc; }
.ai-message-content tbody tr:hover { background: #f1f5f9; }
.ai-message-content tbody tr:last-child td { border-bottom: none; }

/* ---------- 代码块（自定义 CodeBlock 组件 + 通用 pre fallback） ---------- */
.ai-message-content .code-block-wrapper {
  margin: 1em 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #2d2d3f;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.ai-message-content .code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45em 1em;
  background: #252536;
  border-bottom: 1px solid #3a3a55;
}
.ai-message-content .code-block-lang {
  font-size: 11px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
}
.ai-message-content .code-block-copy {
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
.ai-message-content .code-block-copy:hover {
  color: #e6edf3;
  background: #3a3a55;
}
.ai-message-content .code-block-wrapper pre {
  margin: 0 !important;
  border-radius: 0 !important;
  white-space: pre !important;
  word-break: normal !important;
}
.ai-message-content .code-block-wrapper code {
  font-size: 0.82em !important;
  line-height: 1.6 !important;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace !important;
  white-space: pre !important; /* 防止 CSS 合并代码中的空格 */
  word-break: normal !important; /* 禁止在关键字中间断行 */
}

/* 通用 pre fallback（非 code-block-wrapper 内的） */
.ai-message-content pre:not(.code-block-wrapper pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 1em 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.8em 0;
  line-height: 1.55;
  font-size: 0.85em;
  white-space: pre; /* 防止 CSS 合并代码中的空格 */
  word-break: normal; /* 禁止在关键字中间断行 */
}
.ai-message-content pre:not(.code-block-wrapper pre) code {
  background: none !important;
  padding: 0 !important;
  color: inherit;
  font-size: inherit;
  border: none !important;
  white-space: pre !important; /* 防止 CSS 合并代码中的空格 */
  word-break: normal !important; /* 禁止在关键字中间断行 */
}

/* ---------- 代码块内滚动条 ---------- */
.ai-message-content pre::-webkit-scrollbar,
.ai-message-content .code-block-wrapper pre::-webkit-scrollbar {
  height: 6px;
}
.ai-message-content pre::-webkit-scrollbar-track,
.ai-message-content .code-block-wrapper pre::-webkit-scrollbar-track {
  background: transparent;
}
.ai-message-content pre::-webkit-scrollbar-thumb,
.ai-message-content .code-block-wrapper pre::-webkit-scrollbar-thumb {
  background: #4a4a65;
  border-radius: 3px;
}

/* ---------- 图片 ---------- */
.ai-message-content img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin: 0.4em 0;
}

/* ---------- 任务列表 ---------- */
.ai-message-content input[type="checkbox"] {
  margin-right: 0.4em;
  accent-color: #6366f1;
}

/* ---------- 脚注 ---------- */
.ai-message-content sup a { font-size: 0.8em; color: #6366f1; }
`;

// ==================== 代码块组件（语法高亮 + 复制） ====================

const CodeBlock: React.FC<{
  language: string | undefined;
  value: string;
}> = React.memo(({ language, value }) => {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);
  const lang = language || 'text';

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
            <>
              <span style={{ fontSize: 12 }}>&#10003;</span> 已复制
            </>
          ) : (
            <>
              <CopyOutlined style={{ fontSize: 12 }} /> 复制代码
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        wrapLongLines={true}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.82em',
          lineHeight: 1.6,
          whiteSpace: 'pre',
        }}
        codeTagProps={{
          style: {
            fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace",
            whiteSpace: 'pre',
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

// ==================== ReactMarkdown 组件映射 ====================

/**
 * 从 HAST AST 节点中提取代码文本（比从 React children 提取更可靠）。
 * <p>ReactMarkdown v9 通过 `node` prop 传递原始 HAST/MDAST 节点，
 * 直接读取 node.children[].value 可避免 React children 重组造成的空格丢失。</p>
 */
const extractCodeFromNode = (node: any): string => {
  if (!node?.children) return '';
  if (typeof node.children === 'string') return node.children;
  return node.children
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.value)
    .join('');
};

/**
 * 递归提取 React children 中的纯文本内容，保留所有空白字符。
 * <p>用于无法从 AST node 提取文本时（如行内代码）的后备方案。</p>
 */
const extractText = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children)) return extractText((children.props as any).children);
  return String(children);
};

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    // 优先从 HAST node 提取文本（保留原始空格），回退到 extractText
    const rawNode = (props as any).node;
    const value = (rawNode ? extractCodeFromNode(rawNode) : extractText(children)).replace(/\n$/, '');

    // 带语言标识的代码块 → 使用 CodeBlock 组件
    if (match) {
      return <CodeBlock language={match[1]} value={value} />;
    }

    // 行内代码
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children }) {
    // 如果 children 已经是 CodeBlock（已包装），直接返回；否则用 fallback pre
    return <>{children}</>;
  },
  table({ children }) {
    return <div className="md-table-wrapper"><table>{children}</table></div>;
  },
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt || ''}
        style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        loading="lazy"
      />
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

// ==================== 聊天输入组件（独立组件防止打字时全页面重渲染） ====================

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  isTyping: boolean;
}

export interface ChatInputHandle {
  submitWithText: (text: string) => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(({ onSend, isLoading, isTyping }, ref) => {
  const [inputValue, setInputValue] = useState('');

  useImperativeHandle(ref, () => ({
    submitWithText: (text: string) => {
      onSend(text);
    },
  }));

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    onSend(inputValue.trim());
    setInputValue('');
  }, [inputValue, onSend]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSend(inputValue.trim());
        setInputValue('');
      }
    }
  }, [inputValue, onSend]);

  return (
    <div
      style={{
        padding: '10px 20px 12px',
        borderTop: `1px solid ${COLORS.inputBorder}`,
        background: '#fafbfc',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: 14,
            border: `1px solid ${COLORS.inputBorder}`,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={AI_ENTRY_COPY.assistant.placeholder}
            autoSize={{ minRows: 1, maxRows: 6 }}
            disabled={isLoading || isTyping}
            style={{
              border: 'none',
              background: 'transparent',
              resize: 'none',
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: 1.6,
              borderRadius: 0,
              boxShadow: 'none',
            }}
            onFocus={(e) => {
              const wrapper = (e.currentTarget as HTMLElement).closest('div');
              if (wrapper) {
                wrapper.style.borderColor = COLORS.inputFocusBorder;
                wrapper.style.boxShadow = `0 0 0 2px rgba(99, 102, 241, 0.1)`;
              }
            }}
            onBlur={(e) => {
              const wrapper = (e.currentTarget as HTMLElement).closest('div');
              if (wrapper) {
                wrapper.style.borderColor = COLORS.inputBorder;
                wrapper.style.boxShadow = 'none';
              }
            }}
          />
        </div>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading || isTyping}
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            background: inputValue.trim()
              ? `linear-gradient(135deg, ${COLORS.sendBtnStart}, ${COLORS.sendBtnEnd})`
              : '#e5e7eb',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: inputValue.trim()
              ? `0 3px 12px rgba(99, 102, 241, 0.35)`
              : 'none',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        />
      </div>
      <div
        style={{
          maxWidth: 900,
          margin: '6px auto 0',
          textAlign: 'center',
        }}
      >
        <Text style={{ fontSize: 11, color: COLORS.timestampColor }}>
          内容由 AI 生成，仅供参考
        </Text>
      </div>
    </div>
  );
});

// ==================== 用户消息气泡组件 ====================

interface UserMessageBubbleProps {
  content: string;
  timestamp?: string;
  onRetry?: () => void;
  avatar?: string;
}

const UserMessageBubble: React.FC<UserMessageBubbleProps> = React.memo(({ content, timestamp, onRetry, avatar }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: 10,
        padding: '0 8px',
      }}
    >
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            padding: '12px 18px',
            borderRadius: '18px 18px 4px 18px',
            background: COLORS.userBubbleBg,
            border: `1px solid ${COLORS.userBubbleBorder}`,
            color: COLORS.userBubbleText,
            fontSize: 14,
            lineHeight: 1.7,
            wordBreak: 'break-word',
            boxShadow: SHADOWS.userBubble,
          }}
        >
          <Text style={{ fontSize: 14, lineHeight: 1.7, color: COLORS.userBubbleText }}>
            {content}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            marginRight: 4,
            minHeight: 28,
          }}
        >
          {timestamp && (
            <Text style={{ fontSize: 11, color: COLORS.timestampColor, flexShrink: 0 }}>
              {timestamp}
            </Text>
          )}
          {onRetry && (
            <Tooltip title="重新生成回复">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                style={{ color: COLORS.actionColor, fontSize: 13 }}
                onClick={onRetry}
              />
            </Tooltip>
          )}
        </div>
      </div>
      <Avatar
        size={34}
        src={avatar}
        icon={!avatar ? <UserOutlined /> : undefined}
        style={{
          backgroundColor: avatar ? 'transparent' : COLORS.userAvatarBg,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(91, 124, 230, 0.3)',
          border: avatar ? '2px solid #e9ebf0' : 'none',
        }}
      />
    </div>
  );
});

// ==================== AI 消息气泡组件 ====================

interface AIMessageBubbleProps {
  content: string;
  messageId: string;
  timestamp?: string;
  feedback: 'like' | 'dislike' | undefined;
  showReferences: boolean;
  suggestedQuestions?: string[];
  citations?: Citation[];
  graphContext?: GraphContext;
  onFeedback: (messageId: string, type: 'like' | 'dislike') => void;
  onToggleReferences: (messageId: string) => void;
  onQuickQuestion: (question: string) => void;
}

const AIMessageBubble: React.FC<AIMessageBubbleProps> = React.memo(({
  content,
  messageId,
  timestamp,
  feedback,
  showReferences,
  suggestedQuestions,
  citations,
  graphContext,
  onFeedback,
  onToggleReferences,
  onQuickQuestion,
}) => {
  const { message } = App.useApp();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: 10,
        padding: '0 8px',
      }}
    >
      <Avatar
        size={34}
        icon={<RobotOutlined />}
        style={{
          background: `linear-gradient(135deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
          flexShrink: 0,
          boxShadow: `0 1px 3px rgba(99, 102, 241, 0.3)`,
        }}
      />
      <div style={{ maxWidth: '82%', minWidth: 0 }}>
        <div
          className="ai-message-content"
          style={{
            display: 'block',
            maxWidth: '100%',
            padding: '16px 22px',
            borderRadius: '18px 18px 18px 4px',
            background: COLORS.aiBubbleBg,
            border: `1px solid ${COLORS.aiBubbleBorder}`,
            color: COLORS.aiBubbleText,
            fontSize: 14,
            lineHeight: 1.8,
            wordBreak: 'break-word',
            boxShadow: SHADOWS.aiBubble,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {prepareStreamingMarkdown(content)}
          </ReactMarkdown>
        </div>

        {/* 时间戳 + 操作栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            marginLeft: 4,
            minHeight: 28,
          }}
        >
          {timestamp && (
            <Text style={{ fontSize: 11, color: COLORS.timestampColor, flexShrink: 0 }}>
              {timestamp}
            </Text>
          )}
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              style={{ color: COLORS.actionColor, fontSize: 13 }}
              onClick={() => {
                navigator.clipboard.writeText(content);
                message.success('已复制到剪贴板');
              }}
            />
          </Tooltip>
          <Tooltip title={feedback === 'like' ? '取消点赞' : '有帮助'}>
            <Button
              type="text"
              size="small"
              icon={<LikeOutlined />}
              style={{
                color: feedback === 'like' ? COLORS.actionActiveColor : COLORS.actionColor,
                fontSize: 13,
              }}
              onClick={() => onFeedback(messageId, 'like')}
            />
          </Tooltip>
          <Tooltip title={feedback === 'dislike' ? '取消踩' : '无帮助'}>
            <Button
              type="text"
              size="small"
              icon={<DislikeOutlined />}
              style={{
                color: feedback === 'dislike' ? '#ef4444' : COLORS.actionColor,
                fontSize: 13,
              }}
              onClick={() => onFeedback(messageId, 'dislike')}
            />
          </Tooltip>
          <Tooltip title="知识引用">
            <Button
              type="text"
              size="small"
              icon={<BookOutlined />}
              style={{
                color: showReferences ? COLORS.actionActiveColor : COLORS.actionColor,
                fontSize: 13,
              }}
              onClick={() => onToggleReferences(messageId)}
            />
          </Tooltip>
        </div>

        {/* 知识引用面板 */}
        {showReferences && citations && citations.length > 0 && (
          <Card
            size="small"
            style={{
              marginTop: 8,
              marginLeft: 4,
              background: '#f8f9fb',
              border: '1px solid #e9ebf0',
              borderRadius: 10,
            }}
          >
            <Paragraph style={{ marginBottom: 10, fontWeight: 600, fontSize: 13, color: '#374151' }}>
              知识引用来源
            </Paragraph>
            <List
              size="small"
              dataSource={citations}
              renderItem={(ref) => (
                <List.Item
                  style={{ padding: '8px 0', borderBottom: '1px solid #f1f4f9', cursor: 'pointer' }}
                  onClick={() => openCitationDocument(ref)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text style={{ fontSize: 13, fontWeight: 500, color: '#2563eb' }}>{ref.documentTitle}</Text>
                        <Tag
                          color="green"
                          style={{ fontSize: 11, borderRadius: 4, lineHeight: '18px' }}
                        >
                          {Math.round(ref.relevanceScore * 100)}% 相关
                        </Tag>
                      </Space>
                    }
                    description={
                      <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                        {ref.excerpt}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* KAG 知识图谱上下文 */}
        {graphContext && graphContext.hasResults && (
          <Card
            size="small"
            style={{
              marginTop: 8,
              marginLeft: 4,
              background: 'linear-gradient(135deg, #f5f3ff 0%, #faf9ff 100%)',
              border: '1px solid #d9d0f0',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <ThunderboltOutlined style={{ color: '#6366f1', fontSize: 13 }} />
              <Paragraph style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#374151' }}>
                知识图谱推理
              </Paragraph>
            </div>

            {/* 图谱实体 */}
            {graphContext.entities && graphContext.entities.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>关联实体</Text>
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {graphContext.entities.map((entity, idx) => (
                    <Tag
                      key={idx}
                      style={{
                        borderRadius: 6,
                        fontSize: 11,
                        background: '#f0eeff',
                        border: '1px solid #d4cff0',
                        color: '#5b21b6',
                      }}
                    >
                      {entity.name}
                      {entity.type ? ` (${entity.type})` : ''}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* 图谱路径 */}
            {graphContext.paths && graphContext.paths.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>推理路径</Text>
                {graphContext.paths.map((path, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginTop: 4,
                      padding: '6px 10px',
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                      color: '#4b5563',
                    }}
                  >
                    {path.nodes.join(' → ')}
                    <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>
                      ({path.hops}跳)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 推荐问题 */}
        {suggestedQuestions && suggestedQuestions.length > 0 && (
          <div style={{ marginTop: 10, marginLeft: 4 }}>
            <Text style={{ fontSize: 12, color: COLORS.timestampColor }}>相关问题：</Text>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestedQuestions.map((q, index) => (
                <Tag
                  key={index}
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    borderRadius: 12,
                    background: COLORS.quickTagBg,
                    border: 'none',
                    color: COLORS.quickTagText,
                  }}
                  onClick={() => onQuickQuestion(q)}
                >
                  {q}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ==================== 主组件 ====================

const AIAssistantContent: React.FC = () => {
  const { message } = App.useApp();
  const {
    conversations,
    currentConversation,
    isLoading,
    isStreaming,
    currentResponse,
    selectedModel,
    availableModels,
    ragEnabled,
    kagEnabled,
    fetchConversations,
    createConversation,
    deleteConversation,
    setCurrentConversation,
    sendMessage,
    fetchModels,
    setSelectedModel,
    toggleRag,
    toggleKag,
  } = useAIStore();

  const { user } = useAuthStore();

  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<AIQuickQuestion[]>([]);
  const [messageFeedbacks, setMessageFeedbacks] = useState<Record<string, 'like' | 'dislike'>>({});
  const [showReferences, setShowReferences] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sidebarListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchConversations();
        // 刷新页面后自动选中最新对话，加载聊天历史
        const state = useAIStore.getState();
        if (!state.currentConversation && state.conversations.length > 0) {
          state.setCurrentConversation(state.conversations[0]);
        }
      } catch {
        // fetchConversations 内部已处理 loading 状态
      }
    };
    init();
    fetchQuickQuestions();
    fetchModels();
  }, [fetchConversations, fetchModels]);

  // 当前对话变化时，滚动侧边栏到激活项
  useEffect(() => {
    if (!sidebarListRef.current || !currentConversation?.id) return;
    const activeEl = sidebarListRef.current.querySelector('[data-conv-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentConversation?.id]);

  const scrollToBottom = useCallback(() => {
    // 流式输出期间使用 instant 滚动，避免 smooth 动画（~300ms）被
    // 每 80ms 一次的内容更新反复中断，产生页面跳动。
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? 'auto' : 'smooth',
    });
  }, [isStreaming]);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, currentResponse, scrollToBottom]);

  const fetchQuickQuestions = async () => {
    try {
      const questions = await aiService.getSuggestions();
      setQuickQuestions(
        questions.map((q, index) => ({
          id: `qq-${index}`,
          title: q,
          question: q,
          icon: 'thunderbolt',
        }))
      );
    } catch {
      setQuickQuestions([
        { id: 'qq-1', title: '如何使用企业知识库？', question: '如何使用企业知识库？', icon: 'thunderbolt' },
        { id: 'qq-2', title: '查找关于技术文档的内容', question: '查找关于技术文档的内容', icon: 'thunderbolt' },
        { id: 'qq-3', title: '帮我总结最近的文档', question: '帮我总结最近的文档', icon: 'thunderbolt' },
        { id: 'qq-4', title: '分析文档趋势', question: '分析文档趋势', icon: 'thunderbolt' },
      ]);
    }
  };

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsTyping(true);
    try {
      await sendMessage(content, currentConversation?.id != null ? String(currentConversation.id) : undefined);
    } finally {
      setIsTyping(false);
    }
  }, [sendMessage, currentConversation?.id]);

  const handleQuickQuestion = useCallback((question: string) => {
    chatInputRef.current?.submitWithText(question);
  }, []);

  const handleNewConversation = async () => {
    try {
      await createConversation(`新对话 ${conversations.length + 1}`);
    } catch {
      // handled by store
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
    } catch {
      // handled by store
    }
  };

  const handleFeedback = useCallback(async (messageId: string, type: 'like' | 'dislike') => {
    if (!currentConversation) return;
    try {
      if (messageFeedbacks[messageId] === type) {
        setMessageFeedbacks((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        message.success('已取消反馈');
      } else {
        await aiService.submitFeedback({
          messageId,
          conversationId: String(currentConversation.id),
          type,
        });
        setMessageFeedbacks((prev) => ({ ...prev, [messageId]: type }));
        message.success(type === 'like' ? '感谢您的反馈！' : '感谢您的反馈，我们会继续改进');
      }
    } catch {
      // handled
    }
  }, [currentConversation, messageFeedbacks, message]);

  const toggleReferences = useCallback((messageId: string) => {
    setShowReferences((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  }, []);

  const handleRetry = useCallback(async (userMessageContent: string, messageIdx: number) => {
    if (!currentConversation || isStreaming || isTyping) return;
    // 移除当前用户消息及其后的所有消息（即移除了旧的 AI 回复）
    const trimmedMessages = currentConversation.messages.slice(0, messageIdx);
    setCurrentConversation({
      ...currentConversation,
      messages: trimmedMessages,
      updatedAt: new Date().toISOString(),
    });
    setIsTyping(true);
    try {
      await sendMessage(userMessageContent);
    } finally {
      setIsTyping(false);
    }
  }, [currentConversation, isStreaming, isTyping, sendMessage, setCurrentConversation]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '';
    }
  };

  const truncateTitle = (title: string, maxLen: number = 12) => {
    if (!title) return '';
    return title.length > maxLen ? title.slice(0, maxLen) + '...' : title;
  };

  // ==================== 空状态 ====================

  const renderEmptyState = () => (
    <EmptyState
      image={false}
      className="ai-assistant-empty"
      descriptionNode={(
        <>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)',
            }}
          >
            <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
            {AI_ENTRY_COPY.assistant.emptyTitle}
          </Title>
          <Text style={{ color: COLORS.timestampColor, marginTop: 8, fontSize: 14, display: 'block' }}>
            {AI_ENTRY_COPY.assistant.emptySubtitle}
          </Text>
        </>
      )}
      footer={
        quickQuestions.length > 0 ? (
          <div style={{ marginTop: 36, maxWidth: 560, width: '100%', marginInline: 'auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                justifyContent: 'center',
              }}
            >
              <ThunderboltOutlined style={{ color: '#6366f1', fontSize: 14 }} />
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                快捷提问
              </Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quickQuestions.map((qq) => (
                <div
                  key={qq.id}
                  onClick={() => handleQuickQuestion(qq.question)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: COLORS.quickTagBg,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#374151',
                    border: '1px solid transparent',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e8edf6';
                    e.currentTarget.style.borderColor = '#d4ddf0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.quickTagBg;
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: `linear-gradient(135deg, ${COLORS.sendBtnStart}, ${COLORS.sendBtnEnd})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <ThunderboltOutlined />
                  </span>
                  {qq.title}
                </div>
              ))}
            </div>
          </div>
        ) : undefined
      }
    />
  );

  // ==================== 主渲染 ====================

  return (
    <>
      {/* Markdown 样式注入 */}
      <style>{MARKDOWN_STYLES}</style>

      <div style={{ height: 'calc(100vh - 80px)', display: 'flex', gap: 0 }}>
        {/* ======== 对话历史侧边栏 ======== */}
        <div
          style={{
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.sidebarBg,
            borderRight: `1px solid ${COLORS.sidebarBorder}`,
            borderRadius: '12px 0 0 12px',
            overflow: 'hidden',
          }}
        >
          {/* 顶部操作栏 */}
          <div
            style={{
              padding: '16px',
              borderBottom: `1px solid ${COLORS.sidebarBorder}`,
            }}
          >
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleNewConversation}
              block
              style={{
                height: 40,
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                border: `1px solid ${COLORS.inputBorder}`,
                color: '#374151',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.inputBorder;
                e.currentTarget.style.color = '#374151';
              }}
            >
              新建对话
            </Button>
          </div>

          {/* 对话列表 */}
          <div ref={sidebarListRef} style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <Text style={{ color: COLORS.timestampColor, fontSize: 13 }}>暂无对话记录</Text>
              </div>
            )}
            {conversations.map((conversation) => {
              const isActive = String(currentConversation?.id) === String(conversation.id);
              const moreItems: MenuProps['items'] = [
                {
                  key: 'delete',
                  label: '删除对话',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDeleteConversation(String(conversation.id)),
                },
              ];

              return (
                <div
                  key={conversation.id}
                  data-conv-active={isActive ? 'true' : 'false'}
                  onClick={() => setCurrentConversation(conversation)}
                  style={{
                    position: 'relative',
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? COLORS.sidebarActive : 'transparent',
                    marginBottom: 2,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = COLORS.sidebarHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* 激活态左侧强调条 */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 24,
                        borderRadius: '0 3px 3px 0',
                        background: `linear-gradient(180deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: isActive ? 4 : 0 }}>
                    <Text
                      ellipsis
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#111827' : '#374151',
                        display: 'block',
                      }}
                    >
                      {conversation.title}
                    </Text>
                  </div>
                  <Dropdown menu={{ items: moreItems }} trigger={['click']}>
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: COLORS.timestampColor, flexShrink: 0 }}
                    />
                  </Dropdown>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======== 主对话区域 ======== */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.cardBg,
            borderRadius: '0 12px 12px 0',
            overflow: 'hidden',
            border: `1px solid ${COLORS.cardBorder}`,
            borderLeft: 'none',
            boxShadow: SHADOWS.card,
          }}
        >
          {/* 顶栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: `1px solid ${COLORS.cardBorder}`,
              background: '#fafbfc',
              flexShrink: 0,
            }}
          >
            <Space size={10}>
              <Avatar
                size={30}
                icon={<RobotOutlined />}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
                }}
              />
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{AI_ENTRY_COPY.assistant.title}</Text>
              <Tag
                style={{
                  fontSize: 11,
                  borderRadius: 5,
                  background: '#eff3ff',
                  border: 'none',
                  color: '#5b7ce6',
                  padding: '0 8px',
                  lineHeight: '20px',
                }}
              >
                {AI_ENTRY_COPY.assistant.tagRag}
              </Tag>
            </Space>

            <Space size={10}>
              <Tooltip title={AI_ENTRY_COPY.assistant.ragTooltip}>
                <Space size={4} style={{ fontSize: 12, color: '#6b7280' }}>
                  <Switch
                    size="small"
                    checked={ragEnabled}
                    onChange={(checked) => toggleRag(checked)}
                  />
                  <span>{AI_ENTRY_COPY.assistant.tagRag}</span>
                </Space>
              </Tooltip>
              <Tooltip title="开启后AI将利用知识图谱进行多跳推理，理解知识之间的关联关系">
                <Space size={4} style={{ fontSize: 12, color: '#6b7280' }}>
                  <Switch
                    size="small"
                    checked={kagEnabled}
                    onChange={(checked) => toggleKag(checked)}
                  />
                  <span>图谱推理</span>
                </Space>
              </Tooltip>
              {availableModels.length > 0 && (
                <Select
                  value={selectedModel}
                  onChange={(value) => setSelectedModel(value)}
                  size="small"
                  popupMatchSelectWidth={false}
                  style={{ minWidth: 130 }}
                  options={availableModels.map((m) => ({
                    value: m.key,
                    label: (
                      <Space size={6}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: m.key === 'qwen' ? '#6366f1' : '#10b981',
                          }}
                        />
                        <span style={{ fontSize: 13 }}>{m.displayName}</span>
                        {m.isDefault && (
                          <Tag
                            style={{
                              fontSize: 10,
                              borderRadius: 3,
                              padding: '0 4px',
                              lineHeight: '16px',
                              margin: 0,
                              border: 'none',
                              background: '#e8edf4',
                              color: '#6b7280',
                            }}
                          >
                            默认
                          </Tag>
                        )}
                      </Space>
                    ),
                  }))}
                />
              )}
            </Space>
          </div>

          {/* 消息容器 */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px 20px',
              background: COLORS.pageBg,
            }}
          >
            {!currentConversation || !currentConversation.messages || currentConversation.messages.length === 0 ? (
              renderEmptyState()
            ) : (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {currentConversation.messages.map((message, idx) => {
                  const messageId = String(message.id);
                  const ts = message.timestamp || '';

                  return message.role === 'user' ? (
                    <div key={messageId} style={{ marginBottom: 28 }}>
                      <UserMessageBubble
                        content={message.content}
                        timestamp={formatTime(ts)}
                        avatar={user?.avatar}
                        onRetry={() => handleRetry(message.content, idx)}
                      />
                    </div>
                  ) : (
                    <div key={messageId} style={{ marginBottom: 28 }}>
                      <AIMessageBubble
                        content={message.content}
                        messageId={messageId}
                        timestamp={formatTime(ts)}
                        feedback={messageFeedbacks[messageId]}
                        showReferences={showReferences[messageId] || false}
                        suggestedQuestions={(message as any).suggestedQuestions}
                        citations={message.citations}
                        graphContext={message.graphContext}
                        onFeedback={handleFeedback}
                        onToggleReferences={toggleReferences}
                        onQuickQuestion={handleQuickQuestion}
                      />
                      {message.fromKnowledgeBase && (
                        <div style={{ padding: '0 8px', marginTop: 4 }}>
                          <Tag color="green" style={{ fontSize: 11, borderRadius: 4 }}>
                            知识库增强
                          </Tag>
                        </div>
                      )}
                      {message.citations && message.citations.length > 0 && (
                        <div
                          style={{
                            padding: '8px 8px 0',
                            marginTop: 6,
                            borderTop: '1px solid #f0f0f0',
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block' }}
                          >
                            引用来源
                          </Text>
                          <Space wrap size={[4, 4]}>
                            {message.citations.map((citation) => (
                              <Tooltip
                                key={citation.index}
                                title={
                                  <div style={{ maxWidth: 300 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                      {citation.documentTitle}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                                      {citation.excerpt.length > 150
                                        ? citation.excerpt.slice(0, 150) + '...'
                                        : citation.excerpt}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                      相关度: {(citation.relevanceScore * 100).toFixed(0)}% · 点击打开文档
                                    </div>
                                  </div>
                                }
                              >
                                <Tag
                                  color="blue"
                                  style={{
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    padding: '0 8px',
                                  }}
                                  onClick={() => openCitationDocument(citation)}
                                >
                                  [{citation.index}] {truncateTitle(citation.documentTitle, 12)}
                                </Tag>
                              </Tooltip>
                            ))}
                          </Space>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 流式响应 - 正在输入 */}
                {isStreaming && currentResponse && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '0 8px',
                      marginBottom: 28,
                    }}
                  >
                    <Avatar
                      size={34}
                      icon={<RobotOutlined />}
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
                        flexShrink: 0,
                        boxShadow: `0 1px 3px rgba(99, 102, 241, 0.3)`,
                      }}
                    />
                    <div style={{ flex: 1, maxWidth: '78%' }}>
                      <div
                        className="ai-message-content"
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          padding: '14px 20px',
                          borderRadius: '18px 18px 18px 4px',
                          background: COLORS.aiBubbleBg,
                          border: `1px solid ${COLORS.aiBubbleBorder}`,
                          color: COLORS.aiBubbleText,
                          fontSize: 14,
                          lineHeight: 1.75,
                          wordBreak: 'break-word',
                          boxShadow: SHADOWS.aiBubble,
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={markdownComponents}
                        >
                          {prepareStreamingMarkdown(currentResponse)}
                        </ReactMarkdown>
                        <Spin
                          size="small"
                          style={{
                            marginLeft: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isStreaming && !currentResponse && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0 8px',
                      marginBottom: 28,
                    }}
                  >
                    <Avatar
                      size={34}
                      icon={<RobotOutlined />}
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.aiAvatarStart}, ${COLORS.aiAvatarEnd})`,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '14px 20px',
                        borderRadius: '18px 18px 18px 4px',
                        background: COLORS.aiBubbleBg,
                        border: `1px solid ${COLORS.aiBubbleBorder}`,
                      }}
                    >
                      <Spin size="small" />
                      <Text style={{ color: COLORS.timestampColor, fontSize: 13 }}>
                        正在思考...
                      </Text>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ======== 输入区域 ======== */}
          <ChatInput
            ref={chatInputRef}
            onSend={handleSend}
            isLoading={isLoading}
            isTyping={isTyping}
          />
        </div>
      </div>
    </>
  );
};

export const AIAssistantPage: React.FC = () => {
  const { enableAI } = useAppStore();

  if (!enableAI) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Card style={{ textAlign: 'center', maxWidth: 400 }}>
          <RobotOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
          <Typography.Title level={4}>{AI_ENTRY_COPY.assistant.disabledTitle}</Typography.Title>
          <Typography.Text type="secondary">{AI_ENTRY_COPY.assistant.disabledDesc}</Typography.Text>
        </Card>
      </div>
    );
  }

  return <AIAssistantContent />;
};

export default AIAssistantPage;
