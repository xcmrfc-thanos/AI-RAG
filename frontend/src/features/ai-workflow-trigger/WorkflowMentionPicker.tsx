/**
 * AI 助手工作流结构化选择器（展示 @流程名 chip，不解析正文 JSON）。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Space, Tag } from 'antd';
import { ApartmentOutlined, CloseOutlined } from '@ant-design/icons';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import { agentService, type AgentWorkflowSummary } from '@/services/agent.service';
import type { WorkflowSelection } from './selection';

export type WorkflowMentionPickerProps = {
  value: WorkflowSelection | null;
  onChange: (next: WorkflowSelection | null) => void;
  disabled?: boolean;
};

/**
 * 已发布工作流选择器。
 *
 * @param props 选中态与变更回调
 */
export const WorkflowMentionPicker: React.FC<WorkflowMentionPickerProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const copy = AI_ENTRY_COPY.assistant;
  const [workflows, setWorkflows] = useState<AgentWorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await agentService.listPublishedWorkflows();
      setWorkflows(Array.isArray(list) ? list : []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const options = useMemo(
    () =>
      workflows
        .filter((w) => w.publishedVersionId)
        .map((w) => ({
          value: String(w.publishedVersionId),
          label: w.name,
          workflowId: w.id,
          workflowVersionId: w.publishedVersionId as number,
          name: w.name,
        })),
    [workflows],
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <Space wrap size={8}>
        <Button
          size="small"
          icon={<ApartmentOutlined />}
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            void load();
          }}
        >
          {copy.workflowPickerLabel}
        </Button>
        {value ? (
          <Tag
            color="blue"
            closable={!disabled}
            closeIcon={<CloseOutlined />}
            onClose={() => onChange(null)}
            style={{ marginInlineEnd: 0 }}
          >
            @{value.name}
          </Tag>
        ) : null}
        {open ? (
          <Select
            autoFocus
            open
            showSearch
            loading={loading}
            placeholder={copy.workflowPickerPlaceholder}
            style={{ minWidth: 220 }}
            options={options}
            optionFilterProp="label"
            onDropdownVisibleChange={(visible) => {
              if (!visible) setOpen(false);
            }}
            onSelect={(_v, option) => {
              const opt = option as (typeof options)[number];
              onChange({
                workflowId: opt.workflowId,
                workflowVersionId: opt.workflowVersionId,
                name: opt.name,
              });
              setOpen(false);
            }}
          />
        ) : null}
      </Space>
    </div>
  );
};
