import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Tooltip, Modal, Form, Input, Pagination, Select, DatePicker, Tag, Typography } from 'antd';
import { PageLoading } from '@/components/common';
import { App } from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  StarOutlined,
  StarFilled,
  LikeOutlined,
  LikeFilled,
  EyeOutlined,
  ClockCircleOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  RobotOutlined,
  CopyOutlined,
  CheckOutlined,
  LinkOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  MessageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { normalizeMarkdown } from '../utils/markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useDocumentStore, useAuthStore, useFavoriteStore, useAppStore } from '@/stores';
import { documentService, ShareVO } from '@/services/document.service';
import { commentService } from '@/services/comment.service';
import { aiService } from '@/services/ai.service';
import UserAvatar from '@/components/common/UserAvatar';
import type { Comment } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { Dayjs } from 'dayjs';
import { PERMISSIONS, hasPermission } from '@/utils/permission';
import { useComplianceConfirm } from '@/hooks';

// 扩展 dayjs 插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 延迟加载 PrismJS 相关模块，避免初始化时的导入错误
const loadPrism = async () => {
  try {
    const Prism = await import('prismjs');
    // 使用自定义的IDEA One Dark Pro样式，不导入prism主题

    const languageImports = [
      'prismjs/components/prism-typescript',
      'prismjs/components/prism-javascript',
      'prismjs/components/prism-java',
      'prismjs/components/prism-python',
      'prismjs/components/prism-go',
      'prismjs/components/prism-rust',
      'prismjs/components/prism-cpp',
      'prismjs/components/prism-c',
      'prismjs/components/prism-bash',
      'prismjs/components/prism-shell',
      'prismjs/components/prism-sql',
      'prismjs/components/prism-json',
      'prismjs/components/prism-yaml',
      'prismjs/components/prism-markdown',
      'prismjs/components/prism-css',
      'prismjs/components/prism-scss',
      'prismjs/components/prism-less',
      'prismjs/components/prism-markup',
      'prismjs/components/prism-xml',
      'prismjs/components/prism-html',
      'prismjs/components/prism-jsx',
      'prismjs/components/prism-tsx',
      'prismjs/components/prism-regex',
    ];

    for (const lang of languageImports) {
      try {
        await import(lang);
      } catch (e) {
        // 静默失败
      }
    }

    return Prism;
  } catch (error) {
    return null;
  }
};

// PrismJS 代码高亮 CSS - GitHub Dark 主题配色（高对比度，清晰可读）
const prismThemeCSS = `
  .code-block-wrapper pre code .token.comment,
  .code-block-wrapper pre code .token.prolog,
  .code-block-wrapper pre code .token.doctype,
  .code-block-wrapper pre code .token.cdata {
    color: #8b949e;
    font-style: italic;
  }
  .code-block-wrapper pre code .token.punctuation {
    color: #c9d1d9;
  }
  .code-block-wrapper pre code .token.property,
  .code-block-wrapper pre code .token.tag,
  .code-block-wrapper pre code .token.boolean,
  .code-block-wrapper pre code .token.number,
  .code-block-wrapper pre code .token.constant,
  .code-block-wrapper pre code .token.symbol,
  .code-block-wrapper pre code .token.deleted {
    color: #a5d6ff;
  }
  .code-block-wrapper pre code .token.selector,
  .code-block-wrapper pre code .token.attr-name,
  .code-block-wrapper pre code .token.string,
  .code-block-wrapper pre code .token.char,
  .code-block-wrapper pre code .token.builtin,
  .code-block-wrapper pre code .token.inserted {
    color: #a5d6ff;
  }
  .code-block-wrapper pre code .token.operator,
  .code-block-wrapper pre code .token.entity,
  .code-block-wrapper pre code .token.url {
    color: #e6edf3;
  }
  .code-block-wrapper pre code .token.atrule,
  .code-block-wrapper pre code .token.attr-value,
  .code-block-wrapper pre code .token.keyword {
    color: #79c0ff;
  }
  .code-block-wrapper pre code .token.function {
    color: #d2a8ff;
  }
  .code-block-wrapper pre code .token.class-name {
    color: #7ee6a3;
  }
  .code-block-wrapper pre code .token.regex,
  .code-block-wrapper pre code .token.important,
  .code-block-wrapper pre code .token.variable {
    color: #ffa198;
  }
  .code-block-wrapper pre code .token.important,
  .code-block-wrapper pre code .token.bold {
    font-weight: bold;
  }
  .code-block-wrapper pre code .token.italic {
    font-style: italic;
  }
  .code-block-wrapper pre code .token.namespace {
    opacity: 0.7;
  }
`;

// 闪烁光标动画（AI摘要流式输出用）
const blinkCursorCSS = `
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
`;

// CSS变量 - 严格按照产品原型
const styles = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  borderColor: '#e2e8f0',
  radiusXl: '16px',
  radiusLg: '12px',
  radiusMd: '8px',
  radiusSm: '6px',
};

