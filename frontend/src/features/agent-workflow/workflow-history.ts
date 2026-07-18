/** 有界撤销/重做历史 */
export interface WorkflowHistory<T> {
  push: (snapshot: T) => void;
  undo: () => T;
  redo: () => T;
  current: () => T;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export function createWorkflowHistory<T>(initial: T, maxEntries = 50): WorkflowHistory<T> {
  const limit = Math.max(1, maxEntries);
  let snapshots: T[] = [initial];
  let index = 0;

  return {
    push(snapshot) {
      snapshots = snapshots.slice(0, index + 1);
      snapshots.push(snapshot);
      if (snapshots.length > limit) {
        snapshots = snapshots.slice(snapshots.length - limit);
      }
      index = snapshots.length - 1;
    },
    undo() {
      index = Math.max(0, index - 1);
      return snapshots[index];
    },
    redo() {
      index = Math.min(snapshots.length - 1, index + 1);
      return snapshots[index];
    },
    current: () => snapshots[index],
    canUndo: () => index > 0,
    canRedo: () => index < snapshots.length - 1,
  };
}
