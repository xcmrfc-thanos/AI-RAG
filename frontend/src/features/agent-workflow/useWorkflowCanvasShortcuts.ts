import { useEffect } from 'react';

interface WorkflowCanvasShortcutActions {
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEscape: () => void;
}

export function useWorkflowCanvasShortcuts(actions: WorkflowCanvasShortcutActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      let action: (() => void) | undefined;
      if (command && key === 'c') action = actions.onCopy;
      if (command && key === 'v') action = actions.onPaste;
      if (command && key === 'd') action = actions.onDuplicate;
      if (!command && (key === 'delete' || key === 'backspace')) action = actions.onDelete;
      if (!command && key === 'escape') action = actions.onEscape;
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
