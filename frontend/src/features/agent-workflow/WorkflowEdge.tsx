import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import EdgeActionPopover from './EdgeActionPopover';
import type { AgentNodeKind } from './node-catalog';

interface WorkflowEdgeData extends Record<string, unknown> {
  when?: 'true' | 'false';
  onToggleActions?: (edgeId: string) => void;
  onInsert?: (edgeId: string, kind: AgentNodeKind) => void;
  onDisconnect?: (edgeId: string) => void;
  actionsOpen?: boolean;
}

const WorkflowEdge: React.FC<EdgeProps> = (props) => {
  const [path, labelX, labelY] = getBezierPath(props);
  const data = props.data as WorkflowEdgeData | undefined;
  const whenLabel = data?.when
    || (props.label === 'true' || props.label === 'false' ? props.label : undefined);
  return (
    <>
      <BaseEdge path={path} markerEnd={props.markerEnd} style={props.style} />
      <EdgeLabelRenderer>
        <div
          className="wf-edge-action-anchor nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {whenLabel ? <span className="wf-edge-when">{whenLabel}</span> : null}
          <button
            type="button"
            className={`wf-edge-insert${data?.actionsOpen ? ' is-active' : ''}`}
            title="在此处插入节点"
            aria-label="在此处插入节点"
            aria-expanded={data?.actionsOpen}
            onClick={(event) => {
              event.stopPropagation();
              data?.onToggleActions?.(props.id);
            }}
          >
            +
          </button>
          {data?.actionsOpen ? (
            <EdgeActionPopover
              onInsert={(kind) => data.onInsert?.(props.id, kind)}
              onDisconnect={() => data.onDisconnect?.(props.id)}
            />
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(WorkflowEdge);
