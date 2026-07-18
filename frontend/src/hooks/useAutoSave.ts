import { useRef, useState, useEffect, useCallback } from 'react';
import { draftStorage, type DraftData } from '@/utils/draft-storage';
import { documentService } from '@/services';
import { EDITOR_CONFIG } from '@/config';
import { AUTO_SAVE } from '@/constants';
import { message } from 'antd';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

export interface AutoSaveFormData {
  title: string;
  content: string;
  summary: string;
  categoryId: string;
  teamId: string;
  tags: string[];
  visibility: string;
  allowComments: boolean;
  allowEdit: boolean;
  aiIndex: boolean;
  saveOption: 'submit_review' | 'draft';
}

interface UseAutoSaveOptions {
  documentId?: string;
  formData: AutoSaveFormData;
  enabled?: boolean;
  interval?: number;
  onDocumentCreated?: (id: string) => void;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  currentDocId: string | undefined;
  hasRecoveryDraft: boolean;
  recoveryDraft: DraftData | null;
  isRecoveryDialogOpen: boolean;
  acceptRecovery: () => DraftData | null;
  dismissRecovery: () => void;
  clearDraft: () => void;
  performSave: () => Promise<void>;
}

export const useAutoSave = ({
  documentId: initialDocId,
  formData,
  enabled = EDITOR_CONFIG.enableAutoSave,
  interval = AUTO_SAVE.INTERVAL,
  onDocumentCreated,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(initialDocId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<DraftData | null>(null);
  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false);

  // Refs to avoid stale closures in timers
  const formDataRef = useRef(formData);
  const currentDocIdRef = useRef(currentDocId);
  const isSavingRef = useRef(false);
  const hasChangesRef = useRef(false);
  const saveToBackendRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    currentDocIdRef.current = currentDocId;
  }, [currentDocId]);

  // Draft Recovery on Mount
  useEffect(() => {
    if (!enabled) return;
    // 1) exact match by documentId
    let draft = draftStorage.load(initialDocId);
    // 2) if creating a new doc, also scan localStorage for orphaned drafts (migrated by previous sessions)
    if (!draft && !initialDocId) {
      draft = draftStorage.findLatest();
    }
    if (draft) {
      setRecoveryDraft(draft);
      setIsRecoveryDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to backend
  const saveToBackend = useCallback(async (): Promise<void> => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      const data = formDataRef.current;
      const payload = {
        id: currentDocIdRef.current || undefined,
        title: data.title || undefined,
        content: data.content,
        summary: data.summary,
        categoryId: data.categoryId || undefined,
        teamId: data.teamId || undefined,
        tags: data.tags.length > 0 ? data.tags.join(',') : undefined,
      };

      // 过滤掉值为 undefined 或字符串 "undefined" 的字段，防止 Jackson 反序列化报错
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined && v !== 'undefined'),
      );

      const result = await documentService.autoSaveDocument(cleanPayload);
      // 后端返回的 data 可能是字符串(ID)或对象 { id: "..." }
      const docId: string | undefined = typeof result === 'string'
        ? result
        : (result?.id ? String(result.id) : undefined);

      if (!docId) {
        console.error('[AutoSave] Backend did not return a valid document ID');
        setSaveStatus('error');
        return;
      }

      // First auto-save for a new document: set the ID and persist to localStorage
      if (!currentDocIdRef.current) {
        setCurrentDocId(docId);
        currentDocIdRef.current = docId;
        // Save under docId key (for /edit page recovery)
        draftStorage.save(docId, {
          ...data,
          documentId: docId,
        });
        onDocumentCreated?.(docId);
      }

      // Also always keep the 'new' key so recovery dialog works when re-entering /documents/new
      draftStorage.save(undefined, {
        ...data,
        documentId: docId,
      });

      setLastSavedAt(new Date());
      setSaveStatus('saved');
      hasChangesRef.current = false;

      // Fade back to idle after 3s
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 3000);
    } catch (error) {
      console.error('[AutoSave] Backend save failed:', error);
      // Still save to localStorage as safety net
      const data = formDataRef.current;
      draftStorage.save(currentDocIdRef.current, {
        ...data,
        documentId: currentDocIdRef.current,
      });
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [onDocumentCreated]);

  // Detect changes: compare serialized formData
  const serialized = JSON.stringify(formData);
  const prevSerialized = useRef(serialized);
  useEffect(() => {
    if (serialized !== prevSerialized.current) {
      prevSerialized.current = serialized;
      hasChangesRef.current = true;
      setSaveStatus('unsaved');
    }
  }, [serialized]);

  // Keep saveToBackendRef in sync (avoids resetting the timer on every render)
  saveToBackendRef.current = saveToBackend;

  // Periodic auto-save (interval timer)
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      if (hasChangesRef.current && !isSavingRef.current) {
        saveToBackendRef.current();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval]);

  // beforeunload handler
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        // Sync save to localStorage
        const data = formDataRef.current;
        const docId = currentDocIdRef.current;
        draftStorage.save(docId, {
          ...data,
          documentId: docId,
        });
        // Also save under 'new' key so recovery dialog works when re-entering /documents/new
        if (docId) {
          draftStorage.save(undefined, {
            ...data,
            documentId: docId,
          });
        }
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Recovery actions
  const acceptRecovery = useCallback((): DraftData | null => {
    setIsRecoveryDialogOpen(false);
    const draft = recoveryDraft;
    // 如果恢复的草稿已有后端文档ID，直接复用，后续提交时走update而非create
    if (draft?.documentId) {
      setCurrentDocId(draft.documentId);
      currentDocIdRef.current = draft.documentId;
    }
    return draft;
  }, [recoveryDraft]);

  const dismissRecovery = useCallback(() => {
    setIsRecoveryDialogOpen(false);
    setRecoveryDraft(null);
    // Call backend to mark all user's drafts as dismissed (autoSaveDismissed=1)
    documentService.dismissAutoSaveDrafts().catch(err => {
      console.warn('[AutoSave] dismissAutoSaveDrafts failed:', err);
    });
    // Remove ALL drafts so the dialog won't re-appear until new unsaved changes exist
    draftStorage.removeAll();
  }, []);

  const clearDraft = useCallback(() => {
    draftStorage.remove(currentDocIdRef.current);
    draftStorage.remove(undefined); // 同时清除 kb_draft_new，防止重新进入 /documents/new 误弹恢复框
    hasChangesRef.current = false;
    setSaveStatus('idle');
  }, []);

  const performSave = useCallback(async () => {
    await saveToBackend();
    message.success('已保存');
  }, [saveToBackend]);

  return {
    saveStatus,
    lastSavedAt,
    currentDocId,
    hasRecoveryDraft: recoveryDraft !== null,
    recoveryDraft,
    isRecoveryDialogOpen,
    acceptRecovery,
    dismissRecovery,
    clearDraft,
    performSave,
  };
};
