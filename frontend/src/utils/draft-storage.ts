const DRAFT_PREFIX = 'kb_draft_';

export interface DraftData {
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
  documentId?: string;
  savedAt: number; // Date.now()
}

export const draftStorage = {
  getKey(docId?: string): string {
    return docId ? `${DRAFT_PREFIX}${docId}` : `${DRAFT_PREFIX}new`;
  },

  save(docId: string | undefined, data: Omit<DraftData, 'savedAt'>): void {
    try {
      const full: DraftData = { ...data, savedAt: Date.now() };
      localStorage.setItem(this.getKey(docId), JSON.stringify(full));
    } catch (e) {
      console.warn('[DraftStorage] localStorage save failed:', e);
    }
  },

  load(docId: string | undefined): DraftData | null {
    try {
      const raw = localStorage.getItem(this.getKey(docId));
      return raw ? (JSON.parse(raw) as DraftData) : null;
    } catch (e) {
      console.warn('[DraftStorage] localStorage load failed:', e);
      return null;
    }
  },

  remove(docId: string | undefined): void {
    try {
      localStorage.removeItem(this.getKey(docId));
    } catch (e) {
      console.warn('[DraftStorage] localStorage remove failed:', e);
    }
  },

  /** Remove ALL kb_draft_* entries — user dismissed the recovery dialog */
  removeAll(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('[DraftStorage] removeAll failed:', e);
    }
  },

  /** Migrate draft from 'new' key to docId key after first auto-save creates an ID */
  migrateToId(oldDocId: string | undefined, newDocId: string): void {
    const data = this.load(oldDocId);
    if (data) {
      this.remove(oldDocId);
      this.save(newDocId, { ...data, documentId: newDocId });
    }
  },

  exists(docId: string | undefined): boolean {
    return this.load(docId) !== null;
  },

  /** Scan all localStorage kb_draft_* entries and return the most recent one */
  findLatest(): DraftData | null {
    try {
      let latest: DraftData | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const draft = JSON.parse(raw) as DraftData;
              if (draft.savedAt && (!latest || draft.savedAt > latest.savedAt)) {
                latest = draft;
              }
            } catch { /* skip malformed entry */ }
          }
        }
      }
      return latest;
    } catch (e) {
      console.warn('[DraftStorage] findLatest failed:', e);
      return null;
    }
  },
};
