import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsReactProps } from 'echarts-for-react';
import { echarts } from '@/utils/admin-echarts';

export interface LazyEChartsProps extends EChartsReactProps {
  /** 加载占位区域高度 */
  fallbackHeight?: number | string;
}

/**
 * 按需加载 echarts-for-react，避免管理页首屏打入完整 echarts 包。
 */
export const LazyECharts: React.FC<LazyEChartsProps> = ({
  fallbackHeight = 300,
  style,
  ...props
}) => {
  const height = style?.height ?? fallbackHeight;

  return (
    <ReactEChartsCore
      echarts={echarts}
      style={{ height, ...style }}
      {...props}
    />
  );
};

export default LazyECharts;
