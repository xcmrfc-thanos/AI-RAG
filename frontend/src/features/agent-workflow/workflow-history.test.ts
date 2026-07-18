import { describe, expect, it } from 'vitest';
import { createWorkflowHistory } from './workflow-history';

describe('workflow-history', () => {
  it('supports undo redo and truncates redo after a new edit', () => {
    const history = createWorkflowHistory<number>(0, 50);
    history.push(1);
    history.push(2);
    expect(history.undo()).toBe(1);
    expect(history.canRedo()).toBe(true);
    history.push(3);
    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toBe(1);
    expect(history.redo()).toBe(3);
  });

  it('keeps only the configured maximum number of snapshots', () => {
    const history = createWorkflowHistory<number>(0, 3);
    history.push(1);
    history.push(2);
    history.push(3);
    history.push(4);
    expect(history.undo()).toBe(3);
    expect(history.undo()).toBe(2);
    expect(history.undo()).toBe(2);
  });
});
