/**
 * 状态仓库：user.store。
 */
import { create } from 'zustand';
import { User } from '@/types';
import { userService } from '@/services';

interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;

  // Actions
  fetchUsers: (params?: any) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: { oldPassword: string; newPassword: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteUser: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  currentUser: null,
  isLoading: false,
  total: 0,
  currentPage: 1,
  pageSize: 10,

  fetchUsers: async (params) => {
    set({ isLoading: true });
    try {
      const response = await userService.getUsers(params || {});
      set({
        users: response.list,
        total: response.total,
        currentPage: response.page,
        pageSize: response.pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const user = await userService.getCurrentUser();
      set({ currentUser: user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: async (id: string, data: Partial<User>) => {
    await userService.updateUser(id, data);
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      currentUser:
        state.currentUser?.id === id && state.currentUser
          ? { ...state.currentUser, ...data }
          : state.currentUser,
    }));
  },

  updateProfile: async (data: Partial<User>) => {
    const updatedUser = await userService.updateProfile(data);
    set({ currentUser: updatedUser });
  },

  changePassword: async (data) => {
    await userService.changePassword({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
      confirmPassword: data.newPassword,
    });
  },

  uploadAvatar: async (file: File) => {
    const response = await userService.uploadAvatar(file);
    set((state) => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, avatar: response.url }
        : null,
    }));
    return response.url;
  },

  deleteUser: async (id: string) => {
    await userService.deleteUser(id);
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
      total: state.total - 1,
      currentUser: state.currentUser?.id === id ? null : state.currentUser,
    }));
  },

  setCurrentUser: (user: User | null) => {
    set({ currentUser: user });
  },

  reset: () => {
    set({
      users: [],
      currentUser: null,
      total: 0,
      currentPage: 1,
    });
  },
}));
