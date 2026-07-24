/**
 * 功能模块：WorkflowContextMenu。
 */
import React from 'react';
import {
  AimOutlined,
  ApartmentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';

export type WorkflowContextMenuKind = 'node' | 'edge' | 'pane';

export interface WorkflowContextMenuState {
  kind: WorkflowContextMenuKind;
  x: number;
  y: number;
  targetId?: string;
  mutable?: boolean;
}

export interface WorkflowContextMenuProps extends WorkflowContextMenuState {
  canPaste: boolean;
  onConfigure: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsert: () => void;
  onDisconnect: () => void;
  onPaste: () => void;
  onLayout: () => void;
  onFit: () => void;
}

/**
 * WorkflowContextMenu 组件。
 */
const WorkflowContextMenu: React.FC<WorkflowContextMenuProps> = (props) => (
  <div
    className="wf-context-menu nodrag nopan"
    style={{ left: props.x, top: props.y }}
    role="menu"
    aria-label={menuLabel(props.kind)}
    onPointerDown={(event) => event.stopPropagation()}
    onContextMenu={(event) => event.preventDefault()}
  >
    {props.kind === 'node' ? (
      <>
        <MenuItem icon={<EditOutlined />} label="配置节点" shortcut="Enter" onClick={props.onConfigure} />
        {props.mutable ? (
          <>
            <MenuItem icon={<CopyOutlined />} label="复制" shortcut="Ctrl C" onClick={props.onCopy} />
            <MenuItem icon={<PlusOutlined />} label="创建副本" shortcut="Ctrl D" onClick={props.onDuplicate} />
            <MenuDivider />
            <MenuItem danger icon={<DeleteOutlined />} label="删除节点" shortcut="Del" onClick={props.onDelete} />
          </>
        ) : null}
      </>
    ) : null}
    {props.kind === 'edge' ? (
      <>
        <MenuItem icon={<PlusOutlined />} label="插入节点" onClick={props.onInsert} />
        <MenuDivider />
        <MenuItem danger icon={<DisconnectOutlined />} label="断开连接" shortcut="Del" onClick={props.onDisconnect} />
      </>
    ) : null}
    {props.kind === 'pane' ? (
      <>
        <MenuItem disabled={!props.canPaste} icon={<CopyOutlined />} label="粘贴节点" shortcut="Ctrl V" onClick={props.onPaste} />
        <MenuDivider />
        <MenuItem icon={<ApartmentOutlined />} label="自动布局" onClick={props.onLayout} />
        <MenuItem icon={<AimOutlined />} label="适应画布" onClick={props.onFit} />
      </>
    ) : null}
  </div>
);

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * MenuItem 组件。
 */
const MenuItem: React.FC<MenuItemProps> = ({ icon, label, shortcut, danger, disabled, onClick }) => (
  <button
    type="button"
    role="menuitem"
    className={`wf-context-menu__item${danger ? ' is-danger' : ''}`}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="wf-context-menu__icon">{icon}</span>
    <span>{label}</span>
    {shortcut ? <kbd>{shortcut}</kbd> : null}
  </button>
);

const MenuDivider = () => <div className="wf-context-menu__divider" role="separator" />;

/**
 * menuLabel 方法。
 */
function menuLabel(kind: WorkflowContextMenuKind): string {
  if (kind === 'node') return '节点操作';
  if (kind === 'edge') return '连接操作';
  return '画布操作';
}

export default WorkflowContextMenu;
