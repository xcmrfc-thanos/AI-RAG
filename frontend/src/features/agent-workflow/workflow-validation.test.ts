import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { FlowNodeData } from './types';
import { validateFlow } from './workflow-validation';

const node = (
  id: string,
  kind: 'start' | 'end' | 'llm' | 'condition' = 'llm',
): Node<FlowNodeData> => ({
  id,
  type: 'agentNode',
  position: { x: 0, y: 0 },
  data:
    kind === 'start' || kind === 'end'
      ? { label: kind, schemaType: 'virtual', kind, input: {} }
      : kind === 'condition'
        ? { label: id, schemaType: 'condition', kind: 'condition', input: { expression: 'true' } }
        : { label: id, schemaType: 'llm', kind: 'llm', input: { prompt: 'p' } },
});

const edge = (source: string, target: string, when?: 'true' | 'false'): Edge => ({
  id: `${source}-${target}-${when || 'n'}`,
  source,
  target,
  ...(when ? { sourceHandle: when, label: when, data: { when } } : {}),
});

describe('workflow-validation', () => {
  it('accepts one connected linear chain', () => {
    const result = validateFlow(
      [node('start', 'start'), node('search'), node('answer'), node('end', 'end')],
      [edge('start', 'search'), edge('search', 'answer'), edge('answer', 'end')],
    );
    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('accepts condition true/false branches that join', () => {
    const result = validateFlow(
      [
        node('start', 'start'),
        node('gate', 'condition'),
        node('yes'),
        node('no'),
        node('join'),
        node('end', 'end'),
      ],
      [
        edge('start', 'gate'),
        edge('gate', 'yes', 'true'),
        edge('gate', 'no', 'false'),
        edge('yes', 'join'),
        edge('no', 'join'),
        edge('join', 'end'),
      ],
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects self loops and non-condition branches with explicit messages', () => {
    const result = validateFlow(
      [node('start', 'start'), node('a'), node('b'), node('end', 'end')],
      [edge('start', 'a'), edge('a', 'a'), edge('a', 'b'), edge('a', 'end')],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/自环/);
    expect(result.errors.join(' ')).toMatch(/多个后继/);
  });

  it('rejects condition without true/false labels', () => {
    const result = validateFlow(
      [node('start', 'start'), node('gate', 'condition'), node('a'), node('b'), node('end', 'end')],
      [edge('start', 'gate'), edge('gate', 'a'), edge('gate', 'b'), edge('a', 'end')],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/true\/false/);
  });

  it('rejects disconnected nodes and invalid start/end direction', () => {
    const result = validateFlow(
      [node('start', 'start'), node('a'), node('orphan'), node('end', 'end')],
      [edge('a', 'start'), edge('end', 'a')],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/开始节点/);
    expect(result.errors.join(' ')).toMatch(/结束节点/);
    expect(result.errors.join(' ')).toMatch(/孤立|不连通/);
  });
});
