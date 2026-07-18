import React from 'react';
import { Spin } from 'antd';

export interface PageLoadingProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
  /** 加载提示文案（显示在 Spin 下方） */
  tip?: React.ReactNode;
}

/**
 * 页面级居中加载占位，供搜索页等列表场景复用。
 */
export const PageLoading: React.FC<PageLoadingProps> = ({
  size = 'large',
  className = 'loading-container',
  style,
  tip,
}) => {
  return (
    <div className={className} style={style}>
      <Spin size={size} />
      {tip && (
        <div style={{ marginTop: 16, textAlign: 'center', color: '#8c8c8c', fontSize: 14 }}>
          {tip}
        </div>
      )}
    </div>
  );
};

export default PageLoading;
