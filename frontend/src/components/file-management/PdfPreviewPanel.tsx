import React, { useEffect, useState } from 'react';
import { Button, Spin, Tooltip } from 'antd';
import {
  DownloadOutlined,
  FilePdfOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import type { DocumentProps, PageProps } from 'react-pdf';
import fileManagementService from '@/services/file-management.service';
import '@/pages/FileManagementPage.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

type ReactPdfModule = {
  pdfjs: { GlobalWorkerOptions: { workerSrc: string }; version: string };
  Document: React.ComponentType<DocumentProps>;
  Page: React.ComponentType<PageProps>;
};

export interface PdfPreviewPanelProps {
  /** PDF 流式访问地址 */
  pdfUrl: string;
  /** 下载当前文件 */
  onDownload: () => void;
  /** 加载失败后重试 */
  onRetry: () => void;
}

/**
 * 按需加载 react-pdf 的 PDF 预览面板，避免进入文件管理页即拉取大体积依赖。
 */
export const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({
  pdfUrl,
  onDownload,
  onRetry,
}) => {
  const [reactPdf, setReactPdf] = useState<ReactPdfModule | null>(null);
  const [loadModuleError, setLoadModuleError] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  /**
   * 动态导入 react-pdf 并配置 PDF.js worker。
   */
  useEffect(() => {
    let cancelled = false;

    const loadReactPdf = async () => {
      try {
        const module = await import('react-pdf');
        if (cancelled) {
          return;
        }
        module.pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.mjs`;
        setReactPdf({
          pdfjs: module.pdfjs,
          Document: module.Document,
          Page: module.Page,
        });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'react-pdf 加载失败';
          setLoadModuleError(message);
        }
      }
    };

    loadReactPdf();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 渲染加载失败时的统一错误区。
   */
  const renderPreviewError = (message: string, retry?: () => void) => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ color: '#ff4d4f' }}>加载失败: {message}</p>
      {retry && (
        <Button style={{ marginRight: 8 }} onClick={retry}>
          重试
        </Button>
      )}
      <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
        下载文件
      </Button>
    </div>
  );

  if (loadModuleError) {
    return renderPreviewError(loadModuleError, onRetry);
  }

  if (!reactPdf) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
        minHeight: 300,
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 20, color: '#64748b', fontSize: 14 }}>
          正在加载 PDF 预览组件...
        </div>
      </div>
    );
  }

  const { Document, Page } = reactPdf;

  /**
   * 带鉴权头的 PDF 源，避免裸 URL 请求被网关/服务拒绝。
   */
  const pdfFileSource = {
    url: pdfUrl,
    httpHeaders: fileManagementService.getAuthHeaders(),
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setPdfLoadError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF 加载失败:', err);
    setPdfLoadError(err.message);
  };

  if (pdfLoadError) {
    return renderPreviewError(pdfLoadError, onRetry);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: '#f8fafc', borderRadius: 8,
        marginBottom: 16, width: '100%', flexWrap: 'wrap',
        border: '1px solid #e2e8f0',
      }}>
        <FilePdfOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
          共 {pdfNumPages || '?'} 页
        </span>
        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 4px' }} />
        <Tooltip title="缩小">
          <Button
            type="text" size="small" icon={<ZoomOutOutlined />}
            disabled={pdfScale <= 0.5}
            onClick={() => setPdfScale((scale) => Math.max(0.5, scale - 0.2))}
          />
        </Tooltip>
        <span style={{ fontSize: 12, color: '#64748b', minWidth: 50, textAlign: 'center' }}>
          {Math.round(pdfScale * 100)}%
        </span>
        <Tooltip title="放大">
          <Button
            type="text" size="small" icon={<ZoomInOutlined />}
            disabled={pdfScale >= 3.0}
            onClick={() => setPdfScale((scale) => Math.min(3.0, scale + 0.2))}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <Button
          type="primary" size="small" ghost icon={<DownloadOutlined />}
          onClick={onDownload}
        >
          下载
        </Button>
      </div>

      <div className="pdf-preview-container" style={{
        maxHeight: '62vh', overflow: 'auto', borderRadius: 8,
        border: '1px solid #e2e8f0', background: '#f1f5f9',
        padding: 16, width: '100%', textAlign: 'center',
        minHeight: 300,
      }}>
        <Document
          key={pdfNumPages ?? 0}
          file={pdfFileSource}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 80, minHeight: 300,
            }}>
              <Spin size="large" />
              <div style={{ marginTop: 20, color: '#64748b', fontSize: 14 }}>
                正在加载并解析 PDF 文档...
              </div>
              <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                文件较大时可能需要几秒钟
              </div>
            </div>
          }
          error={
            <div style={{ textAlign: 'center', padding: 60 }}>
              <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              <p style={{ marginTop: 16, color: '#ff4d4f', fontSize: 14 }}>PDF 加载失败，请重试</p>
            </div>
          }
        >
          {pdfNumPages != null && pdfNumPages > 0
            ? Array.from({ length: pdfNumPages }, (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={pdfScale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center',
                      padding: 60,
                      margin: '0 auto 16px',
                      width: '100%',
                      maxWidth: 700,
                      minHeight: 200,
                      background: '#fff',
                      borderRadius: 4,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                      <Spin />
                      <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>
                        正在渲染第 {index + 1} 页...
                      </div>
                      <div style={{
                        marginTop: 12, width: 140, height: 3,
                        background: 'linear-gradient(90deg, #e2e8f0 25%, #3b82f6 50%, #e2e8f0 75%)',
                        backgroundSize: '200% 100%',
                        borderRadius: 2,
                        animation: 'pdf-loading-bar 1.4s ease-in-out infinite',
                      }} />
                    </div>
                  }
                />
              ))
            : null}
        </Document>
      </div>
    </div>
  );
};

export default PdfPreviewPanel;
