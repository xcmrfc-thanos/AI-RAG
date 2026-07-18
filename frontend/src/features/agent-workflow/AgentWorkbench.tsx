import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { Alert } from 'antd';
import { createWorkflowHistory, type WorkflowHistory } from './workflow-history';
import {
  cloneFlowSnapshot,
  createFlowNode,
  isAllowedLinearConnection,
  layoutLinearFlow,
  selectOnlyFlowEdge,
  selectOnlyFlowNode,
  type FlowSnapshot,
} from './workflow-editor-operations';
import { validateFlow } from './workflow-validation';
import { decorateNodesWithRunState, type RunStepState } from './run-debug';
import {
  flowToWorkflow,
  nextNodeId,
  parseWorkflowJson,
  serializeWorkflow,
  workflowToFlow,
} from './schema-flow-mapper';
import type { AgentNodeKind } from './node-catalog';
import type { FlowNodeData, WorkflowDefinitionV1 } from './types';
import NodeInspector from './NodeInspector';
import NodePalette from './NodePalette';
import WorkflowEdge from './WorkflowEdge';
import WorkflowEmptyState from './WorkflowEmptyState';
import WorkflowNode from './WorkflowNode';
import WorkflowToolbar from './WorkflowToolbar';
import WorkflowContextMenu from './WorkflowContextMenu';
import { useWorkflowCanvasInteractions } from './useWorkflowCanvasInteractions';
import type { WorkflowTemplateKey } from './workflow-templates';

interface AgentWorkbenchProps {
  value: string;
  onChange: (json: string) => void;
  name: string;
  runSteps?: RunStepState[];
  focusedNodeId?: string | null;
  onApplyTemplate?: (key: WorkflowTemplateKey) => void;
}

const nodeTypes = { agentNode: WorkflowNode };
const edgeTypes = { insertable: WorkflowEdge };

