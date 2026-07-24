/**
 * 功能模块：NodePalette。
 */
import React, { memo, useDeferredValue, useMemo, useState } from 'react';
import { Button, Input, Tooltip, Typography } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import {
  AGENT_NODE_CATALOG,
  type AgentNodeGroup,
  type AgentNodeKind,
} from './node-catalog';

const { Text } = Typography;

const GROUP_LABELS: Record<AgentNodeGroup, string> = {
  flow: '输入与输出',
  control: '流程控制',
  knowledge: '知识获取',
  transform: '数据转换',
  ai: 'AI 处理',
};

interface NodePaletteProps {
  onAdd: (kind: AgentNodeKind) => void;
  insertMode?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * NodePalette 组件。
 */
const NodePalette: React.FC<NodePaletteProps> = ({
  onAdd,
  insertMode,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [keyword, setKeyword] = useState('');
  const deferredKeyword = useDeferredValue(keyword.trim().toLowerCase());
  const groups = useMemo(() => {
    const filtered = AGENT_NODE_CATALOG.filter((item) =>
      !deferredKeyword
      || `${item.title} ${item.subtitle} ${item.hint}`.toLowerCase().includes(deferredKeyword));
    return Object.entries(GROUP_LABELS).map(([group, label]) => ({
      group: group as AgentNodeGroup,
      label,
      items: filtered.filter((item) => item.group === group),
    })).filter((item) => item.items.length > 0);
  }, [deferredKeyword]);

  return (
    <aside className="wf-editor__palette" data-collapsed={collapsed}>
      <div className="wf-palette-header">
        <div className="wf-editor__section-title">节点库</div>
        {onToggleCollapse ? (
          <Tooltip title={collapsed ? '展开节点库' : '收起节点库'} placement="right">
            <Button
              type="text"
              size="small"
              className="wf-palette-toggle"
              icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
              aria-label={collapsed ? '展开节点库' : '收起节点库'}
              aria-expanded={!collapsed}
              onClick={onToggleCollapse}
            />
          </Tooltip>
        ) : null}
      </div>
      <div className="wf-palette-collapsed-label" aria-hidden={!collapsed}>节点库</div>
      <div className="wf-palette-content">
        {insertMode ? (
          <div className="wf-palette-insert-hint">选择节点后插入当前连线</div>
        ) : (
          <Text className="wf-editor__hint">拖到画布，或点击添加到流程末尾</Text>
        )}
        <Input
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="搜索节点"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="wf-palette-search"
        />
        <div className="wf-palette-groups">
          {groups.map((group) => (
            <div key={group.group} className="wf-palette-group">
              <div className="wf-palette-group__title">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  draggable
                  className="wf-palette-item"
                  style={{ ['--wf-accent' as string]: item.accent }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('application/agent-node', item.kind);
                  }}
                  onClick={() => onAdd(item.kind)}
                >
                  <span className="wf-palette-item__mark" />
                  <span className="wf-palette-item__content">
                    <span className="wf-palette-item__title">{item.title}</span>
                    <span className="wf-palette-item__desc">{item.hint}</span>
                  </span>
                  <span className="wf-palette-item__sub">{item.subtitle}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default memo(NodePalette);
