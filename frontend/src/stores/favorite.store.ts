import { create } from 'zustand';
import { favoriteService } from '@/services/favorite.service';

/**
 * 收藏状态管理
 *
 * @author 一线大厂标准
 * @since 1.0.0
 */
interface FavoriteState {
  favorites: Map<string, boolean>; // 文档ID -> 是否收藏
  isLoading: boolean;
  favoriteDocuments: any[]; // 收藏的文档列表
  toggleFavorite: (documentId: string) => Promise<boolean>;
  checkFavorite: (documentId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  isFavorited: (documentId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: new Map<string, boolean>(),
  isLoading: false,
  favoriteDocuments: [],

  // 切换收藏状态
  toggleFavorite: async (documentId: string) => {
    console.log('🔄 [FavoriteStore] toggleFavorite 开始:', documentId);
    console.log('📊 [FavoriteStore] 当前状态:', get().favorites.get(documentId));

    try {
      const isFavorited = await favoriteService.toggleFavorite(documentId);
      console.log('✅ [FavoriteStore] 后端返回:', isFavorited, '(true=已收藏, false=未收藏)');

      set((state) => {
        console.log('📝 [FavoriteStore] 更新前 Map:', Array.from(state.favorites.entries()));
        const newFavorites = new Map(state.favorites).set(documentId, isFavorited);
        console.log('📝 [FavoriteStore] 更新后 Map:', Array.from(newFavorites.entries()));
        return {
          favorites: newFavorites,
        };
      });

      return isFavorited;
    } catch (error) {
      console.error('❌ [FavoriteStore] 切换收藏状态失败:', error);
      throw error;
    }
  },

  // 检查收藏状态
  checkFavorite: async (documentId: string) => {
    console.log('🔍 [FavoriteStore] checkFavorite 开始:', documentId);
    try {
      const isFavorited = await favoriteService.checkFavorite(documentId);
      console.log('✅ [FavoriteStore] checkFavorite 返回:', isFavorited);
      set((state) => {
        console.log('📝 [FavoriteStore] checkFavorite 更新前状态:', Array.from(state.favorites.entries()));
        const newFavorites = new Map(state.favorites).set(documentId, isFavorited);
        console.log('📝 [FavoriteStore] checkFavorite 更新后状态:', Array.from(newFavorites.entries()));
        return {
          favorites: newFavorites,
        };
      });
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }
  },

  // 加载收藏列表
  loadFavorites: async () => {
    console.log('🔄 [FavoriteStore] loadFavorites 开始');
    set({ isLoading: true });
    try {
      const data = await favoriteService.getFavorites();
      console.log('✅ [FavoriteStore] loadFavorites 获取数据:', data);

      const favoriteMap = new Map<string, boolean>();

      data.forEach((item: any) => {
        if (item.documentId) {
          const docId = String(item.documentId);
          favoriteMap.set(docId, true);
          console.log('📝 [FavoriteStore] 添加到收藏Map:', docId, '= true');
        }
      });

      console.log('📊 [FavoriteStore] loadFavorites 最终Map:', Array.from(favoriteMap.entries()));

      set({
        favoriteDocuments: data,
        favorites: favoriteMap,
        isLoading: false,
      });
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      set({ isLoading: false });
    }
  },

  // 判断是否已收藏
  isFavorited: (documentId: string) => {
    return get().favorites.get(documentId) === true;
  },
}));

export default useFavoriteStore;
