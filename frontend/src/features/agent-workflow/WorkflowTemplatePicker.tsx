import React, { memo } from 'react';
import { Button, Dropdown } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { WORKFLOW_TEMPLATES, type WorkflowTemplateKey } from './workflow-templates';

interface WorkflowTemplatePickerProps {
  onApply: (key: WorkflowTemplateKey) => void;
}

const WorkflowTemplatePicker: React.FC<WorkflowTemplatePickerProps> = ({ onApply }) => (
  <Dropdown
    trigger={['click']}
    menu={{
      items: WORKFLOW_TEMPLATES.map((template) => ({
        key: template.key,
        label: (
          <span className="wf-template-menu-item">
            <strong>{template.title}</strong>
            <small>{template.steps}</small>
          </span>
        ),
      })),
      onClick: ({ key }) => onApply(key as WorkflowTemplateKey),
    }}
  >
    <Button icon={<AppstoreOutlined />}>使用模板</Button>
  </Dropdown>
);

export default memo(WorkflowTemplatePicker);
