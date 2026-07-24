/**
 * 状态仓库：foundation.store。
 */
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// Foundation相关类型定义
export interface Notification {
  id: string;
  type: 'system' | 'comment' | 'mention' | 'review' | 'like';
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface SystemConfig {
  configKey: string;
  configValue: string;
  configType: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  module: string;
  operation: string;
  method: string;
  url: string;
  params?: string;
  result?: string;
  ip: string;
  location?: string;
  browser?: string;
  os?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  duration: number;
  createdAt: string;
}

export interface LogStatistics {
  totalLogs: number;
  todayLogs: number;
  successRate: number;
  errorLogs: number;
  moduleDistribution: Array<{ module: string; count: number }>;
  operationDistribution: Array<{ operation: string; count: number }>;
  timeDistribution: Array<{ time: string; count: number }>;
  userActivity: Array<{ username: string; count: number }>;
}

export interface Dict {
  id: string;
  dictCode: string;
  dictName: string;
  dictType: string;
  description?: string;
  isSystem: boolean;
  sort: number;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface DictData {
  id: string;
  dictCode: string;
  dataLabel: string;
  dataValue: string;
  sort: number;
  status: 'enabled' | 'disabled';
  cssClass?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification状态管理
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  notificationLoading: boolean;
  fetchNotifications: (params?: { page?: number; pageSize?: number; type?: string }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (data: Partial<Notification>) => Promise<void>;
  resetNotifications: () => void;
}

// SystemConfig状态管理
interface SystemConfigState {
  configs: SystemConfig[];
  configMap: Record<string, string>;
  configLoading: boolean;
  fetchConfigs: (params?: { page?: number; pageSize?: number; category?: string }) => Promise<void>;
  fetchConfig: (key: string) => Promise<string>;
  updateConfig: (data: Partial<SystemConfig>) => Promise<void>;
  deleteConfig: (key: string) => Promise<void>;
  refreshConfigs: () => Promise<void>;
  resetConfigs: () => void;
}

// OperationLog状态管理
interface OperationLogState {
  logs: OperationLog[];
  statistics: LogStatistics | null;
  logLoading: boolean;
  fetchLogs: (params?: {
    page?: number;
    pageSize?: number;
    module?: string;
    operation?: string;
    startTime?: string;
    endTime?: string;
    userId?: string;
  }) => Promise<void>;
  fetchStatistics: (params?: { startTime?: string; endTime?: string }) => Promise<void>;
  resetLogs: () => void;
}

// Dict状态管理
interface DictState {
  dicts: Dict[];
  dictDataMap: Record<string, DictData[]>;
  dictLoading: boolean;
  fetchDicts: (params?: { page?: number; pageSize?: number; dictType?: string }) => Promise<void>;
  fetchDictData: (code: string) => Promise<void>;
  refreshDicts: () => Promise<void>;
  resetDicts: () => void;
}

// Foundation Store主接口
interface FoundationStore extends NotificationState, SystemConfigState, OperationLogState, DictState {}

export const useFoundationStore = create<FoundationStore>()(
  devtools(
    (set, get) => ({
      // ==================== Notification 状态和方法 ====================
      notifications: [],
      unreadCount: 0,
      notificationLoading: false,

      fetchNotifications: async (_params) => {
        set({ notificationLoading: true });
        try {
          // TODO: 替换为实际的API调用
          // const response = await foundationService.fetchNotifications(params);
          const response = {
            list: [],
            total: 0,
            unreadCount: 0,
          };
          set({
            notifications: response.list,
            unreadCount: response.unreadCount,
            notificationLoading: false,
          });
        } catch (error) {
          set({ notificationLoading: false });
          throw error;
        }
      },

      fetchUnreadCount: async () => {
        try {
          // TODO: 替换为实际的API调用
          // const count = await foundationService.fetchUnreadCount();
          const count = 0;
          set({ unreadCount: count });
        } catch (error) {
          // Error handled
        }
      },

      markAsRead: async (id: string) => {
        // TODO: 替换为实际的API调用
        // await foundationService.markAsRead(id);
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: async () => {
        // TODO: 替换为实际的API调用
        // await foundationService.markAllAsRead();
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: async (id: string) => {
        // TODO: 替换为实际的API调用
        // await foundationService.deleteNotification(id);
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: state.notifications.find((n) => n.id === id)?.read
            ? state.unreadCount
            : Math.max(0, state.unreadCount - 1),
        }));
      },

      sendNotification: async (_data: Partial<Notification>) => {
        // TODO: 替换为实际的API调用
        // await foundationService.sendNotification(_data);
      },

      resetNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      // ==================== SystemConfig 状态和方法 ====================
      configs: [],
      configMap: {},
      configLoading: false,

      fetchConfigs: async (_params) => {
        set({ configLoading: true });
        try {
          // TODO: 替换为实际的API调用
          // const response = await foundationService.fetchConfigs(params);
          const response = {
            list: [],
            total: 0,
          };
          const configMap: Record<string, string> = {};
          response.list.forEach((config: SystemConfig) => {
            configMap[config.configKey] = config.configValue;
          });
          set({
            configs: response.list,
            configMap,
            configLoading: false,
          });
        } catch (error) {
          set({ configLoading: false });
          throw error;
        }
      },

      fetchConfig: async (key: string) => {
        // TODO: 替换为实际的API调用
        // const value = await foundationService.fetchConfig(key);
        const value = '';
        set((state) => ({
          configMap: { ...state.configMap, [key]: value },
        }));
        return value;
      },

      updateConfig: async (data: Partial<SystemConfig>) => {
        // TODO: 替换为实际的API调用
        // await foundationService.updateConfig(data);
        if (data.configKey && data.configValue !== undefined) {
          const key = data.configKey as string;
          const value = data.configValue as string;
          set((state) => ({
            configs: state.configs.map((c) =>
              c.configKey === key ? { ...c, ...data } : c
            ),
            configMap: {
              ...state.configMap,
              [key]: value,
            } as Record<string, string>,
          }));
        }
      },

      deleteConfig: async (key: string) => {
        // TODO: 替换为实际的API调用
        // await foundationService.deleteConfig(key);
        set((state) => ({
          configs: state.configs.filter((c) => c.configKey !== key),
          configMap: Object.fromEntries(
            Object.entries(state.configMap).filter(([k]) => k !== key)
          ),
        }));
      },

      refreshConfigs: async () => {
        await get().fetchConfigs();
      },

      resetConfigs: () => {
        set({ configs: [], configMap: {} });
      },

      // ==================== OperationLog 状态和方法 ====================
      logs: [],
      statistics: null,
      logLoading: false,

      fetchLogs: async (_params) => {
        set({ logLoading: true });
        try {
          // TODO: 替换为实际的API调用
          // const response = await foundationService.fetchLogs(params);
          const response = {
            list: [],
            total: 0,
          };
          set({
            logs: response.list,
            logLoading: false,
          });
        } catch (error) {
          set({ logLoading: false });
          throw error;
        }
      },

      fetchStatistics: async (_params) => {
        set({ logLoading: true });
        try {
          // TODO: 替换为实际的API调用
          // const statistics = await foundationService.fetchStatistics(params);
          const statistics = null;
          set({ statistics, logLoading: false });
        } catch (error) {
          set({ logLoading: false });
          throw error;
        }
      },

      resetLogs: () => {
        set({ logs: [], statistics: null });
      },

      // ==================== Dict 状态和方法 ====================
      dicts: [],
      dictDataMap: {},
      dictLoading: false,

      fetchDicts: async (_params) => {
        set({ dictLoading: true });
        try {
          // TODO: 替换为实际的API调用
          // const response = await foundationService.fetchDicts(params);
          const response = {
            list: [],
            total: 0,
          };
          set({
            dicts: response.list,
            dictLoading: false,
          });
        } catch (error) {
          set({ dictLoading: false });
          throw error;
        }
      },

      fetchDictData: async (code: string) => {
        // TODO: 替换为实际的API调用
        // const dictData = await foundationService.fetchDictData(code);
        const dictData: DictData[] = [];
        set((state) => ({
          dictDataMap: { ...state.dictDataMap, [code]: dictData },
        }));
      },

      refreshDicts: async () => {
        await get().fetchDicts();
        // 刷新所有已加载的字典数据
        const dictCodes = Object.keys(get().dictDataMap);
        await Promise.all(dictCodes.map((code) => get().fetchDictData(code)));
      },

      resetDicts: () => {
        set({ dicts: [], dictDataMap: {} });
      },
    }),
    {
      name: 'foundation-store',
    }
  )
);

// 分离的Notification Store (可以独立使用)
export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      notificationLoading: false,

