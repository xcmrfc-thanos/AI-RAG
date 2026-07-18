import { useCallback, useEffect, useState } from 'react';
import {
  agentService,
  type AgentRunStepView,
  type AgentRunView,
} from '@/services/agent.service';
import { isTerminalRunStatus } from './run-debug';

export function useDraftRunDebug() {
  const [run, setRun] = useState<AgentRunView | null>(null);
  const [steps, setSteps] = useState<AgentRunStepView[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const showRun = useCallback((nextRun: AgentRunView, nextSteps: AgentRunStepView[]) => {
    setRun(nextRun);
    setSteps(nextSteps);
    setSelectedNodeId(selectFocusedNode(nextSteps));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!run || isTerminalRunStatus(run.status)) return undefined;
    let disposed = false;
    let timerId: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const [nextRun, nextSteps] = await Promise.all([
          agentService.getRun(run.id),
          agentService.listSteps(run.id),
        ]);
        if (disposed) return;
        setRun(nextRun);
        setSteps(nextSteps);
        setSelectedNodeId((current) => current || selectFocusedNode(nextSteps));
      } catch {
        if (!disposed) timerId = setTimeout(() => { void poll(); }, 1600);
      }
    };
    timerId = setTimeout(() => { void poll(); }, 800);
    return () => {
      disposed = true;
      clearTimeout(timerId);
    };
  }, [run]);

  const cancel = useCallback(async () => {
    if (!run) return;
    setRun(await agentService.cancelRun(run.id));
  }, [run]);

  return {
    run,
    steps,
    selectedNodeId,
    open,
    showRun,
    setSelectedNodeId,
    close: () => setOpen(false),
    cancel,
  };
}

function selectFocusedNode(steps: AgentRunStepView[]): string | null {
  return steps.find((step) => step.status === 'FAILED')?.nodeId
    || steps.at(-1)?.nodeId
    || null;
}
