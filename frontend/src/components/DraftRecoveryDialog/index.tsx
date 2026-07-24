/**
 * DraftRecoveryDialog 模块导出入口。
 */
import React from 'react';
import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { DraftData } from '@/utils/draft-storage';

interface DraftRecoveryDialogProps {
  open: boolean;
  draft: DraftData | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export const DraftRecoveryDialog: React.FC<DraftRecoveryDialogProps> = ({
  open,
  draft,
  onAccept,
  onDismiss,
}) => {
  if (!draft) return null;

  const savedAt = new Date(draft.savedAt).toLocaleString('zh-CN');
  const preview = draft.content
    ? draft.content.substring(0, 100) + (draft.content.length > 100 ? '...' : '')
    : '(无内容)';

  return (
    <Modal
      open={open}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
          发现未保存的草稿
        </span>
      }
      onCancel={onDismiss}
      footer={[
        <Button key="discard" danger onClick={onDismiss}>
          放弃草稿
        </Button>,
        <Button key="recover" type="primary" onClick={onAccept}>
          恢复草稿
        </Button>,
      ]}
      centered
      width={480}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#64748b', marginBottom: 12 }}>
          检测到您有未保存的编辑内容，保存时间：{savedAt}
        </p>
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '12px 16px',
            lineHeight: 1.8,
          }}
        >
          <div>
            <strong>标题：</strong>
            {draft.title || '(未命名)'}
          </div>
          <div>
            <strong>内容预览：</strong>
            {preview}
          </div>
        </div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
        选择"恢复草稿"将继续编辑，选择"放弃草稿"将清除暂存内容。
      </p>
    </Modal>
  );
};
