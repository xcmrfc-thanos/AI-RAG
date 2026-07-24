/**
 * 状态仓库：file-management.store。
 */
import { create } from 'zustand';
import { fileManagementService, FileMetadata, FileStatistics } from '@/services/file-management.service';
import type { UploadProgress } from '@/services/resumable-upload';
import type { EntityId } from '@/types';

/**
 * 文件管理中心状态管理
 */
interface FileManagementState {
  files: FileMetadata[];
  statistics: FileStatistics | null;
  isLoading: boolean;
  error: string | null;
  currentCategory: string;
  searchKeyword: string;
  selectedFiles: EntityId[];

  // 操作方法
  loadFileList: (category?: string) => Promise<void>;
  loadStatistics: () => Promise<void>;
  uploadFile: (
    file: File,
    isPublic?: boolean,
    onProgress?: (p: UploadProgress) => void
  ) => Promise<FileMetadata>;
  deleteFile: (fileId: EntityId) => Promise<void>;
  batchDeleteFiles: (fileIds: EntityId[]) => Promise<number>;
  renameFile: (fileId: EntityId, newFileName: string) => Promise<void>;
  updateFilePermission: (fileId: EntityId, isPublic: boolean) => Promise<void>;
  copyFile: (fileId: EntityId) => Promise<FileMetadata>;
  searchFiles: (keyword: string) => Promise<void>;
  setSelectedFiles: (fileIds: EntityId[]) => void;
  setCurrentCategory: (category: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useFileManagementStore = create<FileManagementState>((set, get) => ({
  files: [],
  statistics: null,
  isLoading: false,
  error: null,
  currentCategory: 'all',
  searchKeyword: '',
  selectedFiles: [],

  // 加载文件列表
  loadFileList: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const targetCategory = category || get().currentCategory;
      let files: FileMetadata[];

      if (targetCategory === 'all') {
        files = await fileManagementService.getFileList();
      } else {
        files = await fileManagementService.getFileListByCategory(targetCategory);
      }

      set({
        files,
        currentCategory: targetCategory,
        isLoading: false,
        selectedFiles: [],
      });
    } catch (error: any) {
      console.error('加载文件列表失败:', error);
      set({
        error: error.message || '加载文件列表失败',
        isLoading: false,
      });
    }
  },

  // 加载统计信息
  loadStatistics: async () => {
    try {
      const statistics = await fileManagementService.getFileStatistics();
      set({ statistics });
    } catch (error: any) {
      console.error('加载统计信息失败:', error);
      set({ error: error.message || '加载统计信息失败' });
    }
  },

  /**
   * 上传文件并刷新列表/统计（透传统一上传器阶段进度）
   *
   * @param file 待上传文件
   * @param isPublic 是否公开
   * @param onProgress 进度回调（phase + percent）
   * @returns 文件元数据
   */
  uploadFile: async (
    file: File,
    isPublic: boolean = false,
    onProgress?: (p: UploadProgress) => void
  ) => {
    set({ isLoading: true, error: null });
    try {
      const metadata = await fileManagementService.uploadFile(file, isPublic, onProgress);

      // 刷新文件列表
      await get().loadFileList();

      // 刷新统计信息
      await get().loadStatistics();

      set({ isLoading: false });
      return metadata;
    } catch (error: any) {
      console.error('上传文件失败:', error);
      set({
        error: error.message || '上传文件失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 删除文件
  deleteFile: async (fileId: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      await fileManagementService.deleteFile(fileId);

      // 从列表中移除文件
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        isLoading: false,
      }));

      // 刷新统计信息
      await get().loadStatistics();
    } catch (error: any) {
      console.error('删除文件失败:', error);
      set({
        error: error.message || '删除文件失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 批量删除文件
  batchDeleteFiles: async (fileIds: EntityId[]) => {
    set({ isLoading: true, error: null });
    try {
      const count = await fileManagementService.batchDeleteFiles(fileIds);

      // 从列表中移除文件
      set((state) => ({
        files: state.files.filter((f) => !fileIds.includes(f.id)),
        isLoading: false,
        selectedFiles: [],
      }));

      // 刷新统计信息
      await get().loadStatistics();

      return count;
    } catch (error: any) {
      console.error('批量删除文件失败:', error);
      set({
        error: error.message || '批量删除文件失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 重命名文件
  renameFile: async (fileId: EntityId, newFileName: string) => {
    set({ isLoading: true, error: null });
    try {
      await fileManagementService.renameFile(fileId, newFileName);

      // 更新列表中的文件名
      set((state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? { ...f, fileName: newFileName } : f
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('重命名文件失败:', error);
      set({
        error: error.message || '重命名文件失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 更新文件权限
  updateFilePermission: async (fileId: EntityId, isPublic: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await fileManagementService.updateFilePermission(fileId, isPublic);

      // 更新列表中的权限设置
      set((state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? { ...f, isPublic } : f
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('更新文件权限失败:', error);
      set({
        error: error.message || '更新文件权限失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 复制文件
  copyFile: async (fileId: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      const newFile = await fileManagementService.copyFile(fileId);

      // 刷新文件列表
      await get().loadFileList();

      // 刷新统计信息
      await get().loadStatistics();

      set({ isLoading: false });
      return newFile;
    } catch (error: any) {
      console.error('复制文件失败:', error);
      set({
        error: error.message || '复制文件失败',
        isLoading: false,
      });
      throw error;
    }
  },

  // 搜索文件
  searchFiles: async (keyword: string) => {
    set({ isLoading: true, error: null, searchKeyword: keyword });
    try {
      const files = await fileManagementService.searchFiles(keyword);
      set({
        files,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('搜索文件失败:', error);
      set({
        error: error.message || '搜索文件失败',
        isLoading: false,
      });
    }
  },

  // 设置选中的文件
  setSelectedFiles: (fileIds: EntityId[]) => {
    set({ selectedFiles: fileIds });
  },

  // 设置当前分类
  setCurrentCategory: (category: string) => {
    set({ currentCategory: category });
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error });
  },

  // 清除错误信息
  clearError: () => {
    set({ error: null });
  },
}));

export default useFileManagementStore;