      fetchNotifications: async (_params) => {
        set({ notificationLoading: true });
        try {
          // TODO: 替换为实际的API调用
          const response = {
            list: [],
            total: 0,
            unreadCount: 0,
          };
          set({
            notifications: response.list,
            unreadCount: response.unreadCount,
            notificationLoading: false,
          });
        } catch (error) {
          set({ notificationLoading: false });
          throw error;
        }
      },

      fetchUnreadCount: async () => {
        try {
          // TODO: 替换为实际的API调用
          const count = 0;
          set({ unreadCount: count });
        } catch (error) {
          // Error handled
        }
      },

      markAsRead: async (id: string) => {
        // TODO: 替换为实际的API调用
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: async () => {
        // TODO: 替换为实际的API调用
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: async (id: string) => {
        // TODO: 替换为实际的API调用
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: state.notifications.find((n) => n.id === id)?.read
            ? state.unreadCount
            : Math.max(0, state.unreadCount - 1),
        }));
      },

      sendNotification: async (_data: Partial<Notification>) => {
        // TODO: 替换为实际的API调用
      },

      resetNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: 'notification-store',
    }
  )
);

// 分离的SystemConfig Store (带持久化)
export const useSystemConfigStore = create<SystemConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        configs: [],
        configMap: {},
        configLoading: false,

        fetchConfigs: async (_params) => {
          set({ configLoading: true });
          try {
            // TODO: 替换为实际的API调用
            const response = {
              list: [],
              total: 0,
            };
            const configMap: Record<string, string> = {};
            response.list.forEach((config: SystemConfig) => {
              configMap[config.configKey] = config.configValue;
            });
            set({
              configs: response.list,
              configMap,
              configLoading: false,
            });
          } catch (error) {
            set({ configLoading: false });
            throw error;
          }
        },

        fetchConfig: async (key: string) => {
          // TODO: 替换为实际的API调用
          const value = '';
          set((state) => ({
            configMap: { ...state.configMap, [key]: value },
          }));
          return value;
        },

        updateConfig: async (data: Partial<SystemConfig>) => {
          // TODO: 替换为实际的API调用
          if (data.configKey && data.configValue !== undefined) {
            const key = data.configKey as string;
            const value = data.configValue as string;
            set((state) => ({
              configs: state.configs.map((c) =>
                c.configKey === key ? { ...c, ...data } : c
              ),
              configMap: {
                ...state.configMap,
                [key]: value,
              } as Record<string, string>,
            }));
          }
        },

        deleteConfig: async (key: string) => {
          // TODO: 替换为实际的API调用
          set((state) => ({
            configs: state.configs.filter((c) => c.configKey !== key),
            configMap: Object.fromEntries(
              Object.entries(state.configMap).filter(([k]) => k !== key)
            ),
          }));
        },

        refreshConfigs: async () => {
          await get().fetchConfigs();
        },

        resetConfigs: () => {
          set({ configs: [], configMap: {} });
        },
      }),
      {
        name: 'system-config-storage',
        partialize: (state) => ({
          configMap: state.configMap,
        }),
      }
    ),
    {
      name: 'system-config-store',
    }
  )
);

