import React, { memo } from 'react';
import { Button, Space, Tooltip } from 'antd';
import {
  AimOutlined,
  CopyOutlined,
  DeleteOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons';

interface WorkflowToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onLayout: () => void;
  onFit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = (props) => (
  <div className="wf-editor__toolbar">
    <span className="wf-editor__toolbar-pill">右侧输出 → 左侧输入 · 单链执行</span>
    <Space.Compact>
      <Tooltip title="撤销">
        <Button size="small" icon={<UndoOutlined />} disabled={!props.canUndo} onClick={props.onUndo} />
      </Tooltip>
      <Tooltip title="重做">
        <Button size="small" icon={<RedoOutlined />} disabled={!props.canRedo} onClick={props.onRedo} />
      </Tooltip>
      <Button size="small" onClick={props.onLayout}>自动布局</Button>
      <Tooltip title="适应画布">
        <Button size="small" icon={<AimOutlined />} onClick={props.onFit} />
      </Tooltip>
      <Tooltip title="复制节点">
        <Button
          size="small"
          icon={<CopyOutlined />}
          disabled={!props.hasSelection}
          onClick={props.onDuplicate}
        />
      </Tooltip>
      <Tooltip title="删除并重连">
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={!props.hasSelection}
          onClick={props.onDelete}
        />
      </Tooltip>
    </Space.Compact>
  </div>
);

export default memo(WorkflowToolbar);
