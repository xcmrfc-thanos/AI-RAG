/**
 * 状态仓库：foundation.store。
 *
 * <p>对接 foundationService 真实接口（通知 / 系统配置 / 操作日志 / 字典），
 * 后端用户身份经网关可信头解析，无需在前端显式传 userId。</p>
 */
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { foundationService } from '@/services';
import { useAuthStore } from './auth.store';

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

/** 后端分页（MyBatis-Plus IPage：records/total）与前端 PageResponse（list/total）兜底兼容 */
function extractRecords<T>(response: any): T[] {
  return (response?.records ?? response?.list ?? []) as T[];
}

/** 后端通知原始字段映射为前端 Notification 类型 */
function mapNotification(raw: any): Notification {
  return {
    id: String(raw?.id ?? ''),
    type: (raw?.notificationType as Notification['type']) || 'system',
    title: (raw?.title as string) || '',
    content: (raw?.content as string) || '',
    link: (raw?.link as string) || undefined,
    read: Boolean(raw?.isRead ?? raw?.read ?? false),
    createdAt: (raw?.createdAt as string) || '',
  };
}

/** 后端操作日志原始字段映射为前端 OperationLog 类型 */
function mapOperationLog(raw: any): OperationLog {
  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.userId ?? ''),
    username: (raw?.username as string) || '',
    module: (raw?.module as string) || '',
    operation: (raw?.operationDesc ?? raw?.operation ?? '') as string,
    method: (raw?.requestMethod ?? raw?.method ?? '') as string,
    url: (raw?.requestUrl ?? raw?.url ?? '') as string,
    params: raw?.requestParams ?? raw?.params,
    result: raw?.result,
    ip: (raw?.ip as string) || '',
    location: raw?.location,
    browser: raw?.browser,
    os: raw?.os,
    status: (raw?.status === 0 ? 'failure' : 'success') as OperationLog['status'],
    errorMessage: raw?.errorMessage,
    duration: Number(raw?.duration ?? 0),
    createdAt: (raw?.createdAt as string) || '',
  };
}

/** 后端日志统计映射为前端 LogStatistics 类型 */
function mapLogStatistics(raw: any): LogStatistics {
  const totalLogs = Number(raw?.totalLogs ?? 0);
  const successLogs = Number(raw?.successLogs ?? 0);
  const toEntries = (record: Record<string, number> | undefined, key: string) =>
    Object.entries(record ?? {}).map(([k, count]) => ({ [key]: k, count: Number(count) })) as any;
  return {
    totalLogs,
    todayLogs: Number(raw?.todayLogs ?? 0),
    successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 1000) / 10 : 100,
    errorLogs: Number(raw?.failedLogs ?? 0),
    moduleDistribution: toEntries(raw?.moduleStats, 'module'),
    operationDistribution: toEntries(raw?.operationTypeStats, 'operation'),
    timeDistribution: (raw?.trendData ?? []).map((item: any) => ({
      time: String(item?.date ?? ''),
      count: Number(item?.count ?? 0),
    })),
    userActivity: (raw?.userStats ?? []).map((item: any) => ({
      username: String(item?.username ?? ''),
      count: Number(item?.count ?? 0),
    })),
  };
}

/** 后端字典 / 配置原始字段映射（isSystem / isPublic / status 兼容 0|1 与布尔） */
function mapDict(raw: any): Dict {
  const enabled = raw?.status === 'enabled' || raw?.status === 1;
  return {
    id: String(raw?.id ?? ''),
    dictCode: (raw?.dictCode as string) || '',
    dictName: (raw?.dictName as string) || '',
    dictType: (raw?.dictType as string) || '',
    description: raw?.description,
    isSystem: Boolean(raw?.isSystem ?? false),
    sort: Number(raw?.sort ?? 0),
    status: enabled ? 'enabled' : 'disabled',
    createdAt: (raw?.createdAt as string) || '',
    updatedAt: (raw?.updatedAt as string) || '',
  };
}

