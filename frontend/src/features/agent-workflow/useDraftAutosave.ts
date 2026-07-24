/**
 * 功能模块：useDraftAutosave。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { createRevisionGate } from './draft-autosave';

export type DraftSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'failed';

/**
 * useDraftAutosave 方法。
 */
export function useDraftAutosave(workflowId: number | null, initialValue: string) {
  const [draftJson, setDraftJson] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialValue);
  const revisionRef = useRef(createRevisionGate());

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const saveRevision = useCallback(async (json: string, revision: number) => {
    if (!workflowId) return false;
    setSaveStatus('saving');
    try {
      await agentService.updateDraft(workflowId, json);
      if (revisionRef.current.acknowledge(revision)) {
        lastSavedRef.current = json;
        setSaveStatus('saved');
      }
      return true;
    } catch {
      if (revisionRef.current.acknowledge(revision)) setSaveStatus('failed');
      return false;
    }
  }, [workflowId]);

  const updateDraft = useCallback((json: string) => {
    setDraftJson(json);
    if (!workflowId || json === lastSavedRef.current) return;
    const revision = revisionRef.current.next();
    setSaveStatus('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void saveRevision(json, revision); }, 600);
  }, [saveRevision, workflowId]);

  const loadDraft = useCallback((json: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lastSavedRef.current = json;
    revisionRef.current = createRevisionGate();
    setDraftJson(json);
    setSaveStatus(workflowId ? 'saved' : 'idle');
  }, [workflowId]);

  const saveNow = useCallback(async () => {
    if (!workflowId) return false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const revision = revisionRef.current.next();
    return saveRevision(draftJson, revision);
  }, [draftJson, saveRevision, workflowId]);

  return { draftJson, saveStatus, updateDraft, loadDraft, saveNow };
}
