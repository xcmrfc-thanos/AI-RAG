/**
 * 功能模块：WorkflowEmptyState。
 */
import React, { memo } from 'react';
import { Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { WORKFLOW_TEMPLATES, type WorkflowTemplateKey } from './workflow-templates';
import './WorkflowEmptyState.css';

const { Text, Title } = Typography;

interface WorkflowEmptyStateProps {
  onApply: (key: WorkflowTemplateKey) => void;
}

/**
 * WorkflowEmptyState 组件。
 */
const WorkflowEmptyState: React.FC<WorkflowEmptyStateProps> = ({ onApply }) => (
  <section className="wf-empty-state" aria-label="空画布快捷入口">
    <Title level={5}>从一个可运行流程开始</Title>
    <Text type="secondary">选择模板，或从左侧节点库点击 / 拖入节点。</Text>
    <div className="wf-empty-state__templates">
      {WORKFLOW_TEMPLATES.filter((template) => template.key !== 'blank').map((template) => (
        <button
          key={template.key}
          type="button"
          className="wf-empty-template"
          onClick={() => onApply(template.key)}
        >
          <span className="wf-empty-template__title">{template.title}</span>
          <span className="wf-empty-template__steps">{template.steps}</span>
          <span className="wf-empty-template__description">{template.description}</span>
        </button>
      ))}
    </div>
    <Button size="small" icon={<PlusOutlined />} onClick={() => onApply('blank')}>
      保持空白，从零搭建
    </Button>
  </section>
);

export default memo(WorkflowEmptyState);
