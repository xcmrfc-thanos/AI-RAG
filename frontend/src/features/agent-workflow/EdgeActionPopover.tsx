import React, { useMemo, useState } from 'react';
import { DisconnectOutlined, SearchOutlined } from '@ant-design/icons';
import { AGENT_NODE_CATALOG, type AgentNodeKind } from './node-catalog';

interface EdgeActionPopoverProps {
  onInsert: (kind: AgentNodeKind) => void;
  onDisconnect: () => void;
}

const EdgeActionPopover: React.FC<EdgeActionPopoverProps> = ({ onInsert, onDisconnect }) => {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return AGENT_NODE_CATALOG.filter((item) => !item.virtual).filter((item) => {
      if (!keyword) return true;
      return `${item.title} ${item.subtitle} ${item.hint}`.toLowerCase().includes(keyword);
    });
  }, [query]);

  return (
    <div
      className="wf-edge-actions nodrag nopan"
      role="dialog"
      aria-label="在连接中插入节点"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="wf-edge-actions__heading">插入节点</div>
      <label className="wf-edge-actions__search">
        <SearchOutlined />
        <input
          autoFocus
          value={query}
          placeholder="搜索节点或功能"
          aria-label="搜索节点"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="wf-edge-actions__list">
        {options.map((item) => (
          <button key={item.kind} type="button" onClick={() => onInsert(item.kind)}>
            <span className="wf-edge-actions__mark" style={{ background: item.accent }} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.hint}</small>
            </span>
          </button>
        ))}
        {options.length === 0 ? <div className="wf-edge-actions__empty">没有匹配的节点</div> : null}
      </div>
      <button type="button" className="wf-edge-actions__disconnect" onClick={onDisconnect}>
        <DisconnectOutlined />
        断开此连接
      </button>
    </div>
  );
};

export default EdgeActionPopover;
