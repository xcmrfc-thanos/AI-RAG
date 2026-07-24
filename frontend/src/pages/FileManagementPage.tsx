/**
 * 业务页面：FileManagementPage。
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Tooltip,
  Modal,
  Upload,
  Image,
  Row,
  Col,
  Statistic,
  Progress,
  Select,
  Popconfirm,
  Spin,
} from 'antd';
import { App } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import {
  FileOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileZipOutlined,
  EditOutlined,
  CopyOutlined,
  ZoomOutOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useFileManagementStore } from '@/stores/file-management.store';
import { useAppStore } from '@/stores';
import { fileManagementService, FileMetadata } from '@/services/file-management.service';
import {
  DEFAULT_RESUMABLE_MAX_BYTES,
  DEFAULT_UPLOAD_THRESHOLD_BYTES,
  getUploadPhaseLabel,
  type UploadProgress,
} from '@/services/resumable-upload';
import type { EntityId } from '@/types';
import type { WorkBook } from 'xlsx';
import { convertDocxToHtml, readExcelWorkbook, xlsxToStyledHtml } from '@/utils/document-preview-loaders';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './FileManagementPage.css';

const PdfPreviewPanel = lazy(() => import('@/components/file-management/PdfPreviewPanel'));

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 标准化 Markdown 内容，防止因粘贴/文件缩进导致标题被误解析为代码块。
 * 找出所有非空行的最小公共缩进，将其从每行开头移除。
 */
const normalizeMarkdown = (text: string): string => {
  if (!text) return text;
  const lines = text.split('\n');

  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const match = line.match(/^[ \t]*/);
    if (match) minIndent = Math.min(minIndent, match[0].length);
  }

  if (minIndent === Infinity || minIndent === 0) return text;

  return lines
    .map(line => {
      if (line.trim().length === 0) return line;
      return line.slice(Math.min(minIndent, line.length));
    })
    .join('\n');
};

const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'md', 'markdown', 'txt', 'docx', 'xlsx', 'xls', 'pptx', 'ppt', 'doc',
]);

const isDocumentPreviewable = (file: FileMetadata): boolean => {
  if (file.fileCategory === 'document') return true;
  return DOCUMENT_EXTENSIONS.has(file.fileExtension?.toLowerCase() || '');
};

