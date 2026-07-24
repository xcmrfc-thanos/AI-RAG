/**
 * 状态仓库：version.store。
 */
import { create } from 'zustand';
import { DocumentVersion } from '@/types';
import { versionService } from '@/services';

interface VersionState {
  versions: DocumentVersion[];
  currentVersion: DocumentVersion | null;
  isLoading: boolean;
  isComparing: boolean;
  compareResult: { old: DocumentVersion; new: DocumentVersion; diff: string } | null;

  // Actions
  fetchVersions: (documentId: string) => Promise<void>;
  fetchVersion: (documentId: string, versionId: string) => Promise<void>;
  restoreVersion: (documentId: string, versionId: string) => Promise<void>;
  compareVersions: (documentId: string, versionId1: string, versionId2: string) => Promise<void>;
  createSnapshot: (documentId: string, changeLog?: string) => Promise<void>;
  reset: () => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  currentVersion: null,
  isLoading: false,
  isComparing: false,
  compareResult: null,

  fetchVersions: async (documentId: string) => {
    set({ isLoading: true });
    try {
      const versions = await versionService.getVersions(documentId);
      set({ versions, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchVersion: async (documentId: string, versionId: string) => {
    set({ isLoading: true });
    try {
      const version = await versionService.getVersion(documentId, versionId);
      set({ currentVersion: version, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  restoreVersion: async (documentId: string, versionId: string) => {
    await versionService.restoreVersion(documentId, versionId);
    // 重新获取版本列表
    await get().fetchVersions(documentId);
  },

  compareVersions: async (documentId: string, versionId1: string, versionId2: string) => {
    set({ isComparing: true });
    try {
      const result = await versionService.compareVersions(documentId, versionId1, versionId2);
      set({ compareResult: result, isComparing: false });
    } catch (error) {
      set({ isComparing: false });
      throw error;
    }
  },

  createSnapshot: async (documentId: string, changeLog?: string) => {
    const newVersion = await versionService.createSnapshot(documentId, changeLog);
    set((state) => ({
      versions: [newVersion, ...state.versions],
    }));
  },

  reset: () => {
    set({
      versions: [],
      currentVersion: null,
      compareResult: null,
    });
  },
}));