function mapDictData(raw: any): DictData {
  const enabled = raw?.status === 'enabled' || raw?.status === 1;
  return {
    id: String(raw?.id ?? ''),
    dictCode: (raw?.dictCode as string) || '',
    dataLabel: (raw?.dataLabel ?? raw?.label ?? '') as string,
    dataValue: (raw?.dataValue ?? raw?.value ?? '') as string,
    sort: Number(raw?.sort ?? 0),
    status: enabled ? 'enabled' : 'disabled',
    cssClass: raw?.cssClass,
    remark: raw?.remark,
    createdAt: (raw?.createdAt as string) || '',
    updatedAt: (raw?.updatedAt as string) || '',
  };
}

function mapSystemConfig(raw: any): SystemConfig {
  return {
    configKey: (raw?.configKey as string) || '',
    configValue: (raw?.configValue as string) || '',
    configType: (raw?.configType as SystemConfig['configType']) || 'string',
    category: (raw?.category as string) || 'SYSTEM',
    description: raw?.description,
    isPublic: Boolean(raw?.isPublic ?? false),
    createdAt: (raw?.createdAt as string) || '',
    updatedAt: (raw?.updatedAt as string) || '',
  };
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

function createNotificationSlice(set: any, get: any): NotificationState {
  return {
    notifications: [],
    unreadCount: 0,
    notificationLoading: false,

    fetchNotifications: async (params) => {
      set({ notificationLoading: true });
      try {
        const [response, unreadCount] = await Promise.all([
          foundationService.notification.list({
            current: params?.page,
            size: params?.pageSize,
          }),
          foundationService.notification.unreadCount(
            useAuthStore.getState().user?.id as any,
          ).catch(() => 0),
        ]);
        const notifications = extractRecords<any>(response).map(mapNotification);
        set({
          notifications,
          unreadCount: Number(unreadCount) || notifications.filter((n) => !n.read).length,
          notificationLoading: false,
        });
      } catch (error) {
        set({ notificationLoading: false });
        throw error;
      }
    },

    fetchUnreadCount: async () => {
      try {
        const count = await foundationService.notification.unreadCount(
          useAuthStore.getState().user?.id as any,
        );
        set({ unreadCount: Number(count) || 0 });
      } catch (error) {
        // 静默失败：未读数属次要信息
      }
    },

    markAsRead: async (id: string) => {
      await foundationService.notification.markAsRead(id);
      set((state: NotificationState) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    },

    markAllAsRead: async () => {
      await foundationService.notification.markAllAsRead(
        useAuthStore.getState().user?.id as any,
      );
      set((state: NotificationState) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    },

    deleteNotification: async (id: string) => {
      await foundationService.notification.delete(id);
      set((state: NotificationState) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: state.notifications.find((n) => n.id === id)?.read
          ? state.unreadCount
          : Math.max(0, state.unreadCount - 1),
      }));
    },

    sendNotification: async (data: Partial<Notification>) => {
      const currentUser = useAuthStore.getState().user;
      await foundationService.notification.send({
        userId: (data as any).userId ?? (currentUser?.id as any),
        notificationType: data.type ?? 'system',
        title: data.title ?? '',
        content: data.content ?? '',
        link: data.link,
      } as any);
      await get().fetchNotifications();
    },

    resetNotifications: () => {
      set({ notifications: [], unreadCount: 0 });
    },
  };
}

function createSystemConfigSlice(set: any, get: any): SystemConfigState {
  return {
    configs: [],
    configMap: {},
    configLoading: false,

    fetchConfigs: async (params) => {
      set({ configLoading: true });
      try {
        const response = await foundationService.config.list({
          current: params?.page,
          size: params?.pageSize,
          category: params?.category,
        });
        const configs = extractRecords<any>(response).map(mapSystemConfig);
        const configMap: Record<string, string> = {};
        configs.forEach((config) => {
          configMap[config.configKey] = config.configValue;
        });
        set({ configs, configMap, configLoading: false });
      } catch (error) {
        set({ configLoading: false });
        throw error;
      }
    },

    fetchConfig: async (key: string) => {
      const config = mapSystemConfig(await foundationService.config.get(key));
      set((state: SystemConfigState) => ({
        configMap: { ...state.configMap, [key]: config.configValue },
      }));
      return config.configValue;
    },

    updateConfig: async (data: Partial<SystemConfig>) => {
      if (!data.configKey || data.configValue === undefined) {
        return;
      }
      const key = data.configKey;
      await foundationService.config.update(key, {
        configKey: key,
        configValue: data.configValue,
        configType: data.configType ?? 'string',
        category: data.category ?? 'SYSTEM',
      } as any);
      set((state: SystemConfigState) => ({
        configs: state.configs.map((c) =>
          c.configKey === key ? { ...c, ...data } : c
        ),
        configMap: {
          ...state.configMap,
          [key]: data.configValue as string,
        } as Record<string, string>,
      }));
    },

    deleteConfig: async (key: string) => {
      await foundationService.config.delete(key);
      set((state: SystemConfigState) => ({
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
  };
}

function createOperationLogSlice(set: any): OperationLogState {
  return {
    logs: [],
    statistics: null,
    logLoading: false,

    fetchLogs: async (params) => {
      set({ logLoading: true });
      try {
        const response = await foundationService.log.list({
          current: params?.page,
          size: params?.pageSize,
          module: params?.module,
          startTime: params?.startTime,
          endTime: params?.endTime,
        });
        set({
          logs: extractRecords<any>(response).map(mapOperationLog),
          logLoading: false,
        });
      } catch (error) {
        set({ logLoading: false });
        throw error;
      }
    },

    fetchStatistics: async (params) => {
      set({ logLoading: true });
      try {
        const statistics = mapLogStatistics(
          await foundationService.log.statistics({
            startTime: params?.startTime,
            endTime: params?.endTime,
          }),
        );
        set({ statistics, logLoading: false });
      } catch (error) {
        set({ logLoading: false });
        throw error;
      }
    },

    resetLogs: () => {
      set({ logs: [], statistics: null });
    },
  };
}

function createDictSlice(set: any, get: any): DictState {
  return {
    dicts: [],
    dictDataMap: {},
    dictLoading: false,

    fetchDicts: async (params) => {
      set({ dictLoading: true });
      try {
        const response = await foundationService.dict.list({
          current: params?.page,
          size: params?.pageSize,
        });
        set({
          dicts: extractRecords<any>(response).map(mapDict),
          dictLoading: false,
        });
      } catch (error) {
        set({ dictLoading: false });
        throw error;
      }
    },

    fetchDictData: async (code: string) => {
      const dictData = extractRecords<any>(
        await foundationService.dict.getData(code),
      ).map(mapDictData);
      set((state: DictState) => ({
        dictDataMap: { ...state.dictDataMap, [code]: dictData },
      }));
    },

    refreshDicts: async () => {
      await get().fetchDicts();
      // 刷新所有已加载的字典数据
      const dictCodes = Object.keys(get().dictDataMap);
      await Promise.all(dictCodes.map((code: string) => get().fetchDictData(code)));
    },

    resetDicts: () => {
      set({ dicts: [], dictDataMap: {} });
    },
  };
}

export const useFoundationStore = create<FoundationStore>()(
  devtools(
    (set, get) => ({
      ...createNotificationSlice(set, get),
      ...createSystemConfigSlice(set, get),
      ...createOperationLogSlice(set),
      ...createDictSlice(set, get),
    }),
    {
      name: 'foundation-store',
    }
  )
);

// 分离的Notification Store (可以独立使用)
export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => createNotificationSlice(set, get),
    {
      name: 'notification-store',
    }
  )
);

// 分离的SystemConfig Store (带持久化)
export const useSystemConfigStore = create<SystemConfigState>()(
  devtools(
    persist(
      (set, get) => createSystemConfigSlice(set, get),
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
    (set) => createOperationLogSlice(set),
    {
      name: 'operation-log-store',
    }
  )
);

// 分离的Dict Store (带持久化)
export const useDictStore = create<DictState>()(
  devtools(
    persist(
      (set, get) => createDictSlice(set, get),
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
