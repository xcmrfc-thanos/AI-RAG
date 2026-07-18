import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Spin } from 'antd';
import { App } from 'antd';
import { useDocumentStore } from '@/stores/document.store';
import { useAppStore, useAuthStore, useTeamStore } from '@/stores';
import { categoryService, fileService, documentService, reviewService } from '@/services';
import UserAvatar from '@/components/common/UserAvatar';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { DraftRecoveryDialog } from '@/components/DraftRecoveryDialog';

// CSS变量定义 - 与原型100%一致
const styles = {
  // 颜色变量
  '--primary-color': '#2563eb',
  '--success-color': '#10b981',
  '--danger-color': '#ef4444',
  '--warning-color': '#f59e0b',
  '--text-primary': '#1e293b',
  '--text-secondary': '#64748b',
  '--text-muted': '#94a3b8',
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f8fafc',
  '--bg-tertiary': '#f1f5f9',
  '--border-color': '#e2e8f0',
  '--radius-sm': '6px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
} as React.CSSProperties;

// 添加动画样式和文本选择样式
if (typeof document !== 'undefined' && document.head) {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0,
        transform: translateX(-50%) translateY(-10px);
      }
      to {
        opacity: 1,
        transform: translateX(-50%) translateY(0);
      }
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    /* 文本选择样式 */
    #documentContent::selection {
      background-color: rgba(105, 89, 205, 0.3);
      color: inherit;
    }
    #documentContent::-moz-selection {
      background-color: rgba(105, 89, 205, 0.3);
      color: inherit;
    }
    /* 改善文本选择体验 */
    #documentContent {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
  `;
  styleElement.setAttribute('data-text-selection', 'true');
  if (!document.head.querySelector('style[data-text-selection="true"]')) {
    document.head.appendChild(styleElement);
  }
}

/**
 * 标准化 Markdown 内容，防止因粘贴缩进内容导致标题被误解析为代码块。
 * 原理：找出所有非空行的最小公共缩进，将其从每行开头移除（类似 Python textwrap.dedent）。
 */
const normalizeMarkdown = (text: string): string => {
  if (!text) return text;
  const lines = text.split('\n');

  // 找到所有非空行的最小缩进
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const match = line.match(/^[ \t]*/);
    if (match) minIndent = Math.min(minIndent, match[0].length);
  }

  // 没有缩进或无内容，无需处理
  if (minIndent === Infinity || minIndent === 0) return text;

  // 移除公共缩进
  return lines
    .map(line => {
      if (line.trim().length === 0) return line;
      return line.slice(Math.min(minIndent, line.length));
    })
    .join('\n');
};

const CreateDocumentPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createDocument } = useDocumentStore();
  const { user } = useAuthStore();
  const { teamTree, selectedTeam, fetchTeamTree } = useTeamStore();
  const { requireApproval, enableAIWriting, maxFileSize } = useAppStore();
  const isDirectPublish = !requireApproval;

  // 从URL参数读取预填充内容（AI写作页跳转）
  // 注意：searchParams.get() 已自动解码，无需再调用 decodeURIComponent
  const prefilledTitle = searchParams.get('title') || '';
  const prefilledContent = searchParams.get('content') || '';

  // 从内容中自动提取摘要（去除 Markdown 标记，取前 200 字符）
  const generateSummary = (text: string): string => {
    if (!text) return '';
    const plain = text
      .replace(/^#{1,6}\s+/gm, '')     // 标题标记
      .replace(/\*\*(.+?)\*\*/g, '$1')  // 加粗
      .replace(/[*_]{1,2}(.+?)[*_]{1,2}/g, '$1') // 斜体
      .replace(/```[\s\S]*?```/g, '')   // 代码块
      .replace(/`([^`]+)`/g, '$1')      // 行内代码
      .replace(/!\[.*?\]\(.*?\)/g, '')  // 图片
      .replace(/\[(.+?)\]\(.*?\)/g, '$1') // 链接
      .replace(/^>\s*/gm, '')           // 引用
      .replace(/[-*+]\s+/g, '')         // 列表标记
      .replace(/\n{2,}/g, '\n')         // 合并空行
      .replace(/\n/g, ' ')              // 换行转空格
      .replace(/\s{2,}/g, ' ')          // 合并多余空格
      .trim();
    if (plain.length > 200) {
      return plain.substring(0, 200) + '...';
    }
    return plain;
  };

  // 表单状态
  const [title, setTitle] = useState(prefilledTitle);
  const [content, setContent] = useState(prefilledContent);
  const [summary, setSummary] = useState(generateSummary(prefilledContent));
  const [author, setAuthor] = useState(user?.realName || user?.nickname || user?.username || '');
  const [categoryId, setCategoryId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [tags, setTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const [loading, setLoading] = useState(false);

  // 图片处理状态
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [processedImages, setProcessedImages] = useState<Map<string, string>>(new Map());
  const isProcessingRef = useRef(false);
  const [showPasteHint, setShowPasteHint] = useState(true);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 文本选择状态
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  // 历史记录（用于撤销/重做）
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false); // 标记是否正在进行撤销/重做操作
  const lastSavedContentRef = useRef(''); // 上次保存的内容，避免重复保存

  // 发布选项
  const [saveOption, setSaveOption] = useState<'submit_review' | 'draft'>('submit_review');

  // 开关状态
  const [allowComments, setAllowComments] = useState(true);
  const [allowEdit, setAllowEdit] = useState(false);
  const [aiIndex, setAiIndex] = useState(true);

  // 分类数据
  const [categories, setCategories] = useState<any[]>([]);

  // ========== 自动保存 ==========
  // 构建自动保存所需的表单数据对象（每次渲染都会重新计算）
  const autoSaveFormData = {
    title,
    content,
    summary,
    categoryId,
    teamId,
    tags,
    visibility,
    allowComments,
    allowEdit,
    aiIndex,
    saveOption,
  };

  const {
    saveStatus,
    lastSavedAt,
    currentDocId,
    recoveryDraft,
    isRecoveryDialogOpen,
    acceptRecovery,
    dismissRecovery,
    clearDraft,
  } = useAutoSave({
    documentId: undefined, // 新文档，无固定ID
    formData: autoSaveFormData,
    onDocumentCreated: (docId: string) => {
      // 首次自动保存后切换到编辑路由，避免内容与列表中的旧文档混淆
      navigate(`/documents/${docId}/edit`, { replace: true });
    },
  });

  // 恢复草稿：将 localStorage 中的草稿数据填充到表单
  useEffect(() => {
    if (recoveryDraft) {
      // 只在用户确认恢复后执行
      // 注意：acceptRecovery 由 DraftRecoveryDialog 触发
    }
  }, [recoveryDraft]);

  // 处理草稿恢复确认
  const handleAcceptRecovery = () => {
    const draft = acceptRecovery();
    if (draft) {
      // 将草稿数据填充回表单
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setSummary(draft.summary || '');
      if (draft.categoryId) setCategoryId(String(draft.categoryId));
      if (draft.teamId) setTeamId(String(draft.teamId));
      if (draft.tags && draft.tags.length > 0) setTags(draft.tags);
      if (draft.visibility) setVisibility(draft.visibility);
      setAllowComments(draft.allowComments);
      setAllowEdit(draft.allowEdit);
      setAiIndex(draft.aiIndex);
      if (draft.saveOption) setSaveOption(draft.saveOption);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTeamTree();
    // 分类加载器只在首次进入页面时执行，避免函数重建触发重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 从团队上下文（store 或 URL 参数）自动填充 teamId
  useEffect(() => {
    const teamFromUrl = searchParams.get('team');
    if (teamFromUrl) {
      setTeamId(teamFromUrl);
      return;
    }
    if (selectedTeam) {
      setTeamId(String(selectedTeam.id));
    }
  }, [selectedTeam, searchParams]);

  // 全局点击事件监听器，用于关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // 初始化历史记录
  useEffect(() => {
    if (content && historyIndex === -1) {
      setHistory([content]);
      setHistoryIndex(0);
      lastSavedContentRef.current = content;
    }
  }, [content, historyIndex]);

  // 监听内容变化，自动保存历史记录
  useEffect(() => {
    if (!isUndoRedoRef.current && content !== undefined) {
      // 延迟保存历史记录，避免频繁保存
      const timer = setTimeout(() => {
        if (content !== lastSavedContentRef.current) {
          const newHistory = history.slice(0, historyIndex + 1);
          // 只有内容真正变化时才保存
          if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== content) {
            newHistory.push(content);
            if (newHistory.length > 50) { // 限制历史记录数量
              newHistory.shift();
            }
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            lastSavedContentRef.current = content;
          }
        }
      }, 1000); // 1秒延迟

      return () => clearTimeout(timer);
    }
  }, [content, history, historyIndex]);

  const fetchCategories = async () => {
    try {
      const tree = await categoryService.getCategoryTree();
      setCategories(flattenCategories(tree));
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const flattenCategories = (tree: any[]): any[] => {
    const result: any[] = [];
    let uniqueCounter = 0; // 用于生成唯一key

    const traverse = (nodes: any[], level: number = 0) => {
      nodes.forEach((node, index) => {
        // 为每个分类生成唯一key，确保即使ID重复也不会冲突
        const uniqueKey = `${node.id}_${level}_${index}_${uniqueCounter++}`;
        result.push({
          id: node.id,
          name: node.name,
          uniqueKey: uniqueKey // 添加唯一key用于React
        });
        if (node.children) {
          traverse(node.children, level + 1);
        }
      });
    };
    traverse(tree);
    return result;
  };

  /**
   * 判断是否为外部图片URL（需要转换）
   */
  const isExternalImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // 排除相对路径
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    // 排除文件系统的图片地址
    // 1. 排除RustFS直接访问地址（根据端点和端口判断）
    const rustfsPatterns = [
      /117\.72\.88\.11:9091/,  // RustFS服务器地址
      /:9091/,                 // RustFS端口
      /knowledge-dev/,         // 文件系统存储桶名称
      /mall-dev/,              // 其他可能的存储桶名称
    ];

    if (rustfsPatterns.some(pattern => pattern.test(url))) {
      console.log('这是文件系统的图片，不需要转换：', url);
      return false; // 这是文件系统的图片，不需要转换
    }

    // 2. 排除内部域名和本地地址
    const internalDomains = [
      'localhost',
      '127.0.0.1',
      'rustfs',
      window.location.hostname,
    ];

    if (internalDomains.some(domain => url.includes(domain))) {
      console.log('这是内部地址，不需要转换：', url);
      return false; // 这是内部地址，不需要转换
    }

    // 其他HTTP(S)地址都需要转换
    console.log('这是外部图片，需要转换：', url);
    return true;
  };

  /**
   * 从Markdown内容中提取所有图片URL
   */
  const extractImageUrls = (markdown: string): string[] => {
    const urls: string[] = [];

    // 匹配Markdown格式的图片：![alt](url) 或 ![alt](url "title")
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(markdown)) !== null) {
      const url = match[2].trim().split(' ')[0]; // 移除title部分
      urls.push(url);
    }

    // 匹配HTML格式的图片：<img src="url" />
    const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlImageRegex.exec(markdown)) !== null) {
      urls.push(match[1]);
    }

    return [...new Set(urls)]; // 去重
  };

  /**
   * 上传单个图片
   */
  const _uploadSingleImage = async (imageUrl: string): Promise<string> => {
    try {
      console.log('开始上传图片：', imageUrl);
      const response = await fileService.uploadFromUrl(imageUrl);
      console.log('图片上传成功：', imageUrl, '->', response.convertedUrl);
      return response.convertedUrl;
    } catch (error) {
      console.error('图片上传失败：', imageUrl, error);
      throw error;
    }
  };

  /**
   * 处理双击选中整行
   */
  const handleDoubleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    console.log('🖱️ 双击事件被触发'); // 调试日志
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea) {
      console.log('❌ textarea元素不存在'); // 调试日志
      return;
    }

    // 不阻止默认行为，让浏览器先选择单词
    // e.preventDefault();

    // 在下一个事件循环中扩展选择到整行
    setTimeout(() => {
      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;

      console.log('📍 当前光标位置:', cursorPosition, '文本长度:', text.length); // 调试日志

      // 找到当前行的开始位置
      let lineStart = cursorPosition;
      while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
        lineStart--;
      }

      // 找到当前行的结束位置
      let lineEnd = cursorPosition;
      while (lineEnd < text.length && text.charAt(lineEnd) !== '\n') {
        lineEnd++;
      }

      console.log('✅ 计算出的行范围:', lineStart, '-', lineEnd); // 调试日志
      console.log('📝 选中的文本:', text.substring(lineStart, lineEnd)); // 调试日志

      // 选中整行
      textarea.setSelectionRange(lineStart, lineEnd);

      // 显示格式化工具栏
      setShowSelectionToolbar(true);
    }, 10);

    console.log('⏰ setTimeout已设置，等待10ms后扩展选择'); // 调试日志
  };

  /**
   * 处理鼠标按下事件
   */
  const handleMouseDown = (_e: React.MouseEvent<HTMLTextAreaElement>) => {
    console.log('🖱️ 鼠标按下'); // 调试日志
    // 只隐藏工具栏，不干扰任何默认行为
    setShowSelectionToolbar(false);
  };

  /**
   * 处理鼠标释放事件
   */
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    console.log('🖱️ 鼠标释放'); // 调试日志
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea) {
      console.log('❌ textarea元素不存在'); // 调试日志
      return;
    }

    // 检查是否有文本被选中
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    console.log('📍 当前选择范围:', start, '-', end, '长度:', end - start); // 调试日志

    if (start !== end) {
      console.log('✅ 显示工具栏'); // 调试日志
      setShowSelectionToolbar(true);
    } else {
      console.log('❌ 没有选择文本'); // 调试日志
    }
  };

  /**
   * 处理文本选择变化
   */
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    console.log('📋 onSelect事件触发'); // 调试日志
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea) {
      console.log('❌ textarea元素不存在'); // 调试日志
      return;
    }

    // 检查是否有文本被选中
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    console.log('📍 onSelect选择范围:', start, '-', end); // 调试日志

    if (start !== end) {
      console.log('✅ 显示工具栏'); // 调试日志
      setShowSelectionToolbar(true);
    } else {
      console.log('❌ 隐藏工具栏'); // 调试日志
      setShowSelectionToolbar(false);
    }
  };

  /**
   * 处理右键菜单
   */
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const textarea = e.target as HTMLTextAreaElement;
    if (!textarea) return;

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  /**
   * 关闭右键菜单
   */
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  /**
   * 执行编辑操作
   */
  const executeEdit = (operation: 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll') => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    switch (operation) {
      case 'copy':
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
          message.success('已复制到剪贴板');
        }
        break;
      case 'cut':
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
          const newContent = content.substring(0, start) + content.substring(end);
          setContent(newContent);
          textarea.setSelectionRange(start, start);
          message.success('已剪切');
        }
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          const newContent = content.substring(0, start) + text + content.substring(end);
          setContent(newContent);
          const newPosition = start + text.length;
          textarea.setSelectionRange(newPosition, newPosition);
          message.success('已粘贴');
        }).catch(() => {
          message.error('无法访问剪贴板');
        });
        break;
      case 'delete':
        if (selectedText) {
          const newContent = content.substring(0, start) + content.substring(end);
          setContent(newContent);
          textarea.setSelectionRange(start, start);
          message.success('已删除');
        } else {
          // 删除当前行
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = content.indexOf('\n', end);
          const newContent = content.substring(0, lineStart) +
            (lineEnd !== -1 ? content.substring(lineEnd + 1) : '');
          setContent(newContent);
          textarea.setSelectionRange(lineStart, lineStart);
          message.success('已删除当前行');
        }
        break;
      case 'selectAll':
        textarea.setSelectionRange(0, content.length);
        setShowSelectionToolbar(true);
        break;
    }
    closeContextMenu();
  };

  /**
   * 快速删除当前行
   */
  const deleteCurrentLine = () => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const text = textarea.value;

    // 找到当前行的开始位置
    let lineStart = cursorPosition;
    while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
      lineStart--;
    }

    // 找到当前行的结束位置
    let lineEnd = cursorPosition;
    while (lineEnd < text.length && text.charAt(lineEnd) !== '\n') {
      lineEnd++;
    }

    // 删除整行
    const newContent = text.substring(0, lineStart) +
      (lineEnd < text.length ? text.substring(lineEnd + 1) : '');
    setContent(newContent);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart);
    }, 0);
  };

  /**
   * 复制当前行
   */
  const duplicateCurrentLine = () => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const text = textarea.value;

    // 找到当前行的开始位置
    let lineStart = cursorPosition;
    while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
      lineStart--;
    }

    // 找到当前行的结束位置
    let lineEnd = cursorPosition;
    while (lineEnd < text.length && text.charAt(lineEnd) !== '\n') {
      lineEnd++;
    }

    const currentLine = text.substring(lineStart, lineEnd);
    const newContent = text.substring(0, lineEnd) + '\n' + currentLine + text.substring(lineEnd);
    setContent(newContent);

    message.success('已复制当前行');
  };

  /**
   * 快速注释/取消注释当前行
   */
  const toggleComment = () => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const text = textarea.value;

    // 找到当前行的开始位置
    let lineStart = cursorPosition;
    while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
      lineStart--;
    }

    // 找到当前行的结束位置
    let lineEnd = cursorPosition;
    while (lineEnd < text.length && text.charAt(lineEnd) !== '\n') {
      lineEnd++;
    }

    const currentLine = text.substring(lineStart, lineEnd);
    const trimmedLine = currentLine.trimStart();

    // HTML注释语法
    if (trimmedLine.startsWith('<!--')) {
      // 取消注释
      const uncommented = currentLine.replace(/<!--\s*/, '').replace(/\s*-->/, '');
      const newContent = text.substring(0, lineStart) + uncommented + text.substring(lineEnd);
      setContent(newContent);
    } else {
      // 添加注释
      const commented = '<!-- ' + currentLine + ' -->';
      const newContent = text.substring(0, lineStart) + commented + text.substring(lineEnd);
      setContent(newContent);
    }
  };


  /**
   * 撤销操作
   */
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true; // 标记开始撤销操作
      const previousContent = history[historyIndex - 1];
      setContent(previousContent);
      setHistoryIndex(historyIndex - 1);
      lastSavedContentRef.current = previousContent;
      message.success('已撤销');

      // 延迟重置标志，确保setContent完成
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    } else {
      message.warning('没有更多可撤销的操作');
    }
  };

  /**
   * 重做操作
   */
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true; // 标记开始重做操作
      const nextContent = history[historyIndex + 1];
      setContent(nextContent);
      setHistoryIndex(historyIndex + 1);
      lastSavedContentRef.current = nextContent;
      message.success('已重做');

      // 延迟重置标志，确保setContent完成
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    } else {
      message.warning('没有更多可重做的操作');
    }
  };

  /**
   * 处理键盘快捷键
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + Enter: 保存文档
    if (ctrlOrCmd && e.key === 'Enter') {
      e.preventDefault();
      handleSaveDocument();
    }

    // Ctrl/Cmd + S: 保存文档
    if (ctrlOrCmd && e.key === 's') {
      e.preventDefault();
      handleSaveDocument();
    }

    // Ctrl/Cmd + Z: 撤销
    if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }

    // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
    if ((ctrlOrCmd && e.shiftKey && e.key === 'z') || (ctrlOrCmd && e.key === 'y')) {
      e.preventDefault();
      handleRedo();
    }

    // Ctrl/Cmd + D: 复制当前行
    if (ctrlOrCmd && e.key === 'd') {
      e.preventDefault();
      duplicateCurrentLine();
    }

    // Ctrl/Cmd + /: 注释/取消注释
    if (ctrlOrCmd && e.key === '/') {
      e.preventDefault();
      toggleComment();
    }

    // Ctrl/Cmd + Backspace: 删除当前行
    if (ctrlOrCmd && e.key === 'Backspace') {
      e.preventDefault();
      deleteCurrentLine();
    }

    // Ctrl/Cmd + A: 全选
    if (ctrlOrCmd && e.key === 'a') {
      e.preventDefault();
      executeEdit('selectAll');
    }

    // Ctrl/Cmd + C: 复制
    if (ctrlOrCmd && e.key === 'c') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        // 让默认行为处理复制
        return;
      } else {
        // 没有选择文本时复制当前行
        e.preventDefault();
        const cursorPosition = textarea.selectionStart;
        const text = textarea.value;
        let lineStart = cursorPosition;
        while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
          lineStart--;
        }
        let lineEnd = cursorPosition;
        while (lineEnd < text.length && text.charAt(lineEnd) !== '\n') {
          lineEnd++;
        }
        const currentLine = text.substring(lineStart, lineEnd);
        navigator.clipboard.writeText(currentLine);
        message.success('已复制当前行');
      }
    }

    // Ctrl/Cmd + X: 剪切
    if (ctrlOrCmd && e.key === 'x') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        // 让默认行为处理剪切
        return;
      } else {
        // 没有选择文本时剪切当前行
        e.preventDefault();
        deleteCurrentLine();
        message.success('已剪切当前行');
      }
    }

    // Tab: 缩进
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }

    // Shift + Tab: 取消缩进
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = content.substring(0, start);
      const afterText = content.substring(end);

      // 移除两个空格或一个tab
      let newStart = start;
      let newBeforeText = beforeText;
      if (beforeText.endsWith('  ')) {
        newBeforeText = beforeText.slice(0, -2);
        newStart = start - 2;
      } else if (beforeText.endsWith('\t')) {
        newBeforeText = beforeText.slice(0, -1);
        newStart = start - 1;
      }

      const newContent = newBeforeText + afterText;
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newStart);
      }, 0);
    }
  };

  /**
   * 插入格式化文本
   */
  const insertFormattedText = (before: string, after: string, placeholder: string = '') => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;

    // 构建新文本
    const newText = before + selectedText + after;
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    const newContent = beforeText + newText + afterText;

    setContent(newContent);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + newText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      setShowSelectionToolbar(false);
    }, 0);
  };

  /**
   * 格式化选中的文本
   */
  const formatSelectedText = (type: 'bold' | 'italic' | 'strikethrough' | 'code' | 'link' | 'image' | 'quote' | 'list') => {
    switch (type) {
      case 'bold':
        insertFormattedText('**', '**', '粗体文本');
        break;
      case 'italic':
        insertFormattedText('*', '*', '斜体文本');
        break;
      case 'strikethrough':
        insertFormattedText('~~', '~~', '删除线文本');
        break;
      case 'code':
        insertFormattedText('`', '`', '代码');
        break;
      case 'link':
        insertFormattedText('[', '](https://)', '链接文本');
        break;
      case 'image':
        insertFormattedText('![', '](https://)', '图片描述');
        break;
      case 'quote':
        insertFormattedText('> ', '', '引用文本');
        break;
      case 'list':
        insertFormattedText('- ', '', '列表项');
        break;
    }
  };

  /**
   * 处理内容中的外部图片
   */
  const processExternalImages = async (markdown: string): Promise<string> => {
    const imageUrls = extractImageUrls(markdown);
    console.log('📸 从内容中提取到所有图片URL：', imageUrls);

    const externalUrls = imageUrls.filter(isExternalImageUrl);
    console.log('🌍 其中需要转换的外部图片URL：', externalUrls);

    if (externalUrls.length === 0) {
      console.log('✅ 没有需要转换的外部图片');
      return markdown;
    }

    // 过滤出未处理的图片URL
    const unprocessedUrls = externalUrls.filter(url => !processedImages.has(url));

    if (unprocessedUrls.length === 0) {
      console.log('✅ 所有外部图片都已处理过');
      return markdown;
    }

    console.log('需要上传的外部图片URL：', unprocessedUrls);

    // 标记所有图片为正在上传
    setUploadingImages(prev => {
      const newSet = new Set(prev);
      unprocessedUrls.forEach(url => newSet.add(url));
      return newSet;
    });

    try {
      // 使用批量转换接口
      const response = await fileService.batchConvertUrls(unprocessedUrls);

      console.log('图片批量转换结果：', response);

      // 保存成功的映射关系
      setProcessedImages(prev => {
        const newMap = new Map(prev);
        Object.entries(response.urlMappings).forEach(([oldUrl, newUrl]) => {
          newMap.set(oldUrl, newUrl);
        });
        return newMap;
      });

      // 替换图片URL
      let processedContent = markdown;

      Object.entries(response.urlMappings).forEach(([oldUrl, newUrl]) => {
        if (oldUrl !== newUrl) {
          // 替换Markdown格式
          processedContent = processedContent.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${escapeRegExp(oldUrl)}(\\s+"[^"]*"|\\s*'[^']*'|\\s*)\\)`, 'g'),
            `![$1](${newUrl}$2)`
          );

          // 替换HTML格式
          processedContent = processedContent.replace(
            new RegExp(`(<img[^>]+src=["'])${escapeRegExp(oldUrl)}(["'][^>]*>)`, 'gi'),
            `$1${newUrl}$2`
          );
        }
      });

      console.log('图片处理完成：成功{}个，失败{}个',
        response.successCount, response.failureCount);

      if (response.failureCount > 0) {
        message.warning(`${response.failureCount}张图片上传失败，已保留原URL`);
      }
      // 删除了成功提示，避免不必要的提示消息

      return processedContent;

    } catch (error) {
      console.error('批量转换图片失败：', error);
      throw error;
    } finally {
      // 清除所有上传标记
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        unprocessedUrls.forEach(url => newSet.delete(url));
        return newSet;
      });
    }
  };

  /**
   * 转义正则表达式特殊字符
   */
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * 防抖处理内容变化
   */
  const processContentChange = useRef(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      return (newContent: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async () => {
          if (isProcessingRef.current) {
            return;
          }

          isProcessingRef.current = true;

          try {
            const processed = await processExternalImages(newContent);
            if (processed !== newContent) {
              setContent(processed);
              // 删除了成功提示，避免不必要的提示消息
            }
          } catch (error) {
            console.error('处理图片失败：', error);
          } finally {
            isProcessingRef.current = false;
          }
        }, 1000); // 1秒防抖
      };
    })()
  ).current;

  // 标签管理
  const handleAddTag = () => {
    const trimmed = inputTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // 文本格式化
  const formatText = (format: string) => {
    const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    let formatChars = '';
    let shouldClose = false;

    switch (format) {
      case 'bold': formatChars = '**'; shouldClose = true; break;
      case 'italic': formatChars = '*'; shouldClose = true; break;
      case 'underline': formatChars = '<u></u>'; break;
      case 'strike': formatChars = '~~'; shouldClose = true; break;
      case 'h1': formatChars = '# '; break;
      case 'h2': formatChars = '## '; break;
      case 'h3': formatChars = '### '; break;
      case 'ul': formatChars = '- '; break;
      case 'ol': formatChars = '1. '; break;
      case 'code': formatChars = '`'; shouldClose = true; break;
      case 'quote': formatChars = '> '; break;
    }

    const newText = beforeText + formatChars + selectedText + (shouldClose ? formatChars : '') + afterText;
    setContent(newText);
    textarea.focus();

    setTimeout(() => {
      textarea.setSelectionRange(
        start + formatChars.length,
        start + formatChars.length + selectedText.length
      );
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('请输入链接地址:');
    if (url) {
      const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end) || '链接文字';
      const linkText = `[${selectedText}](${url})`;
      setContent(content.substring(0, start) + linkText + content.substring(end));
      textarea.focus();
    }
  };

  const insertImage = () => {
    // 创建文件选择器
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // 客户端文件大小校验（图片使用系统配置的上限）
      if (file.size > maxFileSize) {
        const maxMB = Math.round(maxFileSize / 1048576 * 10) / 10;
        message.error({ content: `图片大小不能超过 ${maxMB}MB`, key: 'uploadImage' });
        return;
      }

      try {
        message.loading({ content: '正在上传图片...', key: 'uploadImage' });

        const response = await fileService.upload(file);

        message.success({ content: '图片上传成功', key: 'uploadImage' });

        // 使用 previewUrl 用于图片显示（专门为预览优化）
        const imageUrl = response.previewUrl || response.fileUrl;
        const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // 确保图片单独一行，前后都有换行
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);

        // 检查前面是否需要添加换行
        let prefix = '\n\n';
        if (beforeText === '' || beforeText.endsWith('\n')) {
          prefix = beforeText.endsWith('\n\n') ? '' : '\n';
        } else if (!beforeText.endsWith('\n')) {
          prefix = '\n\n';
        } else {
          prefix = '';
        }

        // 检查后面是否需要添加换行
        let suffix = '\n\n';
        if (afterText === '' || afterText.startsWith('\n')) {
          suffix = afterText.startsWith('\n\n') ? '' : '\n';
        } else if (!afterText.startsWith('\n')) {
          suffix = '\n\n';
        } else {
          suffix = '';
        }

        const imageText = `${prefix}![${response.originalName || file.name}](${imageUrl})${suffix}`;
        const newContentText = beforeText + imageText + afterText;

        setContent(newContentText);

        textarea.focus();
        // 设置光标位置到图片之后
        const newPosition = start + prefix.length + imageText.trim().length;
        textarea.setSelectionRange(newPosition, newPosition);
      } catch (error) {
        message.error({ content: '图片上传失败', key: 'uploadImage' });
        console.error('图片上传失败：', error);
      }
    };

    input.click();
  };

  // 验证文档
  const validateDocument = (): boolean => {
    if (!title.trim()) {
      message.error('请输入文档标题');
      return false;
    }

    if (!categoryId) {
      message.error('请选择文档分类');
      return false;
    }

    if (!content.trim()) {
      message.error('请输入文档内容');
      return false;
    }

    return true;
  };

  // 统一的保存文档函数
  const handleSaveDocument = async () => {
    if (saveOption === 'submit_review') {
      if (isDirectPublish) {
        await handleDirectPublish();
      } else {
        await handleSubmitForReview();
      }
    } else {
      await handleSaveDraft();
    }
  };

  // 直接发布文档（无需审核）
  const handleDirectPublish = async () => {
    if (!validateDocument()) return;

    // 检查文档是否已在审核中
    if (currentDocId) {
      try {
        const doc = await documentService.getDocument(currentDocId);
        if (doc.status === 'pending_review' || doc.status === 3) {
          message.warning('该文档正在审核中，无法修改');
          return;
        }
      } catch (e) {
        // 获取文档状态失败，继续执行（后端会兜底校验）
      }
    }

    setLoading(true);
    try {
      const documentData = {
        title,
        content,
        summary,
        categoryId: categoryId || undefined,
        teamId: teamId || undefined,
        tags: tags.join(','),
        status: 0,
        documentType: 1,
        allowComment: allowComments ? 1 : 0,
        source: 1,
      };

      let docId: string;
      if (currentDocId) {
        // 自动保存已创建文档，直接更新并发布
        await documentService.updateDocument(currentDocId, documentData as any);
        docId = currentDocId;
      } else {
        // 未自动保存过，创建新文档
        const result = await createDocument(documentData);
        docId = String(result.id);
      }

      await documentService.publishDocument(docId);
      clearDraft();
      message.success('文档已发布！');
      navigate('/documents');
    } catch (error) {
      console.error('文档发布失败：', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!validateDocument()) return;

    setLoading(true);
    try {
      // 转换数据格式以匹配后端API
      const documentData = {
        title,
        content,
        summary,
        categoryId: categoryId || undefined,
        teamId: teamId || undefined,
        tags: tags.join(','), // 转换为逗号分隔的字符串
        status: 0, // 0-草稿
        documentType: 1, // 1-文章
        allowComment: allowComments ? 1 : 0,
        source: 1, // 1-原创
      };

      console.log('保存文档草稿，请求数据：', documentData);
      if (currentDocId) {
        await documentService.updateDocument(currentDocId, documentData as any);
        console.log('更新文档草稿成功，documentId：', currentDocId);
      } else {
        const result = await createDocument(documentData);
        console.log('创建文档草稿成功，返回结果：', result);
      }
      clearDraft();
      message.success('草稿保存成功！');
      navigate('/documents');
    } catch (error) {
      console.error('保存文档草稿失败：', error);
      // Error handled by request interceptor
    } finally {
      setLoading(false);
    }
  };

  // 提交文档审核
  const handleSubmitForReview = async () => {
    if (!validateDocument()) return;

    // 检查文档是否已在审核中
    if (currentDocId) {
      try {
        const doc = await documentService.getDocument(currentDocId);
        if (doc.status === 'pending_review' || doc.status === 3) {
          message.warning('该文档正在审核中，无法修改');
          return;
        }
      } catch (e) {
        // 获取文档状态失败，继续执行（后端会兜底校验）
      }
    }

    setLoading(true);
    try {
      // 转换数据格式以匹配后端API
      const documentData = {
        title,
        content,
        summary,
        categoryId: categoryId || undefined,
        teamId: teamId || undefined,
        tags: tags.join(','), // 转换为逗号分隔的字符串
        status: 0, // 先保存为草稿，submitForReview 会改为待审核
        documentType: 1, // 1-文章
        allowComment: allowComments ? 1 : 0,
        source: 1, // 1-原创
      };

      console.log('提交审核，请求数据：', documentData);

      let docId: string;
      if (currentDocId) {
        // 自动保存已创建文档，直接更新
        await documentService.updateDocument(currentDocId, documentData as any);
        docId = currentDocId;
      } else {
        // 未自动保存过，创建新文档
        const result = await createDocument(documentData);
        docId = String(result.id);
      }

      // 创建审核记录
      await reviewService.submitForReview(docId);
      console.log('提交审核成功');
      clearDraft();
      message.success('文档已提交审核！');
      navigate('/documents');
    } catch (error) {
      console.error('提交审核失败：', error);
      // Error handled by request interceptor
    } finally {
      setLoading(false);
    }
  };

  // AI功能
  const aiGenerateOutline = () => {
    if (!title.trim()) {
      message.warning('请先输入文档标题，AI将根据标题生成大纲。');
      return;
    }

    const outline = `# ${title}

## 概述
在此描述文档的背景、目的和范围...

## 主要内容

### 第一部分
- 要点1
- 要点2
- 要点3

### 第二部分
- 要点1
- 要点2
- 要点3

## 结论
总结文档的核心要点和行动建议...

## 参考资料
- 相关文档1
- 相关文档2`;

    setContent(outline);
    message.success('已生成文档大纲');
  };

  const aiExpandContent = () => {
    if (!content.trim()) {
      message.warning('请先输入一些内容，AI将帮助您扩展。');
      return;
    }

    setContent(content + '\n\n## 详细说明\n\n[AI正在为您生成更详细的内容...]\n\n- 补充说明1\n- 补充说明2\n- 补充说明3');
    message.success('已扩展内容');
  };

  const aiImproveWriting = () => {
    message.info('AI写作助手正在分析您的内容...\n\n建议：\n1. 使用更简洁的语言表达\n2. 增加具体的数据和案例\n3. 优化段落结构\n4. 补充必要的图表说明');
  };

  const aiAddExamples = () => {
    setContent(content + '\n\n## 示例说明\n\n### 示例1：\n[具体示例描述...]\n\n### 示例2：\n[具体示例描述...]\n\n这些示例可以帮助读者更好地理解内容。');
    message.success('已添加示例框架');
  };

  return (
    <>
    <div style={styles}>
      {/* 主容器：已在 MainLayout 内，勿再叠 fixed 顶栏 + paddingTop，否则顶栏下会出现大空隙 */}
      <div style={{
        paddingTop: 0,
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: '16px',
        backgroundColor: 'var(--bg-secondary)',
        minHeight: 'calc(100vh - 64px - 64px)',
      }}>
        {/* 页面头部 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}>
              文档中心 / 新建文档
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              创建新文档
            </h1>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <button
              onClick={() => navigate('/documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              取消
            </button>
            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              保存草稿
            </button>
            <button
              onClick={handleSubmitForReview}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-color)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary-color)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              提交文档
            </button>
          </div>
        </div>

        {/* 编辑器容器 */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}>
          {/* 编辑器头部 */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入文档标题..."
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                background: '#ffffff',
                transition: 'all 0.2s',
                marginBottom: '16px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">选择分类</option>
                {categories.map((cat, index) => (
                  <option key={cat.uniqueKey || `cat_${index}`} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">选择团队空间</option>
                {teamTree.map((team) => (
                  <option key={team.id} value={String(team.id)}>
                    {team.teamName || team.name}
                  </option>
                ))}
              </select>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="private">私有</option>
                <option value="team">团队可见</option>
                <option value="public">全员可见</option>
              </select>
            </div>
          </div>

          {/* 编辑器主体 */}
          <div style={{
            display: 'flex',
          }}>
            {/* 主编辑区域 - 左右分栏 */}
            <div style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              borderRight: '1px solid var(--border-color)',
            }}>
              {/* 左侧：Markdown输入区 */}
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* 工具栏 */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  flexWrap: 'wrap',
                }}>
                  <button
                    onClick={() => formatText('bold')}
                    title="粗体"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('italic')}
                    title="斜体"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="4" x2="10" y2="4"></line>
                      <line x1="14" y1="20" x2="5" y2="20"></line>
                      <line x1="15" y1="4" x2="9" y2="20"></line>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('underline')}
                    title="下划线"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                      <line x1="4" y1="21" x2="20" y2="21"></line>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('strike')}
                    title="删除线"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 4H9a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h6"></path>
                      <path d="M7 20h10a3 3 0 0 0 3-3v0a3 3 0 0 0-3-3H7"></path>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  <div style={{
                    width: '1px',
                    background: 'var(--border-color)',
                    margin: '0 8px',
                  }}></div>
                  <button
                    onClick={() => formatText('h1')}
                    title="标题1"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h8"></path>
                      <path d="M4 18V6"></path>
                      <path d="M12 18V6"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('h2')}
                    title="标题2"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h8"></path>
                      <path d="M4 18V6"></path>
                      <path d="M12 18V6"></path>
                      <path d="M17 12h4"></path>
                      <path d="M19 18v-6"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('h3')}
                    title="标题3"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h8"></path>
                      <path d="M4 18V6"></path>
                      <path d="M12 18V6"></path>
                      <path d="M17 12h4"></path>
                      <path d="M17 16h4"></path>
                      <path d="M19 9V6"></path>
                    </svg>
                  </button>
                  <div style={{
                    width: '1px',
                    background: 'var(--border-color)',
                    margin: '0 8px',
                  }}></div>
                  <button
                    onClick={() => formatText('ul')}
                    title="无序列表"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('ol')}
                    title="有序列表"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="10" y1="6" x2="21" y2="6"></line>
                      <line x1="10" y1="12" x2="21" y2="12"></line>
                      <line x1="10" y1="18" x2="21" y2="18"></line>
                      <path d="M4 6h1v4"></path>
                      <path d="M4 10h2"></path>
                      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                    </svg>
                  </button>
                  <div style={{
                    width: '1px',
                    background: 'var(--border-color)',
                    margin: '0 8px',
                  }}></div>
                  <button
                    onClick={() => formatText('code')}
                    title="代码块"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText('quote')}
                    title="引用"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c0 3 2 7 6 7"></path>
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c0 3 2 7 6 7"></path>
                    </svg>
                  </button>
                  <button
                    onClick={insertLink}
                    title="插入链接"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                  <button
                    onClick={insertImage}
                    title="插入图片"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </button>

                  {/* 上传状态指示器 */}
                  {uploadingImages.size > 0 && (
                    <div style={{
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1))',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--primary-color)',
                    }}>
                      <Spin size="small" />
                      <span>上传图片中 ({uploadingImages.size})</span>
                    </div>
                  )}
                </div>

                {/* 编辑器内容 */}
                <div
                  style={{
                    flex: 1,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: isDragging ? '2px dashed var(--primary-color)' : '2px dashed transparent',
                    borderRadius: 'var(--radius-md)',
                    background: isDragging ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                  onDragOver={(e) => {
                    // 只在拖放文件时阻止默认行为，不干扰文本选择
                    if (e.dataTransfer?.types.includes('Files')) {
                      e.preventDefault();
                      setIsDragging(true);
                    }
                  }}
                  onDragLeave={(e) => {
                    // 只在拖放文件时处理
                    if (e.dataTransfer?.types.includes('Files')) {
                      e.preventDefault();
                      // 只有当离开整个容器时才隐藏提示
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (
                        e.clientX < rect.left ||
                        e.clientX > rect.right ||
                        e.clientY < rect.top ||
                        e.clientY > rect.bottom
                      ) {
                        setIsDragging(false);
                      }
                    }
                  }}
                  onDrop={async (e) => {
                    // 只在拖放文件时阻止默认行为
                    const files = e.dataTransfer?.files;
                    if (files && files.length > 0) {
                      e.preventDefault();
                      setIsDragging(false);

                      // 处理拖拽的文件
                      for (const file of Array.from(files)) {
                        if (file.type.startsWith('image/')) {
                          try {
                            message.loading({ content: '正在上传图片...', key: 'dropImage' });

                            const response = await fileService.upload(file);
                            message.success({ content: '图片上传成功', key: 'dropImage' });

                            // 使用 previewUrl 用于图片显示（专门为预览优化）
                            const imageUrl = response.previewUrl || response.fileUrl;

                            // 在光标位置或内容末尾插入图片
                            const textarea = document.getElementById('documentContent') as HTMLTextAreaElement;
                            if (textarea) {
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const beforeText = content.substring(0, start);
                              const afterText = content.substring(end);

                              // 确保图片单独一行，前后都有换行
                              let prefix = '\n\n';
                              if (beforeText === '' || beforeText.endsWith('\n')) {
                                prefix = beforeText.endsWith('\n\n') ? '' : '\n';
                              } else if (!beforeText.endsWith('\n')) {
                                prefix = '\n\n';
                              } else {
                                prefix = '';
                              }

                              let suffix = '\n\n';
                              if (afterText === '' || afterText.startsWith('\n')) {
                                suffix = afterText.startsWith('\n\n') ? '' : '\n';
                              } else if (!afterText.startsWith('\n')) {
                                suffix = '\n\n';
                              } else {
                                suffix = '';
                              }

                              const imageText = `${prefix}![${response.originalName || file.name}](${imageUrl})${suffix}`;
                              const newContentText = beforeText + imageText + afterText;

                              setContent(newContentText);

                              // 设置光标位置
                              setTimeout(() => {
                                textarea.focus();
                                const newPosition = start + prefix.length + imageText.trim().length;
                                textarea.setSelectionRange(newPosition, newPosition);
                              }, 0);
                            }
                          } catch (error) {
                            message.error({ content: '图片上传失败', key: 'dropImage' });
                            console.error('拖拽图片上传失败：', error);
                          }
                          break; // 只处理第一个图片
                        }
                      }
                    } else {
                      // 没有文件时，不阻止默认行为，允许文本选择的拖拽
                      setIsDragging(false);
                    }
                  }}
                >
                  {/* 编辑器提示 */}
                  {isDragging ? (
                    <div style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1))',
                      border: '1px solid rgba(37, 99, 235, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <span>释放鼠标以上传图片</span>
                    </div>
                  ) : showPasteHint && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(139, 92, 246, 0.05))',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s ease',
                      animation: 'fadeIn 0.3s ease',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      <span>粘贴包含外部图片的Markdown内容时，会自动上传图片到服务器并替换为新地址</span>
                    </div>
                  )}

                  {/* 选中工具栏 */}
                  {showSelectionToolbar && (
                    <div style={{
                      position: 'absolute',
                      top: '60px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '8px 16px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 10,
                      animation: 'slideDown 0.2s ease',
                    }}>
                      <button
                        onClick={() => formatSelectedText('bold')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="粗体 (Ctrl+B)"
                      >
                        B
                      </button>
                      <button
                        onClick={() => formatSelectedText('italic')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontStyle: 'italic',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="斜体 (Ctrl+I)"
                      >
                        I
                      </button>
                      <button
                        onClick={() => formatSelectedText('strikethrough')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          textDecoration: 'line-through',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="删除线"
                      >
                        S
                      </button>
                      <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
                      <button
                        onClick={() => formatSelectedText('code')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontFamily: 'Monaco, Menlo, monospace',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="代码"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        onClick={() => formatSelectedText('link')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="链接"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => formatSelectedText('image')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="图片"
                      >
                        🖼️
                      </button>
                      <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
                      <button
                        onClick={() => formatSelectedText('quote')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="引用"
                      >
                        💬
                      </button>
                      <button
                        onClick={() => formatSelectedText('list')}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'inherit';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="列表"
                      >
                        ☰
                      </button>
                    </div>
                  )}

                  <textarea
                    id="documentContent"
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setContent(newContent);
                      // 用户开始输入后隐藏提示
                      if (showPasteHint && newContent.length > 0) {
                        setShowPasteHint(false);
                      }
                      // 隐藏选中工具栏
                      if (showSelectionToolbar) {
                        setShowSelectionToolbar(false);
                      }
                      // 自动处理外部图片
                      processContentChange(newContent);
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onKeyDown={handleKeyDown}
                    onSelect={handleSelect}
                    onPaste={async (e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;

                      // 检查是否有图片文件
                      for (const item of Array.from(items)) {
                        if (item.type.startsWith('image/')) {
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (file) {
                            try {
                              message.loading({ content: '正在粘贴并上传图片...', key: 'pasteImage' });
                              const response = await fileService.upload(file);
                              message.success({ content: '图片上传成功', key: 'pasteImage' });

                              const textarea = e.target as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;

                              // 使用 previewUrl 用于图片显示（专门为预览优化）
                              const imageUrl = response.previewUrl || response.fileUrl;

                              // 在光标位置插入图片
                              const beforeText = content.substring(0, start);
                              const afterText = content.substring(end);

                              // 确保图片单独一行，前后都有换行
                              let prefix = '\n\n';
                              if (beforeText === '' || beforeText.endsWith('\n')) {
                                prefix = beforeText.endsWith('\n\n') ? '' : '\n';
                              } else if (!beforeText.endsWith('\n')) {
                                prefix = '\n\n';
                              } else {
                                prefix = '';
                              }

                              let suffix = '\n\n';
                              if (afterText === '' || afterText.startsWith('\n')) {
                                suffix = afterText.startsWith('\n\n') ? '' : '\n';
                              } else if (!afterText.startsWith('\n')) {
                                suffix = '\n\n';
                              } else {
                                suffix = '';
                              }

                              const imageText = `${prefix}![${response.originalName || file.name}](${imageUrl})${suffix}`;
                              const newContentText = beforeText + imageText + afterText;

                              setContent(newContentText);

                              // 设置光标位置
                              setTimeout(() => {
                                textarea.focus();
                                const newPosition = start + prefix.length + imageText.trim().length;
                                textarea.setSelectionRange(newPosition, newPosition);
                              }, 0);
                            } catch (error) {
                              message.error({ content: '图片上传失败', key: 'pasteImage' });
                              console.error('粘贴图片上传失败：', error);
                            }
                          }
                          break; // 只处理第一个图片
                        }
                      }
                    }}
                    placeholder={`开始编写您的内容...
支持Markdown格式：
# 标题
## 子标题
**粗体** *斜体* ~~删除线~~
- 无序列表
1. 有序列表
\`代码\`
[链接](url)

或者直接输入文本，我们会自动为您格式化。`}
                    style={{
                      width: '100%',
                      flex: 1,
                      height: '100%',
                      minHeight: '400px',
                      padding: '20px',
                      border: 'none',
                      fontSize: '16px',
                      lineHeight: '1.8',
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none',
                      background: 'transparent',
                      // 移除可能干扰选择的CSS属性
                      // userSelect: 'text',
                      // WebkitUserSelect: 'text',
                      cursor: 'text',
                      // 确保文本选择正常工作
                      caretColor: '#6959CD',
                    }}
                  />

                  {/* 右键菜单 */}
                  {contextMenu.visible && (
                    <div
                      style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '180px',
                        animation: 'fadeIn 0.15s ease',
                      }}
                      onMouseLeave={closeContextMenu}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '4px 0',
                      }}>
                        <button
                          onClick={() => executeEdit('copy')}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>📋</span>
                          <span>复制</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+C
                          </span>
                        </button>

                        <button
                          onClick={() => executeEdit('cut')}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>✂️</span>
                          <span>剪切</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+X
                          </span>
                        </button>

                        <button
                          onClick={() => executeEdit('paste')}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>📄</span>
                          <span>粘贴</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+V
                          </span>
                        </button>

                        <div style={{
                          height: '1px',
                          background: 'var(--border-color)',
                          margin: '4px 0',
                        }} />

                        <button
                          onClick={() => executeEdit('selectAll')}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>⬚</span>
                          <span>全选</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+A
                          </span>
                        </button>

                        <button
                          onClick={() => executeEdit('delete')}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>🗑️</span>
                          <span>删除</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Del
                          </span>
                        </button>

                        <div style={{
                          height: '1px',
                          background: 'var(--border-color)',
                          margin: '4px 0',
                        }} />

                        <button
                          onClick={duplicateCurrentLine}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>📋</span>
                          <span>复制当前行</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+D
                          </span>
                        </button>

                        <button
                          onClick={deleteCurrentLine}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>🗑️</span>
                          <span>删除当前行</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+⌫
                          </span>
                        </button>

                        <div style={{
                          height: '1px',
                          background: 'var(--border-color)',
                          margin: '4px 0',
                        }} />

                        <button
                          onClick={handleUndo}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>↩️</span>
                          <span>撤销</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+Z
                          </span>
                        </button>

                        <button
                          onClick={handleRedo}
                          style={{
                            padding: '8px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <span>↪️</span>
                          <span>重做</span>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Ctrl+Y
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：实时预览区 */}
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  实时预览
                  {uploadingImages.size > 0 && (
                    <span style={{
                      marginLeft: '12px',
                      padding: '4px 10px',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1))',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Spin size="small" />
                      {uploadingImages.size} 张图片上传中
                    </span>
                  )}
                </div>
                <div style={{
                  flex: 1,
                  padding: '0',
                  overflow: 'auto',
                }}>
                  {content.trim() ? (
                    <div style={{
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '40px',
                      border: '1px solid var(--border-color)',
                      minHeight: '100%',
                      fontSize: '16px',
                      lineHeight: '1.8',
                      color: 'var(--text-secondary)',
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          h1: ({ children }) => (
                            <h1 style={{
                              fontSize: '32px',
                              fontWeight: '700',
                              margin: '0 0 16px',
                              color: 'var(--text-primary)',
                              lineHeight: '1.3',
                            }}>{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 style={{
                              fontSize: '24px',
                              fontWeight: '700',
                              color: 'var(--text-primary)',
                              marginBottom: '16px',
                              paddingBottom: '12px',
                              borderBottom: '2px solid var(--bg-tertiary)',
                              marginTop: '0',
                            }}>{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 style={{
                              fontSize: '20px',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              margin: '24px 0 12px',
                              lineHeight: '1.4',
                            }}>{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              margin: '20px 0 12px',
                              lineHeight: '1.4',
                            }}>{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p style={{
                              fontSize: '16px',
                              lineHeight: '1.8',
                              color: 'var(--text-secondary)',
                              marginBottom: '16px',
                              margin: '0 0 16px 0',
                            }}>{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul style={{
                              marginLeft: '24px',
                              marginBottom: '16px',
                            }}>{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol style={{
                              marginLeft: '24px',
                              marginBottom: '16px',
                            }}>{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li style={{
                              fontSize: '16px',
                              lineHeight: '1.8',
                              color: 'var(--text-secondary)',
                              marginBottom: '8px',
                            }}>{children}</li>
                          ),
                          code: ({ children }) => (
                            <code style={{
                              background: 'var(--bg-tertiary)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontFamily: 'Monaco, Menlo, monospace',
                              color: '#e83e8c',
                            }}>{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre style={{
                              background: 'var(--bg-tertiary)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '20px',
                              margin: '16px 0',
                              overflowX: 'auto',
                              border: '1px solid var(--border-color)',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                              color: 'var(--text-primary)',
                            }}>{children}</pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote style={{
                              background: 'rgba(37, 99, 235, 0.05)',
                              borderLeft: '4px solid var(--primary-color)',
                              padding: '16px 20px',
                              margin: '16px 0',
                              color: 'var(--text-secondary)',
                            }}>{children}</blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} style={{
                              color: 'var(--primary-color)',
                              textDecoration: 'none',
                              transition: 'color 0.2s',
                            }}>{children}</a>
                          ),
                          img: ({ src, alt }) => (
                            <img
                              src={src}
                              alt={alt}
                              style={{
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: 'var(--radius-md)',
                                margin: '16px 0',
                              }}
                            />
                          ),
                          table: ({ children }) => (
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              margin: '16px 0',
                              border: '1px solid var(--border-color)',
                            }}>{children}</table>
                          ),
                          thead: ({ children }) => (
                            <thead style={{
                              background: 'var(--bg-tertiary)',
                            }}>{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th style={{
                              border: '1px solid var(--border-color)',
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              fontSize: '14px',
                            }}>{children}</th>
                          ),
                          td: ({ children }) => (
                            <td style={{
                              border: '1px solid var(--border-color)',
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontSize: '14px',
                            }}>{children}</td>
                          ),
                          hr: () => (
                            <hr style={{
                              border: 'none',
                              borderTop: '1px solid var(--border-color)',
                              margin: '24px 0',
                            }} />
                          ),
                          strong: ({ children }) => (
                            <strong style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em style={{ fontStyle: 'italic' }}>{children}</em>
                          ),
                          del: ({ children }) => (
                            <del style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{children}</del>
                          ),
                        }}
                      >
                        {normalizeMarkdown(content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minHeight: '400px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <p style={{
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        fontSize: '15px',
                      }}>
                        在左侧输入内容，这里将实时显示预览效果...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧边栏 */}
            <div style={{
              width: '320px',
              borderLeft: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              padding: '24px',
            }}>
              {/* 文档设置 */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '16px',
                  letterSpacing: '0.5px',
                }}>
                  文档设置
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                  }}>
                    文档描述
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="简要描述文档内容..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '10px 14px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                  }}>
                    标签
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    minHeight: '40px',
                  }}>
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 12px',
                          background: 'var(--primary-color)',
                          color: 'white',
                          borderRadius: 'var(--radius-lg)',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {tag}
                        <span
                          onClick={() => handleRemoveTag(index)}
                          style={{
                            cursor: 'pointer',
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                          }}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={inputTag}
                      onChange={(e) => setInputTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="输入标签后按回车添加..."
                      style={{
                        flex: 1,
                        minWidth: '100px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        background: 'transparent',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                  }}>
                    作者信息
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserAvatar
                      src={user?.avatar}
                      alt={author}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="作者名称"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 提交选项 */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '16px',
                  letterSpacing: '0.5px',
                }}>
                  发布选项
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>允许评论</span>
                  <div
                    onClick={() => setAllowComments(!allowComments)}
                    style={{
                      position: 'relative',
                      width: '48px',
                      height: '24px',
                      background: allowComments ? 'var(--primary-color)' : 'var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      width: '20px',
                      height: '20px',
                      background: 'white',
                      borderRadius: '50%',
                      top: '2px',
                      left: allowComments ? '26px' : '2px',
                      transition: 'all 0.2s',
                    }} />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>允许编辑</span>
                  <div
                    onClick={() => setAllowEdit(!allowEdit)}
                    style={{
                      position: 'relative',
                      width: '48px',
                      height: '24px',
                      background: allowEdit ? 'var(--primary-color)' : 'var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      width: '20px',
                      height: '20px',
                      background: 'white',
                      borderRadius: '50%',
                      top: '2px',
                      left: allowEdit ? '26px' : '2px',
                      transition: 'all 0.2s',
                    }} />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>AI索引</span>
                  <div
                    onClick={() => setAiIndex(!aiIndex)}
                    style={{
                      position: 'relative',
                      width: '48px',
                      height: '24px',
                      background: aiIndex ? 'var(--primary-color)' : 'var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      width: '20px',
                      height: '20px',
                      background: 'white',
                      borderRadius: '50%',
                      top: '2px',
                      left: aiIndex ? '26px' : '2px',
                      transition: 'all 0.2s',
                    }} />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}>
                  <div
                    onClick={() => setSaveOption('submit_review')}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-primary)',
                      border: saveOption === 'submit_review' ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = saveOption === 'submit_review' ? 'var(--primary-color)' : 'var(--border-color)';
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg style={{ color: 'var(--success-color)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 11a9 9 0 0 1 9 9"/>
                        <path d="M4 4a16 16 0 0 1 16 16"/>
                        <circle cx="5" cy="19" r="1"/>
                      </svg>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}>
                      {isDirectPublish ? '直接发布' : '提交审核'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}>
                      {isDirectPublish ? '文档将直接发布，无需审核' : '提交后由审核员审核后发布'}
                    </div>
                  </div>
                  <div
                    onClick={() => setSaveOption('draft')}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-primary)',
                      border: saveOption === 'draft' ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = saveOption === 'draft' ? 'var(--primary-color)' : 'var(--border-color)';
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg style={{ color: 'var(--warning-color)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}>
                      保存草稿
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}>
                      稍后继续编辑
                    </div>
                  </div>
                </div>
              </div>

              {/* AI写作助手 */}
              {enableAIWriting && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(139, 92, 246, 0.05))',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                    <path d="M12 12 2.1 12a10 10 0 0 0 10 10h-10v-20z"/>
                    <path d="M12 12 12 21.9a10 10 0 0 0 10-10h-10v10z"/>
                  </svg>
                  AI 写作助手
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                }}>
                  基于Claude 3.5 Opus的智能写作助手，帮助您快速创建专业文档。
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '12px',
                }}>
                  <button
                    onClick={aiGenerateOutline}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.color = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      生成文档大纲
                    </div>
                  </button>
                  <button
                    onClick={aiExpandContent}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.color = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4 7.8 7.8 0 0 1-2.4-4.2"/>
                        <path d="M9 9h.01"/>
                        <path d="M9 12h.01"/>
                        <path d="M9 15h.01"/>
                        <path d="M9 18h.01"/>
                        <path d="M12 15h.01"/>
                        <path d="M12 18h.01"/>
                        <path d="M15 15h.01"/>
                        <path d="M15 18h.01"/>
                      </svg>
                      扩展内容
                    </div>
                  </button>
                  <button
                    onClick={aiImproveWriting}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.color = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      优化表达
                    </div>
                  </button>
                  <button
                    onClick={aiAddExamples}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.color = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <path d="M9 18h6"/>
                        <path d="M10 22h4"/>
                        <path d="M12 2a7 7 0 0 0-7 7c0 2 2 3 2 5h10c0-2 2-3 2-5a7 7 0 0 0-7-7z"/>
                      </svg>
                      添加示例
                    </div>
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <DraftRecoveryDialog
      open={isRecoveryDialogOpen}
      draft={recoveryDraft}
      onAccept={handleAcceptRecovery}
      onDismiss={dismissRecovery}
    />
    </>
  );
};

export default CreateDocumentPage;
