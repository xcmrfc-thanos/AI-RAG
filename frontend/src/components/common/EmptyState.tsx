import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';

export interface EmptyStateProps {
  type?: 'documents' | 'search' | 'generic';
  message?: string;
  /** 自定义描述区，优先级高于 message */
  descriptionNode?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  /** 底部操作区（如多个按钮） */
  footer?: React.ReactNode;
  className?: string;
  /** 设为 false 隐藏默认插图，配合 descriptionNode 自定义空态 */
  image?: React.ReactNode | false;
}

/**
 * 统一空状态展示组件。
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  message,
  descriptionNode,
  actionText,
  onAction,
  footer,
  className,
  image,
}) => {
  const getEmptyConfig = () => {
    switch (type) {
      case 'documents':
        return {
          icon: <FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
          description: message || '暂无文档',
        };
      case 'search':
        return {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: message || '未找到相关内容',
        };
      default:
        return {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: message || '暂无数据',
        };
    }
  };

  const config = getEmptyConfig();
  const emptyImage = image !== undefined ? image : ('image' in config ? config.image : config.icon);
  const description = descriptionNode ?? (
    <span style={{ fontSize: 16, color: '#8c8c8c' }}>
      {config.description}
    </span>
  );

  return (
    <div className={className} style={{ padding: className ? undefined : '60px 0', textAlign: 'center' }}>
      <Empty
        image={emptyImage}
        description={description}
      >
        {footer}
        {!footer && actionText && onAction && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
