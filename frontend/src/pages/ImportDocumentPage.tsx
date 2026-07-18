import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudUploadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileMarkdownOutlined,
  EyeOutlined,
  ClearOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import { useAppStore } from '@/stores';
import { documentService } from '@/services';
import {
  DEFAULT_RESUMABLE_MAX_BYTES,
  DEFAULT_UPLOAD_THRESHOLD_BYTES,
  getUploadPhaseLabel,
  uploadWithResume,
  type UploadProgress,
} from '@/services/resumable-upload';
import { formatFileSize } from '@/utils';

import './ImportDocumentPage.css';

interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  /** 上传/解析阶段文案（指纹、上传、解析等） */
  phaseLabel?: string;
  error?: string;
  documentId?: string;
}

export const ImportDocumentPage: React.FC = () => {
  const { message } = App.useApp();
  const maxFileSize = useAppStore((s) => s.maxFileSize);
  const allowedFileTypes = useAppStore((s) => s.allowedFileTypes);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasImported, setHasImported] = useState(false);

  /** 导入页允许的单文件上限（整传配置与分片上限取较大值） */
  const uploadMaxBytes = Math.max(maxFileSize, DEFAULT_RESUMABLE_MAX_BYTES);

  const supportedFormats = [
    { name: 'PDF', ext: '.pdf', icon: <FilePdfOutlined />, color: '#DC2626' },
    { name: 'Word', ext: '.doc/.docx', icon: <FileWordOutlined />, color: '#2563EB' },
    { name: 'Excel', ext: '.xls/.xlsx', icon: <FileExcelOutlined />, color: '#16A34A' },
    { name: 'PPT', ext: '.ppt/.pptx', icon: <FilePptOutlined />, color: '#EA580C' },
    { name: '文本', ext: '.txt', icon: <FileTextOutlined />, color: '#475569' },
    { name: 'Markdown', ext: '.md', icon: <FileMarkdownOutlined />, color: '#0F172A' },
  ];

  /**
   * 选择本地文件并加入待上传列表
   *
   * @param files 文件列表
   */
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowedExts = allowedFileTypes.split(',').map(t => {
      const trimmed = t.trim().toLowerCase();
      return trimmed.startsWith('.') ? trimmed : '.' + trimmed;
    });

    const newFiles: FileItem[] = [];

    for (const file of Array.from(files)) {
      // 客户端文件类型校验
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        message.error(`不支持的文件类型：${ext}，允许的类型：${allowedFileTypes}`);
        continue;
      }
      // 客户端文件大小校验：分片路径允许至 resumable max
      if (file.size > uploadMaxBytes) {
        const maxMB = Math.round(uploadMaxBytes / 1048576 * 10) / 10;
        message.error(`文件 ${file.name} 大小超过 ${maxMB}MB 限制`);
        continue;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
        progress: 0,
      });
    }

    if (newFiles.length > 0) {
      setFileList((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveFile = (id: string) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setFileList([]);
  };

  /**
   * 更新单个文件项的进度/阶段文案。
   *
   * @param id 列表项 ID
   * @param patch 局部字段
   */
  const patchFileItem = (id: string, patch: Partial<FileItem>) => {
    setFileList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  /**
   * 从未知错误中提取可读文案。
   *
   * @param error 捕获的错误
   * @param fallback 回退文案
   * @returns 错误消息
   */
  const resolveErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    return fallback;
  };

  /**
   * 导入单个文件：小于 20MB 整传解析；大于等于 20MB 分片上传后按 FileMetadata 建草稿。
   *
   * @param fileItem 待导入项
   * @returns 解析结果中的 documentId
   */
  const importOneFile = async (fileItem: FileItem): Promise<string> => {
    const { file } = fileItem;

    if (file.size < DEFAULT_UPLOAD_THRESHOLD_BYTES) {
      patchFileItem(fileItem.id, { phaseLabel: '上传中' });
      try {
        const result = await documentService.uploadAndParseDocument(file, (percent) => {
          patchFileItem(fileItem.id, { progress: percent, phaseLabel: '上传中' });
        });
        return String(result.documentId);
      } catch (error) {
        throw new Error(`上传/解析失败：${resolveErrorMessage(error, '请重试')}`);
      }
    }

    let stored;
    try {
      stored = await uploadWithResume(file, {
        onProgress: (p: UploadProgress) => {
          patchFileItem(fileItem.id, {
            progress: Math.min(95, p.percent),
            phaseLabel: getUploadPhaseLabel(p.phase),
          });
        },
      });
    } catch (error) {
      throw new Error(`分片上传失败：${resolveErrorMessage(error, '请重试')}`);
    }

    try {
      patchFileItem(fileItem.id, { progress: 96, phaseLabel: '解析中' });
      const result = await documentService.createDocumentFromStoredFile(stored.id);
      return String(result.documentId);
    } catch (error) {
      throw new Error(`解析建草稿失败：${resolveErrorMessage(error, '请重试')}`);
    }
  };

  const getFileIcon = (fileName: string): { icon: React.ReactNode; color: string } => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      pdf: { icon: <FilePdfOutlined />, color: '#FF5722' },
      doc: { icon: <FileWordOutlined />, color: '#2B579A' },
      docx: { icon: <FileWordOutlined />, color: '#2B579A' },
      xls: { icon: <FileExcelOutlined />, color: '#217346' },
      xlsx: { icon: <FileExcelOutlined />, color: '#217346' },
      ppt: { icon: <FilePptOutlined />, color: '#D24726' },
      pptx: { icon: <FilePptOutlined />, color: '#D24726' },
      txt: { icon: <FileTextOutlined />, color: '#616161' },
      md: { icon: <FileMarkdownOutlined />, color: '#083FA1' },
    };
    return iconMap[ext || ''] || { icon: <FileTextOutlined />, color: '#1890FF' };
  };

  const handleUpload = async () => {
    const pendingFiles = fileList.filter((item) => item.status === 'pending');
    if (pendingFiles.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }

    setIsUploading(true);

    for (const fileItem of pendingFiles) {
      try {
        patchFileItem(fileItem.id, {
          status: 'uploading',
          progress: 0,
          phaseLabel: fileItem.file.size >= DEFAULT_UPLOAD_THRESHOLD_BYTES ? '计算指纹' : '上传中',
          error: undefined,
        });

        const documentId = await importOneFile(fileItem);

        patchFileItem(fileItem.id, {
          status: 'success',
          progress: 100,
          phaseLabel: undefined,
          documentId,
        });

        setHasImported(true);
        message.success(`${fileItem.file.name} 导入成功`);
      } catch (error) {
        console.error('上传失败:', error);
        const errMsg = resolveErrorMessage(error, '导入失败，请重试');
        patchFileItem(fileItem.id, {
          status: 'error',
          phaseLabel: undefined,
          error: errMsg,
        });
        message.error(`${fileItem.file.name} ${errMsg}`);
      }
    }

    setIsUploading(false);
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  const handleViewDrafts = () => {
    navigate('/drafts');
  };

  /**
   * 重试失败的导入项。
   *
   * @param fileItem 失败项
   */
  const retryFile = async (fileItem: FileItem) => {
    try {
      patchFileItem(fileItem.id, {
        status: 'uploading',
        progress: 0,
        phaseLabel: fileItem.file.size >= DEFAULT_UPLOAD_THRESHOLD_BYTES ? '计算指纹' : '上传中',
        error: undefined,
      });

      const documentId = await importOneFile(fileItem);

      patchFileItem(fileItem.id, {
        status: 'success',
        progress: 100,
        phaseLabel: undefined,
        documentId,
      });

      setHasImported(true);
      message.success(`${fileItem.file.name} 重试导入成功`);
    } catch (error) {
      console.error('重试上传失败:', error);
      const errMsg = resolveErrorMessage(error, '导入失败，请重试');
      patchFileItem(fileItem.id, {
        status: 'error',
        phaseLabel: undefined,
        error: errMsg,
      });
      message.error(`${fileItem.file.name} ${errMsg}`);
    }
  };

  return (
    <div className="import-document-page">
      <div className="import-header">
        <div className="import-breadcrumb">
          <a href="/documents" onClick={(e) => { e.preventDefault(); navigate('/documents'); }}>文档中心</a>
          {' / 导入文档'}
        </div>
        <h1 className="import-title">导入文档</h1>
        <p className="import-desc">
          拖拽或选择文件批量导入，系统会解析正文并生成草稿，便于继续编辑后发布。
        </p>
        <div className="import-format-chips" aria-label="支持的文件格式">
          {supportedFormats.map((format) => (
            <span key={format.name} className="import-format-chip" style={{ color: format.color }}>
              {format.icon}
              {format.name}
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>{format.ext}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="import-panel">
        <div
          className={`upload-area ${fileList.length > 0 ? 'has-files' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CloudUploadOutlined className="upload-main-icon" />
          <div className="upload-text">
            <h3>点击或拖拽文件到此处</h3>
            <p>
              支持单个或批量上传，单文件最大 {Math.round(uploadMaxBytes / 1048576 * 10) / 10}MB
              （≥{Math.round(DEFAULT_UPLOAD_THRESHOLD_BYTES / 1048576)}MB 自动分片）
            </p>
          </div>
          <button
            type="button"
            className="upload-button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <CloudUploadOutlined />
            选择文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedFileTypes.split(',').map(t => {
              const ext = t.trim().toLowerCase();
              if (ext === 'pdf') return 'application/pdf,.pdf';
              return '.' + ext;
            }).join(',')}
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        <div className="import-tips">
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          <strong>说明：</strong>
          上传后自动创建草稿；可在草稿箱继续编辑。小文件显示实际上传进度；大文件依次显示指纹、分片、合并与解析阶段。
        </div>

        {fileList.length > 0 && (
          <>
            <div className="file-list">
              <div className="file-list-header">
                <h3>文件列表 ({fileList.length})</h3>
                <button
                  type="button"
                  className="clear-button"
                  onClick={handleClearAll}
                  disabled={isUploading}
                >
                  <ClearOutlined />
                  清空列表
                </button>
              </div>
              {fileList.map((item) => {
                const { icon, color } = getFileIcon(item.file.name);
                return (
                  <div key={item.id} className={`file-item ${item.status}`}>
                    <div className="file-icon" style={{ color }}>
                      {icon}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{item.file.name}</div>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(item.file.size)}</span>
                        {item.status === 'uploading' && (
                          <span className="file-status-text">
                            {item.phaseLabel || '处理中'} {item.progress}%
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="file-status-text success">上传成功</span>
                        )}
                        {item.status === 'error' && (
                          <span className="file-status-text error">上传失败</span>
                        )}
                      </div>
                      {item.status === 'uploading' && (
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'error' && item.error && (
                        <div className="error-message">{item.error}</div>
                      )}
                    </div>
                    <div className="file-actions">
                      {item.status === 'error' && (
                        <button
                          type="button"
                          className="action-button retry"
                          onClick={() => retryFile(item)}
                          title="重试"
                        >
                          <ReloadOutlined />
                        </button>
                      )}
                      {item.status === 'success' && item.documentId && (
                        <button
                          type="button"
                          className="action-button view"
                          onClick={() => handleViewDocument(item.documentId!)}
                          title="查看文档"
                        >
                          <EyeOutlined />
                        </button>
                      )}
                      <button
                        type="button"
                        className="action-button delete"
                        onClick={() => handleRemoveFile(item.id)}
                        title="删除"
                        disabled={item.status === 'uploading'}
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearAll}
                disabled={isUploading}
              >
                <ClearOutlined />
                清空列表
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpload}
                disabled={isUploading || fileList.every((item) => item.status !== 'pending')}
              >
                {isUploading ? (
                  <>
                    <LoadingOutlined />
                    上传中...
                  </>
                ) : (
                  <>
                    <CloudUploadOutlined />
                    开始上传
                  </>
                )}
              </button>
              {hasImported && (
                <button
                  type="button"
                  className="btn-drafts"
                  onClick={handleViewDrafts}
                >
                  <FolderOpenOutlined />
                  查看草稿箱
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportDocumentPage;
