import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type React from 'react';
import type { Edge, Node, XYPosition } from '@xyflow/react';
import type { AgentNodeKind } from './node-catalog';
import { nextNodeId } from './schema-flow-mapper';
import type { FlowNodeData } from './types';
import {
  copyFlowNode,
  createFlowNode,
  deleteNodeAndReconnect,
  disconnectEdge,
  insertNodeOnEdge,
  pasteFlowNode,
  positionBetweenConnectedNodes,
  layoutLinearFlow,
  type CopiedFlowNode,
} from './workflow-editor-operations';
import type { WorkflowContextMenuProps, WorkflowContextMenuState } from './WorkflowContextMenu';
import { useWorkflowCanvasShortcuts } from './useWorkflowCanvasShortcuts';

interface WorkflowCanvasInteractionsOptions {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  canvasWrapRef: RefObject<HTMLElement | null>;
  screenToFlowPosition: (position: XYPosition) => XYPosition;
  commit: (nodes: Node<FlowNodeData>[], edges: Edge[]) => void;
  fitCanvas: () => void;
}

export function useWorkflowCanvasInteractions({
  nodes,
  edges,
  canvasWrapRef,
  screenToFlowPosition,
  commit,
  fitCanvas,
}: WorkflowCanvasInteractionsOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [openEdgeActionsId, setOpenEdgeActionsId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<WorkflowContextMenuState | null>(null);
  const [clipboard, setClipboard] = useState<CopiedFlowNode | null>(null);
  const lastPointerPositionRef = useRef<XYPosition | null>(null);
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) || null,
    [nodes, selectedId],
  );

  const closeOverlays = useCallback(() => {
    setContextMenu(null);
    setOpenEdgeActionsId(null);
  }, []);

  const copySelected = useCallback(() => {
    if (!selectedNode) return;
    const copied = copyFlowNode(selectedNode);
    if (copied) setClipboard(copied);
  }, [selectedNode]);

  const deleteSelected = useCallback(() => {
    if (!selectedNode || selectedNode.data.schemaType === 'virtual') return;
    const result = deleteNodeAndReconnect(nodes, edges, selectedNode.id);
    commit(result.nodes, result.edges);
    setSelectedId(null);
  }, [commit, edges, nodes, selectedNode]);

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    const copied = copyFlowNode(selectedNode);
    if (!copied) return;
    const id = nextNodeId(
      copied.schemaType === 'tool' ? 'tool' : copied.schemaType,
      nodeIds(nodes),
    );
    const duplicate = pasteFlowNode(copied, id, {
      x: selectedNode.position.x + 36,
      y: selectedNode.position.y + 72,
    });
    commit([...nodes, duplicate], edges);
    setSelectedId(id);
  }, [commit, edges, nodes, selectedNode]);

  const pasteCopied = useCallback((position?: XYPosition) => {
    if (!clipboard) return;
    const id = nextNodeId(
      clipboard.schemaType === 'tool' ? 'tool' : clipboard.schemaType,
      nodeIds(nodes),
    );
    const pasted = pasteFlowNode(
      clipboard,
      id,
      position || lastPointerPositionRef.current || canvasCenter(canvasWrapRef, screenToFlowPosition),
    );
    commit([...nodes, pasted], edges);
    setSelectedId(id);
  }, [canvasWrapRef, clipboard, commit, edges, nodes, screenToFlowPosition]);

  const disconnectSelectedEdge = useCallback((edgeId = selectedEdgeId) => {
    if (!edgeId) return;
    const nextEdges = disconnectEdge(edges, edgeId);
    if (nextEdges === edges) return;
    commit(nodes, nextEdges);
    setSelectedEdgeId(null);
    setOpenEdgeActionsId(null);
  }, [commit, edges, nodes, selectedEdgeId]);

  const insertOnEdge = useCallback((edgeId: string, kind: AgentNodeKind) => {
    const targetEdge = edges.find((edge) => edge.id === edgeId);
    if (!targetEdge) return;
    const prefix = kind === 'llm' || kind === 'condition' ? kind : 'tool';
    const id = nextNodeId(prefix, nodeIds(nodes));
    const inserted = createFlowNode(kind, id, positionBetweenConnectedNodes(nodes, targetEdge));
    const result = insertNodeOnEdge(nodes, edges, edgeId, inserted);
    commit(result.nodes, result.edges);
    setSelectedId(id);
    setSelectedEdgeId(null);
    closeOverlays();
  }, [closeOverlays, commit, edges, nodes]);

  const renderedEdges = useMemo(() => edges.map((edge) => {
    const previousData = (edge.data && typeof edge.data === 'object')
      ? edge.data as Record<string, unknown>
      : {};
    return {
      ...edge,
      type: 'insertable',
      style: selectedEdgeId === edge.id
        ? { ...edge.style, stroke: '#2563eb', strokeWidth: 2.2 }
        : edge.style,
      data: {
        ...previousData,
        onToggleActions: (edgeId: string) => {
          setContextMenu(null);
          setOpenEdgeActionsId((current) => current === edgeId ? null : edgeId);
        },
        onInsert: insertOnEdge,
        onDisconnect: disconnectSelectedEdge,
        actionsOpen: openEdgeActionsId === edge.id,
      },
    };
  }), [disconnectSelectedEdge, edges, insertOnEdge, openEdgeActionsId, selectedEdgeId]);

  useWorkflowCanvasShortcuts(useMemo(() => ({
    onCopy: copySelected,
    onPaste: pasteCopied,
    onDuplicate: duplicateSelected,
    onDelete: selectedId ? deleteSelected : disconnectSelectedEdge,
    onEscape: closeOverlays,
  }), [closeOverlays, copySelected, deleteSelected, disconnectSelectedEdge,
    duplicateSelected, pasteCopied, selectedId]));

  const rememberPointer = useCallback((clientX: number, clientY: number) => {
    lastPointerPositionRef.current = screenToFlowPosition({ x: clientX, y: clientY });
  }, [screenToFlowPosition]);

  const openContextMenu = useCallback((
    event: React.MouseEvent | MouseEvent,
    menu: Omit<WorkflowContextMenuState, 'x' | 'y'>,
  ) => {
    event.preventDefault();
    const bounds = canvasWrapRef.current?.getBoundingClientRect();
    if (!bounds) return;
    rememberPointer(event.clientX, event.clientY);
    setOpenEdgeActionsId(null);
    setContextMenu({
      ...menu,
      x: Math.min(event.clientX - bounds.left, Math.max(8, bounds.width - 220)),
      y: Math.min(event.clientY - bounds.top, Math.max(8, bounds.height - 230)),
    });
  }, [canvasWrapRef, rememberPointer]);

  const contextMenuProps = useMemo<WorkflowContextMenuProps | null>(() => contextMenu ? ({
    ...contextMenu,
    canPaste: Boolean(clipboard),
    onConfigure: closeOverlays,
    onCopy: () => { copySelected(); closeOverlays(); },
    onDuplicate: () => { duplicateSelected(); closeOverlays(); },
    onDelete: () => { deleteSelected(); closeOverlays(); },
    onInsert: () => {
      setOpenEdgeActionsId(contextMenu.targetId || null);
      setContextMenu(null);
    },
    onDisconnect: () => { disconnectSelectedEdge(contextMenu.targetId); closeOverlays(); },
    onPaste: () => { pasteCopied(lastPointerPositionRef.current || undefined); closeOverlays(); },
    onLayout: () => { commit(layoutLinearFlow(nodes, edges), edges); closeOverlays(); },
    onFit: () => { fitCanvas(); closeOverlays(); },
  }) : null, [clipboard, closeOverlays, commit, contextMenu, copySelected, deleteSelected,
    disconnectSelectedEdge, duplicateSelected, edges, fitCanvas, nodes, pasteCopied]);

  return {
    selectedId, setSelectedId, setSelectedEdgeId, selectedNode, contextMenuProps,
    renderedEdges, copySelected, duplicateSelected, deleteSelected, pasteCopied,
    disconnectSelectedEdge, closeOverlays, openContextMenu, rememberPointer,
  };
}

function nodeIds(nodes: Node<FlowNodeData>[]): string[] {
  return nodes.map((node) => node.id);
}

function canvasCenter(
  canvasWrapRef: RefObject<HTMLElement | null>,
  screenToFlowPosition: (position: XYPosition) => XYPosition,
): XYPosition {
  const element = canvasWrapRef.current;
  if (!element) return { x: 80, y: 160 };
  const bounds = element.getBoundingClientRect();
  return screenToFlowPosition({
    x: bounds.left + element.clientWidth / 2,
    y: bounds.top + element.clientHeight / 2,
  });
}