const AgentWorkbench: React.FC<AgentWorkbenchProps> = ({
  value,
  onChange,
  name,
  runSteps = [],
  focusedNodeId,
  onApplyTemplate,
}) => {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const historyRef = useRef<WorkflowHistory<FlowSnapshot> | null>(null);
  const baseDefinitionRef = useRef<WorkflowDefinitionV1 | null>(null);
  const applyingRef = useRef(false);
  const readyRef = useRef(false);
  const lastOutputRef = useRef(value);
  const canvasWrapRef = useRef<HTMLElement | null>(null);

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: Boolean(historyRef.current?.canUndo()),
      canRedo: Boolean(historyRef.current?.canRedo()),
    });
  }, []);

  useEffect(() => {
    if (readyRef.current && value === lastOutputRef.current) return;
    try {
      const definition = parseWorkflowJson(value);
      const flow = workflowToFlow(definition);
      applyingRef.current = true;
      const frameId = requestAnimationFrame(() => {
        setNodes(flow.nodes);
        setEdges(flow.edges);
        baseDefinitionRef.current = definition;
        historyRef.current = createWorkflowHistory(cloneFlowSnapshot(flow.nodes, flow.edges), 50);
        setHistoryState({ canUndo: false, canRedo: false });
        setMessage(null);
        readyRef.current = true;
        lastOutputRef.current = value;
        applyingRef.current = false;
        void fitView({ padding: 0.2, duration: 180 });
      });
      return () => cancelAnimationFrame(frameId);
    } catch (error) {
      const frameId = requestAnimationFrame(() => {
        setMessage(error instanceof Error ? error.message : '工作流 JSON 解析失败');
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [fitView, value]);

  useEffect(() => {
    if (!readyRef.current || applyingRef.current) return;
    const definition = flowToWorkflow(
      name,
      nodes,
      edges,
      baseDefinitionRef.current || undefined,
    );
    const json = serializeWorkflow(definition);
    if (json !== lastOutputRef.current) {
      lastOutputRef.current = json;
      baseDefinitionRef.current = definition;
      onChange(json);
    }
  }, [edges, name, nodes, onChange]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 180 });
    }, 200);
    return () => window.clearTimeout(timerId);
  }, [fitView, paletteCollapsed]);

  const commit = useCallback((nextNodes: Node<FlowNodeData>[], nextEdges: Edge[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
    historyRef.current?.push(cloneFlowSnapshot(nextNodes, nextEdges));
    syncHistoryState();
  }, [syncHistoryState]);

  const interactions = useWorkflowCanvasInteractions({
    nodes,
    edges,
    canvasWrapRef,
    screenToFlowPosition,
    commit,
    fitCanvas: () => { void fitView({ padding: 0.2, duration: 180 }); },
  });
  const {
    selectedId, setSelectedId, setSelectedEdgeId, selectedNode, contextMenuProps, renderedEdges,
    duplicateSelected, deleteSelected, closeOverlays, openContextMenu, rememberPointer,
  } = interactions;
  const displayNodes = useMemo(
    () => decorateNodesWithRunState(nodes, runSteps),
    [nodes, runSteps],
  );
  const validation = useMemo(() => validateFlow(nodes, edges), [nodes, edges]);

  useEffect(() => {
    if (!focusedNodeId) return undefined;
    const frameId = requestAnimationFrame(() => setSelectedId(focusedNodeId));
    return () => cancelAnimationFrame(frameId);
  }, [focusedNodeId, setSelectedId]);

  const addKind = useCallback((kind: AgentNodeKind, position?: { x: number; y: number }) => {
    if ((kind === 'start' || kind === 'end') && nodes.some((node) => node.data.kind === kind)) {
      setMessage(`${kind === 'start' ? '开始' : '结束'}节点只能有一个`);
      return;
    }
    const prefix = kind === 'llm' || kind === 'condition' || kind === 'start' || kind === 'end'
      ? kind
      : 'tool';
    const id = nextNodeId(prefix, nodes.map((node) => node.id));
    const nextNode = createFlowNode(kind, id, position || { x: 80, y: 160 });
    commit([...nodes, nextNode], edges);
    setSelectedId(id);
    setMessage(null);
  }, [commit, edges, nodes, setSelectedId]);

  const onConnect = useCallback((connection: Connection) => {
    if (!isAllowedLinearConnection(connection, nodes, edges)) {
      setMessage('连线不合法：普通节点单出边；条件节点 true/false 各一条；可汇合');
      return;
    }
    const when = connection.sourceHandle === 'true' || connection.sourceHandle === 'false'
      ? connection.sourceHandle
      : undefined;
    const nextEdges = addEdge({
      ...connection,
      id: `e-${connection.source}-${connection.target}-${when || 'next'}`,
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 1.6 },
      ...(when ? { label: when, data: { when } } : {}),
    }, edges);
    commit(nodes, nextEdges);
    setMessage(null);
  }, [commit, edges, nodes]);

  const restoreHistory = useCallback((snapshot: FlowSnapshot) => {
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    syncHistoryState();
  }, [syncHistoryState]);

  const onSelectionChange = useCallback(({
    nodes: selectedNodes,
    edges: selectedEdges,
  }: { nodes: Node<FlowNodeData>[]; edges: Edge[] }) => {
    setSelectedId(selectedNodes[0]?.id || null);
    setSelectedEdgeId(selectedEdges[0]?.id || null);
  }, [setSelectedEdgeId, setSelectedId]);

  return (
    <div className={`wf-workbench${paletteCollapsed ? ' is-palette-collapsed' : ''}`}>
      <NodePalette
        onAdd={addKind}
        insertMode={false}
        collapsed={paletteCollapsed}
        onToggleCollapse={() => setPaletteCollapsed((current) => !current)}
      />
      <main
        ref={canvasWrapRef}
        className="wf-editor__canvas-wrap"
        onPointerMove={(event) => rememberPointer(event.clientX, event.clientY)}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
        onDrop={(event) => {
          event.preventDefault();
          const kind = event.dataTransfer.getData('application/agent-node') as AgentNodeKind;
          if (kind) addKind(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
        }}
      >
        <WorkflowToolbar
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          hasSelection={Boolean(selectedNode)}
          onUndo={() => historyRef.current?.canUndo() && restoreHistory(historyRef.current.undo())}
          onRedo={() => historyRef.current?.canRedo() && restoreHistory(historyRef.current.redo())}
          onLayout={() => commit(layoutLinearFlow(nodes, edges), edges)}
          onFit={() => { void fitView({ padding: 0.2, duration: 180 }); }}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />
        <ReactFlow
          nodes={displayNodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={(changes: NodeChange<Node<FlowNodeData>>[]) =>
            setNodes((current) => applyNodeChanges(changes, current))}
          onEdgesChange={(changes: EdgeChange[]) =>
            setEdges((current) => applyEdgeChanges(changes, current))}
          onNodeDragStop={() => {
            historyRef.current?.push(cloneFlowSnapshot(nodes, edges));
            syncHistoryState();
          }}
          onConnect={onConnect}
          isValidConnection={(connection) => isAllowedLinearConnection(connection, nodes, edges)}
          onSelectionChange={onSelectionChange}
          onNodeContextMenu={(event, node) => {
            setNodes((current) => selectOnlyFlowNode(current, node.id));
            setSelectedId(node.id);
            setSelectedEdgeId(null);
            openContextMenu(event, {
              kind: 'node',
              targetId: node.id,
              mutable: node.data.schemaType !== 'virtual',
            });
          }}
          onEdgeContextMenu={(event, edge) => {
            setEdges((current) => selectOnlyFlowEdge(current, edge.id));
            setSelectedId(null);
            setSelectedEdgeId(edge.id);
            openContextMenu(event, { kind: 'edge', targetId: edge.id });
          }}
          onPaneContextMenu={(event) => openContextMenu(event, { kind: 'pane' })}
          onPaneClick={closeOverlays}
          onMoveStart={closeOverlays}
          fitView
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="wf-minimap" />
        </ReactFlow>
        {contextMenuProps ? <WorkflowContextMenu {...contextMenuProps} /> : null}
        {message ? <Alert className="wf-canvas-alert" type="warning" showIcon message={message} /> : null}
        {!validation.valid && !message ? (
          <Alert className="wf-canvas-alert" type="info" message={validation.errors[0]} />
        ) : null}
        {nodes.every((node) => node.data.schemaType === 'virtual') && onApplyTemplate ? (
          <WorkflowEmptyState onApply={onApplyTemplate} />
        ) : null}
      </main>
      <NodeInspector
        node={selectedNode}
        nodes={nodes}
        edges={edges}
        onChange={(nodeId, data) => {
          const nextNodes = nodes.map((node) => node.id === nodeId ? { ...node, data } : node);
          commit(nextNodes, edges);
        }}
      />
    </div>
  );
};

export default AgentWorkbench;
