import { create } from 'zustand';
import { DocumentCategory, CategoryTree } from '@/types';
import { categoryService } from '@/services/category.service';

interface CategoryState {
  categories: DocumentCategory[];
  categoryTree: CategoryTree[];
  isLoading: boolean;

  // Actions
  fetchCategories: () => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  createCategory: (data: Pick<DocumentCategory, 'name'> & Partial<Omit<DocumentCategory, 'name'>>) => Promise<DocumentCategory>;
  updateCategory: (id: string, data: Partial<DocumentCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  moveCategory: (params: { categoryId: string; targetParentId?: string; position?: number }) => Promise<void>;
  reset: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  categoryTree: [],
  isLoading: false,

  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const categories = await categoryService.getCategories();
      set({ categories, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCategoryTree: async () => {
    set({ isLoading: true });
    try {
      const tree = await categoryService.getRootCategories();
      set({ categoryTree: tree, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createCategory: async (data) => {
    const category = await categoryService.createCategory(data);
    set((state) => ({
      categories: [...state.categories, category],
    }));
    return category;
  },

  updateCategory: async (id: string, data: Partial<DocumentCategory>) => {
    const updatedCategory = await categoryService.updateCategory(id, data);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? updatedCategory : c
      ),
    }));
  },

  deleteCategory: async (id: string) => {
    await categoryService.deleteCategory(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  moveCategory: async (params) => {
    await categoryService.moveCategory(params);
    // 重新获取分类树
    get().fetchCategoryTree();
  },

  reset: () => {
    set({
      categories: [],
      categoryTree: [],
    });
  },
}));
