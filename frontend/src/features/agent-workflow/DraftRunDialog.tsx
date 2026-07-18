import React, { memo, useEffect, useState } from 'react';
import { Alert, Input, InputNumber, Modal, Space, Switch, Typography } from 'antd';
import { buildDraftInputDefaults, validateDraftInput } from './draft-autosave';
import type { WorkflowInputFieldSchema } from './types';

const { Text } = Typography;

interface DraftRunDialogProps {
  open: boolean;
  busy: boolean;
  schema?: Record<string, WorkflowInputFieldSchema>;
  onCancel: () => void;
  onRun: (input: Record<string, unknown>) => void;
}

const DraftRunDialog: React.FC<DraftRunDialogProps> = ({ open, busy, schema, onCancel, onRun }) => {
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return undefined;
    const frameId = requestAnimationFrame(() => {
      setInput(buildDraftInputDefaults(schema));
      setErrors([]);
    });
    return () => cancelAnimationFrame(frameId);
  }, [open, schema]);

  const fields = Object.entries(schema || {});
  return (
    <Modal
      title="试运行当前草稿"
      open={open}
      confirmLoading={busy}
      okText="运行草稿"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => {
        const nextErrors = validateDraftInput(schema, input);
        setErrors(nextErrors);
        if (nextErrors.length === 0) onRun(input);
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {errors.length > 0 ? <Alert type="error" showIcon message={errors[0]} /> : null}
        {fields.length === 0 ? <Text type="secondary">该工作流没有声明输入字段</Text> : null}
        {fields.map(([key, field]) => (
          <div key={key} className="wf-draft-input-field">
            <Text strong>{field.label || key}{field.required ? ' *' : ''}</Text>
            {field.type === 'number' ? (
              <InputNumber
                style={{ width: '100%', marginTop: 6 }}
                value={typeof input[key] === 'number' ? input[key] : 0}
                onChange={(value) => setInput((current) => ({ ...current, [key]: value }))}
              />
            ) : field.type === 'boolean' ? (
              <div style={{ marginTop: 8 }}>
                <Switch
                  checked={Boolean(input[key])}
                  onChange={(value) => setInput((current) => ({ ...current, [key]: value }))}
                />
              </div>
            ) : (
              <Input.TextArea
                rows={3}
                style={{ marginTop: 6 }}
                value={String(input[key] ?? '')}
                onChange={(event) => setInput((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))}
              />
            )}
            {field.description ? <Text type="secondary">{field.description}</Text> : null}
          </div>
        ))}
      </Space>
    </Modal>
  );
};

export default memo(DraftRunDialog);