// 分离的OperationLog Store
export const useOperationLogStore = create<OperationLogState>()(
  devtools(
    (set) => ({
      logs: [],
      statistics: null,
      logLoading: false,

      fetchLogs: async (_params) => {
        set({ logLoading: true });
        try {
          // TODO: 替换为实际的API调用
          const response = {
            list: [],
            total: 0,
          };
          set({
            logs: response.list,
            logLoading: false,
          });
        } catch (error) {
          set({ logLoading: false });
          throw error;
        }
      },

      fetchStatistics: async (_params) => {
        set({ logLoading: true });
        try {
          // TODO: 替换为实际的API调用
          const statistics = null;
          set({ statistics, logLoading: false });
        } catch (error) {
          set({ logLoading: false });
          throw error;
        }
      },

      resetLogs: () => {
        set({ logs: [], statistics: null });
      },
    }),
    {
      name: 'operation-log-store',
    }
  )
);

// 分离的Dict Store (带持久化)
export const useDictStore = create<DictState>()(
  devtools(
    persist(
      (set, get) => ({
        dicts: [],
        dictDataMap: {},
        dictLoading: false,

        fetchDicts: async (_params) => {
          set({ dictLoading: true });
          try {
            // TODO: 替换为实际的API调用
            const response = {
              list: [],
              total: 0,
            };
            set({
              dicts: response.list,
              dictLoading: false,
            });
          } catch (error) {
            set({ dictLoading: false });
            throw error;
          }
        },

        fetchDictData: async (code: string) => {
          // TODO: 替换为实际的API调用
          const dictData: DictData[] = [];
          set((state) => ({
            dictDataMap: { ...state.dictDataMap, [code]: dictData },
          }));
        },

        refreshDicts: async () => {
          await get().fetchDicts();
          const dictCodes = Object.keys(get().dictDataMap);
          await Promise.all(dictCodes.map((code) => get().fetchDictData(code)));
        },

        resetDicts: () => {
          set({ dicts: [], dictDataMap: {} });
        },
      }),
      {
        name: 'dict-storage',
        partialize: (state) => ({
          dictDataMap: state.dictDataMap,
        }),
      }
    ),
    {
      name: 'dict-store',
    }
  )
);