export const FileManagementPage: React.FC = () => {
  const { message } = App.useApp();
  // 使用新的状态管理
  const {
    files,
    statistics,
    isLoading,
    error,
    currentCategory,
    selectedFiles,
    loadFileList,
    loadStatistics,
    uploadFile,
    deleteFile,
    batchDeleteFiles,
    renameFile,
    updateFilePermission,
    copyFile,
    searchFiles,
    setSelectedFiles,
    setCurrentCategory,
    clearError,
  } = useFileManagementStore();

  const maxFileSize = useAppStore((s) => s.maxFileSize);
  const allowedFileTypes = useAppStore((s) => s.allowedFileTypes);

  // 本地状态
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewContentRef = React.useRef<HTMLDivElement>(null);

  // 关闭预览时暂停所有媒体播放
  const closePreview = () => {
    // 暂停预览容器内的所有 video / audio 元素
    if (previewContentRef.current) {
      previewContentRef.current.querySelectorAll('video, audio').forEach((el) => {
        (el as HTMLMediaElement).pause();
        (el as HTMLMediaElement).removeAttribute('src');
      });
    }
    setMediaLoading(false);
    // 重置文档预览状态
    setTxtContent(null); setTxtLoading(false); setTxtError(null);
    setMdContent(null); setMdLoading(false); setMdError(null);
    setDocxHtml(null); setDocxLoading(false); setDocxError(null);
    setXlsxWb(null); setXlsxLoading(false); setXlsxError(null);
    setPptSlideImages(null); setPptCurrentSlide(0); setPptLoading(false); setPptError(null);
    setPreviewVisible(false);
    setCurrentFile(null);
  };
  const [currentFile, setCurrentFile] = useState<FileMetadata | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadProgress['phase'] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  // 文档预览内容状态
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const [txtLoading, setTxtLoading] = useState(false);
  const [txtError, setTxtError] = useState<string | null>(null);
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [xlsxWb, setXlsxWb] = useState<WorkBook | null>(null);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [xlsxError, setXlsxError] = useState<string | null>(null);

  // PPT 预览状态
  const [pptSlideImages, setPptSlideImages] = useState<string[] | null>(null);
  const [pptCurrentSlide, setPptCurrentSlide] = useState(0);
  const [pptLoading, setPptLoading] = useState(false);
  const [pptError, setPptError] = useState<string | null>(null);
  const pptMainRef = React.useRef<HTMLDivElement>(null);

  // 文件分类选项
  const categoryOptions = [
    { label: '全部文件', value: 'all' },
    { label: '图片', value: 'image' },
    { label: '文档', value: 'document' },
    { label: '视频', value: 'video' },
    { label: '音频', value: 'audio' },
    { label: '压缩包', value: 'archive' },
    { label: '其他', value: 'other' },
  ];

  // 初始化加载数据（合并调用，避免重复请求）
  useEffect(() => {
    /**
     * initFileManagement。
     */
    const initFileManagement = async () => {
      try {
        // 并行加载数据，但只发起一次请求
        await Promise.all([
          loadFileList(),
          loadStatistics()
        ]);
      } catch (error) {
        console.error('初始化文件管理数据失败:', error);
      }
    };

    initFileManagement();
  }, [loadFileList, loadStatistics]);

  // 错误处理
  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [clearError, error, message]);

  // 文档预览：当 currentFile 变化时异步拉取文件内容
  useEffect(() => {
    if (!currentFile || !isDocumentPreviewable(currentFile)) return;

    const streamUrl = fileManagementService.getMediaStreamUrl(currentFile.id);
    const ext = currentFile.fileExtension?.toLowerCase();

    // PDF 不需要在此 fetch（用 iframe）
    if (ext === 'pdf') return;

    let cancelled = false;

    /**
     * fetchContent。
     */
    const fetchContent = async () => {
      const authHeaders = fileManagementService.getAuthHeaders();
      if (ext === 'txt') {
        setTxtError(null); setTxtLoading(true);
        try {
          const res = await fetch(streamUrl, { headers: authHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (!cancelled) { setTxtContent(text); setTxtLoading(false); }
        } catch (err: any) {
          if (!cancelled) { setTxtError(err.message); setTxtLoading(false); }
        }
      } else if (ext === 'md') {
        setMdError(null); setMdLoading(true);
        try {
          const res = await fetch(streamUrl, { headers: authHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (!cancelled) { setMdContent(text); setMdLoading(false); }
        } catch (err: any) {
          if (!cancelled) { setMdError(err.message); setMdLoading(false); }
        }
      } else if (ext === 'docx') {
        setDocxError(null); setDocxLoading(true);
        try {
          const res = await fetch(streamUrl, { headers: authHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const html = await convertDocxToHtml(buf);
          if (!cancelled) { setDocxHtml(html); setDocxLoading(false); }
        } catch (err: any) {
          if (!cancelled) { setDocxError(err.message); setDocxLoading(false); }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        setXlsxError(null); setXlsxLoading(true);
        try {
          const res = await fetch(streamUrl, { headers: authHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const wb = await readExcelWorkbook(buf);
          if (!cancelled) { setXlsxWb(wb); setXlsxLoading(false); }
        } catch (err: any) {
          if (!cancelled) { setXlsxError(err.message); setXlsxLoading(false); }
        }
      } else if (ext === 'pptx' || ext === 'ppt') {
        setPptError(null); setPptLoading(true);
        try {
          const images = await fileManagementService.getPptxSlideImages(currentFile.id);
          if (!cancelled) { setPptSlideImages(images); setPptCurrentSlide(0); setPptLoading(false); }
        } catch (err: any) {
          if (!cancelled) { setPptError(err.message || '加载失败'); setPptLoading(false); }
        }
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [currentFile]);

  // PPT 图片自适应：用 JS 实测容器宽度，计算出精确 px 尺寸直接写入 img style，彻底避开 CSS 布局陷阱
  React.useLayoutEffect(() => {
    const container = pptMainRef.current;
    if (!container || !pptSlideImages) return;
    /**
     * applySize。
     */
    const applySize = () => {
      const img = container.querySelector<HTMLImageElement>('img');
      if (!img) return;
      const pad = 16 * 2; // .ppt-viewer-main padding
      const maxW = container.clientWidth - pad;
      if (maxW <= 0) return;
      const w = Math.round(maxW);
      const h = Math.round(maxW * 9 / 16);
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.display = 'block';
      img.style.borderRadius = '4px';
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      img.style.background = '#fff';
    };
    // 等一帧让 DOM 布局完成
    requestAnimationFrame(() => {
      applySize();
      // 第二次确保图片加载后也算对
      requestAnimationFrame(applySize);
    });
    const ro = new ResizeObserver(() => requestAnimationFrame(applySize));
    ro.observe(container);
    return () => ro.disconnect();
  }, [pptCurrentSlide, pptSlideImages]);

  // ========== 文档预览工具函数 ==========

  // 获取文件图标
  const getFileIcon = (file: FileMetadata) => {
    const iconStyle = { fontSize: '24px', color: '#1890ff' };

    switch (file.fileCategory) {
      case 'image':
        return <FileImageOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
      case 'document':
        return getDocumentIcon(file.fileExtension?.toLowerCase() || '', iconStyle);
      case 'video':
        return <VideoCameraOutlined style={{ ...iconStyle, color: '#722ed1' }} />;
      case 'audio':
        return <AudioOutlined style={{ ...iconStyle, color: '#fa8c16' }} />;
      case 'archive':
        return <FileZipOutlined style={{ ...iconStyle, color: '#faad14' }} />;
      default:
        // 扩展名回退：other 类别中可识别的文档类型仍显示专业图标
        if (DOCUMENT_EXTENSIONS.has(file.fileExtension?.toLowerCase() || '')) {
          return getDocumentIcon(file.fileExtension?.toLowerCase() || '', iconStyle);
        }
        return <FileOutlined style={iconStyle} />;
    }
  };

  // 文档类型图标（按扩展名精细化区分）
  const getDocumentIcon = (ext: string, iconStyle: React.CSSProperties) => {
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
      case 'doc':
      case 'docx':
        return <FileWordOutlined style={{ ...iconStyle, color: '#2b579a' }} />;
      case 'xls':
      case 'xlsx':
        return <FileExcelOutlined style={{ ...iconStyle, color: '#217346' }} />;
      case 'ppt':
      case 'pptx':
        return <FilePptOutlined style={{ ...iconStyle, color: '#d24726' }} />;
      case 'md':
      case 'markdown':
        return <FileMarkdownOutlined style={{ ...iconStyle, color: '#6366f1' }} />;
      case 'txt':
        return <FileTextOutlined style={{ ...iconStyle, color: '#64748b' }} />;
      default:
        return <FileOutlined style={iconStyle} />;
    }
  };

  // 获取文件类型标签颜色
  const getFileTypeColor = (category: string) => {
    const categoryMap: Record<string, string> = {
      image: 'green',
      document: 'blue',
      video: 'purple',
      audio: 'orange',
      archive: 'gold',
      other: 'default',
    };
    return categoryMap[category] || 'default';
  };

  // 处理文件上传
  const handleUpload = async (file: File) => {
    // 客户端文件类型校验
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = allowedFileTypes.split(',').map(t => {
      const trimmed = t.trim().toLowerCase();
      return trimmed.startsWith('.') ? trimmed : '.' + trimmed;
    });
    if (!allowedExts.includes(ext)) {
      message.error(`不支持的文件类型：${ext}，允许的类型：${allowedFileTypes}`);
      return false;
    }
    // 客户端文件大小校验：分片路径允许到 resumable max（默认 500MB）
    const uploadMaxBytes = Math.max(maxFileSize, DEFAULT_RESUMABLE_MAX_BYTES);
    if (file.size > uploadMaxBytes) {
      const maxMB = Math.round(uploadMaxBytes / 1048576 * 10) / 10;
      message.error(`文件大小不能超过 ${maxMB}MB`);
      return false;
    }

    try {
      setUploadProgress(0);
      setUploadPhase('hash');

      await uploadFile(file, false, (p: UploadProgress) => {
        setUploadPhase(p.phase);
        setUploadProgress(p.percent);
      });

      setUploadProgress(100);
      setUploadPhase(null);

      message.success('文件上传成功');
      setUploadModalVisible(false);
      setUploadFileList([]);
      setUploadProgress(0);
    } catch (error: any) {
      message.error('文件上传失败: ' + (error.message || '未知错误'));
      setUploadProgress(0);
      setUploadPhase(null);
    }

    return false; // 阻止默认上传行为
  };

  // 处理文件删除
  const handleDelete = async (fileId: EntityId) => {
    try {
      await deleteFile(fileId);
      message.success('文件删除成功');
    } catch (error: any) {
      message.error('文件删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先选择要删除的文件');
      return;
    }

    try {
      const count = await batchDeleteFiles(selectedFiles);
      message.success(`成功删除 ${count} 个文件`);
    } catch (error: any) {
      message.error('批量删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理文件重命名
  const handleRename = async () => {
    if (!currentFile || !newFileName.trim()) {
      message.warning('请输入新的文件名');
      return;
    }

    try {
      await renameFile(currentFile.id, newFileName.trim());
      message.success('文件重命名成功');
      setRenameModalVisible(false);
      setNewFileName('');
      setCurrentFile(null);
    } catch (error: any) {
      message.error('文件重命名失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理权限更新
  const handlePermissionChange = async (fileId: EntityId, isPublic: boolean) => {
    try {
      await updateFilePermission(fileId, isPublic);
      message.success(isPublic ? '文件已设为公开' : '文件已设为私密');
    } catch (error: any) {
      message.error('权限更新失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理文件复制
  const handleCopy = async (fileId: EntityId) => {
    try {
      await copyFile(fileId);
      message.success('文件复制成功');
    } catch (error: any) {
      message.error('文件复制失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理文件下载（鉴权 Blob，不走 RustFS 直链）
  const handleDownload = async (file: FileMetadata) => {
    try {
      await fileManagementService.downloadFile(file.id, file.originalFileName);
      message.success('文件下载成功');
    } catch (error: any) {
      message.error('文件下载失败: ' + (error.message || '未知错误'));
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    if (value.trim()) {
      searchFiles(value.trim());
    } else {
      loadFileList(currentCategory);
    }
  };

  // 处理分类切换
  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);
    loadFileList(category);
  };

  // 打开重命名对话框
  const openRenameModal = (file: FileMetadata) => {
    setCurrentFile(file);
    setNewFileName(file.fileName);
    setRenameModalVisible(true);
  };

  // 打开预览对话框
  const openPreviewModal = (file: FileMetadata) => {
    console.log('🖼️ [openPreviewModal] 打开预览:');
    console.log('  - 文件ID:', file.id);
    console.log('  - 文件名:', file.fileName);
    console.log('  - 分类:', file.fileCategory);
    console.log('  - 类型:', file.contentType);
    console.log('  - 转码状态:', file.transcodeStatus);
    if (file.fileCategory === 'audio' || file.fileCategory === 'video') {
      setMediaLoading(true);
    }
    setCurrentFile(file);
    setPreviewVisible(true);
  };

  // 刷新
  const handleRefresh = () => {
    loadFileList(currentCategory);
    loadStatistics();
  };

  // 表格列定义
  const columns: ColumnsType<FileMetadata> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      width: '30%',
      render: (fileName: string, record: FileMetadata) => {
        const isPlayable = record.fileCategory === 'video' || record.fileCategory === 'audio'
          || record.fileCategory === 'image' || isDocumentPreviewable(record);
        return (
          <Space>
            {getFileIcon(record)}
            <Tooltip title={isPlayable ? '点击查看' : fileName}>
              <span
                className="cursor-pointer hover:text-blue-500"
                style={{ color: isPlayable ? '#1890ff' : undefined }}
                onClick={() => {
                  if (isPlayable) {
                    openPreviewModal(record);
                  }
                }}
              >
                {fileName || '未命名文件'}
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '分类',
      dataIndex: 'fileCategory',
      key: 'fileCategory',
      width: '10%',
      render: (category: string) => (
        <Tag color={getFileTypeColor(category)}>
          {category === 'image' ? '图片' :
           category === 'document' ? '文档' :
           category === 'video' ? '视频' :
           category === 'audio' ? '音频' :
           category === 'archive' ? '压缩包' : '其他'}
        </Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'fileSizeReadable',
      key: 'fileSize',
      width: '10%',
      render: (size: string) => size || '0 B',
    },
    {
      title: '权限',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: '8%',
      render: (isPublic: boolean, record: FileMetadata) => (
        <Tooltip title={isPublic ? '公开文件' : '私密文件'}>
          <Button
            type="text"
            icon={isPublic ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => handlePermissionChange(record.id, !isPublic)}
            style={{ color: isPublic ? '#52c41a' : '#8c8c8c' }}
          />
        </Tooltip>
      ),
    },
    {
      title: '下载次数',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: '10%',
      render: (count: number) => count || 0,
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (date: string) => (
        <Tooltip title={date}>
          <span>{date ? dayjs(date).fromNow() : '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '20%',
      render: (_: any, record: FileMetadata) => (
        <Space size="small">
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="重命名">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openRenameModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record.id)}
              size="small"
            />
          </Tooltip>
          {record.fileCategory === 'image' && (
            <Tooltip title="预览">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => openPreviewModal(record)}
                size="small"
              />
            </Tooltip>
          )}
          {(record.fileCategory === 'video' || record.fileCategory === 'audio') && (
            <Tooltip title={record.fileCategory === 'audio' ? '播放' : (record.transcodeStatus === 'DONE' ? 'HLS播放' : '播放（原始文件）')}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => openPreviewModal(record)}
                size="small"
              />
            </Tooltip>
          )}
          {isDocumentPreviewable(record) && (
            <Tooltip title="预览">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => openPreviewModal(record)}
                size="small"
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这个文件吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 渲染预览内容
  const renderPreviewContent = (file: FileMetadata) => {
    // 图片预览（走鉴权 stream，避免 RustFS 直链 403）
    if (file.fileCategory === 'image') {
      const imageUrl = fileManagementService.getMediaStreamUrl(file.id);
      return (
        <div style={{ textAlign: 'center' }}>
          <Image
            src={imageUrl}
            alt={file.fileName}
            style={{ maxWidth: '100%', maxHeight: '60vh' }}
            preview={false}
          />
        </div>
      );
    }

    // 视频预览（使用原生 HTML5 video 元素播放，支持 HTTP Range 流式加载）
    if (file.fileCategory === 'video') {
      const videoUrl = fileManagementService.getMediaStreamUrl(file.id);

      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <VideoCameraOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
            {file.fileName}
          </div>
          <div style={{ position: 'relative', minHeight: 54 }}>
            {mediaLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: 8,
                zIndex: 1,
              }}>
                <Spin tip="加载中..." />
              </div>
            )}
            <video
              src={videoUrl}
              controls
              controlsList="nodownload"
              style={{ width: '100%', maxHeight: '60vh', outline: 'none' }}
              onCanPlay={() => setMediaLoading(false)}
              onError={(e) => {
                setMediaLoading(false);
                const video = e.currentTarget;
                const error = video.error;
                console.error('❌ [视频] 播放出错: code=', error?.code, 'msg=', error?.message);
              }}
            />
          </div>
          {file.duration && (
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
              时长：{Math.floor(file.duration / 60)}分{file.duration % 60}秒
              {file.resolution && ` | 分辨率：${file.resolution}`}
              {file.bitrate && ` | 码率：${file.bitrate} kbps`}
            </div>
          )}
          {file.transcodeStatus && file.transcodeStatus !== 'DONE' && (
            <div style={{ marginTop: 8 }}>
              <Tag color="processing">转码中</Tag>
              <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>
                当前为原始文件直链播放，转码完成后将支持HLS自适应码率
              </span>
            </div>
          )}
        </div>
      );
    }

    // 音频预览（使用原生 HTML5 audio 元素播放）
    if (file.fileCategory === 'audio') {
      const audioUrl = fileManagementService.getMediaStreamUrl(file.id);

      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <AudioOutlined style={{ fontSize: 64, color: '#fa8c16' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
            {file.fileName}
          </div>
          <div style={{ position: 'relative', minHeight: 54 }}>
            {mediaLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: 8,
                zIndex: 1,
              }}>
                <Spin tip="加载中..." />
              </div>
            )}
            <audio
              src={audioUrl}
              controls
              controlsList="nodownload"
              style={{ width: '100%', outline: 'none' }}
              onCanPlay={() => setMediaLoading(false)}
              onError={(e) => {
                setMediaLoading(false);
                const audio = e.currentTarget;
                const error = audio.error;
                console.error('❌ [音频] 播放出错: code=', error?.code, 'msg=', error?.message);
              }}
            />
          </div>
          {file.duration && (
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
              时长：{Math.floor(file.duration / 60)}分{file.duration % 60}秒
              {file.bitrate && ` | 码率：${file.bitrate} kbps`}
            </div>
          )}
        </div>
      );
    }

    // 文档预览（含扩展名回退，兼容旧数据中分类为 other 的文件）
    if (isDocumentPreviewable(file)) {
      const ext = file.fileExtension?.toLowerCase();

      // PDF：按需加载 react-pdf 预览组件
      if (ext === 'pdf') {
        const pdfUrl = fileManagementService.getMediaStreamUrl(file.id);
        return (
          <Suspense fallback={(
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin tip="正在加载 PDF 预览..." />
            </div>
          )}
          >
            <PdfPreviewPanel
              key={file.id}
              pdfUrl={pdfUrl}
              onDownload={() => handleDownload(file)}
              onRetry={() => openPreviewModal(file)}
            />
          </Suspense>
        );
      }

      // Markdown
      if (ext === 'md' || ext === 'markdown') {
        if (mdLoading) {
          return <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载中..." /></div>;
        }
        if (mdError) {
          return <PreviewError message={mdError} onDownload={() => handleDownload(file)} />;
        }
        return (
          <div className="markdown-preview" style={{ maxHeight: '70vh', overflow: 'auto', padding: 16 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{normalizeMarkdown(mdContent || '')}</ReactMarkdown>
          </div>
        );
      }

      // 纯文本
      if (ext === 'txt') {
        if (txtLoading) {
          return <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载中..." /></div>;
        }
        if (txtError) {
          return <PreviewError message={txtError} onDownload={() => handleDownload(file)} />;
        }
        return (
          <pre className="txt-preview">{txtContent || ''}</pre>
        );
      }

      // Word (.docx)
      if (ext === 'docx') {
        if (docxLoading) {
          return <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载中..." /></div>;
        }
        if (docxError) {
          return <PreviewError message={docxError} onDownload={() => handleDownload(file)} />;
        }
        return (
          <div
            className="docx-preview"
            style={{ maxHeight: '70vh', overflow: 'auto', padding: 16 }}
            dangerouslySetInnerHTML={{ __html: docxHtml || '' }}
          />
        );
      }

      // Excel (.xlsx, .xls)
      if (ext === 'xlsx' || ext === 'xls') {
        if (xlsxLoading) {
          return <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载中..." /></div>;
        }
        if (xlsxError) {
          return <PreviewError message={xlsxError} onDownload={() => handleDownload(file)} />;
        }
        const html = xlsxWb ? xlsxToStyledHtml(xlsxWb) : '<p>空表格</p>';
        return (
          <div className="xlsx-preview" style={{ maxHeight: '70vh', overflow: 'auto' }}
               dangerouslySetInnerHTML={{ __html: html }} />
        );
      }

      // PPT 幻灯片预览（后端 Apache POI 渲染为图片）
      if (ext === 'pptx' || ext === 'ppt') {
        if (pptLoading) {
          return (
            <div className="ppt-loading-skeleton">
              <div className="ppt-skeleton-toolbar">
                <FilePptOutlined style={{ fontSize: 16, color: '#d24726', marginRight: 8 }} />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>PPT 加载中...</span>
              </div>
              <div className="ppt-skeleton-body">
                <div className="ppt-skeleton-thumbnails">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="ppt-skeleton-thumb" />
                  ))}
                </div>
                <div className="ppt-loading-spinner-wrap">
                  <Spin size="large" />
                  <div style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>
                    正在渲染幻灯片，请稍候...
                  </div>
                </div>
              </div>
            </div>
          );
        }
        if (pptError) {
          return <PreviewError message={pptError} onDownload={() => handleDownload(file)} />;
        }
        if (!pptSlideImages || pptSlideImages.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <FilePptOutlined style={{ fontSize: 64, color: '#d24726' }} />
              <p style={{ marginTop: 16, color: '#64748b' }}>无法解析幻灯片内容</p>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(file)}>
                下载文件
              </Button>
            </div>
          );
        }

        const currentImg = pptSlideImages[pptCurrentSlide] || '';
        const totalSlides = pptSlideImages.length;

        return (
          <div className="ppt-viewer">
            {/* 顶部工具栏 */}
            <div className="ppt-viewer-toolbar">
              <div className="ppt-viewer-toolbar-left">
                <FilePptOutlined style={{ fontSize: 16, color: '#d24726' }} />
                <span className="ppt-viewer-slide-count">
                  幻灯片 {pptCurrentSlide + 1} / {totalSlides}
                </span>
              </div>
              <div className="ppt-viewer-toolbar-right">
                <Tooltip title="上一页">
                  <Button
                    type="text" size="small" icon={<ZoomOutOutlined style={{ transform: 'rotate(90deg)' }} />}
                    disabled={pptCurrentSlide <= 0}
                    onClick={() => setPptCurrentSlide(i => Math.max(0, i - 1))}
                  />
                </Tooltip>
                <Tooltip title="下一页">
                  <Button
                    type="text" size="small" icon={<ZoomOutOutlined style={{ transform: 'rotate(-90deg)' }} />}
                    disabled={pptCurrentSlide >= totalSlides - 1}
                    onClick={() => setPptCurrentSlide(i => Math.min(totalSlides - 1, i + 1))}
                  />
                </Tooltip>
                <Button
                  type="primary" size="small" ghost icon={<DownloadOutlined />}
                  onClick={() => handleDownload(file)}
                >
                  下载
                </Button>
              </div>
            </div>

            {/* 主体：左侧缩略图 + 右侧大图 */}
            <div className="ppt-viewer-body">
              {/* 左侧缩略图列表 */}
              <div className="ppt-viewer-thumbnails">
                {pptSlideImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`ppt-viewer-thumb ${idx === pptCurrentSlide ? 'active' : ''}`}
                    onClick={() => setPptCurrentSlide(idx)}
                    title={`幻灯片 ${idx + 1}`}
                  >
                    <img src={img} alt={`幻灯片 ${idx + 1}`} />
                    <span className="ppt-viewer-thumb-num">{idx + 1}</span>
                  </div>
                ))}
              </div>

              {/* 右侧主视图：JS 动态测量容器宽度后写入 img px 尺寸 */}
              <div className="ppt-viewer-main" ref={pptMainRef}>
                <img
                  src={currentImg}
                  alt={`幻灯片 ${pptCurrentSlide + 1}`}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* 底部进度条 */}
            <div className="ppt-viewer-progress">
              <div
                className="ppt-viewer-progress-bar"
                style={{ width: `${((pptCurrentSlide + 1) / totalSlides) * 100}%` }}
              />
            </div>
          </div>
        );
      }

      // 旧版 .doc 格式
      if (ext === 'doc') {
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FileWordOutlined style={{ fontSize: 64, color: '#2b579a' }} />
            <p style={{ marginTop: 16, color: '#64748b' }}>
              旧版 .doc 格式暂不支持在线预览，请使用 .docx 格式
            </p>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(file)}>
              下载文件
            </Button>
          </div>
        );
      }

      // 其他 document 类型 fallback
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <FileOutlined style={{ fontSize: 64, color: '#8c8c8c' }} />
          <p style={{ marginTop: 16, color: '#64748b' }}>
            此文件类型暂不支持在线预览
          </p>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(file)}>
            下载文件
          </Button>
        </div>
      );
    }

    // 其他文件类型
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <FileOutlined style={{ fontSize: 64, color: '#8c8c8c' }} />
        <p style={{ marginTop: 16, color: '#64748b' }}>
          此文件类型暂不支持在线预览
        </p>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          style={{ marginTop: 16 }}
          onClick={() => handleDownload(file)}
        >
          下载文件
        </Button>
      </div>
    );
  };

  // 预览错误组件
  const PreviewError = ({ message: errMsg, onDownload }: { message: string; onDownload: () => void }) => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ color: '#ff4d4f' }}>加载失败: {errMsg}</p>
      <Button style={{ marginRight: 8 }} onClick={() => {
        if (currentFile) openPreviewModal(currentFile);
      }}>重试</Button>
      <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
        下载文件
      </Button>
    </div>
  );

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedFiles,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedFiles(newSelectedRowKeys as number[]);
    },
  };

  return (
    <div className="file-management-page" style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Row gutter={24}>
          <Col span={18}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              <CloudServerOutlined style={{ marginRight: '12px', color: '#2563eb' }} />
              文件管理中心
            </h1>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
              管理您上传的所有文件，支持预览、下载、删除等操作
            </p>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              size="large"
              onClick={() => {
                setUploadFileList([]);
                setUploadProgress(0);
                setUploadPhase(null);
                setUploadModalVisible(true);
              }}
            >
              上传新文件
            </Button>
          </Col>
        </Row>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="总文件数"
              value={statistics?.totalCount || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="总存储"
              value={statistics?.totalSizeReadable || '0 B'}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="今日上传"
              value={statistics?.todayCount || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="已选择"
              value={selectedFiles.length}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: selectedFiles.length > 0 ? '#ef4444' : '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card variant="borderless" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Select
            value={currentCategory}
            onChange={handleCategoryChange}
            style={{ width: 120 }}
            options={categoryOptions}
          />
          <Input.Search
            placeholder="搜索文件名"
            allowClear
            onSearch={handleSearch}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            刷新
          </Button>
          {selectedFiles.length > 0 && (
            <Popconfirm
              title={`确定要删除选中的 ${selectedFiles.length} 个文件吗？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedFiles.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Card>

      {/* 文件列表 */}
      <Card variant="borderless">
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个文件`,
          }}
          onRow={(record) => ({
            onDoubleClick: () => {
            if (record.fileCategory === 'image' ||
                record.fileCategory === 'video' ||
                record.fileCategory === 'audio' ||
                isDocumentPreviewable(record)) {
              openPreviewModal(record);
            }
          },
          })}
        />
      </Card>

      {/* 上传文件对话框 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadFileList([]);
          setUploadProgress(0);
          setUploadPhase(null);
        }}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          fileList={uploadFileList}
          onChange={({ fileList }) => setUploadFileList(fileList)}
          beforeUpload={handleUpload}
          multiple
          showUploadList={true}
          accept={allowedFileTypes.split(',').map(t => {
            const ext = t.trim().toLowerCase();
            // PDF 需同时提供 MIME 类型以兼容 macOS Safari
            if (ext === 'pdf') return 'application/pdf,.pdf';
            return '.' + ext;
          }).join(',')}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined style={{ fontSize: 48 }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint" style={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
            支持单个或批量上传。允许的文件类型：{allowedFileTypes.split(',').join(', ')}，
            单文件最大 {Math.round(Math.max(maxFileSize, DEFAULT_RESUMABLE_MAX_BYTES) / 1048576 * 10) / 10}MB
            （≥{Math.round(DEFAULT_UPLOAD_THRESHOLD_BYTES / 1048576)}MB 自动分片）
          </p>
        </Upload.Dragger>

        {uploadPhase && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={uploadProgress}
              status={uploadPhase === 'check' && uploadProgress >= 100 ? 'success' : 'active'}
              format={(pct) => `${getUploadPhaseLabel(uploadPhase)} ${pct ?? 0}%`}
            />
          </div>
        )}
      </Modal>

      {/* 重命名对话框 */}
      <Modal
        title="重命名文件"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setNewFileName('');
          setCurrentFile(null);
        }}
      >
        <Input
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="请输入新的文件名"
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>

      {/* 文件预览对话框（图片/视频/音频） */}
      <Modal
        title={currentFile?.fileName}
        open={previewVisible}
        onCancel={closePreview}
        footer={[
          <Button key="close" onClick={closePreview}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (currentFile) {
                handleDownload(currentFile);
              }
            }}
          >
            下载
          </Button>,
        ]}
        width={currentFile?.fileCategory === 'image' ? 800 : 900}
      >
        {currentFile && (
          <div ref={previewContentRef} style={{ maxWidth: '100%' }}>
            {renderPreviewContent(currentFile)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileManagementPage;