export const DocumentDetailPage: React.FC = () => {
  const { message } = App.useApp();
  const { runWithConfirm } = useComplianceConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { enableAI, enableComments } = useAppStore();
  const canEditDocument = hasPermission(user, PERMISSIONS.documentEdit);
  const { currentDocument, isLoading, fetchDocument, likeDocument, prevDocument, nextDocument } = useDocumentStore();
  const { toggleFavorite, checkFavorite } = useFavoriteStore();

  // 使用选择器来确保状态订阅
  const isFavorited = useFavoriteStore((state) => {
    const docId = currentDocument?.id || '';
    const status = state.favorites.get(docId);
    console.log('🔍 [DocumentDetailPage] 选择器检查收藏状态:', {
      documentId: docId,
      status: status,
      favorites: Array.from(state.favorites.entries()),
      result: status === true
    });
    return status === true;
  });

  const liked = !!currentDocument?.isLiked;
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // 评论相关状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentPage, setCommentPage] = useState({ current: 1, size: 10, total: 0 });
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string | number; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [tocItems, setTocItems] = useState<Array<{ id: string; title: string; level: number }>>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [, setPrismLoaded] = useState(false);
  const [contentPage, setContentPage] = useState(1); // 分页加载：当前加载的页数
  const PAGE_SIZE = 30000; // 每页字符数

  // 文档切换时重置分页
  useEffect(() => { setContentPage(1); }, [id]);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareList, setShareList] = useState<ShareVO[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [createShareLoading, setCreateShareLoading] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [form] = Form.useForm();

  const contentRef = useRef<HTMLDivElement>(null);
  const lastViewedIdRef = useRef<string | null>(null); // 跟踪上次浏览的文档ID

  // AI摘要生成相关状态
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [streamedSummary, setStreamedSummary] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const isSummarizingRef = useRef(false); // 防重复调用互斥锁
  const summaryAbortRef = useRef<AbortController | null>(null); // 取消控制

  // 代码高亮初始化 - 使用更可靠的方法
  useEffect(() => {
    let mounted = true;
    const maxAttempts = 3;

    const initPrism = async () => {
      try {
        const PrismModule = await loadPrism();

        if (mounted && PrismModule && currentDocument?.content && contentRef.current) {
          const Prism = PrismModule.default || PrismModule;

          // 多次尝试高亮，确保DOM完全渲染
          const attemptHighlight = async (attempt: number) => {
            const codeBlocks = contentRef.current?.querySelectorAll('pre code[class*="language-"]');

            if (!codeBlocks || codeBlocks.length === 0) {
              return;
            }

            codeBlocks.forEach((block) => {
              try {
                if (typeof Prism.highlightElement === 'function') {
                  if (!block.getAttribute('data-highlighted')) {
                    Prism.highlightElement(block);
                  }
                }
              } catch (e) {
                // 静默处理错误
              }
            });

            // 检查高亮结果
            setTimeout(() => {
              const highlightedBlocks = contentRef.current?.querySelectorAll('pre code[class*="language-"]');
              let totalTokens = 0;

              highlightedBlocks?.forEach((block) => {
                const tokens = block.querySelectorAll(':scope > .token');
                totalTokens += tokens.length;
              });

              // 如果token数量为0且还有重试机会，延迟重试
              if (totalTokens === 0 && attempt < maxAttempts) {
                setTimeout(() => attemptHighlight(attempt + 1), 300);
              } else {
                setPrismLoaded(true);
              }
            }, 100);
          };

          // 开始第一次尝试
          setTimeout(() => attemptHighlight(1), 200);
        }
      } catch (error) {
        // 静默处理错误
      }
    };

    initPrism();

    return () => {
      mounted = false;
    };
  }, [currentDocument?.content]);

  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }

    // 文档切换/组件卸载时取消进行中的摘要生成
    return () => {
      if (summaryAbortRef.current) {
        summaryAbortRef.current.abort();
        summaryAbortRef.current = null;
      }
      isSummarizingRef.current = false;
      setIsSummarizing(false);
      setStreamedSummary('');
      setSummaryError(null);
    };
    // 文档加载严格由路由 id 驱动，避免加载器重建导致重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 单独处理浏览量增加，后端会自动记录访问记录
  useEffect(() => {
    if (id && currentDocument && lastViewedIdRef.current !== id) {
      lastViewedIdRef.current = id;
      documentService.viewDocument(id).catch((error) => {
        console.error('增加浏览量失败:', error);
      });
    }
  }, [id, currentDocument]);

  // 检查收藏状态
  useEffect(() => {
    const checkAndSetFavoriteStatus = async () => {
      if (id) {
        console.log('🔄 [DocumentDetailPage] 检查收藏状态,文档ID:', id);
        // 只检查当前文档的收藏状态，不重新加载整个收藏列表
        await checkFavorite(id);
      }
    };
    checkAndSetFavoriteStatus();
  }, [checkFavorite, id]);

  // 提取目录结构
  useEffect(() => {
    if (currentDocument?.content) {
      const items: Array<{ id: string; title: string; level: number }> = [];
      const lines = currentDocument.content.split('\n');
      let headingIndex = 0;

      lines.forEach((line) => {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const rawTitle = match[2];
          const displayTitle = rawTitle
            .replace(/^[\d]+\.[\d]+(?:\.\d+)*[\s.)）、]*/, '')
            .replace(/^[\d]+[.)）、]\s*/, '')
            .trim();
          const title = displayTitle || rawTitle;
          const stableId = `md-heading-${headingIndex}`;
          items.push({ id: stableId, title, level });
          headingIndex++;
        }
      });

      setTocItems(items);
    }
  }, [currentDocument?.content]);

  // 滚动监听，更新目录激活状态（scroll spy）
  useEffect(() => {
    const handleScroll = () => {
      const headingEls = document.querySelectorAll('[id^="md-heading-"]');
      if (headingEls.length === 0) return;
      const scrollPos = window.scrollY + 120;
      let currentId = '';
      headingEls.forEach((el) => {
        const top = (el as HTMLElement).offsetTop;
        if (scrollPos >= top) {
          currentId = el.id;
        }
      });
      if (currentId) setActiveSection(currentId);
    };
    const timer = setInterval(handleScroll, 200);
    return () => clearInterval(timer);
  }, [currentDocument?.content]);

  // 滚动监听更新目录激活状态

  const handleGenerateSummary = async () => {
    const currentDoc = useDocumentStore.getState().currentDocument;
    if (!currentDoc || !id) return;

    // 互斥锁防止重复调用
    if (isSummarizingRef.current) return;
    isSummarizingRef.current = true;

    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      message.warning('文档内容为空，无法生成摘要');
      isSummarizingRef.current = false;
      return;
    }

    setIsSummarizing(true);
    setStreamedSummary('');
    setSummaryError(null);

    const controller = new AbortController();
    summaryAbortRef.current = controller;

    try {
      await aiService.generateDocSummaryStream(
        {
          content: currentDoc.content,
          title: currentDoc.title,
          length: 200,
        },
        (chunk) => {
          setStreamedSummary((prev) => prev + chunk);
        },
        async (result) => {
          // 流式完成，持久化摘要到后端并同步更新本地状态
          const finalSummary = result.processedContent;
          try {
            await documentService.updateSummary(id, finalSummary);
            // 立即更新 Zustand store
            const store = useDocumentStore.getState();
            if (store.currentDocument) {
              store.setCurrentDocument({ ...store.currentDocument, summary: finalSummary });
            }
            message.success('AI摘要已生成');
          } catch {
            // 持久化失败不阻塞UI，streamedSummary 仍会展示
            message.warning('摘要已生成，但保存失败，刷新后可能丢失');
          }
          setIsSummarizing(false);
          setSummaryError(null);
          isSummarizingRef.current = false;
          summaryAbortRef.current = null;
        },
        (error) => {
          // 区分主动取消和真实错误
          if (error === 'AbortError' || error.includes('abort')) {
            setStreamedSummary('');
          } else {
            setSummaryError(error || '生成失败，请重试');
          }
          setIsSummarizing(false);
          isSummarizingRef.current = false;
          summaryAbortRef.current = null;
        },
      );
    } catch {
      setSummaryError('网络异常，请检查连接后重试');
      setIsSummarizing(false);
      isSummarizingRef.current = false;
      summaryAbortRef.current = null;
    }
  };

  const handleLike = async () => {
    if (!currentDoc) return;
    const wasLiked = !!currentDocument?.isLiked;
    try {
      await likeDocument(currentDoc.id);
      message.success(wasLiked ? '已取消点赞' : '点赞成功');
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 加载评论
  const loadComments = async (page = 1) => {
    if (!id) return;
    setCommentLoading(true);
    try {
      const result = await commentService.pageDocumentComments(id, {
        current: page,
        size: commentPage.size,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setComments(result.records || []);
      setCommentPage(prev => ({ ...prev, current: page, total: result.total }));
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmittingComment(true);
    try {
      await commentService.createComment({
        documentId: id,
        content: commentText.trim(),
      });
      setCommentText('');
      message.success('评论发表成功');
      loadComments(commentPage.current);
    } catch (error) {
      message.error('评论发表失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 点赞/取消点赞评论
  const handleLikeComment = async (commentId: string | number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await commentService.unlikeComment(commentId);
      } else {
        await commentService.likeComment(commentId);
      }
      // 刷新评论列表以获取最新isLiked状态
      loadComments(commentPage.current);
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string | number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await commentService.deleteComment(commentId);
          message.success('评论已删除');
          loadComments(commentPage.current);
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 提交回复
  const handleReplySubmit = async (parentId: string | number) => {
    if (!replyText.trim() || !id) return;
    setSubmittingReply(true);
    try {
      await commentService.createComment({
        documentId: id,
        content: replyText.trim(),
        parentId,
      });
      setReplyText('');
      setReplyTo(null);
      message.success('回复成功');
      loadComments(commentPage.current);
    } catch (error) {
      message.error('回复失败');
    } finally {
      setSubmittingReply(false);
    }
  };

  // 加载评论（文档变化时）
  useEffect(() => {
    if (id && currentDocument) {
      loadComments(1);
    }
    // 评论加载由当前文档 id 驱动，避免分页加载器重建后重复拉取。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentDocument?.id]);

  const handleFavorite = async () => {
    if (!currentDocument?.id) return;

    setFavoriteLoading(true);
    try {
      const newFavoriteStatus = await toggleFavorite(currentDocument.id);
      message.success(newFavoriteStatus ? '已添加到收藏夹' : '已取消收藏');
    } catch (error) {
      console.error('收藏操作失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;

    setShareModalVisible(true);
    setShareLoading(true);

    try {
      const shares = await documentService.getDocumentShares(id);
      setShareList(shares || []);
    } catch (error) {
      console.error('获取分享列表失败:', error);
      message.error('获取分享列表失败');
    } finally {
      setShareLoading(false);
    }
  };

  /**
   * 下载当前文档 PDF；尊重合规「导出二次确认」开关。
   */
  const handleDownload = async () => {
    if (!id) return;

    /**
     * 执行 PDF 生成与下载。
     */
    const doDownload = async () => {
      try {
        message.loading({ content: '正在生成PDF...', key: 'pdf-download' });
        await documentService.downloadDocumentPdf(id);
        message.success({ content: 'PDF下载成功', key: 'pdf-download' });
      } catch (error) {
        console.error('PDF下载失败:', error);
        const errorMessage = error instanceof Error ? error.message : 'PDF下载失败，请重试';
        message.error({ content: errorMessage, key: 'pdf-download' });
      }
    };

    await runWithConfirm('confirmSensitiveExport', {
      title: '确认导出 PDF？',
      content: '将根据当前文档内容生成 PDF 并下载，可能包含水印等合规信息。',
      okText: '确认导出',
      action: doDownload,
    });
  };

  const handleCreateShare = async (values: {
    shareType: number;
    expireType: number;
    expireTime?: Dayjs;
    accessLimit?: number;
    requirePassword: number;
    password?: string;
    description?: string;
  }) => {
    if (!id) return;

    setCreateShareLoading(true);

    try {
      const shareData: any = {
        documentId: id,
        shareType: values.shareType,
        expireType: values.expireType,
        accessLimit: values.accessLimit || 0,
        requirePassword: values.requirePassword,
        description: values.description,
      };

      if (values.expireType === 2 && values.expireTime) {
        shareData.expireTime = values.expireTime.format('YYYY-MM-DDTHH:mm:ss');
      }

      if (values.requirePassword === 1 && values.password) {
        shareData.password = values.password;
      }

      const result = await documentService.createShare(shareData);

      message.success('分享链接创建成功');

      setShareList([result, ...shareList]);
      form.resetFields();
    } catch (error) {
      console.error('创建分享失败:', error);
      message.error('创建分享失败，请重试');
    } finally {
      setCreateShareLoading(false);
    }
  };

  const handleCopyShareLink = (shareId: string) => {
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(shareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
    message.success('分享链接已复制到剪贴板');
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      await documentService.deleteShare(shareId);
      setShareList(shareList.filter(s => s.shareId !== shareId));
      message.success('分享链接已删除');
    } catch (error) {
      console.error('删除分享失败:', error);
      message.error('删除分享失败');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollBy(0, -60); // offset for fixed header
    }
  };

  const handleNavToDoc = (docId: string) => {
    window.open(`/documents/${docId}`, '_blank');
  };

  // 复制代码功能
  const handleCopyCode = (code: string, codeId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeId(codeId);
      message.success('代码已复制到剪贴板');
      setTimeout(() => setCopiedCodeId(null), 2000);
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 生成代码块ID
  const generateCodeId = () => `code-${Math.random().toString(36).substr(2, 9)}`;

  // 标题 ID 计数器（用于 TOC 滚动定位）
  const headingIdCounter = useRef(0);

  // 重置标题计数器（文档内容变化时）
  useEffect(() => {
    headingIdCounter.current = 0;
  }, [currentDocument?.content]);

  // ── Markdown 自定义渲染组件（复用 GitHub Dark 代码高亮等样式） ──
  const markdownComponents: Record<string, React.ComponentType<any>> = {
    h1: ({ node: _node, children, ...props }: any) => {
      const id = `md-heading-${headingIdCounter.current++}`;
      return (
        <h2
          id={id}
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: styles.textPrimary,
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: `2px solid ${styles.bgTertiary}`,
            marginTop: '0',
            scrollMarginTop: '80px',
          }}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h2: ({ node: _node, children, ...props }: any) => {
      const id = `md-heading-${headingIdCounter.current++}`;
      return (
        <h2
          id={id}
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: styles.textPrimary,
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: `2px solid ${styles.bgTertiary}`,
            marginTop: '16px',
            scrollMarginTop: '80px',
          }}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ node: _node, children, ...props }: any) => {
      const id = `md-heading-${headingIdCounter.current++}`;
      return (
        <h3
          id={id}
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: styles.textPrimary,
            marginTop: '16px',
            marginBottom: '8px',
            scrollMarginTop: '80px',
          }}
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ node: _node, ...props }: any) => (
      <h4
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: styles.textPrimary,
          marginTop: '20px',
          marginBottom: '10px',
        }}
        {...props}
      />
    ),
    p: ({ node: _node, ...props }: any) => (
      <p
        style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: styles.textSecondary,
          marginBottom: '10px',
        }}
        {...props}
      />
    ),
    ul: ({ node: _node, ...props }: any) => (
      <ul style={{ marginLeft: '24px', marginBottom: '16px' }} {...props} />
    ),
    ol: ({ node: _node, ...props }: any) => (
      <ol style={{ marginLeft: '24px', marginBottom: '16px' }} {...props} />
    ),
    li: ({ node: _node, ...props }: any) => (
      <li
        style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: styles.textSecondary,
          marginBottom: '5px',
        }}
        {...props}
      />
    ),
    code: ({ node: _node, inline, className, children, ...props }: any) => {
      const codeContent = String(children);
      const hasNewline = codeContent.includes('\n');
      const isInline = inline === true || (!hasNewline && !className);

      if (isInline) {
        return (
          <code
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              color: '#0366d6',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
              fontWeight: 400,
              lineHeight: 'inherit',
              border: 'none',
              display: 'inline',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ node: _node, children, ...props }: any) => {
      const codeElement = children as React.ReactElement;
      const codeProps = (codeElement?.props ?? {}) as {
        children?: React.ReactNode;
        className?: string;
      };
      const codeContent = String(codeProps.children || '');
      const codeString = codeContent.replace(/\n$/, '');
      const className = codeProps.className || '';
      const language = className.replace(/language-/, '') || 'text';
      const codeId = generateCodeId();

      return (
        <div
          className="code-block-wrapper"
          data-language={language}
          data-code-id={codeId}
          data-code={codeString}
          style={{
            position: 'relative',
            background: '#0d1117',
            borderRadius: '10px',
            margin: '16px 0',
            overflow: 'hidden',
            border: '1px solid #30363d',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* 代码块头部 - GitHub Dark 风格 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              background: '#161b22',
              borderBottom: '1px solid #30363d',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ff5f56',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffbd2e',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#27c93f',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: '#8b949e',
                  fontWeight: 500,
                  marginLeft: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {language}
              </span>
            </div>

            <Tooltip title={copiedCodeId === codeId ? '已复制' : '复制代码'}>
              <Button
                type="text"
                size="small"
                icon={copiedCodeId === codeId ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => handleCopyCode(codeString, codeId)}
                style={{
                  color: copiedCodeId === codeId ? '#7ee6a3' : '#c9d1d9',
                  fontSize: '12px',
                  height: '28px',
                  padding: '0 12px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e: any) => {
                  if (copiedCodeId !== codeId) {
                    e.currentTarget.style.background = 'rgba(201, 209, 217, 0.1)';
                  }
                }}
                onMouseLeave={(e: any) => {
                  if (copiedCodeId !== codeId) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {copiedCodeId === codeId ? '已复制' : '复制'}
              </Button>
            </Tooltip>
          </div>

          <pre
            className={className || undefined}
            style={{
              fontFamily:
                '"JetBrains Mono", "Fira Code", "Cascadia Code", "Monaco", "Menlo", "Consolas", monospace',
              fontSize: '14px',
              lineHeight: 1.7,
              color: '#e6edf3',
              margin: 0,
              padding: '20px',
              whiteSpace: 'pre',
              overflowX: 'auto',
              background: '#0d1117',
              textAlign: 'left',
              borderRadius: '0 0 10px 10px',
              WebkitFontSmoothing: 'antialiased',
            }}
            {...props}
          >
            {children}
          </pre>
        </div>
      );
    },
    blockquote: ({ node: _node, ...props }: any) => (
      <blockquote
        style={{
          background: 'rgba(37, 99, 235, 0.05)',
          borderLeft: '4px solid #2563eb',
          padding: '16px 20px',
          margin: '16px 0',
          borderRadius: '4px',
          color: styles.textSecondary,
          fontSize: '15px',
          lineHeight: 1.7,
        }}
        {...props}
      />
    ),
    a: ({ node: _node, ...props }: any) => (
      <a
        style={{
          color: styles.primary,
          textDecoration: 'none',
        }}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    table: ({ node: _node, ...props }: any) => (
      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
          {...props}
        />
      </div>
    ),
    th: ({ node: _node, ...props }: any) => (
      <th
        style={{
          background: styles.bgTertiary,
          padding: '12px',
          textAlign: 'left',
          fontWeight: 600,
          border: `1px solid ${styles.borderColor}`,
        }}
        {...props}
      />
    ),
    td: ({ node: _node, ...props }: any) => (
      <td
        style={{
          padding: '12px',
          border: `1px solid ${styles.borderColor}`,
        }}
        {...props}
      />
    ),
    hr: ({ node: _node, ...props }: any) => (
      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${styles.borderColor}`,
          margin: '24px 0',
        }}
        {...props}
      />
    ),
  };

  // 处理tags，将字符串转换为数组
  const tags = currentDocument?.tags
    ? (typeof currentDocument.tags === 'string' ? currentDocument.tags.split(',').filter(Boolean) : currentDocument.tags)
    : [];

  // 获取作者头像文字
  const getAvatarText = (name?: string) => {
    if (!name) return '未知';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading || !currentDocument) {
    return (
      <PageLoading
        style={{
          minHeight: '100vh',
          backgroundColor: styles.bgSecondary,
        }}
      />
    );
  }

  const currentDoc = currentDocument;

  return (
    <React.Fragment>
      <div style={{
        backgroundColor: styles.bgSecondary,
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: styles.textPrimary,
        lineHeight: 1.6,
      }}>
      {/* 顶部导航栏 */}
      <nav style={{
        background: styles.bgPrimary,
        borderBottom: `1px solid ${styles.borderColor}`,
        padding: '0 24px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/documents')}
            style={{
              color: styles.textSecondary,
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            返回文档中心
          </Button>
        </div>
      </nav>

      {/* 主容器 */}
      <div style={{
        maxWidth: '1800px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* 面包屑 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '16px',
          marginTop: '16px',
          fontSize: '12px',
          color: styles.textMuted,
        }}>
          <a
            onClick={() => navigate('/')}
            style={{ color: styles.textSecondary, cursor: 'pointer', textDecoration: 'none' }}
          >
            首页
          </a>
          <span style={{ color: styles.textMuted }}>/</span>
          <a
            onClick={() => navigate('/documents')}
            style={{ color: styles.textSecondary, cursor: 'pointer', textDecoration: 'none' }}
          >
            文档中心
          </a>
          <span style={{ color: styles.textMuted }}>/</span>
          <span>{currentDoc.title}</span>
        </div>

        {/* 文档头部 */}
        <div style={{
          background: styles.bgPrimary,
          borderRadius: styles.radiusXl,
          padding: '8px 12px',
          marginBottom: '6px',
          border: `1px solid ${styles.borderColor}`,
        }}>
          {/* 元数据行 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '4px',
            flexWrap: 'wrap',
          }}>
            <span style={{
              padding: '6px 12px',
              borderRadius: styles.radiusLg,
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              background: 'rgba(37, 99, 235, 0.1)',
              color: styles.primary,
            }}>
              {currentDoc.documentType === 1 ? '技术文档' : '文件文档'}
            </span>
            <span style={{
              padding: '6px 12px',
              borderRadius: styles.radiusLg,
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              background: currentDoc.status === 1 ? 'rgba(16, 185, 129, 0.1)'
                : currentDoc.status === 3 ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(107, 114, 128, 0.1)',
              color: currentDoc.status === 1 ? styles.success
                : currentDoc.status === 3 ? '#f59e0b'
                : styles.textMuted,
            }}>
              {currentDoc.status === 1 ? '已发布' : currentDoc.status === 3 ? '审核中' : '草稿'}
            </span>
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                padding: '6px 12px',
                borderRadius: styles.radiusLg,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: 'rgba(139, 92, 246, 0.1)',
                color: styles.secondary,
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* 文档标题 */}
          <h1 style={{
            fontSize: '26px',
            fontWeight: 700,
            color: styles.textPrimary,
            marginBottom: '4px',
            lineHeight: 1.3,
          }}>
            {currentDoc.title}
          </h1>

          {/* 审核中提示 */}
          {currentDoc.status === 3 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: styles.radiusMd,
              marginBottom: '16px',
            }}>
              <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: '16px' }} />
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#f59e0b',
              }}>
                审核中 - 此文档正在审核中，审核通过后将正式发布
              </span>
            </div>
          )}
          {/* 预览提示 - 仅草稿状态显示 */}
          {currentDoc.status !== 1 && currentDoc.status !== 3 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: styles.radiusMd,
              marginBottom: '16px',
            }}>
              <EyeOutlined style={{ color: '#f59e0b', fontSize: '16px' }} />
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#f59e0b',
              }}>
                预览模式 - 此文档尚未正式发布，仅您可见
              </span>
            </div>
          )}

          {/* 文档信息行 */}
          <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            {/* 作者信息 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${styles.primary}, ${styles.secondary})`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {getAvatarText(currentDoc.author?.username || currentDoc.authorName)}
              </div>
              <span style={{ fontSize: '14px', color: styles.textSecondary }}>
                {currentDoc.author?.username || currentDoc.authorName || '未知作者'}
              </span>
            </div>

            {/* 统计信息 */}
            <div style={{
              display: 'flex',
              gap: '24px',
              fontSize: '14px',
              color: styles.textSecondary,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClockCircleOutlined />
                <span>{dayjs(currentDoc.updatedAt).fromNow()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <EyeOutlined />
                <span>{currentDoc.viewCount?.toLocaleString() || 0}次浏览</span>
              </div>
            </div>
          </div>

          {/* 操作按钮栏 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: `1px solid ${styles.borderColor}`,
            flexWrap: 'wrap',
          }}>
            {/* 当前用户是否为文档作者 */}
            {(() => {
              const isOwner = user?.id && (
                String(currentDoc.authorId) === String(user.id) ||
                String(currentDoc.author?.id) === String(user.id)
              );

              // 已发布文档的操作按钮
              if (currentDoc.status === 1) {
                return (
                  <>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                      style={{
                        background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(96, 165, 250, 0.3)',
                        fontWeight: 600,
                      }}
                    >
                      下载PDF
                    </Button>
                    <Button
                      icon={<ShareAltOutlined />}
                      onClick={handleShare}
                      style={{
                        background: styles.bgPrimary,
                        color: styles.textPrimary,
                        border: `1px solid ${styles.borderColor}`,
                        fontWeight: 600,
                      }}
                    >
                      分享文档
                    </Button>
                    {isOwner && canEditDocument && (
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/documents/${currentDoc.id}/edit`)}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        编辑文档
                      </Button>
                    )}
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        const content = currentDoc.content?.substring(0, 500) || '';
                        const title = currentDoc.title || '';
                        navigate(`/ai-writing?content=${encodeURIComponent(content)}&title=${encodeURIComponent(title)}`);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                        fontWeight: 600,
                      }}
                    >
                      AI写作
                    </Button>
                  </>
                );
              }

              // 草稿文档：显示编辑按钮
              if (currentDoc.status !== 3 && isOwner && canEditDocument) {
                return (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/documents/${currentDoc.id}/edit`)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    编辑文档
                  </Button>
                );
              }

              return null;
            })()}
          </div>
        </div>

        {/* 内容网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 260px',
          gap: '10px',
        }}>
          {/* 主要内容区域 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* AI摘要 */}
            {enableAI && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(139, 92, 246, 0.05))',
              border: `1px solid ${summaryError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`,
              borderRadius: styles.radiusXl,
              padding: '12px 16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: styles.radiusLg,
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <RobotOutlined style={{ color: styles.primary, fontSize: '20px' }} />
                  </div>
                  <span style={{ fontWeight: 600, color: styles.textPrimary, fontSize: '15px' }}>
                    AI智能摘要
                  </span>
                  {isSummarizing && (
                    <Tag color="processing" style={{ margin: 0 }}>生成中...</Tag>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {currentDoc.summary && !isSummarizing && !streamedSummary && (
                    <Tooltip title="复制摘要">
                      <Button
                        type="text"
                        size="small"
                        icon={summaryCopied ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(currentDoc.summary || '');
                          setSummaryCopied(true);
                          message.success('摘要已复制');
                          setTimeout(() => setSummaryCopied(false), 2000);
                        }}
                      />
                    </Tooltip>
                  )}
                  <Button
                    type={currentDoc.summary ? 'default' : 'primary'}
                    size="small"
                    icon={isSummarizing ? undefined : <RobotOutlined />}
                    loading={isSummarizing}
                    disabled={isSummarizing}
                    onClick={handleGenerateSummary}
                    style={currentDoc.summary ? undefined : {
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      border: 'none',
                    }}
                  >
                    {currentDoc.summary ? '重新生成' : 'AI生成摘要'}
                  </Button>
                </div>
              </div>

              {/* 摘要内容区域 */}
              <div style={{
                fontSize: '15px',
                lineHeight: 1.8,
                color: styles.textSecondary,
                minHeight: '24px',
              }}>
                {/* 优先显示流式生成中/刚完成的摘要，其次显示数据库中的摘要 */}
                {(() => {
                  const effectiveSummary = streamedSummary || currentDoc.summary;

                  if (isSummarizing) {
                    return (
                      <div>
                        {streamedSummary ? (
                          <span>{streamedSummary}<span style={{
                            display: 'inline-block',
                            width: '2px',
                            height: '16px',
                            background: styles.primary,
                            marginLeft: '2px',
                            animation: 'blink 0.8s infinite',
                            verticalAlign: 'text-bottom',
                          }} /></span>
                        ) : (
                          <span style={{ color: styles.textMuted, fontStyle: 'italic' }}>
                            AI正在分析文档内容...
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (summaryError) {
                    return (
                      <div style={{ color: styles.danger, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>生成失败：{summaryError}</span>
                        <Button type="link" size="small" danger onClick={handleGenerateSummary} style={{ padding: 0 }}>
                          重试
                        </Button>
                      </div>
                    );
                  }

                  if (effectiveSummary) {
                    return <span>{effectiveSummary}</span>;
                  }

                  return (
                    <span style={{ color: styles.textMuted, fontStyle: 'italic' }}>
                      点击"AI生成摘要"按钮，让AI帮你快速了解文档核心内容
                    </span>
                  );
                })()}
              </div>
            </div>
            )}

            {/* 文档内容 */}
            <div
              ref={contentRef}
              className="markdown-content"
              style={{
                background: styles.bgPrimary,
                borderRadius: styles.radiusXl,
                border: `1px solid ${styles.borderColor}`,
                minHeight: '400px',
                padding: '32px 40px',
              }}
            >
              <style>{prismThemeCSS}</style>
              <style>{blinkCursorCSS}</style>

              {currentDoc.content ? (
                <>
                  {/* 重置计数器 */}
                  {(() => { headingIdCounter.current = 0; return null; })()}

                  {/* 渲染已加载的内容分页 */}
                  {(() => {
                    const totalLen = currentDoc.content.length;
                    const displayLen = Math.min(contentPage * PAGE_SIZE, totalLen);
                    const displayContent = currentDoc.content.substring(0, displayLen);

                    return (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={markdownComponents}
                        >
                          {normalizeMarkdown(displayContent)}
                        </ReactMarkdown>

                        {/* 加载更多 / 已全部加载 */}
                        {displayLen < totalLen ? (
                          <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <Button
                              type="primary"
                              onClick={() => setContentPage((p) => p + 1)}
                              style={{
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                              }}
                            >
                              加载更多（{displayLen.toLocaleString()} / {totalLen.toLocaleString()} 字符）
                            </Button>
                          </div>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '24px 0',
                            color: styles.textMuted,
                            fontSize: '13px',
                            borderTop: `1px solid ${styles.borderColor}`,
                            marginTop: '24px',
                          }}>
                            已加载全部内容（{totalLen.toLocaleString()} 字符）
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '300px',
                  color: styles.textMuted,
                }}>
                  <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontSize: '16px' }}>暂无文档内容</p>
                </div>
              )}
            </div>

            {/* 点赞 + 收藏栏 */}
            {currentDoc.status === 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                padding: '20px 0',
              }}>
                <button
                  onClick={handleFavorite}
                  disabled={favoriteLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: isFavorited
                      ? `2px solid ${styles.warning}`
                      : `2px solid ${styles.borderColor}`,
                    background: isFavorited
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))'
                      : styles.bgPrimary,
                    color: isFavorited ? styles.warning : styles.textSecondary,
                    boxShadow: isFavorited
                      ? '0 2px 12px rgba(245, 158, 11, 0.15)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isFavorited) {
                      e.currentTarget.style.borderColor = styles.warning;
                      e.currentTarget.style.color = styles.warning;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFavorited) {
                      e.currentTarget.style.borderColor = styles.borderColor;
                      e.currentTarget.style.color = styles.textSecondary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                    }
                  }}
                >
                  {isFavorited ? <StarFilled style={{ fontSize: '18px' }} /> : <StarOutlined style={{ fontSize: '18px' }} />}
                  {isFavorited ? '已收藏' : '收藏文档'}
                </button>
                <button
                  onClick={handleLike}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: liked
                      ? `2px solid ${styles.primary}`
                      : `2px solid ${styles.borderColor}`,
                    background: liked
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02))'
                      : styles.bgPrimary,
                    color: liked ? styles.primary : styles.textSecondary,
                    boxShadow: liked
                      ? '0 2px 12px rgba(37, 99, 235, 0.15)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    if (!liked) {
                      e.currentTarget.style.borderColor = styles.primary;
                      e.currentTarget.style.color = styles.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!liked) {
                      e.currentTarget.style.borderColor = styles.borderColor;
                      e.currentTarget.style.color = styles.textSecondary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                    }
                  }}
                >
                  {liked ? <LikeFilled style={{ fontSize: '18px', color: styles.primary }} /> : <LikeOutlined style={{ fontSize: '18px' }} />}
                  {liked ? '已点赞' : '点赞'}
                  {Number(currentDoc.likeCount) > 0 ? ` (${Number(currentDoc.likeCount)})` : ''}
                </button>
              </div>
            )}

            {/* 评论区 - 审核中文档不显示 */}
            {enableComments && currentDoc.status !== 3 && (
            <div style={{
              background: styles.bgPrimary,
              borderRadius: styles.radiusXl,
              padding: '24px',
              border: `1px solid ${styles.borderColor}`,
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: styles.textPrimary,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <MessageOutlined />
                评论
                {commentPage.total > 0 && (
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: styles.textMuted,
                  }}>
                    ({commentPage.total})
                  </span>
                )}
              </h3>

              {/* 评论输入区 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <UserAvatar
                  src={user?.avatar}
                  alt={user?.username || '用户'}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <Input.TextArea
                    placeholder={user ? '写下你的评论...' : '请登录后评论'}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    showCount
                    disabled={!user}
                    style={{ borderRadius: styles.radiusMd }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '24px',
                  }}>
                    <Button
                      type="primary"
                      onClick={handleSubmitComment}
                      loading={submittingComment}
                      disabled={!commentText.trim() || !user}
                      style={{
                        background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                        border: 'none',
                        borderRadius: styles.radiusMd,
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                    >
                      发表评论
                    </Button>
                  </div>
                </div>
              </div>

              {/* 评论列表 */}
              <Spin spinning={commentLoading}>
                {comments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {comments.map((comment) => (
                      <div key={comment.id} style={{
                        padding: '16px 0',
                        borderBottom: `1px solid ${styles.borderColor}`,
                      }}>
                        {/* 主评论 */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <UserAvatar
                            src={comment.commenterAvatar}
                            alt={comment.commenterName}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '4px',
                            }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: styles.textPrimary,
                              }}>
                                {comment.commenterName}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: styles.textMuted,
                              }}>
                                {dayjs(comment.createdAt).fromNow()}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '14px',
                              lineHeight: 1.7,
                              color: styles.textSecondary,
                              marginBottom: '8px',
                              wordBreak: 'break-word',
                            }}>
                              {comment.content}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                            }}>
                              <button
                                onClick={() => handleLikeComment(comment.id, comment.isLiked)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: comment.isLiked ? styles.primary : styles.textMuted,
                                  fontSize: '12px',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {comment.isLiked ? <LikeFilled /> : <LikeOutlined />}
                                {comment.likeCount > 0 && comment.likeCount}
                              </button>
                              <button
                                onClick={() => {
                                  if (!user) {
                                    message.info('请登录后回复');
                                    return;
                                  }
                                  setReplyTo(replyTo?.id === comment.id ? null : {
                                    id: comment.id,
                                    name: comment.commenterName,
                                  });
                                  setReplyText('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: styles.textMuted,
                                  fontSize: '12px',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <MessageOutlined />
                                回复
                                {comment.replyCount > 0 && ` (${comment.replyCount})`}
                              </button>
                              {String(user?.id) === String(comment.commenterId) && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: styles.textMuted,
                                    fontSize: '12px',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <DeleteOutlined />
                                  删除
                                </button>
                              )}
                            </div>

                            {/* 回复输入框 */}
                            {replyTo?.id === comment.id && (
                              <div style={{
                                marginTop: '12px',
                                display: 'flex',
                                gap: '8px',
                              }}>
                                <Input.TextArea
                                  placeholder={`回复 ${replyTo.name}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={2}
                                  maxLength={500}
                                  style={{ borderRadius: styles.radiusMd, flex: 1 }}
                                />
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}>
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => handleReplySubmit(comment.id)}
                                    loading={submittingReply}
                                    disabled={!replyText.trim()}
                                    style={{
                                      background: styles.primary,
                                      border: 'none',
                                      borderRadius: styles.radiusSm,
                                    }}
                                  >
                                    回复
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setReplyTo(null);
                                      setReplyText('');
                                    }}
                                    style={{
                                      borderRadius: styles.radiusSm,
                                    }}
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* 子评论 */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div style={{
                                marginTop: '12px',
                                paddingLeft: '16px',
                                borderLeft: `2px solid ${styles.borderColor}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                              }}>
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} style={{ display: 'flex', gap: '10px' }}>
                                    <UserAvatar
                                      src={reply.commenterAvatar}
                                      alt={reply.commenterName}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px',
                                      }}>
                                        <span style={{
                                          fontSize: '13px',
                                          fontWeight: 600,
                                          color: styles.textPrimary,
                                        }}>
                                          {reply.commenterName}
                                        </span>
                                        {reply.replyToUserName && (
                                          <>
                                            <span style={{ color: styles.textMuted, fontSize: '12px' }}>回复</span>
                                            <span style={{
                                              fontSize: '13px',
                                              color: styles.primary,
                                            }}>
                                              @{reply.replyToUserName}
                                            </span>
                                          </>
                                        )}
                                        <span style={{
                                          fontSize: '12px',
                                          color: styles.textMuted,
                                        }}>
                                          {dayjs(reply.createdAt).fromNow()}
                                        </span>
                                      </div>
                                      <div style={{
                                        fontSize: '13px',
                                        lineHeight: 1.6,
                                        color: styles.textSecondary,
                                        marginBottom: '6px',
                                        wordBreak: 'break-word',
                                      }}>
                                        {reply.content}
                                      </div>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                      }}>
                                        <button
                                          onClick={() => handleLikeComment(reply.id, reply.isLiked)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: reply.isLiked ? styles.primary : styles.textMuted,
                                            fontSize: '11px',
                                            padding: '1px 4px',
                                            borderRadius: '4px',
                                          }}
                                        >
                                          {reply.isLiked ? <LikeFilled /> : <LikeOutlined />}
                                          {reply.likeCount > 0 && reply.likeCount}
                                        </button>
                                        {String(user?.id) === String(reply.commenterId) && (
                                          <button
                                            onClick={() => handleDeleteComment(reply.id)}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              color: styles.textMuted,
                                              fontSize: '11px',
                                              padding: '1px 4px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            <DeleteOutlined />
                                            删除
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 评论分页 */}
                    {commentPage.total > commentPage.size && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: '16px',
                      }}>
                        <Pagination
                          current={commentPage.current}
                          pageSize={commentPage.size}
                          total={commentPage.total}
                          onChange={(page) => loadComments(page)}
                          showSizeChanger={false}
                          size="small"
                        />
                      </div>
                    )}
                  </div>
                ) : !commentLoading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 0',
                    color: styles.textMuted,
                  }}>
                    <MessageOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                    暂无评论，来发表第一条评论吧
                  </div>
                ) : null}
              </Spin>
            </div>
            )}

            {/* 上下篇导航 */}
            {(prevDocument || nextDocument) && (
              <div style={{
                display: 'flex',
                gap: '16px',
                marginTop: '6px',
              }}>
                {/* 上一篇 */}
                {prevDocument && (
                  <div
                    onClick={() => handleNavToDoc(prevDocument.id)}
                    style={{
                      flex: 1,
                      background: styles.bgPrimary,
                      border: `1px solid ${styles.borderColor}`,
                      borderRadius: styles.radiusXl,
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = styles.primary;
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = styles.borderColor;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: styles.radiusLg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: styles.bgTertiary,
                      color: styles.primary,
                    }}>
                      <LeftOutlined style={{ fontSize: '20px' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        color: styles.textMuted,
                        marginBottom: '4px',
                      }}>
                        上一篇
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: styles.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {prevDocument.title}
                      </div>
                    </div>
                  </div>
                )}

                {/* 下一篇 */}
                {nextDocument && (
                  <div
                    onClick={() => handleNavToDoc(nextDocument.id)}
                    style={{
                      flex: 1,
                      background: styles.bgPrimary,
                      border: `1px solid ${styles.borderColor}`,
                      borderRadius: styles.radiusXl,
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = styles.primary;
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = styles.borderColor;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{
                        fontSize: '12px',
                        color: styles.textMuted,
                        marginBottom: '4px',
                      }}>
                        下一篇
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: styles.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {nextDocument.title}
                      </div>
                    </div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: styles.radiusLg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: styles.bgTertiary,
                      color: styles.primary,
                    }}>
                      <RightOutlined style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* 目录导航 */}
            {tocItems.length > 0 && (
              <div style={{
                background: styles.bgPrimary,
                borderRadius: styles.radiusXl,
                padding: '10px',
                border: `1px solid ${styles.borderColor}`,
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: styles.textPrimary,
                  marginBottom: '6px',
                  paddingBottom: '6px',
                  borderBottom: `1px solid ${styles.borderColor}`,
                }}>
                  目录导航
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tocItems.map((item, index) => (
                    <li
                      key={`${item.id}-${index}`}
                      onClick={() => scrollToSection(item.id)}
                      style={{
                        padding: item.level === 3 ? '8px 12px 8px 24px' : '10px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: item.level === 3 ? '13px' : '14px',
                        color: activeSection === item.id ? styles.primary : styles.textSecondary,
                        marginBottom: '3px',
                        background: activeSection === item.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        fontWeight: activeSection === item.id ? 600 : 400,
                        borderRadius: '6px',
                        borderLeft: activeSection === item.id ? `3px solid ${styles.primary}` : '3px solid transparent',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (activeSection !== item.id) {
                          e.currentTarget.style.background = styles.bgTertiary;
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeSection !== item.id) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.title}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 相关文档 */}
            <div style={{
              background: styles.bgPrimary,
              borderRadius: styles.radiusXl,
              padding: '10px',
              border: `1px solid ${styles.borderColor}`,
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 700,
                color: styles.textPrimary,
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: `1px solid ${styles.borderColor}`,
              }}>
                相关文档
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[1, 2, 3].map((i) => (
                  <li
                    key={i}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '8px',
                      border: '1px solid transparent',
                      borderRadius: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = styles.bgTertiary;
                      e.currentTarget.style.borderColor = styles.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: styles.textPrimary,
                      marginBottom: '4px',
                    }}>
                      相关文档示例 {i}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: styles.textMuted,
                    }}>
                      技术文档 · {Math.floor(Math.random() * 2000) + 500}浏览
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 文档信息 */}
            <div style={{
              background: styles.bgPrimary,
              borderRadius: styles.radiusXl,
              padding: '10px',
              border: `1px solid ${styles.borderColor}`,
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 700,
                color: styles.textPrimary,
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: `1px solid ${styles.borderColor}`,
              }}>
                文档信息
              </h3>
              <div style={{
                fontSize: '14px',
                color: styles.textSecondary,
                lineHeight: 2,
              }}>
                <div><strong>创建时间：</strong>{dayjs(currentDoc.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div><strong>最后更新：</strong>{dayjs(currentDoc.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div><strong>浏览次数：</strong>{currentDoc.viewCount?.toLocaleString() || 0}</div>
                <div><strong>点赞次数：</strong>{Number(currentDoc.likeCount)?.toLocaleString() || 0}</div>
                <div><strong>评论次数：</strong>{currentDoc.commentCount?.toLocaleString() || 0}</div>
              </div>
            </div>
          </aside>
        <Modal
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShareAltOutlined style={{ color: styles.primary }} />
              分享文档
            </span>
          }
          open={shareModalVisible}
          onCancel={() => {
            setShareModalVisible(false);
            form.resetFields();
            setShareLinkCopied(false);
          }}
          footer={null}
          width={640}
          destroyOnHidden
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 创建新分享 */}
            <div style={{
              background: styles.bgSecondary,
              borderRadius: styles.radiusLg,
              padding: '20px 24px',
              border: `1px solid ${styles.borderColor}`,
            }}>
              <Typography.Title level={5} style={{ margin: '0 0 16px 0', color: styles.textPrimary }}>
                新建分享链接
              </Typography.Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateShare}
                size="small"
                initialValues={{
                  shareType: 1,
                  expireType: 1,
                  accessLimit: 0,
                  requirePassword: 0,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <Form.Item
                    name="shareType"
                    label="分享类型"
                    rules={[{ required: true, message: '请选择分享类型' }]}
                  >
                    <Select
                      options={[
                        { value: 1, label: '公开链接' },
                        { value: 2, label: '私信分享' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name="expireType"
                    label="有效期"
                    rules={[{ required: true, message: '请选择有效期' }]}
                  >
                    <Select
                      options={[
                        { value: 1, label: '永久有效' },
                        { value: 2, label: '自定义时间' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.expireType !== currentValues.expireType
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('expireType') === 2 ? (
                        <Form.Item
                          name="expireTime"
                          label="过期时间"
                          rules={[{ required: true, message: '请选择过期时间' }]}
                          style={{ gridColumn: '1 / -1' }}
                        >
                          <DatePicker
                            showTime
                            style={{ width: '100%' }}
                            disabledDate={(current) => current && current <= dayjs().startOf('day')}
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>

                  <Form.Item
                    name="accessLimit"
                    label="访问次数限制"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <Select
                      options={[
                        { value: 0, label: '无限制' },
                        { value: 10, label: '10次' },
                        { value: 50, label: '50次' },
                        { value: 100, label: '100次' },
                        { value: 500, label: '500次' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name="requirePassword"
                    label="访问密码"
                    rules={[{ required: true, message: '请选择' }]}
                  >
                    <Select
                      options={[
                        { value: 0, label: '不需要密码' },
                        { value: 1, label: '需要密码' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.requirePassword !== currentValues.requirePassword
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('requirePassword') === 1 ? (
                        <Form.Item
                          name="password"
                          label="设置密码"
                          rules={[{ required: true, message: '请输入访问密码' }]}
                          style={{ gridColumn: '1 / -1' }}
                        >
                          <Input.Password placeholder="至少6位" maxLength={20} />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="分享描述"
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <Input.TextArea
                      placeholder="添加描述信息（可选）"
                      maxLength={200}
                      showCount
                      rows={2}
                    />
                  </Form.Item>
                </div>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={createShareLoading}
                    icon={<LinkOutlined />}
                    style={{
                      background: styles.primary,
                      borderColor: styles.primary,
                      borderRadius: styles.radiusMd,
                      fontWeight: 600,
                    }}
                  >
                    创建分享链接
                  </Button>
                </Form.Item>
              </Form>
            </div>

            {/* 已有分享列表 */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <Typography.Title level={5} style={{ margin: 0, color: styles.textPrimary }}>
                  已有分享链接
                  {shareList.length > 0 && (
                    <Tag style={{ marginLeft: 8, borderRadius: 10 }}>
                      {shareList.length}
                    </Tag>
                  )}
                </Typography.Title>
              </div>

              {shareLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                </div>
              ) : shareList.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  color: styles.textMuted,
                }}>
                  <GlobalOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                  暂无分享链接，请创建一个新的分享
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {shareList.map((share) => (
                    <div
                      key={share.shareId}
                      style={{
                        background: styles.bgPrimary,
                        borderRadius: styles.radiusMd,
                        padding: '14px 18px',
                        border: `1px solid ${styles.borderColor}`,
                        transition: 'box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 6,
                            flexWrap: 'wrap',
                          }}>
                            <Typography.Text
                              strong
                              style={{
                                color: share.expired ? styles.textMuted : styles.textPrimary,
                                textDecoration: share.expired ? 'line-through' : 'none',
                                fontSize: 14,
                              }}
                            >
                              {share.shareUrl}
                            </Typography.Text>
                            <Tag
                              color={share.shareType === 2 ? 'purple' : 'blue'}
                              style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}
                            >
                              {share.shareTypeDesc}
                            </Tag>
                            {share.expired && (
                              <Tag color="error" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>
                                已失效
                              </Tag>
                            )}
                            {share.requirePassword && (
                              <Tag color="orange" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>
                                <LockOutlined style={{ fontSize: 10, marginRight: 2 }} />
                                密码保护
                              </Tag>
                            )}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            fontSize: 12,
                            color: styles.textMuted,
                            flexWrap: 'wrap',
                          }}>
                            <span>
                              <EyeOutlined style={{ marginRight: 4 }} />
                              {share.accessCount || 0} 次访问
                            </span>
                            <span>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {dayjs(share.shareTime).format('MM-DD HH:mm')}
                            </span>
                            {share.expireTime && (
                              <span>
                                过期于 {dayjs(share.expireTime).format('MM-DD HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <Tooltip title={shareLinkCopied ? '已复制' : '复制链接'}>
                            <Button
                              type="text"
                              size="small"
                              icon={shareLinkCopied ? <CheckOutlined /> : <CopyOutlined />}
                              disabled={share.expired}
                              onClick={() => handleCopyShareLink(share.shareId)}
                              style={{ color: share.expired ? styles.textMuted : styles.primary }}
                            />
                          </Tooltip>
                          <Tooltip title="删除分享">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                Modal.confirm({
                                  title: '确认删除',
                                  content: '删除后该分享链接将无法访问，确定要删除吗？',
                                  okText: '确定删除',
                                  cancelText: '取消',
                                  okButtonProps: { danger: true },
                                  onOk: () => handleDeleteShare(share.shareId),
                                });
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </div>
    </React.Fragment>
  );
};

export default DocumentDetailPage;
