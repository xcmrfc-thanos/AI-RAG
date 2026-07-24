/**
 * 状态仓库：document.store。
 */
import { create } from 'zustand';
import { Document, DocumentFilter } from '@/types';
import { documentService } from '@/services';
import { mapDocumentStatusFromCode } from '@/utils/document-status';

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  prevDocument: Document | null;
  nextDocument: Document | null;
  isLoading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  filter: DocumentFilter;
  fetchingDocumentId: string | null;

  // Actions
  fetchDocuments: (filter?: DocumentFilter) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  fetchAdjacentDocuments: (id: string) => Promise<void>;
  createDocument: (data: Partial<Document>) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  likeDocument: (id: string) => Promise<void>;
  setCurrentDocument: (document: Document | null) => void;
  setFilter: (filter: Partial<DocumentFilter>) => void;
  reset: () => void;
}

const defaultFilter: DocumentFilter = {
  page: 1,
  pageSize: 12,
  // 注意：后端暂不支持 sortBy 和 sortOrder 参数
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  prevDocument: null,
  nextDocument: null,
  isLoading: false,
  total: 0,
  currentPage: 1,
  pageSize: 12,
  filter: defaultFilter,
  fetchingDocumentId: null,

  fetchDocuments: async (filter?: DocumentFilter) => {
    // 防止重复请求
    const currentState = get();
    if (currentState.isLoading) {
      return;
    }

    set({ isLoading: true });
    try {
      const currentFilter = get().filter;
      const finalFilter = { ...currentFilter, ...filter };
      const response = await documentService.getDocuments(finalFilter);

      // 只更新数据，不更新filter（避免无限循环）
      set({
        documents: response.list,
        total: response.total,
        currentPage: response.page,
        pageSize: response.pageSize,
        isLoading: false,
      });

      // 如果传入了新的filter参数，才更新filter
      if (filter && Object.keys(filter).length > 0) {
        set({ filter: finalFilter });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchDocument: async (id: string) => {
    const currentState = get();
    // 防止重复请求：如果正在请求同一个文档，直接跳过
    if (currentState.fetchingDocumentId === id) {
      return;
    }
    set({ isLoading: true, fetchingDocumentId: id });
    try {
      const document = await documentService.getDocument(id);
      set({
        currentDocument: document,
        isLoading: false,
        fetchingDocumentId: null,
      });
      // 获取相邻文档
      get().fetchAdjacentDocuments(id);
    } catch (error) {
      set({ isLoading: false, fetchingDocumentId: null });
      throw error;
    }
  },

  fetchAdjacentDocuments: async (id: string) => {
    try {
      const neighbors = await documentService.getDocumentNeighbors(id);
      set({
        prevDocument: neighbors.prevId ? { id: neighbors.prevId, title: neighbors.prevTitle } as Document : null,
        nextDocument: neighbors.nextId ? { id: neighbors.nextId, title: neighbors.nextTitle } as Document : null,
      });
    } catch (error) {
      // 如果获取失败，设置为null
      set({
        prevDocument: null,
        nextDocument: null,
      });
    }
  },

  createDocument: async (data: any) => {
    // 后端返回文档ID（Long类型）
    const documentId = await documentService.createDocument(data);
    // 构造一个基本的文档对象，包含后端返回的ID
    const document: Document = {
      id: String(documentId),
      title: data.title,
      content: data.content || '',
      summary: data.summary,
      categoryId: data.categoryId ? String(data.categoryId) : undefined,
      tags: data.tags ? data.tags.split(',').filter(Boolean) : [],
      status: mapDocumentStatusFromCode(data.status),
      authorId: '1', // 从后端获取
      authorName: '当前用户', // 从后端获取
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      documents: [document, ...state.documents],
      total: state.total + 1,
    }));
    return document;
  },

  updateDocument: async (id: string, data: Partial<Document>) => {
    const updatedDocument = await documentService.updateDocument(id, data);
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? updatedDocument : doc
      ),
      currentDocument:
        state.currentDocument?.id === id ? updatedDocument : state.currentDocument,
    }));
  },

  deleteDocument: async (id: string) => {
    await documentService.deleteDocument(id);
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
      total: state.total - 1,
      currentDocument:
        state.currentDocument?.id === id ? null : state.currentDocument,
    }));
  },

  likeDocument: async (id: string) => {
    const currentDoc = get().currentDocument;
    const isCurrentlyLiked = currentDoc?.id === id ? currentDoc.isLiked : false;

    if (isCurrentlyLiked) {
      await documentService.unlikeDocument(id);
    } else {
      await documentService.likeDocument(id);
    }

    // 1. 先乐观切换 isLiked 状态，给用户即时反馈
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, isLiked: !doc.isLiked } : doc
      ),
      currentDocument:
        state.currentDocument?.id === id
          ? { ...state.currentDocument, isLiked: !state.currentDocument.isLiked }
          : state.currentDocument,
    }));

    // 2. 从后端重新拉取文档详情，拿到数据库中的真实 likeCount 和 isLiked
    try {
      const document = await documentService.getDocument(id);
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id
            ? { ...doc, likeCount: document.likeCount, isLiked: document.isLiked }
            : doc
        ),
        currentDocument:
          state.currentDocument?.id === id
            ? { ...state.currentDocument, likeCount: document.likeCount, isLiked: document.isLiked }
            : state.currentDocument,
      }));
    } catch {
      // 后端拉取失败时不报错，保留乐观更新的 isLiked 状态
    }
  },

  setCurrentDocument: (document: Document | null) => {
    set({ currentDocument: document });
  },

  setFilter: (filter: Partial<DocumentFilter>) => {
    set((state) => {
      // 创建新的filter对象，但只更新提供的字段
      const newFilter = { ...state.filter, ...filter };
      // 只有当filter真正发生变化时才更新
      const hasChanged = (Object.keys(filter) as Array<keyof DocumentFilter>).some(
        (key) => JSON.stringify(state.filter[key]) !== JSON.stringify(filter[key])
      );

      if (hasChanged) {
        return { filter: newFilter };
      }
      return {};
    });
  },

  reset: () => {
    set({
      documents: [],
      currentDocument: null,
      prevDocument: null,
      nextDocument: null,
      total: 0,
      currentPage: 1,
      filter: defaultFilter,
    });
  },
}));
