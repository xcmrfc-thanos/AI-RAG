import React, { useState, useCallback } from 'react';
import { Input, Button, Space } from 'antd';
import { EyeOutlined, EditOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const { TextArea } = Input;

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number | string;
  showToolbar?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入Markdown内容...',
  readOnly = false,
  height = 400,
  showToolbar = true,
}) => {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [content, setContent] = useState(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setContent(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  const editorStyle: React.CSSProperties = {
    height,
    border: '1px solid #d9d9d9',
    borderRadius: 8,
    overflow: 'hidden',
  };

  const getEditorWidth = () => {
    if (mode === 'edit') return '100%';
    if (mode === 'preview') return '0%';
    return '50%';
  };

  const getPreviewWidth = () => {
    if (mode === 'edit') return '0%';
    if (mode === 'preview') return '100%';
    return '50%';
  };

  return (
    <div>
      {showToolbar && !readOnly && (
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button
              type={mode === 'edit' ? 'primary' : 'default'}
              icon={<EditOutlined />}
              onClick={() => setMode('edit')}
              size="small"
            >
              编辑
            </Button>
            <Button
              type={mode === 'split' ? 'primary' : 'default'}
              onClick={() => setMode('split')}
              size="small"
            >
              分屏
            </Button>
            <Button
              type={mode === 'preview' ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setMode('preview')}
              size="small"
            >
              预览
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopy}
              size="small"
            >
              复制
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              size="small"
            >
              下载
            </Button>
          </Space>
        </div>
      )}

      <div style={editorStyle}>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* 编辑区域 */}
          <div
            style={{
              width: getEditorWidth(),
              height: '100%',
              borderRight: mode === 'split' ? '1px solid #d9d9d9' : 'none',
            }}
          >
            <TextArea
              value={content}
              onChange={handleChange}
              placeholder={placeholder}
              readOnly={readOnly}
              style={{
                height: '100%',
                border: 'none',
                borderRadius: 0,
                resize: 'none',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* 预览区域 */}
          <div
            style={{
              width: getPreviewWidth(),
              height: '100%',
              overflow: 'auto',
              padding: '16px 24px',
              backgroundColor: '#fff',
            }}
          >
            <div className="markdown-preview">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ node: _node, ...props }) => (
                    <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }} {...props} />
                  ),
                  h2: ({ node: _node, ...props }) => (
                    <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }} {...props} />
                  ),
                  h3: ({ node: _node, ...props }) => (
                    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }} {...props} />
                  ),
                  p: ({ node: _node, ...props }) => (
                    <p style={{ marginBottom: 12, lineHeight: 1.8 }} {...props} />
                  ),
                  code: ({ node: _node, inline, ...props }: any) =>
                    inline ? (
                      <code
                        style={{
                          backgroundColor: '#f5f5f5',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 14,
                        }}
                        {...props}
                      />
                    ) : (
                      <code
                        style={{
                          display: 'block',
                          backgroundColor: '#f5f5f5',
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 14,
                          overflow: 'auto',
                          fontFamily: 'Monaco, Menlo, monospace',
                        }}
                        {...props}
                      />
                    ),
                  a: ({ node: _node, ...props }) => (
                    <a style={{ color: '#1890ff' }} {...props} />
                  ),
                  ul: ({ node: _node, ...props }) => (
                    <ul style={{ marginBottom: 12, paddingLeft: 20 }} {...props} />
                  ),
                  ol: ({ node: _node, ...props }) => (
                    <ol style={{ marginBottom: 12, paddingLeft: 20 }} {...props} />
                  ),
                  blockquote: ({ node: _node, ...props }) => (
                    <blockquote
                      style={{
                        borderLeft: '4px solid #d9d9d9',
                        paddingLeft: 16,
                        color: '#595959',
                        marginBottom: 12,
                      }}
                      {...props}
                    />
                  ),
                }}
              >
                {content || '*开始编写您的Markdown内容...*'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
