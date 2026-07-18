import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { FlowNodeData } from './types';
import {
  copyFlowNode,
  createFlowNode,
  deleteNodeAndReconnect,
  disconnectEdge,
  getUpstreamVariableOptions,
  insertNodeOnEdge,
  layoutLinearFlow,
  pasteFlowNode,
  positionBetweenConnectedNodes,
  selectOnlyFlowNode,
  selectOnlyFlowEdge,
} from './workflow-editor-operations';

const edge = (id: string, source: string, target: string): Edge => ({ id, source, target });

describe('workflow-editor-operations', () => {
  it('creates catalog-backed nodes with valid defaults', () => {
    const node = createFlowNode('list_documents', 'tool1', { x: 10, y: 20 });
    expect(node).toMatchObject({
      id: 'tool1',
      position: { x: 10, y: 20 },
      data: { schemaType: 'tool', tool: 'list_documents', kind: 'list_documents' },
    });
    expect(node.data.input).toMatchObject({ size: 10 });
  });

  it('inserts a node by replacing one edge with two edges', () => {
    const nodes = [createFlowNode('start', 'start', { x: 0, y: 0 }),
      createFlowNode('end', 'end', { x: 500, y: 0 })];
    const inserted = createFlowNode('llm', 'llm1', { x: 250, y: 0 });
    const result = insertNodeOnEdge(nodes, [edge('e1', 'start', 'end')], 'e1', inserted);
    expect(result.nodes.map((item) => item.id)).toEqual(['start', 'end', 'llm1']);
    expect(result.edges.map((item) => [item.source, item.target])).toEqual([
      ['start', 'llm1'],
      ['llm1', 'end'],
    ]);
  });

  it('deletes a middle node and reconnects its neighbors', () => {
    const nodes = ['start', 'a', 'end'].map((id) =>
      createFlowNode(id === 'start' || id === 'end' ? id : 'llm', id, { x: 0, y: 0 }));
    const result = deleteNodeAndReconnect(nodes, [
      edge('e1', 'start', 'a'), edge('e2', 'a', 'end'),
    ], 'a');
    expect(result.nodes.map((item) => item.id)).toEqual(['start', 'end']);
    expect(result.edges.map((item) => [item.source, item.target])).toEqual([['start', 'end']]);
  });

  it('disconnects only the requested edge', () => {
    const edges = [edge('e1', 'start', 'a'), edge('e2', 'a', 'end')];
    expect(disconnectEdge(edges, 'e1').map((item) => item.id)).toEqual(['e2']);
    expect(disconnectEdge(edges, 'missing')).toBe(edges);
  });

  it('copies real node data without sharing nested input', () => {
    const original = createFlowNode('llm', 'answer', { x: 120, y: 80 });
    original.data.input = { prompt: 'answer', options: { temperature: 0.2 } };
    const copied = copyFlowNode(original);

    expect(copied).not.toBeNull();
    (copied!.input.options as { temperature: number }).temperature = 0.8;
    expect((original.data.input.options as { temperature: number }).temperature).toBe(0.2);
    expect(copyFlowNode(createFlowNode('start', 'start', { x: 0, y: 0 }))).toBeNull();
  });

  it('pastes a copied node with a new id and requested position', () => {
    const original = createFlowNode('llm', 'answer', { x: 120, y: 80 });
    const copied = copyFlowNode(original)!;
    const pasted = pasteFlowNode(copied, 'llm2', { x: 320, y: 180 });

    expect(pasted).toMatchObject({
      id: 'llm2',
      type: 'agentNode',
      position: { x: 320, y: 180 },
      data: { schemaType: 'llm', kind: 'llm' },
    });
    expect(pasted.data.input).not.toBe(copied.input);
  });

  it('positions an inserted node midway between connected nodes', () => {
    const nodes = [
      createFlowNode('start', 'start', { x: 40, y: 100 }),
      createFlowNode('end', 'end', { x: 560, y: 220 }),
    ];
    expect(positionBetweenConnectedNodes(nodes, edge('e1', 'start', 'end')))
      .toEqual({ x: 300, y: 160 });
  });

  it('selects a right-clicked node exactly once in the controlled node source', () => {
    const nodes = [
      { ...createFlowNode('llm', 'a', { x: 0, y: 0 }), selected: true },
      createFlowNode('llm', 'b', { x: 200, y: 0 }),
    ];
    const selected = selectOnlyFlowNode(nodes, 'b');
    expect(selected.map((node) => [node.id, node.selected])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(selectOnlyFlowNode(selected, 'b')).toBe(selected);

    const flowEdges = [edge('e1', 'a', 'b'), { ...edge('e2', 'b', 'c'), selected: true }];
    const selectedEdges = selectOnlyFlowEdge(flowEdges, 'e1');
    expect(selectedEdges.map((item) => [item.id, item.selected])).toEqual([
      ['e1', true],
      ['e2', false],
    ]);
    expect(selectOnlyFlowEdge(selectedEdges, 'e1')).toBe(selectedEdges);
  });

  it('lays out a linear chain and exposes only upstream variables', () => {
    const nodes: Node<FlowNodeData>[] = [
      createFlowNode('start', 'start', { x: 0, y: 0 }),
      createFlowNode('hybrid_search', 'search', { x: 0, y: 0 }),
      createFlowNode('llm', 'answer', { x: 0, y: 0 }),
      createFlowNode('end', 'end', { x: 0, y: 0 }),
    ];
    const edges = [edge('e1', 'start', 'search'), edge('e2', 'search', 'answer'),
      edge('e3', 'answer', 'end')];
    const laidOut = layoutLinearFlow(nodes, edges);
    expect(laidOut.map((item) => item.position.x)).toEqual([40, 300, 560, 820]);

    const options = getUpstreamVariableOptions('answer', nodes, edges);
    expect(options.map((item) => item.value)).toContain('${steps.search.output.hits}');
    expect(options.map((item) => item.value)).not.toContain('${steps.answer.output.text}');
  });
});
