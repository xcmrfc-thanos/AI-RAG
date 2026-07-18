export interface RunStepState {
  nodeId: string;
  status: string;
  durationMs?: number | null;
  errorMessage?: string | null;
}

const TERMINAL_RUN_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED']);

export function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUSES.has(status);
}

export function mapRunStepsToNodeState<T extends RunStepState>(steps: T[]): Map<string, T> {
  const states = new Map<string, T>();
  for (const step of steps) states.set(step.nodeId, step);
  return states;
}

export function decorateNodesWithRunState<T extends { id: string; data: Record<string, unknown> }>(
  nodes: T[],
  steps: RunStepState[],
): T[] {
  if (steps.length === 0) return nodes;
  const states = mapRunStepsToNodeState(steps);
  return nodes.map((node) => {
    const state = states.get(node.id);
    return state ? {
      ...node,
      data: {
        ...node.data,
        runStatus: state.status,
        durationMs: state.durationMs,
        runError: state.errorMessage,
      },
    } : node;
  });
}

export function parseSnapshot(snapshot?: string | null): string {
  if (!snapshot) return '';
  try {
    return JSON.stringify(JSON.parse(snapshot), null, 2);
  } catch {
    return snapshot;
  }
}
