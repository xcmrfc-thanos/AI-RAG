import { describe, expect, it } from 'vitest';
import {
  decorateNodesWithRunState,
  isTerminalRunStatus,
  mapRunStepsToNodeState,
  parseSnapshot,
} from './run-debug';

describe('run-debug', () => {
  it('maps latest step state by node id', () => {
    const states = mapRunStepsToNodeState([
      { nodeId: 'search', status: 'RUNNING', durationMs: 10 },
      { nodeId: 'search', status: 'SUCCEEDED', durationMs: 25 },
      { nodeId: 'answer', status: 'FAILED', errorMessage: '模型超时' },
    ]);
    expect(states.get('search')).toMatchObject({ status: 'SUCCEEDED', durationMs: 25 });
    expect(states.get('answer')).toMatchObject({ status: 'FAILED', errorMessage: '模型超时' });
  });

  it('pretty prints JSON snapshots and preserves plain text', () => {
    expect(parseSnapshot('{"ok":true}')).toBe('{\n  "ok": true\n}');
    expect(parseSnapshot('plain')).toBe('plain');
    expect(parseSnapshot(null)).toBe('');
  });

  it('stops polling only for terminal run states', () => {
    expect(isTerminalRunStatus('CREATED')).toBe(false);
    expect(isTerminalRunStatus('RUNNING')).toBe(false);
    expect(isTerminalRunStatus('SUCCEEDED')).toBe(true);
    expect(isTerminalRunStatus('FAILED')).toBe(true);
    expect(isTerminalRunStatus('TIMED_OUT')).toBe(true);
    expect(isTerminalRunStatus('CANCELLED')).toBe(true);
  });

  it('keeps the controlled node array stable when there is no run state', () => {
    const nodes = [{ id: 'answer', data: { label: '回答' } }];
    expect(decorateNodesWithRunState(nodes, [])).toBe(nodes);
  });
});
