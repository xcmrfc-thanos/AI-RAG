import React from 'react';
import { Result } from 'antd';

/**
 * 功能开关关闭时的占位页
 *
 * @param title 标题
 * @param subtitle 说明
 * @author AI-RAG
 */
const FeatureDisabledPanel: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle = '管理员可在系统设置中开启该功能',
}) => (
  <Result status="info" title={title} subTitle={subtitle} />
);

export default FeatureDisabledPanel;
